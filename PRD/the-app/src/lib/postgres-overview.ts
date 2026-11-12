/**
 * The read-only overview behind /admin/postgres: the database itself, its applied migrations and
 * each public table's row count and size. No row values are read.
 */
import { Prisma } from '@prisma/client';
import { prisma } from './prisma';
import { getConnectionCounts, getDatabaseVersion, poolSettingsFromUrl, type ConnectionCounts } from './database-health';

export type DatabaseInfo = {
  name: string;
  sizePretty: string;
  /** libc, icu or builtin, from `pg_database.datlocprovider`. */
  localeProvider: string;
  /** `datlocale` (Postgres 17+) for icu/builtin, else `datcollate`. */
  locale: string | null;
};

export type AppliedMigration = { name: string; finishedAt: Date };

export type TableStats = { name: string; rowCount: number; sizePretty: string };

export type PostgresOverview = {
  version: string;
  database: DatabaseInfo;
  connections: ConnectionCounts;
  /** `connection_limit` from DATABASE_URL, or null when the URL does not set it. */
  connectionLimit: number | null;
  migrations: AppliedMigration[];
  tables: TableStats[];
};

const LOCALE_PROVIDERS: Record<string, string> = { c: 'libc', i: 'icu', b: 'builtin' };

export async function getDatabaseInfo(): Promise<DatabaseInfo> {
  // datlocale exists only from Postgres 17, so it is read through to_jsonb (null before 17).
  const rows = await prisma.$queryRaw<Array<{ name: string; sizePretty: string; provider: string; locale: string | null }>>`
    SELECT
      d.datname AS name,
      pg_size_pretty(pg_database_size(d.datname)) AS "sizePretty",
      d.datlocprovider::text AS provider,
      COALESCE(to_jsonb(d)->>'datlocale', d.datcollate) AS locale
    FROM pg_database d
    WHERE d.datname = current_database()
  `;
  const row = rows[0];
  return {
    name: row.name,
    sizePretty: row.sizePretty,
    localeProvider: LOCALE_PROVIDERS[row.provider] ?? row.provider,
    locale: row.locale,
  };
}

export async function getAppliedMigrations(): Promise<AppliedMigration[]> {
  return prisma.$queryRaw<AppliedMigration[]>`
    SELECT migration_name AS name, finished_at AS "finishedAt"
    FROM _prisma_migrations
    WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL
    ORDER BY finished_at, migration_name
  `;
}

/**
 * One `SELECT count(*)` per table, joined into a single query. A table name is used as an
 * identifier only when it is one of `knownTables` (the names `pg_tables` returned), and is then
 * double-quoted with embedded quotes doubled, as Postgres `quote_ident` does.
 */
export function rowCountQuery(tables: string[], knownTables: string[]): Prisma.Sql {
  const known = new Set(knownTables);
  const parts = tables.map(table => {
    if (!known.has(table)) {
      throw new Error(`Not a table in pg_tables: ${table}`);
    }
    const identifier = `"public"."${table.replace(/"/g, '""')}"`;
    return Prisma.sql`SELECT ${table}::text AS name, count(*)::bigint AS "rowCount" FROM ${Prisma.raw(identifier)}`;
  });
  return Prisma.join(parts, ' UNION ALL ');
}

/** Every table in the public schema with its exact row count and total size, sorted by name. */
export async function getTableStats(): Promise<TableStats[]> {
  const tables = await prisma.$queryRaw<Array<{ name: string; sizePretty: string }>>`
    SELECT
      tablename AS name,
      pg_size_pretty(pg_total_relation_size(format('%I.%I', schemaname, tablename)::regclass)) AS "sizePretty"
    FROM pg_tables
    WHERE schemaname = 'public'
    ORDER BY tablename
  `;
  if (tables.length === 0) return [];

  const names = tables.map(table => table.name);
  const counts = await prisma.$queryRaw<Array<{ name: string; rowCount: bigint }>>(rowCountQuery(names, names));
  const countByName = new Map(counts.map(row => [row.name, Number(row.rowCount)]));
  return tables.map(table => ({
    name: table.name,
    rowCount: countByName.get(table.name) ?? 0,
    sizePretty: table.sizePretty,
  }));
}

export async function getPostgresOverview(): Promise<PostgresOverview> {
  const [version, database, connections, migrations, tables] = await Promise.all([
    getDatabaseVersion(),
    getDatabaseInfo(),
    getConnectionCounts(),
    getAppliedMigrations(),
    getTableStats(),
  ]);
  return {
    version,
    database,
    connections,
    connectionLimit: poolSettingsFromUrl(process.env.DATABASE_URL).connectionLimit,
    migrations,
    tables,
  };
}
