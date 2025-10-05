# Phase 3 Testing - Quick Start Guide

## Prerequisites

1. **Start Development Server**
   ```bash
   npm run dev
   ```
   Server must be running on `http://localhost:5000`

2. **Start Redis** (for caching tests)
   ```bash
   redis-server
   ```

3. **Set Environment Variables**
   ```env
   STRIPE_SECRET_KEY=sk_test_...
   STRIPE_WEBHOOK_SECRET=whsec_test_...
   DATABASE_URL=postgresql://...
   REDIS_URL=redis://localhost:6379
   GEMINI_API_KEY=...
   JWT_SECRET=test_secret
   ```

---

## Running Tests

### 1. Integration Tests (27 tests)

Tests all Phase 3 features end-to-end.

```bash
# Run all integration tests
npm test -- phase3-features.integration.test.ts

# Run specific test suite
npm test -- phase3-features.integration.test.ts -t "Stripe Payment Flow"
npm test -- phase3-features.integration.test.ts -t "Onboarding Flow"
npm test -- phase3-features.integration.test.ts -t "Search and Export"
npm test -- phase3-features.integration.test.ts -t "Analytics Tracking"
npm test -- phase3-features.integration.test.ts -t "Search History"

# With coverage
npm test -- phase3-features.integration.test.ts --coverage
```

**Expected Duration:** ~30 seconds

---

### 2. Performance Tests

#### A. Cache Effectiveness Tests
```bash
npm run test:cache
```
**Tests:** Cache hit/miss, TTL, speedup, memory management
**Expected Duration:** ~20 seconds

#### B. Load Testing
```bash
npm run test:load
```
**Tests:** API endpoints under concurrent load
**Expected Duration:** ~45 seconds
**Note:** Requires server running

#### C. Lighthouse Audits
```bash
npm run test:lighthouse
```
**Tests:** Frontend performance, accessibility, SEO
**Expected Duration:** ~2 minutes
**Note:** Requires Chrome/Chromium

#### D. All Performance Tests
```bash
npm run test:performance
```
**Expected Duration:** ~3 minutes

---

### 3. Security Tests (40+ tests)

Tests security measures across all features.

```bash
# Run all security tests
npm test -- phase3-security.test.ts

# Run specific test suite
npm test -- phase3-security.test.ts -t "Stripe Webhook Security"
npm test -- phase3-security.test.ts -t "Rate Limiting"
npm test -- phase3-security.test.ts -t "Input Validation"
npm test -- phase3-security.test.ts -t "Authentication Flows"
npm test -- phase3-security.test.ts -t "Authorization Checks"

# With coverage
npm test -- phase3-security.test.ts --coverage
```

**Expected Duration:** ~40 seconds

---

## Run All Tests

### Sequential Execution
```bash
# Integration tests
npm test -- phase3-features.integration.test.ts

# Performance tests
npm run test:performance

# Security tests
npm test -- phase3-security.test.ts
```

**Total Duration:** ~5 minutes

### With Coverage
```bash
npm run test:coverage
```

---

## Test Results

### Success Criteria

**Integration Tests:**
- ✅ All 27 tests pass
- ✅ No errors or warnings
- ✅ All features functional

**Performance Tests:**
- ✅ Lighthouse scores ≥90
- ✅ Page load times <2s
- ✅ API latency <500ms (cached)
- ✅ Cache hit rate >70%
- ✅ Cache speedup >2x

**Security Tests:**
- ✅ All 40+ tests pass
- ✅ No vulnerabilities detected
- ✅ All security measures functional

---

## Troubleshooting

### Tests Fail to Connect to Server
```bash
# Check if server is running
curl http://localhost:5000/api/health

# Restart server
npm run dev
```

### Redis Connection Errors
```bash
# Check if Redis is running
redis-cli PING

# Start Redis
redis-server

# Clear Redis cache
redis-cli FLUSHDB
```

### Database Errors
```bash
# Run migrations
npm run db:migrate:performance
npm run db:migrate:stripe
npm run db:migrate:analytics
npm run db:migrate:search-history

# Reset test database
npm run db:reset:test
```

### Stripe Mock Issues
Ensure Stripe is mocked in tests. Check that `vi.mock('stripe')` is called before app initialization.

### Lighthouse Fails
```bash
# Install Chrome/Chromium
# Windows: Download from google.com/chrome
# Linux: sudo apt-get install chromium-browser

# Check Chrome path
which chromium-browser
```

### Out of Memory
```bash
# Increase Node memory
NODE_OPTIONS="--max-old-space-size=4096" npm test
```

---

## Test Reports

### Generated Reports

Tests generate JSON reports in:
- `server/__tests__/performance/lighthouse-report-{timestamp}.json`
- `server/__tests__/performance/load-test-report-{timestamp}.json`
- `coverage/` directory for coverage reports

### Viewing Reports

```bash
# View Lighthouse report
npx lighthouse-viewer server/__tests__/performance/lighthouse-report-*.json

# View coverage report
open coverage/index.html

# View load test report
cat server/__tests__/performance/load-test-report-*.json | jq
```

---

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Phase 3 Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:14
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
      
      redis:
        image: redis:7
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run migrations
        run: |
          npm run db:migrate:performance
          npm run db:migrate:stripe
          npm run db:migrate:analytics
          npm run db:migrate:search-history
      
      - name: Run integration tests
        run: npm test -- phase3-features.integration.test.ts
      
      - name: Run security tests
        run: npm test -- phase3-security.test.ts
      
      - name: Run cache tests
        run: npm run test:cache
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
```

---

## Quick Commands Reference

```bash
# Integration tests
npm test -- phase3-features.integration.test.ts

# Performance tests
npm run test:performance

# Security tests
npm test -- phase3-security.test.ts

# All tests with coverage
npm run test:coverage

# Specific test suite
npm test -- phase3-features.integration.test.ts -t "Stripe"

# Watch mode
npm test -- phase3-features.integration.test.ts --watch

# Verbose output
npm test -- phase3-features.integration.test.ts --reporter=verbose
```

---

## Next Steps

After all tests pass:

1. ✅ Review test coverage reports
2. ✅ Address any performance bottlenecks
3. ✅ Fix any security issues
4. ✅ Update documentation if needed
5. ✅ Proceed to deployment

---

**Last Updated:** October 5, 2025
**Status:** Ready for execution
**Support:** See individual test documentation for detailed information
