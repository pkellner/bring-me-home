import { CacheStats } from '@/types/cache';

class CacheStatsManager {
  private stats: CacheStats = {
    memory: { hits: 0, misses: 0, hitRate: 0 },
    redis: { hits: 0, misses: 0, hitRate: 0 },
    database: { queries: 0 },
    lastReset: new Date(),
  };

  recordMemoryHit(): void {
    this.stats.memory.hits++;
    this.updateHitRate('memory');
  }

  recordMemoryMiss(): void {
    this.stats.memory.misses++;
    this.updateHitRate('memory');
  }

  recordRedisHit(): void {
    this.stats.redis.hits++;
    this.updateHitRate('redis');
  }

  recordRedisMiss(): void {
    this.stats.redis.misses++;
    this.updateHitRate('redis');
  }

  recordDatabaseQuery(): void {
    this.stats.database.queries++;
  }

  getStats(): CacheStats {
    return { ...this.stats };
  }

  reset(): void {
    this.stats = {
      memory: { hits: 0, misses: 0, hitRate: 0 },
      redis: { hits: 0, misses: 0, hitRate: 0 },
      database: { queries: 0 },
      lastReset: new Date(),
    };
  }

  private updateHitRate(type: 'memory' | 'redis'): void {
    const { hits, misses } = this.stats[type];
    const total = hits + misses;
    this.stats[type].hitRate = total > 0 ? (hits / total) * 100 : 0;
  }
}

// Singleton instance
export const cacheStats = new CacheStatsManager();