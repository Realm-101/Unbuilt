# Performance Optimization Plan

## 1. Database Query Optimization

### Add Connection Pooling
```typescript
// server/db.ts - Improve connection management
import { Pool } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';

const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  max: 20, // Maximum connections
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

export const db = drizzle({ client: pool, schema });
```

### Optimize Common Queries
```typescript
// server/storage.ts - Add efficient queries
export class DatabaseStorage implements IStorage {
  // Batch fetch search results with single query
  async getSearchResultsWithDetails(searchId: number) {
    return await db
      .select({
        result: searchResults,
        search: searches
      })
      .from(searchResults)
      .innerJoin(searches, eq(searchResults.searchId, searches.id))
      .where(eq(searchResults.searchId, searchId));
  }

  // Paginated user searches
  async getUserSearchesPaginated(userId: string, page: number = 1, limit: number = 10) {
    const offset = (page - 1) * limit;
    
    return await db
      .select()
      .from(searches)
      .where(eq(searches.userId, userId))
      .orderBy(desc(searches.timestamp))
      .limit(limit)
      .offset(offset);
  }
}
```

## 2. Caching Layer Implementation

### Redis Caching for AI Results
```typescript
// server/cache/redisCache.ts
import Redis from 'ioredis';

class CacheService {
  private redis: Redis | null = null;

  constructor() {
    if (process.env.REDIS_URL) {
      this.redis = new Redis(process.env.REDIS_URL);
    }
  }

  async get<T>(key: string): Promise<T | null> {
    if (!this.redis) return null;
    
    try {
      const cached = await this.redis.get(key);
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  }

  async set(key: string, value: any, ttlSeconds: number = 3600): Promise<void> {
    if (!this.redis) return;
    
    try {
      await this.redis.setex(key, ttlSeconds, JSON.stringify(value));
    } catch (error) {
      console.warn('Cache set failed:', error);
    }
  }

  generateKey(prefix: string, ...parts: string[]): string {
    return `${prefix}:${parts.join(':')}`;
  }
}

export const cache = new CacheService();
```

### Cache AI Analysis Results
```typescript
// server/services/gemini.ts - Add caching
export async function analyzeGaps(query: string): Promise<GapAnalysis[]> {
  const cacheKey = cache.generateKey('gaps', query.toLowerCase().trim());
  
  // Try cache first
  const cached = await cache.get<GapAnalysis[]>(cacheKey);
  if (cached) {
    console.log('🎯 Cache hit for gap analysis');
    return cached;
  }

  // Generate new analysis
  const gaps = await generateGapAnalysis(query);
  
  // Cache for 1 hour
  await cache.set(cacheKey, gaps, 3600);
  
  return gaps;
}
```

## 3. Frontend Performance

### Implement React Query Optimizations
```typescript
// client/src/lib/queryClient.ts - Optimize caching
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes
      retry: (failureCount, error: any) => {
        if (error?.status === 404) return false;
        return failureCount < 3;
      },
    },
  },
});
```

### Lazy Loading and Code Splitting
```typescript
// client/src/App.tsx - Add lazy loading
import { lazy, Suspense } from 'react';

const SearchResults = lazy(() => import('./pages/search-results'));
const ValidateIdea = lazy(() => import('./pages/validate-idea'));
const Analytics = lazy(() => import('./pages/analytics-dashboard'));

function App() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <Routes>
        <Route path="/results/:id" element={<SearchResults />} />
        <Route path="/validate" element={<ValidateIdea />} />
        <Route path="/analytics" element={<Analytics />} />
      </Routes>
    </Suspense>
  );
}
```

## 4. API Rate Limiting

### Implement Rate Limiting Middleware
```typescript
// server/middleware/rateLimiter.ts
import rateLimit from 'express-rate-limit';

export const searchRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: (req) => {
    const user = (req as any).user;
    return user?.plan === 'pro' ? 100 : 10; // Pro users get more requests
  },
  message: {
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests. Please upgrade to Pro for higher limits.'
    }
  },
  standardHeaders: true,
  legacyHeaders: false,
});

export const generalRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000, // General API limit
});
```