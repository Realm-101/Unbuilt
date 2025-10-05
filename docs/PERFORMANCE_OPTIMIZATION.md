# Performance Optimization Guide

This document describes the performance optimizations implemented in Phase 3 of the GapFinder platform.

## Overview

The platform now includes comprehensive performance optimizations across caching, database queries, frontend bundling, and asset loading.

## Redis Caching

### Setup

1. **Install Redis:**
   ```bash
   # Windows (with Chocolatey)
   choco install redis-64
   
   # macOS
   brew install redis
   brew services start redis
   
   # Linux
   sudo apt-get install redis-server
   sudo systemctl start redis
   ```

2. **Configure Environment:**
   ```bash
   # .env
   REDIS_URL=redis://localhost:6379
   ```

3. **Start Application:**
   The cache service connects automatically on startup.

### Usage

The cache service is used automatically for:
- Search results (1-hour TTL)
- User data
- Analytics data
- Rate limiting

### Cache Management

**View Statistics:**
```bash
GET /api/cache/stats
Authorization: Bearer <admin-token>
```

**Clear Cache:**
```bash
POST /api/cache/clear
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "pattern": "gapfinder:search:*"  // Optional: clear specific pattern
}
```

### Cache Namespaces

- `gapfinder:search:*` - Search results
- `gapfinder:user:*` - User data
- `gapfinder:analytics:*` - Analytics data
- `gapfinder:ratelimit:*` - Rate limiting data

## Database Optimization

### Run Migration

```bash
npm run db:migrate:performance
```

This creates indexes on:
- User lookups (email, username)
- Search history queries
- Search results filtering
- Ideas and related data
- Team and collaboration data
- Security events
- Sessions and tokens

### Query Performance Monitoring

The `queryPerformanceMonitor` utility tracks slow queries:

```typescript
import { queryPerformanceMonitor } from '@/utils/queryPerformance';

// Measure a query
const result = await queryPerformanceMonitor.measureQuery(
  'getUserSearches',
  () => db.select().from(searches).where(eq(searches.userId, userId)),
  { userId }
);

// Get statistics
const stats = queryPerformanceMonitor.getStatistics();
console.log(`Slow queries: ${stats.slowQueries}/${stats.totalQueries}`);
```

## Frontend Optimization

### Code Splitting

The application uses:
- **Manual chunks** for vendor libraries
- **Lazy loading** for non-critical routes
- **Suspense boundaries** for loading states

### Bundle Analysis

```bash
npm run build:analyze
```

This generates a bundle analysis report showing:
- Chunk sizes
- Vendor dependencies
- Optimization opportunities

### Lazy Loading Images

Use the `LazyImage` component for images:

```tsx
import { LazyImage } from '@/components/ui/lazy-image';

<LazyImage
  src="/path/to/image.jpg"
  alt="Description"
  placeholderSrc="/path/to/placeholder.jpg"
  className="w-full h-auto"
/>
```

### Image Optimization

```typescript
import { 
  getOptimizedImageUrl,
  compressImage,
  getBestImageFormat 
} from '@/lib/imageOptimization';

// Get optimized URL
const url = getOptimizedImageUrl('/image.jpg', {
  width: 800,
  quality: 80,
  format: 'webp'
});

// Compress before upload
const compressed = await compressImage(file, 1920, 1080, 0.8);

// Detect best format
const format = await getBestImageFormat(); // 'avif' | 'webp' | 'jpeg'
```

## Performance Metrics

### Target Metrics

- Page load time: <2 seconds
- API response (cached): <100ms
- API response (uncached): <3 seconds
- Database queries: <100ms
- Initial bundle size: <500KB

### Monitoring

1. **Cache Hit Rate:**
   - Check `/api/cache/stats` endpoint
   - Target: 60-70% for repeat searches

2. **Query Performance:**
   - Monitor slow query logs
   - Review `queryPerformanceMonitor` statistics

3. **Bundle Size:**
   - Run `npm run build:analyze` regularly
   - Monitor chunk sizes in production

4. **Page Load Times:**
   - Use Lighthouse audits
   - Monitor Core Web Vitals

## Best Practices

### Caching

1. **Cache Invalidation:**
   - Clear cache when data changes
   - Use pattern-based deletion for related data
   - Set appropriate TTLs

2. **Cache Keys:**
   - Use descriptive namespaces
   - Include relevant parameters in keys
   - Keep keys consistent

### Database

1. **Query Optimization:**
   - Use indexes for WHERE clauses
   - Avoid N+1 queries
   - Use EXPLAIN ANALYZE for slow queries

2. **Connection Management:**
   - Use connection pooling
   - Close connections properly
   - Monitor connection count

### Frontend

1. **Code Splitting:**
   - Lazy load non-critical routes
   - Split vendor bundles
   - Use dynamic imports

2. **Image Optimization:**
   - Use lazy loading
   - Serve responsive images
   - Compress before upload
   - Use modern formats (WebP, AVIF)

## Troubleshooting

### Redis Connection Issues

**Problem:** Cache service unavailable

**Solution:**
1. Check Redis is running: `redis-cli ping`
2. Verify REDIS_URL in .env
3. Check firewall settings
4. Review logs for connection errors

### Slow Queries

**Problem:** Database queries taking >100ms

**Solution:**
1. Run performance migration
2. Check query execution plans
3. Add missing indexes
4. Optimize query structure

### Large Bundle Size

**Problem:** Initial bundle >500KB

**Solution:**
1. Run bundle analysis
2. Review vendor dependencies
3. Add more lazy loading
4. Remove unused dependencies

### Cache Memory Issues

**Problem:** Redis using too much memory

**Solution:**
1. Review TTL settings
2. Clear old cache entries
3. Implement cache size limits
4. Use Redis eviction policies

## Production Deployment

### Checklist

- [ ] Redis instance configured
- [ ] REDIS_URL environment variable set
- [ ] Database migration run
- [ ] Bundle optimized and analyzed
- [ ] Cache monitoring enabled
- [ ] Performance metrics tracked
- [ ] Backup strategy for Redis (optional)

### Scaling

For high-traffic scenarios:

1. **Redis Cluster:**
   - Use Redis Cluster for distributed caching
   - Configure multiple Redis nodes
   - Implement consistent hashing

2. **Database Read Replicas:**
   - Set up read replicas for queries
   - Route reads to replicas
   - Keep writes on primary

3. **CDN Integration:**
   - Serve static assets from CDN
   - Cache API responses at edge
   - Use geographic distribution

## Further Reading

- [Redis Best Practices](https://redis.io/docs/manual/patterns/)
- [PostgreSQL Performance Tips](https://wiki.postgresql.org/wiki/Performance_Optimization)
- [Vite Build Optimization](https://vitejs.dev/guide/build.html)
- [Web Performance Optimization](https://web.dev/performance/)

---

**Last Updated:** October 4, 2025  
**Version:** 1.0
