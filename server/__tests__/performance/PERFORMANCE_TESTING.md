# Performance Testing Guide

## Overview

Comprehensive performance testing suite for Phase 3 features including:
- Lighthouse audits for frontend performance
- Load testing for API endpoints
- Cache effectiveness verification
- Page load time measurements

## Prerequisites

### Install Dependencies
```bash
npm install --save-dev lighthouse chrome-launcher autocannon
```

### Start Development Server
```bash
npm run dev
```

Server must be running on `http://localhost:5000` for tests to work.

## Running Tests

### 1. Lighthouse Audits

Tests frontend performance, accessibility, SEO, and best practices.

```bash
# Run Lighthouse audits
npm run test:lighthouse

# Or directly
npx tsx server/__tests__/performance/lighthouse-audit.ts
```

**Pages Tested:**
- Landing Page
- Home/Dashboard
- Search Results
- Pricing Page
- Search History

**Thresholds:**
- Performance Score: ≥90
- Accessibility Score: ≥90
- Best Practices: ≥85
- SEO Score: ≥90
- First Contentful Paint: ≤1.8s
- Largest Contentful Paint: ≤2.5s
- Total Blocking Time: ≤200ms
- Cumulative Layout Shift: ≤0.1
- Speed Index: ≤3s

### 2. Load Testing

Tests API performance under concurrent load.

```bash
# Run load tests
npm run test:load

# Or directly
npx tsx server/__tests__/performance/load-testing.ts
```

**Endpoints Tested:**
- Health Check (100 connections, 10s)
- Search Endpoint (50 connections, 15s)
- Search History (100 connections, 10s)

**Thresholds:**
- Average Latency: ≤500ms
- P95 Latency: ≤2s
- P99 Latency: ≤3s
- Requests/Second: ≥100
- Error Rate: ≤1%

### 3. Cache Effectiveness

Tests caching performance and correctness.

```bash
# Run cache tests
npm test -- cache-effectiveness.test.ts

# With coverage
npm test -- cache-effectiveness.test.ts --coverage
```

**Tests:**
- Cache hit/miss behavior
- Cache TTL and expiration
- Query-specific caching
- Cache invalidation
- Performance improvement metrics
- Memory management
- LRU eviction

### 4. Run All Performance Tests

```bash
npm run test:performance
```

This runs all performance tests in sequence:
1. Cache effectiveness tests
2. Load testing
3. Lighthouse audits

## Performance Targets

### Page Load Times
| Page | Target | Measured |
|------|--------|----------|
| Landing | <2s | TBD |
| Dashboard | <2s | TBD |
| Search Results | <2s | TBD |
| Pricing | <2s | TBD |
| Search History | <2s | TBD |

### API Response Times
| Endpoint | Target | Measured |
|----------|--------|----------|
| Health Check | <50ms | TBD |
| Search (cached) | <100ms | TBD |
| Search (uncached) | <3s | TBD |
| Search History | <200ms | TBD |
| Export | <5s | TBD |

### Cache Performance
| Metric | Target | Measured |
|--------|--------|----------|
| Hit Rate | >70% | TBD |
| Speedup | >2x | TBD |
| Memory Usage | <500MB | TBD |

## Interpreting Results

### Lighthouse Scores

**90-100 (Green):** Excellent performance
**50-89 (Orange):** Needs improvement
**0-49 (Red):** Poor performance

### Load Test Metrics

**Latency:**
- p50: 50% of requests complete within this time
- p95: 95% of requests complete within this time
- p99: 99% of requests complete within this time

**Throughput:**
- Requests per second the server can handle
- Higher is better

**Error Rate:**
- Percentage of failed requests
- Should be <1%

### Cache Effectiveness

**Hit Rate:**
- Percentage of requests served from cache
- Target: >70%

**Speedup:**
- How much faster cached requests are
- Target: >2x improvement

## Troubleshooting

### Lighthouse Fails to Connect

```bash
# Check if server is running
curl http://localhost:5000

# Restart server
npm run dev
```

### Load Tests Timeout

```bash
# Increase timeout in load-testing.ts
duration: 30, // Increase from 10

# Or reduce connections
connections: 25, // Reduce from 100
```

### Cache Tests Fail

```bash
# Clear Redis cache
redis-cli FLUSHDB

# Restart Redis
redis-server

# Check Redis connection
redis-cli PING
```

### Out of Memory

```bash
# Increase Node memory limit
NODE_OPTIONS="--max-old-space-size=4096" npm run test:performance
```

## Optimization Tips

### Frontend Performance

1. **Code Splitting**
   - Lazy load routes
   - Dynamic imports for heavy components
   - Split vendor bundles

2. **Image Optimization**
   - Use WebP format
   - Implement lazy loading
   - Compress images

3. **CSS Optimization**
   - Remove unused CSS
   - Minify stylesheets
   - Use critical CSS

4. **JavaScript Optimization**
   - Minify and compress
   - Remove console.logs
   - Tree shake unused code

### Backend Performance

1. **Database Optimization**
   - Add indexes to frequently queried columns
   - Use connection pooling
   - Optimize query patterns

2. **Caching Strategy**
   - Cache expensive operations
   - Set appropriate TTLs
   - Implement cache warming

3. **API Optimization**
   - Use compression (gzip)
   - Implement rate limiting
   - Optimize payload sizes

4. **Server Configuration**
   - Enable HTTP/2
   - Use CDN for static assets
   - Configure proper headers

## Continuous Monitoring

### Production Monitoring

```bash
# Set up monitoring tools
- New Relic / Datadog for APM
- Sentry for error tracking
- Google Analytics for user metrics
```

### Performance Budgets

Set budgets in `lighthouse-audit.ts`:
```typescript
const PERFORMANCE_THRESHOLDS = {
  performance: 90,
  firstContentfulPaint: 1800,
  largestContentfulPaint: 2500,
  // ... etc
};
```

### Automated Testing

Add to CI/CD pipeline:
```yaml
# .github/workflows/performance.yml
- name: Run Performance Tests
  run: npm run test:performance
```

## Reports

### Generated Reports

All tests generate JSON reports:
- `lighthouse-report-{timestamp}.json`
- `load-test-report-{timestamp}.json`
- Coverage reports in `coverage/`

### Viewing Reports

```bash
# View Lighthouse report
npx lighthouse-viewer lighthouse-report-*.json

# View load test report
cat load-test-report-*.json | jq

# View coverage report
open coverage/index.html
```

## Success Criteria

✅ All Lighthouse scores ≥90
✅ All load tests pass thresholds
✅ Cache hit rate >70%
✅ Cache speedup >2x
✅ No memory leaks
✅ Error rate <1%
✅ Page load times <2s

## Next Steps

After performance testing:
1. Address any performance bottlenecks
2. Optimize slow endpoints
3. Improve cache hit rates
4. Proceed to security review (Task 11.3)

---

**Last Updated:** October 4, 2025
**Test Coverage:** Frontend + Backend + Cache
**Status:** Ready for execution
