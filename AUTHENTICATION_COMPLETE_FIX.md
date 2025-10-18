# Authentication Complete Fix

## Problem
Search functionality was broken with 401 Unauthorized errors. The error message was `AUTH_NO_TOKEN`.

## Root Cause
The application uses JWT-based authentication, but the client wasn't sending the access token in API requests. The server's `jwtAuth` middleware expects an `Authorization: Bearer <token>` header, which wasn't being sent.

## Complete Solution

### 1. Token Storage (`client/src/lib/queryClient.ts`)
```typescript
// In-memory token storage
let accessToken: string | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
}

export function getAccessToken(): string | null {
  return accessToken;
}
```

### 2. Include Token in All Requests (`client/src/lib/queryClient.ts`)
```typescript
// Add Authorization header if we have an access token
if (accessToken) {
  headers['Authorization'] = `Bearer ${accessToken}`;
}
```

### 3. Store Token After Login/Register (`client/src/hooks/use-auth.ts`)
```typescript
// After successful login/register
if (result.data.accessToken) {
  setAccessToken(result.data.accessToken);
}
```

### 4. Refresh Token on App Load (`client/src/App.tsx` + `client/src/hooks/use-auth.ts`)
```typescript
// In App.tsx
useEffect(() => {
  initializeAuth();
}, []);

// In use-auth.ts
export async function initializeAuth() {
  const response = await fetch('/api/auth/refresh', {
    method: 'POST',
    credentials: 'include',
  });
  
  if (response.ok) {
    const result = await response.json();
    if (result.data?.accessToken) {
      setAccessToken(result.data.accessToken);
    }
  }
}
```

## How It Works

### Initial Login Flow
1. User enters credentials
2. POST `/api/auth/login`
3. Server returns:
   - `accessToken` (15 min expiry) - sent in response body
   - `refreshToken` (7 day expiry) - set as httpOnly cookie
   - `user` object
4. Client stores `accessToken` in memory
5. Client stores `refreshToken` automatically via cookie

### Subsequent Requests
1. Client includes `Authorization: Bearer <accessToken>` header
2. Client includes cookies (for refresh token)
3. Server validates access token via `jwtAuth` middleware
4. Request proceeds if token is valid

### Page Refresh Flow
1. App loads
2. `initializeAuth()` is called
3. POST `/api/auth/refresh` with refresh token cookie
4. Server validates refresh token
5. Server returns new access token
6. Client stores new access token
7. User stays logged in

### Token Expiry
- **Access Token**: 15 minutes
  - Stored in memory (lost on page refresh)
  - Sent in Authorization header
  - Used for all API requests
  
- **Refresh Token**: 7 days
  - Stored in httpOnly cookie (survives page refresh)
  - Used to get new access tokens
  - Cannot be accessed by JavaScript (security)

## Testing Steps

1. **Clear browser data** (to start fresh)
2. **Login** to the application
3. **Try searching** - should work now
4. **Refresh the page** - should stay logged in
5. **Try searching again** - should still work

## Environment Variables

The JWT secrets in `.env` are correct:
```bash
JWT_ACCESS_SECRET=XKFYYoejTucGCY8WaGc0WGdyb3FYZhXitIEGoQU4DXWCeAFbzu2j
JWT_REFRESH_SECRET=TucGCYXKFYYoejWGdyb3FYZhXitIEGoQU4DXWCeAFbzu2j8WaGc0
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d
```

These are used by the server to sign and verify JWT tokens.

## Security Considerations

### Why In-Memory Storage?
- Access tokens are stored in memory (not localStorage)
- This prevents XSS attacks from stealing tokens
- Tokens are lost on page refresh (by design)
- Refresh token cookie is used to get new access token

### Why httpOnly Cookies for Refresh Token?
- Cannot be accessed by JavaScript
- Prevents XSS attacks
- Automatically sent with requests
- Secure flag in production

## Troubleshooting

### Still Getting 401 Errors?
1. Check browser console for "Access token refreshed successfully" message
2. Check Network tab for `/api/auth/refresh` request
3. Verify refresh token cookie exists in Application tab
4. Try logging out and logging in again

### Token Not Being Sent?
1. Check `accessToken` is not null in memory
2. Verify Authorization header in Network tab
3. Check console for any errors during token refresh

### Refresh Token Invalid?
1. Refresh token may have expired (7 days)
2. User needs to login again
3. Check server logs for refresh token validation errors

## Files Modified

1. `client/src/lib/queryClient.ts` - Token storage and header injection
2. `client/src/hooks/use-auth.ts` - Token storage after login/register, refresh on load
3. `client/src/App.tsx` - Initialize auth on app mount
4. `AUTH_FIX_SUMMARY.md` - Documentation

## Next Steps

If you still see 401 errors:
1. Clear all browser cookies and localStorage
2. Restart the development server
3. Login again
4. Check browser console for any errors
5. Check Network tab to see if Authorization header is being sent

The authentication system is now complete and should work correctly!
