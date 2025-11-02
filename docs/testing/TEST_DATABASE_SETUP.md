# Test Database Setup Guide

This guide explains how to set up and use the test database for running integration and E2E tests.

## Overview

The Unbuilt application has 279 tests that require a database connection. These tests are currently skipped because they need a properly configured test database.

## Quick Start

### 1. Configure Test Database

Edit `.env.test` and set your test database URL:

```bash
# Use a dedicated test database (recommended)
DATABASE_URL=postgresql://user:password@localhost:5432/unbuilt_test

# Or use Neon test database
DATABASE_URL=postgresql://user:password@ep-test-123.us-east-2.aws.neon.tech/unbuilt_test
```

**⚠️ Important:** Always use a separate database for testing. Never point to your production or development database!

### 2. Initialize Test Database

Run the setup script to create all tables:

```bash
npm run test:db:setup
```

This will:
- Verify the DATABASE_URL is configured
- Check that it's a test database (contains "test" or "localhost")
- Run all migrations to create tables
- Prepare the database for testing

### 3. Run Tests

Now you can run tests that require the database:

```bash
# Run all tests (including database tests)
npm test

# Run only integration tests
npm run test:integration

# Run specific test file
npm test server/__tests__/integration/resources.integration.test.ts
```

## Database Management

### Reset Test Database

To clean up and recreate the test database:

```bash
npm run test:db:reset
```

### Cleanup Test Database

To drop all tables:

```bash
npm run test:db:cleanup
```

## Test Database Helpers

The test suite includes helper functions for working with the database:

```typescript
import {
  getTestDb,
  isDatabaseAvailable,
  createTestUser,
  createTestSearch,
  createTestProject,
  cleanupTestUser,
  cleanupTestSearch,
  cleanupTestProject,
} from '../helpers/test-db.js';

// Check if database is available
const dbAvailable = await isDatabaseAvailable();

// Create test data
const user = await createTestUser({ plan: 'pro' });
const search = await createTestSearch(user.id);
const project = await createTestProject(user.id);

// Cleanup after tests
await cleanupTestUser(user.id); // Cleans up all related data
```

## Test Structure

### Unit Tests
- Location: `server/__tests__/unit/`
- No database required
- Fast execution
- Test individual functions and modules

### Integration Tests
- Location: `server/__tests__/integration/`
- **Require database connection**
- Test API endpoints and workflows
- Use real database with test data

### E2E Tests
- Location: `server/__tests__/e2e/`
- **Require database connection**
- Test complete user flows
- Use Playwright for browser automation

## Skipped Tests

The following test files are currently skipped and will be enabled once the database is set up:

### Security Tests (1 file)
- `server/__tests__/security/phase3-security.test.ts`

### Integration Tests (3 files)
- `server/__tests__/integration/phase3-features.integration.test.ts`
- `server/__tests__/integration/resources.integration.test.ts`
- `server/__tests__/integration/ux-features.integration.test.ts`

### Performance Tests (1 file)
- `server/__tests__/performance/cache-effectiveness.test.ts`

## Enabling Skipped Tests

Once the database is set up, you can enable tests by:

1. **Automatic Detection**: Tests will automatically detect if the database is available
2. **Remove `.skip`**: Change `describe.skip` to `describe` in test files
3. **Run Tests**: Execute `npm test` to run all tests

## Database Configuration Options

### Option 1: Local PostgreSQL (Recommended for Development)

Install PostgreSQL locally and create a test database:

```bash
# Create test database
createdb unbuilt_test

# Set in .env.test
DATABASE_URL=postgresql://localhost:5432/unbuilt_test
```

### Option 2: Neon Database (Recommended for CI/CD)

Create a free Neon database for testing:

1. Go to [neon.tech](https://neon.tech)
2. Create a new project named "unbuilt-test"
3. Copy the connection string
4. Add to `.env.test`

### Option 3: Docker PostgreSQL

Run PostgreSQL in Docker:

```bash
docker run -d \
  --name unbuilt-test-db \
  -e POSTGRES_DB=unbuilt_test \
  -e POSTGRES_USER=test \
  -e POSTGRES_PASSWORD=test \
  -p 5432:5432 \
  postgres:14

# Set in .env.test
DATABASE_URL=postgresql://test:test@localhost:5432/unbuilt_test
```

## CI/CD Integration

### GitHub Actions

Add database setup to your workflow:

```yaml
- name: Setup Test Database
  run: npm run test:db:setup
  env:
    DATABASE_URL: ${{ secrets.TEST_DATABASE_URL }}

- name: Run Tests
  run: npm test
```

### Environment Variables

Set these secrets in your CI/CD platform:
- `TEST_DATABASE_URL`: Connection string for test database
- `JWT_SECRET`: Test JWT secret
- `JWT_REFRESH_SECRET`: Test refresh secret

## Troubleshooting

### Database Connection Failed

```
Error: Database connection failed
```

**Solutions:**
1. Verify DATABASE_URL in `.env.test` is correct
2. Check database server is running
3. Verify network connectivity
4. Check database credentials

### Migration Errors

```
Error: relation "users" does not exist
```

**Solutions:**
1. Run `npm run test:db:setup` to create tables
2. Check migrations folder exists
3. Verify database permissions

### Tests Still Skipped

```
⚠️ Test database is not available - database tests will be skipped
```

**Solutions:**
1. Run `npm run test:db:setup`
2. Check `.env.test` has DATABASE_URL
3. Verify database is accessible
4. Check console for specific error messages

### Permission Denied

```
Error: permission denied for table users
```

**Solutions:**
1. Grant proper permissions to database user
2. Use a user with CREATE/DROP privileges for tests
3. Check database role permissions

## Best Practices

### 1. Isolate Test Data

Each test should:
- Create its own test data
- Clean up after itself
- Not depend on other tests

```typescript
let testUserId: number;

beforeEach(async () => {
  const user = await createTestUser();
  testUserId = user.id;
});

afterEach(async () => {
  await cleanupTestUser(testUserId);
});
```

### 2. Use Transactions (Future Enhancement)

For faster tests, wrap each test in a transaction and rollback:

```typescript
beforeEach(async () => {
  await db.execute('BEGIN');
});

afterEach(async () => {
  await db.execute('ROLLBACK');
});
```

### 3. Parallel Test Execution

Tests run in parallel by default. Ensure:
- Each test uses unique data
- No shared state between tests
- Proper cleanup in afterEach

### 4. Database Seeding

For tests that need specific data:

```typescript
beforeAll(async () => {
  // Seed categories
  await db.insert(resourceCategories).values([
    { name: 'Tools', slug: 'tools' },
    { name: 'Guides', slug: 'guides' },
  ]);
});
```

## Performance Tips

### 1. Use In-Memory Database (Future)

For unit tests, consider using an in-memory SQLite database:

```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    environment: 'node',
    setupFiles: ['./server/__tests__/setup-memory-db.ts'],
  },
});
```

### 2. Minimize Database Calls

- Mock external services
- Use test fixtures
- Batch inserts when possible

### 3. Parallel Execution

Run tests in parallel for faster execution:

```bash
npm test -- --reporter=verbose --threads
```

## Monitoring Test Database

### Check Database Size

```sql
SELECT pg_size_pretty(pg_database_size('unbuilt_test'));
```

### List Tables

```sql
\dt
```

### Check Table Sizes

```sql
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

## Support

If you encounter issues:

1. Check this guide for troubleshooting steps
2. Review test logs for specific errors
3. Verify `.env.test` configuration
4. Check database server status
5. Create an issue with error details

## Next Steps

After setting up the test database:

1. ✅ Run `npm run test:db:setup`
2. ✅ Verify tests pass: `npm test`
3. ✅ Enable skipped tests by removing `.skip`
4. ✅ Add new tests as needed
5. ✅ Configure CI/CD with test database

---

**Last Updated:** 2025-01-31
**Status:** Ready for use
