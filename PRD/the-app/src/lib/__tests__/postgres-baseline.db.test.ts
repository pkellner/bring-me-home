/**
 * db test (issue #1 step 2): the Postgres baseline migration, applied to the local database by the
 * db tests' globalSetup, gives exactly the Prisma schema, and the database sorts like MySQL's
 * case-insensitive collation (ICU), while equality stays byte-exact.
 */
import { execFileSync } from 'child_process';
import path from 'path';
import { prisma } from '@/lib/prisma';
import { emptyAllTables } from '@/test-utils/local-postgres';

const APP_ROOT = path.resolve(__dirname, '../../..');

beforeEach(() => emptyAllTables(prisma));
afterAll(() => prisma.$disconnect());

function town(name: string, slug: string) {
  return prisma.town.create({ data: { name, slug, state: 'CA', fullAddress: `${name}, CA` } });
}

describe('the baseline migration', () => {
  it('leaves no difference between the local database and prisma/schema.prisma', () => {
    // --exit-code: 0 when the two match, 2 when there is a difference (printed as SQL). The
    // database is read through the schema's datasource, so the URL stays in the environment.
    const schema = path.join(APP_ROOT, 'prisma/schema.prisma');
    let output = '';
    let exitCode = 0;
    try {
      output = execFileSync(process.execPath, [
        path.join(APP_ROOT, 'node_modules/prisma/build/index.js'), 'migrate', 'diff',
        '--from-schema-datasource', schema,
        '--to-schema-datamodel', schema,
        '--script', '--exit-code',
      ], { cwd: APP_ROOT, env: { ...process.env, PRISMA_HIDE_UPDATE_MESSAGE: '1' }, stdio: 'pipe' }).toString();
    } catch (error) {
      const failed = error as { status: number; stdout: Buffer; stderr: Buffer };
      exitCode = failed.status;
      output = `${failed.stdout}${failed.stderr}`;
    }
    expect({ exitCode, output: output.trim() }).toEqual({ exitCode: 0, output: '-- This is an empty migration.' });
  });

  it('is the only migration recorded, and it finished', async () => {
    const rows = await prisma.$queryRaw<Array<{ migration_name: string; finished: boolean }>>`
      SELECT migration_name, finished_at IS NOT NULL AS finished FROM _prisma_migrations
    `;
    expect(rows).toEqual([{ migration_name: expect.stringMatching(/^\d{14}_postgres_baseline$/), finished: true }]);
  });

  it('creates the 31 tables of the 31 models', async () => {
    const [{ count }] = await prisma.$queryRaw<Array<{ count: number }>>`
      SELECT COUNT(*)::int AS count FROM pg_tables WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'
    `;
    expect(count).toBe(31);
  });
});

describe('collation (the database is created with ICU, docs/POSTGRES.md)', () => {
  it('uses the ICU root locale', async () => {
    const [db] = await prisma.$queryRaw<Array<{ provider: string; locale: string }>>`
      SELECT datlocprovider::text AS provider, datlocale AS locale FROM pg_database WHERE datname = current_database()
    `;
    expect(db).toEqual({ provider: 'i', locale: 'und' });
  });

  it('ORDER BY name puts apple, Banana, cherry in that order', async () => {
    await town('cherry', 'cherry');
    await town('Banana', 'banana');
    await town('apple', 'apple');
    const rows = await prisma.$queryRaw<Array<{ name: string }>>`SELECT name FROM towns ORDER BY name`;
    expect(rows.map(r => r.name)).toEqual(['apple', 'Banana', 'cherry']);
  });

  it('sorts the same way through Prisma orderBy, upper case not before lower case', async () => {
    for (const name of ['Zapata', 'alpine', 'Borrego Springs', 'yuma', 'Écija']) {
      await town(name, name.toLowerCase().replace(/\W/g, '-'));
    }
    const towns = await prisma.town.findMany({ orderBy: { name: 'asc' }, select: { name: true } });
    expect(towns.map(t => t.name)).toEqual(['alpine', 'Borrego Springs', 'Écija', 'yuma', 'Zapata']);
  });

  it('keeps equality byte-exact, which is why emails and usernames are normalised in code', async () => {
    await town('Apple', 'apple');
    expect(await prisma.town.count({ where: { name: 'Apple' } })).toBe(1);
    expect(await prisma.town.count({ where: { name: 'apple' } })).toBe(0);
  });
});
