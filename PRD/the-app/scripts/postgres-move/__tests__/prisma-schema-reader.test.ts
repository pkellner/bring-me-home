import { readFileSync } from 'fs';
import path from 'path';
import { readPrismaSchema } from '../prisma-schema-reader';

describe('readPrismaSchema', () => {
  const schema = readPrismaSchema(`
// comment line
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql" // trailing comment
  url      = env("DATABASE_URL")
}

model User {
  id        String   @id @default(cuid())
  username  String   @unique
  email     String?  @unique // optional
  fullName  String   @map("full_name") @db.VarChar(255)
  tags      String[]
  status    Status   @default(ACTIVE)
  roles     Role[]
  createdAt DateTime @default(now())

  @@index([email])
  @@map("users")
}

model Role {
  id     String @id
  userId String
  user   User   @relation(fields: [userId], references: [id])
}

enum Status {
  ACTIVE
  BLOCKED // with a comment
  @@map("status_enum")
}
`);

  test('provider, ignoring the generator block and comments', () => {
    expect(schema.provider).toBe('postgresql');
  });

  test('model table names from @@map, defaulting to the model name', () => {
    expect(schema.models.map((m) => [m.name, m.table])).toEqual([
      ['User', 'users'],
      ['Role', 'Role'],
    ]);
  });

  test('scalar fields with column names, optional, list and native type; relations left out', () => {
    expect(schema.models[0].fields).toEqual([
      { name: 'id', column: 'id', type: 'String', optional: false, list: false, nativeType: null },
      { name: 'username', column: 'username', type: 'String', optional: false, list: false, nativeType: null },
      { name: 'email', column: 'email', type: 'String', optional: true, list: false, nativeType: null },
      { name: 'fullName', column: 'full_name', type: 'String', optional: false, list: false, nativeType: 'VarChar(255)' },
      { name: 'tags', column: 'tags', type: 'String', optional: false, list: true, nativeType: null },
      { name: 'status', column: 'status', type: 'Status', optional: false, list: false, nativeType: null },
      { name: 'createdAt', column: 'createdAt', type: 'DateTime', optional: false, list: false, nativeType: null },
    ]);
    expect(schema.models[1].fields.map((f) => f.name)).toEqual(['id', 'userId']);
  });

  test('enum values, without comments or block attributes', () => {
    expect(schema.enums.get('Status')).toEqual(['ACTIVE', 'BLOCKED']);
  });
});

describe('readPrismaSchema on the app schema', () => {
  const schema = readPrismaSchema(readFileSync(path.join(__dirname, '..', '..', '..', 'prisma', 'schema.prisma'), 'utf8'));

  test('31 models, each mapped to its own table', () => {
    expect(schema.models).toHaveLength(31);
    expect(new Set(schema.models.map((m) => m.table)).size).toBe(31);
  });

  test('the EmailStatus enum', () => {
    expect(schema.enums.get('EmailStatus')).toEqual(['QUEUED', 'SENDING', 'SENT', 'DELIVERED', 'FAILED', 'BOUNCED', 'OPENED']);
  });

  test('the one Bytes column and the six Json columns', () => {
    const fields = schema.models.flatMap((m) => m.fields.map((f) => ({ table: m.table, ...f })));
    expect(fields.filter((f) => f.type === 'Bytes').map((f) => `${f.table}.${f.column}`)).toEqual(['image_storage.data']);
    expect(fields.filter((f) => f.type === 'Json')).toHaveLength(6);
  });
});
