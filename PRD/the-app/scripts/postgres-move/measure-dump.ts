#!/usr/bin/env tsx
/**
 * Issue #1 step 0: measures a mysqldump before the move to PostgreSQL.
 *
 *   npx tsx scripts/postgres-move/measure-dump.ts <dump.sql> --detail-out <file>
 *
 * Reads the dump file only (no database connection). Prints an AGGREGATE report to stdout:
 * counts, sizes and column names, never a value, so it can be pasted into a PR or issue. Writes
 * a DETAILED report (the changed emails and usernames, collision groups, row keys: personal data)
 * to `--detail-out`, created with mode 600 in a directory with mode 700; the path must be outside
 * this repository.
 *
 * It uses the app's own `normalizeEmail` / `normalizeUsername`, so the collision report counts
 * exactly what the app will store.
 */
import { chmodSync, existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'fs';
import path from 'path';
import { normalizeEmail, normalizeUsername } from '../../src/lib/normalize-identity';
import { readDump, type DumpContents, type TableDump } from './mysqldump-reader';
import { readPrismaSchema } from './prisma-schema-reader';
import {
  analyseIdentityValues,
  analyseJsonColumn,
  checkKeys,
  checkMigrations,
  checkValues,
  columnIndex,
  commentEmailLinking,
  compareSchemaToDump,
  countBy,
  countInsertTuplesIndependently,
  identityValues,
  imageStats,
  scanTextColumns,
  tableCounts,
  type IdentityAnalysis,
  type TextColumnFinding,
} from './dump-measurements';

const APP_ROOT = path.resolve(__dirname, '..', '..');
const REPO_ROOT = path.resolve(APP_ROOT, '..', '..');

const IDENTITY_COLUMNS: { table: string; column: string; normalize: (value: string) => string; unique: boolean }[] = [
  { table: 'users', column: 'email', normalize: normalizeEmail, unique: true },
  { table: 'users', column: 'username', normalize: normalizeUsername, unique: true },
  { table: 'email_suppressions', column: 'email', normalize: normalizeEmail, unique: true },
  { table: 'comment_verification_tokens', column: 'email', normalize: normalizeEmail, unique: true },
  { table: 'comments', column: 'email', normalize: normalizeEmail, unique: false },
];

function parseArgs(argv: string[]): { dumpPath: string; detailOut: string } {
  const args = [...argv];
  let detailOut: string | null = null;
  const positional: string[] = [];
  while (args.length > 0) {
    const arg = args.shift() as string;
    if (arg === '--detail-out') {
      detailOut = args.shift() ?? null;
    } else {
      positional.push(arg);
    }
  }
  if (positional.length !== 1 || detailOut === null) {
    throw new Error('Usage: npx tsx scripts/postgres-move/measure-dump.ts <dump.sql> --detail-out <file>');
  }
  return { dumpPath: path.resolve(positional[0]), detailOut: path.resolve(detailOut) };
}

function isInside(child: string, parent: string): boolean {
  const relative = path.relative(parent, child);
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
}

function writePrivateFile(file: string, text: string): void {
  if (isInside(file, REPO_ROOT)) {
    throw new Error('The detail file holds personal data: --detail-out must be outside the repository');
  }
  const dir = path.dirname(file);
  mkdirSync(dir, { recursive: true, mode: 0o700 });
  chmodSync(dir, 0o700);
  if (existsSync(file)) chmodSync(file, 0o600);
  writeFileSync(file, text, { mode: 0o600 });
  chmodSync(file, 0o600);
}

function findings(list: TextColumnFinding[]): string {
  if (list.length === 0) return 'none';
  return list.map((f) => `${f.column} ${f.count}`).join('; ');
}

function sortedCounts(counts: Record<string, number>): string {
  const entries = Object.entries(counts).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  return entries.length === 0 ? 'none' : entries.map(([k, v]) => `${k} ${v}`).join(', ');
}

function bytesLabel(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KiB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MiB`;
}

function table(dump: DumpContents, name: string): TableDump | null {
  return dump.tables.get(name) ?? null;
}

function identityLines(label: string, a: IdentityAnalysis, unique: boolean): string[] {
  const lines = [
    `${label}: rows ${a.total}, non-null ${a.nonNull}, empty "" ${a.empty}, whitespace-only ${a.whitespaceOnly}`,
    `  normaliser changes ${a.changed.total}: case only ${a.changed.caseOnly}, whitespace only ${a.changed.whitespaceOnly}, both ${a.changed.both}`,
    `  surrounding whitespace: leading ${a.surroundingWhitespace.leading}, trailing ${a.surroundingWhitespace.trailing}, both ends ${a.surroundingWhitespace.bothEnds}; of these, not plain spaces ${a.surroundingWhitespace.notAsciiSpace}; inner whitespace (kept) ${a.innerWhitespace}`,
    `  collision groups (2+ distinct raw values, one normalised value): ${a.collisionGroups} groups, ${a.collisionRows} rows`,
    unique
      ? `  rows sharing a normalised value (would break the unique index): ${a.duplicateNormalizedGroups} groups, ${a.duplicateNormalizedRows} rows`
      : `  rows sharing a normalised value (not unique; expected): ${a.duplicateNormalizedGroups} groups, ${a.duplicateNormalizedRows} rows`,
    `  non-ASCII values ${a.nonAscii}; accent-folding groups (MySQL equal, Postgres different): ${a.accentGroups} groups, ${a.accentRows} rows`,
  ];
  return lines;
}

function identityDetail(label: string, a: IdentityAnalysis): string[] {
  const lines = [`## ${label}`];
  lines.push(`changes (${a.detail.changes.length}): key | kind | raw -> normalised`);
  for (const c of a.detail.changes) lines.push(`  ${c.key} | ${c.kind} | ${JSON.stringify(c.raw)} -> ${JSON.stringify(c.normalized)}`);
  lines.push(`collision groups (${a.detail.collisions.length}):`);
  for (const g of a.detail.collisions) {
    lines.push(`  ${JSON.stringify(g.normalized)}: ${g.members.map((m) => `${m.key}=${JSON.stringify(m.raw)}`).join(', ')}`);
  }
  lines.push(`rows sharing a normalised value (${a.detail.duplicates.length} groups):`);
  for (const g of a.detail.duplicates) lines.push(`  ${JSON.stringify(g.normalized)}: ${g.keys.join(', ')}`);
  lines.push(`surrounding whitespace (${a.detail.surroundingWhitespace.length}):`);
  for (const w of a.detail.surroundingWhitespace) lines.push(`  ${w.key} ${JSON.stringify(w.raw)}`);
  lines.push(`non-ASCII (${a.detail.nonAscii.length}):`);
  for (const n of a.detail.nonAscii) lines.push(`  ${n.key} ${JSON.stringify(n.raw)}`);
  lines.push(`accent-folding groups (${a.detail.accentGroups.length}):`);
  for (const g of a.detail.accentGroups) {
    lines.push(`  ${JSON.stringify(g.folded)}: ${g.members.map((m) => `${m.key}=${JSON.stringify(m.normalized)}`).join(', ')}`);
  }
  lines.push('');
  return lines;
}

function main(): void {
  const started = Date.now();
  const { dumpPath, detailOut } = parseArgs(process.argv.slice(2));
  const buf = readFileSync(dumpPath);
  const dump = readDump(buf);
  const out: string[] = [];
  const detail: string[] = [
    '# DETAILED step 0 report: PERSONAL DATA. Do not copy into a repo, issue, PR, log or chat.',
    `# Dump: ${path.basename(dumpPath)}, ${buf.length} bytes, generated ${new Date().toISOString()}`,
    '',
  ];
  const say = (line = ''): void => {
    out.push(line);
  };

  say('AGGREGATE step 0 report (issue #1): counts and names only, no values');
  say(`Dump file: ${path.basename(dumpPath)}, ${buf.length} bytes (${bytesLabel(buf.length)})`);
  const h = dump.header;
  say(`Header: mysqldump ${h.dumpToolVersion} Distrib ${h.dumpToolDistrib}, server ${h.serverVersion}, database ${h.database}, completed line ${h.completed ? 'present' : 'MISSING'}`);
  say(`SET NAMES in the dump: ${dump.setNames.join(', ') || 'none'}`);
  say(`Statements other than CREATE TABLE and INSERT: ${sortedCounts(dump.otherStatements)}`);
  say();

  // Rows and sizes, with an independent count of tuples per INSERT line.
  const independent = countInsertTuplesIndependently(buf);
  say('## Rows per table (reader) | INSERT statements | INSERT bytes | value bytes | independent tuple count');
  let totalRows = 0;
  let mismatches = 0;
  for (const count of tableCounts(dump)) {
    totalRows += count.rows;
    const other = independent.get(count.table) ?? { statements: 0, tuples: 0 };
    const agrees = other.tuples === count.rows && other.statements === count.insertStatements;
    if (!agrees) mismatches++;
    say(`${count.table} | ${count.rows} | ${count.insertStatements} | ${bytesLabel(count.insertBytes)} | ${bytesLabel(count.valueBytes)} | ${other.tuples}${agrees ? '' : ' MISMATCH'}`);
  }
  for (const name of independent.keys()) {
    if (!dump.tables.has(name)) {
      mismatches++;
      say(`${name} | INSERT lines with no CREATE TABLE | MISMATCH`);
    }
  }
  say(`Tables ${dump.tables.size}, rows ${totalRows}; reader and independent counter disagree on ${mismatches} tables`);
  say();

  // Schema and migrations.
  const schema = readPrismaSchema(readFileSync(path.join(APP_ROOT, 'prisma', 'schema.prisma'), 'utf8'));
  const comparison = compareSchemaToDump(schema, dump);
  say('## Prisma schema against the dump');
  say(`Schema provider ${comparison.provider}; models ${comparison.schemaTables}; dump tables ${comparison.dumpTables} (incl. _prisma_migrations)`);
  say(`Tables in the schema, not the dump: ${comparison.tablesOnlyInSchema.join(', ') || 'none'}`);
  say(`Tables in the dump, not the schema: ${comparison.tablesOnlyInDump.join(', ') || 'none'}`);
  say(`Columns in the schema, not the dump: ${comparison.columnsOnlyInSchema.join(', ') || 'none'}`);
  say(`Columns in the dump, not the schema: ${comparison.columnsOnlyInDump.join(', ') || 'none'}`);
  say(`Nullability differs: ${comparison.nullabilityMismatches.join(', ') || 'none'}`);
  say(`Enum values differ: ${comparison.enumMismatches.join(', ') || 'none'}`);
  const migrationDirs = readdirSync(path.join(APP_ROOT, 'prisma', 'migrations')).filter((name) =>
    statSync(path.join(APP_ROOT, 'prisma', 'migrations', name)).isDirectory(),
  );
  const migrations = checkMigrations(dump, migrationDirs);
  if (migrations) {
    say(`_prisma_migrations: ${migrations.rowsInDump} rows; repo has ${migrations.directoriesInRepo} migration folders; not applied in the dump: ${migrations.notApplied.join(', ') || 'none'}; in the dump, not the repo: ${migrations.notInRepo.join(', ') || 'none'}; unfinished ${migrations.unfinished}; rolled back ${migrations.rolledBack}`);
  } else {
    say('_prisma_migrations: MISSING from the dump');
  }
  say();

  // Images.
  const images = table(dump, 'image_storage');
  if (images) {
    const s = imageStats(images);
    say('## image_storage');
    say(`Rows ${s.rows}; with data ${s.withData}; total data ${s.totalDataBytes} bytes (${bytesLabel(s.totalDataBytes)}); largest ${bytesLabel(s.maxDataBytes)}`);
    say(`size column differs from data length: ${s.sizeMismatches}`);
    say(`storageType: ${sortedCounts(s.byStorageType)}`);
    say(`mimeType: ${sortedCounts(s.byMimeType)}; detected from bytes: ${sortedCounts(s.byDetectedKind)}; mimeType differs from bytes: ${s.mimeMismatches}`);
    say();
  }

  // Text columns.
  const text = scanTextColumns(dump);
  say('## Text columns (excluding JSON, enum and date columns)');
  say(`NUL bytes (Postgres text cannot store them): ${findings(text.nul)}`);
  say(`Other control characters: ${findings(text.otherControl)}`);
  say(`Characters outside the BMP (4-byte UTF-8, e.g. emoji): ${findings(text.supplementary)}`);
  say(`U+FFFD replacement characters: ${findings(text.replacementChar)}`);
  say(`Lone or doubled "?" (possible 4-byte characters lost to a utf8mb3 dump connection; heuristic): ${findings(text.suspectQuestionMarks)}`);
  const varchar255 = text.varcharMax.filter((v) => v.declared !== 191);
  say(`varchar columns not 191 wide (declared -> longest): ${varchar255.map((v) => `${v.column} ${v.declared} -> ${v.max}`).join('; ') || 'none'}`);
  const longest191 = text.varcharMax.filter((v) => v.declared === 191).sort((a, b) => b.max - a.max).slice(0, 8);
  say(`Longest varchar(191) columns (longest value): ${longest191.map((v) => `${v.column} ${v.max}`).join('; ')}`);
  say(`varchar values over their declared length: ${text.varcharMax.filter((v) => v.declared !== null && v.max > v.declared).length}`);
  const longestText = [...text.textMaxBytes].sort((a, b) => b.max - a.max).slice(0, 8);
  say(`Longest text columns (bytes; MySQL TEXT max 65535): ${longestText.map((v) => `${v.column} ${v.max}`).join('; ')}`);
  say();
  detail.push('## Lone or doubled "?" in text columns (context, up to 200)');
  for (const q of text.detail.suspectQuestionMarks) detail.push(`  ${q.column} ${q.key}: ${JSON.stringify(q.context)}`);
  detail.push('');

  // JSON columns.
  say('## JSON columns');
  for (const t of dump.tables.values()) {
    for (const column of t.def.columns) {
      if (column.baseType !== 'json') continue;
      const j = analyseJsonColumn(t, column.name);
      say(`${j.column}: non-null ${j.nonNull}, parse ${j.parses}, fail ${j.fails}, types ${sortedCounts(j.types)}, JSON strings wrapping JSON ${j.stringWrappingJson}`);
      if (j.detail.failKeys.length + j.detail.wrappedKeys.length > 0) {
        detail.push(`## ${j.column}: keys that fail to parse: ${j.detail.failKeys.join(', ') || 'none'}; wrapping JSON: ${j.detail.wrappedKeys.join(', ') || 'none'}`);
      }
    }
  }
  say();

  // Other values the copy must handle.
  const values = checkValues(dump);
  say('## Values the copy must handle');
  say(`Zero dates: ${findings(values.zeroDates)}; malformed dates: ${findings(values.badDates)}; date range ${values.dateRange.min ?? '-'} .. ${values.dateRange.max ?? '-'}`);
  say(`tinyint(1) values other than 0/1: ${findings(values.nonBooleanTinyint)}`);
  say(`Enum values outside the DDL list: ${findings(values.enumOutside)}`);
  say(`NULL in NOT NULL columns: ${findings(values.nullInNotNull)}`);
  say(`Non-finite floats: ${findings(values.nonFiniteFloats)}`);
  const keys = checkKeys(dump);
  say(`Duplicate primary keys: ${findings(keys.duplicatePrimaryKeys)}; duplicate unique keys (exact): ${findings(keys.duplicateUniqueKeys)}`);
  const orphaned = keys.orphans.filter((o) => o.rows > 0);
  say(`Foreign keys checked ${keys.orphans.length}; with orphan rows: ${orphaned.map((o) => `${o.constraint} ${o.rows}`).join('; ') || 'none'}`);
  say();
  for (const o of keys.detail.orphans) detail.push(`## Orphans ${o.constraint}: ${o.keys.join(', ')}`);
  if (keys.detail.orphans.length > 0) detail.push('');

  // Email state.
  const notifications = table(dump, 'email_notifications');
  if (notifications) {
    say('## email_notifications');
    say(`By status: ${sortedCounts(countBy(notifications, 'status'))}`);
    const status = columnIndex(notifications, 'status');
    const retry = columnIndex(notifications, 'retryCount');
    const failedRetryable = notifications.rows.filter((r) => r[status] === 'FAILED' && Number(r[retry]) < 3).length;
    say(`FAILED with retryCount < 3 (the worker would move them back to SENDING): ${failedRetryable}`);
    say();
  }
  const control = table(dump, 'email_processor_control');
  if (control) {
    say('## email_processor_control');
    for (const row of control.rows) {
      const get = (name: string): unknown => row[columnIndex(control, name)];
      say(`id ${String(get('id'))}: isPaused ${get('isPaused')}, isAborted ${get('isAborted')}, pausedBy ${get('pausedBy') === null ? 'not set' : 'set'}, pausedAt ${get('pausedAt') ?? 'null'}, abortedBy ${get('abortedBy') === null ? 'not set' : 'set'}, abortedAt ${get('abortedAt') ?? 'null'}, lastCheckAt ${get('lastCheckAt') ?? 'null'}, updatedAt ${get('updatedAt')}`);
    }
    if (control.rows.length === 0) say('no rows');
    say();
  }

  // Emails and usernames.
  say('## Emails and usernames, with the app\'s normalizeEmail / normalizeUsername (trim + lowercase)');
  say('MySQL utf8mb4_unicode_ci ignores case, accents and trailing spaces (PAD SPACE), so its unique indexes already reject case and trailing-space variants; leading spaces and other trailing whitespace are distinct there.');
  for (const spec of IDENTITY_COLUMNS) {
    const t = table(dump, spec.table);
    const label = `${spec.table}.${spec.column}`;
    if (!t) {
      say(`${label}: table MISSING`);
      continue;
    }
    const analysis = analyseIdentityValues(identityValues(t, spec.column), spec.normalize);
    for (const line of identityLines(label, analysis, spec.unique)) say(line);
    detail.push(...identityDetail(label, analysis));
  }
  const users = table(dump, 'users');
  const comments = table(dump, 'comments');
  if (users && comments) {
    const linking = commentEmailLinking(users, comments, normalizeEmail);
    say(`comments with an email ${linking.withEmail}: equal to a users.email ${linking.exact}, equal only after normalising both ${linking.onlyNormalized}, no user ${linking.noUser}; comments with userId set ${linking.withUserId}`);
  }
  say();
  say(`Run time ${((Date.now() - started) / 1000).toFixed(1)} s. Detailed report (personal data) written to the --detail-out file, mode 600.`);

  writePrivateFile(detailOut, detail.join('\n') + '\n');
  process.stdout.write(out.join('\n') + '\n');
}

try {
  main();
} catch (error) {
  // Messages from the reader name offsets, tables and columns, never values.
  console.error(error instanceof Error ? `${error.name}: ${error.message}` : 'Unknown error');
  process.exit(1);
}
