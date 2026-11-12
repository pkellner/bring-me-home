/**
 * Issue #1 step 2: every PrismaClient the app, the scripts, the seed and the load tests construct
 * takes its URL from `databaseUrl()` (src/lib/database-url.ts), so none of them can start against
 * a missing or MySQL URL. A new `new PrismaClient(...)` without it fails here.
 */
import fs from 'fs';
import path from 'path';
import ts from 'typescript';

const APP_ROOT = path.resolve(__dirname, '../../..');
const ROOTS = ['src', 'scripts', 'prisma', 'load-tests'];

function sourceFiles(): string[] {
  const files: string[] = [];
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
  ROOTS.map(root => path.join(APP_ROOT, root)).filter(fs.existsSync).forEach(walk);
  return files;
}

/** `<file>:<line>` of each `new PrismaClient(...)` whose argument does not call `databaseUrl()`. */
function clientsWithoutCheckedUrl(file: string, text: string): string[] {
  const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true);
  const found: string[] = [];
  const callsDatabaseUrl = (node: ts.Node): boolean =>
    (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === 'databaseUrl') ||
    ts.forEachChild(node, child => callsDatabaseUrl(child) || undefined) === true;
  const visit = (node: ts.Node) => {
    if (ts.isNewExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === 'PrismaClient') {
      const arg = node.arguments?.[0];
      if (!arg || !callsDatabaseUrl(arg)) {
        found.push(`${file}:${source.getLineAndCharacterOfPosition(node.getStart()).line + 1}`);
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return found;
}

describe('every PrismaClient gets its URL from databaseUrl()', () => {
  it('finds the clients it checks: the app, the 11 scripts, the seed and the 3 load tests', () => {
    const withClient = sourceFiles()
      .filter(file => fs.readFileSync(file, 'utf8').includes('new PrismaClient'))
      .map(file => path.relative(APP_ROOT, file))
      .sort();
    expect(withClient).toEqual(expect.arrayContaining([
      'src/lib/prisma.ts', 'prisma/seed.ts', 'scripts/find-password.ts', 'scripts/seed-email-templates.ts',
      'load-tests/monitor-performance.ts',
    ]));
    expect(withClient).toHaveLength(16);
  });

  it('no client is built without it', () => {
    const offenders = sourceFiles().flatMap(file =>
      clientsWithoutCheckedUrl(path.relative(APP_ROOT, file), fs.readFileSync(file, 'utf8')));
    expect(offenders).toEqual([]);
  });

  describe('the scan', () => {
    it('flags a client with no argument, with a raw env URL, and with no datasource', () => {
      expect(clientsWithoutCheckedUrl('x.ts', `
        const a = new PrismaClient();
        const b = new PrismaClient({ datasources: { db: { url: process.env.DATABASE_URL } } });
        const c = new PrismaClient({ log: ['query'] });
      `)).toEqual(['x.ts:2', 'x.ts:3', 'x.ts:4']);
    });

    it('accepts a client whose datasource URL is databaseUrl()', () => {
      expect(clientsWithoutCheckedUrl('x.ts', `
        const prisma = new PrismaClient({ log: ['query'], datasources: { db: { url: databaseUrl() } } });
      `)).toEqual([]);
    });
  });
});
