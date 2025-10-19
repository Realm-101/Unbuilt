# Technology Stack

## Build System

**Package Manager:** npm 10+  
**Build Tool:** Vite 5.4+ (fast HMR, optimized production builds)  
**Bundler:** esbuild for server, Rollup for client  
**Module System:** ES Modules (type: "module" in package.json)

## Frontend Stack

**Framework:** React 18 with TypeScript (strict mode)  
**Router:** Wouter (lightweight React router)  
**State Management:** TanStack Query v5 (server state), Zustand (client state)  
**Styling:** Tailwind CSS 3.4+ with custom theme  
**UI Components:** Radix UI + shadcn/ui  
**Forms:** React Hook Form + Zod validation  
**Icons:** Lucide React, React Icons  
**Charts:** Recharts  
**Animations:** Framer Motion

## Backend Stack

**Runtime:** Node.js 20+  
**Framework:** Express.js 4.21+  
**Language:** TypeScript 5.6+ with ES modules  
**Database:** PostgreSQL 14+ via Neon Database  
**ORM:** Drizzle ORM 0.39+ with Drizzle Kit  
**Authentication:** JWT with refresh token rotation  
**Session:** Express Session with PostgreSQL store  
**WebSocket:** ws library for real-time features

## AI Services

**Primary:** Google Gemini 2.5 Pro (gap analysis)  
**Secondary:** Perplexity AI (market research with web search)

## Security Stack

- JWT authentication with token rotation
- Bcrypt password hashing
- Role-based access control (RBAC)
- Rate limiting with CAPTCHA integration
- Input validation (Zod schemas)
- Security headers (CSP, HSTS, X-Frame-Options)
- Session hijacking detection
- Security event logging

## Database

**Provider:** Neon Database (serverless PostgreSQL)  
**Schema Management:** Drizzle Kit migrations  
**Connection:** @neondatabase/serverless with connection pooling  
**Security:** SSL/TLS encryption, parameterized queries

## Development Tools

**TypeScript:** Strict mode, 92% type coverage  
**Testing:** Vitest 3.2+ (unit, integration, e2e)  
**Coverage:** @vitest/coverage-v8  
**Linting:** ESLint (configured)  
**Formatting:** Prettier (configured)  
**Git Hooks:** Pre-commit security checks

## Common Commands

### Development
```bash
npm run dev              # Start dev server (port 5000)
npm run build            # Build for production
npm run start            # Start production server
npm run check            # TypeScript type checking
npm run type-check       # Comprehensive type validation
```

### Database
```bash
npm run db:push          # Push schema to database
npm run migrate:security # Run security migrations
```

### Testing
```bash
npm test                 # Run all tests (watch mode)
npm test -- --run        # Run tests once
npm run test:coverage    # Run with coverage report
npm run test:unit        # Unit tests only
npm run test:integration # Integration tests only
```

### Security
```bash
npm run security:scan           # Scan for credentials
npm run security:checklist      # Comprehensive validation
npm run deployment:validate     # Deployment readiness
npm run security:maintenance    # Security maintenance tasks
```

### Code Quality
```bash
npm run lint             # Run ESLint
npm run format           # Format with Prettier
npm run validate:types   # Validate TypeScript types
```

### Deployment
```bash
npm run deployment:build       # Build with security validation
npm run deployment:production  # Start production with validation
```

## Path Aliases

**Frontend:**
- `@/*` → `./client/src/*`
- `@shared/*` → `./shared/*`
- `@assets/*` → `./attached_assets/*`

**Backend:**
- `@/*` → `./server/*`
- `@shared/*` → `./shared/*`

## Environment Requirements

**Node.js:** 20+  
**npm:** 10+  
**PostgreSQL:** 14+  
**TypeScript:** 5.6+

## Production Deployment

**Container:** Docker with multi-stage builds  
**Reverse Proxy:** Nginx with SSL termination  
**Orchestration:** Docker Compose  
**Platform:** Replit (current), supports any Node.js host

## Performance Optimizations

- Code splitting with manual chunks
- Lazy loading for routes
- Database connection pooling
- Query optimization with indexes
- Redis caching support (optional)
- CDN-ready static assets
