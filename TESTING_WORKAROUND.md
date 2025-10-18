# Testing Workaround - Reset Search Count

## Problem
You've hit the 5 search limit and can't test further. The searches are being created but returning 0 results.

## Quick Fix for Testing

### Option 1: Reset Search Count via Database (Recommended)
If you have database access, run this SQL:

```sql
UPDATE users SET searchCount = 0, lastResetDate = CURRENT_TIMESTAMP WHERE email = 'your-email@example.com';
```

### Option 2: Temporary Code Change
Add this temporary endpoint to `server/routes.ts` (after the other routes, before the httpServer creation):

```typescript
// TEMPORARY: Reset search count for testing (REMOVE IN PRODUCTION)
if (process.env.NODE_ENV !== 'production') {
  app.post("/api/dev/reset-searches", jwtAuth, asyncHandler(async (req, res) => {
    const userId = req.user!.id;
    await db.update(users)
      .set({ searchCount: 0, lastResetDate: new Date().toISOString() })
      .where(eq(users.id, userId));
    sendSuccess(res, { message: "Search count reset" });
  }));
}
```

Then call it from your browser console:
```javascript
fetch('/api/dev/reset-searches', {
  method: 'POST',
  credentials: 'include',
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
  }
}).then(r => r.json()).then(console.log);
```

### Option 3: Upgrade to Pro (Temporary)
Manually update your user record in the database:

```sql
UPDATE users SET plan = 'pro' WHERE email = 'your-email@example.com';
```

## Root Cause of Empty Results

The real issue is that searches are completing but returning 0 results. This is likely because:

1. **API Keys Not Configured**: Both GEMINI_API_KEY and PERPLEXITY_API_KEY are missing
2. **Fallback Data Not Working**: The demo/fallback data should be returned but isn't

Check server console logs when you search. You should see one of:
- "🔍 Using Perplexity AI for market gap discovery"
- "Perplexity API failed, trying Gemini fallback"
- "⚠️ No AI APIs configured - returning demo data"

If you see errors, that's the real issue to fix.
