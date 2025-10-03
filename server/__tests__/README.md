# Test Directory Structure

This directory contains all tests for the server-side code, organized by test type.

## Directory Structure

```
server/__tests__/
├── unit/           # Unit tests for individual functions/classes
├── integration/    # Integration tests for API endpoints and services
├── e2e/           # End-to-end tests for complete user flows
├── fixtures/      # Test data and fixtures
├── mocks/         # Mock implementations for testing
└── setup.ts       # Global test setup and configuration
```

## Test Types

### Unit Tests (`unit/`)
- Test individual functions, classes, or modules in isolation
- Mock all external dependencies
- Fast execution (<100ms per test)
- High coverage of edge cases

**Example:**
```typescript
// unit/services/passwordSecurity.test.ts
describe('PasswordSecurity', () => {
  it('should hash password correctly', async () => {
    const hashed = await hashPassword('Test123!@#');
    expect(hashed).not.toBe('Test123!@#');
  });
});
```

### Integration Tests (`integration/`)
- Test multiple components working together
- May use real database or test database
- Test API endpoints with real HTTP requests
- Moderate execution time (100ms-1s per test)

**Example:**
```typescript
// integration/auth.test.ts
describe('Authentication Flow', () => {
  it('should complete full registration and login', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'test@example.com', password: 'Test123!@#' });
    expect(res.status).toBe(201);
  });
});
```

### E2E Tests (`e2e/`)
- Test complete user workflows from start to finish
- Use real or test database
- Simulate real user interactions
- Slower execution (1s+ per test)

**Example:**
```typescript
// e2e/user-journey.test.ts
describe('User Journey', () => {
  it('should allow user to register, login, and perform search', async () => {
    // Register -> Login -> Search -> View Results
  });
});
```

## Running Tests

```bash
# Run all tests
npm test

# Run specific test type
npm test -- unit/
npm test -- integration/
npm test -- e2e/

# Run with coverage
npm test -- --coverage

# Run in watch mode
npm test -- --watch

# Run specific test file
npm test -- auth.test.ts
```

## Test Conventions

1. **File Naming:**
   - Unit tests: `*.test.ts`
   - Integration tests: `*.integration.test.ts`
   - E2E tests: `*.e2e.test.ts`

2. **Test Structure (AAA Pattern):**
   ```typescript
   it('should do something', async () => {
     // Arrange - Set up test data
     const input = 'test';
     
     // Act - Execute the code
     const result = await functionUnderTest(input);
     
     // Assert - Verify the result
     expect(result).toBe('expected');
   });
   ```

3. **Test Isolation:**
   - Each test should be independent
   - Clean up after each test
   - Use beforeEach/afterEach for setup/teardown

4. **Mocking:**
   - Mock external services (APIs, databases)
   - Use fixtures for test data
   - Keep mocks simple and focused

## Coverage Goals

| Component | Target Coverage |
|-----------|----------------|
| Auth Services | 80% |
| Middleware | 75% |
| API Routes | 70% |
| Services | 70% |
| **Overall** | **70%** |

## Best Practices

1. **Write tests first** (TDD) when possible
2. **Test behavior, not implementation**
3. **Keep tests simple and readable**
4. **Use descriptive test names**
5. **Avoid test interdependencies**
6. **Mock external dependencies**
7. **Test edge cases and error conditions**
8. **Keep tests fast**
9. **Use fixtures for complex test data**
10. **Clean up resources after tests**

## Troubleshooting

### Tests timing out
- Increase timeout in vitest.config.ts
- Check for unresolved promises
- Ensure async operations complete

### Database connection issues
- Verify test database is running
- Check connection string in .env.test
- Ensure migrations are run

### Flaky tests
- Check for race conditions
- Ensure proper cleanup
- Avoid time-dependent tests
- Use deterministic test data

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [Testing Best Practices](https://testingjavascript.com/)
- [AAA Pattern](https://automationpanda.com/2020/07/07/arrange-act-assert-a-pattern-for-writing-good-tests/)
