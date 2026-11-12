/**
 * db test (issue #1 step 4): copies a small fixture dump into the local Postgres and verifies it.
 * The fixture is built from the local database's own tables (after `prisma migrate deploy`), as
 * mysqldump would write them from MySQL, so the copy sees every table of the real schema. No real
 * dump is read.
 */
import { spawnSync } from 'child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'fs';
import os from 'os';
import path from 'path';
import { prisma } from '@/lib/prisma';
import { emptyAllTables } from '@/test-utils/local-postgres';
import { copyDump, readTargetSchema, verifyCopy, type TargetSchema, type TargetColumn } from '../copy-dump';
import { readDump, type DumpContents } from '../mysqldump-reader';
import { allBytes, dumpFromTables, seededRandom, type FixtureTable, type FixtureValue } from './dump-fixture';

const APP_ROOT = path.resolve(__dirname, '../../..');

beforeEach(() => emptyAllTables(prisma));
afterAll(() => prisma.$disconnect());

function mysqlType(column: TargetColumn, enums: Map<string, string[]>): string {
  if (column.isEnum) return `enum(${(enums.get(column.type) ?? []).map((label) => `'${label}'`).join(',')})`;
  const types: Record<string, string> = {
    bool: 'tinyint(1)',
    int4: 'int',
    int8: 'bigint',
    float8: 'double',
    numeric: 'decimal(10,2)',
    timestamp: 'datetime(3)',
    timestamptz: 'datetime(3)',
    jsonb: 'json',
    bytea: 'longblob',
    varchar: 'varchar(255)',
    text: 'longtext',
  };
  const type = types[column.type];
  if (!type) throw new Error(`fixture has no MySQL type for ${column.type}`);
  return type;
}

/** A value for a column the row does not set: NULL when allowed, else a plain value of its type. */
function filler(table: string, column: TargetColumn, enums: Map<string, string[]>, n: number): FixtureValue {
  if (!column.notNull) return null;
  if (column.isEnum) return (enums.get(column.type) ?? [])[0];
  switch (column.type) {
    case 'bool':
      return 0;
    case 'int4':
    case 'int8':
    case 'float8':
      return 0;
    case 'numeric':
      return { raw: '0.00' };
    case 'timestamp':
    case 'timestamptz':
      return `2025-03-04 05:06:07.${String(n).padStart(3, '0')}`;
    case 'jsonb':
      return '{}';
    case 'bytea':
      return Buffer.from('x');
    default:
      return `${table}.${column.name}.${n}`;
  }
}

type Rows = Record<string, Record<string, FixtureValue>[]>;

const BIG_IMAGE = (() => {
  const random = seededRandom(7);
  return Buffer.from(Array.from({ length: 300 * 1024 }, () => Math.floor(random() * 256)));
})();

/** The rows of the fixture, as mysqldump holds them (tinyint for booleans, JSON as text). */
function fixtureRows(): Rows {
  return {
    _prisma_migrations: [{ id: 'm1', migration_name: '20250101000000_mysql_init', applied_steps_count: 1 }],
    roles: [{ id: 'r1', name: 'admin', permissions: '{"towns":["read"]}' }],
    users: [
      {
        id: 'u1', username: 'Peter', email: ' Peter@Example.COM ', password: 'pw-secret', isActive: 1, optOutOfAllEmail: 0,
        allowAnonymousComments: 1, createdAt: '2024-01-02 03:04:05.678', updatedAt: '2025-06-07 08:09:10.111',
      },
      { id: 'u2', username: 'ann', email: null, password: 'pw-secret', isActive: 0, optOutOfAllEmail: 1, allowAnonymousComments: 0 },
    ],
    user_roles: [{ id: 'ur1', userId: 'u1', roleId: 'r1' }],
    towns: [{ id: 't1', name: 'Town One', slug: 'town-one', latitude: { raw: '37.7749295' }, longitude: { raw: '-122.4194155' } }],
    persons: [
      {
        id: 'p1', townId: 't1', firstName: 'Ana', lastName: 'Pérez', slug: 'ana-perez',
        bondAmount: { raw: '12345.67' }, statusDetails: '{"b": [1, 2], "a": "ñ"}',
      },
    ],
    comments: [
      { id: 'c1', personId: 'p1', userId: 'u1', email: 'Peter@Example.com', content: "line\nbreak 'quote' \\ back ????" },
      { id: 'c2', personId: 'p1', email: null, content: 'second' },
    ],
    image_storage: [
      { id: 'i1', data: allBytes(), size: 256, uploadedById: 'u1' },
      { id: 'i2', data: BIG_IMAGE, size: BIG_IMAGE.length },
    ],
    person_images: [{ id: 'pi1', personId: 'p1', imageId: 'i1' }],
    email_templates: [
      { id: 'e1', name: 'tpl', variables: '"[\\"a\\", \\"b\\"]"', webhookHeaders: 'null' },
      { id: 'e2', name: 'tpl2', variables: null, webhookHeaders: null },
    ],
    email_notifications: [{ id: 'n1', userId: 'u1', templateId: 'e1', status: 'SENT', customizations: '{"k": 1.5}' }],
    audit_log: [{ id: 'a1', action: 'LOGIN', entityType: 'user' }],
  };
}

/** A dump of every table of `target`, holding `rows`. */
function fixtureBytes(target: TargetSchema, rows: Rows): Buffer {
  const tables: FixtureTable[] = [...target.tables.values()].map((table) => ({
    name: table.name,
    columns: table.columns.map((column) => ({ name: column.name, type: mysqlType(column, target.enums), nullable: !column.notNull })),
    primaryKey: table.primaryKey,
    rows: (rows[table.name] ?? []).map((values, n) =>
      table.columns.map((column) =>
        column.name in values ? values[column.name] : filler(table.name, column, target.enums, n + 1),
      ),
    ),
  }));
  return dumpFromTables(tables);
}

function buildDump(target: TargetSchema, rows: Rows): DumpContents {
  return readDump(fixtureBytes(target, rows));
}

async function countRows(): Promise<number> {
  const target = await readTargetSchema(prisma);
  let total = 0;
  for (const name of target.tables.keys()) {
    if (name === '_prisma_migrations') continue;
    const [{ count }] = await prisma.$queryRawUnsafe<Array<{ count: number }>>(`SELECT COUNT(*)::int AS count FROM "${name}"`);
    total += count;
  }
  return total;
}

let target: TargetSchema;
beforeAll(async () => {
  target = await readTargetSchema(prisma);
});

describe('copyDump and verifyCopy on the local Postgres', () => {
  test('copies every table, skips the log rows, and the verification finds every row equal', async () => {
    const dump = buildDump(target, fixtureRows());
    const { refused, written } = await copyDump(prisma, dump);
    expect(refused).toEqual([]);
    const byTable = new Map(written.map((w) => [w.table, w.rows]));
    expect(byTable.get('users')).toBe(2);
    expect(byTable.get('image_storage')).toBe(2);
    expect(byTable.get('audit_log')).toBe(0);
    expect(byTable.has('_prisma_migrations')).toBe(false);
    expect(written.reduce((sum, w) => sum + w.rows, 0)).toBe(14);

    const { problems, tables } = await verifyCopy(prisma, dump);
    expect(problems).toEqual([]);
    expect(tables).toHaveLength(31);
    expect(tables.filter((t) => !t.match)).toEqual([]);
    expect(tables.find((t) => t.table === 'audit_log')).toMatchObject({ dumpRows: 1, expectedRows: 0, targetRows: 0, match: true });
  });

  test('the app reads the copied values with their types, and the dates are kept exactly', async () => {
    await copyDump(prisma, buildDump(target, fixtureRows()));

    const peter = await prisma.user.findUniqueOrThrow({ where: { id: 'u1' } });
    expect(peter).toMatchObject({ username: 'peter', email: 'peter@example.com', isActive: true, optOutOfAllEmail: false });
    expect(peter.createdAt.toISOString()).toBe('2024-01-02T03:04:05.678Z');
    expect(peter.updatedAt.toISOString()).toBe('2025-06-07T08:09:10.111Z');
    expect(await prisma.user.findUniqueOrThrow({ where: { id: 'u2' } })).toMatchObject({ email: null, isActive: false });

    const person = await prisma.person.findUniqueOrThrow({ where: { id: 'p1' } });
    expect(person.bondAmount?.toString()).toBe('12345.67');
    expect(person.statusDetails).toEqual({ a: 'ñ', b: [1, 2] });
    expect(person.lastName).toBe('Pérez');
    const town = await prisma.town.findUniqueOrThrow({ where: { id: 't1' } });
    expect([town.latitude, town.longitude]).toEqual([37.7749295, -122.4194155]);

    const comment = await prisma.comment.findUniqueOrThrow({ where: { id: 'c1' } });
    expect(comment).toMatchObject({ email: 'peter@example.com', content: "line\nbreak 'quote' \\ back ????" });

    const images = await prisma.imageStorage.findMany({ orderBy: { id: 'asc' } });
    expect(Buffer.compare(Buffer.from(images[0].data as Uint8Array), allBytes())).toBe(0);
    expect(Buffer.compare(Buffer.from(images[1].data as Uint8Array), BIG_IMAGE)).toBe(0);

    const template = await prisma.emailTemplate.findUniqueOrThrow({ where: { id: 'e1' } });
    expect(template.variables).toBe('["a", "b"]');
    const kinds = await prisma.$queryRawUnsafe<Array<{ id: string; kind: string | null }>>(
      `SELECT id, jsonb_typeof("webhookHeaders") AS kind FROM email_templates ORDER BY id`,
    );
    expect(kinds).toEqual([{ id: 'e1', kind: 'null' }, { id: 'e2', kind: null }]);
    expect((await prisma.emailNotification.findUniqueOrThrow({ where: { id: 'n1' } })).status).toBe('SENT');

    expect(await prisma.auditLog.count()).toBe(0);
    const migrations = await prisma.$queryRawUnsafe<Array<{ name: string }>>(`SELECT migration_name AS name FROM _prisma_migrations`);
    expect(migrations).toEqual([{ name: expect.stringMatching(/_postgres_baseline$/) }]);
  });

  test('refuses a target that already has rows, and writes nothing', async () => {
    const dump = buildDump(target, fixtureRows());
    await copyDump(prisma, dump);
    const before = await countRows();
    const second = await copyDump(prisma, dump);
    expect(second.written).toEqual([]);
    expect(second.refused).toContain('target table users already has 2 rows');
    expect(await countRows()).toBe(before);
  });

  test('refuses a dump with an email still SENDING, and writes nothing', async () => {
    const rows = fixtureRows();
    rows.email_notifications[0].status = 'SENDING';
    const { refused } = await copyDump(prisma, buildDump(target, rows));
    expect(refused).toEqual(['email_notifications: 1 rows are QUEUED or SENDING']);
    expect(await countRows()).toBe(0);
  });

  test('a failure part way through rolls the whole copy back', async () => {
    const rows = fixtureRows();
    rows.person_images[0].imageId = 'no-such-image';
    await expect(copyDump(prisma, buildDump(target, rows))).rejects.toThrow();
    expect(await countRows()).toBe(0);
  });

  test('the verification finds a changed, a missing and an added row', async () => {
    const dump = buildDump(target, fixtureRows());
    await copyDump(prisma, dump);
    await prisma.$executeRawUnsafe(`UPDATE comments SET content = 'changed' WHERE id = 'c1'`);
    await prisma.$executeRawUnsafe(`DELETE FROM comments WHERE id = 'c2'`);
    await prisma.$executeRawUnsafe(`UPDATE image_storage SET data = '\\x00'::bytea WHERE id = 'i2'`);
    await prisma.$executeRawUnsafe(`INSERT INTO audit_log (id, action, "entityType") VALUES ('a9', 'X', 'Y')`);

    const { tables } = await verifyCopy(prisma, dump);
    const byName = new Map(tables.map((t) => [t.table, t]));
    expect(byName.get('comments')).toMatchObject({ match: false, differingRows: 1, missingRows: 1, differingColumns: ['content'] });
    expect(byName.get('image_storage')).toMatchObject({ match: false, differingRows: 1, differingColumns: ['data'] });
    expect(byName.get('audit_log')).toMatchObject({ match: false, extraRows: 1, targetRows: 1 });
    expect(tables.filter((t) => !t.match).map((t) => t.table).sort()).toEqual(['audit_log', 'comments', 'image_storage']);
  });
});

describe('the command line', () => {
  const tsx = path.join(APP_ROOT, 'node_modules/tsx/dist/cli.mjs');
  const script = path.join(APP_ROOT, 'scripts/postgres-move/copy-dump-to-postgres.ts');
  let dir: string;
  let dumpPath: string;

  beforeAll(() => {
    dir = mkdtempSync(path.join(os.tmpdir(), 'copy-dump-test-'));
    dumpPath = path.join(dir, 'fixture.sql');
    writeFileSync(dumpPath, dumpFromTables([]));
  });
  afterAll(() => rmSync(dir, { recursive: true, force: true }));

  function run(...args: string[]) {
    const result = spawnSync(process.execPath, [tsx, script, dumpPath, '--target-url-env', 'LOCAL_POSTGRES_URL', ...args], {
      cwd: APP_ROOT,
      env: process.env,
      encoding: 'utf8',
      timeout: 60_000,
    });
    return { code: result.status, output: `${result.stdout}${result.stderr}` };
  }

  test('copies, verifies and prints counts only; a second run is refused; --verify-only passes', () => {
    writeFileSync(dumpPath, fixtureBytes(target, fixtureRows()));

    const first = run();
    expect(first.output).toMatch(/Copied 14 rows into 31 tables/);
    expect(first.output).toMatch(/Verified: 31 tables, 14 rows, every row equal to the dump/);
    expect(first.code).toBe(0);
    for (const value of ['Peter@Example', 'peter@example', 'Pérez', 'quote', 'pw-secret']) expect(first.output).not.toContain(value);

    const second = run();
    expect(second.code).toBe(2);
    expect(second.output).toContain('Refused, nothing written');

    const verify = run('--verify-only');
    expect(verify.code).toBe(0);
    expect(verify.output).not.toContain('Copied');
    expect(verify.output).toContain('Verified: 31 tables');
  });

  test('a missing URL variable is named without any URL', () => {
    const result = spawnSync(process.execPath, [tsx, script, dumpPath, '--target-url-env', 'NO_SUCH_URL_VARIABLE'], {
      cwd: APP_ROOT,
      env: process.env,
      encoding: 'utf8',
      timeout: 60_000,
    });
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('NO_SUCH_URL_VARIABLE is not set');
  });
});
