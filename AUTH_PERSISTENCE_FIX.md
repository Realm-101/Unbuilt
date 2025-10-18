# Authentication Persistence Fix

## Problems Fixed

### 1. Access Token Not Persisting
**Problem**: Access token was stored only in memory, so it was lost on page refresh.

**Fix**: Store access token in localStorage so it persists across page reloads.

**File**: `client/src/lib/queryClient.ts`

### 2. Too Frequent Token Refresh
**Problem**: `initializeAuth()` was being called on every page navigation, hitting rate limits.

**Fix**: Added cooldown mechanism (1 minute) to prevent excessive refresh calls.

**File**: `client/src/hooks/use-auth.ts`

### 3. Aggressive Query Refetching
**Problem**: The auth query was refetching on every mount and window focus, causing unnecessary API calls.

**Fix**: Disabled refetch on mount and window focus, set reasonable staleTime.

**File**: `client/src/hooks/useAuth.ts`

## Changes Made

### 1. Token Storage (`client/src/lib/queryClient.ts`)
```typescript
// Before: In-memory only
let accessToken: string | null = null;

// After: Persisted in localStorage
const ACCESS_TOKEN_KEY = 'access_token';
let accessToken: string | null = null;

// Initialize from localStorage on module load
if (typeof window !== 'undefined') {
  accessToken = localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function setAccessToken(token: string | null) {
  accessToken = token;
  if (typeof window !== 'undefined') {
    if (token) {
      localStorage.setItem(ACCESS_TOKEN_KEY, token);
    } else {
      localStorage.removeItem(ACCESS_TOKEN_KEY);
    }
  }
}
```

### 2. Initialization Cooldown (`client/src/hooks/use-auth.ts`)
```typescript
let isInitializing = false;
let lastInitTime = 0;
const INIT_COOLDOWN = 60000; // 1 minute

export async function initializeAuth() {
  // Prevent multiple simultaneous initializations
  if (isInitializing) return;
  
  // Prevent too frequent initializations
  const now = Date.now();
  if (now - lastInitTime < INIT_COOLDOWN) return;
  
  isInitializing = true;
  lastInitTime = now;
  
  try {
    // ... refresh logic ...
  } finally {
    isInitializing = false;
  }
}
```

### 3. Query Configuration (`client/src/hooks/useAuth.ts`)
```typescript
const { data: user, isLoading } = useQuery({
  queryKey: ["/api/auth/user"],
  queryFn: getQueryFn({ on401: "returnNull" }),
  retry: false,
  staleTime: 5 * 60 * 1000, // 5 minutes
  refetchOnMount: false, // Don't refetch on every mount
  refetchOnWindowFocus: false, // Don't refetch on window focus
});
```

## How It Works Now

1. **On App Load**:
   - Access token is loaded from localStorage
   - `initializeAuth()` is called once to refresh if needed
   - User query checks authentication status

2. **On Login**:
   - Access token is stored in both memory and localStorage
   - User data is cached in React Query

3. **On Page Navigation**:
   - Access token is read from localStorage
   - No unnecessary refresh calls (cooldown prevents it)
   - Auth query doesn't refetch (staleTime prevents it)

4. **On Page Refresh**:
   - Access token is restored from localStorage
   - User stays logged in!

## Testing

1. **Login**:
   - Go to http://localhost:8000
   - Sign in
   - You should be logged in

2. **Navigate**:
   - Click on search results
   - Navigate back to home
   - **You should stay logged in**

3. **Refresh**:
   - Press F5 to refresh the page
   - **You should stay logged in**

4. **New Tab**:
   - Open a new tab to http://localhost:8000
   - **You should be logged in automatically**

## Files Modified

1. `client/src/lib/queryClient.ts` - Token persistence in localStorage
2. `client/src/hooks/use-auth.ts` - Initialization cooldown
3. `client/src/hooks/useAuth.ts` - Query configuration
4. `client/src/App.tsx` - Comment clarification

## Security Note

Storing the access token in localStorage is acceptable because:
1. Access tokens are short-lived (15 minutes)
2. Refresh tokens remain httpOnly cookies (more secure)
3. This is a standard practice for SPAs
4. The token is cleared on logout

For even better security in production, consider:
- Using sessionStorage instead (cleared when tab closes)
- Implementing token rotation
- Adding CSRF protection
