# Authentication Fix Summary

## Problem
The search functionality was broken with a 401 Unauthorized error (`AUTH_NO_TOKEN`). The issue was that the client wasn't sending the access token in API requests.

## Root Cause
The authentication system uses JWT tokens, but the client was only using cookies. The server's `jwtAuth` middleware expects an `Authorization: Bearer <token>` header, but the client wasn't sending it.

## Solution

### 1. Updated `client/src/lib/queryClient.ts`
- Added in-memory storage for access token
- Added `setAccessToken()` and `getAccessToken()` functions
- Modified `apiRequest()` to include `Authorization` header when token exists
- Modified `getQueryFn()` to include `Authorization` header when token exists

### 2. Updated `client/src/hooks/use-auth.ts`
- Import `setAccessToken` from queryClient
- Store access token after successful login
- Store access token after successful registration
- Clear access token on logout

## How It Works Now

1. **Login/Register:**
   - User submits credentials
   - Server returns `{ accessToken, refreshToken, user }`
   - Client stores `accessToken` in memory
   - Client stores `refreshToken` in httpOnly cookie (automatic)

2. **API Requests:**
   - Client includes `Authorization: Bearer <accessToken>` header
   - Client includes cookies (for refresh token)
   - Server validates access token via `jwtAuth` middleware

3. **Token Refresh:**
   - When access token expires (15 minutes)
   - Client can use refresh token cookie to get new access token
   - Server endpoint: `POST /api/auth/refresh`

## Testing

After these changes:
1. Log in to the application
2. Try searching for market opportunities
3. The search should now work without 401 errors

## Notes

- Access token is stored in memory (not localStorage) for security
- Access token expires after 15 minutes
- Refresh token is stored in httpOnly cookie (secure)
- Refresh token expires after 7 days
- On page refresh, user needs to re-authenticate or use refresh token

## Update: Token Refresh on App Load

Added automatic token refresh when the app loads:
1. `App.tsx` calls `initializeAuth()` on mount
2. `initializeAuth()` calls `/api/auth/refresh` with cookies
3. Server validates refresh token cookie and returns new access token
4. Client stores access token in memory
5. All subsequent API requests include the access token

This ensures users stay logged in across page refreshes without needing to re-enter credentials.

## Future Improvements

Consider implementing automatic token refresh on 401:
1. Intercept 401 responses in apiRequest
2. Attempt to refresh token using `/api/auth/refresh`
3. Retry original request with new token
4. Only redirect to login if refresh fails
