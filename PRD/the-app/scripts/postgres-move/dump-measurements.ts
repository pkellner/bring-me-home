/**
 * Measurements of a mysqldump for issue #1 step 0, as pure functions over `readDump`'s result.
 *
 * Each function returns aggregate numbers (safe to publish) and, where the op needs them to
 * decide, a `detail` part holding actual values (personal data: written only to the private
 * detail file by `measure-dump.ts`, never to stdout).
 */
import type { DumpCell, DumpContents, TableDump } from './mysqldump-reader';
import type { PrismaSchemaSummary } from './prisma-schema-reader';

// ---------------------------------------------------------------------------------------------
// Helpers

export function columnIndex(table: TableDump, column: string): number {
  const index = table.def.columns.findIndex((c) => c.name === column);
  if (index === -1) throw new Error(`${table.name} has no column ${column}`);
  return index;
}

/** The row's primary key as one string (columns joined with `|`), or its row number. */
export function rowKey(table: TableDump, row: DumpCell[], rowNumber: number): string {
  const pk = table.def.primaryKey;
  if (pk.length === 0) return `row ${rowNumber}`;
  return pk.map((name) => String(row[columnIndex(table, name)])).join('|');
}

function increment(counts: Record<string, number>, key: string, by = 1): void {
  counts[key] = (counts[key] ?? 0) + by;
}

/** Folds accents the way MySQL's utf8mb4_unicode_ci roughly does (NFD, drop combining marks). */
export function foldAccents(value: string): string {
  return value.normalize('NFD').replace(/[̀-ͯ]/g, '');
}

export function hasNonAscii(value: string): boolean {
  return /[^\x00-\x7f]/.test(value);
}

// ---------------------------------------------------------------------------------------------
// Row counts

export interface TableCount {
  table: string;
  rows: number;
  insertStatements: number;
  insertBytes: number;
  /** Sum of the byte lengths of the values (strings as UTF-8, Buffers as is, numbers as text). */
  valueBytes: number;
}

export function cellByteLength(cell: DumpCell): number {
  if (cell === null) return 0;
  if (Buffer.isBuffer(cell)) return cell.length;
  if (typeof cell === 'number') return String(cell).length;
  return Buffer.byteLength(cell, 'utf8');
}

export function tableCounts(dump: DumpContents): TableCount[] {
  return [...dump.tables.values()].map((table) => ({
    table: table.name,
    rows: table.rows.length,
    insertStatements: table.insertStatements,
    insertBytes: table.insertBytes,
    valueBytes: table.rows.reduce<number>(
      (sum, row) => sum + row.reduce<number>((s, cell) => s + cellByteLength(cell), 0),
      0,
    ),
  }));
}

/**
 * Counts the tuples of each INSERT line with code that shares nothing with the reader: one line
 * per INSERT (as mysqldump writes them), a quote/escape state machine, and `(` at depth zero.
 * Used to cross-check the reader's row counts on the real dump.
 */
export function countInsertTuplesIndependently(buf: Buffer): Map<string, { statements: number; tuples: number }> {
  const counts = new Map<string, { statements: number; tuples: number }>();
  const prefix = Buffer.from('INSERT INTO `', 'latin1');
  let lineStart = 0;
  while (lineStart < buf.length) {
    let lineEnd = buf.indexOf(0x0a, lineStart);
    if (lineEnd === -1) lineEnd = buf.length;
    if (buf.compare(prefix, 0, prefix.length, lineStart, lineStart + prefix.length) === 0) {
      const nameEnd = buf.indexOf(0x60, lineStart + prefix.length);
      const name = buf.toString('utf8', lineStart + prefix.length, nameEnd);
      let tuples = 0;
      let depth = 0;
      let inQuote = false;
      for (let i = nameEnd + 1; i < lineEnd; i++) {
        const byte = buf[i];
        if (inQuote) {
          if (byte === 0x5c) i++;
          else if (byte === 0x27) inQuote = false;
        } else if (byte === 0x27) {
          inQuote = true;
        } else if (byte === 0x28) {
          if (depth === 0) tuples++;
          depth++;
        } else if (byte === 0x29) {
          depth--;
        }
      }
      const entry = counts.get(name) ?? { statements: 0, tuples: 0 };
      entry.statements++;
      entry.tuples += tuples;
      counts.set(name, entry);
    }
    lineStart = lineEnd + 1;
  }
  return counts;
}

// ---------------------------------------------------------------------------------------------
// Schema against dump

export interface SchemaComparison {
  provider: string | null;
  schemaTables: number;
  dumpTables: number;
  tablesOnlyInSchema: string[];
  /** Tables in the dump with no model, other than `_prisma_migrations`. */
  tablesOnlyInDump: string[];
  columnsOnlyInSchema: string[];
  columnsOnlyInDump: string[];
  /** `table.column`: optional in one and required in the other. */
  nullabilityMismatches: string[];
  /** `table.column`: enum values that differ between the schema and the dump's DDL. */
  enumMismatches: string[];
}

export function compareSchemaToDump(schema: PrismaSchemaSummary, dump: DumpContents): SchemaComparison {
  const result: SchemaComparison = {
    provider: schema.provider,
    schemaTables: schema.models.length,
    dumpTables: dump.tables.size,
    tablesOnlyInSchema: [],
    tablesOnlyInDump: [],
    columnsOnlyInSchema: [],
    columnsOnlyInDump: [],
    nullabilityMismatches: [],
    enumMismatches: [],
  };
  const modelTables = new Set(schema.models.map((m) => m.table));
  for (const name of dump.tables.keys()) {
    if (!modelTables.has(name) && name !== '_prisma_migrations') result.tablesOnlyInDump.push(name);
  }
  for (const model of schema.models) {
    const table = dump.tables.get(model.table);
    if (!table) {
      result.tablesOnlyInSchema.push(model.table);
      continue;
    }
    const dumpColumns = new Map(table.def.columns.map((c) => [c.name, c]));
    const schemaColumns = new Set(model.fields.map((f) => f.column));
    for (const field of model.fields) {
      const column = dumpColumns.get(field.column);
      if (!column) {
        result.columnsOnlyInSchema.push(`${model.table}.${field.column}`);
        continue;
      }
      if (field.optional !== column.nullable) result.nullabilityMismatches.push(`${model.table}.${field.column}`);
      const enumValues = schema.enums.get(field.type);
      if (enumValues) {
        const same =
          column.enumValues !== null &&
          column.enumValues.length === enumValues.length &&
          column.enumValues.every((v, i) => v === enumValues[i]);
        if (!same) result.enumMismatches.push(`${model.table}.${field.column}`);
      }
    }
    for (const name of dumpColumns.keys()) {
      if (!schemaColumns.has(name)) result.columnsOnlyInDump.push(`${model.table}.${name}`);
    }
  }
  return result;
}

export interface MigrationCheck {
  rowsInDump: number;
  directoriesInRepo: number;
  /** In the repo's `prisma/migrations` but not recorded in the dump. */
  notApplied: string[];
  /** Recorded in the dump but not in the repo. */
  notInRepo: string[];
  unfinished: number;
  rolledBack: number;
}

/** Compares `_prisma_migrations` with the migration folder names in the repo. */
export function checkMigrations(dump: DumpContents, migrationDirectories: string[]): MigrationCheck | null {
  const table = dump.tables.get('_prisma_migrations');
  if (!table) return null;
  const name = columnIndex(table, 'migration_name');
  const finished = columnIndex(table, 'finished_at');
  const rolledBack = columnIndex(table, 'rolled_back_at');
  const applied = new Set(table.rows.map((row) => String(row[name])));
  const repo = new Set(migrationDirectories);
  return {
    rowsInDump: table.rows.length,
    directoriesInRepo: migrationDirectories.length,
    notApplied: migrationDirectories.filter((dir) => !applied.has(dir)),
    notInRepo: [...applied].filter((dir) => !repo.has(dir)),
    unfinished: table.rows.filter((row) => row[finished] === null).length,
    rolledBack: table.rows.filter((row) => row[rolledBack] !== null).length,
  };
}

// ---------------------------------------------------------------------------------------------
// Identity columns (emails and usernames)

export interface IdentityValue {
  key: string;
  value: string | null;
}

export interface IdentityAnalysis {
  total: number;
  nonNull: number;
  empty: number;
  /** Non-empty values that are only whitespace (normalise to ""). */
  whitespaceOnly: number;
  changed: { total: number; caseOnly: number; whitespaceOnly: number; both: number };
  surroundingWhitespace: { leading: number; trailing: number; bothEnds: number; notAsciiSpace: number };
  /** Values with whitespace inside (not at the ends), which normalising keeps. */
  innerWhitespace: number;
  nonAscii: number;
  /** Groups of two or more distinct raw values with the same normalised value. */
  collisionGroups: number;
  collisionRows: number;
  /** Groups of two or more rows with the same normalised value (a unique index would fail). */
  duplicateNormalizedGroups: number;
  duplicateNormalizedRows: number;
  /** Groups of two or more distinct normalised values equal once accents are folded. */
  accentGroups: number;
  accentRows: number;
  detail: {
    changes: { key: string; raw: string; normalized: string; kind: string }[];
    collisions: { normalized: string; members: { key: string; raw: string }[] }[];
    duplicates: { normalized: string; keys: string[] }[];
    accentGroups: { folded: string; members: { key: string; normalized: string }[] }[];
    surroundingWhitespace: { key: string; raw: string }[];
    nonAscii: { key: string; raw: string }[];
  };
}

export function analyseIdentityValues(
  values: IdentityValue[],
  normalize: (value: string) => string,
): IdentityAnalysis {
  const analysis: IdentityAnalysis = {
    total: values.length,
    nonNull: 0,
    empty: 0,
    whitespaceOnly: 0,
    changed: { total: 0, caseOnly: 0, whitespaceOnly: 0, both: 0 },
    surroundingWhitespace: { leading: 0, trailing: 0, bothEnds: 0, notAsciiSpace: 0 },
    innerWhitespace: 0,
    nonAscii: 0,
    collisionGroups: 0,
    collisionRows: 0,
    duplicateNormalizedGroups: 0,
    duplicateNormalizedRows: 0,
    accentGroups: 0,
    accentRows: 0,
    detail: { changes: [], collisions: [], duplicates: [], accentGroups: [], surroundingWhitespace: [], nonAscii: [] },
  };
  const byNormalized = new Map<string, { key: string; raw: string }[]>();
  for (const { key, value } of values) {
    if (value === null) continue;
    analysis.nonNull++;
    if (value === '') {
      analysis.empty++;
    } else if (value.trim() === '') {
      analysis.whitespaceOnly++;
    }
    const normalized = normalize(value);
    const trimmed = value.trim();
    const whitespaceChanged = trimmed !== value;
    const caseChanged = trimmed.toLowerCase() !== trimmed;
    if (normalized !== value) {
      analysis.changed.total++;
      const kind = whitespaceChanged && caseChanged ? 'both' : whitespaceChanged ? 'whitespace' : 'case';
      if (kind === 'both') analysis.changed.both++;
      else if (kind === 'whitespace') analysis.changed.whitespaceOnly++;
      else analysis.changed.caseOnly++;
      analysis.detail.changes.push({ key, raw: value, normalized, kind });
    }
    if (whitespaceChanged && trimmed !== '') {
      const leading = value.trimStart() !== value;
      const trailing = value.trimEnd() !== value;
      if (leading && trailing) analysis.surroundingWhitespace.bothEnds++;
      else if (leading) analysis.surroundingWhitespace.leading++;
      else analysis.surroundingWhitespace.trailing++;
      const ends = value.slice(0, value.length - value.trimStart().length) + value.slice(value.trimEnd().length);
      if (/[^ ]/.test(ends)) analysis.surroundingWhitespace.notAsciiSpace++;
      analysis.detail.surroundingWhitespace.push({ key, raw: value });
    }
    if (/\s/.test(trimmed)) analysis.innerWhitespace++;
    if (hasNonAscii(value)) {
      analysis.nonAscii++;
      analysis.detail.nonAscii.push({ key, raw: value });
    }
    const group = byNormalized.get(normalized) ?? [];
    group.push({ key, raw: value });
    byNormalized.set(normalized, group);
  }
  const byFolded = new Map<string, Set<string>>();
  for (const [normalized, members] of byNormalized) {
    const distinctRaw = new Set(members.map((m) => m.raw));
    if (distinctRaw.size > 1) {
      analysis.collisionGroups++;
      analysis.collisionRows += members.length;
      analysis.detail.collisions.push({ normalized, members });
    }
    if (members.length > 1) {
      analysis.duplicateNormalizedGroups++;
      analysis.duplicateNormalizedRows += members.length;
      analysis.detail.duplicates.push({ normalized, keys: members.map((m) => m.key) });
    }
    const folded = foldAccents(normalized);
    const set = byFolded.get(folded) ?? new Set<string>();
    set.add(normalized);
    byFolded.set(folded, set);
  }
  for (const [folded, normalizedValues] of byFolded) {
    if (normalizedValues.size < 2) continue;
    analysis.accentGroups++;
    const members: { key: string; normalized: string }[] = [];
    for (const normalized of normalizedValues) {
      for (const member of byNormalized.get(normalized) ?? []) members.push({ key: member.key, normalized });
    }
    analysis.accentRows += members.length;
    analysis.detail.accentGroups.push({ folded, members });
  }
  return analysis;
}

export function identityValues(table: TableDump, column: string): IdentityValue[] {
  const index = columnIndex(table, column);
  return table.rows.map((row, i) => {
    const cell = row[index];
    return { key: rowKey(table, row, i + 1), value: cell === null ? null : String(cell) };
  });
}

/**
 * How comments' emails match users' emails: exactly, only once both are normalised (MySQL's
 * collation matched these; Postgres will only after normalising), or not at all.
 */
export function commentEmailLinking(
  users: TableDump,
  comments: TableDump,
  normalize: (value: string) => string,
): { withEmail: number; exact: number; onlyNormalized: number; noUser: number; withUserId: number } {
  const userEmails = identityValues(users, 'email').filter((v) => v.value !== null);
  const exact = new Set(userEmails.map((v) => v.value as string));
  const normalized = new Set(userEmails.map((v) => normalize(v.value as string)));
  const userIdIndex = columnIndex(comments, 'userId');
  const result = { withEmail: 0, exact: 0, onlyNormalized: 0, noUser: 0, withUserId: 0 };
  const emailIndex = columnIndex(comments, 'email');
  for (const row of comments.rows) {
    if (row[userIdIndex] !== null) result.withUserId++;
    const email = row[emailIndex];
    if (email === null || email === '') continue;
    result.withEmail++;
    const value = String(email);
    if (exact.has(value)) result.exact++;
    else if (normalized.has(normalize(value))) result.onlyNormalized++;
    else result.noUser++;
  }
  return result;
}

// ---------------------------------------------------------------------------------------------
// Text, JSON, dates, booleans, enums

export interface TextColumnFinding {
  column: string;
  count: number;
}

export interface TextScan {
  /** `table.column` → rows whose value holds a NUL byte (Postgres text cannot store it). */
  nul: TextColumnFinding[];
  /** Rows holding other C0 control characters than tab, newline and carriage return. */
  otherControl: TextColumnFinding[];
  /** Rows holding a character outside the Basic Multilingual Plane (4-byte UTF-8, e.g. emoji). */
  supplementary: TextColumnFinding[];
  /** Rows holding U+FFFD, the replacement character. */
  replacementChar: TextColumnFinding[];
  /** Rows where `?` stands alone or doubled, a sign of 4-byte characters lost to utf8mb3. */
  suspectQuestionMarks: TextColumnFinding[];
  /** Longest value per varchar column, in characters (code points), with its declared length. */
  varcharMax: { column: string; declared: number | null; max: number }[];
  /** Longest value per text column, in UTF-8 bytes (MySQL TEXT holds up to 65,535). */
  textMaxBytes: { column: string; baseType: string; max: number }[];
  detail: { suspectQuestionMarks: { column: string; key: string; context: string }[] };
}

const SUSPECT_QUESTION = /\?\?|(^|\s)\?(\s|$)/;

function addFinding(list: TextColumnFinding[], column: string): void {
  const last = list[list.length - 1];
  if (last && last.column === column) last.count++;
  else list.push({ column, count: 1 });
}

/** Scans every text-kind column except JSON, enum and date columns. */
export function scanTextColumns(dump: DumpContents, contextLimit = 200): TextScan {
  const scan: TextScan = {
    nul: [],
    otherControl: [],
    supplementary: [],
    replacementChar: [],
    suspectQuestionMarks: [],
    varcharMax: [],
    textMaxBytes: [],
    detail: { suspectQuestionMarks: [] },
  };
  const skipTypes = new Set(['json', 'enum', 'set', 'date', 'datetime', 'timestamp', 'time']);
  for (const table of dump.tables.values()) {
    table.def.columns.forEach((column, index) => {
      if (column.kind !== 'text' || skipTypes.has(column.baseType)) return;
      const name = `${table.name}.${column.name}`;
      let maxChars = 0;
      let maxBytes = 0;
      table.rows.forEach((row, rowIndex) => {
        const cell = row[index];
        if (typeof cell !== 'string') return;
        if (cell.includes('\u0000')) addFinding(scan.nul, name);
        if (/[\u0001-\u0008\u000b\u000c\u000e-\u001f]/.test(cell)) addFinding(scan.otherControl, name);
        if (/[\ud800-\udbff][\udc00-\udfff]/.test(cell)) addFinding(scan.supplementary, name);
        if (cell.includes('�')) addFinding(scan.replacementChar, name);
        const suspect = SUSPECT_QUESTION.exec(cell);
        if (suspect) {
          addFinding(scan.suspectQuestionMarks, name);
          if (scan.detail.suspectQuestionMarks.length < contextLimit) {
            const at = suspect.index;
            scan.detail.suspectQuestionMarks.push({
              column: name,
              key: rowKey(table, row, rowIndex + 1),
              context: cell.slice(Math.max(0, at - 30), at + 30),
            });
          }
        }
        const chars = [...cell].length;
        if (chars > maxChars) maxChars = chars;
        const bytes = Buffer.byteLength(cell, 'utf8');
        if (bytes > maxBytes) maxBytes = bytes;
      });
      if (column.baseType === 'varchar' || column.baseType === 'char') {
        scan.varcharMax.push({ column: name, declared: column.length, max: maxChars });
      } else {
        scan.textMaxBytes.push({ column: name, baseType: column.baseType, max: maxBytes });
      }
    });
  }
  return scan;
}

export interface JsonAnalysis {
  column: string;
  nonNull: number;
  parses: number;
  fails: number;
  /** Top-level JSON types of the values that parse. */
  types: Record<string, number>;
  /** JSON strings whose content is itself a JSON object or array (`JSON.stringify` stored twice). */
  stringWrappingJson: number;
  detail: { failKeys: string[]; wrappedKeys: string[] };
}

function jsonType(value: unknown): string {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  return typeof value;
}

export function analyseJsonColumn(table: TableDump, column: string): JsonAnalysis {
  const index = columnIndex(table, column);
  const result: JsonAnalysis = {
    column: `${table.name}.${column}`,
    nonNull: 0,
    parses: 0,
    fails: 0,
    types: {},
    stringWrappingJson: 0,
    detail: { failKeys: [], wrappedKeys: [] },
  };
  table.rows.forEach((row, rowIndex) => {
    const cell = row[index];
    if (cell === null) return;
    result.nonNull++;
    const key = rowKey(table, row, rowIndex + 1);
    let parsed: unknown;
    try {
      parsed = JSON.parse(String(cell));
    } catch {
      result.fails++;
      result.detail.failKeys.push(key);
      return;
    }
    result.parses++;
    increment(result.types, jsonType(parsed));
    if (typeof parsed === 'string') {
      try {
        const inner: unknown = JSON.parse(parsed);
        if (inner !== null && typeof inner === 'object') {
          result.stringWrappingJson++;
          result.detail.wrappedKeys.push(key);
        }
      } catch {
        // A plain JSON string.
      }
    }
  });
  return result;
}

export interface ValueChecks {
  /** Date and time values that are not `YYYY-MM-DD[ HH:MM:SS[.fff]]`, or are zero dates. */
  badDates: TextColumnFinding[];
  zeroDates: TextColumnFinding[];
  dateRange: { min: string | null; max: string | null };
  /** tinyint(1) (Prisma Boolean) values other than 0 and 1. */
  nonBooleanTinyint: TextColumnFinding[];
  /** Enum values not in the column's DDL list. */
  enumOutside: TextColumnFinding[];
  /** NULL in a NOT NULL column. */
  nullInNotNull: TextColumnFinding[];
  /** Floats that are not finite. */
  nonFiniteFloats: TextColumnFinding[];
}

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}( \d{2}:\d{2}:\d{2}(\.\d{1,6})?)?$/;

export function checkValues(dump: DumpContents): ValueChecks {
  const checks: ValueChecks = {
    badDates: [],
    zeroDates: [],
    dateRange: { min: null, max: null },
    nonBooleanTinyint: [],
    enumOutside: [],
    nullInNotNull: [],
    nonFiniteFloats: [],
  };
  for (const table of dump.tables.values()) {
    table.def.columns.forEach((column, index) => {
      const name = `${table.name}.${column.name}`;
      const isDate = ['date', 'datetime', 'timestamp'].includes(column.baseType);
      const isBoolean = column.rawType === 'tinyint(1)';
      for (const row of table.rows) {
        const cell = row[index];
        if (cell === null) {
          if (!column.nullable) addFinding(checks.nullInNotNull, name);
          continue;
        }
        if (isDate) {
          const text = String(cell);
          if (text.startsWith('0000-00-00') || /^\d{4}-00-|^\d{4}-\d{2}-00/.test(text)) {
            addFinding(checks.zeroDates, name);
          } else if (!DATE_PATTERN.test(text)) {
            addFinding(checks.badDates, name);
          } else {
            if (checks.dateRange.min === null || text < checks.dateRange.min) checks.dateRange.min = text;
            if (checks.dateRange.max === null || text > checks.dateRange.max) checks.dateRange.max = text;
          }
        }
        if (isBoolean && cell !== 0 && cell !== 1) addFinding(checks.nonBooleanTinyint, name);
        if (column.enumValues && column.baseType === 'enum' && !column.enumValues.includes(String(cell))) {
          addFinding(checks.enumOutside, name);
        }
        if (column.kind === 'float' && typeof cell === 'number' && !Number.isFinite(cell)) {
          addFinding(checks.nonFiniteFloats, name);
        }
      }
    });
  }
  return checks;
}

// ---------------------------------------------------------------------------------------------
// Keys

export interface KeyChecks {
  /** Primary keys that repeat (exact bytes). */
  duplicatePrimaryKeys: TextColumnFinding[];
  /** Unique keys whose values repeat exactly (NULLs excepted). */
  duplicateUniqueKeys: TextColumnFinding[];
  /** Foreign keys whose child value has no parent row. */
  orphans: { constraint: string; rows: number }[];
  detail: { orphans: { constraint: string; keys: string[] }[] };
}

export function checkKeys(dump: DumpContents): KeyChecks {
  const result: KeyChecks = { duplicatePrimaryKeys: [], duplicateUniqueKeys: [], orphans: [], detail: { orphans: [] } };
  const tupleOf = (table: TableDump, row: DumpCell[], columns: string[]): string | null => {
    const parts: string[] = [];
    for (const name of columns) {
      const cell = row[columnIndex(table, name)];
      if (cell === null) return null;
      parts.push(Buffer.isBuffer(cell) ? cell.toString('hex') : String(cell));
    }
    return JSON.stringify(parts);
  };
  for (const table of dump.tables.values()) {
    const keys: { label: string; columns: string[]; primary: boolean }[] = [];
    if (table.def.primaryKey.length > 0) {
      keys.push({ label: `${table.name} PRIMARY`, columns: table.def.primaryKey, primary: true });
    }
    for (const unique of table.def.uniqueKeys) {
      keys.push({ label: `${table.name}.${unique.name ?? unique.columns.join('+')}`, columns: unique.columns, primary: false });
    }
    for (const key of keys) {
      const seen = new Set<string>();
      let duplicates = 0;
      for (const row of table.rows) {
        const tuple = tupleOf(table, row, key.columns);
        if (tuple === null) continue;
        if (seen.has(tuple)) duplicates++;
        seen.add(tuple);
      }
      if (duplicates > 0) {
        (key.primary ? result.duplicatePrimaryKeys : result.duplicateUniqueKeys).push({ column: key.label, count: duplicates });
      }
    }
    for (const fk of table.def.foreignKeys) {
      const constraint = `${table.name}.${fk.name ?? fk.columns.join('+')} -> ${fk.refTable}`;
      const parent = dump.tables.get(fk.refTable);
      const parentKeys = new Set<string>();
      if (parent) {
        for (const row of parent.rows) {
          const tuple = tupleOf(parent, row, fk.refColumns);
          if (tuple !== null) parentKeys.add(tuple);
        }
      }
      const orphanKeys: string[] = [];
      table.rows.forEach((row, rowIndex) => {
        const tuple = tupleOf(table, row, fk.columns);
        if (tuple !== null && !parentKeys.has(tuple)) orphanKeys.push(rowKey(table, row, rowIndex + 1));
      });
      result.orphans.push({ constraint, rows: orphanKeys.length });
      if (orphanKeys.length > 0) result.detail.orphans.push({ constraint, keys: orphanKeys });
    }
  }
  return result;
}

// ---------------------------------------------------------------------------------------------
// Images and email state

export function imageKindFromBytes(bytes: Buffer): string {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg';
  if (bytes.length >= 8 && bytes.toString('latin1', 0, 8) === '\x89PNG\r\n\x1a\n') return 'image/png';
  if (bytes.length >= 12 && bytes.toString('latin1', 0, 4) === 'RIFF' && bytes.toString('latin1', 8, 12) === 'WEBP') {
    return 'image/webp';
  }
  if (bytes.length >= 6 && /^GIF8[79]a$/.test(bytes.toString('latin1', 0, 6))) return 'image/gif';
  if (bytes.length >= 12 && bytes.toString('latin1', 4, 8) === 'ftyp') return 'image/heic-or-avif';
  return 'unknown';
}

export interface ImageStats {
  rows: number;
  withData: number;
  totalDataBytes: number;
  maxDataBytes: number;
  /** Rows whose `size` column differs from the length of `data`. */
  sizeMismatches: number;
  byStorageType: Record<string, number>;
  byMimeType: Record<string, number>;
  /** Kind detected from the first bytes of `data`. */
  byDetectedKind: Record<string, number>;
  /** Rows whose detected kind differs from `mimeType` (jpg/jpeg treated as one). */
  mimeMismatches: number;
}

export function imageStats(table: TableDump): ImageStats {
  const data = columnIndex(table, 'data');
  const size = columnIndex(table, 'size');
  const mime = columnIndex(table, 'mimeType');
  const storage = columnIndex(table, 'storageType');
  const stats: ImageStats = {
    rows: table.rows.length,
    withData: 0,
    totalDataBytes: 0,
    maxDataBytes: 0,
    sizeMismatches: 0,
    byStorageType: {},
    byMimeType: {},
    byDetectedKind: {},
    mimeMismatches: 0,
  };
  for (const row of table.rows) {
    increment(stats.byStorageType, String(row[storage]));
    const mimeType = String(row[mime]).toLowerCase().replace('image/jpg', 'image/jpeg');
    increment(stats.byMimeType, mimeType);
    const bytes = row[data];
    if (!Buffer.isBuffer(bytes)) continue;
    stats.withData++;
    stats.totalDataBytes += bytes.length;
    if (bytes.length > stats.maxDataBytes) stats.maxDataBytes = bytes.length;
    if (row[size] !== bytes.length) stats.sizeMismatches++;
    const kind = imageKindFromBytes(bytes);
    increment(stats.byDetectedKind, kind);
    if (kind !== mimeType) stats.mimeMismatches++;
  }
  return stats;
}

export function countBy(table: TableDump, column: string): Record<string, number> {
  const index = columnIndex(table, column);
  const counts: Record<string, number> = {};
  for (const row of table.rows) increment(counts, row[index] === null ? 'NULL' : String(row[index]));
  return counts;
}
