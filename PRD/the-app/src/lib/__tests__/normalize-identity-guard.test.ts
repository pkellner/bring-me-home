/**
 * Guard for issue #1 step 1: every Prisma call that writes or matches an email or username goes
 * through the helpers in src/lib/normalize-identity.ts, so the app behaves the same on MariaDB
 * (case- and trailing-space-insensitive) and Postgres (byte-exact).
 *
 * It parses every source file under src/ (tests excluded), scripts/ and prisma/seed.ts, finds
 * calls such as `prisma.user.findUnique({...})` on the models below, and checks the value of each
 * `email` / `username` key inside the argument. A value passes when it is a helper call, null, or
 * an operator object whose values pass. Anything else must be in ALLOWED with a reason; an
 * ALLOWED entry that no longer matches anything fails too, so the list stays true.
 */
import fs from 'fs';
import path from 'path';
import ts from 'typescript';

const APP_ROOT = path.resolve(__dirname, '../../..');

// Every `prisma.<model>.<method>(...)` / `tx.<model>.<method>(...)` call is scanned for email and
// username keys, so a relation filter such as `person.findMany({ where: { comments: { some: { email } } } })`
// is caught. Only calls on these models must also spell out `where` / `data` inline.
const PRISMA_ROOTS = new Set(['prisma', 'tx']);
const MODELS_WITH_IDENTITY = new Set(['user', 'comment', 'commentVerificationToken', 'emailSuppression', 'supporter']);
const PRISMA_METHODS = new Set([
  'create', 'createMany', 'createManyAndReturn', 'update', 'updateMany', 'upsert', 'delete', 'deleteMany',
  'findUnique', 'findUniqueOrThrow', 'findFirst', 'findFirstOrThrow', 'findMany', 'count', 'aggregate', 'groupBy',
]);
const IDENTITY_KEYS = new Set(['email', 'username']);
// Keys whose object holds field names, not values: `select: { email: true }`.
const SHAPE_KEYS = new Set(['select', 'include', 'omit', 'orderBy', 'distinct', '_count', 'by']);
// Keys whose value holds email/username keys; built elsewhere (`{ where }`), the scan cannot see them.
const ARGUMENT_KEYS = new Set(['where', 'data', 'create', 'update']);
const HELPERS = new Set([
  'normalizeEmail', 'normalizeOptionalEmail', 'normalizeUsername', 'normalizeUsernameForLookup',
]);

/** `<file relative to PRD/the-app>|<key>: <value source text>` → why it is safe without a helper. */
const ALLOWED: Record<string, string> = {
  'src/lib/email-suppression.ts|where: where (built elsewhere)':
    'admin search: `contains` on email and reasonDetails; case-insensitive search is issue #1 step 2a',
  'src/app/actions/email-notifications.ts|data: updateData (built elsewhere)':
    'typed just above as the opt-out fields only; it holds no email or username',
  'src/app/actions/email-notifications.ts|where: whereClause (built elsewhere)':
    'typed just above; its only email condition is `{ not: null }`',
  'src/app/admin/comments/page.tsx|where: whereClause (built elsewhere)':
    'filters on personId only',
  'src/app/api/webhooks/ses/route.ts|email: r.emailAddress':
    'a field of the webhookEvents Json document SES sent, not a column match',
  'prisma/seed.ts|...commentData':
    'generateComments() rows hold no email or username',
  'prisma/seed.ts|...supporterData':
    'its email is overridden right after the spread with normalizeOptionalEmail',
};

type Finding = { key: string; location: string };

function listSourceFiles(): string[] {
  const roots = ['src', 'scripts'].map(dir => path.join(APP_ROOT, dir));
  const files: string[] = [path.join(APP_ROOT, 'prisma/seed.ts')];
  const walk = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name !== '__tests__' && entry.name !== 'node_modules') walk(full);
      } else if (/\.tsx?$/.test(entry.name) && !/\.(test|spec)\.tsx?$/.test(entry.name) && !entry.name.endsWith('.d.ts')) {
        files.push(full);
      }
    }
  };
  roots.forEach(walk);
  return files;
}

/** The model name of a Prisma model call (`prisma.user.findUnique(...)` → 'user'), else null. */
function prismaModelOf(node: ts.CallExpression): string | null {
  const callee = node.expression;
  if (!ts.isPropertyAccessExpression(callee) || !PRISMA_METHODS.has(callee.name.text)) return null;
  const model = callee.expression;
  if (!ts.isPropertyAccessExpression(model) || !ts.isIdentifier(model.expression)) return null;
  return PRISMA_ROOTS.has(model.expression.text) ? model.name.text : null;
}

function bindsName(name: ts.BindingName, text: string): boolean {
  if (ts.isIdentifier(name)) return name.text === text;
  return name.elements.some(el => !ts.isOmittedExpression(el) && bindsName(el.name, text));
}

/**
 * True when the nearest declaration of `id` in scope is `const id = <normalised value>`. A
 * parameter, destructured binding, `let` or loop variable of that name in a nearer scope shadows
 * it and makes the answer false.
 */
function resolvesToNormalizedConst(id: ts.Identifier): boolean {
  for (let node: ts.Node | undefined = id.parent; node; node = node.parent) {
    if (ts.isFunctionLike(node) && node.parameters.some(p => bindsName(p.name, id.text))) return false;
    if ((ts.isForOfStatement(node) || ts.isForInStatement(node) || ts.isForStatement(node)) &&
        node.initializer && ts.isVariableDeclarationList(node.initializer) &&
        node.initializer.declarations.some(d => bindsName(d.name, id.text))) {
      return false;
    }
    if (ts.isCatchClause(node) && node.variableDeclaration && bindsName(node.variableDeclaration.name, id.text)) return false;
    if (ts.isBlock(node) || ts.isSourceFile(node) || ts.isCaseClause(node) || ts.isDefaultClause(node)) {
      for (const statement of node.statements) {
        if (!ts.isVariableStatement(statement)) continue;
        const isConst = (statement.declarationList.flags & ts.NodeFlags.Const) !== 0;
        for (const decl of statement.declarationList.declarations) {
          if (!bindsName(decl.name, id.text)) continue;
          return isConst && ts.isIdentifier(decl.name) && !!decl.initializer && isNormalized(decl.initializer);
        }
      }
    }
  }
  return false;
}

function isNormalized(value: ts.Expression): boolean {
  if (ts.isParenthesizedExpression(value) || ts.isAsExpression(value) || ts.isNonNullExpression(value)) {
    return isNormalized(value.expression);
  }
  if (value.kind === ts.SyntaxKind.NullKeyword) return true;
  if (ts.isIdentifier(value)) return value.text === 'undefined' || resolvesToNormalizedConst(value);
  if (ts.isAwaitExpression(value)) return false;
  // A literal already in normal form: 'admin', 'admin@example.com'.
  if (ts.isStringLiteral(value) || ts.isNoSubstitutionTemplateLiteral(value)) {
    return value.text === value.text.trim().toLowerCase();
  }
  if (ts.isCallExpression(value) && ts.isIdentifier(value.expression) && HELPERS.has(value.expression.text)) return true;
  // `email: { in: [...] }`, `email: { not: null }`: every operator value must pass.
  if (ts.isObjectLiteralExpression(value)) {
    return value.properties.every(prop => ts.isPropertyAssignment(prop) && isNormalized(prop.initializer));
  }
  if (ts.isArrayLiteralExpression(value)) return value.elements.every(el => isNormalized(el as ts.Expression));
  // `list.map(normalizeEmail)`
  if (
    ts.isCallExpression(value) && ts.isPropertyAccessExpression(value.expression) &&
    value.expression.name.text === 'map' && value.arguments.length === 1 &&
    ts.isIdentifier(value.arguments[0]) && HELPERS.has(value.arguments[0].text)
  ) {
    return true;
  }
  if (ts.isConditionalExpression(value)) return isNormalized(value.whenTrue) && isNormalized(value.whenFalse);
  return false;
}

/** The object literals a spread expression can produce, or null when one of them is not visible. */
function spreadObjectLiterals(expr: ts.Expression): ts.ObjectLiteralExpression[] | null {
  if (ts.isParenthesizedExpression(expr)) return spreadObjectLiterals(expr.expression);
  if (ts.isObjectLiteralExpression(expr)) return [expr];
  if (ts.isBinaryExpression(expr) && expr.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken) {
    return spreadObjectLiterals(expr.right);
  }
  if (ts.isConditionalExpression(expr)) {
    const a = spreadObjectLiterals(expr.whenTrue);
    const b = spreadObjectLiterals(expr.whenFalse);
    return a && b ? [...a, ...b] : null;
  }
  return null;
}

function collectIdentityValues(
  node: ts.Node, sourceFile: ts.SourceFile, rel: string, out: Finding[], inlineClauses: boolean,
): void {
  if (ts.isObjectLiteralExpression(node)) {
    for (const prop of node.properties) {
      const name = prop.name && (ts.isIdentifier(prop.name) || ts.isStringLiteral(prop.name)) ? prop.name.text : undefined;
      if (name && SHAPE_KEYS.has(name)) continue;
      const line = sourceFile.getLineAndCharacterOfPosition(prop.getStart(sourceFile)).line + 1;
      const location = `${rel}:${line}`;
      if (ts.isShorthandPropertyAssignment(prop) && IDENTITY_KEYS.has(prop.name.text)) {
        if (resolvesToNormalizedConst(prop.name)) continue;
        out.push({ key: `${rel}|${prop.name.text}: ${prop.name.text} (shorthand)`, location });
        continue;
      }
      if (inlineClauses && ts.isShorthandPropertyAssignment(prop) && ARGUMENT_KEYS.has(prop.name.text)) {
        out.push({ key: `${rel}|${prop.name.text}: ${prop.name.text} (built elsewhere)`, location });
        continue;
      }
      if (inlineClauses && ts.isPropertyAssignment(prop) && name && ARGUMENT_KEYS.has(name) && ts.isIdentifier(prop.initializer)) {
        out.push({ key: `${rel}|${name}: ${prop.initializer.text} (built elsewhere)`, location });
        continue;
      }
      if (ts.isSpreadAssignment(prop)) {
        // `...(cond && { a: 1 })` is scanned like the object it spreads; `...someObject` cannot be seen.
        const spread = spreadObjectLiterals(prop.expression);
        if (spread) spread.forEach(obj => collectIdentityValues(obj, sourceFile, rel, out, inlineClauses));
        else if (inlineClauses) out.push({ key: `${rel}|...${prop.expression.getText(sourceFile)}`, location });
        continue;
      }
      if (ts.isPropertyAssignment(prop) && name && IDENTITY_KEYS.has(name)) {
        if (!isNormalized(prop.initializer)) {
          out.push({ key: `${rel}|${name}: ${prop.initializer.getText(sourceFile).replace(/\s+/g, ' ')}`, location });
        }
        continue;
      }
      if (ts.isPropertyAssignment(prop)) collectIdentityValues(prop.initializer, sourceFile, rel, out, inlineClauses);
    }
    return;
  }
  // `newValues: JSON.stringify({ username, email })` is an audit-log string, not a match.
  if (ts.isCallExpression(node) && node.expression.getText(sourceFile) === 'JSON.stringify') return;
  ts.forEachChild(node, child => collectIdentityValues(child, sourceFile, rel, out, inlineClauses));
}

/** Every email/username value in a Prisma call that does not go through a helper. */
function findBypasses(fileName: string, source: string): Finding[] {
  const rel = path.relative(APP_ROOT, fileName).split(path.sep).join('/');
  const sourceFile = ts.createSourceFile(fileName, source, ts.ScriptTarget.Latest, true,
    fileName.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const out: Finding[] = [];
  const visit = (node: ts.Node) => {
    const model = ts.isCallExpression(node) ? prismaModelOf(node) : null;
    if (model && ts.isCallExpression(node)) {
      const inlineClauses = MODELS_WITH_IDENTITY.has(model);
      const arg = node.arguments[0];
      if (arg && !ts.isObjectLiteralExpression(arg) && inlineClauses) {
        // A spread-in or prebuilt argument would hide its keys from this check.
        const line = sourceFile.getLineAndCharacterOfPosition(arg.getStart(sourceFile)).line + 1;
        out.push({ key: `${rel}|argument: ${arg.getText(sourceFile)}`, location: `${rel}:${line}` });
      } else if (arg) {
        collectIdentityValues(arg, sourceFile, rel, out, inlineClauses);
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return out;
}

describe('email and username normalisation guard (issue #1 step 1)', () => {
  const files = listSourceFiles();
  const findings = files.flatMap(file => findBypasses(file, fs.readFileSync(file, 'utf8')));

  it('scans the app, the scripts and the seed', () => {
    const rels = files.map(f => path.relative(APP_ROOT, f).split(path.sep).join('/'));
    expect(rels).toEqual(expect.arrayContaining([
      'src/lib/auth.ts', 'src/app/actions/comments.ts', 'scripts/find-password.ts', 'prisma/seed.ts',
    ]));
  });

  it('finds no email or username written or matched without a normalize helper', () => {
    const bypasses = findings.filter(f => !(f.key in ALLOWED)).map(f => `${f.location}  ${f.key.split('|')[1]}`);
    expect(bypasses).toEqual([]);
  });

  it('has no stale allow-list entries', () => {
    const hit = new Set(findings.map(f => f.key));
    expect(Object.keys(ALLOWED).filter(key => !hit.has(key))).toEqual([]);
  });

  // The checks above only mean something if the scanner catches a bypass; these lock that.
  describe('the scanner itself', () => {
    const scan = (code: string) => findBypasses(path.join(APP_ROOT, 'src/example.ts'), code).map(f => f.key.split('|')[1]);

    it('flags a raw value, a shorthand key and a nested relation filter', () => {
      expect(scan(`
        prisma.user.findUnique({ where: { email: input.email } });
        prisma.user.create({ data: { username, password } });
        prisma.comment.findMany({ where: { user: { email: typed } } });
        tx.user.update({ where: { id }, data: { email: body.email } });
      `)).toEqual([
        'email: input.email',
        'username: username (shorthand)',
        'email: typed',
        'email: body.email',
      ]);
    });

    it('accepts helper calls, null, mapped lists and operator objects of those', () => {
      expect(scan(`
        prisma.user.findUnique({ where: { email: normalizeEmail(input.email) } });
        prisma.user.findUnique({ where: { username: normalizeUsernameForLookup(typed) } });
        prisma.comment.create({ data: { email: normalizeOptionalEmail(data.email) } });
        prisma.user.update({ where: { id }, data: { email: null } });
        prisma.emailSuppression.findMany({ where: { email: { in: emails.map(normalizeEmail) } } });
        prisma.comment.findMany({ where: { email: { not: null } }, select: { email: true } });
        prisma.user.create({ data: { username: ok ? normalizeUsername(a) : normalizeUsername(b) } });
      `)).toEqual([]);
    });

    it('accepts a const assigned from a helper, but not one shadowed or not const', () => {
      expect(scan(`
        async function ok(raw: string) {
          const email = normalizeEmail(raw);
          const username = normalizeUsername(raw);
          await prisma.user.findUnique({ where: { email } });
          await prisma.user.create({ data: { email: email, username } });
        }
        const email = normalizeEmail(outer);
        function shadowedByParam(email: string) { prisma.user.findUnique({ where: { email } }); }
        function shadowedByDestructuring({ email }: { email: string }) { prisma.user.findUnique({ where: { email } }); }
        function shadowedByLet() { let email = typed; prisma.comment.findMany({ where: { email } }); }
        function shadowedByLoop(list: string[]) { for (const email of list) prisma.user.findUnique({ where: { email } }); }
        async function rawConst() { const { email } = await request.json(); await prisma.user.update({ where: { id }, data: { email } }); }
      `)).toEqual([
        'email: email (shorthand)',
        'email: email (shorthand)',
        'email: email (shorthand)',
        'email: email (shorthand)',
        'email: email (shorthand)',
      ]);
    });

    it('flags a relation filter on email from another model', () => {
      expect(scan(`
        prisma.person.findMany({ where: { comments: { some: { email: user.email } } } });
        prisma.person.findMany({ where: { comments: { some: { email: normalizeEmail(user.email) } } } });
      `)).toEqual(['email: user.email']);
    });

    it('ignores other columns, select/orderBy shapes, non-Prisma objects and other models\' prebuilt clauses', () => {
      expect(scan(`
        prisma.person.findMany({ where: { emailAddress: x } });
        prisma.emailNotification.create({ data: { sentTo: x } });
        prisma.user.findMany({ orderBy: { email: 'asc' }, select: { username: true } });
        cache.user.update({ email: raw });
        prisma.person.findMany({ where: personWhere });
        prisma.town.create({ data: { ...validated } });
        prisma.auditLog.create({ data: { newValues: JSON.stringify({ username, email }) } });
      `)).toEqual([]);
    });

    it('scans inside a conditional spread and flags a spread it cannot see into', () => {
      expect(scan(`
        prisma.user.update({ where: { id }, data: { ...(extra && { firstName: x }), ...(ok ? { email: raw } : {}) } });
        prisma.user.create({ data: { ...input, password } });
      `)).toEqual(['email: raw', '...input']);
    });

    it('flags a prebuilt argument or clause it cannot see into', () => {
      expect(scan(`
        prisma.user.findFirst(query);
        prisma.emailSuppression.count({ where });
        prisma.user.update({ where: { id }, data: changes });
      `)).toEqual(['argument: query', 'where: where (built elsewhere)', 'data: changes (built elsewhere)']);
    });

    it('accepts a string literal only when it is already in normal form', () => {
      expect(scan(`
        prisma.user.create({ data: { username: 'admin', email: 'admin@example.com' } });
        prisma.user.create({ data: { username: 'Admin', email: ' admin@example.com' } });
        prisma.user.create({ data: { username: \`town_admin_\${i}\` } });
      `)).toEqual(["username: 'Admin'", "email: ' admin@example.com'", 'username: `town_admin_${i}`']);
    });
  });
});
