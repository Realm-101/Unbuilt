# API Response Format Fix

## Issue
After fixing authentication, the app crashed with:
```
Error: searches.filter is not a function
```

## Root Cause
All API endpoints now use `sendSuccess()` which wraps responses in:
```json
{
  "success": true,
  "message": "Success",
  "data": <actual data>,
  "timestamp": "2025-10-18T..."
}
```

But the client components were expecting the data directly.

## Files Fixed

### 1. `client/src/components/usage-tracker.tsx`
**Before:**
```typescript
const { data: searches = [] } = useQuery({
  queryKey: ["/api/searches"],
});
```

**After:**
```typescript
const { data: searchesResponse } = useQuery({
  queryKey: ["/api/searches"],
});

// Unwrap the response
const searches = (searchesResponse as any)?.data || searchesResponse || [];
```

### 2. `client/src/pages/home.tsx`
**Before:**
```typescript
const { data: recentSearches } = useQuery({
  queryKey: ["/api/searches"],
  select: (data: Search[]) => data.slice(0, 5),
});
```

**After:**
```typescript
const { data: recentSearches } = useQuery({
  queryKey: ["/api/searches"],
  select: (response: any) => {
    // Unwrap response
    const searches = response?.data || response || [];
    return Array.isArray(searches) ? searches.slice(0, 5) : [];
  },
});
```

### 3. `client/src/pages/home.tsx` (search endpoint - already fixed)
```typescript
const result = await response.json();
const data = result.data;  // Unwrap
```

## Pattern for All API Responses

When using React Query with these endpoints, always unwrap:

```typescript
const { data } = useQuery({
  queryKey: ["/api/endpoint"],
  select: (response: any) => {
    // Unwrap { success, data } format
    return response?.data || response;
  },
});
```

Or handle it in the component:
```typescript
const { data: response } = useQuery({
  queryKey: ["/api/endpoint"],
});

const actualData = response?.data || response || defaultValue;
```

## All Endpoints Using sendSuccess()

These endpoints wrap their responses:
- `/api/search` - Returns `{ success, data: { search, results } }`
- `/api/searches` - Returns `{ success, data: [...searches] }`
- `/api/auth/refresh` - Returns `{ success, data: { accessToken, ... } }`
- Most other API endpoints

## Testing

After these fixes:
1. ✅ Login works
2. ✅ Token refresh works
3. ✅ User profile loads
4. ✅ Recent searches display
5. ✅ Usage tracker displays
6. ✅ Search functionality works

Everything should now work correctly!
