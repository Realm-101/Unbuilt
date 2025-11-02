# Phase 2 Execution Plan: Critical Security Tests

## Status: READY TO EXECUTE ✅

All required service and middleware code exists. We can now create comprehensive test files.

## Verified Code Exists

### Services ✅
- `server/services/accountLockout.ts` - Account lockout functionality
- `server/services/passwordHistory.ts` - Password history tracking
- `server/services/passwordSecurity.ts` - Password validation

### Middleware ✅
- `server/middleware/validation.ts` - Input validation
- `server/middleware/inputSanitization.ts` - Input sanitization
- `server/middleware/queryValidation.ts` - Query validation

## Task Breakdown

### Task 6: Account Lockout Tests (Priority 1)
**File to create**: `server/services/__tests__/accountLockout.test.ts`

**Test Coverage Needed**:
1. **Lockout Trigger Tests** (5 tests)
   - Account locks after configured failed attempts
   - Lockout counter increments correctly
   - Lockout timestamp is set
   - Failed attempt tracking works
   - Lockout applies to correct user

2. **Unlock Tests** (5 tests)
   - Automatic unlock after duration expires
   - Manual unlock by admin
   - Unlock resets attempt counter
   - Unlock clears lockout timestamp
   - Unlock notifications sent

3. **Lockout Policy Tests** (5 tests)
   - Configurable attempt limits respected
   - Configurable lockout duration respected
   - Different policies for different user types
   - Lockout bypass for admin accounts
   - Lockout status check works

**Requirements**: 3.1, 3.2, 3.3, 3.6  
**Estimated Time**: 2-3 hours  
**Target**: 15+ tests passing

---

### Task 7: Password History Tests (Priority 2)
**File to create**: `server/services/__tests__/passwordHistory.test.ts`

**Test Coverage Needed**:
1. **Password Reuse Prevention Tests** (5 tests)
   - Detects password reuse correctly
   - Compares against configured history length
   - Hashes passwords before comparison
   - Rejects recently used passwords
   - Allows passwords outside history window

2. **Password History Management Tests** (5 tests)
   - Stores password history correctly
   - Maintains configured history length
   - Removes old passwords when limit reached
   - Retrieves history for user
   - Handles missing history gracefully

3. **Password Change Tests** (5 tests)
   - Adds new password to history
   - Updates history timestamp
   - Enforces history limit
   - Validates new password against history
   - Handles concurrent password changes

**Requirements**: 3.4, 3.5, 3.6  
**Estimated Time**: 2-3 hours  
**Target**: 15+ tests passing

---

### Task 8: Input Validation Tests (Priority 3)
**File to create**: `server/middleware/__tests__/validation.test.ts`

**Test Coverage Needed**:
1. **SQL Injection Prevention Tests** (20 tests)
   - Detects SQL injection patterns
   - Blocks common SQL keywords
   - Sanitizes SQL special characters
   - Validates parameterized queries
   - Tests various injection techniques

2. **XSS Prevention Tests** (20 tests)
   - Detects XSS payloads
   - Sanitizes HTML tags
   - Escapes JavaScript
   - Blocks event handlers
   - Tests various XSS techniques

3. **Data Type Validation Tests** (20 tests)
   - Validates string types
   - Validates number types
   - Validates boolean types
   - Validates array types
   - Validates object types
   - Validates date types
   - Validates email format
   - Validates URL format

4. **Size Limit Tests** (12 tests)
   - Enforces string length limits
   - Enforces array size limits
   - Enforces file size limits
   - Enforces payload size limits

5. **Special Character Tests** (12 tests)
   - Handles special characters correctly
   - Escapes dangerous characters
   - Allows safe special characters
   - Validates character encoding

**Requirements**: 4.1, 4.2, 4.3, 4.4, 4.6  
**Estimated Time**: 4-6 hours  
**Target**: 84+ tests passing

---

## Implementation Approach

### Step 1: Read Existing Code
For each service/middleware:
1. Read the actual implementation
2. Understand the public API
3. Identify all methods to test
4. Note any dependencies

### Step 2: Create Test File Structure
```typescript
/**
 * Unit Tests for [ServiceName]
 * Tests [description]
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

// Mock database
vi.mock('../../../db', () => ({
  db: {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    returning: vi.fn().mockReturnThis(),
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

  // Test groups here
});
```

### Step 3: Write Tests
For each test:
1. Follow AAA pattern (Arrange, Act, Assert)
2. Use centralized mocks
3. Test one thing per test
4. Use descriptive test names
5. Add comments for complex logic

### Step 4: Verify Tests Pass
1. Run test file individually
2. Fix any failures
3. Verify coverage
4. Check for flaky tests

### Step 5: Document
1. Add JSDoc comments
2. Document any special patterns
3. Note any limitations

## Success Criteria

### Per Task
- [ ] All tests pass
- [ ] No skipped tests
- [ ] Coverage >80% for the service/middleware
- [ ] Tests use centralized mocks
- [ ] Tests follow established patterns
- [ ] Tests are well-documented

### Overall Phase 2
- [ ] 114+ new tests created and passing
- [ ] Security component coverage >80%
- [ ] All tests use centralized infrastructure
- [ ] No import errors
- [ ] No mock failures
- [ ] Documentation complete

## Execution Order

1. **Task 6**: Account Lockout Tests (Start here)
2. **Task 7**: Password History Tests
3. **Task 8**: Input Validation Tests

## Ready to Start

All prerequisites met:
- ✅ Services exist
- ✅ Middleware exists
- ✅ Mock infrastructure ready
- ✅ Test patterns established
- ✅ Documentation available

**Next Action**: Start Task 6 - Create account lockout tests
