# Routing Fix - 404 on Navigation

## Issue
Landing page loads perfectly, but clicking any link results in 404.

## Diagnosis

This is a **client-side routing issue**. The problem is that:
1. Landing page loads fine (initial HTML)
2. When you click a link, the browser makes a full page request to the server
3. Server doesn't recognize the route and returns 404

## Quick Fix

### Option 1: Hard Refresh (Try This First)

1. **Clear browser cache:**
   - Press `Ctrl + Shift + Delete`
   - Clear cached images and files
   - Close and reopen browser

2. **Hard refresh the page:**
   - Press `Ctrl + F5` or `Ctrl + Shift + R`
   - This forces reload of all assets

3. **Try navigation again**

### Option 2: Check Browser Console

1. Open browser DevTools: `F12`
2. Go to Console tab
3. Look for errors
4. Share any red errors you see

### Option 3: Restart Dev Server

```powershell
# Stop the server (Ctrl+C)
# Then restart
npm run dev
```

## Common Causes

### 1. Vite HMR Not Connected
**Symptom:** Page loads but navigation doesn't work
**Fix:** Check browser console for WebSocket connection errors

### 2. JavaScript Not Loading
**Symptom:** Page is static, no interactivity
**Fix:** Check Network tab in DevTools, look for failed JS requests

### 3. Base URL Mismatch
**Symptom:** Assets load from wrong URL
**Fix:** Verify you're accessing `http://localhost:8000` (not 127.0.0.1)

## Debugging Steps

### Step 1: Check What's Loading

Open DevTools (F12) → Network tab → Refresh page

Look for:
- ✅ `index.html` - Should load (200)
- ✅ `main.tsx` or `main.js` - Should load (200)
- ✅ `@vite/client` - Should load (200)
- ❌ Any 404 errors?

### Step 2: Check Console

Look for:
- ✅ No errors = Good
- ❌ "Failed to fetch" = Network issue
- ❌ "Cannot GET /route" = Routing issue
- ❌ WebSocket errors = Can ignore (HMR)

### Step 3: Test API

Open new tab: `http://localhost:8000/health`

Should see: `{"status":"ok"}`

If not, server isn't running properly.

### Step 4: Test Client-Side Routing

1. Load: `http://localhost:8000`
2. Open Console (F12)
3. Type: `window.location.href = '/about'`
4. Press Enter

Does it navigate? If yes, routing works. If no, JavaScript isn't loaded.

## Manual Test

Try accessing these URLs directly:

1. `http://localhost:8000` - Should load landing page
2. `http://localhost:8000/about` - Should load landing page (then route client-side)
3. `http://localhost:8000/api/health` - Should return JSON

If #2 returns 404, the server catch-all isn't working.

## Solution Based on Symptoms

### Symptom: All routes return 404
**Cause:** Server not serving index.html for client routes
**Fix:** Server configuration issue

### Symptom: Page loads but is static (no interactivity)
**Cause:** JavaScript not loading
**Fix:** Check Network tab for failed JS requests

### Symptom: Navigation works but shows wrong content
**Cause:** Client-side routing working, but components not loading
**Fix:** React/component issue

## Quick Diagnostic Command

Run this in PowerShell:

```powershell
# Test if server is responding
curl http://localhost:8000

# Test if API works
curl http://localhost:8000/api/health

# Test if client route returns HTML
curl http://localhost:8000/about
```

All three should return content (not 404).

## If Still Not Working

### Check Server Logs

Look at the terminal where `npm run dev` is running.

When you click a link, you should see:
```
GET /about 200 in Xms
```

If you see:
```
GET /about 404 in Xms
```

Then the server isn't handling client routes properly.

### Restart with Clean State

```powershell
# Stop server (Ctrl+C)

# Clear any cached builds
Remove-Item -Recurse -Force dist -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force node_modules/.vite -ErrorAction SilentlyContinue

# Restart
npm run dev
```

## Expected Behavior

**Correct:**
1. Load `http://localhost:8000` → Landing page
2. Click "About" → URL changes to `/about`, content updates
3. No page reload, smooth transition
4. Browser back button works

**Incorrect:**
1. Load `http://localhost:8000` → Landing page
2. Click "About" → Full page reload, 404 error
3. URL changes but content doesn't

## Next Steps

1. **Try hard refresh** (Ctrl + F5)
2. **Check browser console** for errors
3. **Test direct URL access** (`http://localhost:8000/about`)
4. **Share console errors** if still not working

## Need More Help?

Share:
1. Browser console errors (F12 → Console)
2. Network tab screenshot (F12 → Network)
3. Server terminal output
4. Which link you're clicking

---

**Quick Test:**
1. Open `http://localhost:8000`
2. Press F12 (DevTools)
3. Click any link
4. Check Console for errors
5. Check Network for failed requests

Let me know what you see! 🔍
