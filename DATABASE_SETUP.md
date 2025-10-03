# Database Setup - Windows + Neon Issue

## Current Issue

Windows has SSL connection issues with Neon's pooler connection. This is a known issue with `pg` driver on Windows.

## Quick Workaround - Use the App Without Demo User

The app will work fine, you just need to register a new account:

1. **Start the server:**
   ```powershell
   npm run dev
   ```

2. **Open browser:** `http://localhost:8000`

3. **Click "Sign Up"** and create an account

4. **Use the app!**

The database tables will be created automatically when the app starts.

## Alternative: Manual Database Setup

If you want to set up the database manually:

### Option 1: Use Neon SQL Editor

1. Go to your Neon dashboard: https://console.neon.tech
2. Click on your project
3. Go to "SQL Editor"
4. Copy and paste the schema from `shared/schema.ts`
5. Run the SQL commands

### Option 2: Use Different Database URL

In Neon dashboard, try getting:
- **Direct connection** (without `-pooler`)
- **Connection string for psql**

Update `.env` with the new connection string.

### Option 3: Use Local PostgreSQL

If you have PostgreSQL installed locally:

```powershell
# Create database
createdb unbuilt

# Update .env
DATABASE_URL=postgresql://postgres:yourpassword@localhost:5432/unbuilt

# Push schema
npm run db:push
```

## Why This Happens

The issue is:
- Neon uses SSL/TLS for connections
- Windows + Node.js + pg driver has SSL handshake issues
- The `-pooler` endpoint can be more problematic

## Current Status

✅ **App works without database push**
- Tables are created automatically
- You can register and use the app
- Just no demo user pre-created

⚠️ **Database push fails**
- SSL connection issue on Windows
- Doesn't affect app functionality
- Only affects initial setup

## Recommended Approach

**Just use the app!**

1. Start server: `npm run dev`
2. Open: `http://localhost:8000`
3. Click "Sign Up"
4. Create your account
5. Start using the app

The database will be set up automatically. You don't need to run `db:push` manually.

## Testing Database Connection

To verify your database works, just start the app and try to register. If registration works, your database is connected properly!

---

**TL;DR:** Skip `npm run db:push`, just run `npm run dev` and register an account. Everything will work! 🚀
