/**
 * Reads a mysqldump file (issue #1: the move from MySQL 8.0 to PostgreSQL).
 *
 * Production data reaches this work only as dumps the op takes, so this reader is the one way the
 * data is read: step 0 measures the dump with it, and step 4's copy script loads Postgres from it.
 *
 * The input is a Buffer, never a UTF-8 string: without `--hex-blob`, mysqldump writes binary
 * columns as escaped string literals that hold raw, non-UTF-8 bytes. The reader works on bytes
 * and decodes UTF-8 only for text columns, strictly (invalid UTF-8 throws instead of becoming
 * U+FFFD). Binary columns come back as Buffers with the exact bytes.
 *
 * What it understands: `CREATE TABLE` (column names, types, order, nullability, enum values,
 * primary, unique and foreign keys), `INSERT INTO ... [(columns)] VALUES (...),(...);` on one or
 * many lines, NULL, numbers, quoted strings with MySQL's escapes, charset introducers such as
 * `_binary '...'`, hex literals (`0x..`, `X'..'`), comments and `/*!...*\/` statements. Bit
 * literals, `DELIMITER` blocks and `ON DUPLICATE KEY UPDATE` are refused with an error.
 *
 * Errors name the byte offset, the table and the column, never a value: dumps hold personal data.
 */

// ---------------------------------------------------------------------------------------------
// Types

export type ColumnKind = 'binary' | 'integer' | 'decimal' | 'float' | 'text';

export interface ColumnDef {
  name: string;
  /** The type as written, lowercased, e.g. `varchar(191)`, `int unsigned`, `enum('a','b')`. */
  rawType: string;
  /** The type's first word, lowercased, e.g. `varchar`, `longblob`, `enum`. */
  baseType: string;
  /** The declared length of char, varchar, binary and varbinary columns. */
  length: number | null;
  unsigned: boolean;
  nullable: boolean;
  /** The allowed values of an enum or set column, in order. */
  enumValues: string[] | null;
  /** How a value of this column is returned: Buffer, number, string (exact decimal) or string. */
  kind: ColumnKind;
  generated: boolean;
}

export interface KeyDef {
  name: string | null;
  columns: string[];
}

export interface ForeignKeyDef {
  name: string | null;
  columns: string[];
  refTable: string;
  refColumns: string[];
}

export interface TableDef {
  name: string;
  columns: ColumnDef[];
  primaryKey: string[];
  uniqueKeys: KeyDef[];
  foreignKeys: ForeignKeyDef[];
}

/** A value as written in an INSERT, before the column's type is applied. */
export type SqlLiteral =
  | { kind: 'null' }
  | { kind: 'number'; text: string }
  | { kind: 'string'; bytes: Buffer; introducer: string | null }
  | { kind: 'hex'; bytes: Buffer };

/** A value after the column's type is applied. */
export type DumpCell = null | string | number | Buffer;

export type DumpStatement =
  | { type: 'createTable'; table: TableDef; offset: number; byteLength: number }
  | {
      type: 'insert';
      tableName: string;
      columnNames: string[] | null;
      rows: SqlLiteral[][];
      offset: number;
      byteLength: number;
    }
  | { type: 'conditionalComment'; text: string; offset: number; byteLength: number }
  | { type: 'other'; keyword: string; offset: number; byteLength: number };

export interface DumpHeader {
  /** `mysqldump` version and distribution, e.g. `10.13` and `8.0.40`. */
  dumpToolVersion: string | null;
  dumpToolDistrib: string | null;
  database: string | null;
  serverVersion: string | null;
  /** True when the file ends with mysqldump's `-- Dump completed` line (the dump was not cut off). */
  completed: boolean;
}

export interface TableDump {
  name: string;
  def: TableDef;
  rows: DumpCell[][];
  insertStatements: number;
  /** Bytes of this table's INSERT statements in the file. */
  insertBytes: number;
}

export interface DumpContents {
  header: DumpHeader;
  /** Every `SET NAMES x` the dump runs, in order (the connection charset the data was read with). */
  setNames: string[];
  /** Tables in the order of their CREATE TABLE statements. */
  tables: Map<string, TableDump>;
  /** Count of statements that are neither CREATE TABLE nor INSERT, by first keyword. */
  otherStatements: Record<string, number>;
}

export interface DumpParseError extends Error {
  name: 'DumpParseError';
  offset: number | null;
}

// ---------------------------------------------------------------------------------------------
// Errors

/** An error that names where, never what: the message must not contain dump values. */
export function dumpParseError(message: string, offset: number | null): DumpParseError {
  const where = offset === null ? '' : ` (at byte ${offset})`;
  const error = new Error(`${message}${where}`) as DumpParseError;
  error.name = 'DumpParseError';
  error.offset = offset;
  return error;
}

export function isDumpParseError(error: unknown): error is DumpParseError {
  return error instanceof Error && error.name === 'DumpParseError';
}

// ---------------------------------------------------------------------------------------------
// Bytes

const BACKSLASH = 0x5c;
const SINGLE_QUOTE = 0x27;
const DOUBLE_QUOTE = 0x22;
const BACKTICK = 0x60;
const SEMICOLON = 0x3b;
const OPEN_PAREN = 0x28;
const CLOSE_PAREN = 0x29;
const COMMA = 0x2c;
const HYPHEN = 0x2d;
const SLASH = 0x2f;
const STAR = 0x2a;
const HASH = 0x23;
const BANG = 0x21;
const NEWLINE = 0x0a;

function isSpace(byte: number): boolean {
  return byte === 0x20 || byte === 0x09 || byte === 0x0a || byte === 0x0d || byte === 0x0b || byte === 0x0c;
}

function isWordByte(byte: number): boolean {
  return (
    (byte >= 0x30 && byte <= 0x39) ||
    (byte >= 0x41 && byte <= 0x5a) ||
    (byte >= 0x61 && byte <= 0x7a) ||
    byte === 0x5f ||
    byte === 0x24
  );
}

function isDigit(byte: number): boolean {
  return byte >= 0x30 && byte <= 0x39;
}

function skipSpace(buf: Buffer, pos: number): number {
  let i = pos;
  while (i < buf.length && isSpace(buf[i])) i++;
  return i;
}

/** True when `buf` holds `word` (ASCII, any case) at `pos`, not followed by a word byte. */
function matchKeyword(buf: Buffer, pos: number, word: string): boolean {
  if (pos + word.length > buf.length) return false;
  for (let k = 0; k < word.length; k++) {
    const byte = buf[pos + k];
    const lower = byte >= 0x41 && byte <= 0x5a ? byte + 0x20 : byte;
    if (lower !== word.charCodeAt(k)) return false;
  }
  const next = pos + word.length;
  return next >= buf.length || !isWordByte(buf[next]);
}

function readWord(buf: Buffer, pos: number): string {
  let i = pos;
  while (i < buf.length && isWordByte(buf[i])) i++;
  return buf.toString('latin1', pos, i);
}

const strictUtf8 = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true });

/** UTF-8 decode that throws on invalid bytes instead of replacing them with U+FFFD. */
export function decodeUtf8Strict(bytes: Uint8Array): string {
  return strictUtf8.decode(bytes);
}

// ---------------------------------------------------------------------------------------------
// String literals

/**
 * The byte a backslash escape stands for, following MySQL's lexer: `\0 \b \n \r \t \Z` are
 * control bytes, `\%` and `\_` keep their backslash (they are two characters outside LIKE), and
 * any other `\x` is `x` (`\' \" \\`, and the `\` mysqldump puts before a byte that starts an
 * invalid multibyte sequence). Returns -1 for the two that keep the backslash.
 */
function escapedByte(byte: number): number {
  switch (byte) {
    case 0x30: // 0
      return 0x00;
    case 0x62: // b
      return 0x08;
    case 0x6e: // n
      return 0x0a;
    case 0x72: // r
      return 0x0d;
    case 0x74: // t
      return 0x09;
    case 0x5a: // Z
      return 0x1a;
    case 0x25: // %
    case 0x5f: // _
      return -1;
    default:
      return byte;
  }
}

/**
 * Reads a quoted string starting at the quote at `pos`. Returns the unescaped bytes and the
 * position after the closing quote. A doubled quote inside the string stands for one quote.
 */
export function readQuotedBytes(buf: Buffer, pos: number): { bytes: Buffer; end: number } {
  const quote = buf[pos];
  if (quote !== SINGLE_QUOTE && quote !== DOUBLE_QUOTE) {
    throw dumpParseError('Expected a quoted string', pos);
  }
  let i = pos + 1;
  for (;;) {
    if (i >= buf.length) throw dumpParseError('Unterminated string', pos);
    const byte = buf[i];
    if (byte === BACKSLASH) {
      i += 2;
      continue;
    }
    if (byte === quote) {
      if (i + 1 < buf.length && buf[i + 1] === quote) {
        i += 2;
        continue;
      }
      break;
    }
    i++;
  }
  const close = i;
  const scratch = Buffer.allocUnsafe(close - pos - 1);
  let written = 0;
  let j = pos + 1;
  while (j < close) {
    const byte = buf[j];
    if (byte === BACKSLASH) {
      const escaped = buf[j + 1];
      const value = escapedByte(escaped);
      if (value === -1) {
        scratch[written++] = BACKSLASH;
        scratch[written++] = escaped;
      } else {
        scratch[written++] = value;
      }
      j += 2;
    } else if (byte === quote) {
      scratch[written++] = quote;
      j += 2;
    } else {
      scratch[written++] = byte;
      j++;
    }
  }
  const bytes = Buffer.alloc(written);
  scratch.copy(bytes, 0, 0, written);
  return { bytes, end: close + 1 };
}

function hexToBytes(hex: string, offset: number): Buffer {
  if (hex.length % 2 !== 0 || !/^[0-9a-fA-F]*$/.test(hex)) {
    throw dumpParseError('Malformed hex literal', offset);
  }
  return Buffer.from(hex, 'hex');
}

const NUMBER_PATTERN = /^[-+]?(\d+\.?\d*|\.\d+)([eE][-+]?\d+)?$/;

/** Reads one value of an INSERT tuple at `pos`. */
export function readLiteral(buf: Buffer, pos: number): { literal: SqlLiteral; end: number } {
  const byte = buf[pos];
  if (byte === SINGLE_QUOTE || byte === DOUBLE_QUOTE) {
    const { bytes, end } = readQuotedBytes(buf, pos);
    return { literal: { kind: 'string', bytes, introducer: null }, end };
  }
  if (matchKeyword(buf, pos, 'null')) {
    return { literal: { kind: 'null' }, end: pos + 4 };
  }
  // N'...' (national character set) is a text string.
  if ((byte === 0x4e || byte === 0x6e) && buf[pos + 1] === SINGLE_QUOTE) {
    const { bytes, end } = readQuotedBytes(buf, pos + 1);
    return { literal: { kind: 'string', bytes, introducer: '_utf8mb4' }, end };
  }
  // Charset introducer: _binary '...', _utf8mb4'...', _binary 0x...
  if (byte === 0x5f) {
    const word = readWord(buf, pos);
    const introducer = word.toLowerCase();
    const next = skipSpace(buf, pos + word.length);
    if (buf[next] === SINGLE_QUOTE || buf[next] === DOUBLE_QUOTE) {
      const { bytes, end } = readQuotedBytes(buf, next);
      return { literal: { kind: 'string', bytes, introducer }, end };
    }
    const hex = readLiteral(buf, next);
    if (hex.literal.kind === 'hex') {
      return { literal: { kind: 'string', bytes: hex.literal.bytes, introducer }, end: hex.end };
    }
    throw dumpParseError('Charset introducer not followed by a string', pos);
  }
  // 0x0123 hex literal
  if (byte === 0x30 && (buf[pos + 1] === 0x78 || buf[pos + 1] === 0x58)) {
    let i = pos + 2;
    while (i < buf.length && isWordByte(buf[i])) i++;
    return { literal: { kind: 'hex', bytes: hexToBytes(buf.toString('latin1', pos + 2, i), pos) }, end: i };
  }
  // X'0123' hex literal
  if ((byte === 0x78 || byte === 0x58) && buf[pos + 1] === SINGLE_QUOTE) {
    const close = buf.indexOf(SINGLE_QUOTE, pos + 2);
    if (close === -1) throw dumpParseError('Unterminated hex literal', pos);
    return { literal: { kind: 'hex', bytes: hexToBytes(buf.toString('latin1', pos + 2, close), pos) }, end: close + 1 };
  }
  if ((byte === 0x62 || byte === 0x42) && buf[pos + 1] === SINGLE_QUOTE) {
    throw dumpParseError('Bit literals are not supported', pos);
  }
  if (isDigit(byte) || byte === HYPHEN || byte === 0x2b || byte === 0x2e) {
    let i = pos + 1;
    while (i < buf.length) {
      const b = buf[i];
      if (isDigit(b) || b === 0x2e || b === 0x65 || b === 0x45) {
        i++;
      } else if ((b === HYPHEN || b === 0x2b) && (buf[i - 1] === 0x65 || buf[i - 1] === 0x45)) {
        i++;
      } else {
        break;
      }
    }
    const text = buf.toString('latin1', pos, i);
    if (!NUMBER_PATTERN.test(text)) throw dumpParseError('Malformed number', pos);
    return { literal: { kind: 'number', text }, end: i };
  }
  throw dumpParseError('Unexpected value in INSERT', pos);
}

// ---------------------------------------------------------------------------------------------
// Identifiers

/** Reads a backticked or bare identifier at `pos`. */
function readIdentifier(buf: Buffer, pos: number): { name: string; end: number } {
  if (buf[pos] === BACKTICK) {
    const parts: Buffer[] = [];
    let start = pos + 1;
    let i = start;
    for (;;) {
      const close = buf.indexOf(BACKTICK, i);
      if (close === -1) throw dumpParseError('Unterminated identifier', pos);
      if (buf[close + 1] === BACKTICK) {
        parts.push(buf.subarray(start, close + 1));
        start = close + 2;
        i = start;
        continue;
      }
      parts.push(buf.subarray(start, close));
      return { name: decodeUtf8Strict(Buffer.concat(parts)), end: close + 1 };
    }
  }
  const word = readWord(buf, pos);
  if (word === '') throw dumpParseError('Expected an identifier', pos);
  return { name: word, end: pos + word.length };
}

function expectKeyword(buf: Buffer, pos: number, word: string): number {
  const at = skipSpace(buf, pos);
  if (!matchKeyword(buf, at, word)) throw dumpParseError(`Expected ${word.toUpperCase()}`, at);
  return at + word.length;
}

function expectByte(buf: Buffer, pos: number, byte: number, what: string): number {
  const at = skipSpace(buf, pos);
  if (buf[at] !== byte) throw dumpParseError(`Expected ${what}`, at);
  return at + 1;
}

// ---------------------------------------------------------------------------------------------
// INSERT

/** Parses an INSERT statement that starts at `pos`. Returns its rows and the position after `;`. */
export function parseInsert(
  buf: Buffer,
  pos: number,
): { tableName: string; columnNames: string[] | null; rows: SqlLiteral[][]; end: number } {
  let i = expectKeyword(buf, pos, 'insert');
  i = skipSpace(buf, i);
  if (matchKeyword(buf, i, 'ignore')) i += 'ignore'.length;
  i = expectKeyword(buf, i, 'into');
  i = skipSpace(buf, i);
  const table = readIdentifier(buf, i);
  i = skipSpace(buf, table.end);

  let columnNames: string[] | null = null;
  if (buf[i] === OPEN_PAREN) {
    columnNames = [];
    i++;
    for (;;) {
      i = skipSpace(buf, i);
      const column = readIdentifier(buf, i);
      columnNames.push(column.name);
      i = skipSpace(buf, column.end);
      if (buf[i] === COMMA) {
        i++;
        continue;
      }
      i = expectByte(buf, i, CLOSE_PAREN, ') after the column list');
      break;
    }
    i = skipSpace(buf, i);
  }
  if (matchKeyword(buf, i, 'values')) {
    i += 'values'.length;
  } else if (matchKeyword(buf, i, 'value')) {
    i += 'value'.length;
  } else {
    throw dumpParseError(`Expected VALUES in INSERT into ${table.name}`, i);
  }

  const rows: SqlLiteral[][] = [];
  for (;;) {
    i = expectByte(buf, i, OPEN_PAREN, `( to start a row of ${table.name}`);
    const row: SqlLiteral[] = [];
    for (;;) {
      i = skipSpace(buf, i);
      if (buf[i] === CLOSE_PAREN && row.length === 0) {
        i++;
        break;
      }
      let value: { literal: SqlLiteral; end: number };
      try {
        value = readLiteral(buf, i);
      } catch (error) {
        if (isDumpParseError(error)) {
          throw dumpParseError(
            `${error.message.replace(/ \(at byte \d+\)$/, '')} in row ${rows.length + 1}, value ${row.length + 1} of ${table.name}`,
            error.offset,
          );
        }
        throw error;
      }
      row.push(value.literal);
      i = skipSpace(buf, value.end);
      if (buf[i] === COMMA) {
        i++;
        continue;
      }
      if (buf[i] === CLOSE_PAREN) {
        i++;
        break;
      }
      throw dumpParseError(`Expected , or ) in row ${rows.length + 1} of ${table.name}`, i);
    }
    rows.push(row);
    i = skipSpace(buf, i);
    if (buf[i] === COMMA) {
      i++;
      continue;
    }
    if (buf[i] === SEMICOLON) {
      return { tableName: table.name, columnNames, rows, end: i + 1 };
    }
    if (matchKeyword(buf, i, 'on')) {
      throw dumpParseError(`ON DUPLICATE KEY UPDATE is not supported (INSERT into ${table.name})`, i);
    }
    throw dumpParseError(`Expected , or ; after row ${rows.length} of ${table.name}`, i);
  }
}

// ---------------------------------------------------------------------------------------------
// CREATE TABLE

/** Splits `text` on `separator` outside quotes, backticks and parentheses. */
export function splitTopLevel(text: string, separator: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let quote: string | null = null;
  let start = 0;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quote !== null) {
      if (ch === '\\' && quote !== '`') {
        i++;
      } else if (ch === quote) {
        if (text[i + 1] === quote) {
          i++;
        } else {
          quote = null;
        }
      }
      continue;
    }
    if (ch === "'" || ch === '"' || ch === '`') {
      quote = ch;
    } else if (ch === '(') {
      depth++;
    } else if (ch === ')') {
      depth--;
    } else if (ch === separator && depth === 0) {
      parts.push(text.slice(start, i));
      start = i + 1;
    }
  }
  parts.push(text.slice(start));
  return parts;
}

/** Index of the `)` that closes the `(` at `open`, outside quotes. */
function matchingParen(text: string, open: number): number {
  let depth = 0;
  let quote: string | null = null;
  for (let i = open; i < text.length; i++) {
    const ch = text[i];
    if (quote !== null) {
      if (ch === '\\' && quote !== '`') {
        i++;
      } else if (ch === quote) {
        if (text[i + 1] === quote) {
          i++;
        } else {
          quote = null;
        }
      }
      continue;
    }
    if (ch === "'" || ch === '"' || ch === '`') {
      quote = ch;
    } else if (ch === '(') {
      depth++;
    } else if (ch === ')') {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}

/** Reads a backticked name at the start of `text` (after spaces). */
function leadingBacktickName(text: string): { name: string; rest: string } | null {
  const trimmed = text.trimStart();
  if (!trimmed.startsWith('`')) return null;
  let name = '';
  let i = 1;
  for (;;) {
    const close = trimmed.indexOf('`', i);
    if (close === -1) return null;
    if (trimmed[close + 1] === '`') {
      name += trimmed.slice(i, close + 1);
      i = close + 2;
      continue;
    }
    name += trimmed.slice(i, close);
    return { name, rest: trimmed.slice(close + 1) };
  }
}

/** The backticked names in a key's column list, e.g. "(`a`,`b`(191) DESC)". */
function keyColumns(list: string): string[] {
  const names: string[] = [];
  for (const part of splitTopLevel(list, ',')) {
    const parsed = leadingBacktickName(part);
    if (parsed) names.push(parsed.name);
  }
  return names;
}

/** The values of a quoted, comma-separated list such as `'A','B,C','it''s'`. */
function quotedList(list: string): string[] {
  return splitTopLevel(list, ',').map((part) => {
    const buf = Buffer.from(part.trim(), 'utf8');
    return decodeUtf8Strict(readQuotedBytes(buf, 0).bytes);
  });
}

const BINARY_TYPES = new Set(['binary', 'varbinary', 'tinyblob', 'blob', 'mediumblob', 'longblob']);
const INTEGER_TYPES = new Set(['tinyint', 'smallint', 'mediumint', 'int', 'integer', 'bigint', 'year']);
const DECIMAL_TYPES = new Set(['decimal', 'numeric', 'dec', 'fixed']);
const FLOAT_TYPES = new Set(['float', 'double', 'real']);

function columnKind(baseType: string): ColumnKind {
  if (BINARY_TYPES.has(baseType)) return 'binary';
  if (INTEGER_TYPES.has(baseType)) return 'integer';
  if (DECIMAL_TYPES.has(baseType)) return 'decimal';
  if (FLOAT_TYPES.has(baseType)) return 'float';
  return 'text';
}

function parseColumn(name: string, rest: string, offset: number): ColumnDef {
  const text = rest.trimStart();
  const word = /^[A-Za-z]+/.exec(text);
  if (!word) throw dumpParseError(`Column ${name} has no type`, offset);
  const baseType = word[0].toLowerCase();
  let i = word[0].length;
  let params: string | null = null;
  const afterWord = text.slice(i);
  const paramStart = afterWord.length - afterWord.trimStart().length;
  if (afterWord.trimStart().startsWith('(')) {
    const open = i + paramStart;
    const close = matchingParen(text, open);
    if (close === -1) throw dumpParseError(`Column ${name} has an unclosed type`, offset);
    params = text.slice(open + 1, close);
    i = close + 1;
  }
  const modifiers = /^(\s+(unsigned|signed|zerofill|precision))*/i.exec(text.slice(i));
  const typeEnd = i + (modifiers ? modifiers[0].length : 0);
  const rawType = text.slice(0, typeEnd).replace(/\s+/g, ' ').toLowerCase();
  const attributes = text.slice(typeEnd).replace(/'(?:[^'\\]|\\.|'')*'/g, "''");
  const lengthTypes = ['char', 'varchar', 'binary', 'varbinary'];
  const length =
    params !== null && lengthTypes.includes(baseType) && /^\s*\d+\s*$/.test(params) ? Number(params) : null;
  return {
    name,
    rawType,
    baseType,
    length,
    unsigned: /\bunsigned\b/i.test(rawType),
    nullable: !/\bNOT\s+NULL\b/i.test(attributes),
    enumValues: (baseType === 'enum' || baseType === 'set') && params !== null ? quotedList(params) : null,
    kind: columnKind(baseType),
    generated: /\bGENERATED\s+ALWAYS\b|\bAS\s*\(/i.test(attributes),
  };
}

/** Parses the text of one CREATE TABLE statement. `offset` is only used in error messages. */
export function parseCreateTable(statement: string, offset: number): TableDef {
  const head = /^\s*CREATE\s+(?:TEMPORARY\s+)?TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?/i.exec(statement);
  if (!head) throw dumpParseError('Not a CREATE TABLE statement', offset);
  const afterHead = statement.slice(head[0].length);
  const named = leadingBacktickName(afterHead);
  let tableName: string;
  let rest: string;
  if (named) {
    tableName = named.name;
    rest = named.rest;
  } else {
    const bare = /^[A-Za-z0-9_$]+/.exec(afterHead);
    if (!bare) throw dumpParseError('CREATE TABLE without a table name', offset);
    tableName = bare[0];
    rest = afterHead.slice(bare[0].length);
  }
  const open = rest.indexOf('(');
  if (open === -1) throw dumpParseError(`CREATE TABLE ${tableName} has no column list`, offset);
  const close = matchingParen(rest, open);
  if (close === -1) throw dumpParseError(`CREATE TABLE ${tableName} has an unclosed column list`, offset);
  const body = rest.slice(open + 1, close);

  const table: TableDef = { name: tableName, columns: [], primaryKey: [], uniqueKeys: [], foreignKeys: [] };
  for (const rawPart of splitTopLevel(body, ',')) {
    const part = rawPart.trim();
    if (part === '') continue;
    const column = leadingBacktickName(part);
    if (column) {
      table.columns.push(parseColumn(column.name, column.rest, offset));
      continue;
    }
    const primary = /^PRIMARY\s+KEY\s*(?:USING\s+\w+\s*)?\(/i.exec(part);
    if (primary) {
      const listOpen = primary[0].length - 1;
      table.primaryKey = keyColumns(part.slice(listOpen + 1, matchingParen(part, listOpen)));
      continue;
    }
    const unique = /^UNIQUE\s+(?:KEY|INDEX)?\s*(`(?:[^`]|``)*`)?\s*(?:USING\s+\w+\s*)?\(/i.exec(part);
    if (unique) {
      const listOpen = unique[0].length - 1;
      table.uniqueKeys.push({
        name: unique[1] ? unique[1].slice(1, -1).replace(/``/g, '`') : null,
        columns: keyColumns(part.slice(listOpen + 1, matchingParen(part, listOpen))),
      });
      continue;
    }
    const foreign = /^(?:CONSTRAINT\s+(`(?:[^`]|``)*`)\s+)?FOREIGN\s+KEY\s*(?:`(?:[^`]|``)*`\s*)?\(/i.exec(part);
    if (foreign) {
      const listOpen = foreign[0].length - 1;
      const listClose = matchingParen(part, listOpen);
      const columns = keyColumns(part.slice(listOpen + 1, listClose));
      const refs = /^\s*REFERENCES\s+/i.exec(part.slice(listClose + 1));
      if (!refs) throw dumpParseError(`Foreign key in ${tableName} without REFERENCES`, offset);
      const afterRefs = part.slice(listClose + 1 + refs[0].length);
      const refTable = leadingBacktickName(afterRefs);
      if (!refTable) throw dumpParseError(`Foreign key in ${tableName} without a table`, offset);
      const refOpen = refTable.rest.indexOf('(');
      const refColumns = keyColumns(refTable.rest.slice(refOpen + 1, matchingParen(refTable.rest, refOpen)));
      table.foreignKeys.push({
        name: foreign[1] ? foreign[1].slice(1, -1).replace(/``/g, '`') : null,
        columns,
        refTable: refTable.name,
        refColumns,
      });
      continue;
    }
    // KEY, INDEX, FULLTEXT, SPATIAL, CHECK and named CHECK constraints: not needed by the copy.
  }
  return table;
}

// ---------------------------------------------------------------------------------------------
// Statements

/** Position of the `;` that ends the statement starting at `pos`, outside quotes. */
function findStatementEnd(buf: Buffer, pos: number): number {
  let i = pos;
  while (i < buf.length) {
    const byte = buf[i];
    if (byte === SINGLE_QUOTE || byte === DOUBLE_QUOTE) {
      i = readQuotedEnd(buf, i);
      continue;
    }
    if (byte === BACKTICK) {
      const close = buf.indexOf(BACKTICK, i + 1);
      if (close === -1) throw dumpParseError('Unterminated identifier', i);
      i = close + 1;
      continue;
    }
    if (byte === SEMICOLON) return i;
    i++;
  }
  throw dumpParseError('Statement without a closing ;', pos);
}

/** Position after the closing quote of the string at `pos`, without unescaping it. */
function readQuotedEnd(buf: Buffer, pos: number): number {
  const quote = buf[pos];
  let i = pos + 1;
  while (i < buf.length) {
    const byte = buf[i];
    if (byte === BACKSLASH) {
      i += 2;
    } else if (byte === quote) {
      if (buf[i + 1] === quote) {
        i += 2;
      } else {
        return i + 1;
      }
    } else {
      i++;
    }
  }
  throw dumpParseError('Unterminated string', pos);
}

/**
 * Yields the dump's statements in file order. INSERT rows come back as literals; `readDump`
 * applies the column types. One pass over the Buffer, the same code for every size.
 */
export function* iterateDumpStatements(buf: Buffer): Generator<DumpStatement> {
  let pos = 0;
  while (pos < buf.length) {
    pos = skipSpace(buf, pos);
    if (pos >= buf.length) break;
    const byte = buf[pos];
    // -- comment (MySQL needs a space or control byte after the two hyphens) and # comment
    if (
      (byte === HYPHEN && buf[pos + 1] === HYPHEN && (pos + 2 >= buf.length || buf[pos + 2] <= 0x20)) ||
      byte === HASH
    ) {
      const newline = buf.indexOf(NEWLINE, pos);
      pos = newline === -1 ? buf.length : newline + 1;
      continue;
    }
    if (byte === SLASH && buf[pos + 1] === STAR) {
      const close = buf.indexOf('*/', pos + 2, 'latin1');
      if (close === -1) throw dumpParseError('Unterminated comment', pos);
      let end = close + 2;
      const executable = buf[pos + 2] === BANG;
      const afterComment = skipSpace(buf, end);
      if (buf[afterComment] === SEMICOLON) end = afterComment + 1;
      if (executable) {
        yield {
          type: 'conditionalComment',
          text: buf.toString('utf8', pos + 3, close).replace(/^\d*\s*/, '').trim(),
          offset: pos,
          byteLength: end - pos,
        };
      }
      pos = end;
      continue;
    }
    if (byte === SEMICOLON) {
      pos++;
      continue;
    }
    const keyword = readWord(buf, pos).toUpperCase();
    if (keyword === '') throw dumpParseError('Unexpected byte between statements', pos);
    if (keyword === 'DELIMITER') throw dumpParseError('DELIMITER blocks are not supported', pos);
    if (keyword === 'INSERT') {
      const insert = parseInsert(buf, pos);
      yield {
        type: 'insert',
        tableName: insert.tableName,
        columnNames: insert.columnNames,
        rows: insert.rows,
        offset: pos,
        byteLength: insert.end - pos,
      };
      pos = insert.end;
      continue;
    }
    const end = findStatementEnd(buf, pos);
    if (keyword === 'CREATE') {
      const text = decodeUtf8Strict(buf.subarray(pos, end));
      if (/^CREATE\s+(?:TEMPORARY\s+)?TABLE\b/i.test(text)) {
        yield { type: 'createTable', table: parseCreateTable(text, pos), offset: pos, byteLength: end + 1 - pos };
        pos = end + 1;
        continue;
      }
    }
    yield { type: 'other', keyword, offset: pos, byteLength: end + 1 - pos };
    pos = end + 1;
  }
}

// ---------------------------------------------------------------------------------------------
// Values

/**
 * Applies a column's type to a literal: Buffer for binary columns, number for integer and float
 * columns, an exact decimal string for decimal columns, a strictly decoded UTF-8 string otherwise
 * (dates, JSON, enums and text stay as the text the dump holds).
 */
export function convertLiteral(literal: SqlLiteral, column: ColumnDef, where: string): DumpCell {
  if (literal.kind === 'null') return null;
  if (column.kind === 'binary') {
    if (literal.kind === 'number') return Buffer.from(literal.text, 'latin1');
    return Buffer.from(literal.bytes);
  }
  let text: string;
  if (literal.kind === 'number') {
    text = literal.text;
  } else {
    try {
      text = decodeUtf8Strict(literal.bytes);
    } catch {
      throw dumpParseError(`Invalid UTF-8 in ${where}.${column.name}`, null);
    }
  }
  if (column.kind === 'text' || column.kind === 'decimal') return text;
  if (!NUMBER_PATTERN.test(text.trim())) {
    throw dumpParseError(`Not a number in ${where}.${column.name}`, null);
  }
  const value = Number(text);
  if (column.kind === 'integer' && !Number.isSafeInteger(value)) {
    throw dumpParseError(`Integer outside the safe range in ${where}.${column.name}`, null);
  }
  return value;
}

/** Puts a row's literals into the table's column order and applies each column's type. */
export function convertRow(
  literals: SqlLiteral[],
  table: TableDef,
  columnNames: string[] | null,
  rowNumber: number,
): DumpCell[] {
  const where = `${table.name} row ${rowNumber}`;
  if (columnNames === null) {
    if (literals.length !== table.columns.length) {
      throw dumpParseError(
        `${where} has ${literals.length} values for ${table.columns.length} columns`,
        null,
      );
    }
    return literals.map((literal, index) => convertLiteral(literal, table.columns[index], where));
  }
  if (literals.length !== columnNames.length) {
    throw dumpParseError(`${where} has ${literals.length} values for ${columnNames.length} listed columns`, null);
  }
  const cells: DumpCell[] = new Array(table.columns.length);
  const seen = new Set<string>();
  columnNames.forEach((name, index) => {
    const columnIndex = table.columns.findIndex((column) => column.name === name);
    if (columnIndex === -1) throw dumpParseError(`${table.name} has no column ${name}`, null);
    seen.add(name);
    cells[columnIndex] = convertLiteral(literals[index], table.columns[columnIndex], where);
  });
  const missing = table.columns.filter((column) => !seen.has(column.name));
  if (missing.length > 0) {
    throw dumpParseError(`INSERT into ${table.name} leaves out ${missing.map((c) => c.name).join(', ')}`, null);
  }
  return cells;
}

// ---------------------------------------------------------------------------------------------
// Whole dump

/** Reads the `-- MySQL dump` header lines and the `-- Dump completed` trailer. */
export function readDumpHeader(buf: Buffer): DumpHeader {
  const head = buf.toString('latin1', 0, Math.min(buf.length, 4096));
  const tail = buf.toString('latin1', Math.max(0, buf.length - 512));
  const tool = /^-- MySQL dump ([\d.]+)\s+Distrib ([\w.-]+)/m.exec(head);
  const database = /^-- Host: .*?Database: (\S+)/m.exec(head);
  const server = /^-- Server version\s+(\S+)/m.exec(head);
  return {
    dumpToolVersion: tool ? tool[1] : null,
    dumpToolDistrib: tool ? tool[2] : null,
    database: database ? database[1] : null,
    serverVersion: server ? server[1] : null,
    completed: /^-- Dump completed\b/m.test(tail),
  };
}

/** Reads a whole dump: every table's definition and rows, typed per column. */
export function readDump(buf: Buffer): DumpContents {
  const contents: DumpContents = {
    header: readDumpHeader(buf),
    setNames: [],
    tables: new Map(),
    otherStatements: {},
  };
  for (const statement of iterateDumpStatements(buf)) {
    if (statement.type === 'createTable') {
      if (contents.tables.has(statement.table.name)) {
        throw dumpParseError(`Table ${statement.table.name} is created twice`, statement.offset);
      }
      contents.tables.set(statement.table.name, {
        name: statement.table.name,
        def: statement.table,
        rows: [],
        insertStatements: 0,
        insertBytes: 0,
      });
    } else if (statement.type === 'insert') {
      const table = contents.tables.get(statement.tableName);
      if (!table) {
        throw dumpParseError(`INSERT into ${statement.tableName} before its CREATE TABLE`, statement.offset);
      }
      table.insertStatements++;
      table.insertBytes += statement.byteLength;
      for (const literals of statement.rows) {
        table.rows.push(convertRow(literals, table.def, statement.columnNames, table.rows.length + 1));
      }
    } else if (statement.type === 'conditionalComment') {
      const names = /^SET\s+NAMES\s+(\w+)/i.exec(statement.text);
      if (names) contents.setNames.push(names[1].toLowerCase());
      const key = 'conditional comment';
      contents.otherStatements[key] = (contents.otherStatements[key] ?? 0) + 1;
    } else {
      contents.otherStatements[statement.keyword] = (contents.otherStatements[statement.keyword] ?? 0) + 1;
    }
  }
  return contents;
}

/** A row as an object keyed by column name. */
export function rowToObject(table: TableDump, row: DumpCell[]): Record<string, DumpCell> {
  const object: Record<string, DumpCell> = {};
  table.def.columns.forEach((column, index) => {
    object[column.name] = row[index];
  });
  return object;
}
