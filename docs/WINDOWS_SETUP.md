# Windows Setup Guide

## Quick Fix Applied ✅

The development scripts have been updated to work on Windows using `cross-env`.

## Current Issue: Port Binding Error

The server is failing to start with error: `ENOTSUP: operation not supported on socket 0.0.0.0:5000`

### Possible Causes

1. **Port 5000 is already in use** (common on Windows with AirPlay Receiver)
2. **Windows Firewall blocking the port**
3. **Hyper-V or WSL using the port**

### Solutions

#### Option 1: Change the Port (Recommended)

Edit your `.env` file and change the port:

```env
PORT=3000
# or any other available port
```

#### Option 2: Free Up Port 5000

**Check what's using port 5000:**
```powershell
netstat -ano | findstr :5000
```

**Kill the process (if safe to do so):**
```powershell
taskkill /PID <PID_NUMBER> /F
```

**Disable AirPlay Receiver (common culprit on Windows):**
1. Open Settings
2. Go to System > AirPlay
3. Turn off AirPlay Receiver

#### Option 3: Use a Different Network Interface

Edit your `.env` file:

```env
HOST=127.0.0.1
PORT=3000
```

## Environment Setup

### Required Environment Variables

Create a `.env` file in the root directory:

```env
# Server Configuration
NODE_ENV=development
PORT=3000
HOST=127.0.0.1

# Database (Neon PostgreSQL)
DATABASE_URL=your_database_url_here

# JWT Secrets (generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
JWT_SECRET=your_jwt_secret_here
JWT_REFRESH_SECRET=your_jwt_refresh_secret_here

# Session Secret
SESSION_SECRET=your_session_secret_here

# Google Gemini API (optional for development)
GEMINI_API_KEY=your_gemini_api_key_here

# Demo User (optional)
DEMO_USER_EMAIL=demo@example.com
DEMO_USER_PASSWORD=SecurePassword123!
```

### Generate Secrets

Run this in PowerShell to generate secure secrets:

```powershell
# Generate JWT Secret
node -e "console.log('JWT_SECRET=' + require('crypto').randomBytes(32).toString('hex'))"

# Generate JWT Refresh Secret
node -e "console.log('JWT_REFRESH_SECRET=' + require('crypto').randomBytes(32).toString('hex'))"

# Generate Session Secret
node -e "console.log('SESSION_SECRET=' + require('crypto').randomBytes(32).toString('hex'))"
```

## Development Workflow

### 1. Install Dependencies
```powershell
npm install
```

### 2. Setup Database
```powershell
npm run db:push
npm run migrate:security
```

### 3. Start Development Server
```powershell
npm run dev
```

### 4. Run Tests
```powershell
npm test
```

### 5. Build for Production
```powershell
npm run build
```

## Common Windows Issues

### Issue: `NODE_ENV` not recognized
**Status:** ✅ FIXED - Now using `cross-env`

### Issue: Port binding errors
**Solution:** Change PORT in `.env` to an available port (e.g., 3000, 8080)

### Issue: Database connection fails
**Solution:** 
1. Check DATABASE_URL in `.env`
2. Ensure Neon database is accessible
3. Check firewall settings

### Issue: Build fails with TypeScript errors
**Solution:**
```powershell
npm run type-check  # Check for type errors
npm run build       # Build with type checking
```

### Issue: WebSocket connection errors
**Solution:** These are warnings about external services and can be ignored in development. The app will still work.

## Windows-Specific Commands

### Check Port Usage
```powershell
netstat -ano | findstr :PORT_NUMBER
```

### Kill Process by PID
```powershell
taskkill /PID <PID> /F
```

### Check Node Version
```powershell
node --version  # Should be 20+
```

### Clear npm Cache
```powershell
npm cache clean --force
```

### Reinstall Dependencies
```powershell
Remove-Item -Recurse -Force node_modules
Remove-Item package-lock.json
npm install
```

## Security Notes

### Windows Defender
Windows Defender may flag some npm packages. Add exceptions for:
- Node.js installation directory
- Project directory
- npm global modules directory

### Firewall
Allow Node.js through Windows Firewall:
1. Open Windows Defender Firewall
2. Click "Allow an app through firewall"
3. Find Node.js and check both Private and Public
4. Click OK

## Performance Tips

### Use Windows Terminal
Windows Terminal provides better performance than CMD:
- Download from Microsoft Store
- Set as default terminal
- Use PowerShell 7+ for best experience

### Enable Developer Mode
1. Open Settings
2. Go to Update & Security > For developers
3. Enable Developer Mode
4. Restart if prompted

### Use SSD for node_modules
Ensure your project is on an SSD for faster npm operations.

## Troubleshooting

### Server won't start
1. Check `.env` file exists and has correct values
2. Try a different PORT
3. Check database connection
4. Review error messages in console

### Build fails
1. Run `npm run type-check` to see TypeScript errors
2. Clear build cache: `Remove-Item -Recurse -Force dist`
3. Rebuild: `npm run build`

### Database issues
1. Verify DATABASE_URL in `.env`
2. Test connection: `npm run db:push`
3. Run migrations: `npm run migrate:security`

## Getting Help

If you encounter issues:

1. **Check the error message** - Most errors are self-explanatory
2. **Review this guide** - Common solutions are documented here
3. **Check GitHub Issues** - Someone may have had the same issue
4. **Create an issue** - Provide error messages and environment details

## Next Steps

Once the server starts successfully:

1. Open browser to `http://localhost:3000` (or your PORT)
2. Test authentication flows
3. Try the AI search functionality
4. Review security features
5. Check the documentation in `/docs`

---

**Last Updated:** October 3, 2025  
**Platform:** Windows 10/11  
**Node Version:** 20+
