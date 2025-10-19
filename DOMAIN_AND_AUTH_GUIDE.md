# Domain & Authentication Setup Guide

Complete guide for custom domains and Neon Auth integration.

## 🌐 Part 1: Domain Configuration Strategy

### **Phase 1: Initial Deployment (Render URL)**

**Step 1:** Deploy with Render's URL first
```env
VITE_API_URL=https://unbuilt.onrender.com
CORS_ORIGIN=https://unbuilt.onrender.com
```

**Why?** Get the app working first, then add custom domain.

### **Phase 2: Add Custom Domain**

**Step 2a:** Configure in Render
1. Go to Render Dashboard → Your Service
2. Settings → Custom Domain
3. Add: `app.yourdomain.com` (or `unbuilt.yourdomain.com`)
4. Render provides CNAME record

**Step 2b:** Update DNS
Add CNAME in your domain registrar:
```
Type: CNAME
Name: app (or unbuilt)
Value: unbuilt.onrender.com
TTL: 3600
```

**Step 2c:** Update Environment Variables
```env
VITE_API_URL=https://app.yourdomain.com
CORS_ORIGIN=https://app.yourdomain.com
```

### **Phase 3: Support Both URLs (Transition Period)**

During DNS propagation or for backward compatibility, support both:

**Option A: Multiple CORS Origins (Recommended)**

Update `server/index.ts`:
```typescript
// CORS configuration - support multiple domains
const allowedOrigins = [
  process.env.CORS_ORIGIN,
  'https://unbuilt.onrender.com',
  'https://app.yourdomain.com',
  'http://localhost:8000' // Development
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin
    if (!origin) return callback(null, true);
    
    // Check if origin is in allowed list
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    
    // In development, allow any localhost
    if (process.env.NODE_ENV === 'development' && origin.includes('localhost')) {
      return callback(null, true);
    }
    
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Cookie'],
  exposedHeaders: ['Set-Cookie'],
  preflightContinue: false,
  optionsSuccessStatus: 204
}));
```

**Option B: Environment Variable with Multiple Origins**
```env
# Support multiple domains (comma-separated)
CORS_ORIGIN=https://app.yourdomain.com,https://unbuilt.onrender.com
```

Then update code:
```typescript
const corsOrigins = (process.env.CORS_ORIGIN || 'http://localhost:8000')
  .split(',')
  .map(origin => origin.trim());
```

### **Recommended Approach**

**For Your Deployment:**
1. **Start:** Use Render URL only
2. **Test:** Verify everything works
3. **Add:** Custom domain in Render
4. **Update:** Environment variables to custom domain
5. **Keep:** Render URL as fallback during transition

**Final State:**
```env
# Primary domain (custom)
VITE_API_URL=https://app.yourdomain.com
CORS_ORIGIN=https://app.yourdomain.com

# Code supports both automatically during transition
```

---

## 🔐 Part 2: Neon Auth / Stack Auth Integration

You mentioned you tried this before and it didn't work. Let me give you a foolproof guide.

### **What is Neon Auth?**

Neon Auth = Neon Database + Stack Auth integration
- Handles OAuth (Google, GitHub, etc.)
- Manages user sessions
- Syncs users to your Neon database
- No backend auth code needed

### **Current State of Your App**

Looking at your code, you have:
- ✅ Custom JWT authentication (working)
- ✅ User management in database
- ❌ OAuth buttons on frontend (not connected)
- ❌ No Stack Auth integration

### **Two Options for OAuth**

#### **Option A: Keep Current Auth + Add OAuth Manually**
**Pros:**
- You control everything
- No external dependencies
- Already working

**Cons:**
- More code to maintain
- Need to implement OAuth flow yourself
- More complex

**Implementation:**
1. Set up OAuth apps in Google/GitHub
2. Add OAuth routes to your Express server
3. Handle OAuth callbacks
4. Create/link users in your database

#### **Option B: Migrate to Neon Auth (Stack Auth)**
**Pros:**
- OAuth built-in (Google, GitHub, etc.)
- Less code to maintain
- Automatic user sync
- Modern auth patterns

**Cons:**
- Need to migrate existing users
- Different auth pattern
- Learning curve
- Dependency on Stack Auth

### **My Recommendation: Option A (Add OAuth to Current System)**

Since your JWT auth is working well, just add OAuth to it rather than migrating everything.

### **Step-by-Step: Add OAuth to Current System**

#### **Step 1: Create OAuth Apps**

**Google OAuth:**
1. Go to: https://console.cloud.google.com/apis/credentials
2. Create OAuth 2.0 Client ID
3. Authorized redirect URIs:
   ```
   http://localhost:8000/api/auth/google/callback
   https://unbuilt.onrender.com/api/auth/google/callback
   https://app.yourdomain.com/api/auth/google/callback
   ```
4. Save Client ID and Secret

**GitHub OAuth:**
1. Go to: https://github.com/settings/developers
2. New OAuth App
3. Authorization callback URL:
   ```
   http://localhost:8000/api/auth/github/callback
   https://unbuilt.onrender.com/api/auth/github/callback
   https://app.yourdomain.com/api/auth/github/callback
   ```
4. Save Client ID and Secret

#### **Step 2: Add Environment Variables**

```env
# OAuth Configuration
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=https://unbuilt.onrender.com/api/auth/google/callback

GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
GITHUB_CALLBACK_URL=https://unbuilt.onrender.com/api/auth/github/callback
```

#### **Step 3: Install OAuth Dependencies**

```bash
npm install passport passport-google-oauth20 passport-github2
```

#### **Step 4: Create OAuth Routes**

I can create the OAuth implementation for you. Would you like me to:
1. Create OAuth routes that integrate with your existing JWT system?
2. Add the necessary passport configuration?
3. Update your frontend to use the OAuth buttons?

### **Why Your Previous Attempt Might Have Failed**

Common issues with Stack Auth / Neon Auth:
1. **Callback URLs mismatch** - Must match exactly
2. **Environment variables** - Missing or incorrect
3. **CORS issues** - OAuth redirects blocked
4. **Session handling** - Stack Auth uses different session management
5. **Database schema** - Stack Auth expects specific tables

### **Easier Alternative: Social Login Libraries**

Instead of full Stack Auth migration, consider:
- **NextAuth.js** - But you're using Express, not Next.js
- **Passport.js** - Works great with Express (recommended)
- **Auth0** - Managed service (costs money)
- **Supabase Auth** - Similar to Stack Auth

---

## 🎯 My Specific Recommendations for You

### **For Domains:**
1. **Deploy first** with Render URL
2. **Test thoroughly** 
3. **Add custom domain** after it's working
4. **Use the CORS update** I provided above to support both

### **For OAuth:**
1. **Don't migrate to Stack Auth** - too complex for now
2. **Add Passport.js OAuth** to your existing system
3. **Keep your JWT auth** - it's working well
4. **Add OAuth as alternative login** - users can choose

### **Priority Order:**
1. ✅ Deploy to Render (do this first!)
2. ✅ Test with Render URL
3. ⏳ Add custom domain (after deployment works)
4. ⏳ Add OAuth with Passport.js (after domain works)

---

## 📝 Quick Fixes for Your .env.production

I noticed a few issues:

### **Issue 1: DATABASE_URL is placeholder**
```env
# Current (wrong):
DATABASE_URL=postgresql://user:password@host.neon.tech/dbname?sslmode=require

# Should be (from your .env):
DATABASE_URL=postgresql://neondb_owner:npg_oLQaeU8v4bNM@ep-little-tree-agutidhi.c-2.eu-central-1.aws.neon.tech/neondb?sslmode=require
```

### **Issue 2: OPENAI_API_KEY has tab character**
```env
# Current (has tab):
OPENAI_API_KEY	sk-proj-...

# Should be (with =):
OPENAI_API_KEY=sk-proj-...
```

### **Issue 3: Upstash REST variables not needed**
```env
# Remove these (not used by your app):
UPSTASH_REDIS_REST_URL="https://comic-jaybird-26369.upstash.io"
UPSTASH_REDIS_REST_TOKEN="AWcBAAIncDJhMjUzMTYwNDQxODE0ZTcyYWM0MDQ0MTI4NWU3ZjA0MXAyMjYzNjk"

# Keep only this:
REDIS_URL=rediss://default:AWcBAAIncDJhMjUzMTYwNDQxODE0ZTcyYWM0MDQ0MTI4NWU3ZjA0MXAyMjYzNjk@comic-jaybird-26369.upstash.io:6379
```

---

## 🚀 Next Steps

### **Immediate (Deploy First):**
1. Fix the 3 issues in `.env.production` above
2. Deploy to Render with Render URL
3. Test everything works

### **Short-term (After Deployment):**
1. Add custom domain in Render
2. Update CORS to support both URLs
3. Update environment variables

### **Medium-term (After Domain Works):**
1. Set up Google OAuth app
2. Set up GitHub OAuth app
3. Implement Passport.js OAuth routes
4. Connect frontend OAuth buttons

---

## 💡 Want Me To...?

I can help you with:
1. ✅ Fix your `.env.production` file
2. ✅ Update CORS to support multiple domains
3. ✅ Create OAuth implementation with Passport.js
4. ✅ Update frontend OAuth buttons to work

What would you like me to do first?

**My suggestion:** Let's fix `.env.production` and deploy first, then tackle OAuth after you have a working deployment.
