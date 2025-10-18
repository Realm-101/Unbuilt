# Authentication Architecture Issues

## Problems Identified

### 1. Dual Auth Systems
There are TWO separate authentication systems:
- `client/src/hooks/useAuth.ts` - Simple React Query hook
- `client/src/hooks/use-auth.ts` - Zustand store with persistence

The App.tsx uses the simple `useAuth` hook, but login/register might use the Zustand store. This causes inconsistency.

### 2. Token Refresh Rate Limiting
The refresh endpoint has strict rate limiting:
```typescript
validateSensitiveOperation(10, 15 * 60 * 1000) // 10 requests per 15 minutes
```

The app calls `initializeAuth()` on every page load, which calls `/api/auth/refresh`. With normal browsing, this quickly hits the rate limit, causing auth to fail.

### 3. Auth State Not Persisting
When navigating between pages:
1. User logs in successfully
2. Access token stored in memory
3. User navigates to `/search/11`
4. App tries to refresh token
5. Refresh fails (rate limited or no refresh token)
6. User appears logged out
7. Route shows 404 (not authenticated)

### 4. Empty Results Issue
The search results are being returned correctly by the API (7 results), but not displaying because:
1. The query has `staleTime: Infinity` in the global config
2. Old cached data (from before middleware fix) is being used
3. The `select` function doesn't run on cached data

## Recommended Fixes

### Fix 1: Consolidate Auth Systems
Choose ONE auth system and remove the other. Recommend using the Zustand store (`use-auth.ts`) because it has:
- Persistence
- Better state management
- Token refresh logic

### Fix 2: Relax Rate Limiting for Refresh
Change the refresh endpoint rate limit:
```typescript
validateSensitiveOperation(100, 15 * 60 * 1000) // 100 requests per 15 minutes
```

Or remove rate limiting entirely for refresh since it's already protected by the refresh token itself.

### Fix 3: Fix Token Persistence
Ensure the access token is:
1. Stored in localStorage or sessionStorage (not just memory)
2. Restored on page load
3. Included in all API requests

### Fix 4: Fix Query Caching
Either:
- Change global `staleTime` from `Infinity` to a reasonable value (5 minutes)
- Or override `staleTime: 0` for specific queries that need fresh data

## Immediate Workarounds

### For Testing (Quick Fix):
1. **Increase refresh rate limit** in `server/routes/auth.ts`:
   ```typescript
   router.post('/refresh', authRateLimit, sanitizeInput, 
     validateSensitiveOperation(100, 15 * 60 * 1000), // Increased from 10 to 100
     asyncHandler(async (req: Request, res: Response) => {
   ```

2. **Clear browser cache** completely (Ctrl+Shift+Delete)

3. **Use incognito/private window** for testing to avoid cached data

### For Results Display:
The middleware fix is correct, but cached data is the issue. Users need to:
1. Hard refresh (Ctrl+Shift+R)
2. Or clear browser cache
3. Or wait for cache to expire (never, since staleTime is Infinity!)

## Long-term Solution

Refactor the auth system to:
1. Use a single auth state management solution
2. Store tokens properly with persistence
3. Handle token refresh intelligently (only when needed, not on every page load)
4. Use reasonable cache times for queries
5. Implement proper error handling for auth failures
