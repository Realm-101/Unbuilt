# Performance E2E Tests

This directory contains end-to-end tests for performance validation, including:

- **Page load times** - Validates pages load within 3 seconds
- **Core Web Vitals** - Tests LCP, FID, CLS metrics
- **API response times** - Validates API endpoints respond quickly
- **Search completion time** - Tests gap analysis search completes in 2-3 minutes

## Running Performance Tests

```bash
# Run all performance tests
npm run test:e2e -- server/__tests__/e2e/performance

# Run specific test file
npm run test:e2e -- server/__tests__/e2e/performance/load-times.e2e.test.ts

# Run with Lighthouse audits (slower)
npm run test:e2e -- server/__tests__/e2e/performance/core-web-vitals.e2e.test.ts
```

## Performance Thresholds

Based on requirements:

- **Page Load Time**: < 3 seconds
- **LCP (Largest Contentful Paint)**: < 2.5 seconds
- **FID (First Input Delay)**: < 100 milliseconds
- **CLS (Cumulative Layout Shift)**: < 0.1
- **API Auth Response**: < 500 milliseconds
- **Search Completion**: 2-3 minutes

## Test Structure

Each test file focuses on a specific performance aspect:

1. `load-times.e2e.test.ts` - Page load time validation
2. `core-web-vitals.e2e.test.ts` - Core Web Vitals metrics
3. `api-performance.e2e.test.ts` - API response time validation
4. `search-performance.e2e.test.ts` - Search completion time

## Performance Trends

Performance metrics are tracked over time in `server/__tests__/reports/performance-trends.json`. This allows monitoring for performance regressions.

## Notes

- Performance tests may take longer to run than other E2E tests
- Lighthouse audits add significant time but provide comprehensive insights
- Tests run in headless mode for consistent results
- Network throttling can be enabled for mobile performance testing
