import {
  convertLiteral,
  convertRow,
  decodeUtf8Strict,
  isDumpParseError,
  iterateDumpStatements,
  parseCreateTable,
  parseInsert,
  readDump,
  readDumpHeader,
  readLiteral,
  readQuotedBytes,
  rowToObject,
  splitTopLevel,
  type ColumnDef,
  type SqlLiteral,
} from '../mysqldump-reader';
import {
  allBytes,
  dumpBytes,
  FIXTURE_HEADER,
  FIXTURE_TRAILER,
  fixtureDump,
  quoteForDump,
  seededRandom,
} from './dump-fixture';

function unquote(text: string | Buffer): Buffer {
  const buf = typeof text === 'string' ? Buffer.from(text, 'latin1') : text;
  return readQuotedBytes(buf, 0).bytes;
}

function literal(text: string | Buffer): SqlLiteral {
  const buf = typeof text === 'string' ? Buffer.from(text, 'utf8') : text;
  return readLiteral(buf, 0).literal;
}

function column(overrides: Partial<ColumnDef>): ColumnDef {
  return {
    name: 'c',
    rawType: 'text',
    baseType: 'text',
    length: null,
    unsigned: false,
    nullable: true,
    enumValues: null,
    kind: 'text',
    generated: false,
    ...overrides,
  };
}

const TEXT = column({});
const BLOB = column({ rawType: 'longblob', baseType: 'longblob', kind: 'binary' });
const INT = column({ rawType: 'int', baseType: 'int', kind: 'integer' });
const DOUBLE = column({ rawType: 'double', baseType: 'double', kind: 'float' });
const DECIMAL = column({ rawType: 'decimal(10,2)', baseType: 'decimal', kind: 'decimal' });

function tableDump(ddl: string, inserts: string): Buffer {
  return dumpBytes(FIXTURE_HEADER, ddl, '\n', inserts, '\n', FIXTURE_TRAILER);
}

const SIMPLE_DDL = 'CREATE TABLE `t` (\n  `id` varchar(10) NOT NULL,\n  `v` text,\n  PRIMARY KEY (`id`)\n) ENGINE=InnoDB;';

describe('readQuotedBytes: MySQL string escapes', () => {
  test.each([
    ['\\0', [0x00]],
    ["\\'", [0x27]],
    ['\\"', [0x22]],
    ['\\b', [0x08]],
    ['\\n', [0x0a]],
    ['\\r', [0x0d]],
    ['\\t', [0x09]],
    ['\\Z', [0x1a]],
    ['\\\\', [0x5c]],
  ])('%s becomes its byte', (escape, bytes) => {
    expect([...unquote(`'${escape}'`)]).toEqual(bytes);
  });

  test('\\% and \\_ keep their backslash, as MySQL does outside LIKE', () => {
    expect(unquote("'\\%'").toString()).toBe('\\%');
    expect(unquote("'\\_'").toString()).toBe('\\_');
    expect(unquote("'50\\% off a\\_b'").toString()).toBe('50\\% off a\\_b');
  });

  test('any other escaped byte stands for itself', () => {
    expect(unquote("'\\q\\x\\Q'").toString()).toBe('qxQ');
  });

  test('a backslash before a UTF-8 lead byte (mysqldump escapes invalid multibyte starts) is dropped', () => {
    const input = Buffer.from([0x27, 0x5c, 0xe2, 0x41, 0x27]);
    expect([...unquote(input)]).toEqual([0xe2, 0x41]);
  });

  test('a doubled quote stands for one quote', () => {
    expect(unquote("'it''s'").toString()).toBe("it's");
    expect(unquote('"say ""hi"""').toString()).toBe('say "hi"');
  });

  test('the other quote character needs no escape', () => {
    expect(unquote(`'a "b" c'`).toString()).toBe('a "b" c');
    expect(unquote(`"a 'b' c"`).toString()).toBe("a 'b' c");
  });

  test('empty string', () => {
    expect(unquote("''").length).toBe(0);
  });

  test('a quote, comma and parentheses inside a string', () => {
    expect(unquote("'a, (b), \\'c\\', d)'").toString()).toBe("a, (b), 'c', d)");
  });

  test('returns the position after the closing quote', () => {
    const buf = Buffer.from("'ab\\'c',next");
    expect(readQuotedBytes(buf, 0).end).toBe(7);
  });

  test('unterminated string throws a DumpParseError', () => {
    expect(() => unquote("'abc")).toThrow(/Unterminated string/);
    expect(() => unquote("'abc\\'")).toThrow(/Unterminated string/);
    expect(() => unquote("'abc\\")).toThrow(/Unterminated string/);
  });

  test('multibyte UTF-8 passes through unchanged', () => {
    const text = 'José señor 漢字 🙂';
    expect(decodeUtf8Strict(unquote(quoteForDump(text)))).toBe(text);
  });
});

describe('readQuotedBytes: binary bytes round-trip exactly', () => {
  test('every byte value 0-255, escaped the way mysqldump escapes', () => {
    const bytes = allBytes();
    expect(unquote(quoteForDump(bytes)).equals(bytes)).toBe(true);
  });

  test('every byte value repeated, in reverse and doubled', () => {
    const bytes = Buffer.concat([allBytes(), Buffer.from([...allBytes()].reverse()), allBytes(), allBytes()]);
    expect(unquote(quoteForDump(bytes)).equals(bytes)).toBe(true);
  });

  test('runs of backslashes and quotes', () => {
    const bytes = Buffer.from("\\\\\\''''\\'\"\"\\0", 'latin1');
    expect(unquote(quoteForDump(bytes)).equals(bytes)).toBe(true);
  });

  test('500 random buffers of random length', () => {
    const random = seededRandom(1);
    for (let n = 0; n < 500; n++) {
      const bytes = Buffer.from(Array.from({ length: Math.floor(random() * 300) }, () => Math.floor(random() * 256)));
      expect(unquote(quoteForDump(bytes)).equals(bytes)).toBe(true);
    }
  });

  test('the result does not share memory with the input', () => {
    const input = quoteForDump(Buffer.from('abc'));
    const out = unquote(input);
    input.fill(0);
    expect(out.toString()).toBe('abc');
  });
});

describe('readLiteral', () => {
  test('NULL in any case is null, but quoted NULL is the string', () => {
    expect(literal('NULL')).toEqual({ kind: 'null' });
    expect(literal('null')).toEqual({ kind: 'null' });
    const quoted = literal("'NULL'");
    expect(quoted.kind).toBe('string');
    expect(quoted.kind === 'string' && quoted.bytes.toString()).toBe('NULL');
  });

  test('NULLX is not NULL', () => {
    expect(() => literal('NULLX')).toThrow(/Unexpected value/);
  });

  test.each(['0', '42', '-12', '3.5', '-0.25', '1e-5', '-1.5E+10', '.5', '12345678901234567890'])('number %s', (text) => {
    expect(literal(text)).toEqual({ kind: 'number', text });
  });

  test('malformed numbers throw', () => {
    expect(() => literal('1e')).toThrow(/Malformed number/);
    expect(() => literal('1.2.3')).toThrow(/Malformed number/);
    expect(() => literal('-')).toThrow(/Malformed number/);
  });

  test('_binary introducer, with and without a space', () => {
    for (const text of ["_binary 'a\\0b'", "_binary'a\\0b'"]) {
      const value = literal(text);
      expect(value.kind).toBe('string');
      if (value.kind === 'string') {
        expect(value.introducer).toBe('_binary');
        expect([...value.bytes]).toEqual([0x61, 0x00, 0x62]);
      }
    }
  });

  test('_utf8mb4 introducer and N prefix give text strings', () => {
    const a = literal("_utf8mb4'x'");
    expect(a.kind === 'string' && a.introducer).toBe('_utf8mb4');
    const n = literal("N'y'");
    expect(n.kind === 'string' && n.bytes.toString()).toBe('y');
  });

  test('_binary followed by a hex literal', () => {
    const value = literal('_binary 0x00ff');
    expect(value.kind === 'string' && [...value.bytes]).toEqual([0x00, 0xff]);
  });

  test('hex literals 0x.. and X\'..\'', () => {
    expect(literal('0x00FF10')).toEqual({ kind: 'hex', bytes: Buffer.from([0x00, 0xff, 0x10]) });
    expect(literal("X'abcd'")).toEqual({ kind: 'hex', bytes: Buffer.from([0xab, 0xcd]) });
    expect(literal("x''")).toEqual({ kind: 'hex', bytes: Buffer.alloc(0) });
  });

  test('malformed hex throws', () => {
    expect(() => literal('0xabc')).toThrow(/Malformed hex/);
    expect(() => literal('0xzz')).toThrow(/Malformed hex/);
    expect(() => literal("X'ab")).toThrow(/Unterminated hex/);
  });

  test('bit literals are refused', () => {
    expect(() => literal("b'101'")).toThrow(/Bit literals/);
  });

  test('an introducer without a string throws', () => {
    expect(() => literal('_binary 12')).toThrow(/introducer/);
  });
});

describe('convertLiteral', () => {
  test('NULL is null for every kind', () => {
    for (const col of [TEXT, BLOB, INT, DOUBLE, DECIMAL]) {
      expect(convertLiteral({ kind: 'null' }, col, 't')).toBeNull();
    }
  });

  test('binary columns return a Buffer with the exact bytes', () => {
    const bytes = allBytes();
    const value = convertLiteral({ kind: 'string', bytes, introducer: '_binary' }, BLOB, 't');
    expect(Buffer.isBuffer(value) && value.equals(bytes)).toBe(true);
    expect(value).not.toBe(bytes);
  });

  test('a binary column without the _binary prefix is still a Buffer', () => {
    const value = convertLiteral({ kind: 'string', bytes: Buffer.from([0xff, 0xfe]), introducer: null }, BLOB, 't');
    expect(Buffer.isBuffer(value) && [...value]).toEqual([0xff, 0xfe]);
  });

  test('hex literal into a binary column', () => {
    const value = convertLiteral({ kind: 'hex', bytes: Buffer.from([1, 2]) }, BLOB, 't');
    expect(Buffer.isBuffer(value) && [...value]).toEqual([1, 2]);
  });

  test('empty string stays empty, not null', () => {
    expect(convertLiteral({ kind: 'string', bytes: Buffer.alloc(0), introducer: null }, TEXT, 't')).toBe('');
    const blob = convertLiteral({ kind: 'string', bytes: Buffer.alloc(0), introducer: '_binary' }, BLOB, 't');
    expect(Buffer.isBuffer(blob) && blob.length).toBe(0);
  });

  test('text is decoded as UTF-8, emoji included', () => {
    const text = 'Ünïcödé 🙂 漢字';
    expect(convertLiteral({ kind: 'string', bytes: Buffer.from(text), introducer: null }, TEXT, 't')).toBe(text);
  });

  test('a NUL byte in text is kept (the copy decides what to do with it)', () => {
    expect(convertLiteral({ kind: 'string', bytes: Buffer.from([0x61, 0x00, 0x62]), introducer: null }, TEXT, 't')).toBe('a\u0000b');
  });

  test('invalid UTF-8 in a text column throws, naming the column but not the value', () => {
    const secret = Buffer.concat([Buffer.from('secret-value-'), Buffer.from([0xff])]);
    let message = '';
    try {
      convertLiteral({ kind: 'string', bytes: secret, introducer: null }, column({ name: 'email' }), 'users row 3');
    } catch (error) {
      expect(isDumpParseError(error)).toBe(true);
      message = (error as Error).message;
    }
    expect(message).toMatch(/Invalid UTF-8 in users row 3\.email/);
    expect(message).not.toContain('secret');
  });

  test('a byte order mark is kept, not dropped', () => {
    const value = convertLiteral({ kind: 'string', bytes: Buffer.from('\ufeffx'), introducer: null }, TEXT, 't');
    expect(value).toBe('\ufeffx');
  });

  test('integers and floats become numbers', () => {
    expect(convertLiteral({ kind: 'number', text: '-42' }, INT, 't')).toBe(-42);
    expect(convertLiteral({ kind: 'number', text: '-2.5e-3' }, DOUBLE, 't')).toBe(-0.0025);
  });

  test('a quoted number in an integer column becomes a number', () => {
    expect(convertLiteral({ kind: 'string', bytes: Buffer.from('7'), introducer: null }, INT, 't')).toBe(7);
  });

  test('decimals stay exact strings', () => {
    expect(convertLiteral({ kind: 'number', text: '12345678901234567.89' }, DECIMAL, 't')).toBe('12345678901234567.89');
  });

  test('an integer beyond the safe range throws instead of losing digits', () => {
    expect(() => convertLiteral({ kind: 'number', text: '12345678901234567890' }, INT, 't')).toThrow(/safe range/);
  });

  test('text in a number column throws', () => {
    expect(() => convertLiteral({ kind: 'string', bytes: Buffer.from('abc'), introducer: null }, INT, 't')).toThrow(/Not a number/);
  });

  test('a number in a text column keeps its text', () => {
    expect(convertLiteral({ kind: 'number', text: '2024' }, TEXT, 't')).toBe('2024');
  });
});

describe('parseCreateTable', () => {
  const ddl = `CREATE TABLE \`email_notifications\` (
  \`id\` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  \`status\` enum('QUEUED','SENDING','A,B','it''s') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'QUEUED',
  \`retryCount\` int unsigned NOT NULL DEFAULT '0',
  \`amount\` decimal(10,2) DEFAULT NULL,
  \`score\` double DEFAULT NULL,
  \`data\` longblob,
  \`note\` text COLLATE utf8mb4_unicode_ci COMMENT 'has, commas (and parens) NOT NULL',
  \`meta\` json DEFAULT NULL,
  \`odd\`\`name\` varchar(5) DEFAULT 'NOT NULL',
  \`createdAt\` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (\`id\`),
  UNIQUE KEY \`email_notifications_status_key\` (\`status\`,\`retryCount\`),
  KEY \`email_notifications_userId_idx\` (\`retryCount\`),
  CONSTRAINT \`email_notifications_userId_fkey\` FOREIGN KEY (\`id\`) REFERENCES \`users\` (\`id\`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`;
  const table = parseCreateTable(ddl, 0);

  test('table name and column order', () => {
    expect(table.name).toBe('email_notifications');
    expect(table.columns.map((c) => c.name)).toEqual([
      'id',
      'status',
      'retryCount',
      'amount',
      'score',
      'data',
      'note',
      'meta',
      'odd`name',
      'createdAt',
    ]);
  });

  test('types, kinds and lengths', () => {
    const byName = Object.fromEntries(table.columns.map((c) => [c.name, c]));
    expect(byName.id).toMatchObject({ baseType: 'varchar', length: 191, kind: 'text', rawType: 'varchar(191)' });
    expect(byName.retryCount).toMatchObject({ baseType: 'int', unsigned: true, kind: 'integer', rawType: 'int unsigned' });
    expect(byName.amount).toMatchObject({ baseType: 'decimal', kind: 'decimal', length: null });
    expect(byName.score).toMatchObject({ kind: 'float' });
    expect(byName.data).toMatchObject({ baseType: 'longblob', kind: 'binary' });
    expect(byName.meta).toMatchObject({ baseType: 'json', kind: 'text' });
    expect(byName.createdAt).toMatchObject({ baseType: 'datetime', kind: 'text', rawType: 'datetime(3)' });
  });

  test('nullability, ignoring NOT NULL inside strings and comments', () => {
    const nullable = Object.fromEntries(table.columns.map((c) => [c.name, c.nullable]));
    expect(nullable).toEqual({
      id: false,
      status: false,
      retryCount: false,
      amount: true,
      score: true,
      data: true,
      note: true,
      meta: true,
      'odd`name': true,
      createdAt: false,
    });
  });

  test('enum values, with a comma and a doubled quote inside', () => {
    expect(table.columns[1].enumValues).toEqual(['QUEUED', 'SENDING', 'A,B', "it's"]);
  });

  test('primary, unique and foreign keys; plain KEYs are skipped', () => {
    expect(table.primaryKey).toEqual(['id']);
    expect(table.uniqueKeys).toEqual([{ name: 'email_notifications_status_key', columns: ['status', 'retryCount'] }]);
    expect(table.foreignKeys).toEqual([
      { name: 'email_notifications_userId_fkey', columns: ['id'], refTable: 'users', refColumns: ['id'] },
    ]);
  });

  test('key columns with prefix lengths', () => {
    const t = parseCreateTable('CREATE TABLE `x` (`a` text, `b` int, PRIMARY KEY (`a`(191),`b`))', 0);
    expect(t.primaryKey).toEqual(['a', 'b']);
  });

  test('IF NOT EXISTS and bare names', () => {
    const t = parseCreateTable('CREATE TABLE IF NOT EXISTS plain (`a` int)', 0);
    expect(t.name).toBe('plain');
    expect(t.columns).toHaveLength(1);
  });

  test('a statement that is not CREATE TABLE throws', () => {
    expect(() => parseCreateTable('CREATE VIEW v AS SELECT 1', 0)).toThrow(/Not a CREATE TABLE/);
  });
});

describe('splitTopLevel', () => {
  test('ignores separators inside quotes, backticks and parentheses', () => {
    expect(splitTopLevel("a,'b,c',`d,e`,(f,g),\"h,i\"", ',')).toEqual(['a', "'b,c'", '`d,e`', '(f,g)', '"h,i"']);
  });

  test('handles escaped and doubled quotes', () => {
    expect(splitTopLevel("'a\\',b','c''d,e',f", ',')).toEqual(["'a\\',b'", "'c''d,e'", 'f']);
  });
});

describe('parseInsert', () => {
  function insert(text: string | Buffer) {
    return parseInsert(typeof text === 'string' ? Buffer.from(text) : text, 0);
  }

  test('one row', () => {
    const result = insert("INSERT INTO `t` VALUES ('a',1,NULL);");
    expect(result.tableName).toBe('t');
    expect(result.columnNames).toBeNull();
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].map((l) => l.kind)).toEqual(['string', 'number', 'null']);
  });

  test('many rows, with commas, parentheses and quotes inside strings', () => {
    const result = insert("INSERT INTO `t` VALUES ('a,b',1),('(c)',2),('d\\'),(e',3),(')',4);");
    expect(result.rows).toHaveLength(4);
    const texts = result.rows.map((row) => (row[0].kind === 'string' ? row[0].bytes.toString() : null));
    expect(texts).toEqual(['a,b', '(c)', "d'),(e", ')']);
  });

  test('a statement over several lines, with spaces between tokens', () => {
    const result = insert("INSERT INTO `t`\nVALUES\n  ( 'a' , 1 ) ,\n  ( 'b',\n2 )\n;");
    expect(result.rows).toHaveLength(2);
  });

  test('CRLF line endings', () => {
    const result = insert("INSERT INTO `t` VALUES\r\n('a',1),\r\n('b',2);");
    expect(result.rows).toHaveLength(2);
  });

  test('a column list', () => {
    const result = insert("INSERT INTO `t` (`b`, `a`) VALUES (2,'x');");
    expect(result.columnNames).toEqual(['b', 'a']);
  });

  test('INSERT IGNORE and lowercase keywords', () => {
    expect(insert("insert ignore into t values (1);").rows).toHaveLength(1);
  });

  test('an empty tuple', () => {
    expect(insert('INSERT INTO `t` VALUES ();').rows).toEqual([[]]);
  });

  test('returns the position after the semicolon', () => {
    expect(insert("INSERT INTO `t` VALUES (1);rest").end).toBe(27);
  });

  test('ON DUPLICATE KEY UPDATE is refused', () => {
    expect(() => insert('INSERT INTO `t` VALUES (1) ON DUPLICATE KEY UPDATE a=1;')).toThrow(/ON DUPLICATE/);
  });

  test('errors give the row, value and table, never the value', () => {
    let message = '';
    try {
      insert("INSERT INTO `users` VALUES ('ok'),('private@example.com', zzz);");
    } catch (error) {
      message = (error as Error).message;
    }
    expect(message).toMatch(/row 2, value 2 of users/);
    expect(message).not.toContain('private');
    expect(message).not.toContain('zzz');
  });

  test('missing VALUES throws', () => {
    expect(() => insert('INSERT INTO `t` SELECT 1;')).toThrow(/Expected VALUES/);
  });

  test('a missing comma between rows throws', () => {
    expect(() => insert('INSERT INTO `t` VALUES (1) (2);')).toThrow(/Expected , or ;/);
  });

  test('an unterminated statement throws', () => {
    expect(() => insert("INSERT INTO `t` VALUES ('a'")).toThrow();
  });
});

describe('iterateDumpStatements', () => {
  test('skips -- and # comments and plain block comments; yields /*! */ statements', () => {
    const buf = Buffer.from("-- a comment\n--\n# hash comment\n/* plain */\n/*!40101 SET NAMES utf8 */;\nDROP TABLE IF EXISTS `t`;\n");
    const statements = [...iterateDumpStatements(buf)];
    expect(statements.map((s) => s.type)).toEqual(['conditionalComment', 'other']);
    expect(statements[0].type === 'conditionalComment' && statements[0].text).toBe('SET NAMES utf8');
    expect(statements[1].type === 'other' && statements[1].keyword).toBe('DROP');
  });

  test('a semicolon inside a quoted string does not end a statement', () => {
    const buf = Buffer.from("CREATE TABLE `t` (`a` varchar(5) DEFAULT ';x');\nLOCK TABLES `t` WRITE;");
    const statements = [...iterateDumpStatements(buf)];
    expect(statements.map((s) => s.type)).toEqual(['createTable', 'other']);
  });

  test('DELIMITER blocks are refused', () => {
    expect(() => [...iterateDumpStatements(Buffer.from('DELIMITER ;;\n'))]).toThrow(/DELIMITER/);
  });

  test('a statement without a semicolon throws', () => {
    expect(() => [...iterateDumpStatements(Buffer.from('LOCK TABLES `t` WRITE'))]).toThrow(/closing ;/);
  });

  test('an unterminated block comment throws', () => {
    expect(() => [...iterateDumpStatements(Buffer.from('/* never closed'))]).toThrow(/Unterminated comment/);
  });

  test('byte lengths of INSERT statements add up to their text', () => {
    const text = "INSERT INTO `t` VALUES (1);\nINSERT INTO `t` VALUES (2),(3);";
    const statements = [...iterateDumpStatements(Buffer.from(text))];
    expect(statements.map((s) => s.byteLength)).toEqual([27, 31]);
  });
});

describe('readDumpHeader', () => {
  test('reads versions and database, and finds the completed line', () => {
    expect(readDumpHeader(fixtureDump())).toEqual({
      dumpToolVersion: '10.13',
      dumpToolDistrib: '8.0.40',
      database: 'fixture-db',
      serverVersion: '8.0.45',
      completed: true,
    });
  });

  test('a dump cut off before its last line is reported as not completed', () => {
    const buf = dumpBytes(FIXTURE_HEADER, SIMPLE_DDL, '\n');
    expect(readDumpHeader(buf).completed).toBe(false);
  });

  test('the header does not keep the host', () => {
    expect(JSON.stringify(readDumpHeader(fixtureDump()))).not.toContain('127.0.0.1');
  });
});

describe('readDump on the hand-written fixture', () => {
  const dump = readDump(fixtureDump());
  const people = dump.tables.get('people');
  const images = dump.tables.get('images');

  test('tables in CREATE order, with row counts across two INSERT lines', () => {
    expect([...dump.tables.keys()]).toEqual(['people', 'images']);
    expect(people?.rows).toHaveLength(3);
    expect(people?.insertStatements).toBe(2);
    expect(images?.rows).toHaveLength(3);
    expect(images?.insertStatements).toBe(1);
  });

  test('SET NAMES and other statements are counted', () => {
    expect(dump.setNames).toEqual(['utf8mb4']);
    expect(dump.otherStatements).toMatchObject({ DROP: 2, LOCK: 2, UNLOCK: 2 });
    expect(dump.otherStatements['conditional comment']).toBeGreaterThanOrEqual(5);
  });

  test('values are typed per column', () => {
    if (!people) throw new Error('missing table');
    const p1 = rowToObject(people, people.rows[0]);
    expect(p1).toEqual({
      id: 'p1',
      email: 'A@Example.com',
      note: 'Hello, (world)',
      age: 42,
      score: 1.5,
      amount: '12345678.90',
      active: 1,
      status: 'NEW',
      meta: '{"a": [1, 2]}',
      createdAt: '2025-01-02 03:04:05.678',
    });
  });

  test('NULL beside the string NULL, and an enum value with a comma', () => {
    if (!people) throw new Error('missing table');
    const p2 = rowToObject(people, people.rows[1]);
    expect(p2.email).toBeNull();
    expect(p2.note).toBe('NULL');
    expect(p2.age).toBeNull();
    expect(p2.score).toBe(-0.0025);
    expect(p2.status).toBe('OLD, BUT GOOD');
    expect(p2.meta).toBeNull();
  });

  test('every escape inside one text value, and a JSON string holding JSON', () => {
    if (!people) throw new Error('missing table');
    const p3 = rowToObject(people, people.rows[2]);
    expect(p3.email).toBe('');
    expect(p3.note).toBe('tab\there\nnew line \u0000 nul \\ back \' quote " dq \u001a');
    expect(p3.status).toBe("it's");
    expect(p3.amount).toBe('-0.01');
    expect(p3.meta).toBe('"{\\"x\\": 1}"');
    expect(JSON.parse(JSON.parse(String(p3.meta)))).toEqual({ x: 1 });
  });

  test('the blob holding every byte value comes back exact', () => {
    if (!images) throw new Error('missing table');
    const data = images.rows[0][2];
    expect(Buffer.isBuffer(data) && data.equals(allBytes())).toBe(true);
    expect(images.rows[0][3]).toBe(256);
  });

  test('an empty blob is an empty Buffer; a NULL blob is null', () => {
    if (!images) throw new Error('missing table');
    const empty = images.rows[1][2];
    expect(Buffer.isBuffer(empty) && empty.length).toBe(0);
    expect(images.rows[2][2]).toBeNull();
  });

  test('keys are read from the DDL', () => {
    expect(people?.def.uniqueKeys).toEqual([{ name: 'people_email_key', columns: ['email'] }]);
    expect(images?.def.foreignKeys[0]).toMatchObject({ columns: ['personId'], refTable: 'people', refColumns: ['id'] });
  });

  test('INSERT bytes are counted per table', () => {
    expect(people?.insertBytes).toBeGreaterThan(200);
    expect(images?.insertBytes).toBeGreaterThan(256);
  });
});

describe('readDump: one code path for every size', () => {
  test('a 3 MB blob in one statement, among other rows', () => {
    const random = seededRandom(7);
    const big = Buffer.from(Array.from({ length: 3 * 1024 * 1024 }, () => Math.floor(random() * 256)));
    const ddl = 'CREATE TABLE `b` (`id` int NOT NULL, `data` longblob, PRIMARY KEY (`id`));';
    const buf = dumpBytes(
      FIXTURE_HEADER,
      ddl,
      '\nINSERT INTO `b` VALUES (1,_binary ',
      quoteForDump(big),
      "),(2,_binary 'x'),(3,NULL);\n",
      FIXTURE_TRAILER,
    );
    const dump = readDump(buf);
    const rows = dump.tables.get('b')?.rows ?? [];
    expect(rows).toHaveLength(3);
    const data = rows[0][1];
    expect(Buffer.isBuffer(data) && data.equals(big)).toBe(true);
  });

  test('generated rows with awkward strings round-trip through a dump', () => {
    const random = seededRandom(42);
    const pieces = ["'", '"', '\\', ',', '(', ')', ';', '\n', '\r', '\t', '\u0000', '\u001a', 'é', '漢', '🙂', 'NULL', ' ', 'a', '%', '_'];
    const values: string[] = [];
    for (let n = 0; n < 300; n++) {
      const length = Math.floor(random() * 12);
      values.push(Array.from({ length }, () => pieces[Math.floor(random() * pieces.length)]).join(''));
    }
    const tuples = values.map((value, i) => Buffer.concat([Buffer.from(`(${i},`), quoteForDump(value), Buffer.from(')')]));
    const parts: Buffer[] = [];
    // Two INSERT lines, as mysqldump splits long tables.
    parts.push(Buffer.from('INSERT INTO `t` VALUES '), Buffer.concat(tuples.slice(0, 150).flatMap((t, i) => (i ? [Buffer.from(','), t] : [t]))), Buffer.from(';\n'));
    parts.push(Buffer.from('INSERT INTO `t` VALUES '), Buffer.concat(tuples.slice(150).flatMap((t, i) => (i ? [Buffer.from(','), t] : [t]))), Buffer.from(';\n'));
    const buf = dumpBytes(FIXTURE_HEADER, 'CREATE TABLE `t` (`id` int NOT NULL, `v` text);\n', ...parts, FIXTURE_TRAILER);
    const table = readDump(buf).tables.get('t');
    expect(table?.insertStatements).toBe(2);
    expect(table?.rows.map((row) => row[1])).toEqual(values);
    expect(table?.rows.map((row) => row[0])).toEqual(values.map((_, i) => i));
  });
});

describe('readDump: errors', () => {
  test('INSERT before CREATE TABLE', () => {
    expect(() => readDump(Buffer.from("INSERT INTO `t` VALUES (1);"))).toThrow(/before its CREATE TABLE/);
  });

  test('a row with the wrong number of values', () => {
    expect(() => readDump(tableDump(SIMPLE_DDL, "INSERT INTO `t` VALUES ('a');"))).toThrow(/1 values for 2 columns/);
  });

  test('a table created twice', () => {
    expect(() => readDump(tableDump(`${SIMPLE_DDL}\n${SIMPLE_DDL}`, ''))).toThrow(/created twice/);
  });

  test('an INSERT with a column list is put into table order', () => {
    const dump = readDump(tableDump(SIMPLE_DDL, "INSERT INTO `t` (`v`,`id`) VALUES ('value','key');"));
    expect(dump.tables.get('t')?.rows).toEqual([['key', 'value']]);
  });

  test('an INSERT column list that leaves out a column throws', () => {
    expect(() => readDump(tableDump(SIMPLE_DDL, "INSERT INTO `t` (`id`) VALUES ('key');"))).toThrow(/leaves out v/);
  });

  test('an INSERT naming an unknown column throws', () => {
    expect(() => readDump(tableDump(SIMPLE_DDL, "INSERT INTO `t` (`id`,`zz`) VALUES ('a','b');"))).toThrow(/no column zz/);
  });

  test('convertRow names the row number', () => {
    const table = parseCreateTable(SIMPLE_DDL, 0);
    expect(() => convertRow([{ kind: 'null' }], table, null, 17)).toThrow(/t row 17/);
  });
});
