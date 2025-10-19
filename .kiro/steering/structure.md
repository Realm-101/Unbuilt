# Project Structure & Conventions

## Directory Organization

```
unbuilt/
├── client/              # React frontend
│   └── src/
│       ├── components/  # Reusable UI components
│       ├── pages/       # Route components
│       ├── hooks/       # Custom React hooks
│       ├── types/       # Frontend TypeScript types
│       └── lib/         # Utilities and configs
├── server/              # Express backend
│   ├── routes/          # API route handlers
│   ├── middleware/      # Security & validation
│   ├── services/        # Business logic
│   ├── types/           # Backend type extensions
│   ├── config/          # Configuration
│   ├── utils/           # Helper functions
│   ├── scripts/         # DB migrations & tools
│   └── __tests__/       # Test suite
├── shared/              # Shared types & schemas
├── docs/                # Documentation
├── deployment/          # Production configs
└── .kiro/               # Development specs
```

## Code Organization Principles

### File Structure
- Keep files under 500 lines
- One component/service per file
- Group related functionality in directories
- Use index.ts for clean exports

### Naming Conventions
- **Files:** kebab-case (`user-service.ts`)
- **Components:** PascalCase (`UserProfile.tsx`)
- **Functions:** camelCase (`getUserById`)
- **Constants:** UPPER_SNAKE_CASE (`MAX_LOGIN_ATTEMPTS`)
- **Interfaces/Types:** PascalCase (`UserSession`, `ApiResponse<T>`)

## Type System

### Centralized Type Exports

**Frontend Types** (`client/src/types/index.ts`)
```typescript
// ✅ Import from centralized index
import { UserProfile, ChatMessage } from '@/types';

// ❌ Avoid direct imports
import { UserProfile } from '@/types/user';
```

**Shared Types** (`shared/index.ts`)
```typescript
// Both frontend and backend use same import
import { User, ApiResponse } from '@shared/index';
```

### Type Categories

**Frontend:**
- `collaboration.ts` - Chat, real-time features
- `user.ts` - User profiles, display data
- `analytics.ts` - Data visualization, charts
- `index.ts` - Central export point

**Backend:**
- `express.d.ts` - Express Request extensions

**Shared:**
- `types.ts` - API responses, pagination
- `schema.ts` - Database schemas (Drizzle)
- `auth-schema.ts` - Auth validation (Zod)
- `index.ts` - Central export point

## TypeScript Standards

### Type Safety Rules
- ✅ Explicit types for function parameters and returns
- ✅ Interfaces for object shapes
- ✅ Type guards for runtime checks
- ✅ Strict mode enabled
- ❌ No `any` types (use `unknown` if needed)
- ❌ Avoid type assertions (`as`) unless necessary

### Example
```typescript
// ✅ Good
interface User {
  id: number;
  email: string;
  plan: 'free' | 'pro' | 'enterprise';
}

async function getUser(id: number): Promise<User | null> {
  const user = await db.query.users.findFirst({
    where: eq(users.id, id)
  });
  return user ?? null;
}

// ❌ Bad
function getUser(id: any): any {
  return db.query.users.findFirst({
    where: eq(users.id, id)
  });
}
```

## Function Guidelines

### Keep Functions Small
- Maximum 50 lines per function
- Single responsibility principle
- Extract complex logic into helpers
- Use descriptive names

### Error Handling
```typescript
// ✅ Always handle errors
try {
  const result = await riskyOperation();
  return { success: true, data: result };
} catch (error) {
  logger.error('Operation failed', { error, context });
  return { success: false, error: 'Operation failed' };
}
```

## Documentation Standards

### JSDoc for Public APIs
```typescript
/**
 * Authenticates a user with email and password
 * @param email - User's email address
 * @param password - User's password (will be hashed)
 * @returns Authentication token and user data
 * @throws {AuthenticationError} If credentials are invalid
 */
async function authenticateUser(
  email: string,
  password: string
): Promise<AuthResult> {
  // Implementation
}
```

### Inline Comments for Complex Logic
```typescript
// Calculate exponential backoff with jitter to prevent thundering herd
const backoffMs = Math.min(
  baseDelay * Math.pow(2, attempt) + Math.random() * 1000,
  maxDelay
);
```

## Security Architecture

### Multi-Layer Security

**Network Layer:**
- HTTPS enforcement with HSTS
- Nginx reverse proxy with SSL
- Rate limiting and DDoS protection

**Application Layer:**
- JWT authentication with refresh rotation
- Role-based access control (RBAC)
- Input validation (Zod schemas)
- Session hijacking detection

**Data Layer:**
- Parameterized queries (SQL injection prevention)
- Bcrypt password hashing
- Audit logging
- Data encryption at rest

**Monitoring Layer:**
- Real-time security event detection
- Threat analysis and alerting
- Compliance monitoring

### Security Best Practices
- Never commit secrets (use environment variables)
- Validate all inputs with Zod schemas
- Sanitize user data (XSS prevention)
- Use parameterized queries (SQL injection prevention)
- Implement rate limiting
- Log security events

## Testing Structure

```
server/__tests__/
├── unit/           # Fast, isolated tests
├── integration/    # API endpoint tests
├── e2e/           # End-to-end flows (future)
├── fixtures/      # Reusable test data
├── mocks/         # Mock implementations
└── helpers/       # Test utilities
```

### Coverage Requirements
- Overall: >70%
- Authentication: >80%
- Authorization: >75%
- Security Middleware: >75%
- API Routes: >70%

### Test Pattern (AAA)
```typescript
it('should create user with valid data', async () => {
  // Arrange - Set up test data
  const userData = { email: 'test@example.com', password: 'Pass123!' };
  
  // Act - Execute function
  const result = await userService.createUser(userData);
  
  // Assert - Verify results
  expect(result.success).toBe(true);
  expect(result.user.email).toBe(userData.email);
});
```

## Database Conventions

### Schema Organization
**Core Tables:**
- `users` - User accounts with security metadata
- `searches` - Gap analysis searches
- `subscriptions` - Billing information

**Security Tables:**
- `security_events` - Security event logging
- `password_history` - Password change tracking
- `session_security` - Session monitoring
- `account_lockouts` - Lockout tracking
- `tokens` - JWT token management

### Migration Pattern
- Use Drizzle Kit for schema changes
- Create migrations for all schema changes
- Test migrations locally before deploying
- Document rollback procedures

## API Design

### RESTful Conventions
- `GET /api/resource` - List resources
- `GET /api/resource/:id` - Get single resource
- `POST /api/resource` - Create resource
- `PUT /api/resource/:id` - Update resource
- `DELETE /api/resource/:id` - Delete resource

### Response Format
```typescript
// Success
{
  success: true,
  data: { ... }
}

// Error
{
  success: false,
  error: "Error message"
}

// Paginated
{
  success: true,
  data: [...],
  pagination: {
    page: 1,
    pageSize: 20,
    total: 100
  }
}
```

## Git Workflow

### Branch Naming
- `feature/description` - New features
- `fix/description` - Bug fixes
- `security/description` - Security improvements
- `docs/description` - Documentation

### Commit Messages (Conventional Commits)
```
type(scope): description

[optional body]
```

**Types:** feat, fix, docs, style, refactor, test, chore, security

**Examples:**
```
feat(auth): add two-factor authentication
fix(api): resolve rate limiting issue
security(middleware): implement CSRF protection
```

## Code Quality Metrics

**Maintain:**
- TypeScript Errors: 0
- Test Coverage: >70% overall, >80% auth
- Cyclomatic Complexity: <10 per function
- File Size: <500 lines
- Function Size: <50 lines

## Development Workflow

1. **Security Requirements** - Define security needs
2. **Threat Modeling** - Identify threats and mitigations
3. **Secure Implementation** - Implement with security controls
4. **Security Testing** - Comprehensive validation
5. **Security Review** - Code review with security focus
6. **Deployment Validation** - Security checklist

## Key Architectural Patterns

### Frontend
- Component composition over inheritance
- Custom hooks for shared logic
- TanStack Query for server state
- Zustand for client state
- Tailwind for styling

### Backend
- Middleware-based request processing
- Service layer for business logic
- Repository pattern with Drizzle ORM
- Dependency injection where appropriate
- Error handling middleware

### Security
- Defense in depth (multiple layers)
- Principle of least privilege
- Fail securely (deny by default)
- Security by design (not afterthought)
- Continuous monitoring and logging
