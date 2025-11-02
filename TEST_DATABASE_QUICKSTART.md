# Test Database Quick Start

**Enable 279 skipped tests in 3 steps!**

## Step 1: Configure Test Database

Edit `.env.test` and add your test database URL:

```bash
# Option A: Local PostgreSQL (recommended for development)
DATABASE_URL=postgresql://localhost:5432/unbuilt_test

# Option B: Neon Database (recommended for CI/CD)
DATABASE_URL=postgresql://user:pass@ep-test-123.us-east-2.aws.neon.tech/unbuilt_test

# Option C: Docker PostgreSQL
DATABASE_URL=postgresql://test:test@localhost:5432/unbuilt_test
```

**⚠️ Important:** Use a dedicated test database, never your production database!

## Step 2: Initialize Database

Run the setup command:

```bash
npm run test:db:setup
```

You should see:

```
🔧 Setting up test database...
📦 Running migrations...
✅ Test database setup complete!
```

## Step 3: Run Tests

```bash
# Run all tests (including 279 database tests)
npm test

# Run only integration tests
npm run test:integration

# Run specific test file
npm test server/__tests__/integration/resources.integration.test.ts
```

## That's It!

Your test database is ready. The 279 previously skipped tests will now run.

## Need Help?

### Local PostgreSQL Setup

```bash
# macOS
brew install postgresql
brew services start postgresql
createdb unbuilt_test

# Ubuntu/Debian
sudo apt install postgresql
sudo systemctl start postgresql
sudo -u postgres createdb unbuilt_test
```

### Docker PostgreSQL Setup

```bash
docker run -d \
  --name unbuilt-test-db \
  -e POSTGRES_DB=unbuilt_test \
  -e POSTGRES_USER=test \
  -e POSTGRES_PASSWORD=test \
  -p 5432:5432 \
  postgres:14
```

### Neon Database Setup

1. Go to [neon.tech](https://neon.tech) (free tier available)
2. Create new project: "unbuilt-test"
3. Copy connection string
4. Paste into `.env.test`

## Useful Commands

```bash
# Reset database (clean and reinitialize)
npm run test:db:reset

# Clean up database (drop all tables)
npm run test:db:cleanup

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch
```

## Troubleshooting

### "Database connection failed"

1. Check DATABASE_URL in `.env.test`
2. Verify database server is running
3. Test connection: `psql $DATABASE_URL`

### "relation does not exist"

Run the setup command:

```bash
npm run test:db:setup
```

### Tests still skipped

The tests will automatically detect the database. If they're still skipped:

1. Verify setup completed successfully
2. Check console for error messages
3. Try resetting: `npm run test:db:reset`

## More Information

- **Full Guide:** `docs/testing/TEST_DATABASE_SETUP.md`
- **Implementation Details:** `docs/progress-reports/test-improvements/TEST_DATABASE_IMPLEMENTATION.md`
- **Test Helpers:** `server/__tests__/helpers/test-db.ts`

---

**Questions?** Check the full documentation or create an issue.
