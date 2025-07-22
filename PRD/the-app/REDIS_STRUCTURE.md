# Redis Key Structure Documentation

## Overview

All Redis keys in this application MUST be created through the centralized key management system in `/src/lib/redis/redis-keys.ts`. This ensures all keys follow a consistent folder structure and are properly namespaced.

## Configuration

The Redis folder prefix is configured via the `REDIS_FOLDER_PREFIX` environment variable:

```env
REDIS_FOLDER_PREFIX=bring-me-home  # Default value if not set
```

## Key Structure

All keys follow this pattern:
```
{REDIS_FOLDER_PREFIX}:{namespace}:{key-specific-parts}
```

Example:
```
bring-me-home:cache:person:oakland:john-doe:v1
```

## Namespaces

The following namespaces are available:

- **session**: User session data (comment drafts, login flows)
- **cache**: Cached data (person pages, etc.)
- **health**: Health check test keys
- **person**: Person-specific data
- **comment**: Comment-related data
- **login**: Login flow data

## Key Examples

### Session Keys
```
bring-me-home:session:{sessionId}:comment:{personId}:draft
bring-me-home:session:{sessionId}:login_flow
```

### Cache Keys
```
bring-me-home:cache:person:{townSlug}:{personSlug}:v1
```

### Health Check Keys
```
bring-me-home:health:test:{timestamp}:{index}
```

## Usage

### Creating Keys

Always use the `RedisKeys` helpers:

```typescript
import { RedisKeys } from '@/lib/redis/redis-keys';

// Generate a comment draft key
const key = RedisKeys.commentDraft(sessionId, personId);

// Generate a person cache key
const key = RedisKeys.personCache(townSlug, personSlug);
```

### Custom Keys

If you need a custom key pattern, use `generateRedisKey`:

```typescript
import { generateRedisKey, RedisNamespaces } from '@/lib/redis/redis-keys';

const key = generateRedisKey(RedisNamespaces.CACHE, 'custom', 'pattern', id);
```

### Pattern Matching

For bulk operations, use the pattern helpers:

```typescript
// Get all keys in a namespace
const pattern = RedisKeys.patterns.allInNamespace(RedisNamespaces.CACHE);

// Get all keys for a session
const pattern = RedisKeys.patterns.sessionKeys(sessionId);

// Get all person cache keys
const pattern = RedisKeys.patterns.personCacheKeys();
```

## Important Rules

1. **NEVER** create Redis keys directly with string concatenation
2. **ALWAYS** use the `RedisKeys` helpers or `generateRedisKey` function
3. **ALL** keys must start with the `REDIS_FOLDER_PREFIX`
4. **NEW** namespaces must be added to `RedisNamespaces` const
5. **VALIDATE** keys with `isValidRedisKey()` when processing external keys

## Adding New Key Types

1. Add the namespace to `RedisNamespaces` if needed:
```typescript
export const RedisNamespaces = {
  // ... existing namespaces
  NEW_NAMESPACE: 'new-namespace',
} as const;
```

2. Add a helper function to `RedisKeys`:
```typescript
export const RedisKeys = {
  // ... existing helpers
  newKeyType: (param1: string, param2: string) => 
    generateRedisKey(RedisNamespaces.NEW_NAMESPACE, param1, param2),
};
```

3. Update this documentation with the new key pattern

## Migration

When migrating existing Redis keys:

1. Use the pattern matchers to find old keys
2. Read the data from old keys
3. Write to new keys using the helpers
4. Delete the old keys
5. Update all code references

## Monitoring

To see all keys in our Redis folder:
```bash
redis-cli --scan --pattern "bring-me-home:*"
```

To count keys by namespace:
```bash
redis-cli --scan --pattern "bring-me-home:cache:*" | wc -l
```