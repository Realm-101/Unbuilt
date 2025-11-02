# Phase 2: Critical Security Tests - Starting

## Overview
Phase 2 focuses on fixing and restoring critical security tests including authentication, account lockout, password history, and input validation.

## Current Status Assessment

### ✅ Already Complete
1. **Authentication Integration Tests** (Task 5)
   - File: `server/__tests__/integration/auth.integration.test.ts`
   - Status: 16/16 tests passing
   - No work needed

### 📝 Needs Creation (Tasks 6-8)
The following test files need to be created from scratch:

1. **Account Lockout Tests** (Task 6)
   - File to create: `server/services/__tests__/accountLockout.test.ts`
   - Tests needed: ~15 tests
   - Requirements: 3.1, 3.2, 3.3, 3.6

2. **Password History Tests** (Task 7)
   - File to create: `server/services/__tests__/passwordHistory.test.ts`
   - Tests needed: ~15 tests
   - Requirements: 3.4, 3.5, 3.6

3. **Input Validation Tests** (Task 8)
   - File to create: `server/middleware/__tests__/validation.test.ts`
   - Tests needed: ~84 tests
   - Requirements: 4.1, 4.2, 4.3, 4.4, 4.6

### 🔍 Existing Files to Check
These middleware test files exist and may need fixes:
- `server/__tests__/unit/middleware/httpsEnforcement.test.ts`
- `server/__tests__/unit/middleware/rateLimiting.test.ts`
- `server/__tests__/unit/middleware/securityHeaders.test.ts`
- `server/__tests__/unit/middleware/securityMonitoring.test.ts`

## Phase 2 Strategy

### Approach
Since the test files don't exist, we need to:
1. Check if the actual service/middleware code exists
2. Create comprehensive test files from scratch
3. Follow the established patterns from Phase 1
4. Use the centralized mock infrastructure

### Priority Order
1. **Task 6**: Account Lockout Tests (High Priority - Security Critical)
2. **Task 7**: Password History Tests (High Priority - Security Critical)
3. **Task 8**: Input Validation Tests (High Priority - Security Critical)

## Next Steps

### Step 1: Verify Service Code Exists
Before creating tests, verify these services exist:
- `server/services/accountLockoutService.ts`
- `server/services/passwordHistoryService.ts`
- `server/middleware/validation.ts` or similar

### Step 2: Create Test Files
For each service/middleware:
1. Create test file with proper structure
2. Import centralized mocks and utilities
3. Write comprehensive test cases
4. Follow security testing best practices

### Step 3: Verify Tests Pass
- Run each test file individually
- Fix any issues
- Verify coverage meets targets (>80% for security)

## Test File Template Structure

```typescript
/**
 * Unit Tests for [ServiceName]
 * Tests [description of what's being tested]
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Centralized test utilities
import {
  createMockDb,
  configureMockDbChain,
  resetAllMocks,
} from '../../imports';

// Service being tested
import { ServiceName } from '../../../services/serviceName';

// Mock database module
vi.mock('../../../db', () => ({
  db: {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    // ... other methods as needed
  },
}));

describe('ServiceName', () => {
  let service: ServiceName;

  beforeEach(() => {
    service = new ServiceName();
  });

  afterEach(() => {
    resetAllMocks();
  });

  describe('feature group', () => {
    it('should do something', async () => {
      // Arrange
      const { db } = await import('../../../db');
      configureMockDbChain(db as any, {
        select: { result: [] },
      });

      // Act
      const result = await service.method();

      // Assert
      expect(result).toBeDefined();
    });
  });
});
```

## Success Criteria for Phase 2

- [ ] Account lockout service tests created and passing (~15 tests)
- [ ] Password history service tests created and passing (~15 tests)
- [ ] Input validation middleware tests created and passing (~84 tests)
- [ ] All tests use centralized mock infrastructure
- [ ] Security component coverage >80%
- [ ] No skipped tests (unless documented as intentional)

## Estimated Time
- Task 6 (Account Lockout): 2-3 hours
- Task 7 (Password History): 2-3 hours
- Task 8 (Input Validation): 4-6 hours
- **Total**: 8-12 hours

## Ready to Begin
Phase 2 is ready to start. First task: Verify service code exists and create account lockout tests.
