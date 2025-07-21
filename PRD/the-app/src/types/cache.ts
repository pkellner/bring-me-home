export type CacheSource = 'memory' | 'redis' | 'database';

export interface CacheStats {
  memory: {
    hits: number;
    misses: number;
    hitRate: number;
  };
  redis: {
    hits: number;
    misses: number;
    hitRate: number;
  };
  database: {
    queries: number;
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

// Import the actual type instead of using Record<string, unknown>
interface SerializedPersonData {
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
  supportMapMetadata?: {
    hasIpAddresses: boolean;
    messageLocationCount: number;
    supportLocationCount: number;
  };
}