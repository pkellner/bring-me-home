# Cache Implementation Plan for Bring Me Home

## Overview

This document outlines the caching strategy implemented for the person profile pages in the Bring Me Home application. The implementation uses a multi-tier caching approach to optimize performance and reduce database load.

## Architecture

### Cache Tiers

```
┌─────────────┐     ┌─────────────┐     ┌──────────────┐
│   Browser   │ --> │   Next.js   │ --> │   REST API   │
└─────────────┘     └─────────────┘     └──────┬───────┘
                                                │
                                    ┌───────────▼────────────┐
                                    │   Cache Manager        │
                                    │  (Functional Core)     │
                                    └───────────┬────────────┘
                                                │
                    ┌───────────────────────────┼───────────────────────────┐
                    │                           │                           │
            ┌───────▼────────┐         ┌────────▼────────┐        ┌────────▼────────┐
            │ Memory Cache   │         │  Redis Cache    │        │    Database     │
            │ (node-cache)   │         │   (ioredis)     │        │    (Prisma)     │
            └────────────────┘         └─────────────────┘        └─────────────────┘
```

### Data Flow

1. **Client Request**: Browser makes request to `/api/persons/[townSlug]/[personSlug]`
2. **Memory Cache Check**: First checks in-memory cache (fastest) - if `CACHE_MEMORY_ENABLE=true`
3. **Redis Cache Check**: If not in memory, checks Redis cache (distributed) - if `CACHE_REDIS_ENABLE=true`
   - **If found in Redis**: Data is returned AND used to populate memory cache
4. **Database Query**: If not in any cache (or caches disabled), queries database
5. **Cache Population**: Database results populate BOTH Redis and memory caches (if enabled)
6. **Response**: Data returned to client with cache metadata headers

## Implementation Details

### Cache Key Pattern

```typescript
`person:${townSlug}:${personSlug}:v1`
```

- Includes version suffix for cache invalidation during schema changes
- Human-readable format for debugging
- Hierarchical structure allows pattern-based invalidation

### Cache Configuration

| Setting | Environment Variable | Default | Description |
|---------|---------------------|---------|-------------|
| **Memory Cache Enable** | `CACHE_MEMORY_ENABLE` | `false` | Set to `"true"` to enable memory caching |
| **Redis Cache Enable** | `CACHE_REDIS_ENABLE` | `false` | Set to `"true"` to enable Redis caching |
| **Memory TTL** | `CACHE_MEMORY_TTL` | 300 (5 min) | Time-to-live in seconds for memory cache |
| **Memory Size Limit** | `CACHE_MEMORY_MAX_SIZE_MB` | 100 | Maximum memory usage in MB |
| **Redis TTL** | `CACHE_REDIS_TTL` | 3600 (1 hr) | Time-to-live in seconds for Redis cache |
| **Redis Host** | `REDIS_HOST` | - | Redis server hostname |
| **Redis Port** | `REDIS_PORT` | - | Redis server port |

**Important Cache Rules:**
1. Cache hierarchy: Memory → Redis → Database
2. When data found in Redis, it populates memory cache
3. Database data populates BOTH caches
4. If both caches disabled, system queries database directly
5. Memory cache uses size-based eviction (oldest entries first)

### Cache Statistics

The system tracks comprehensive statistics for monitoring and optimization:

```typescript
interface CacheStats {
  memory: {
    hits: number;
    misses: number;
    hitRate: number; // Percentage
  };
  redis: {
    hits: number;
    misses: number;
    hitRate: number; // Percentage
  };
  database: {
    queries: number;
  };
  lastReset: Date;
}
```

Access statistics via: `GET /api/cache/stats` (admin only)
Reset statistics via: `POST /api/cache/stats` (site admin only)

## Functional Programming Approach

### Core Cache Function

```typescript
// Pure functional cache retrieval
async function getCachedPersonData(
  townSlug: string,
  personSlug: string,
  options?: CacheOptions
): Promise<CacheResult<PersonPageData>>
```

**Key Features:**
- **Immutable**: No side effects on input parameters
- **Composable**: Each cache tier is a separate function
- **Type-safe**: Full TypeScript typing throughout
- **Error-resilient**: Graceful degradation if cache layers fail

### Cache Manager Design

The cache manager uses dependency injection and factory patterns:

```typescript
// Factory functions for cache instances
export async function getMemoryCache(): Promise<Cache>
export async function getRedisCache(): Promise<Cache | null>
```

This allows for:
- Easy testing with mock implementations
- Runtime configuration changes
- Graceful handling of missing Redis

## Performance Optimizations

### 1. **Parallel Data Fetching**
When fetching from database, we parallelize:
- Person data query
- System defaults query
- User permissions check
- Image URL generation

### 2. **Selective Serialization**
Only serialize necessary fields to reduce:
- Memory usage
- Network payload size
- Serialization overhead

### 3. **Cache Warming**
After cache miss, we populate both tiers simultaneously:
```typescript
await Promise.all([
  memoryCache.set(key, data),
  redisCache?.set(key, data)
]);
```

### 4. **Client-Side Loading**
- 1-second delay ensures smooth loading experience
- Prevents UI flashing on fast connections
- Spinner appears after 100ms to avoid unnecessary display

## Environment Configuration

```env
# Cache TTLs (in seconds)
CACHE_MEMORY_TTL=300      # 5 minutes
CACHE_REDIS_TTL=3600      # 1 hour

# Memory cache limits
CACHE_MEMORY_MAX_KEYS=1000
CACHE_MEMORY_MAX_SIZE=100  # MB

# Redis connection (existing)
REDIS_HOST=localhost
REDIS_PORT=6379
```

## Cache Invalidation Strategy

### Manual Invalidation

```typescript
// Invalidate specific person
await invalidatePersonCache(townSlug, personSlug);
```

### Automatic Invalidation Triggers

Future implementation should invalidate cache on:
1. Person data updates
2. Town configuration changes
3. Theme/layout modifications
4. Comment approvals
5. Image uploads

### Invalidation Patterns

```bash
# Invalidate all persons in a town
person:borrego-springs:*:v1

# Invalidate all cache entries
person:*:*:v1
```

## Monitoring and Debugging

### Response Headers

Each API response includes:
- `X-Cache-Source`: memory | redis | database
- `X-Cache-Latency`: Response time in milliseconds
- `Cache-Control`: Standard HTTP caching headers

### Debug Endpoints

```bash
# View cache statistics
curl -H "Authorization: Bearer $TOKEN" /api/cache/stats

# Force cache refresh
curl -H "Cache-Control: no-cache" /api/persons/town/person
```

### Performance Metrics

Monitor these key metrics:
1. **Cache Hit Rate**: Target >80% for memory, >60% for Redis
2. **Response Times**: <50ms for cache hits, <200ms for database
3. **Memory Usage**: Monitor cache size growth
4. **Redis Connection Pool**: Track connection health

## Security Considerations

1. **Authentication**: Cache includes user-specific permissions
2. **Cache Poisoning**: Validate all data before caching
3. **Information Leakage**: Ensure proper access controls
4. **DoS Protection**: Rate limiting on cache refresh endpoints

## Future Enhancements

### 1. **Edge Caching**
Integrate with Vercel Edge Cache or CloudFront for global distribution

### 2. **Partial Cache Updates**
Update specific fields without full invalidation

### 3. **Predictive Pre-warming**
Pre-cache related persons based on navigation patterns

### 4. **Cache Compression**
Compress large objects before storing in Redis

### 5. **Multi-tenant Isolation**
Separate cache namespaces per town for better isolation

## Testing Strategy

### Unit Tests
- Test each cache tier independently
- Mock Redis and database connections
- Verify TTL behavior

### Integration Tests
- Test full cache flow
- Verify fallback behavior
- Test concurrent access

### Load Tests
- Simulate high traffic scenarios
- Monitor cache performance under load
- Identify bottlenecks

## Deployment Checklist

- [ ] Configure Redis connection in production
- [ ] Set appropriate TTL values for production load
- [ ] Enable cache statistics monitoring
- [ ] Configure alerts for low hit rates
- [ ] Document cache clearing procedures
- [ ] Train support team on cache debugging

## Sample Code Usage

### Basic Usage

```typescript
// In API route
const result = await getCachedPersonData(townSlug, personSlug);

if (!result.data) {
  return NextResponse.json({ error: 'Not found' }, { status: 404 });
}

return NextResponse.json(result.data);
```

### Force Refresh

```typescript
// Skip cache for fresh data
const result = await getCachedPersonData(townSlug, personSlug, {
  forceRefresh: true
});
```

### Custom TTL

```typescript
// Override default TTL
const result = await getCachedPersonData(townSlug, personSlug, {
  ttl: 600 // 10 minutes
});
```

## Conclusion

This caching implementation provides a robust, scalable solution for improving performance while maintaining data consistency. The functional programming approach ensures maintainability and testability, while the multi-tier architecture provides flexibility for different deployment scenarios.