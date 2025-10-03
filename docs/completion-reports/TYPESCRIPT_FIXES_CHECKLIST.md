# TypeScript Fixes - Implementation Checklist

Use this checklist to track progress through the fixes.

## Phase 1: Type Augmentation (20 min) - 24 errors

### Fix 1: AuthenticatedUser Type (15 errors)
- [ ] Open `server/types/express.d.ts`
- [ ] Add `export interface AuthenticatedUser extends Omit<DbUser, 'password'> { jti: string; }`
- [ ] Change `user?: User & { jti: string }` to `user?: AuthenticatedUser`
- [ ] Run `npx tsc --noEmit` to verify
- [ ] Expected: 15 errors resolved

### Fix 2: DeviceInfo Type (9 errors)
- [ ] Open `server/types/express.d.ts`
- [ ] Add `import type { DeviceInfo } from '../services/sessionManager';`
- [ ] Change `device: string` to `device: DeviceInfo` in sessionInfo interface
- [ ] Run `npx tsc --noEmit` to verify
- [ ] Expected: 9 errors resolved

**Phase 1 Complete:** Should have ~28 errors remaining

---

## Phase 2: Type Conversions (15 min) - 11 errors

### Fix 3: Routes Type Conversions (6 errors)
- [ ] Open `server/routes.ts`
- [ ] Line 164: Add `import { generalRateLimit } from './middleware/rateLimiting';` or remove reference
- [ ] Lines 208, 485, 530, 624: Change `userId` to `String(userId)`
- [ ] Line 736: Change to `parseInt(req.params.id, 10)` with validation
- [ ] Run `npx tsc --noEmit` to verify
- [ ] Expected: 5 errors resolved

- [ ] Open `server/routes/admin.ts`
- [ ] Line 97: Change to `String(userId)`
- [ ] Expected: 1 error resolved

### Fix 4: SecurityEventType Validation (5 errors)
- [ ] Open `server/routes/securityMonitoring.ts`
- [ ] Add `isValidSecurityEventType` type guard function at top
- [ ] Lines 55, 79, 158, 195, 246: Update to use type guard or cast
- [ ] Run `npx tsc --noEmit` to verify
- [ ] Expected: 5 errors resolved

**Phase 2 Complete:** Should have ~17 errors remaining

---

## Phase 3: Drizzle ORM Issues (30 min) - 10 errors

### Fix 5: Date Comparisons in securityLogger.ts (4 errors)
- [ ] Open `server/services/securityLogger.ts`
- [ ] Add `import { sql } from 'drizzle-orm';` if not present
- [ ] Lines 288, 291: Replace date comparison with `sql` template
- [ ] Lines 330, 333: Replace date comparison with `sql` template
- [ ] Run `npx tsc --noEmit` to verify
- [ ] Expected: 4 errors resolved

### Fix 5b: Date Comparisons in sessionManager.ts (4 errors)
- [ ] Open `server/services/sessionManager.ts`
- [ ] Add `import { sql } from 'drizzle-orm';` if not present
- [ ] Lines 96, 144, 284, 296, 308, 422: Replace date comparisons with `sql` template
- [ ] Run `npx tsc --noEmit` to verify
- [ ] Expected: 4 errors resolved

### Fix 6: Duplicate Functions (2 errors)
- [ ] Open `server/services/sessionManager.ts`
- [ ] Find duplicate function at line 267
- [ ] Find duplicate function at line 432
- [ ] Compare both implementations
- [ ] Delete the less complete implementation
- [ ] Run `npx tsc --noEmit` to verify
- [ ] Expected: 2 errors resolved

**Phase 3 Complete:** Should have ~7 errors remaining

---

## Phase 4: Remaining Issues (20 min) - 7 errors

### Fix 7: Response.end Override (1 error)
- [ ] Open `server/middleware/securityMonitoring.ts`
- [ ] Line 40: Update res.end override with proper type assertion
- [ ] Run `npx tsc --noEmit` to verify
- [ ] Expected: 1 error resolved

### Fix 8: Missing AuthService Method (1 error)
- [ ] Open `server/routes/admin.ts`
- [ ] Line 214: Either add method to AuthService or use storage.updateUser
- [ ] If adding to AuthService, open `server/services/auth.ts` and add method
- [ ] Run `npx tsc --noEmit` to verify
- [ ] Expected: 1 error resolved

### Fix 9: Property Access Safety (2 errors)
- [ ] Open `server/routes/securityMonitoring.ts`
- [ ] Line 213: Add optional chaining for endpoint property
- [ ] Open `server/middleware/sessionManagement.ts`
- [ ] Line 138: Add type guard for issuedAt
- [ ] Run `npx tsc --noEmit` to verify
- [ ] Expected: 2 errors resolved

### Fix 10: Script Type Issues (2 errors)
- [ ] Open `server/scripts/detectCredentials.ts`
- [ ] Line 52: Add ScanResult interface
- [ ] Update code to use proper type guards
- [ ] Run `npx tsc --noEmit` to verify
- [ ] Expected: 2 errors resolved

### Fix 11: Drizzle Query Return Types (2 errors)
- [ ] Open `server/services/collaboration.ts`
- [ ] Line 365: Add type assertion or use $inferSelect
- [ ] Open `server/storage.ts`
- [ ] Line 172: Add type assertion or use $inferSelect
- [ ] Run `npx tsc --noEmit` to verify
- [ ] Expected: 2 errors resolved (may auto-resolve)

**Phase 4 Complete:** Should have 0-5 errors remaining

---

## Final Verification

- [ ] Run full type check: `npx tsc --noEmit`
- [ ] Run build: `npm run build`
- [ ] Run tests: `npm test`
- [ ] Verify error count is 0-5
- [ ] Test authentication flows
- [ ] Test security logging
- [ ] Test session management
- [ ] Test admin functions

---

## Post-Fix Tasks

### Documentation
- [ ] Create `shared/type-utils.ts` with utility functions
- [ ] Create `docs/TYPESCRIPT_PATTERNS.md` with patterns guide
- [ ] Update team documentation

### Code Quality
- [ ] Add pre-commit hook for type checking
- [ ] Review any remaining `any` types
- [ ] Document any necessary type assertions

### Future Improvements
- [ ] Check for Drizzle ORM updates
- [ ] Consider adding Zod for runtime validation
- [ ] Consider stricter TypeScript options

---

## Progress Tracking

| Phase | Target Errors | Actual Errors | Status |
|-------|---------------|---------------|--------|
| Start | 52 | 52 | ✅ |
| Phase 1 | 28 | ___ | ⏳ |
| Phase 2 | 17 | ___ | ⏳ |
| Phase 3 | 7 | ___ | ⏳ |
| Phase 4 | 0-5 | ___ | ⏳ |

**Notes:**
- Fill in "Actual Errors" after each phase
- Mark status as ✅ when complete
- Document any issues or deviations

---

**Created:** October 3, 2025  
**Purpose:** Step-by-step implementation checklist  
**Estimated Time:** ~85 minutes total
