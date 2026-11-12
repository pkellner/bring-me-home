import { normalizeEmail, normalizeUsername } from '../../../src/lib/normalize-identity';
import {
  analyseIdentityValues,
  analyseJsonColumn,
  cellByteLength,
  checkKeys,
  checkMigrations,
  checkValues,
  commentEmailLinking,
  compareSchemaToDump,
  countBy,
  countInsertTuplesIndependently,
  foldAccents,
  identityValues,
  imageKindFromBytes,
  imageStats,
  rowKey,
  scanTextColumns,
  tableCounts,
  type IdentityValue,
} from '../dump-measurements';
import { readDump, type DumpContents } from '../mysqldump-reader';
import { readPrismaSchema } from '../prisma-schema-reader';
import { allBytes, dumpBytes, FIXTURE_HEADER, FIXTURE_TRAILER, fixtureDump, quoteForDump } from './dump-fixture';

function values(...raw: (string | null)[]): IdentityValue[] {
  return raw.map((value, i) => ({ key: `k${i + 1}`, value }));
}

function dumpOf(ddl: string, inserts: string | Buffer): DumpContents {
  return readDump(dumpBytes(FIXTURE_HEADER, ddl, '\n', inserts, '\n', FIXTURE_TRAILER));
}

describe('analyseIdentityValues with the app\'s normalizeEmail', () => {
  test('values the normaliser leaves alone are not counted as changed', () => {
    const a = analyseIdentityValues(values('a@x.com', 'b@y.org', null), normalizeEmail);
    expect(a.total).toBe(3);
    expect(a.nonNull).toBe(2);
    expect(a.changed).toEqual({ total: 0, caseOnly: 0, whitespaceOnly: 0, both: 0 });
    expect(a.collisionGroups).toBe(0);
  });

  test('changes by kind: case only, whitespace only, both', () => {
    const a = analyseIdentityValues(values('A@x.com', ' b@x.com', 'c@x.com\t', ' D@x.com ', 'e@x.com'), normalizeEmail);
    expect(a.changed).toEqual({ total: 4, caseOnly: 1, whitespaceOnly: 2, both: 1 });
    expect(a.detail.changes.map((c) => [c.key, c.kind, c.normalized])).toEqual([
      ['k1', 'case', 'a@x.com'],
      ['k2', 'whitespace', 'b@x.com'],
      ['k3', 'whitespace', 'c@x.com'],
      ['k4', 'both', 'd@x.com'],
    ]);
  });

  test('surrounding whitespace: leading, trailing, both ends, and not plain spaces', () => {
    const a = analyseIdentityValues(values(' a', 'b ', ' c ', 'd\u00a0', '\te'), normalizeEmail);
    expect(a.surroundingWhitespace).toEqual({ leading: 2, trailing: 2, bothEnds: 1, notAsciiSpace: 2 });
    expect(a.detail.surroundingWhitespace.map((w) => w.key)).toEqual(['k1', 'k2', 'k3', 'k4', 'k5']);
  });

  test('inner whitespace is counted but not changed', () => {
    const a = analyseIdentityValues(values('a b@x.com'), normalizeEmail);
    expect(a.innerWhitespace).toBe(1);
    expect(a.changed.total).toBe(0);
  });

  test('empty and whitespace-only values', () => {
    const a = analyseIdentityValues(values('', '  ', 'x'), normalizeEmail);
    expect(a.empty).toBe(1);
    expect(a.whitespaceOnly).toBe(1);
    expect(a.surroundingWhitespace).toEqual({ leading: 0, trailing: 0, bothEnds: 0, notAsciiSpace: 0 });
  });

  test('collision groups: distinct raw values that normalise to one value', () => {
    const a = analyseIdentityValues(values('Alice@X.com', 'alice@x.com', ' alice@x.com', 'bob@x.com', 'BOB@x.com', 'carol@x.com'), normalizeEmail);
    expect(a.collisionGroups).toBe(2);
    expect(a.collisionRows).toBe(5);
    expect(a.detail.collisions.map((g) => [g.normalized, g.members.map((m) => m.key)])).toEqual([
      ['alice@x.com', ['k1', 'k2', 'k3']],
      ['bob@x.com', ['k4', 'k5']],
    ]);
  });

  test('the same raw value twice is a duplicate, not a collision', () => {
    const a = analyseIdentityValues(values('a@x.com', 'a@x.com'), normalizeEmail);
    expect(a.collisionGroups).toBe(0);
    expect(a.duplicateNormalizedGroups).toBe(1);
    expect(a.duplicateNormalizedRows).toBe(2);
    expect(a.detail.duplicates).toEqual([{ normalized: 'a@x.com', keys: ['k1', 'k2'] }]);
  });

  test('non-ASCII values and accent-folding groups', () => {
    const a = analyseIdentityValues(values('josé@x.com', 'jose@x.com', 'JOSÉ@x.com', 'zoë@x.com'), normalizeEmail);
    expect(a.nonAscii).toBe(3);
    expect(a.accentGroups).toBe(1);
    expect(a.accentRows).toBe(3);
    expect(a.detail.accentGroups[0].folded).toBe('jose@x.com');
    expect(a.collisionGroups).toBe(1);
  });

  test('composed and decomposed forms fold together', () => {
    const a = analyseIdentityValues(values('jos\u00e9', 'jose\u0301'), normalizeEmail);
    expect(a.accentGroups).toBe(1);
  });

  test('usernames go through normalizeUsername', () => {
    const a = analyseIdentityValues(values(' Admin', 'admin'), normalizeUsername);
    expect(a.changed.both).toBe(1);
    expect(a.collisionGroups).toBe(1);
  });
});

describe('foldAccents', () => {
  test('drops combining marks', () => {
    expect(foldAccents('Ångström café niño')).toBe('Angstrom cafe nino');
  });
});

describe('analyseJsonColumn', () => {
  const ddl = 'CREATE TABLE `j` (`id` varchar(5) NOT NULL, `v` json DEFAULT NULL, PRIMARY KEY (`id`));';
  const rows = [
    ['a', '{"x":1}'],
    ['b', '[1,2]'],
    ['c', JSON.stringify(JSON.stringify({ wrapped: true }))],
    ['d', JSON.stringify('plain string')],
    ['e', 'null'],
    ['f', '{broken'],
    ['g', null],
    ['h', JSON.stringify('[1]')],
    ['i', '42'],
  ] as const;
  const inserts = Buffer.concat([
    Buffer.from('INSERT INTO `j` VALUES '),
    ...rows.flatMap(([id, v], i) => [
      Buffer.from(`${i ? ',' : ''}('${id}',`),
      v === null ? Buffer.from('NULL') : quoteForDump(v),
      Buffer.from(')'),
    ]),
    Buffer.from(';'),
  ]);
  const table = dumpOf(ddl, inserts).tables.get('j');

  test('counts parses, failures, types and JSON strings wrapping JSON', () => {
    if (!table) throw new Error('missing');
    const j = analyseJsonColumn(table, 'v');
    expect(j.column).toBe('j.v');
    expect(j.nonNull).toBe(8);
    expect(j.parses).toBe(7);
    expect(j.fails).toBe(1);
    expect(j.types).toEqual({ object: 1, array: 1, string: 3, null: 1, number: 1 });
    expect(j.stringWrappingJson).toBe(2);
    expect(j.detail.wrappedKeys).toEqual(['c', 'h']);
    expect(j.detail.failKeys).toEqual(['f']);
  });
});

describe('countInsertTuplesIndependently', () => {
  test('agrees with the reader on the fixture, whose strings hold commas and parentheses', () => {
    const buf = fixtureDump();
    const dump = readDump(buf);
    const independent = countInsertTuplesIndependently(buf);
    for (const table of dump.tables.values()) {
      expect(independent.get(table.name)).toEqual({ statements: table.insertStatements, tuples: table.rows.length });
    }
    expect(independent.size).toBe(dump.tables.size);
  });

  test('counts quoted parentheses and escaped quotes correctly', () => {
    const buf = Buffer.from("INSERT INTO `t` VALUES ('(',1),('\\')(',2),(')',3);\nINSERT INTO `t` VALUES (4);\n");
    expect(countInsertTuplesIndependently(buf).get('t')).toEqual({ statements: 2, tuples: 4 });
  });
});

describe('tableCounts and cellByteLength', () => {
  test('rows, statements and bytes per table', () => {
    const counts = tableCounts(readDump(fixtureDump()));
    expect(counts.map((c) => [c.table, c.rows, c.insertStatements])).toEqual([
      ['people', 3, 2],
      ['images', 3, 1],
    ]);
    expect(counts[1].valueBytes).toBeGreaterThanOrEqual(256);
  });

  test('cellByteLength', () => {
    expect(cellByteLength(null)).toBe(0);
    expect(cellByteLength('é')).toBe(2);
    expect(cellByteLength(Buffer.alloc(5))).toBe(5);
    expect(cellByteLength(123)).toBe(3);
  });
});

describe('scanTextColumns', () => {
  const ddl =
    'CREATE TABLE `s` (`id` varchar(5) NOT NULL, `name` varchar(10) DEFAULT NULL, `body` text, `when` datetime(3) DEFAULT NULL, PRIMARY KEY (`id`));';
  const dump = dumpOf(
    ddl,
    dumpBytes(
      'INSERT INTO `s` VALUES ',
      "('a','ab\\0c','plain',NULL),",
      "('b','x','emoji 🙂',NULL),",
      "('c','12345','Thanks ?',NULL),",
      "('d','y','why?? ok',NULL),",
      "('e','z','ctl ",
      Buffer.from([0x01]),
      "',NULL),",
      "('f','w','bad \ufffd',NULL);",
    ),
  );
  const scan = scanTextColumns(dump);

  test('NUL bytes by column', () => {
    expect(scan.nul).toEqual([{ column: 's.name', count: 1 }]);
  });

  test('characters outside the BMP, replacement characters and control characters', () => {
    expect(scan.supplementary).toEqual([{ column: 's.body', count: 1 }]);
    expect(scan.replacementChar).toEqual([{ column: 's.body', count: 1 }]);
    expect(scan.otherControl).toEqual([{ column: 's.body', count: 1 }]);
  });

  test('lone or doubled question marks, with context only in the detail', () => {
    expect(scan.suspectQuestionMarks).toEqual([{ column: 's.body', count: 2 }]);
    expect(scan.detail.suspectQuestionMarks.map((q) => q.key)).toEqual(['c', 'd']);
  });

  test('longest values: varchar in characters, text in bytes; dates skipped', () => {
    expect(scan.varcharMax).toEqual([
      { column: 's.id', declared: 5, max: 1 },
      { column: 's.name', declared: 10, max: 5 },
    ]);
    expect(scan.textMaxBytes).toEqual([{ column: 's.body', baseType: 'text', max: 10 }]);
  });
});

describe('checkValues', () => {
  const ddl =
    "CREATE TABLE `v` (`id` varchar(5) NOT NULL, `at` datetime(3) DEFAULT NULL, `flag` tinyint(1) NOT NULL, `s` enum('A','B') DEFAULT NULL, `req` varchar(5) NOT NULL, PRIMARY KEY (`id`));";
  const dump = dumpOf(
    ddl,
    "INSERT INTO `v` VALUES ('1','2025-01-02 03:04:05.678',1,'A','x'),('2','0000-00-00 00:00:00',2,'C','y'),('3','yesterday',0,NULL,NULL),('4','1999-12-31',1,'B','z');",
  );
  const checks = checkValues(dump);

  test('zero dates, malformed dates and the date range', () => {
    expect(checks.zeroDates).toEqual([{ column: 'v.at', count: 1 }]);
    expect(checks.badDates).toEqual([{ column: 'v.at', count: 1 }]);
    expect(checks.dateRange).toEqual({ min: '1999-12-31', max: '2025-01-02 03:04:05.678' });
  });

  test('tinyint(1) outside 0/1, enum values outside the list, NULL in NOT NULL', () => {
    expect(checks.nonBooleanTinyint).toEqual([{ column: 'v.flag', count: 1 }]);
    expect(checks.enumOutside).toEqual([{ column: 'v.s', count: 1 }]);
    expect(checks.nullInNotNull).toEqual([{ column: 'v.req', count: 1 }]);
  });
});

describe('checkKeys', () => {
  test('orphans in the fixture: one image points at a person that does not exist', () => {
    const keys = checkKeys(readDump(fixtureDump()));
    expect(keys.orphans).toEqual([{ constraint: 'images.images_personId_fkey -> people', rows: 1 }]);
    expect(keys.detail.orphans).toEqual([{ constraint: 'images.images_personId_fkey -> people', keys: ['i3'] }]);
    expect(keys.duplicatePrimaryKeys).toEqual([]);
    expect(keys.duplicateUniqueKeys).toEqual([]);
  });

  test('duplicate primary and unique keys; NULLs are not duplicates', () => {
    const dump = dumpOf(
      'CREATE TABLE `k` (`id` varchar(5) NOT NULL, `u` varchar(5) DEFAULT NULL, PRIMARY KEY (`id`), UNIQUE KEY `k_u_key` (`u`));',
      "INSERT INTO `k` VALUES ('a','x'),('a','x'),('b',NULL),('c',NULL);",
    );
    const keys = checkKeys(dump);
    expect(keys.duplicatePrimaryKeys).toEqual([{ column: 'k PRIMARY', count: 1 }]);
    expect(keys.duplicateUniqueKeys).toEqual([{ column: 'k.k_u_key', count: 1 }]);
  });
});

describe('imageKindFromBytes and imageStats', () => {
  test('detects JPEG, PNG, WebP and GIF from the first bytes', () => {
    expect(imageKindFromBytes(Buffer.from([0xff, 0xd8, 0xff, 0xe0]))).toBe('image/jpeg');
    expect(imageKindFromBytes(Buffer.from('\x89PNG\r\n\x1a\n....', 'latin1'))).toBe('image/png');
    expect(imageKindFromBytes(Buffer.from('RIFF....WEBPVP8 ', 'latin1'))).toBe('image/webp');
    expect(imageKindFromBytes(Buffer.from('GIF89a', 'latin1'))).toBe('image/gif');
    expect(imageKindFromBytes(Buffer.from('nothing'))).toBe('unknown');
  });

  test('counts, bytes, size mismatches and MIME mismatches', () => {
    const jpeg = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff]), allBytes()]);
    const dump = dumpOf(
      "CREATE TABLE `image_storage` (`id` varchar(5) NOT NULL, `data` longblob, `mimeType` varchar(191) NOT NULL, `size` int NOT NULL, `storageType` varchar(191) NOT NULL, PRIMARY KEY (`id`));",
      dumpBytes(
        "INSERT INTO `image_storage` VALUES ('a',_binary ",
        quoteForDump(jpeg),
        `,'image/jpg',${jpeg.length},'database'),('b',_binary `,
        quoteForDump(jpeg),
        ",'image/png',1,'database'),('c',NULL,'image/jpeg',0,'s3');",
      ),
    );
    const table = dump.tables.get('image_storage');
    if (!table) throw new Error('missing');
    const s = imageStats(table);
    expect(s).toEqual({
      rows: 3,
      withData: 2,
      totalDataBytes: 2 * jpeg.length,
      maxDataBytes: jpeg.length,
      sizeMismatches: 1,
      byStorageType: { database: 2, s3: 1 },
      byMimeType: { 'image/jpeg': 2, 'image/png': 1 },
      byDetectedKind: { 'image/jpeg': 2 },
      mimeMismatches: 1,
    });
  });
});

describe('compareSchemaToDump', () => {
  const schema = readPrismaSchema(`
datasource db {
  provider = "mysql"
  url      = env("DATABASE_URL")
}
model Person {
  id     String  @id
  email  String?
  note   String? @db.Text
  age    Int?
  score  Float?
  amount Decimal? @db.Decimal(10, 2)
  active Boolean
  status Status
  meta   Json?
  createdAt DateTime @default(now())
  extra  String
  images Image[]
  @@map("people")
}
model Image {
  id       String  @id
  personId String
  person   Person? @relation(fields: [personId], references: [id])
  data     Bytes?
  size     Int
  @@map("images")
}
model Missing {
  id String @id
  @@map("missing_table")
}
enum Status {
  NEW
  OLD
}
`);
  const comparison = compareSchemaToDump(schema, readDump(fixtureDump()));

  test('tables and columns on one side only', () => {
    expect(comparison.provider).toBe('mysql');
    expect(comparison.tablesOnlyInSchema).toEqual(['missing_table']);
    expect(comparison.tablesOnlyInDump).toEqual([]);
    expect(comparison.columnsOnlyInSchema).toEqual(['people.extra']);
    expect(comparison.columnsOnlyInDump).toEqual([]);
  });

  test('nullability and enum differences', () => {
    expect(comparison.nullabilityMismatches).toEqual(['images.personId']);
    expect(comparison.enumMismatches).toEqual(['people.status']);
  });
});

describe('checkMigrations', () => {
  const dump = dumpOf(
    'CREATE TABLE `_prisma_migrations` (`id` varchar(36) NOT NULL, `finished_at` datetime(3) DEFAULT NULL, `migration_name` varchar(255) NOT NULL, `rolled_back_at` datetime(3) DEFAULT NULL, PRIMARY KEY (`id`));',
    "INSERT INTO `_prisma_migrations` VALUES ('1','2025-01-01 00:00:00.000','m1',NULL),('2',NULL,'m2',NULL),('3','2025-01-01 00:00:00.000','m9','2025-01-02 00:00:00.000');",
  );

  test('compares applied migrations with the repo folders', () => {
    expect(checkMigrations(dump, ['m1', 'm2', 'm3'])).toEqual({
      rowsInDump: 3,
      directoriesInRepo: 3,
      notApplied: ['m3'],
      notInRepo: ['m9'],
      unfinished: 1,
      rolledBack: 1,
    });
  });

  test('null when the dump has no _prisma_migrations table', () => {
    expect(checkMigrations(readDump(fixtureDump()), [])).toBeNull();
  });
});

describe('commentEmailLinking, identityValues, rowKey, countBy', () => {
  const dump = dumpOf(
    [
      'CREATE TABLE `users` (`id` varchar(5) NOT NULL, `email` varchar(191) DEFAULT NULL, PRIMARY KEY (`id`));',
      'CREATE TABLE `comments` (`id` varchar(5) NOT NULL, `email` varchar(191) DEFAULT NULL, `userId` varchar(5) DEFAULT NULL, PRIMARY KEY (`id`));',
    ].join('\n'),
    [
      "INSERT INTO `users` VALUES ('u1','Ann@x.com'),('u2',NULL),('u3','bo@x.com');",
      "INSERT INTO `comments` VALUES ('c1','Ann@x.com','u1'),('c2','ann@x.com ',NULL),('c3','zed@x.com',NULL),('c4',NULL,NULL),('c5','',NULL);",
    ].join('\n'),
  );
  const users = dump.tables.get('users');
  const comments = dump.tables.get('comments');

  test('exact, only-after-normalising and unmatched comment emails', () => {
    if (!users || !comments) throw new Error('missing');
    expect(commentEmailLinking(users, comments, normalizeEmail)).toEqual({
      withEmail: 3,
      exact: 1,
      onlyNormalized: 1,
      noUser: 1,
      withUserId: 1,
    });
  });

  test('identityValues keys rows by primary key', () => {
    if (!users) throw new Error('missing');
    expect(identityValues(users, 'email')).toEqual([
      { key: 'u1', value: 'Ann@x.com' },
      { key: 'u2', value: null },
      { key: 'u3', value: 'bo@x.com' },
    ]);
    expect(rowKey(users, users.rows[0], 1)).toBe('u1');
  });

  test('countBy counts NULL separately', () => {
    if (!comments) throw new Error('missing');
    expect(countBy(comments, 'userId')).toEqual({ u1: 1, NULL: 4 });
  });
});
