# Test Fix Pattern - Lessons Learned

**Date:** October 29, 2025

## The Problem with vi.mock() Hoisting

`vi.mock()` is hoisted to the top of the file, which means:
1. It runs before any imports or variable declarations
2. You cannot reference variables created after imports
3. The mock is created once and reused across all tests

## ❌ What Doesn't Work

```typescript
// This FAILS because mockDb doesn't exist when vi.mock() runs
import { createMockDb } from '../../imports';
const mockDb = createMockDb();
vi.mock('../../../db', () => ({ db: mockDb })); // ERROR: mockDb not defined
```

## ✅ What Works - Pattern 1: Manual Mock in vi.mock()

```typescript
import { configureMockDbChain } from '../../imports';

// Create mock inline (hoisted, runs first)
vi.mock('../../../db', () => ({
  db: {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
  },
}));

// In each test, get the mocked db and configure it
it('should do something', async () => {
  const { db } = await import('../../../db');
  
  // Now configure the already-mocked db
  configureMockDbChain(db as any, {
    select: {
      result: [mockData],
      multipleResults: [[mockSearch], mockResults],
    },
  });
  
  // Test code...
});
```

## ✅ What Works - Pattern 2: Factory in vi.mock()

```typescript
import { createDatabaseMock } from '../helpers/databaseMock';

// Use factory function (hoisted, runs first)
vi.mock('../../../db', () => ({
  db: createDatabaseMock(),
}));

// In each test, get and configure
it('should do something', async () => {
  const { db } = await import('../../../db');
  
  // Configure the mock
  vi.mocked(db.select).mockReturnValue({
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue([mockData]),
    }),
  });
  
  // Test code...
});
```

## ✅ What Works - Pattern 3: No Database Mock (Best for Simple Tests)

For tests that don't actually use the database:

```typescript
// No vi.mock() needed!
import { createMockUser, createMockSearch } from '../../imports';

describe('MyService', () => {
  it('should process data', () => {
    const user = createMockUser();
    const search = createMockSearch();
    
    // Test logic that doesn't hit database
    const result = service.processData(user, search);
    expect(result).toBeDefined();
  });
});
```

## Recommended Approach for Each Test Type

### Service Tests with Database Queries

**Use Pattern 1** - Manual mock + configureMockDbChain

```typescript
vi.mock('../../../db', () => ({
  db: {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
  },
}));

describe('MyService', () => {
  it('should fetch data', async () => {
    const { db } = await import('../../../db');
    
    configureMockDbChain(db as any, {
      select: {
        result: [mockData],
        chain: ['from', 'where', 'limit'],
      },
    });
    
    const result = await service.getData(1);
    expect(result).toEqual(mockData);
  });
});
```

### Service Tests without Database

**Use Pattern 3** - No mock needed

```typescript
import { createMockUser } from '../../imports';

describe('ValidationService', () => {
  it('should validate input', () => {
    const user = createMockUser();
    const result = service.validate(user.email);
    expect(result.isValid).toBe(true);
  });
});
```

### Integration Tests

**Use real database or test database** - Don't mock

```typescript
import { db } from '../../../db';
import { users } from '@shared/schema';

describe('User Integration', () => {
  beforeEach(async () => {
    // Clean test database
    await db.delete(users);
  });
  
  it('should create user', async () => {
    const result = await db.insert(users).values({
      email: 'test@example.com',
      // ...
    }).returning();
    
    expect(result[0]).toBeDefined();
  });
});
```

## Why configureMockDbChain Doesn't Work Directly

The `configureMockDbChain` function tries to reconfigure an already-mocked object, but:
1. The mock functions are already created by `vi.mock()`
2. We're trying to replace them, but they're already bound
3. The chain methods need to be properly linked

## Solution: Update configureMockDbChain

The function needs to work with already-mocked objects:

```typescript
export function configureMockDbChain(db: any, config: any): void {
  if (config.select) {
    const { result, multipleResults } = config.select;
    
    if (multipleResults) {
      let callIndex = 0;
      
      // Reset and reconfigure
      vi.mocked(db.select).mockReset();
      vi.mocked(db.select).mockImplementation(() => ({
        from: vi.fn().mockImplementation(() => ({
          where: vi.fn().mockImplementation(() => ({
            orderBy: vi.fn().mockImplementation(() => ({
              limit: vi.fn().mockImplementation(() => {
                const currentResult = multipleResults[callIndex] || result;
                callIndex++;
                return Promise.resolve(currentResult);
              }),
            })),
            limit: vi.fn().mockImplementation(() => {
              const currentResult = multipleResults[callIndex] || result;
              callIndex++;
              return Promise.resolve(currentResult);
            }),
          })),
        })),
      }));
    } else {
      // Simple single result
      vi.mocked(db.select).mockReset();
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(result),
        }),
      });
    }
  }
}
```

## Action Items

1. ✅ Document the hoisting issue
2. ⏳ Update `configureMockDbChain` to work with mocked objects
3. ⏳ Update test templates with correct pattern
4. ⏳ Fix remaining service tests using Pattern 1
5. ⏳ Update documentation with correct examples

## Files to Update

1. `server/__tests__/utils/testHelpers.ts` - Fix configureMockDbChain
2. `server/__tests__/templates/unit.test.ts` - Update template
3. `server/__tests__/mocks/README.md` - Update examples
4. All failing service tests - Apply Pattern 1

---

**Key Takeaway:** Always use `vi.mock()` with inline mock definition, then configure in each test by importing the mocked module.
