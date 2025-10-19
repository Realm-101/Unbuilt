# ⚡ Quick Deploy Reference Card

## 🚀 Deploy in 5 Steps (30 min)

### 1️⃣ Build Test (2 min)
```bash
npm run build
```
✅ Should complete without errors

### 2️⃣ Create Render Service (5 min)
- Go to: https://render.com
- New → Web Service → Connect GitHub
- Build: `npm install && npm run build`
- Start: `npm start`

### 3️⃣ Copy Environment Variables (10 min)
From `.env.production` to Render Environment tab:
```
NODE_ENV=production
PORT=8000
HOST=0.0.0.0
VITE_API_URL=https://unbuilt.onrender.com
CORS_ORIGIN=https://unbuilt.onrender.com
DATABASE_URL=postgresql://...
JWT_ACCESS_SECRET=...
JWT_REFRESH_SECRET=...
COOKIE_SECRET=...
REDIS_URL=rediss://...
GEMINI_API_KEY=...
XAI_API_KEY=...
PERPLEXITY_API_KEY=...
OPENAI_API_KEY=...
STRIPE_SECRET_KEY=...
STRIPE_PUBLISHABLE_KEY=...
STRIPE_WEBHOOK_SECRET=...
SENDGRID_API_KEY=...
SENDGRID_FROM_EMAIL=...
RATE_LIMIT_WINDOW=900000
RATE_LIMIT_MAX=100
DB_MAX_CONNECTIONS=20
LOG_LEVEL=info
```

### 4️⃣ Deploy & Get URL (10 min)
- Click "Create Web Service"
- Wait for build
- Copy URL: `https://unbuilt-xyz.onrender.com`

### 5️⃣ Update URLs (2 min)
In Render, update these two variables:
```
VITE_API_URL=https://your-actual-url.onrender.com
CORS_ORIGIN=https://your-actual-url.onrender.com
```
Save → Auto-redeploys

---

## ✅ Test Checklist

- [ ] App loads
- [ ] Register works
- [ ] Login works
- [ ] Search works
- [ ] Save results works
- [ ] Export works

---

## 🌐 Add Custom Domain Later

### In Render:
1. Settings → Custom Domain
2. Add: `app.yourdomain.com`
3. Copy CNAME record

### In DNS:
```
Type: CNAME
Name: app
Value: unbuilt.onrender.com
```

### Update Env Vars:
```
CORS_ORIGIN=https://app.yourdomain.com,https://unbuilt.onrender.com
```

---

## 🔐 OAuth Later

### Create OAuth Apps:
- Google: https://console.cloud.google.com/apis/credentials
- GitHub: https://github.com/settings/developers

### Add Callback URLs:
```
https://your-url.onrender.com/api/auth/google/callback
https://your-url.onrender.com/api/auth/github/callback
```

### Add to .env:
```
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...
```

---

## 🐛 Quick Fixes

**Build fails?**
```bash
npm install && npm run build
```

**CORS errors?**
- Check CORS_ORIGIN matches URL exactly
- No trailing slash

**Redis fails?**
- App works without it
- Check REDIS_URL format: `rediss://`

**Database fails?**
- Check DATABASE_URL
- Must have: `?sslmode=require`

---

## 📚 Full Guides

- **Step-by-step:** `RENDER_DEPLOYMENT_GUIDE.md`
- **Domains & OAuth:** `DOMAIN_AND_AUTH_GUIDE.md`
- **Complete summary:** `DEPLOYMENT_SUMMARY.md`
- **Checklist:** `DEPLOYMENT_READY_CHECKLIST.md`

---

**Ready? Let's deploy! 🚀**
