# Unbuilt - Innovation Gap Analysis Platform

[![Live Demo](https://img.shields.io/badge/Live-Demo-brightgreen)](https://unbuilt.one)
[![Security](https://img.shields.io/badge/Security-Hardened-green)](docs/SECURITY.md)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![GitHub](https://img.shields.io/badge/GitHub-Repository-black)](https://github.com/Stackstudio-cloud/unbuilt.Cloud)

> Discover what doesn't exist yet. Find market gaps and untapped opportunities with AI-powered analysis.

**🔒 Enterprise-Grade Security** | **🚀 Production-Ready** | **📊 AI-Powered Analysis**

![Unbuilt Demo](./docs/demo.gif)

## 🚀 Live Demo

**Try Unbuilt demo now @ Unbuilt.one** 

Demo credentials for testing:
- **Email:** [DEMO_USER_EMAIL from environment]
- **Password:** [DEMO_USER_PASSWORD from environment]

Set these environment variables for development:
```bash
DEMO_USER_EMAIL=[your_demo_email]
DEMO_USER_PASSWORD=[your_secure_password_min_8_chars]
```

**Note:** Replace the bracketed placeholders with actual values. Demo user credentials are only used in development and should never be set in production.

## 📸 Platform Demo

- **Welcome Tour** - Interactive onboarding that introduces users to AI-powered gap discovery
- **Search Interface** - Clean homepage with flame-themed design and intelligent search suggestions
- **Gap Analysis Results** - Detailed market opportunities with innovation scores and feasibility ratings  
- **Action Plans** - Strategic priorities and step-by-step development roadmaps
- **Business Tools** - Resource library with startup tools, funding strategies, and documentation
- **Professional Experience** - Seamless navigation between features with responsive design

### Key Interface Elements
*AI-powered gap discovery with comprehensive search interface*
*Detailed market opportunities with innovation scores and feasibility ratings*

## 🌟 Overview

Unbuilt is a full-stack web application that helps entrepreneurs and innovators identify market gaps and untapped opportunities. Using AI-powered analysis, it discovers what's missing in various industries and markets, providing detailed insights about feasibility, market potential, and innovation opportunities.

### Key Features

#### 🔍 Core Platform
- **AI-Powered Gap Analysis** - Advanced market research using Google Gemini 2.5 Pro
- **Comprehensive Insights** - Innovation scores, market potential, and feasibility ratings
- **Action Plan Generator** - 4-phase development roadmaps for identified opportunities
- **Competitive Analysis** - Market positioning insights and competitor landscape
- **Market Intelligence** - Demographics, growth opportunities, and market sizing
- **Professional Export** - PDF reports, CSV data, and investor pitch decks

#### 🔒 Enterprise Security
- **Multi-Layer Authentication** - JWT tokens with refresh rotation and session management
- **Advanced Authorization** - Role-based access control with resource ownership validation
- **Input Validation** - Comprehensive Zod schema validation with sanitization
- **Rate Limiting** - Intelligent rate limiting with CAPTCHA integration
- **Security Monitoring** - Real-time threat detection and security event logging
- **Password Security** - Bcrypt hashing with history tracking and account lockout
- **Session Security** - Secure session management with hijacking detection
- **HTTPS Enforcement** - Production HTTPS with security headers and CSRF protection
- **Deployment Security** - Automated security validation and deployment scripts
- **Security Headers** - CSP, HSTS, X-Frame-Options, and comprehensive XSS/CSRF protection

#### 🎨 User Experience
- **Professional UI** - Enhanced navigation with prominent branding and comprehensive help system
- **Responsive Design** - Mobile-first approach with hamburger navigation
- **Dark Theme** - Neon flame aesthetic with perfect contrast optimization
- **Subscription Tiers** - Free (5 searches/month) and Pro (unlimited) plans

## 🎨 Design Theme

Unbuilt features a unique "Neon Flame" theme with a mysterious "black hole" aesthetic that perfectly captures the concept of exploring the unknown and discovering what doesn't exist yet. The design uses:

- **Dark Mode First** - Optimized for the neon flame aesthetic
- **Color Palette** - Purple, red, orange, and white flame colors
- **Ultra-dark Gradients** - Creates dramatic contrast and mysterious atmosphere
- **Custom SVG Logo** - Transparent flame-themed branding

## 🚀 Quick Start

### Prerequisites

- Node.js 20+ 
- PostgreSQL database
- Google Gemini API key (optional for development)

### Development Setup

1. **Clone and Install**
   ```bash
   git clone https://github.com/Stackstudio-cloud/unbuilt.Cloud.git
   cd unbuilt.Cloud
   npm install
   ```

2. **Environment Configuration**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Database Setup**
   ```bash
   npm run db:push
   npm run migrate:security
   ```

4. **Start Development Server**
   ```bash
   npm run dev
   ```

**Windows Users:** See [Windows Setup Guide](WINDOWS_SETUP.md) for platform-specific instructions and troubleshooting.

### Production Deployment

For production deployment with full security features:

```bash
# Quick deployment (Windows)
deployment\deploy.bat

# Quick deployment (Unix/Linux)
./deployment/deploy

# Or step-by-step validation
npm run security:checklist      # Comprehensive security validation
npm run deployment:validate     # Deployment readiness check
npm run deployment:build        # Build with security validation
npm run deployment:production   # Start production server
```

**Docker Deployment:**
```bash
# Copy and configure environment
cp deployment/production.env.example .env
# Edit .env with your configuration

# Deploy with Docker Compose
docker-compose -f deployment/docker-compose.production.yml up -d
```

See [Deployment Guide](deployment/README.md) for comprehensive production setup.


## 🏗️ Architecture

### Tech Stack

**Frontend**
- React 18 with TypeScript (strict mode)
- Vite for fast development
- Radix UI + shadcn/ui components
- Tailwind CSS with custom theme
- TanStack Query for state management
- Wouter for routing

**Backend**
- Node.js with Express.js
- TypeScript with ES modules (92% type-safe)
- PostgreSQL with Drizzle ORM
- Google Gemini API integration
- RESTful API design
- Enterprise security middleware stack

**Security Infrastructure**
- JWT authentication with token rotation
- Role-based authorization system
- Comprehensive input validation
- Rate limiting and CAPTCHA protection
- Security monitoring and logging
- HTTPS enforcement with security headers
- Session management with hijacking detection

**Database**
- PostgreSQL via Neon Database
- Drizzle ORM with type safety
- Schema migrations with Drizzle Kit
- Security audit logging
- Password history tracking

### Project Structure

```
├── client/              # React frontend
│   ├── src/
│   │   ├── components/  # Reusable UI components
│   │   ├── pages/       # Route components
│   │   ├── hooks/       # Custom React hooks
│   │   └── lib/         # Utilities and configurations
├── server/              # Express backend
│   ├── routes/          # API route handlers
│   ├── middleware/      # Security and validation middleware
│   ├── services/        # Business logic and security services
│   ├── scripts/         # Database migrations and security tools
│   ├── config/          # Configuration and environment validation
│   └── utils/           # Utility functions and helpers
├── shared/              # Shared types and schemas
│   ├── schema.ts        # Database schema definitions
│   └── auth-schema.ts   # Authentication schemas
├── docs/                # Documentation
│   ├── SECURITY.md      # Security documentation
│   ├── *.md             # Feature-specific documentation
├── deployment/          # Production deployment configuration
│   ├── README.md        # Deployment guide
│   ├── docker-compose.production.yml
│   ├── nginx.conf       # Nginx configuration
│   └── deploy.*         # Deployment scripts
└── .kiro/               # Development specifications
    └── specs/           # Feature specifications and tasks
```

### Demo Features

The live demo includes:
- **Full AI Search Functionality** - Real Google Gemini AI integration
- **Complete User Interface** - All pages and features accessible
- **Sample Data** - Pre-loaded search history and results
- **Professional Navigation** - Enhanced header with About and Help pages
- **Responsive Design** - Works perfectly on desktop and mobile devices

### API Endpoints

#### Authentication & Authorization
- `POST /api/auth/register` - User registration with validation
- `POST /api/auth/login` - Secure login with rate limiting
- `POST /api/auth/logout` - Secure logout with session cleanup
- `POST /api/auth/refresh` - JWT token refresh
- `GET /api/auth/user` - Get current user profile
- `POST /api/auth/change-password` - Password change with history validation

#### Core Features
- `POST /api/search` - Create new gap analysis search
- `GET /api/search/:id` - Get search results with detailed analysis
- `GET /api/searches` - Get user's search history
- `POST /api/trial/activate` - Activate free trial for Pro features

#### Security & Monitoring
- `GET /api/security/dashboard` - Security monitoring dashboard (admin)
- `GET /api/security/events` - Security event logs (admin)
- `POST /api/captcha/verify` - CAPTCHA verification
- `GET /health` - Health check endpoint

#### Session Management
- `GET /api/sessions` - List active sessions
- `DELETE /api/sessions/:id` - Terminate specific session
- `DELETE /api/sessions/all` - Terminate all sessions

## 🔒 Security Features

Unbuilt implements enterprise-grade security measures to protect user data and ensure platform integrity:

### Authentication & Authorization
- **Multi-Factor Authentication** - JWT tokens with refresh rotation
- **Role-Based Access Control** - Admin, user, and guest permissions
- **Session Management** - Secure session handling with hijacking detection
- **Password Security** - Bcrypt hashing with complexity requirements and history tracking

### Data Protection
- **Input Validation** - Comprehensive Zod schema validation and sanitization
- **SQL Injection Prevention** - Parameterized queries with Drizzle ORM
- **XSS Protection** - Content Security Policy and input sanitization
- **CSRF Protection** - Token-based CSRF validation

### Infrastructure Security
- **HTTPS Enforcement** - Automatic HTTP to HTTPS redirects
- **Security Headers** - HSTS, CSP, X-Frame-Options, and more
- **Rate Limiting** - Intelligent rate limiting with CAPTCHA integration
- **DDoS Protection** - Request throttling and abuse detection

### Monitoring & Compliance
- **Security Event Logging** - Comprehensive audit trail
- **Real-time Monitoring** - Threat detection and alerting
- **Automated Security Scans** - Credential detection and vulnerability assessment
- **Compliance Tools** - Security checklists and deployment validation

For detailed security documentation, see [Security Guide](docs/SECURITY.md).

## 📊 Performance & Scalability

- **Database Optimization** - Connection pooling and query optimization
- **Caching Strategy** - Intelligent caching with Redis support
- **Load Balancing** - Nginx reverse proxy with SSL termination
- **Container Support** - Docker deployment with health checks
- **Monitoring** - Application performance monitoring and logging

**Current Live Demo:** The application is currently deployed and accessible at [https://unbuilt.one](https://unbuilt.one)


## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🎯 Use Cases

- **Entrepreneurs** - Identify untapped business opportunities before competitors
- **Startups** - Validate market gaps and find product-market fit
- **Investors** - Discover emerging market trends and investment opportunities
- **Product Managers** - Research white space in existing markets
- **Innovation Teams** - Generate breakthrough ideas for R&D initiatives
- **Market Researchers** - Comprehensive gap analysis with AI-powered insights

## 🙏 Acknowledgments

- Built with modern web technologies and best practices
- UI components powered by Radix UI and shadcn/ui
- AI analysis powered by Google Gemini 2.5 Pro
- Database hosting provided by Neon Database
- Deployed on Replit for seamless development and hosting

## 📚 Documentation

### 🔒 Security & Deployment
- **[Security Guide](docs/SECURITY.md)** - Comprehensive security architecture and features
- **[Deployment Guide](deployment/README.md)** - Production deployment with security hardening
- **[API Documentation](docs/API.md)** - Complete API reference with security details
- **[Services Documentation](docs/SERVICES.md)** - Complete service architecture and usage guide
- **[Documentation Index](docs/README.md)** - Complete documentation overview

### 🛠️ Configuration & Setup
- **[Environment Setup](docs/ENVIRONMENT_VALIDATION.md)** - Secure environment configuration
- **[Rate Limiting](docs/RATE_LIMITING.md)** - Rate limiting and DDoS protection
- **[Session Management](docs/SESSION_MANAGEMENT.md)** - Session security and management
- **[Password Security](docs/PASSWORD_SECURITY.md)** - Password policies and security
- **[Authorization](docs/AUTHORIZATION.md)** - Role-based access control (RBAC)
- **[Security Monitoring](docs/SECURITY_MONITORING.md)** - Real-time monitoring and alerting

### 📋 Project Information
- **[Changelog](CHANGELOG.md)** - Version history and security improvements
- **[Code Quality Report](CODE_QUALITY.md)** - Code quality metrics and standards
- **[Contributing Guide](CONTRIBUTING.md)** - How to contribute to the project
- **[Completion Reports](docs/completion-reports/README.md)** - Detailed task completion reports
- **[Progress Reports Archive](docs/progress-reports/README.md)** - Historical development progress (65+ reports)

### 🧪 Testing Documentation
- **[Test Documentation](server/__tests__/README.md)** - Quick start guide for testing
- **[Testing Guide](server/__tests__/TESTING_GUIDE.md)** - Comprehensive testing patterns
- **[Test Infrastructure](server/__tests__/INFRASTRUCTURE_SETUP.md)** - Mock factory and utilities
- **[Test Completion Report](docs/progress-reports/TEST_DEBT_PROJECT_COMPLETE.md)** - Test debt remediation summary
- **[Quick Test Reference](QUICK_TEST_REFERENCE.md)** - Handy reference card for developers

### 🎯 Code Quality
- **TypeScript Coverage:** 92% type-safe (4 known Drizzle ORM limitations)
- **Build Status:** ✅ Passing
- **Security Score:** A+ (comprehensive security implementation)
- **Test Coverage:** 743 tests passing | 93.49% security | 88.18% auth | 0% flaky
- **Test Execution:** ~73 seconds for full suite
- **Documentation:** Comprehensive guides and API reference

See [Test Completion Report](docs/progress-reports/TEST_DEBT_PROJECT_COMPLETE.md) for detailed test metrics.

## 🛠️ Development Tools

### Security Tools
```bash
npm run security:checklist      # Run comprehensive security validation
npm run security:scan          # Scan for credentials and vulnerabilities
npm run security:scan-strict   # Strict credential scanning (fail on high severity)
npm run deployment:validate    # Validate deployment readiness
npm run migrate:security       # Run security database migrations
npm run validate:security      # Validate database security schema
npm run security:maintenance   # Run security maintenance tasks
```

### Testing
```bash
npm test                       # Run all tests (watch mode)
npm test -- --run             # Run all tests once
npm test -- --run --coverage  # Run tests with coverage report
npm run test:security         # Run security-specific tests
npm run test:integration      # Run integration tests
```

**Test Suite Status:** ✅ 743 tests passing | 93.49% security coverage | 0% flaky tests

See [Test Documentation](server/__tests__/README.md) for comprehensive testing guide.

### Development
```bash
npm run dev                   # Start development server
npm run build                 # Build for production (includes type checking)
npm run check                 # TypeScript type checking
npm run type-check            # Comprehensive type validation
```

### Code Quality
```bash
npm run lint                  # Run ESLint
npm run format                # Format code with Prettier
npm run validate:types        # Validate TypeScript types
```

## 📞 Support

- **GitHub Issues** - Report bugs and request features
- **Security Issues** - Email security@unbuilt.one for security concerns
- **Live Demo** - Test all features at [unbuilt.one](https://unbuilt.one)
- **Documentation** - Comprehensive guides in the `/docs` directory

---

**Discover what's missing. Build what's next.** 🚀

*Ready to find your next big opportunity? [Try the live demo now →](https://Unbuilt.one*