# Testing Guide

This guide provides comprehensive information about the test infrastructure and best practices for writing tests.

## Table of Contents

1. [Quick Start](#quick-start)
2. [Test Structure](#test-structure)
3. [Running Tests](#running-tests)
4. [Writing Tests](#writing-tests)
5. [Mocking Strategy](#mocking-strategy)
6. [Coverage Goals](#coverage-goals)
7. [Best Practices](#best-practices)
8. [Troubleshooting](#troubleshooting)

## Quick Start

```bash
# Install dependencies
npm install

# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run specific test type
npm run test:unit
npm run test:integration
npm run test:e2e

# Run in watch mode
npm run test:watch
```

## Test Structure

```
server/__tests__/
├── unit/              # Unit tests (isolated, fast)
├── integration/       # Integration tests (API endpoints)
├── e2e/              # End-to-end tests (user workflows)
├── fixtures/         # Test data
├── mocks/            # Mock implementations
├── setup.ts          # Global test setup
└── README.md         # Test documentation
```

### Unit Tests

**Purpose:** Test individual functions/classes in isolation

**Location:** `server/__tests__/unit/`

**Characteristics:**
- Fast execution (<100ms per test)
- Mock all external dependencies
- High coverage of edge cases
- No database or network calls

**Example:**
```typescript
// unit/services/passwordSecurity.test.ts
import { describe, it, expect } from 'vitest';
import { hashPassword, verifyPassword } from '@/services/passwordSecurity';

describe('Password Security', () => {
  it('should hash password correctly', async () => {
    const password = 'Test123!@#';
    const hashed = await hashPassword(password);
    
    expect(hashed).not.toBe(password);
    expect(hashed).toMatch(/^\$2[aby]\$/);
  });
  
  it('should verify correct password', async () => {
    const password = 'Test123!@#';
    const hashed = await hashPassword(password);
    const isValid = await verifyPassword(password, hashed);
    
    expect(isValid).toBe(true);
  });
});
```

### Integration Tests

**Purpose:** Test multiple components working together

**Location:** `server/__tests__/integration/`

**Characteristics:**
- Moderate execution time (100ms-1s per test)
- Test API endpoints with real HTTP requests
- May use test database
- Test service interactions

**Example:**
```typescript
// integration/auth.test.ts
import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '@/index';

describe('Authentication API', () => {
  it('should register new user', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'test@example.com',
        password: 'Test123!@#'
      });
    
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user).toBeDefined();
  });
  
  it('should login with valid credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'test@example.com',
        password: 'Test123!@#'
      });
    
    expect(res.status).toBe(200);
    expect(res.body.accessToken).toBeDefined();
  });
});
```

### E2E Tests

**Purpose:** Test complete user workflows

**Location:** `server/__tests__/e2e/`

**Characteristics:**
- Slower execution (1s+ per test)
- Test complete user journeys
- Use real or test database
- Simulate real user behavior

**Example:**
```typescript
// e2e/user-journey.test.ts
import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '@/index';

describe('User Journey', () => {
  it('should complete full user workflow', async () => {
    // 1. Register
    const registerRes = await request(app)
      .post('/api/auth/register')
      .send({ email: 'user@example.com', password: 'User123!@#' });
    
    expect(registerRes.status).toBe(201);
    
    // 2. Login
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'user@example.com', password: 'User123!@#' });
    
    const token = loginRes.body.accessToken;
    
    // 3. Perform search
    const searchRes = await request(app)
      .post('/api/search')
      .set('Authorization', `Bearer ${token}`)
      .send({ query: 'AI market gaps' });
    
    expect(searchRes.status).toBe(200);
    
    // 4. View results
    const resultsRes = await request(app)
      .get('/api/search/results')
      .set('Authorization', `Bearer ${token}`);
    
    expect(resultsRes.status).toBe(200);
  });
});
```

## Running Tests

### Basic Commands

```bash
# Run all tests
npm test

# Run all tests once (no watch)
npm test -- --run

# Run specific test file
npm test -- auth.test.ts

# Run tests matching pattern
npm test -- --grep "authentication"

# Run with coverage
npm run test:coverage

# Run in UI mode
npm run test:ui
```

### Test Type Commands

```bash
# Run only unit tests
npm run test:unit

# Run only integration tests
npm run test:integration

# Run only e2e tests
npm run test:e2e
```

### Watch Mode

```bash
# Run in watch mode
npm run test:watch

# Watch specific file
npm test -- --watch auth.test.ts
```

### Coverage Reports

```bash
# Generate coverage report
npm run test:coverage

# View HTML coverage report
# Open coverage/index.html in browser
```

## Writing Tests

### Test Structure (AAA Pattern)

```typescript
it('should do something', async () => {
  // Arrange - Set up test data and mocks
  const input = 'test data';
  const mockService = vi.fn().mockResolvedValue('result');
  
  // Act - Execute the code under test
  const result = await functionUnderTest(input, mockService);
  
  // Assert - Verify the result
  expect(result).toBe('expected value');
  expect(mockService).toHaveBeenCalledWith(input);
});
```

### Using Fixtures

```typescript
import { testUsers } from '../fixtures/users';

it('should authenticate valid user', async () => {
  const user = testUsers.freeUser;
  const result = await authenticate(user.email, user.password);
  expect(result.success).toBe(true);
});
```

### Using Mocks

```typescript
import { mockEmailService } from '../mocks/services';
import { mockRequest, mockResponse } from '../mocks/express';

it('should send welcome email', async () => {
  const req = mockRequest({ body: { email: 'test@example.com' } });
  const res = mockResponse();
  
  await sendWelcomeEmail(req, res);
  
  expect(mockEmailService.sendEmail).toHaveBeenCalled();
  expect(res.status).toHaveBeenCalledWith(200);
});
```

### Testing Async Code

```typescript
// Using async/await
it('should handle async operations', async () => {
  const result = await asyncFunction();
  expect(result).toBe('success');
});

// Testing promises
it('should resolve promise', () => {
  return expect(asyncFunction()).resolves.toBe('success');
});

// Testing rejections
it('should reject with error', () => {
  return expect(asyncFunction()).rejects.toThrow('error message');
});
```

### Testing Errors

```typescript
it('should throw error for invalid input', () => {
  expect(() => functionThatThrows()).toThrow('Invalid input');
});

it('should handle async errors', async () => {
  await expect(asyncFunctionThatThrows()).rejects.toThrow('Error message');
});
```

## Mocking Strategy

### Database Mocking

```typescript
import { mockDb, dbScenarios } from '../mocks/database';

beforeEach(() => {
  // User exists scenario
  dbScenarios.userExists();
});

it('should find user by email', async () => {
  const user = await findUserByEmail('test@example.com');
  expect(user).toBeDefined();
});
```

### Service Mocking

```typescript
import { mockEmailService, serviceErrors } from '../mocks/services';

it('should handle email service failure', async () => {
  serviceErrors.emailFailed();
  
  const result = await sendEmail('test@example.com', 'Subject', 'Body');
  expect(result.success).toBe(false);
});
```

### Express Mocking

```typescript
import { mockRequest, mockResponse, mockNext } from '../mocks/express';

it('should call next middleware', async () => {
  const req = mockRequest();
  const res = mockResponse();
  const next = mockNext();
  
  await middleware(req, res, next);
  
  expect(next).toHaveBeenCalled();
});
```

## Coverage Goals

| Component | Target Coverage | Priority |
|-----------|----------------|----------|
| Auth Services | 80% | Critical |
| Middleware | 75% | High |
| API Routes | 70% | High |
| Services | 70% | Medium |
| Utils | 70% | Medium |
| **Overall** | **70%** | - |

### Checking Coverage

```bash
# Generate coverage report
npm run test:coverage

# View summary in terminal
# View detailed report in coverage/index.html
```

### Coverage Thresholds

The project enforces minimum coverage thresholds:
- Lines: 70%
- Functions: 70%
- Branches: 70%
- Statements: 70%

Tests will fail if coverage drops below these thresholds.

## Best Practices

### 1. Test Naming

```typescript
// Good: Descriptive test names
it('should return 401 when token is invalid', () => {});
it('should hash password with bcrypt', () => {});

// Bad: Vague test names
it('works', () => {});
it('test 1', () => {});
```

### 2. Test Isolation

```typescript
// Good: Each test is independent
describe('User Service', () => {
  beforeEach(() => {
    // Reset state before each test
    resetDatabaseMocks();
  });
  
  it('test 1', () => {});
  it('test 2', () => {});
});

// Bad: Tests depend on each other
it('creates user', () => { /* creates user */ });
it('finds user', () => { /* depends on previous test */ });
```

### 3. Mock External Dependencies

```typescript
// Good: Mock external services
import { mockEmailService } from '../mocks/services';

it('should send email', async () => {
  await sendEmail('test@example.com');
  expect(mockEmailService.sendEmail).toHaveBeenCalled();
});

// Bad: Call real external services
it('should send email', async () => {
  await realEmailService.send('test@example.com'); // Slow, unreliable
});
```

### 4. Test Edge Cases

```typescript
describe('Password Validation', () => {
  it('should accept valid password', () => {});
  it('should reject password without uppercase', () => {});
  it('should reject password without lowercase', () => {});
  it('should reject password without numbers', () => {});
  it('should reject password without special chars', () => {});
  it('should reject password that is too short', () => {});
  it('should reject password that is too long', () => {});
});
```

### 5. Keep Tests Simple

```typescript
// Good: Simple, focused test
it('should hash password', async () => {
  const hashed = await hashPassword('Test123!@#');
  expect(hashed).not.toBe('Test123!@#');
});

// Bad: Complex test doing too much
it('should handle user registration flow', async () => {
  // 50 lines of test code...
});
```

### 6. Use Descriptive Assertions

```typescript
// Good: Clear assertion messages
expect(result.status).toBe(200);
expect(result.data.user.email).toBe('test@example.com');

// Bad: Unclear assertions
expect(result).toBeTruthy();
expect(result.data).toBeDefined();
```

### 7. Clean Up After Tests

```typescript
afterEach(() => {
  vi.clearAllMocks();
  vi.restoreAllMocks();
});

afterAll(async () => {
  await cleanupDatabase();
  await closeConnections();
});
```

## Troubleshooting

### Tests Timing Out

**Problem:** Tests hang or timeout

**Solutions:**
- Increase timeout in vitest.config.ts
- Check for unresolved promises
- Ensure async operations complete
- Add timeout to specific test: `it('test', async () => {}, 10000)`

### Database Connection Issues

**Problem:** Cannot connect to test database

**Solutions:**
- Verify DATABASE_URL in .env.test
- Ensure test database exists
- Check database is running
- Use in-memory database for unit tests

### Flaky Tests

**Problem:** Tests pass/fail randomly

**Solutions:**
- Check for race conditions
- Ensure proper cleanup between tests
- Avoid time-dependent tests
- Use deterministic test data
- Mock external services

### Import Errors

**Problem:** Cannot import modules

**Solutions:**
- Check path aliases in vitest.config.ts
- Verify file paths are correct
- Ensure TypeScript compilation works
- Check for circular dependencies

### Mock Not Working

**Problem:** Mocks not being called

**Solutions:**
- Ensure mock is imported before the module using it
- Check mock is properly configured
- Verify mock is not being cleared too early
- Use `vi.spyOn()` for existing functions

### Coverage Not Accurate

**Problem:** Coverage report shows incorrect numbers

**Solutions:**
- Ensure all files are included in coverage config
- Check exclude patterns in vitest.config.ts
- Run `npm run test:coverage` instead of `npm test`
- Clear coverage cache: `rm -rf coverage`

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [Testing Best Practices](https://testingjavascript.com/)
- [AAA Pattern](https://automationpanda.com/2020/07/07/arrange-act-assert-a-pattern-for-writing-good-tests/)
- [Test Doubles](https://martinfowler.com/bliki/TestDouble.html)

## Getting Help

If you encounter issues:

1. Check this guide
2. Review existing tests for examples
3. Check Vitest documentation
4. Ask the team for help

---

**Last Updated:** October 3, 2025  
**Maintained By:** Development Team
