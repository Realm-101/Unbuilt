# Test Import Audit

**Date:** October 29, 2025  
**Purpose:** Identify and fix import path issues in test files

## Current Import Patterns

### ✅ Good Patterns (Using Centralized Imports)

```typescript
// From imports.ts - RECOMMENDED
import {
  createMockDb,
  createMockUser,
  mockRequest,
  mockResponse,
  mockNext,
  setupTestContext,
  resetAllMocks
} from '../imports';
```

### ⚠️ Problematic Patterns

#### 1. Direct Mock Imports
```typescript
// Should use centralized imports instead
import { mockRequest, mockResponse, mockNext } from '../../mocks/express';
import { mockDb } from '../../mocks/db';
```

**Fix:**
```typescript
import { mockRequest, mockResponse, mockNext, mockDb } from '../../imports';
```

#### 2. Deep Relative Imports
```typescript
// Hard to maintain, breaks when files move
import { TemplateGenerationService } from '../../../services/templateGenerationService';
import { securityLogger } from '../../../services/securityLogger';
```

**Fix:** These are OK for importing the actual service being tested, but mocks should use centralized imports.

#### 3. Manual vi.mock() for Database
```typescript
// Inconsistent mock setup
vi.mock('../../../db', () => ({
  db: {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    // ... manual setup
  },
}));
```

**Fix:**
```typescript
import { createMockDb, configureMockDbChain } from '../../imports';

const db = createMockDb();
configureMockDbChain(db, {
  select: {
    result: [mockData],
    chain: ['from', 'where', 'orderBy', 'limit']
  }
});

// Then mock the module to use our configured db
vi.mock('../../../db', () => ({ db }));
```

## Files Requiring Import Updates

### High Priority (Failing Tests)

1. **server/__tests__/unit/services/templateGeneration.test.ts**
   - Issue: Manual db mock setup
   - Fix: Use createMockDb with configureMockDbChain

2. **server/__tests__/unit/services/resourceRecommendation.test.ts**
   - Issue: Manual db mock setup
   - Fix: Use createMockDb with configureMockDbChain

3. **server/__tests__/unit/services/inputValidator.test.ts**
   - Issue: Manual db mock setup
   - Fix: Use createMockDb with configureMockDbChain

4. **server/__tests__/unit/services/questionGenerator.test.ts**
   - Issue: Manual db mock setup
   - Fix: Use createMockDb with configureMockDbChain

5. **server/__tests__/unit/services/queryDeduplication.test.ts**
   - Issue: Manual db mock setup
   - Fix: Use createMockDb with configureMockDbChain

### Medium Priority (Working but Inconsistent)

6. **server/__tests__/unit/middleware/securityMonitoring.test.ts**
   - Issue: Direct mock imports
   - Fix: Use centralized imports

7. **server/__tests__/unit/middleware/securityHeaders.test.ts**
   - Issue: Direct mock imports
   - Fix: Use centralized imports

8. **server/__tests__/unit/middleware/rateLimiting.test.ts**
   - Issue: Direct mock imports
   - Fix: Use centralized imports

9. **server/__tests__/unit/middleware/httpsEnforcement.test.ts**
   - Issue: Direct mock imports
   - Fix: Use centralized imports

10. **server/__tests__/unit/authorization.test.ts**
    - Issue: Direct mock imports
    - Fix: Use centralized imports

## Import Path Reference

### For Unit Tests in `server/__tests__/unit/`

```typescript
// Centralized imports (RECOMMENDED)
import { ... } from '../imports';

// Fixtures
import { UserFactory } from '../fixtures/user.factory';
import { SearchFactory } from '../fixtures/search.factory';

// Test helpers
import { setupTestContext, createTestUser } from '../utils/testHelpers';
```

### For Integration Tests in `server/__tests__/integration/`

```typescript
// Centralized imports (RECOMMENDED)
import { ... } from '../imports';

// Fixtures
import { UserFactory } from '../fixtures/user.factory';
```

### For E2E Tests in `server/__tests__/e2e/`

```typescript
// Centralized imports (RECOMMENDED)
import { ... } from '../../imports';

// Page Objects
import { LoginPage } from '../../page-objects/login.page';
```

### For Middleware Tests in `server/__tests__/unit/middleware/`

```typescript
// Centralized imports (RECOMMENDED)
import { ... } from '../../imports';
```

### For Service Tests in `server/__tests__/unit/services/`

```typescript
// Centralized imports (RECOMMENDED)
import { ... } from '../../imports';
```

## Migration Strategy

### Phase 1: Update Imports (Current)
1. Update all test files to use centralized imports
2. Remove direct imports from mocks/ directory
3. Ensure consistent import patterns

### Phase 2: Fix Database Mocks
1. Replace manual vi.mock() with createMockDb()
2. Use configureMockDbChain() for complex queries
3. Use multipleResults for sequential calls

### Phase 3: Verify
1. Run tests to ensure imports work
2. Check for any remaining import errors
3. Update documentation

## Standard Import Template

```typescript
/**
 * Unit Tests for [ServiceName]
 * [Description]
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Centralized test utilities
import {
  createMockDb,
  configureMockDbChain,
  createMockUser,
  createMockSearch,
  createMockSearchResult,
  mockRequest,
  mockResponse,
  mockNext,
  resetAllMocks,
  TEST_CONSTANTS,
  HTTP_STATUS
} from '../../imports';

// Service being tested
import { MyService } from '../../../services/myService';

// Types
import type { User } from '@shared/types';

describe('MyService', () => {
  let db: any;
  let service: MyService;

  beforeEach(() => {
    // Create and configure mocks
    db = createMockDb();
    configureMockDbChain(db, {
      select: {
        result: [mockData],
        chain: ['from', 'where']
      }
    });

    // Mock the database module
    vi.mock('../../../db', () => ({ db }));

    // Create service instance
    service = new MyService();
  });

  afterEach(() => {
    resetAllMocks();
  });

  it('should do something', async () => {
    // Test implementation
  });
});
```

## Benefits of Centralized Imports

1. **Consistency** - All tests use the same import patterns
2. **Maintainability** - Update imports in one place
3. **Discoverability** - Easy to find available utilities
4. **Type Safety** - Better IDE autocomplete
5. **Reduced Errors** - Fewer import path mistakes

## Next Steps

1. ✅ Create this audit document
2. ⏳ Update failing test files (Task 2.2)
3. ⏳ Verify imports work correctly
4. ⏳ Update documentation
5. ⏳ Create import guidelines for new tests
