export type CacheSource = 'memory' | 'redis' | 'database';

export interface KeyStats {
  hits: number;
  misses: number;
  lastAccess: Date;
  size: number; // Size in bytes
  ttl?: number; // Original TTL in seconds
  cachedAt?: Date; // When the item was cached
  expiresAt?: Date; // When the item expires
}

export interface CacheStats {
  memory: {
    hits: number;
    misses: number;
    hitRate: number;
    totalSize: number; // Total size in bytes
    byKey: Record<string, KeyStats>;
  };
  redis: {
    hits: number;
    misses: number;
    hitRate: number;
    totalSize: number; // Total size in bytes
    byKey: Record<string, KeyStats>;
  };
  database: {
    queries: number;
    byKey: Record<string, number>;
  };
  lastReset: Date;
}

export interface CacheResult<T> {
  data: T;
  source: CacheSource;
  latency: number;
}

export interface CacheOptions {
  forceRefresh?: boolean;
  ttl?: number;
}

// Define the proper SerializedPersonData type
export interface SerializedPersonData {
  id: string;
  firstName: string;
  middleName: string | null;
  lastName: string;
  story: string | null;
  town: {
    id: string;
    name: string;
    slug: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export interface PersonPageData {
  person: SerializedPersonData;
  systemDefaults: {
    layout: string;
    theme: string;
  };
  permissions?: {
    isAdmin: boolean;
    isSiteAdmin: boolean;
    isTownAdmin: boolean;
    isPersonAdmin: boolean;
  };
  supportStats?: {
    anonymousSupport: { 
      total: number;
      last24Hours: number;
    };
    messages: { 
      total: number;
      last24Hours: number;
    };
  };
  supportMapMetadata?: {
    hasIpAddresses: boolean;
    messageLocationCount: number;
    supportLocationCount: number;
  };
}