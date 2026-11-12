/**
 * Test helpers: an escaper that writes values the way mysqldump does (mysql_real_escape_string:
 * NUL, quotes, backslash, newline, carriage return and Ctrl-Z are escaped; every other byte is
 * written raw), and a small hand-written dump with no real data in it.
 */

const ESCAPES: Record<number, string> = {
  0x00: '\\0',
  0x0a: '\\n',
  0x0d: '\\r',
  0x1a: '\\Z',
  0x22: '\\"',
  0x27: "\\'",
  0x5c: '\\\\',
};

/** The bytes of a single-quoted literal holding `value`, as mysqldump writes it. */
export function quoteForDump(value: Buffer | string): Buffer {
  const bytes = typeof value === 'string' ? Buffer.from(value, 'utf8') : value;
  const parts: Buffer[] = [Buffer.from("'")];
  let start = 0;
  for (let i = 0; i < bytes.length; i++) {
    const escape = ESCAPES[bytes[i]];
    if (escape !== undefined) {
      parts.push(bytes.subarray(start, i), Buffer.from(escape, 'latin1'));
      start = i + 1;
    }
  }
  parts.push(bytes.subarray(start), Buffer.from("'"));
  return Buffer.concat(parts);
}

/** Joins strings (as UTF-8) and Buffers (as is) into one dump Buffer. */
export function dumpBytes(...parts: (string | Buffer)[]): Buffer {
  return Buffer.concat(parts.map((part) => (typeof part === 'string' ? Buffer.from(part, 'utf8') : part)));
}

/** Every byte value 0-255 once. */
export function allBytes(): Buffer {
  return Buffer.from(Array.from({ length: 256 }, (_, i) => i));
}

/** A small deterministic pseudo-random generator (mulberry32). */
export function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const FIXTURE_HEADER = `-- MySQL dump 10.13  Distrib 8.0.40, for macos14 (arm64)
--
-- Host: 127.0.0.1    Database: fixture-db
-- ------------------------------------------------------
-- Server version\t8.0.45

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET TIME_ZONE='+00:00' */;
`;

export const FIXTURE_TRAILER = `/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

-- Dump completed on 2026-11-11 18:01:39
`;

/**
 * A hand-written dump with two tables, two INSERT lines for `people`, a blob holding every byte
 * value, a NUL inside text, commas and parentheses in strings, and NULL beside 'NULL'.
 */
export function fixtureDump(): Buffer {
  return dumpBytes(
    FIXTURE_HEADER,
    `
--
-- Table structure for table \`people\`
--

DROP TABLE IF EXISTS \`people\`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
CREATE TABLE \`people\` (
  \`id\` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  \`email\` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  \`note\` text COLLATE utf8mb4_unicode_ci,
  \`age\` int DEFAULT NULL,
  \`score\` double DEFAULT NULL,
  \`amount\` decimal(10,2) DEFAULT NULL,
  \`active\` tinyint(1) NOT NULL DEFAULT '1',
  \`status\` enum('NEW','OLD, BUT GOOD','it''s') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'NEW',
  \`meta\` json DEFAULT NULL,
  \`createdAt\` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (\`id\`),
  UNIQUE KEY \`people_email_key\` (\`email\`),
  KEY \`people_age_idx\` (\`age\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES \`people\` WRITE;
/*!40000 ALTER TABLE \`people\` DISABLE KEYS */;
INSERT INTO \`people\` VALUES ('p1','A@Example.com','Hello, (world)',42,1.5,'12345678.90',1,'NEW','{\\"a\\": [1, 2]}','2025-01-02 03:04:05.678'),('p2',NULL,'NULL',NULL,-2.5e-3,NULL,0,'OLD, BUT GOOD',NULL,'2025-01-02 03:04:05.000');
INSERT INTO \`people\` VALUES ('p3','','tab\\there\\nnew line \\0 nul \\\\ back \\' quote \\" dq \\Z',0,0,'-0.01',1,'it\\'s','\\"{\\\\\\"x\\\\\\": 1}\\"','2025-12-31 23:59:59.999');
/*!40000 ALTER TABLE \`people\` ENABLE KEYS */;
UNLOCK TABLES;

DROP TABLE IF EXISTS \`images\`;
CREATE TABLE \`images\` (
  \`id\` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  \`personId\` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  \`data\` longblob,
  \`size\` int unsigned NOT NULL,
  PRIMARY KEY (\`id\`),
  CONSTRAINT \`images_personId_fkey\` FOREIGN KEY (\`personId\`) REFERENCES \`people\` (\`id\`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

LOCK TABLES \`images\` WRITE;
INSERT INTO \`images\` VALUES ('i1','p1',_binary `,
    quoteForDump(allBytes()),
    `,256),('i2',NULL,_binary '',0),('i3','p9',NULL,0);
UNLOCK TABLES;
`,
    FIXTURE_TRAILER,
  );
}
