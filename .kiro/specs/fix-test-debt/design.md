# Design Document - Fix Test Debt

## Overview

This design outlines the approach to fix the 550+ skipped tests and achieve genuine test coverage. The strategy focuses on fixing the root causes (test infrastructure issues) first, then systematically un-skipping and fixing tests in priority order.

## Architecture

### Test Infrastructure Layers

```
┌─────────────────────────────────────────────────────────┐
│                    Test Files                            │
│  (Integration, Unit, E2E tests)                         │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│                  Test Utilities                          │
│  (Helpers, Fixtures, Factories)                         │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│                   Mock Layer                             │
│  (Database, Services, External APIs)                    │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│                Test Configuration                        │
│  (Vitest setup, Environment, Global mocks)              │
└─────────────────────────────────────────────────────────┘
```

### Current Problems and Solutions

#### Problem 1: Import Path Errors
**Current State:**
```typescript
// Fails because path doesn't exist or circular dependency
import { db } from '../../db/index.js';
import { users } from '../../db/schema.js';
```

**Solution:**
```typescript
// Use centralized mocks
import { mockDb } from '../mocks/db';
import { mockUsers } from '../fixtures/users';
```

#### Problem 2: Inconsistent Mocking
**Current State:**
- Some tests use vi.mock()
- Some tests use manual mocks
- Some tests try to use real database
- No consistent pattern

**Solution:**
- Create centralized mock factory
- Use consistent mocking strategy across all tests
- Document mock patterns clearly
- Provide mock templates

#### Problem 3: Missing Test Setup
**Current State:**
- Tests assume database is available
- Tests don't clean up after themselves
- Tests have interdependencies

**Solution:**
- Proper beforeAll/afterAll hooks
- Test isolation
- Clean state between tests
- Shared setup utilities

## Components and Interfaces

### 1. Enhanced Mock Factory

```typescript
// server/__tests__/mocks/factory.ts

export interface MockFactory {
  createMockDb(): MockDatabase;
  createMockUser(overrides?: Partial<User>): User;
  createMockRequest(overrides?: Partial<Request>): Request;
  createMockResponse(): Response;
  resetAllMocks(): void;
}

export class TestMockFactory implements MockFactory {
  private mocks: Map<string, any> = new Map();

  createMockDb(): MockDatabase {
    const mockDb = {
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      returning: vi.fn().mockResolvedValue([]),
    };
    
    this.mocks.set('db', mockDb);
    return mockDb;
  }

  resetAllMocks(): void {
    this.mocks.forEach(mock => {
      if (mock.mockReset) mock.mockReset();
    });
    this.mocks.clear();
  }
}
```

### 2. Test Database Strategy

**Option A: In-Memory SQLite (Recommended)**
```typescript
// server/__tests__/setup/database.ts

import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';

export function createTestDatabase() {
  const sqlite = new Database(':memory:');
  const db = drizzle(sqlite);
  
  // Run migrations
  runMigrations(db);
  
  return {
    db,
    cleanup: () => sqlite.close()
  };
}
```

**Option B: Mock Database (Current Approach)**
```typescript
// Continue using mocks but fix the implementation
export const mockDb = createMockDb();
```

### 3. Test Utilities

```typescript
// server/__tests__/utils/testHelpers.ts

export interface TestContext {
  db: MockDatabase;
  user: User;
  token: string;
  cleanup: () => Promise<void>;
}

export async function setupTestContext(): Promise<TestContext> {
  const db = createMockDb();
  const user = await createTestUser(db);
  const token = await generateTestToken(user);
  
  return {
    db,
    user,
    token,
    cleanup: async () => {
      await cleanupTestData(db);
      resetAllMocks();
    }
  };
}

export async function createTestUser(
  db: MockDatabase,
  overrides?: Partial<User>
): Promise<User> {
  const defaultUser = {
    id: 1,
    email: `test-${Date.now()}@example.com`,
    username: `testuser-${Date.now()}`,
    role: 'USER' as const,
    ...overrides
  };
  
  // Mock the database insert
  db.insert.mockResolvedValueOnce([defaultUser]);
  
  return defaultUser;
}
```

### 4. Integration Test Template

```typescript
// server/__tests__/integration/template.integration.test.ts

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { setupTestContext, type TestContext } from '../utils/testHelpers';
import { createTestApp } from '../utils/testApp';

describe('Feature Integration Tests', () => {
  let context: TestContext;
  let app: Express.Application;

  beforeAll(async () => {
    context = await setupTestContext();
    app = createTestApp(context.db);
  });

  afterAll(async () => {
    await context.cleanup();
  });

  describe('Feature Workflow', () => {
    it('should complete workflow successfully', async () => {
      const response = await request(app)
        .post('/api/endpoint')
        .set('Authorization', `Bearer ${context.token}`)
        .send({ data: 'test' });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
    });
  });
});
```

## Data Models

### Test Fixtures

```typescript
// server/__tests__/fixtures/users.ts

export const testUsers = {
  regularUser: {
    id: 1,
    email: 'user@example.com',
    username: 'regularuser',
    role: 'USER' as const,
    isDemo: false,
  },
  
  adminUser: {
    id: 2,
    email: 'admin@example.com',
    username: 'adminuser',
    role: 'ADMIN' as const,
    isDemo: false,
  },
  
  demoUser: {
    id: 3,
    email: 'demo@example.com',
    username: 'demouser',
    role: 'USER' as const,
    isDemo: true,
  }
};

export const testPasswords = {
  valid: 'ValidPassword123!',
  weak: 'weak',
  common: 'password123',
};
```

### Mock Responses

```typescript
// server/__tests__/fixtures/responses.ts

export const mockAuthResponses = {
  successfulLogin: {
    accessToken: 'mock-access-token',
    refreshToken: 'mock-refresh-token',
    user: testUsers.regularUser,
  },
  
  invalidCredentials: {
    error: 'Invalid credentials',
    code: 'AUTH_FAILED',
  },
  
  accountLocked: {
    error: 'Account is locked',
    code: 'ACCOUNT_LOCKED',
    unlockAt: new Date(Date.now() + 3600000).toISOString(),
  },
};
```

## Error Handling

### Test Error Categories

1. **Setup Errors** - Problems initializing test environment
2. **Mock Errors** - Issues with mock configuration
3. **Assertion Errors** - Test expectations not met
4. **Cleanup Errors** - Problems tearing down test environment

### Error Handling Strategy

```typescript
// server/__tests__/utils/errorHandling.ts

export class TestSetupError extends Error {
  constructor(message: string, public cause?: Error) {
    super(message);
    this.name = 'TestSetupError';
  }
}

export async function safeSetup<T>(
  setupFn: () => Promise<T>,
  errorMessage: string
): Promise<T> {
  try {
    return await setupFn();
  } catch (error) {
    throw new TestSetupError(
      `${errorMessage}: ${error.message}`,
      error
    );
  }
}

export async function safeCleanup(
  cleanupFn: () => Promise<void>,
  onError?: (error: Error) => void
): Promise<void> {
  try {
    await cleanupFn();
  } catch (error) {
    console.error('Cleanup error:', error);
    onError?.(error);
    // Don't throw - cleanup errors shouldn't fail tests
  }
}
```

## Testing Strategy

### Phase 1: Infrastructure (Days 1-2)

**Goal:** Fix the foundation so tests can run

1. **Fix Mock Factory**
   - Create centralized mock factory
   - Implement consistent mocking patterns
   - Add mock reset functionality

2. **Fix Import Paths**
   - Update all imports to use mocks
   - Remove direct database imports
   - Fix circular dependencies

3. **Create Test Utilities**
   - Setup helpers
   - Cleanup helpers
   - Test data factories

4. **Verify Foundation**
   - Run one simple test successfully
   - Verify mocks work correctly
   - Verify cleanup works

### Phase 2: Critical Security Tests (Days 2-4)

**Goal:** Un-skip and fix security-critical tests

**Priority Order:**
1. Authentication integration tests (21 tests)
2. Account lockout tests (15 tests)
3. Password history tests (15 tests)
4. Input validation tests (84 tests)

**Approach for Each:**
1. Un-skip the test file
2. Run tests and identify failures
3. Fix import errors
4. Fix mock setup
5. Fix assertions
6. Verify all tests pass
7. Move to next file

### Phase 3: Service Layer Tests (Days 4-5)

**Goal:** Un-skip and fix service tests

**Priority Order:**
1. JWT service tests (28 tests)
2. Session manager tests (14 tests)
3. Security logger tests (15 tests)
4. CAPTCHA service tests (19 tests)

### Phase 4: Integration Tests (Days 5-6)

**Goal:** Un-skip and fix integration tests

**Priority Order:**
1. Application integration tests (restore and fix)
2. Error handling integration tests (8 tests)
3. Rate limiting integration tests (19 tests)
4. Validation integration tests (24 tests)
5. Security monitoring integration tests (17 tests)

### Phase 5: Middleware Tests (Days 6-7)

**Goal:** Un-skip and fix middleware tests

**Priority Order:**
1. HTTPS enforcement tests (45 tests)
2. Rate limiting tests (18 tests)
3. Security headers tests (23 tests)
4. Security monitoring tests (29 tests)
5. Input validation tests (84 tests)
6. SQL injection prevention tests (47 tests)

### Phase 6: Verification (Day 7)

**Goal:** Verify everything works

1. Run full test suite
2. Verify coverage metrics
3. Check for flaky tests
4. Update documentation
5. Create summary report

## Test Patterns

### Pattern 1: Unit Test with Mocks

```typescript
describe('ServiceName', () => {
  let service: ServiceName;
  let mockDb: MockDatabase;

  beforeEach(() => {
    mockDb = createMockDb();
    service = new ServiceName(mockDb);
  });

  afterEach(() => {
    resetAllMocks();
  });

  it('should perform operation', async () => {
    // Arrange
    mockDb.select.mockResolvedValue([testData]);
    
    // Act
    const result = await service.operation();
    
    // Assert
    expect(result).toEqual(expectedResult);
    expect(mockDb.select).toHaveBeenCalledWith(expectedParams);
  });
});
```

### Pattern 2: Integration Test

```typescript
describe('Feature Integration', () => {
  let context: TestContext;
  let app: Express.Application;

  beforeAll(async () => {
    context = await setupTestContext();
    app = createTestApp(context.db);
  });

  afterAll(async () => {
    await context.cleanup();
  });

  it('should complete workflow', async () => {
    // Step 1: Setup
    const user = await createTestUser(context.db);
    
    // Step 2: Execute
    const response = await request(app)
      .post('/api/endpoint')
      .set('Authorization', `Bearer ${context.token}`)
      .send({ data: 'test' });
    
    // Step 3: Verify
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject(expectedShape);
  });
});
```

### Pattern 3: Security Test

```typescript
describe('Security Feature', () => {
  it('should prevent unauthorized access', async () => {
    const response = await request(app)
      .get('/api/protected')
      .expect(401);
    
    expect(response.body).toHaveProperty('error');
  });

  it('should prevent malicious input', async () => {
    const maliciousInput = "'; DROP TABLE users; --";
    
    const response = await request(app)
      .post('/api/endpoint')
      .send({ input: maliciousInput })
      .expect(400);
    
    expect(response.body.error).toContain('Invalid input');
  });
});
```

## Performance Considerations

### Test Speed Optimization

1. **Parallel Execution**
   - Run independent tests in parallel
   - Use Vitest's built-in parallelization
   - Isolate test data to prevent conflicts

2. **Mock Performance**
   - Use lightweight mocks
   - Avoid unnecessary mock complexity
   - Reset mocks efficiently

3. **Setup/Teardown**
   - Share setup where possible (beforeAll vs beforeEach)
   - Minimize database operations
   - Use in-memory database for speed

### Target Metrics

- Full test suite: <5 minutes
- Unit tests: <30 seconds
- Integration tests: <2 minutes
- Individual test: <100ms average

## Documentation Updates

### Files to Create/Update

1. **TEST_INFRASTRUCTURE.md**
   - Mock factory usage
   - Test utilities guide
   - Common patterns

2. **TESTING_GUIDE.md** (update)
   - Add new patterns
   - Update examples
   - Add troubleshooting

3. **MOCK_PATTERNS.md** (new)
   - Database mocking
   - Service mocking
   - Request/Response mocking

4. **TEST_CHECKLIST.md** (new)
   - Pre-commit test checklist
   - Test writing checklist
   - Test review checklist

## Success Metrics

### Quantitative Metrics

- Test pass rate: 100% (no skipped tests)
- Test coverage: >70% overall, >80% security
- Test speed: <5 minutes for full suite
- Flaky test rate: <1%

### Qualitative Metrics

- Developers can write tests without confusion
- Tests catch real bugs before production
- CI/CD pipeline is reliable
- Team has confidence in test suite

## Risks and Mitigations

### Risk: Tests reveal critical bugs
**Impact:** High
**Probability:** Medium
**Mitigation:** Fix bugs as discovered, prioritize security issues

### Risk: Infrastructure changes break existing tests
**Impact:** Medium
**Probability:** Low
**Mitigation:** Fix incrementally, verify each batch

### Risk: Time estimates too optimistic
**Impact:** Medium
**Probability:** Medium
**Mitigation:** Prioritize critical tests, defer less important ones

### Risk: Mocking strategy doesn't work for all cases
**Impact:** Low
**Probability:** Low
**Mitigation:** Document exceptions, create alternative patterns

## Next Steps

After design approval:
1. Create detailed task list
2. Set up test infrastructure improvements
3. Begin Phase 1: Infrastructure fixes
4. Proceed through phases systematically
5. Verify and document results
