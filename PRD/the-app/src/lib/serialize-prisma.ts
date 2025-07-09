import { Decimal } from '@prisma/client/runtime/library';

/**
 * Serializes Prisma objects for passing to client components
 * Converts Decimal types to numbers/strings
 */
export function serializePrismaObject<T>(obj: T): T {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (obj instanceof Date) {
    return obj.toISOString() as any;
  }

  if (obj instanceof Decimal) {
    return obj.toNumber() as any;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => serializePrismaObject(item)) as any;
  }

  if (typeof obj === 'object') {
    const serialized: any = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        serialized[key] = serializePrismaObject(obj[key]);
      }
    }
    return serialized;
  }

  return obj;
}