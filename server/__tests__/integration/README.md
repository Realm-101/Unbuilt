# Integration Tests

## Overview

Integration tests verify that multiple components work together correctly through actual API endpoints. These tests use real HTTP requests via `supertest` and test the full request/response cycle.

## Database Requirements

**IMPORTANT**: Integration tests require a running PostgreSQL database.

### Option 1: Local PostgreSQL (Recommended for Development)

1. Install PostgreSQL locally
2. Create a test database:
   ```sql
   CREATE DATABASE unbuilt_test;
   CREATE USER test WITH PASSWORD 'test';
   GRANT ALL PRIVILEGES ON DATABASE unbuilt_test TO test;
   ```

3. Update `.env.test` if needed:
   ```
   DATABASE_URL=postgresql://test:test@localhost:5432/unbuilt_test
   ```

4. Run migrations:
   ```bash
   npm run db:push
   ```

### Option 2: Use Neon Database Branch (CI/CD)

For CI/CD environments, use Neon's branching feature to create isolated test databases.

### Option 3: Skip Database-Dependent Tests

If no database is available, tests will automatically skip with a warning message.

## Running Integration Tests

```bash
# Run all integration tests
npm run test:integration

# Run specific integration test file
npm test -- server/__tests__/integration/ux-features.integration.test.ts --run

# Run with coverage
npm run test:coverage -- server/__tests__/integration/
```

## Test Structure

### UX Features Integration Tests

Tests user experience features:
- **Onboarding Flow**: User preferences, onboarding completion, tour progress
- **Project Management**: CRUD operations for projects
- **Progress Tracking**: Action plan progress tracking
- **Share Links**: Creating, listing, and managing share links
- **Help System**: Help search and contextual help (TODO)

### Test Pattern

```typescript
describe('Feature Integration Tests', () => {
  let app: Express;
  let authToken: string;
  
  beforeAll(async () => {
    // Setup Express app with routes
    app = express();
    app.use(express.json());
    app.use('/api/feature', featureRouter);
    
    // Create test user and generate JWT
    authToken = jwt.sign({ userId: testUserId }, JWT_SECRET);
  });
  
  afterAll(async () => {
    // Cleanup test data
  });
  
  it('should perform action via API', async () => {
    const response = await request(app)
      .post('/api/feature/action')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ data: 'value' })
      .expect(200);
      
    expect(response.body.success).toBe(true);
  });
});
```

## Best Practices

1. **Use Real HTTP Requests**: Test through `supertest`, not direct function calls
2. **Test Authentication**: Include both authenticated and unauthenticated scenarios
3. **Test Authorization**: Verify users can only access their own resources
4. **Test Validation**: Send invalid data and expect proper error responses
5. **Clean Up**: Always delete test data in `afterAll` hook
6. **Isolation**: Each test should be independent
7. **Realistic Data**: Use realistic test data that matches production patterns

## Common Issues

### Database Connection Errors

If you see `ECONNREFUSED` errors:
- Ensure PostgreSQL is running
- Check DATABASE_URL in `.env.test`
- Verify database exists and user has permissions

### Import Errors

If you see module not found errors:
- Check that path aliases are configured in `vitest.config.ts`
- Use relative imports if path aliases fail
- Ensure `.js` extensions are included for ES modules

### Authentication Failures

If tests fail with 401 errors:
- Verify JWT_SECRET is set in `.env.test`
- Check that JWT token is being generated correctly
- Ensure `jwtAuth` middleware is applied to routes

## Future Improvements

- [ ] Add database seeding for consistent test data
- [ ] Implement test database reset between test suites
- [ ] Add transaction rollback for faster cleanup
- [ ] Create test factories for common entities
- [ ] Add performance benchmarks for API endpoints
