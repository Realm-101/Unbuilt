# Test Mocks Documentation

This directory contains centralized mock implementations for testing. All mocks follow consistent patterns to ensure test reliability and maintainability.

## Mock Factory

The `factory.ts` file provides a centralized factory for creating all test mocks. This ensures consistency across the test suite and makes it easy to update mocking strategies.

### Basic Usage

```typescript
import { mockFactory } from '../mocks/factory';

// Create mocks
const db = mockFactory.createMockDb();
const user = mockFactory.createMockUser();
const req = mockFactory.createMockRequest();
const res = mockFactory.createMockResponse();
const next = mockFactory.createMockNext();

// Clean up after tests
afterEach(() => {
  mockFactory.resetAllMocks();
});
```

### Convenience Functions

For simpler usage, import convenience functions directly:

```typescript
import {
  createMockDb,
  createMockUser,
  createMockRequest,
  createMockResponse,
  createMockNext,
  resetAllMocks
} from '../imports';
```

## Database Mocking

### Simple Database Mock

```typescript
import { createMockDb } from '../imports';

const db = createMockDb();

// Mock will return empty arrays by default
const result = await db.select().from(users).where(eq(users.id, 1));
// result = []
```

### Configured Database Mock

```typescript
import { createMockDb } from '../imports';

const mockUser = { id: 1, email: 'test@example.com', name: 'Test User' };

const db = createMockDb({
  selectResult: [mockUser],
  insertResult: [mockUser],
  updateResult: [mockUser],
  deleteResult: [mockUser],
});

// Now queries return the configured results
const result = await db.select().from(users).where(eq(users.id, 1));
// result = [mockUser]
```

### Advanced Database Mocking

For complex query chains, use `configureMockDbChain`:

```typescript
import { createMockDb, configureMockDbChain } from '../imports';

const db = createMockDb();

configureMockDbChain(db, {
  select: {
    result: [mockUser],
    chain: ['from', 'where', 'orderBy', 'limit']
  }
});

// Supports complex chains
const result = await db.select()
  .from(users)
  .where(eq(users.id, 1))
  .orderBy(users.createdAt)
  .limit(10);
// result = [mockUser]
```

### Multiple Sequential Results

When a service makes multiple database calls, configure different results:

```typescript
import { createMockDb, configureMockDbChain } from '../imports';

const db = createMockDb();

configureMockDbChain(db, {
  select: {
    result: [mockUser], // Default result
    multipleResults: [
      [mockSearch],      // First call returns search
      [mockResults],     // Second call returns results
    ]
  }
});
```

## User Mocking

### Basic User Mock

```typescript
import { createMockUser } from '../imports';

const user = createMockUser();
// Returns user with default values and auto-incremented ID
```

### Custom User Mock

```typescript
import { createMockUser } from '../imports';

const user = createMockUser({
  email: 'custom@example.com',
  plan: 'pro',
  searchCount: 10
});
```

### Multiple Users

```typescript
import { createTestUsers } from '../imports';

const users = await createTestUsers(db, 5, {
  plan: 'free' // Base properties for all users
});
// Returns array of 5 users with unique emails
```

### Admin User

```typescript
import { createTestAdmin } from '../imports';

const admin = await createTestAdmin(db, {
  email: 'admin@example.com'
});
```

## Request/Response Mocking

### Mock Request

```typescript
import { createMockRequest } from '../imports';

const req = createMockRequest({
  body: { email: 'test@example.com' },
  params: { id: '1' },
  query: { page: '1' },
  headers: { authorization: 'Bearer token' },
  method: 'POST',
  url: '/api/users'
});
```

### Mock Response

```typescript
import { createMockResponse } from '../imports';

const res = createMockResponse();

// All methods are chainable
res.status(200).json({ success: true });

// Verify calls
expect(res.status).toHaveBeenCalledWith(200);
expect(res.json).toHaveBeenCalledWith({ success: true });
```

### Mock Next Function

```typescript
import { createMockNext } from '../imports';

const next = createMockNext();

// Call in middleware
middleware(req, res, next);

// Verify it was called
expect(next).toHaveBeenCalled();

// Verify it was called with error
expect(next).toHaveBeenCalledWith(expect.any(Error));
```

## Test Data Factories

### Search Result Mock

```typescript
import { createMockSearchResult } from '../imports';

const result = createMockSearchResult({
  title: 'Custom Gap Title',
  innovationScore: 90,
  feasibility: 'high'
});
```

### Search Mock

```typescript
import { createMockSearch } from '../imports';

const search = createMockSearch({
  query: 'AI-powered fitness app',
  userId: 1,
  status: 'completed'
});
```

### Conversation Mock

```typescript
import { createMockConversation } from '../imports';

const conversation = createMockConversation({
  searchId: 1,
  userId: 1,
  messageCount: 5
});
```

### Resource Mock

```typescript
import { createMockResource } from '../imports';

const resource = createMockResource({
  title: 'Business Plan Template',
  resourceType: 'template',
  isPremium: true
});
```

## Complete Test Example

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  createMockDb,
  createMockUser,
  createMockSearch,
  createMockSearchResult,
  configureMockDbChain,
  resetAllMocks
} from '../imports';
import { MyService } from '../../services/myService';

describe('MyService', () => {
  let db: any;
  let service: MyService;
  let mockUser: any;
  let mockSearch: any;
  let mockResults: any[];

  beforeEach(() => {
    // Create test data
    mockUser = createMockUser({ id: 1 });
    mockSearch = createMockSearch({ id: 1, userId: 1 });
    mockResults = [
      createMockSearchResult({ searchId: 1 }),
      createMockSearchResult({ searchId: 1 })
    ];

    // Create and configure database mock
    db = createMockDb();
    configureMockDbChain(db, {
      select: {
        result: mockResults,
        multipleResults: [
          [mockSearch],   // First query returns search
          mockResults     // Second query returns results
        ]
      }
    });

    // Create service with mocked dependencies
    service = new MyService(db);
  });

  afterEach(() => {
    resetAllMocks();
  });

  it('should process search results', async () => {
    const result = await service.processSearch(1);
    
    expect(result).toBeDefined();
    expect(result.results).toHaveLength(2);
  });
});
```

## Best Practices

### 1. Always Reset Mocks

```typescript
afterEach(() => {
  resetAllMocks();
});
```

### 2. Use Specific Mocks

Create specific mocks for each test rather than reusing global mocks:

```typescript
// ✅ Good
it('should handle user', () => {
  const user = createMockUser({ email: 'test@example.com' });
  // test with user
});

// ❌ Bad
const globalUser = createMockUser();
it('should handle user', () => {
  // test with globalUser - can cause test interdependencies
});
```

### 3. Configure Mocks Close to Usage

```typescript
// ✅ Good
it('should fetch user', async () => {
  const mockUser = createMockUser();
  const db = createMockDb({ selectResult: [mockUser] });
  
  const result = await service.getUser(1);
  expect(result).toEqual(mockUser);
});

// ❌ Bad - configuration far from usage
beforeEach(() => {
  db = createMockDb({ selectResult: [mockUser] });
});
```

### 4. Use Type-Safe Mocks

```typescript
import type { User } from '../../../shared/types';

const user: User = createMockUser();
// TypeScript will ensure user has all required properties
```

### 5. Document Complex Mocks

```typescript
// Mock database to return search on first call, results on second call
configureMockDbChain(db, {
  select: {
    result: [],
    multipleResults: [
      [mockSearch],    // First db.select() call
      mockResults      // Second db.select() call
    ]
  }
});
```

## Troubleshooting

### Mock Not Returning Expected Data

**Problem:** Mock returns `undefined` or empty array

**Solution:** Ensure you've configured the mock with the correct chain:

```typescript
// If your code does: db.select().from(table).where(condition)
configureMockDbChain(db, {
  select: {
    result: [data],
    chain: ['from', 'where']  // Match your query chain
  }
});
```

### Multiple Calls Return Same Data

**Problem:** Service makes multiple queries but mock returns same data

**Solution:** Use `multipleResults`:

```typescript
configureMockDbChain(db, {
  select: {
    result: [defaultData],
    multipleResults: [
      [firstCallData],
      [secondCallData],
      [thirdCallData]
    ]
  }
});
```

### Type Errors with Mocks

**Problem:** TypeScript complains about mock types

**Solution:** Use type assertions or proper typing:

```typescript
import type { MockDatabase } from '../mocks/factory';

const db: MockDatabase = createMockDb();
```

## Related Files

- `factory.ts` - Main mock factory implementation
- `db.ts` - Database mock utilities
- `express.ts` - Express request/response mocks
- `services.ts` - Service layer mocks
- `../utils/testHelpers.ts` - Test helper functions
- `../imports.ts` - Centralized imports for all test utilities
