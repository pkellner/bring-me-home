import { Decimal } from '@prisma/client/runtime/library';

/**
 * Serializes Prisma objects for passing to client components
 * Converts Decimal types to numbers/strings
 */
type SerializedType<T> = T extends Date
  ? string
  : T extends Decimal
  ? number
  : T extends Array<infer U>
  ? Array<SerializedType<U>>
  : T extends object
  ? { [K in keyof T]: SerializedType<T[K]> }
  : T;

export function serializePrismaObject<T>(obj: T): SerializedType<T> {
  if (obj === null || obj === undefined) {
    return obj as SerializedType<T>;
  }

  if (obj instanceof Date) {
    return obj.toISOString() as SerializedType<T>;
  }

  if (obj instanceof Decimal) {
    return obj.toNumber() as SerializedType<T>;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => serializePrismaObject(item)) as SerializedType<T>;
  }

  if (typeof obj === 'object') {
    const serialized: Record<string, unknown> = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        serialized[key] = serializePrismaObject(obj[key]);
      }
    }
    return serialized as SerializedType<T>;
  }

  return obj as SerializedType<T>;
}
