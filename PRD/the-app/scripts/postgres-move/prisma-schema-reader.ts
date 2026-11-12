/**
 * Reads the models of `prisma/schema.prisma` far enough to compare them with a dump (issue #1):
 * each model's table name (`@@map`), its scalar fields and their column names (`@map`), whether
 * each is optional, and the values of each enum. Relation fields (whose type is another model)
 * are left out, because they have no column.
 */

export interface PrismaField {
  name: string;
  /** The column name: the field name, or its `@map("...")`. */
  column: string;
  /** The type without `?` or `[]`, e.g. `String`, `DateTime`, `EmailStatus`. */
  type: string;
  optional: boolean;
  list: boolean;
  /** The `@db.X` native type, e.g. `VarChar(255)`, `Text`; null when none. */
  nativeType: string | null;
}

export interface PrismaModel {
  name: string;
  table: string;
  fields: PrismaField[];
}

export interface PrismaSchemaSummary {
  provider: string | null;
  models: PrismaModel[];
  enums: Map<string, string[]>;
}

function stripComment(line: string): string {
  let quote = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"' && line[i - 1] !== '\\') quote = !quote;
    if (!quote && ch === '/' && line[i + 1] === '/') return line.slice(0, i);
  }
  return line;
}

interface Block {
  kind: string;
  name: string;
  lines: string[];
}

function blocks(schema: string): Block[] {
  const result: Block[] = [];
  let current: Block | null = null;
  for (const rawLine of schema.split(/\r?\n/)) {
    const line = stripComment(rawLine).trim();
    if (current === null) {
      const open = /^(model|enum|datasource|generator|view|type)\s+(\w+)\s*\{$/.exec(line);
      if (open) current = { kind: open[1], name: open[2], lines: [] };
      continue;
    }
    if (line === '}') {
      result.push(current);
      current = null;
      continue;
    }
    if (line !== '') current.lines.push(line);
  }
  return result;
}

/** Parses the text of a Prisma schema. */
export function readPrismaSchema(schema: string): PrismaSchemaSummary {
  const all = blocks(schema);
  const modelNames = new Set(all.filter((b) => b.kind === 'model').map((b) => b.name));
  const enums = new Map<string, string[]>();
  for (const block of all.filter((b) => b.kind === 'enum')) {
    enums.set(
      block.name,
      block.lines.filter((line) => !line.startsWith('@@')).map((line) => line.split(/\s+/)[0]),
    );
  }
  let provider: string | null = null;
  for (const block of all.filter((b) => b.kind === 'datasource')) {
    for (const line of block.lines) {
      const match = /^provider\s*=\s*"([^"]+)"/.exec(line);
      if (match) provider = match[1];
    }
  }
  const models: PrismaModel[] = all
    .filter((b) => b.kind === 'model')
    .map((block) => {
      let table = block.name;
      const fields: PrismaField[] = [];
      for (const line of block.lines) {
        if (line.startsWith('@@')) {
          const map = /^@@map\(\s*"([^"]+)"\s*\)/.exec(line);
          if (map) table = map[1];
          continue;
        }
        const field = /^(\w+)\s+(\w+)(\[\])?(\?)?(.*)$/.exec(line);
        if (!field) continue;
        const [, name, type, list, optional, attributes] = field;
        if (modelNames.has(type)) continue;
        const columnMap = /@map\(\s*"([^"]+)"\s*\)/.exec(attributes);
        const native = /@db\.(\w+(?:\([^)]*\))?)/.exec(attributes);
        fields.push({
          name,
          column: columnMap ? columnMap[1] : name,
          type,
          optional: optional === '?',
          list: list === '[]',
          nativeType: native ? native[1] : null,
        });
      }
      return { name: block.name, table, fields };
    });
  return { provider, models, enums };
}
