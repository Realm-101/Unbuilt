# Search Access Denied Error Fix

## Problem
After logging in, when users performed a search on the main page, they received an error:
```
{"error": "Access denied","message": "You can only access your own resources","code": "ACCESS_DENIED"}
```

## Root Cause
The issue was in the `validateSearchData` middleware (`server/middleware/queryValidation.ts`). The middleware was incorrectly validating ownership of newly created search results due to:

1. **Type Mismatch**: The middleware was comparing `userId` values without proper type coercion. The database returns `userId` as a number, but the comparison was treating it as a string, causing the validation to fail even for the correct user.

2. **Missing Success Wrapper Handling**: The search endpoint uses `sendSuccess()` which wraps the response in `{ success: true, data: {...} }`, but the middleware wasn't handling this wrapper structure properly.

## Changes Made

### 1. Fixed Type Coercion in `validateResourceOwnership` function
- Changed parameter type from `string` to `string | number`
- Added proper null/undefined checks
- Ensured all comparisons use `.toString()` for consistent type handling

### 2. Updated `validateSearchData` middleware
- Added handling for the `sendSuccess` wrapper structure
- Fixed userId comparison to use `.toString()` on both sides
- Preserved the `_cacheHit` flag in responses
- Added proper validation for both wrapped and unwrapped responses

### 3. Updated other validation middlewares
- Fixed `validateQueryResults` to not convert userId to string prematurely
- Fixed `validateUserData` to properly handle type coercion in comparisons

## Files Modified
- `server/middleware/queryValidation.ts`
- `client/src/pages/search-results.tsx`

## Additional Fix: Results Display Issue

After fixing the access denied error, a second issue appeared where clicking on a search result showed:
```
Error: results.filter is not a function
```

### Cause
The API endpoint `/api/search/:id/results` uses `sendSuccess()` which wraps the response in:
```json
{
  "success": true,
  "data": [...results...],
  "timestamp": "..."
}
```

But the client was expecting the results array directly.

### Solution
Updated the search results query to unwrap the response using the `select` option:
```typescript
select: (response: any) => {
  return response?.data || response || [];
}
```

## Testing
After these fixes:
1. Users can successfully perform searches after logging in
2. The search results are properly returned with ownership validation
3. Search results display correctly on the results page
4. Users still cannot access other users' searches (security maintained)
5. Cache hit information is preserved in responses

## Security Impact
This fix maintains all security controls while fixing the false-positive access denial:
- Users can only access their own searches
- Proper ownership validation is still enforced
- No sensitive data leakage
- Type-safe comparisons prevent bypass attempts
