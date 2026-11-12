/**
 * Issue #1 step 4: copies a mysqldump (read by `mysqldump-reader.ts`) into an empty PostgreSQL
 * database that `prisma migrate deploy` has created, then checks the copy against the dump.
 * The CLI is `copy-dump-to-postgres.ts`; everything it does is in the plain functions here.
 *
 * - Values are bound as text (or bytes for `bytea`) and cast by SQL to the column's base type,
 *   so dates, decimals, floats and JSON reach Postgres exactly as the dump wrote them. Casts never
 *   carry a length or scale (`::text`, never `::varchar(191)`): an explicit cast with a length
 *   truncates silently, while assignment to the column fails loudly.
 * - Rows go in with plain INSERTs, so Prisma's `@updatedAt` and `@default` never run: `createdAt`
 *   and `updatedAt` keep the dump's values.
 * - The emails and usernames are stored in the app's own normalised form (`normalize-identity.ts`).
 * - The rows of the log tables are not copied (op, 2026-11-12); `_prisma_migrations` is not
 *   copied either: the target has its own baseline row from `prisma migrate deploy`.
 *
 * Messages name tables, columns and counts, never a value: dumps hold personal data.
 */
import { createHash } from 'crypto';
import type { PrismaClient } from '@prisma/client';
import { normalizeEmail, normalizeOptionalEmail, normalizeUsername } from '../../src/lib/normalize-identity';
import type { ColumnDef, DumpCell, DumpContents, TableDump } from './mysqldump-reader';
import { analyseIdentityValues, columnIndex, identityValues } from './dump-measurements';

/** The client calls this module uses, so a transaction client works as well as a PrismaClient. */
export type RawClient = Pick<PrismaClient, '$queryRawUnsafe' | '$executeRawUnsafe'>;

export const MIGRATIONS_TABLE = '_prisma_migrations';

/** Tables whose rows are not copied (op, 2026-11-12: "don't copy the log rows"); they stay empty. */
export const LOG_TABLES_NOT_COPIED: readonly string[] = ['audit_log', 'email_processor_logs', 'health_checks'];

export interface IdentityColumn {
  table: string;
  column: string;
  /** What the copy stores. */
  store: (value: string | null) => string | null;
  /** What the collision check groups by (the same function step 0's report used). */
  key: (value: string) => string;
  unique: boolean;
}

function required(normalize: (value: string) => string, where: string): (value: string | null) => string | null {
  return (value) => {
    if (value === null) throw new Error(`${where} is NULL in the dump but NOT NULL in the schema`);
    return normalize(value);
  };
}

export const IDENTITY_COLUMNS: readonly IdentityColumn[] = [
  { table: 'users', column: 'email', store: normalizeOptionalEmail, key: normalizeEmail, unique: true },
  { table: 'users', column: 'username', store: required(normalizeUsername, 'users.username'), key: normalizeUsername, unique: true },
  { table: 'email_suppressions', column: 'email', store: required(normalizeEmail, 'email_suppressions.email'), key: normalizeEmail, unique: true },
  {
    table: 'comment_verification_tokens',
    column: 'email',
    store: required(normalizeEmail, 'comment_verification_tokens.email'),
    key: normalizeEmail,
    unique: true,
  },
  { table: 'comments', column: 'email', store: normalizeOptionalEmail, key: normalizeEmail, unique: false },
];

export function identityColumn(table: string, column: string): IdentityColumn | undefined {
  return IDENTITY_COLUMNS.find((spec) => spec.table === table && spec.column === column);
}

// ---------------------------------------------------------------------------------------------
// The target database's schema

export interface TargetColumn {
  name: string;
  /** `pg_type.typname`, e.g. `bool`, `int4`, `timestamp`, `jsonb`, `EmailStatus`. */
  type: string;
  /** The base type for a cast, without length or scale, e.g. `character varying`, `"EmailStatus"`. */
  cast: string;
  isEnum: boolean;
  notNull: boolean;
}

export interface TargetTable {
  name: string;
  columns: TargetColumn[];
  primaryKey: string[];
  /** Tables this one has a foreign key to (itself excluded: a self-reference is refused). */
  references: string[];
  selfReference: boolean;
}

export interface TargetSchema {
  tables: Map<string, TargetTable>;
  enums: Map<string, string[]>;
}

/** Reads the tables, columns, keys and enums of the current schema. */
export async function readTargetSchema(client: RawClient): Promise<TargetSchema> {
  const columns = await client.$queryRawUnsafe<
    Array<{ table: string; column: string; type: string; typtype: string; cast: string; notnull: boolean }>
  >(`
    SELECT c.relname::text AS "table", a.attname::text AS "column", t.typname::text AS "type", t.typtype::text AS "typtype",
           format_type(a.atttypid, NULL) AS "cast", a.attnotnull AS "notnull"
    FROM pg_attribute a
    JOIN pg_class c ON c.oid = a.attrelid
    JOIN pg_type t ON t.oid = a.atttypid
    WHERE c.relnamespace = current_schema()::regnamespace AND c.relkind = 'r' AND a.attnum > 0 AND NOT a.attisdropped
    ORDER BY c.relname, a.attnum
  `);
  const keys = await client.$queryRawUnsafe<Array<{ table: string; column: string }>>(`
    SELECT c.relname::text AS "table", a.attname::text AS "column"
    FROM pg_index i
    JOIN pg_class c ON c.oid = i.indrelid
    JOIN pg_attribute a ON a.attrelid = c.oid AND a.attnum = ANY (i.indkey)
    WHERE i.indisprimary AND c.relnamespace = current_schema()::regnamespace
    ORDER BY c.relname, array_position(i.indkey::int2[], a.attnum)
  `);
  const foreignKeys = await client.$queryRawUnsafe<Array<{ table: string; ref: string }>>(`
    SELECT c.relname::text AS "table", r.relname::text AS "ref"
    FROM pg_constraint k
    JOIN pg_class c ON c.oid = k.conrelid
    JOIN pg_class r ON r.oid = k.confrelid
    WHERE k.contype = 'f' AND k.connamespace = current_schema()::regnamespace
  `);
  const enumRows = await client.$queryRawUnsafe<Array<{ type: string; label: string }>>(`
    SELECT t.typname::text AS "type", e.enumlabel::text AS "label"
    FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid
    ORDER BY t.typname, e.enumsortorder
  `);

  const tables = new Map<string, TargetTable>();
  const tableFor = (name: string): TargetTable => {
    let table = tables.get(name);
    if (!table) {
      table = { name, columns: [], primaryKey: [], references: [], selfReference: false };
      tables.set(name, table);
    }
    return table;
  };
  for (const row of columns) {
    tableFor(row.table).columns.push({
      name: row.column,
      type: row.type,
      cast: row.cast,
      isEnum: row.typtype === 'e',
      notNull: row.notnull,
    });
  }
  for (const row of keys) tableFor(row.table).primaryKey.push(row.column);
  for (const row of foreignKeys) {
    const table = tableFor(row.table);
    if (row.ref === row.table) table.selfReference = true;
    else if (!table.references.includes(row.ref)) table.references.push(row.ref);
  }
  const enums = new Map<string, string[]>();
  for (const row of enumRows) enums.set(row.type, [...(enums.get(row.type) ?? []), row.label]);
  return { tables, enums };
}

/**
 * Tables in an order where every table comes after the tables it references (ties broken by
 * name, so the order is the same on every run). A cycle or a self-reference throws: rows of such
 * a table would need ordering inside the table, which this copy does not do.
 */
export function insertOrder(tables: Map<string, Pick<TargetTable, 'name' | 'references' | 'selfReference'>>): string[] {
  const order: string[] = [];
  const done = new Set<string>();
  const remaining = new Set(tables.keys());
  for (const table of tables.values()) {
    if (table.selfReference) throw new Error(`${table.name} has a foreign key to itself; the copy does not order rows within a table`);
    for (const ref of table.references) {
      if (!tables.has(ref)) throw new Error(`${table.name} references ${ref}, which is not in the target`);
    }
  }
  while (remaining.size > 0) {
    const ready = [...remaining]
      .filter((name) => (tables.get(name) as TargetTable).references.every((ref) => done.has(ref)))
      .sort();
    if (ready.length === 0) throw new Error(`Foreign keys form a cycle among: ${[...remaining].sort().join(', ')}`);
    for (const name of ready) {
      order.push(name);
      done.add(name);
      remaining.delete(name);
    }
  }
  return order;
}

// ---------------------------------------------------------------------------------------------
// Checks before anything is written

/** Reasons the dump must not be copied; empty when it may be. */
export function checkDump(dump: DumpContents): string[] {
  const problems: string[] = [];
  if (!dump.header.completed) problems.push('the dump has no "-- Dump completed" line: it was cut off');

  for (const spec of IDENTITY_COLUMNS) {
    const table = dump.tables.get(spec.table);
    if (!table) {
      problems.push(`the dump has no table ${spec.table}`);
      continue;
    }
    const analysis = analyseIdentityValues(identityValues(table, spec.column), spec.key);
    if (analysis.collisionGroups > 0) {
      problems.push(
        `${spec.table}.${spec.column}: ${analysis.collisionGroups} groups of different values become one value when normalised (${analysis.collisionRows} rows)`,
      );
    }
    if (spec.unique && analysis.duplicateNormalizedGroups > 0) {
      problems.push(
        `${spec.table}.${spec.column}: ${analysis.duplicateNormalizedGroups} normalised values repeat in a unique column (${analysis.duplicateNormalizedRows} rows)`,
      );
    }
  }

  const notifications = dump.tables.get('email_notifications');
  if (!notifications) {
    problems.push('the dump has no table email_notifications');
  } else {
    const status = columnIndex(notifications, 'status');
    const pending = notifications.rows.filter((row) => row[status] === 'QUEUED' || row[status] === 'SENDING').length;
    if (pending > 0) problems.push(`email_notifications: ${pending} rows are QUEUED or SENDING`);
  }

  for (const table of dump.tables.values()) {
    if (!rowsAreCopied(table.name)) continue;
    table.def.columns.forEach((column, index) => {
      const withNul = table.rows.filter((row) => typeof row[index] === 'string' && (row[index] as string).includes('\u0000')).length;
      if (withNul > 0) problems.push(`${table.name}.${column.name}: ${withNul} values hold a NUL byte, which Postgres text cannot store`);
    });
  }
  return problems;
}

export function rowsAreCopied(table: string): boolean {
  return table !== MIGRATIONS_TABLE && !LOG_TABLES_NOT_COPIED.includes(table);
}

/** Reasons the dump's tables and the target's tables do not line up; empty when they do. */
export function compareTables(dump: DumpContents, target: TargetSchema): string[] {
  const problems: string[] = [];
  const dumpNames = new Set([...dump.tables.keys()].filter((name) => name !== MIGRATIONS_TABLE));
  const targetNames = new Set([...target.tables.keys()].filter((name) => name !== MIGRATIONS_TABLE));
  for (const name of dumpNames) if (!targetNames.has(name)) problems.push(`table ${name} is in the dump but not in the target`);
  for (const name of targetNames) if (!dumpNames.has(name)) problems.push(`table ${name} is in the target but not in the dump`);
  if (!target.tables.has(MIGRATIONS_TABLE)) problems.push(`the target has no ${MIGRATIONS_TABLE}: run prisma migrate deploy first`);
  for (const name of dumpNames) {
    const targetTable = target.tables.get(name);
    if (!targetTable) continue;
    const dumpColumns = new Set((dump.tables.get(name) as TableDump).def.columns.map((c) => c.name));
    const targetColumns = new Set(targetTable.columns.map((c) => c.name));
    for (const column of dumpColumns) if (!targetColumns.has(column)) problems.push(`${name}.${column} is in the dump but not in the target`);
    for (const column of targetColumns) if (!dumpColumns.has(column)) problems.push(`${name}.${column} is in the target but not in the dump`);
  }
  return problems;
}

/** Reasons the target must not be written; empty when it may be. */
export async function checkTargetIsEmpty(client: RawClient, target: TargetSchema): Promise<string[]> {
  const problems: string[] = [];
  for (const name of [...target.tables.keys()].sort()) {
    if (name === MIGRATIONS_TABLE) continue;
    const [{ count }] = await client.$queryRawUnsafe<Array<{ count: number }>>(
      `SELECT COUNT(*)::int AS count FROM ${quoteIdent(name)}`,
    );
    if (count > 0) problems.push(`target table ${name} already has ${count} rows`);
  }
  if (target.tables.has(MIGRATIONS_TABLE)) {
    const [{ finished, unfinished }] = await client.$queryRawUnsafe<Array<{ finished: number; unfinished: number }>>(
      `SELECT COUNT(*) FILTER (WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL)::int AS finished,
              COUNT(*) FILTER (WHERE finished_at IS NULL)::int AS unfinished
       FROM ${quoteIdent(MIGRATIONS_TABLE)}`,
    );
    if (finished === 0) problems.push('the target has no finished migration: run prisma migrate deploy first');
    if (unfinished > 0) problems.push(`the target has ${unfinished} unfinished migrations`);
  }
  return problems;
}

// ---------------------------------------------------------------------------------------------
// Values

/** A value bound to an INSERT: text that SQL casts to the column's type, bytes, or NULL. */
export type BoundValue = string | Buffer | null;

const DATETIME_PATTERN = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}(\.\d{1,6})?$/;
const DECIMAL_PATTERN = /^-?\d+(\.\d+)?$/;
const INTEGER_TYPES = new Set(['int2', 'int4', 'int8']);
const FLOAT_TYPES = new Set(['float4', 'float8']);
const TEXT_TYPES = new Set(['text', 'varchar', 'bpchar']);

/**
 * The value a dump cell is written as in the target column, checked against the column's type.
 * `where` (`table.column`) is the only thing an error names.
 */
export function boundValue(cell: DumpCell, target: TargetColumn, enums: Map<string, string[]>, where: string): BoundValue {
  if (cell === null) {
    if (target.notNull) throw new Error(`${where}: NULL in a NOT NULL column`);
    return null;
  }
  const type = target.type;
  if (type === 'bool') {
    if (cell !== 0 && cell !== 1) throw new Error(`${where}: a boolean must be 0 or 1 in the dump`);
    return cell === 1 ? 'true' : 'false';
  }
  if (INTEGER_TYPES.has(type)) {
    if (typeof cell !== 'number' || !Number.isSafeInteger(cell)) throw new Error(`${where}: not an integer`);
    return String(cell);
  }
  if (FLOAT_TYPES.has(type)) {
    if (typeof cell !== 'number' || !Number.isFinite(cell)) throw new Error(`${where}: not a number`);
    // String() of a double is its shortest exact form; Postgres parses it back to the same double.
    return String(cell);
  }
  if (type === 'bytea') {
    if (!Buffer.isBuffer(cell)) throw new Error(`${where}: bytes expected from a binary column`);
    return cell;
  }
  if (typeof cell !== 'string') throw new Error(`${where}: text expected for a ${type} column`);
  if (type === 'numeric') {
    if (!DECIMAL_PATTERN.test(cell)) throw new Error(`${where}: not a decimal`);
    return cell;
  }
  if (type === 'timestamp') {
    if (!DATETIME_PATTERN.test(cell) || cell.startsWith('0000-')) throw new Error(`${where}: not a valid datetime`);
    return cell;
  }
  if (type === 'jsonb' || type === 'json') {
    try {
      JSON.parse(cell);
    } catch {
      throw new Error(`${where}: not valid JSON`);
    }
    // The dump's JSON text, parsed once by Postgres: a double-encoded value stays a JSON string,
    // and JSON null stays JSON null (SQL NULL arrived as `cell === null` above).
    return cell;
  }
  if (target.isEnum) {
    if (!(enums.get(type) ?? []).includes(cell)) throw new Error(`${where}: not a value of enum ${type}`);
    return cell;
  }
  if (TEXT_TYPES.has(type)) {
    if (cell.includes('\u0000')) throw new Error(`${where}: holds a NUL byte`);
    return cell;
  }
  throw new Error(`${where}: column type ${type} is not handled by the copy`);
}

export function quoteIdent(name: string): string {
  return `"${name.replace(/"/g, '""')}"`;
}

/**
 * The placeholder for a bound value: bytes as `bytea`; text as `text`, then cast to the column's
 * base type (no length, precision or scale). The `::text` step fixes the parameter's type, so
 * Postgres never asks the driver to send a string as an integer or a date.
 */
export function placeholder(position: number, target: TargetColumn): string {
  if (target.type === 'bytea') return `$${position}::bytea`;
  return `$${position}::text::${target.isEnum ? quoteIdent(target.type) : target.cast}`;
}

export interface PreparedTable {
  name: string;
  columns: TargetColumn[];
  rows: BoundValue[][];
}

/**
 * Every row the copy writes, in insert order, as bound values in the target's column order.
 * Built before the first write, so a value that does not fit stops the copy with nothing written.
 */
export function prepareRows(dump: DumpContents, target: TargetSchema): PreparedTable[] {
  return insertOrder(new Map([...target.tables].filter(([name]) => name !== MIGRATIONS_TABLE))).map((name) => {
    const targetTable = target.tables.get(name) as TargetTable;
    const dumpTable = dump.tables.get(name) as TableDump;
    const indexes = targetTable.columns.map((column) => columnIndex(dumpTable, column.name));
    const rows = rowsAreCopied(name)
      ? dumpTable.rows.map((row) =>
          targetTable.columns.map((column, i) => {
            const where = `${name}.${column.name}`;
            const identity = identityColumn(name, column.name);
            const cell = row[indexes[i]];
            const value = identity ? identity.store(cell === null ? null : String(cell)) : cell;
            return boundValue(value, column, target.enums, where);
          }),
        )
      : [];
    return { name, columns: targetTable.columns, rows };
  });
}

// ---------------------------------------------------------------------------------------------
// Writing

export const BATCH_LIMITS = { rows: 500, params: 30000, bytes: 1024 * 1024 };

function valueBytes(value: BoundValue): number {
  if (value === null) return 0;
  return Buffer.isBuffer(value) ? value.length : Buffer.byteLength(value, 'utf8');
}

/** Splits rows into batches within the row, parameter and byte limits; a row is never split. */
export function batches(rows: BoundValue[][], limits = BATCH_LIMITS): BoundValue[][][] {
  const result: BoundValue[][][] = [];
  let current: BoundValue[][] = [];
  let params = 0;
  let bytes = 0;
  for (const row of rows) {
    const rowBytes = row.reduce<number>((sum, value) => sum + valueBytes(value), 0);
    const full =
      current.length > 0 &&
      (current.length >= limits.rows || params + row.length > limits.params || bytes + rowBytes > limits.bytes);
    if (full) {
      result.push(current);
      current = [];
      params = 0;
      bytes = 0;
    }
    current.push(row);
    params += row.length;
    bytes += rowBytes;
  }
  if (current.length > 0) result.push(current);
  return result;
}

/** One multi-row INSERT with numbered parameters, each cast to its column's base type. */
export function insertStatement(table: string, columns: TargetColumn[], rowCount: number): string {
  const names = columns.map((column) => quoteIdent(column.name)).join(', ');
  const tuples: string[] = [];
  for (let r = 0; r < rowCount; r++) {
    const placeholders = columns.map((column, c) => placeholder(r * columns.length + c + 1, column));
    tuples.push(`(${placeholders.join(', ')})`);
  }
  return `INSERT INTO ${quoteIdent(table)} (${names}) VALUES ${tuples.join(', ')}`;
}

/** Writes the prepared rows. Run inside one transaction: a failure leaves the target empty. */
export async function writeRows(client: RawClient, tables: PreparedTable[]): Promise<{ table: string; rows: number; statements: number }[]> {
  const written: { table: string; rows: number; statements: number }[] = [];
  for (const table of tables) {
    let rows = 0;
    let statements = 0;
    for (const batch of batches(table.rows)) {
      const count = await client.$executeRawUnsafe(insertStatement(table.name, table.columns, batch.length), ...batch.flat());
      if (count !== batch.length) throw new Error(`${table.name}: inserted ${count} rows of a batch of ${batch.length}`);
      rows += count;
      statements++;
    }
    written.push({ table: table.name, rows, statements });
  }
  return written;
}

/** Checks the dump and the target, then writes every row in one transaction. */
export async function copyDump(
  prisma: PrismaClient,
  dump: DumpContents,
): Promise<{ refused: string[]; written: { table: string; rows: number; statements: number }[] }> {
  const dumpProblems = checkDump(dump);
  const target = await readTargetSchema(prisma);
  const tableProblems = compareTables(dump, target);
  const refused = [...dumpProblems, ...tableProblems];
  if (refused.length > 0) return { refused, written: [] };
  refused.push(...(await checkTargetIsEmpty(prisma, target)));
  if (refused.length > 0) return { refused, written: [] };
  const prepared = prepareRows(dump, target);
  const written = await prisma.$transaction(
    async (tx) => {
      // Re-checked inside the transaction, so a writer that started meanwhile is not overwritten.
      const late = await checkTargetIsEmpty(tx, target);
      if (late.length > 0) throw new Error(`The target stopped being empty: ${late.join('; ')}`);
      return writeRows(tx, prepared);
    },
    { maxWait: 10_000, timeout: 10 * 60_000 },
  );
  return { refused: [], written };
}

// ---------------------------------------------------------------------------------------------
// Verification: the target read back and compared with the dump, row by row

/**
 * The text each target column is read as, for comparison. Built from the Postgres type alone, so
 * it shares nothing with how the copy bound the value.
 */
export function readExpression(column: TargetColumn): string {
  const c = quoteIdent(column.name);
  if (column.type === 'bool') return `(${c}::int)::text`;
  if (column.type === 'timestamp') return `to_char(${c}, 'YYYY-MM-DD HH24:MI:SS.US')`;
  if (column.type === 'bytea') return `encode(sha256(${c}), 'hex')`;
  return `${c}::text`;
}

/** JSON with object keys sorted, so two equal values give the same text. */
export function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  if (value !== null && typeof value === 'object') {
    const entries = Object.keys(value as Record<string, unknown>)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableJson((value as Record<string, unknown>)[key])}`);
    return `{${entries.join(',')}}`;
  }
  return JSON.stringify(value);
}

const MYSQL_DATETIME_TYPES = new Set(['datetime', 'timestamp']);

/** A datetime as `YYYY-MM-DD HH:MM:SS.ffffff` (six fraction digits). */
function sixDigitFraction(value: string): string {
  const [whole, fraction = ''] = value.split('.');
  return `${whole}.${fraction.padEnd(6, '0')}`;
}

/** The comparison text of a dump cell, from the dump column's MySQL type (and the app's normalising). */
export function dumpComparable(cell: DumpCell, column: ColumnDef, identity: IdentityColumn | undefined): string | null {
  if (identity) return identity.store(cell === null ? null : String(cell));
  if (cell === null) return null;
  if (Buffer.isBuffer(cell)) return createHash('sha256').update(cell).digest('hex');
  if (typeof cell === 'number') return String(cell);
  if (MYSQL_DATETIME_TYPES.has(column.baseType)) return sixDigitFraction(cell);
  if (column.baseType === 'json') return stableJson(JSON.parse(cell));
  return cell;
}

/** The comparison text of a value read with `readExpression`. */
export function targetComparable(text: string | null, column: TargetColumn): string | null {
  if (text === null) return null;
  if (FLOAT_TYPES.has(column.type)) return String(Number(text));
  if (column.type === 'jsonb' || column.type === 'json') return stableJson(JSON.parse(text));
  return text;
}

function rowDigest(values: (string | null)[]): string {
  return createHash('sha256').update(JSON.stringify(values)).digest('hex');
}

export interface TableVerification {
  table: string;
  dumpRows: number;
  expectedRows: number;
  targetRows: number;
  missingRows: number;
  extraRows: number;
  differingRows: number;
  /** Columns that differ in at least one row (names only). */
  differingColumns: string[];
  match: boolean;
}

/** Compares one table: every row by primary key, every column by its comparison text. */
export async function verifyTable(client: RawClient, dumpTable: TableDump, target: TargetTable): Promise<TableVerification> {
  const expectedRows = rowsAreCopied(dumpTable.name) ? dumpTable.rows : [];
  const columns = target.columns;
  const keyPositions = target.primaryKey.map((name) => columns.findIndex((column) => column.name === name));
  if (keyPositions.length === 0 || keyPositions.includes(-1)) throw new Error(`${target.name} has no usable primary key`);
  const keyOf = (values: (string | null)[]) => JSON.stringify(keyPositions.map((p) => values[p]));

  const expected = new Map<string, (string | null)[]>();
  const dumpIndexes = columns.map((column) => columnIndex(dumpTable, column.name));
  for (const row of expectedRows) {
    const values = columns.map((column, i) =>
      dumpComparable(row[dumpIndexes[i]], dumpTable.def.columns[dumpIndexes[i]], identityColumn(dumpTable.name, column.name)),
    );
    expected.set(keyOf(values), values);
  }

  const select = columns.map((column, i) => `${readExpression(column)} AS c${i}`).join(', ');
  const read = await client.$queryRawUnsafe<Array<Record<string, string | null>>>(`SELECT ${select} FROM ${quoteIdent(target.name)}`);
  const differing = new Set<string>();
  let missingRows = 0;
  let extraRows = 0;
  let differingRows = 0;
  const seen = new Set<string>();
  for (const record of read) {
    const values = columns.map((column, i) => targetComparable(record[`c${i}`], column));
    const key = keyOf(values);
    seen.add(key);
    const want = expected.get(key);
    if (!want) {
      extraRows++;
      continue;
    }
    if (rowDigest(want) !== rowDigest(values)) {
      differingRows++;
      columns.forEach((column, i) => {
        if (want[i] !== values[i]) differing.add(column.name);
      });
    }
  }
  for (const key of expected.keys()) if (!seen.has(key)) missingRows++;
  return {
    table: dumpTable.name,
    dumpRows: dumpTable.rows.length,
    expectedRows: expected.size,
    targetRows: read.length,
    missingRows,
    extraRows,
    differingRows,
    differingColumns: [...differing].sort(),
    match: read.length === expected.size && missingRows === 0 && extraRows === 0 && differingRows === 0,
  };
}

/** Verifies every table of the dump except `_prisma_migrations`. */
export async function verifyCopy(client: RawClient, dump: DumpContents): Promise<{ problems: string[]; tables: TableVerification[] }> {
  const target = await readTargetSchema(client);
  const problems = compareTables(dump, target);
  if (problems.length > 0) return { problems, tables: [] };
  const tables: TableVerification[] = [];
  for (const name of [...dump.tables.keys()].filter((n) => n !== MIGRATIONS_TABLE).sort()) {
    tables.push(await verifyTable(client, dump.tables.get(name) as TableDump, target.tables.get(name) as TargetTable));
  }
  return { problems, tables };
}
