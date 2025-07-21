import { CacheStats, KeyStats } from '@/types/cache';

class CacheStatsManager {
  private stats: CacheStats = {
    memory: { hits: 0, misses: 0, hitRate: 0, totalSize: 0, byKey: {} },
    redis: { hits: 0, misses: 0, hitRate: 0, totalSize: 0, byKey: {} },
    database: { queries: 0, byKey: {} },
    lastReset: new Date(),
  };

  recordMemoryHit(key: string, size?: number, ttlInfo?: { ttl: number; cachedAt: Date; expiresAt: Date }): void {
    this.stats.memory.hits++;
    this.updateKeyStats(this.stats.memory.byKey, key, 'hit', size, ttlInfo);
    this.updateHitRate('memory');
    this.updateTotalSize('memory');
  }

  recordMemoryMiss(key: string, size?: number): void {
    this.stats.memory.misses++;
    this.updateKeyStats(this.stats.memory.byKey, key, 'miss', size);
    this.updateHitRate('memory');
  }

  recordRedisHit(key: string, size?: number, ttlInfo?: { ttl: number; cachedAt: Date; expiresAt: Date }): void {
    this.stats.redis.hits++;
    this.updateKeyStats(this.stats.redis.byKey, key, 'hit', size, ttlInfo);
    this.updateHitRate('redis');
    this.updateTotalSize('redis');
  }

  recordRedisMiss(key: string, size?: number): void {
    this.stats.redis.misses++;
    this.updateKeyStats(this.stats.redis.byKey, key, 'miss', size);
    this.updateHitRate('redis');
  }

  recordDatabaseQuery(key: string): void {
    this.stats.database.queries++;
    this.stats.database.byKey[key] = (this.stats.database.byKey[key] || 0) + 1;
  }

  private updateKeyStats(byKey: Record<string, KeyStats>, key: string, type: 'hit' | 'miss', size?: number, ttlInfo?: { ttl: number; cachedAt: Date; expiresAt: Date }): void {
    if (!byKey[key]) {
      byKey[key] = { hits: 0, misses: 0, lastAccess: new Date(), size: 0 };
    }
    
    if (type === 'hit') {
      byKey[key].hits++;
    } else {
      byKey[key].misses++;
    }
    
    if (size !== undefined && size > 0) {
      byKey[key].size = size;
    }
    
    if (ttlInfo) {
      byKey[key].ttl = ttlInfo.ttl;
      byKey[key].cachedAt = ttlInfo.cachedAt;
      byKey[key].expiresAt = ttlInfo.expiresAt;
    }
    
    byKey[key].lastAccess = new Date();
  }

  getStats(): CacheStats {
    return { ...this.stats };
  }

  reset(): void {
    this.stats = {
      memory: { hits: 0, misses: 0, hitRate: 0, totalSize: 0, byKey: {} },
      redis: { hits: 0, misses: 0, hitRate: 0, totalSize: 0, byKey: {} },
      database: { queries: 0, byKey: {} },
      lastReset: new Date(),
    };
  }

  private updateHitRate(type: 'memory' | 'redis'): void {
    const { hits, misses } = this.stats[type];
    const total = hits + misses;
    this.stats[type].hitRate = total > 0 ? (hits / total) * 100 : 0;
  }

  private updateTotalSize(type: 'memory' | 'redis'): void {
    let totalSize = 0;
    Object.values(this.stats[type].byKey).forEach(keyStats => {
      totalSize += keyStats.size || 0;
    });
    this.stats[type].totalSize = totalSize;
  }
}

// Singleton instance
export const cacheStats = new CacheStatsManager();