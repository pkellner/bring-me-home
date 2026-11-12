#!/usr/bin/env tsx
/**
 * Issue #1 step 4: copies the op's mysqldump into an empty PostgreSQL database, then verifies the
 * copy against the dump (row counts and every row's content, table by table).
 *
 *   npx tsx scripts/postgres-move/copy-dump-to-postgres.ts <dump.sql> --target-url-env <NAME> [--verify-only]
 *
 * `<NAME>` is the environment variable that holds the target's postgresql:// URL (for example
 * `LOCAL_POSTGRES_URL` from `.env`, or one the op exports in the shell for production); the URL is
 * never printed. The target must have had `prisma migrate deploy` and hold no rows. The copy runs
 * in one transaction: if anything fails, nothing is written and the same command can run again.
 * `--verify-only` skips the copy and only compares the target with the dump.
 *
 * Prints counts, table and column names only, never a value. Exit codes: 0 copied and verified,
 * 1 an error or a verification mismatch, 2 refused before writing.
 */
import { readFileSync, statSync } from 'fs';
import path from 'path';
import { config as loadEnv } from 'dotenv';
import { PrismaClient } from '@prisma/client';
import { requirePostgresUrl } from '../../src/lib/database-url';
import { readDump } from './mysqldump-reader';
import { copyDump, verifyCopy } from './copy-dump';

const APP_ROOT = path.resolve(__dirname, '..', '..');

function parseArgs(argv: string[]): { dumpPath: string; urlEnv: string; verifyOnly: boolean } {
  const args = [...argv];
  const positional: string[] = [];
  let urlEnv: string | null = null;
  let verifyOnly = false;
  while (args.length > 0) {
    const arg = args.shift() as string;
    if (arg === '--target-url-env') urlEnv = args.shift() ?? null;
    else if (arg === '--verify-only') verifyOnly = true;
    else if (arg.startsWith('--')) throw new Error(`Unknown option ${arg}`);
    else positional.push(arg);
  }
  if (positional.length !== 1 || !urlEnv) {
    throw new Error('Usage: copy-dump-to-postgres.ts <dump.sql> --target-url-env <NAME> [--verify-only]');
  }
  return { dumpPath: positional[0], urlEnv, verifyOnly };
}

function seconds(since: number): string {
  return `${((Date.now() - since) / 1000).toFixed(2)} s`;
}

/** A database error without the values Postgres may quote in it (e.g. a duplicate key's value). */
function safeMessage(error: unknown): string {
  if (!(error instanceof Error)) return 'Unknown error';
  const meta = (error as { code?: string; meta?: { code?: string } });
  const firstLine = error.message.split('\n').find((line) => line.trim() !== '') ?? '';
  const redacted = firstLine.replace(/\(([^()]*)\)=\([\s\S]*?\)/g, '($1)=(...)');
  const codes = [meta.code, meta.meta?.code].filter(Boolean).join(' ');
  return `${error.name}${codes ? ` [${codes}]` : ''}: ${redacted}`;
}

async function main(): Promise<number> {
  const { dumpPath, urlEnv, verifyOnly } = parseArgs(process.argv.slice(2));
  loadEnv({ path: path.join(APP_ROOT, '.env'), quiet: true });
  const url = requirePostgresUrl(process.env[urlEnv], urlEnv);

  let started = Date.now();
  const dump = readDump(readFileSync(dumpPath));
  const dumpRows = [...dump.tables.values()].reduce((sum, t) => sum + t.rows.length, 0);
  console.log(`Read the dump: ${statSync(dumpPath).size} bytes, ${dump.tables.size} tables, ${dumpRows} rows (${seconds(started)})`);

  const prisma = new PrismaClient({ datasources: { db: { url } } });
  try {
    if (!verifyOnly) {
      started = Date.now();
      const { refused, written } = await copyDump(prisma, dump);
      if (refused.length > 0) {
        console.log(`Refused, nothing written (${refused.length} reasons):`);
        for (const reason of refused) console.log(`  - ${reason}`);
        return 2;
      }
      const rows = written.reduce((sum, t) => sum + t.rows, 0);
      const statements = written.reduce((sum, t) => sum + t.statements, 0);
      console.log(`Copied ${rows} rows into ${written.length} tables with ${statements} INSERT statements, one transaction (${seconds(started)})`);
    }

    started = Date.now();
    const { problems, tables } = await verifyCopy(prisma, dump);
    if (problems.length > 0) {
      console.log('Verification could not run: the target and the dump have different tables or columns:');
      for (const problem of problems) console.log(`  - ${problem}`);
      return 1;
    }
    console.log('');
    console.log('table | dump rows | expected | target rows | rows hashed equal');
    for (const t of tables) {
      const equal = t.match ? 'yes' : `NO: ${t.missingRows} missing, ${t.extraRows} extra, ${t.differingRows} differ (${t.differingColumns.join(', ')})`;
      console.log(`${t.table} | ${t.dumpRows} | ${t.expectedRows} | ${t.targetRows} | ${equal}`);
    }
    const failed = tables.filter((t) => !t.match);
    const expected = tables.reduce((sum, t) => sum + t.expectedRows, 0);
    const found = tables.reduce((sum, t) => sum + t.targetRows, 0);
    console.log('');
    console.log(
      failed.length === 0
        ? `Verified: ${tables.length} tables, ${found} rows, every row equal to the dump (${seconds(started)})`
        : `MISMATCH in ${failed.length} of ${tables.length} tables: expected ${expected} rows, found ${found} (${seconds(started)})`,
    );
    return failed.length === 0 ? 0 : 1;
  } finally {
    await prisma.$disconnect();
  }
}

main().then(
  (code) => process.exit(code),
  (error: unknown) => {
    console.error(safeMessage(error));
    process.exit(1);
  },
);
