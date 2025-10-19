# Quick Start Guide - Windows

## Current Issues & Fixes

### ✅ Server is Running
The server is now starting on port 8000 with host 127.0.0.1.

### ⚠️ Common Issues You Might See

#### 1. Database Connection Error
**Symptom:** Errors about database connection, PostgreSQL, or Neon

**Fix:** You need a real database. Options:

**Option A: Use Neon Database (Recommended - Free)**
1. Go to https://neon.tech
2. Sign up for free account
3. Create a new project
4. Copy the connection string
5. Update `.env`:
   ```env
   DATABASE_URL=postgresql://user:password@ep-xxx.neon.tech/dbname?sslmode=require
   ```

**Option B: Local PostgreSQL**
1. Install PostgreSQL on Windows
2. Create database: `createdb unbuilt`
3. Update `.env`:
   ```env
   DATABASE_URL=postgresql://postgres:yourpassword@localhost:5432/unbuilt
   ```

#### 2. WebSocket Errors (Can Ignore)
**Symptom:** `ECONNREFUSED` errors for WebSocket connections

**Status:** These are warnings about external services. The app will work fine without them.

#### 3. Demo User Creation Failed
**Symptom:** "Failed to create demo user"

**Fix:** This happens if database isn't connected. Once database is set up, demo user will be created automatically.

#### 4. CORS Errors in Browser
**Symptom:** CORS policy errors in browser console

**Fix:** Update `.env`:
```env
CORS_ORIGIN=http://localhost:8000
```

## Step-by-Step Setup

### 1. Get a Database (Choose One)

**Neon (Easiest - Free):**
```
1. Visit https://neon.tech
2. Sign up (free)
3. Create project
4. Copy connection string
5. Paste in .env as DATABASE_URL
```

**Local PostgreSQL:**
```powershell
# Install PostgreSQL from https://www.postgresql.org/download/windows/
# Then create database
createdb unbuilt
```

### 2. Update .env File

```env
# Required - Get from Neon or local PostgreSQL
DATABASE_URL=your_actual_database_url_here

# Already set correctly
PORT=8000
HOST=127.0.0.1
NODE_ENV=development

# Already generated
JWT_ACCESS_SECRET=XKFYYoejTucGCY8WaGc0WGdyb3FYZhXitIEGoQU4DXWCeAFbzu2j
JWT_REFRESH_SECRET=TucGCYXKFYYoejWGdyb3FYZhXitIEGoQU4DXWCeAFbzu2j8WaGc0

# Update this to match your port
CORS_ORIGIN=http://localhost:8000
```

### 3. Initialize Database

Once DATABASE_URL is set:

```powershell
npm run db:push              # Create tables
npm run migrate:security     # Add security features
```

### 4. Start Server

```powershell
npm run dev
```

### 5. Open Browser

Navigate to: `http://localhost:8000`

## What Should Work

Once database is connected:

✅ Server starts on port 8000
✅ Database tables created
✅ Demo user created (Admin@unbuilt.one / Admin@123)
✅ Web interface loads
✅ Authentication works
✅ AI search works (if GEMINI_API_KEY is set)

## What Can Be Ignored

⚠️ WebSocket connection errors (external services)
⚠️ Token cleanup warnings (will work once database is connected)
⚠️ Session stats errors (will work once database is connected)

## Testing Without Database

If you just want to see if the server runs:

1. The server will start
2. You'll see errors about database
3. Web interface will load but features won't work
4. This is normal - you need a database for full functionality

## Quick Database Setup (Neon - 2 minutes)

1. **Sign up:** https://neon.tech (free, no credit card)
2. **Create project:** Click "Create Project"
3. **Copy connection string:** Shows on dashboard
4. **Update .env:** Paste as DATABASE_URL
5. **Initialize:** Run `npm run db:push`
6. **Done!** Run `npm run dev`

## Troubleshooting

### Server won't start
- Check PORT is 8000 in .env
- Check HOST is 127.0.0.1 in .env
- Try different port (3000, 8080)

### Database errors
- Verify DATABASE_URL is correct
- Test connection: `npm run db:push`
- Check database is accessible

### Browser shows blank page
- Check console for errors
- Verify CORS_ORIGIN matches your URL
- Try clearing browser cache

### AI search doesn't work
- Need GEMINI_API_KEY in .env
- Get free key: https://makersuite.google.com/app/apikey
- Add to .env: `GEMINI_API_KEY=your_key_here`

## Next Steps

1. **Get database connected** (Neon is easiest)
2. **Run database migrations**
3. **Test the application**
4. **Review features**

## Need Help?

**Common Issues:**
- Database connection → Check DATABASE_URL
- Port conflicts → Change PORT in .env
- CORS errors → Update CORS_ORIGIN
- AI not working → Add GEMINI_API_KEY

**Documentation:**
- [WINDOWS_SETUP.md](WINDOWS_SETUP.md) - Detailed Windows guide
- [README.md](README.md) - Full documentation
- [docs/](docs/) - Comprehensive guides

---

**Quick Summary:**
1. Get Neon database (free): https://neon.tech
2. Copy connection string to .env
3. Run: `npm run db:push`
4. Run: `npm run dev`
5. Open: http://localhost:8000

That's it! 🚀
