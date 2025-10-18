# Usage Tracker Fix - Response Unwrapping

## Issue
```
TypeError: searches.filter is not a function
```

## Root Cause
The `/api/searches` endpoint returns:
```json
{
  "success": true,
  "message": "Success",
  "data": [
    { "id": 1, "query": "...", "timestamp": "..." },
    ...
  ],
  "timestamp": "2025-10-18T..."
}
```

But the component was trying to use `searches` directly as an array.

## The Problem
React Query's `getQueryFn` returns `await res.json()`, which gives us the full response object, not just the data array.

## Solution
Added proper response unwrapping with defensive checks:

```typescript
const { data: searchesResponse, isLoading: searchesLoading } = useQuery({
  queryKey: ["/api/searches"],
});

// Unwrap the response
let searches: Search[] = [];
if (searchesResponse) {
  if (Array.isArray(searchesResponse)) {
    // Direct array response (old format)
    searches = searchesResponse;
  } else if ((searchesResponse as any).data) {
    // Wrapped response: { success, data: [...] }
    const data = (searchesResponse as any).data;
    searches = Array.isArray(data) ? data : [];
  }
}

// Don't render until loaded
if (searchesLoading) {
  return null;
}
```

## Why This Approach?
1. **Handles both formats** - Works with old direct array or new wrapped format
2. **Type-safe** - Checks if data is actually an array
3. **Defensive** - Returns empty array if data is malformed
4. **Loading state** - Waits for data before rendering

## Testing
After this fix:
- ✅ No more "filter is not a function" error
- ✅ Usage tracker displays correctly
- ✅ Shows correct search count
- ✅ Shows correct usage percentage

## Files Modified
- `client/src/components/usage-tracker.tsx` - Added proper response unwrapping

## Pattern for Other Components
If you have other components using React Query with these endpoints, use this pattern:

```typescript
const { data: response } = useQuery({ queryKey: ["/api/endpoint"] });

// Unwrap
const actualData = Array.isArray(response) 
  ? response 
  : (response as any)?.data || [];
```

Or use the `select` option:
```typescript
const { data } = useQuery({
  queryKey: ["/api/endpoint"],
  select: (response: any) => {
    if (Array.isArray(response)) return response;
    if (response?.data && Array.isArray(response.data)) return response.data;
    return [];
  },
});
```
