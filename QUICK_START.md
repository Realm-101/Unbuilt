# Unbuilt - Quick Start Guide

**Version**: 2.1.0 | **Live Demo**: https://unbuilt.one

---

## 🚀 Get Started in 5 Minutes

### Prerequisites
- Node.js 20+
- PostgreSQL database (or Neon account)
- Google Gemini API key (optional for development)

### Installation

```bash
# 1. Clone and install
git clone https://github.com/Stackstudio-cloud/unbuilt.Cloud.git
cd unbuilt.Cloud
npm install

# 2. Configure environment
cp .env.example .env
# Edit .env with your configuration

# 3. Set up database
npm run db:push
npm run migrate:security

# 4. Start development server
npm run dev
```

Visit http://localhost:5000

---

## 📚 Essential Commands

### Development
```bash
npm run dev              # Start dev server (port 5000)
npm run build            # Build for production
npm run check            # TypeScript type checking
```

### Testing
```bash
npm test                 # Run all tests (watch mode)
npm test -- --run        # Run tests once
npm run test:coverage    # Run with coverage
npm run test:e2e         # Run E2E tests
```

### Security
```bash
npm run security:checklist      # Comprehensive security validation
npm run security:scan           # Scan for credentials
npm run deployment:validate     # Deployment readiness check
```

### Database
```bash
npm run db:push                 # Push schema to database
npm run migrate:security        # Run security migrations
```

---

## 📖 Key Documentation

### Getting Started
- **[README.md](README.md)** - Complete project overview
- **[CONTRIBUTING.md](CONTRIBUTING.md)** - How to contribute
- **[docs/QUICK_START.md](docs/QUICK_START.md)** - Detailed setup guide

### Development
- **[docs/API.md](docs/API.md)** - API documentation
- **[docs/SERVICES.md](docs/SERVICES.md)** - Service architecture
- **[CODE_QUALITY.md](CODE_QUALITY.md)** - Code quality standards

### Testing
- **[server/__tests__/README.md](server/__tests__/README.md)** - Test quick start
- **[server/__tests__/TESTING_GUIDE.md](server/__tests__/TESTING_GUIDE.md)** - Comprehensive testing guide
- **[docs/E2E_TESTING_GUIDE.md](docs/E2E_TESTING_GUIDE.md)** - E2E testing guide

### Security & Deployment
- **[docs/SECURITY.md](docs/SECURITY.md)** - Security architecture
- **[deployment/README.md](deployment/README.md)** - Deployment guide
- **[DEPLOYMENT_READY_CHECKLIST.md](DEPLOYMENT_READY_CHECKLIST.md)** - Pre-deployment checklist

### Project Status
- **[PROJECT_STATUS_AND_CLEANUP.md](PROJECT_STATUS_AND_CLEANUP.md)** - Current status and roadmap
- **[CHANGELOG.md](CHANGELOG.md)** - Version history

---

## 🎯 Common Tasks

### Add a New Feature
1. Create a spec in `.kiro/specs/your-feature/`
2. Write tests first (TDD approach)
3. Implement the feature
4. Update documentation
5. Run security checklist before committing

### Fix a Bug
1. Write a failing test that reproduces the bug
2. Fix the bug
3. Ensure test passes
4. Run full test suite
5. Update CHANGELOG.md

### Deploy to Production
```bash
# Quick deployment (Windows)
deployment\deploy.bat

# Or step-by-step
npm run security:checklist
npm run deployment:validate
npm run deployment:build
npm run deployment:production
```

---

## 🔧 Troubleshooting

### Database Connection Issues
```bash
# Check DATABASE_URL in .env
# Ensure PostgreSQL is running
# Run migrations
npm run db:push
npm run migrate:security
```

### Test Failures
```bash
# Run specific test file
npm test -- path/to/test.ts

# Run with verbose output
npm test -- --reporter=verbose

# Check test documentation
cat server/__tests__/README.md
```

### Build Errors
```bash
# Check TypeScript errors
npm run check

# Clean and rebuild
rm -rf dist node_modules
npm install
npm run build
```

---

## 🌟 Key Features

- **AI-Powered Gap Analysis** - Discover market opportunities
- **Action Plan Generator** - 4-phase development roadmaps
- **Professional Exports** - PDF reports, CSV data, pitch decks
- **Resource Library** - Startup tools and documentation
- **Enterprise Security** - JWT auth, RBAC, rate limiting, monitoring

---

## 📊 Project Stats

- **TypeScript Coverage**: 92%
- **Test Coverage**: 93.49% (security), 88.18% (auth)
- **Tests**: 1,414 passing, 0 failing
- **Security Grade**: A+
- **Build Status**: ✅ Passing

---

## 🆘 Need Help?

- **Documentation**: Check `docs/` directory
- **GitHub Issues**: Report bugs and request features
- **Security Issues**: Email security@unbuilt.one
- **Live Demo**: https://unbuilt.one

---

## 🎉 You're Ready!

Start exploring the codebase:
- Frontend: `client/src/`
- Backend: `server/`
- Shared types: `shared/`
- Tests: `server/__tests__/`
- Documentation: `docs/`

**Happy coding!** 🚀
