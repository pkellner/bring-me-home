/**
 * Unit tests for the step 4 copy (issue #1): how each dump value is mapped to a Postgres value,
 * the checks that refuse a copy, the insert order and batching, and the comparison the
 * verification makes. Dumps here are built by the fixture helpers; no real dump is read.
 */
import { createHash } from 'crypto';
import {
  batches,
  boundValue,
  checkDump,
  compareTables,
  dumpComparable,
  identityColumn,
  insertOrder,
  insertStatement,
  LOG_TABLES_NOT_COPIED,
  placeholder,
  prepareRows,
  readExpression,
  rowsAreCopied,
  stableJson,
  targetComparable,
  type TargetColumn,
  type TargetSchema,
  type TargetTable,
} from '../copy-dump';
import { readDump, type ColumnDef, type DumpContents } from '../mysqldump-reader';
import { allBytes, dumpFromTables, type FixtureTable, type FixtureValue } from './dump-fixture';

const ENUMS = new Map([['EmailStatus', ['QUEUED', 'SENDING', 'SENT', 'FAILED']]]);

/** [column, MySQL type, Postgres typname, nullable] */
type Spec = [string, string, string, boolean];

const CASTS: Record<string, string> = {
  bool: 'boolean',
  int4: 'integer',
  float8: 'double precision',
  numeric: 'numeric',
  timestamp: 'timestamp without time zone',
  jsonb: 'jsonb',
  bytea: 'bytea',
  text: 'text',
};

function targetColumn(name: string, type: string, nullable = true): TargetColumn {
  const isEnum = ENUMS.has(type);
  return { name, type, cast: isEnum ? `"${type}"` : CASTS[type], isEnum, notNull: !nullable };
}

interface MiniTable {
  name: string;
  specs: Spec[];
  rows: FixtureValue[][];
  references?: string[];
}

function fixtureTable(table: MiniTable): FixtureTable {
  return {
    name: table.name,
    columns: table.specs.map(([name, type, , nullable]) => ({ name, type, nullable })),
    primaryKey: [table.specs[0][0]],
    rows: table.rows,
  };
}

function targetTable(table: MiniTable): TargetTable {
  return {
    name: table.name,
    columns: table.specs.map(([name, , type, nullable]) => targetColumn(name, type, nullable)),
    primaryKey: [table.specs[0][0]],
    references: table.references ?? [],
    selfReference: false,
  };
}

function build(tables: MiniTable[]): { dump: DumpContents; target: TargetSchema } {
  const dump = readDump(dumpFromTables(tables.map(fixtureTable)));
  const target: TargetSchema = { tables: new Map(tables.map((t) => [t.name, targetTable(t)])), enums: ENUMS };
  return { dump, target };
}

const ID: Spec = ['id', 'varchar(191)', 'text', false];
const EMAIL: Spec = ['email', 'varchar(191)', 'text', true];

/** The tables `checkDump` reads, with no rows: a dump that passes every check. */
function identityTables(rows: Partial<Record<string, FixtureValue[][]>> = {}): MiniTable[] {
  return [
    { name: 'users', specs: [ID, EMAIL, ['username', 'varchar(191)', 'text', false]], rows: rows.users ?? [] },
    { name: 'email_suppressions', specs: [ID, ['email', 'varchar(191)', 'text', false]], rows: rows.email_suppressions ?? [] },
    { name: 'comment_verification_tokens', specs: [ID, ['email', 'varchar(191)', 'text', false]], rows: rows.comment_verification_tokens ?? [] },
    { name: 'comments', specs: [ID, EMAIL, ['content', 'text', 'text', true]], rows: rows.comments ?? [], references: ['users'] },
    {
      name: 'email_notifications',
      specs: [ID, ['status', "enum('QUEUED','SENDING','SENT','FAILED')", 'EmailStatus', false]],
      rows: rows.email_notifications ?? [],
    },
    { name: 'audit_log', specs: [ID, ['details', 'text', 'text', true]], rows: rows.audit_log ?? [] },
  ];
}

describe('boundValue: each dump value as the text (or bytes) bound to the INSERT', () => {
  test('tinyint(1) 1 and 0 become the booleans true and false', () => {
    expect(boundValue(1, targetColumn('a', 'bool'), ENUMS, 't.a')).toBe('true');
    expect(boundValue(0, targetColumn('a', 'bool'), ENUMS, 't.a')).toBe('false');
  });

  test('a tinyint other than 0 or 1 in a boolean column is refused', () => {
    expect(() => boundValue(2, targetColumn('a', 'bool'), ENUMS, 't.a')).toThrow('t.a: a boolean must be 0 or 1');
    expect(() => boundValue('1', targetColumn('a', 'bool'), ENUMS, 't.a')).toThrow('t.a');
  });

  test('integers keep their digits; a fraction in an integer column is refused', () => {
    expect(boundValue(-42, targetColumn('n', 'int4'), ENUMS, 't.n')).toBe('-42');
    expect(boundValue(0, targetColumn('n', 'int4'), ENUMS, 't.n')).toBe('0');
    expect(() => boundValue(1.5, targetColumn('n', 'int4'), ENUMS, 't.n')).toThrow('t.n: not an integer');
  });

  test('doubles are written in their shortest exact form, which parses back to the same double', () => {
    for (const value of [37.7749295, -122.4194155, 0.1 + 0.2, 1e-7, -2.5e-3, 5e300]) {
      const text = boundValue(value, targetColumn('f', 'float8'), ENUMS, 't.f') as string;
      expect(Number(text)).toBe(value);
    }
  });

  test('decimals keep the dump text exactly, scale included', () => {
    expect(boundValue('12345678.90', targetColumn('d', 'numeric'), ENUMS, 't.d')).toBe('12345678.90');
    expect(boundValue('-0.01', targetColumn('d', 'numeric'), ENUMS, 't.d')).toBe('-0.01');
    expect(() => boundValue('1e5', targetColumn('d', 'numeric'), ENUMS, 't.d')).toThrow('t.d: not a decimal');
  });

  test('datetime(3) text passes through unchanged (UTC in, timestamp without time zone out)', () => {
    expect(boundValue('2025-01-02 03:04:05.678', targetColumn('at', 'timestamp'), ENUMS, 't.at')).toBe('2025-01-02 03:04:05.678');
    expect(boundValue('2025-01-02 03:04:05', targetColumn('at', 'timestamp'), ENUMS, 't.at')).toBe('2025-01-02 03:04:05');
  });

  test('zero dates and malformed datetimes are refused', () => {
    expect(() => boundValue('0000-00-00 00:00:00', targetColumn('at', 'timestamp'), ENUMS, 't.at')).toThrow('not a valid datetime');
    expect(() => boundValue('2025-01-02T03:04:05Z', targetColumn('at', 'timestamp'), ENUMS, 't.at')).toThrow('not a valid datetime');
  });

  test('JSON keeps the dump text: objects, a double-encoded string, and JSON null', () => {
    const json = targetColumn('j', 'jsonb');
    expect(boundValue('{"a": [1, 2]}', json, ENUMS, 't.j')).toBe('{"a": [1, 2]}');
    const doubleEncoded = '"{\\"x\\": 1}"';
    expect(JSON.parse(boundValue(doubleEncoded, json, ENUMS, 't.j') as string)).toBe('{"x": 1}');
    expect(boundValue('null', json, ENUMS, 't.j')).toBe('null');
    expect(boundValue(null, json, ENUMS, 't.j')).toBeNull();
  });

  test('text that is not JSON in a JSON column is refused', () => {
    expect(() => boundValue('{not json', targetColumn('j', 'jsonb'), ENUMS, 't.j')).toThrow('t.j: not valid JSON');
  });

  test('bytes are passed through as the same Buffer, every byte value kept', () => {
    const bytes = allBytes();
    const bound = boundValue(bytes, targetColumn('b', 'bytea'), ENUMS, 't.b') as Buffer;
    expect(Buffer.compare(bound, bytes)).toBe(0);
    expect(() => boundValue('text', targetColumn('b', 'bytea'), ENUMS, 't.b')).toThrow('bytes expected');
  });

  test('enum values must be one of the Postgres enum labels', () => {
    const status = targetColumn('status', 'EmailStatus');
    expect(boundValue('SENT', status, ENUMS, 't.status')).toBe('SENT');
    expect(() => boundValue('sent', status, ENUMS, 't.status')).toThrow('not a value of enum EmailStatus');
  });

  test('NULL stays NULL in a nullable column and is refused in a NOT NULL one', () => {
    expect(boundValue(null, targetColumn('x', 'text', true), ENUMS, 't.x')).toBeNull();
    expect(() => boundValue(null, targetColumn('x', 'text', false), ENUMS, 't.x')).toThrow('t.x: NULL in a NOT NULL column');
  });

  test('text with a NUL byte is refused; other text passes unchanged', () => {
    expect(boundValue('tab\there ñ ????', targetColumn('x', 'text'), ENUMS, 't.x')).toBe('tab\there ñ ????');
    expect(() => boundValue('a\u0000b', targetColumn('x', 'text'), ENUMS, 't.x')).toThrow('t.x: holds a NUL byte');
  });

  test('a column type the copy does not know is refused', () => {
    const column = { ...targetColumn('x', 'text'), type: 'timestamptz', cast: 'timestamp with time zone' };
    expect(() => boundValue('2025-01-01 00:00:00', column, ENUMS, 't.x')).toThrow('column type timestamptz is not handled');
  });

  test('error messages name the table and column, never the value', () => {
    const secret = 'person@example.com';
    for (const run of [
      () => boundValue(secret, targetColumn('x', 'bool'), ENUMS, 't.x'),
      () => boundValue(secret, targetColumn('x', 'jsonb'), ENUMS, 't.x'),
      () => boundValue(secret, targetColumn('x', 'timestamp'), ENUMS, 't.x'),
      () => boundValue(secret, targetColumn('x', 'EmailStatus'), ENUMS, 't.x'),
    ]) {
      expect(run).toThrow('t.x');
      expect(run).not.toThrow(secret);
    }
  });
});

describe('placeholder and insertStatement', () => {
  test('text values are typed as text, then cast to the column base type; bytes as bytea', () => {
    expect(placeholder(1, targetColumn('a', 'bool'))).toBe('$1::text::boolean');
    expect(placeholder(2, targetColumn('a', 'timestamp'))).toBe('$2::text::timestamp without time zone');
    expect(placeholder(3, targetColumn('a', 'EmailStatus'))).toBe('$3::text::"EmailStatus"');
    expect(placeholder(4, targetColumn('a', 'bytea'))).toBe('$4::bytea');
  });

  test('a cast never carries a length, so a long value fails at the column instead of being cut', () => {
    const varchar: TargetColumn = { name: 'v', type: 'varchar', cast: 'character varying', isEnum: false, notNull: false };
    expect(placeholder(1, varchar)).toBe('$1::text::character varying');
  });

  test('one multi-row INSERT numbers its parameters row by row', () => {
    const columns = [targetColumn('id', 'text'), targetColumn('n', 'int4')];
    expect(insertStatement('my"table', columns, 2)).toBe(
      'INSERT INTO "my""table" ("id", "n") VALUES ($1::text::text, $2::text::integer), ($3::text::text, $4::text::integer)',
    );
  });
});

describe('batches', () => {
  const row = (bytes: number): (string | Buffer)[] => ['id', Buffer.alloc(bytes)];

  test('splits at the row limit', () => {
    const result = batches([row(1), row(1), row(1)], { rows: 2, params: 100, bytes: 1000 });
    expect(result.map((b) => b.length)).toEqual([2, 1]);
  });

  test('splits at the parameter limit', () => {
    const result = batches([row(1), row(1), row(1)], { rows: 100, params: 4, bytes: 1000 });
    expect(result.map((b) => b.length)).toEqual([2, 1]);
  });

  test('splits at the byte limit (images go in small batches), and a large row goes alone', () => {
    const result = batches([row(400), row(400), row(5000), row(10)], { rows: 100, params: 100, bytes: 1000 });
    expect(result.map((b) => b.length)).toEqual([2, 1, 1]);
  });

  test('no rows, no batches', () => {
    expect(batches([])).toEqual([]);
  });
});

describe('insertOrder', () => {
  const table = (name: string, references: string[] = [], selfReference = false) => [name, { name, references, selfReference }] as const;

  test('puts each table after the tables it references, ties by name', () => {
    const order = insertOrder(new Map([table('comments', ['persons', 'users']), table('persons', ['towns']), table('users'), table('towns'), table('audit_log', ['users'])]));
    expect(order).toEqual(['towns', 'users', 'audit_log', 'persons', 'comments']);
  });

  test('refuses a cycle, a self-reference and a reference to a missing table', () => {
    expect(() => insertOrder(new Map([table('a', ['b']), table('b', ['a'])]))).toThrow('cycle among: a, b');
    expect(() => insertOrder(new Map([table('a', [], true)]))).toThrow('a has a foreign key to itself');
    expect(() => insertOrder(new Map([table('a', ['missing'])]))).toThrow('a references missing');
  });
});

describe('checkDump: the reasons a dump is refused before anything is written', () => {
  test('a clean dump passes', () => {
    const { dump } = build(identityTables({
      users: [['u1', 'A@X.com', 'Peter'], ['u2', null, 'ann']],
      comments: [['c1', 'a@x.com', 'hi'], ['c2', 'a@x.com', 'again']],
      email_notifications: [['n1', 'SENT'], ['n2', 'FAILED']],
    }));
    expect(checkDump(dump)).toEqual([]);
  });

  test('a dump without the "Dump completed" line is refused', () => {
    const { dump } = build(identityTables());
    dump.header.completed = false;
    expect(checkDump(dump)).toEqual(['the dump has no "-- Dump completed" line: it was cut off']);
  });

  test('two users whose emails differ only in case or spaces are refused', () => {
    const { dump } = build(identityTables({ users: [['u1', 'A@x.com', 'a'], ['u2', ' a@x.com', 'b']] }));
    expect(checkDump(dump)).toEqual([
      'users.email: 1 groups of different values become one value when normalised (2 rows)',
      'users.email: 1 normalised values repeat in a unique column (2 rows)',
    ]);
  });

  test('usernames, suppressions, verification tokens and comment emails are checked too', () => {
    const { dump } = build(identityTables({
      users: [['u1', null, 'Peter'], ['u2', null, 'peter']],
      email_suppressions: [['s1', 'b@y.org'], ['s2', 'B@Y.org']],
      comment_verification_tokens: [['t1', 'c@z.net '], ['t2', 'c@z.net']],
      comments: [['c1', 'D@w.com', null], ['c2', 'd@w.com', null]],
    }));
    const problems = checkDump(dump);
    expect(problems.filter((p) => p.includes('become one value')).map((p) => p.split(':')[0])).toEqual([
      'users.username',
      'email_suppressions.email',
      'comment_verification_tokens.email',
      'comments.email',
    ]);
    // comments.email is not unique: repeats are expected there and only collisions count.
    expect(problems.some((p) => p.startsWith('comments.email') && p.includes('unique'))).toBe(false);
  });

  test('QUEUED or SENDING emails are refused', () => {
    const { dump } = build(identityTables({ email_notifications: [['n1', 'QUEUED'], ['n2', 'SENDING'], ['n3', 'SENT']] }));
    expect(checkDump(dump)).toEqual(['email_notifications: 2 rows are QUEUED or SENDING']);
  });

  test('a NUL byte in a copied table is refused; in a log table that is not copied it is not', () => {
    const { dump } = build(identityTables({ comments: [['c1', null, 'a\u0000b']], audit_log: [['l1', 'x\u0000y']] }));
    expect(checkDump(dump)).toEqual(['comments.content: 1 values hold a NUL byte, which Postgres text cannot store']);
  });

  test('messages never hold a value', () => {
    const { dump } = build(identityTables({ users: [['u1', 'Secret@Mail.com', 'a'], ['u2', 'secret@mail.com', 'b']] }));
    expect(checkDump(dump).join('\n')).not.toMatch(/secret/i);
  });
});

describe('compareTables', () => {
  test('names tables and columns that are on one side only', () => {
    const { dump, target } = build([
      { name: 'a', specs: [ID, ['x', 'int', 'int4', true]], rows: [] },
      { name: 'b', specs: [ID], rows: [] },
    ]);
    target.tables.delete('b');
    target.tables.set('c', targetTable({ name: 'c', specs: [ID], rows: [] }));
    (target.tables.get('a') as TargetTable).columns[1] = targetColumn('y', 'int4');
    expect(compareTables(dump, target)).toEqual([
      'table b is in the dump but not in the target',
      'table c is in the target but not in the dump',
      'the target has no _prisma_migrations: run prisma migrate deploy first',
      'a.x is in the dump but not in the target',
      'a.y is in the target but not in the dump',
    ]);
  });
});

describe('prepareRows: the rows the copy writes', () => {
  const tables: MiniTable[] = [
    { name: '_prisma_migrations', specs: [ID], rows: [['m1']] },
    {
      name: 'users',
      specs: [ID, EMAIL, ['username', 'varchar(191)', 'text', false], ['isActive', 'tinyint(1)', 'bool', false], ['createdAt', 'datetime(3)', 'timestamp', false]],
      rows: [['u1', ' Ann@Example.COM ', 'Ann', 1, '2025-01-02 03:04:05.678'], ['u2', '', 'bob', 0, '2025-12-31 23:59:59.999']],
    },
    {
      name: 'persons',
      specs: [ID, ['bondAmount', 'decimal(10,2)', 'numeric', true], ['latitude', 'double', 'float8', true], ['statusDetails', 'json', 'jsonb', true]],
      rows: [['p1', { raw: '12345.60' }, { raw: '37.7749295' }, '{"a": 1}'], ['p2', null, null, 'null'], ['p3', null, null, null]],
    },
    { name: 'image_storage', specs: [ID, ['data', 'longblob', 'bytea', true]], rows: [['i1', allBytes()]], references: ['users'] },
    { name: 'audit_log', specs: [ID, ['details', 'text', 'text', true]], rows: [['l1', 'x']], references: ['users'] },
  ];

  function prepared() {
    const { dump, target } = build(tables);
    return new Map(prepareRows(dump, target).map((t) => [t.name, t]));
  }

  test('leaves out _prisma_migrations and writes no rows of the log tables', () => {
    const result = prepared();
    expect(result.has('_prisma_migrations')).toBe(false);
    expect(result.get('audit_log')?.rows).toEqual([]);
    expect(LOG_TABLES_NOT_COPIED).toEqual(['audit_log', 'email_processor_logs', 'health_checks']);
    expect(rowsAreCopied('audit_log')).toBe(false);
    expect(rowsAreCopied('comments')).toBe(true);
  });

  test('normalises emails and usernames with the app functions ("" email becomes NULL)', () => {
    expect(prepared().get('users')?.rows).toEqual([
      ['u1', 'ann@example.com', 'ann', 'true', '2025-01-02 03:04:05.678'],
      ['u2', null, 'bob', 'false', '2025-12-31 23:59:59.999'],
    ]);
  });

  test('decimals, doubles, JSON, JSON null and SQL NULL', () => {
    expect(prepared().get('persons')?.rows).toEqual([
      ['p1', '12345.60', '37.7749295', '{"a": 1}'],
      ['p2', null, null, 'null'],
      ['p3', null, null, null],
    ]);
  });

  test('blob bytes arrive unchanged', () => {
    const [[, data]] = prepared().get('image_storage')?.rows ?? [[]];
    expect(Buffer.compare(data as Buffer, allBytes())).toBe(0);
  });

  test('tables come in foreign-key order', () => {
    expect([...prepared().keys()]).toEqual(['persons', 'users', 'audit_log', 'image_storage']);
  });
});

describe('the comparison the verification makes', () => {
  const column = (baseType: string): ColumnDef => ({
    name: 'c', rawType: baseType, baseType, length: null, unsigned: false, nullable: true, enumValues: null,
    kind: baseType === 'longblob' ? 'binary' : baseType === 'int' || baseType === 'tinyint' ? 'integer' : baseType === 'double' ? 'float' : 'text',
    generated: false,
  });

  test('reads booleans as 1/0, timestamps with six fraction digits, bytes as a SHA-256', () => {
    expect(readExpression(targetColumn('a', 'bool'))).toBe('("a"::int)::text');
    expect(readExpression(targetColumn('a', 'timestamp'))).toBe(`to_char("a", 'YYYY-MM-DD HH24:MI:SS.US')`);
    expect(readExpression(targetColumn('a', 'bytea'))).toBe(`encode(sha256("a"), 'hex')`);
    expect(readExpression(targetColumn('a', 'jsonb'))).toBe('"a"::text');
  });

  test('dump and target sides agree for each type', () => {
    expect(dumpComparable(1, column('tinyint'), undefined)).toBe('1');
    expect(dumpComparable('2025-01-02 03:04:05.678', column('datetime'), undefined)).toBe('2025-01-02 03:04:05.678000');
    expect(dumpComparable('2025-01-02 03:04:05', column('datetime'), undefined)).toBe('2025-01-02 03:04:05.000000');
    expect(dumpComparable(37.7749295, column('double'), undefined)).toBe(targetComparable('37.7749295', targetColumn('c', 'float8')));
    expect(dumpComparable('{"b": 1, "a": [1, {"d": 2, "c": null}]}', column('json'), undefined)).toBe(
      targetComparable('{"a": [1, {"c": null, "d": 2}], "b": 1}', targetColumn('c', 'jsonb')),
    );
    expect(dumpComparable('"{\\"x\\": 1}"', column('json'), undefined)).toBe('"{\\"x\\": 1}"');
    expect(dumpComparable('null', column('json'), undefined)).toBe('null');
    expect(dumpComparable(null, column('json'), undefined)).toBeNull();
    expect(dumpComparable(allBytes(), column('longblob'), undefined)).toBe(createHash('sha256').update(allBytes()).digest('hex'));
  });

  test('JSON null and SQL NULL stay different', () => {
    expect(targetComparable('null', targetColumn('c', 'jsonb'))).toBe('null');
    expect(targetComparable(null, targetColumn('c', 'jsonb'))).toBeNull();
  });

  test('the five email and username columns are compared after normalising the dump side', () => {
    expect(dumpComparable(' A@B.com', column('varchar'), identityColumn('users', 'email'))).toBe('a@b.com');
    expect(dumpComparable('', column('varchar'), identityColumn('comments', 'email'))).toBeNull();
    expect(dumpComparable('Peter', column('varchar'), identityColumn('users', 'username'))).toBe('peter');
    expect(identityColumn('users', 'firstName')).toBeUndefined();
  });

  test('stableJson sorts keys at every depth and keeps arrays in order', () => {
    expect(stableJson({ b: [3, { y: 1, x: 2 }], a: 'é' })).toBe('{"a":"é","b":[3,{"x":2,"y":1}]}');
    expect(stableJson('s')).toBe('"s"');
    expect(stableJson(null)).toBe('null');
  });
});
