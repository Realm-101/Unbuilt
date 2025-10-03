# Contributing to Unbuilt

Thank you for your interest in contributing to Unbuilt! This document provides guidelines and information for contributors.

## 🚀 Getting Started

### Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js 20+** - [Download](https://nodejs.org/)
- **npm 10+** - Comes with Node.js
- **PostgreSQL 14+** - [Download](https://www.postgresql.org/download/)
- **Git** - [Download](https://git-scm.com/)
- **Code Editor** - VS Code recommended with extensions:
  - ESLint
  - Prettier
  - TypeScript and JavaScript Language Features
  - Tailwind CSS IntelliSense

**Knowledge Requirements:**
- TypeScript fundamentals
- React and React Hooks
- Express.js and middleware
- PostgreSQL and SQL basics
- RESTful API design
- Git workflow

### Development Setup

#### 1. Fork and Clone

```bash
# Fork the repository on GitHub first, then:
git clone https://github.com/YOUR_USERNAME/unbuilt.Cloud.git
cd unbuilt.Cloud
```

#### 2. Install Dependencies

```bash
npm install
```

**Note:** If you encounter installation errors, try:
```bash
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

#### 3. Environment Setup

```bash
# Copy the example environment file
cp .env.example .env
```

**Required Environment Variables:**

Edit `.env` and configure the following:

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/unbuilt_dev

# Authentication
JWT_SECRET=your-secure-random-string-here
JWT_REFRESH_SECRET=another-secure-random-string

# Session
SESSION_SECRET=yet-another-secure-random-string

# API Keys (optional for basic development)
GEMINI_API_KEY=your-gemini-key
PERPLEXITY_API_KEY=your-perplexity-key

# Server
NODE_ENV=development
PORT=5000
```

**Generating Secure Secrets:**
```bash
# On Linux/Mac:
openssl rand -base64 32

# On Windows (PowerShell):
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Minimum 0 -Maximum 256 }))
```

#### 4. Database Setup

```bash
# Create the database
createdb unbuilt_dev

# Push schema to database
npm run db:push

# Run security migrations
npm run migrate:security
```

**Troubleshooting Database Setup:**
- Ensure PostgreSQL is running: `pg_isready`
- Check connection: `psql -U postgres -d unbuilt_dev`
- See [DATABASE_SETUP.md](./DATABASE_SETUP.md) for detailed instructions

#### 5. Verify Installation

```bash
# Run type checking
npm run check

# Run tests
npm test

# Build the application
npm run build
```

All commands should complete without errors.

#### 6. Start Development Server

```bash
npm run dev
```

The application should be available at:
- **Frontend:** http://localhost:5000
- **API:** http://localhost:5000/api

#### 7. Create a Test Account

Navigate to http://localhost:5000 and register a new account to test the application.

## 📝 Development Guidelines

### Coding Standards

#### TypeScript Standards

**Type Safety:**
- ✅ Use explicit types for all function parameters and return values
- ✅ Use interfaces for object shapes, types for unions/intersections
- ✅ Enable strict mode in tsconfig.json
- ❌ Avoid `any` - use `unknown` if type is truly unknown
- ❌ Avoid type assertions (`as`) unless absolutely necessary
- ✅ Use type guards for runtime type checking

**Example:**
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

#### Code Organization

**File Structure:**
- Keep files under 500 lines
- One component/service per file
- Group related functionality in directories
- Use index.ts for clean exports

**Naming Conventions:**
- **Files:** kebab-case (`user-service.ts`)
- **Components:** PascalCase (`UserProfile.tsx`)
- **Functions:** camelCase (`getUserById`)
- **Constants:** UPPER_SNAKE_CASE (`MAX_LOGIN_ATTEMPTS`)
- **Interfaces:** PascalCase with descriptive names (`UserSession`)
- **Types:** PascalCase (`ApiResponse<T>`)

#### Function Guidelines

**Keep Functions Small:**
- Maximum 50 lines per function
- Single responsibility principle
- Extract complex logic into helper functions
- Use descriptive names

**Example:**
```typescript
// ✅ Good - Small, focused functions
async function validateUserCredentials(email: string, password: string): Promise<boolean> {
  const user = await findUserByEmail(email);
  if (!user) return false;
  
  return await verifyPassword(password, user.passwordHash);
}

async function findUserByEmail(email: string): Promise<User | null> {
  return await db.query.users.findFirst({
    where: eq(users.email, email)
  });
}

// ❌ Bad - Too long, multiple responsibilities
async function loginUser(email: string, password: string, req: Request, res: Response) {
  // 100+ lines of validation, authentication, session creation, logging, etc.
}
```

#### Error Handling

**Always Handle Errors:**
```typescript
// ✅ Good
try {
  const result = await riskyOperation();
  return { success: true, data: result };
} catch (error) {
  logger.error('Operation failed', { error, context });
  return { success: false, error: 'Operation failed' };
}

// ❌ Bad
const result = await riskyOperation(); // Unhandled promise rejection
```

#### Comments and Documentation

**JSDoc for Public APIs:**
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

**Inline Comments for Complex Logic:**
```typescript
// Calculate exponential backoff with jitter to prevent thundering herd
const backoffMs = Math.min(
  baseDelay * Math.pow(2, attempt) + Math.random() * 1000,
  maxDelay
);
```

### Code Style Tools

**Before Committing:**
```bash
npm run format      # Format code with Prettier
npm run lint        # Check for linting errors
npm run check       # TypeScript type checking
npm test           # Run test suite
```

**Auto-fix Issues:**
```bash
npm run lint:fix    # Auto-fix linting issues
```

### Code Quality Metrics

Maintain these standards:
- **TypeScript Errors:** 0
- **Test Coverage:** >70% overall, >80% for auth
- **Cyclomatic Complexity:** <10 per function
- **File Size:** <500 lines
- **Function Size:** <50 lines

### Commit Messages

Follow conventional commits format:

```
type(scope): description

[optional body]

[optional footer]
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks
- `security`: Security improvements

**Examples:**
```
feat(auth): add two-factor authentication
fix(api): resolve rate limiting issue
docs(readme): update installation instructions
security(middleware): implement CSRF protection
```

### Branch Naming

- `feature/description` - New features
- `fix/description` - Bug fixes
- `security/description` - Security improvements
- `docs/description` - Documentation updates

### Pull Request Process

#### 1. Create a Branch

```bash
git checkout -b feature/your-feature-name
```

#### 2. Make Changes

- Write clean, documented code
- Add tests for new features
- Update documentation as needed
- Follow coding standards

#### 3. Test Your Changes

```bash
# Type checking
npm run check

# Linting
npm run lint

# Run all tests
npm test

# Check coverage
npm run test:coverage

# Build application
npm run build

# Security validation (if applicable)
npm run security:checklist
```

#### 4. Commit Your Changes

```bash
git add .
git commit -m "feat(scope): description"
```

**Commit Message Format:**
```
type(scope): subject

body (optional)

footer (optional)
```

#### 5. Push and Create PR

```bash
git push origin feature/your-feature-name
```

Then create a Pull Request on GitHub.

### Pull Request Checklist

Copy this checklist into your PR description:

```markdown
## PR Checklist

### Code Quality
- [ ] Code follows project coding standards
- [ ] No TypeScript errors (`npm run check`)
- [ ] No linting errors (`npm run lint`)
- [ ] Code is properly formatted (`npm run format`)
- [ ] Functions are small (<50 lines) and focused
- [ ] No `any` types (or justified with comments)
- [ ] Proper error handling implemented

### Testing
- [ ] All tests pass (`npm test`)
- [ ] New features have unit tests
- [ ] Integration tests added for API changes
- [ ] Test coverage meets requirements (>70%)
- [ ] Edge cases are tested
- [ ] Security features are tested

### Documentation
- [ ] Code has JSDoc comments for public APIs
- [ ] Complex logic has inline comments
- [ ] README updated (if needed)
- [ ] API documentation updated (if applicable)
- [ ] CHANGELOG.md updated with changes

### Security
- [ ] No secrets or credentials in code
- [ ] Input validation implemented
- [ ] SQL injection prevention verified
- [ ] XSS prevention verified
- [ ] Authentication/authorization tested
- [ ] Security checklist passed (if applicable)

### Database
- [ ] Database migrations created (if schema changed)
- [ ] Migrations tested locally
- [ ] Rollback plan documented (for schema changes)

### Performance
- [ ] No performance regressions
- [ ] Database queries optimized
- [ ] No N+1 query problems
- [ ] Large datasets handled efficiently

### UI/UX (if applicable)
- [ ] Responsive design tested
- [ ] Accessibility tested (keyboard navigation, screen readers)
- [ ] Cross-browser compatibility verified
- [ ] Screenshots included in PR

### General
- [ ] PR title follows conventional commits format
- [ ] Description clearly explains changes
- [ ] Related issues referenced (Fixes #123)
- [ ] Breaking changes documented
- [ ] CI/CD checks passing
- [ ] Ready for review

## Description

[Describe your changes here]

## Related Issues

Fixes #[issue number]

## Screenshots (if applicable)

[Add screenshots here]

## Breaking Changes

[List any breaking changes or write "None"]

## Additional Notes

[Any additional context or notes for reviewers]
```

### PR Review Process

1. **Automated Checks** - CI/CD runs tests and checks
2. **Code Review** - Maintainer reviews code quality
3. **Security Review** - For security-related changes
4. **Testing** - Reviewer tests functionality
5. **Approval** - PR approved and merged

### After PR is Merged

- Delete your feature branch
- Pull latest changes from main
- Celebrate! 🎉

## 🔒 Security Guidelines

### Security-First Development

- **Never commit secrets** - Use environment variables
- **Validate all inputs** - Use Zod schemas for validation
- **Sanitize user data** - Prevent XSS and injection attacks
- **Use parameterized queries** - Prevent SQL injection
- **Implement rate limiting** - Protect against abuse
- **Log security events** - Track authentication and authorization

### Security Checklist

Before submitting security-related changes:

- [ ] Run `npm run security:scan` to check for credentials
- [ ] Run `npm run security:checklist` for comprehensive validation
- [ ] Update security documentation if needed
- [ ] Test authentication and authorization flows
- [ ] Verify rate limiting and input validation

### Reporting Security Issues

**DO NOT** create public issues for security vulnerabilities.

Instead, email security@unbuilt.one with:
- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

## 🧪 Testing Requirements

### Test Coverage Requirements

**Minimum Coverage Targets:**
- **Overall:** 70% coverage
- **Authentication:** 80% coverage
- **Authorization:** 75% coverage
- **Security Middleware:** 75% coverage
- **API Routes:** 70% coverage

**Coverage is REQUIRED for:**
- All new features
- Bug fixes
- Security changes
- API endpoints
- Middleware

### Running Tests

```bash
# Run all tests
npm test

# Run with coverage report
npm run test:coverage

# Run specific test file
npm test -- auth.test.ts

# Run tests in watch mode
npm test -- --watch

# Run only unit tests
npm test -- server/__tests__/unit

# Run only integration tests
npm test -- server/__tests__/integration
```

### Writing Tests

#### Test Structure (AAA Pattern)

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';

describe('UserService', () => {
  beforeEach(() => {
    // Setup test data
  });

  afterEach(() => {
    // Cleanup
  });

  it('should create a new user with valid data', async () => {
    // Arrange - Set up test data
    const userData = {
      email: 'test@example.com',
      password: 'SecurePass123!',
      firstName: 'Test'
    };

    // Act - Execute the function
    const result = await userService.createUser(userData);

    // Assert - Verify the results
    expect(result.success).toBe(true);
    expect(result.user.email).toBe(userData.email);
    expect(result.user.passwordHash).toBeDefined();
  });
});
```

#### Unit Test Guidelines

**What to Test:**
- ✅ Function inputs and outputs
- ✅ Edge cases and boundary conditions
- ✅ Error handling
- ✅ Business logic
- ✅ Validation rules

**What NOT to Test:**
- ❌ Third-party library internals
- ❌ Framework behavior
- ❌ Trivial getters/setters

**Example Unit Test:**
```typescript
describe('validateEmail', () => {
  it('should accept valid email addresses', () => {
    expect(validateEmail('user@example.com')).toBe(true);
    expect(validateEmail('test.user+tag@domain.co.uk')).toBe(true);
  });

  it('should reject invalid email addresses', () => {
    expect(validateEmail('invalid')).toBe(false);
    expect(validateEmail('@example.com')).toBe(false);
    expect(validateEmail('user@')).toBe(false);
  });

  it('should handle edge cases', () => {
    expect(validateEmail('')).toBe(false);
    expect(validateEmail(null)).toBe(false);
    expect(validateEmail(undefined)).toBe(false);
  });
});
```

#### Integration Test Guidelines

**Test Complete Flows:**
```typescript
describe('Authentication Flow', () => {
  it('should complete full registration and login cycle', async () => {
    // Register new user
    const registerRes = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'newuser@example.com',
        password: 'SecurePass123!',
        firstName: 'New'
      });

    expect(registerRes.status).toBe(201);
    expect(registerRes.body.user).toBeDefined();

    // Login with credentials
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'newuser@example.com',
        password: 'SecurePass123!'
      });

    expect(loginRes.status).toBe(200);
    expect(loginRes.body.accessToken).toBeDefined();

    // Access protected route
    const profileRes = await request(app)
      .get('/api/user/profile')
      .set('Authorization', `Bearer ${loginRes.body.accessToken}`);

    expect(profileRes.status).toBe(200);
    expect(profileRes.body.email).toBe('newuser@example.com');
  });
});
```

#### Test Data Management

**Use Fixtures:**
```typescript
// server/__tests__/fixtures/users.ts
export const testUsers = {
  validUser: {
    email: 'test@example.com',
    password: 'SecurePass123!',
    firstName: 'Test'
  },
  adminUser: {
    email: 'admin@example.com',
    password: 'AdminPass123!',
    role: 'admin'
  }
};
```

**Use Mocks:**
```typescript
// Mock external services
vi.mock('@/services/email', () => ({
  sendEmail: vi.fn().mockResolvedValue({ success: true })
}));
```

#### Security Testing

**Test Security Features:**
```typescript
describe('Security Middleware', () => {
  it('should block requests without valid JWT', async () => {
    const res = await request(app)
      .get('/api/protected')
      .set('Authorization', 'Bearer invalid-token');

    expect(res.status).toBe(401);
  });

  it('should enforce rate limiting', async () => {
    const requests = Array(101).fill(null).map(() =>
      request(app).get('/api/public')
    );

    const responses = await Promise.all(requests);
    const rateLimited = responses.filter(r => r.status === 429);

    expect(rateLimited.length).toBeGreaterThan(0);
  });
});
```

### Test Checklist

Before submitting a PR, ensure:

- [ ] All new code has corresponding tests
- [ ] All tests pass: `npm test`
- [ ] Coverage meets minimum requirements: `npm run test:coverage`
- [ ] No flaky tests (run tests multiple times)
- [ ] Integration tests cover happy path and error cases
- [ ] Security features are tested
- [ ] Edge cases are covered
- [ ] Tests are readable and well-documented

### Debugging Tests

```bash
# Run tests with verbose output
npm test -- --reporter=verbose

# Run single test file
npm test -- path/to/test.ts

# Debug with Node inspector
node --inspect-brk node_modules/.bin/vitest run
```

## 📚 Documentation

### What to Document

- **New Features** - Add to relevant docs in `/docs`
- **API Changes** - Update `docs/API.md`
- **Security Features** - Update `docs/SECURITY.md`
- **Configuration** - Update environment documentation

### Documentation Style

- Use clear, concise language
- Include code examples
- Add diagrams for complex features
- Keep documentation up-to-date

## 🎯 Areas for Contribution

### High Priority

- **Security Enhancements** - Additional security features
- **Test Coverage** - Unit and integration tests
- **Performance Optimization** - Query optimization, caching
- **Accessibility** - WCAG compliance improvements
- **Documentation** - Tutorials, guides, examples

### Feature Ideas

- **Analytics Dashboard** - Usage statistics and insights
- **Export Features** - PDF reports, CSV exports
- **Collaboration Tools** - Team features, sharing
- **API Integrations** - Third-party service integrations
- **Mobile App** - React Native mobile application

### Bug Fixes

Check the [Issues](https://github.com/Stackstudio-cloud/unbuilt.Cloud/issues) page for:
- Bugs labeled `good first issue`
- Feature requests
- Documentation improvements

## 🏗️ Architecture Guidelines

### Frontend (React)

- **Components** - Small, reusable, well-documented
- **Hooks** - Custom hooks for shared logic
- **State Management** - TanStack Query for server state
- **Styling** - Tailwind CSS with custom theme
- **Type Safety** - Proper TypeScript types

### Backend (Express)

- **Routes** - RESTful API design
- **Middleware** - Security, validation, error handling
- **Services** - Business logic separation
- **Database** - Drizzle ORM with type safety
- **Security** - Multi-layer security approach

### Database

- **Schema** - Use Drizzle schema definitions
- **Migrations** - Create migrations for schema changes
- **Queries** - Use Drizzle query builder
- **Indexes** - Add indexes for performance

## 🤝 Code Review

### What We Look For

- **Code Quality** - Clean, readable, maintainable
- **Type Safety** - Proper TypeScript usage
- **Security** - No vulnerabilities introduced
- **Performance** - Efficient algorithms and queries
- **Documentation** - Clear comments and docs
- **Tests** - Adequate test coverage

### Review Process

1. Automated checks (CI/CD)
2. Code review by maintainers
3. Security review for sensitive changes
4. Testing and validation
5. Merge when approved

## 🔧 Troubleshooting

### Common Setup Issues

#### Database Connection Errors

**Problem:** `Error: connect ECONNREFUSED 127.0.0.1:5432`

**Solutions:**
```bash
# Check if PostgreSQL is running
pg_isready

# Start PostgreSQL (varies by OS)
# macOS (Homebrew):
brew services start postgresql

# Linux (systemd):
sudo systemctl start postgresql

# Windows:
# Start from Services or pgAdmin

# Verify connection
psql -U postgres -d unbuilt_dev
```

**Problem:** `FATAL: database "unbuilt_dev" does not exist`

**Solution:**
```bash
# Create the database
createdb unbuilt_dev

# Or using psql:
psql -U postgres
CREATE DATABASE unbuilt_dev;
\q
```

#### Environment Variable Issues

**Problem:** `JWT_SECRET is not defined`

**Solution:**
```bash
# Ensure .env file exists
cp .env.example .env

# Generate secure secrets
openssl rand -base64 32

# Add to .env file
JWT_SECRET=your-generated-secret-here
```

**Problem:** Environment variables not loading

**Solution:**
```bash
# Check .env file location (must be in project root)
ls -la .env

# Verify .env is not in .gitignore (it should be!)
cat .gitignore | grep .env

# Restart development server
npm run dev
```

#### TypeScript Errors

**Problem:** `Cannot find module '@/types/...'`

**Solution:**
```bash
# Check tsconfig.json paths are correct
# Restart TypeScript server in VS Code
# Cmd/Ctrl + Shift + P -> "TypeScript: Restart TS Server"

# Clear TypeScript cache
rm -rf node_modules/.cache
npm run check
```

**Problem:** `Type 'any' is not assignable to type '...'`

**Solution:**
- Add explicit types to function parameters
- Use type guards for runtime checks
- Import proper types from shared/types.ts

#### Build Errors

**Problem:** `npm run build` fails

**Solutions:**
```bash
# Clear build cache
rm -rf dist
rm -rf .vite

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# Check for TypeScript errors
npm run check

# Try building again
npm run build
```

#### Test Failures

**Problem:** Tests fail locally but pass in CI

**Solutions:**
```bash
# Clear test cache
npm test -- --clearCache

# Run tests with fresh database
npm run db:push
npm test

# Check for timing issues
npm test -- --testTimeout=10000
```

**Problem:** `Database is locked` error in tests

**Solution:**
```bash
# Use test database
export NODE_ENV=test
npm run db:push

# Or configure separate test database in .env.test
```

#### Port Already in Use

**Problem:** `Error: listen EADDRINUSE: address already in use :::5000`

**Solutions:**
```bash
# Find process using port 5000
# macOS/Linux:
lsof -i :5000
kill -9 <PID>

# Windows:
netstat -ano | findstr :5000
taskkill /PID <PID> /F

# Or use different port
PORT=5001 npm run dev
```

#### Module Not Found Errors

**Problem:** `Cannot find module 'xyz'`

**Solutions:**
```bash
# Reinstall dependencies
npm install

# Clear npm cache
npm cache clean --force
rm -rf node_modules package-lock.json
npm install

# Check if module is in package.json
npm list xyz
```

### Performance Issues

#### Slow Development Server

**Solutions:**
- Reduce number of open files in editor
- Disable unnecessary VS Code extensions
- Increase Node.js memory: `NODE_OPTIONS=--max-old-space-size=4096 npm run dev`
- Clear Vite cache: `rm -rf node_modules/.vite`

#### Slow Tests

**Solutions:**
```bash
# Run tests in parallel
npm test -- --maxWorkers=4

# Run only changed tests
npm test -- --changed

# Use test.concurrent for independent tests
```

### Git Issues

#### Merge Conflicts

**Solutions:**
```bash
# Update your branch with latest main
git checkout main
git pull origin main
git checkout your-branch
git rebase main

# Resolve conflicts in editor
# Then continue rebase
git add .
git rebase --continue
```

#### Accidentally Committed Secrets

**Solutions:**
```bash
# Remove from last commit
git reset HEAD~1
# Edit files to remove secrets
git add .
git commit -m "your message"

# If already pushed, contact maintainers immediately
# Rotate all exposed credentials
```

### Getting More Help

If you're still stuck:

1. **Check Documentation**
   - [README.md](./README.md) - Project overview
   - [QUICK_START.md](./QUICK_START.md) - Quick setup guide
   - [DATABASE_SETUP.md](./DATABASE_SETUP.md) - Database configuration
   - [docs/](./docs/) - Detailed documentation

2. **Search Existing Issues**
   - Check [GitHub Issues](https://github.com/Stackstudio-cloud/unbuilt.Cloud/issues)
   - Someone may have had the same problem

3. **Ask for Help**
   - Create a new [GitHub Issue](https://github.com/Stackstudio-cloud/unbuilt.Cloud/issues/new)
   - Include:
     - Operating system and version
     - Node.js version (`node --version`)
     - npm version (`npm --version`)
     - Error messages (full stack trace)
     - Steps to reproduce
     - What you've already tried

4. **GitHub Discussions**
   - Ask questions in [Discussions](https://github.com/Stackstudio-cloud/unbuilt.Cloud/discussions)
   - Share ideas and get feedback

## 📞 Getting Help

- **GitHub Discussions** - Ask questions, share ideas
- **GitHub Issues** - Report bugs, request features
- **Documentation** - Check `/docs` directory
- **Live Demo** - Test features at [unbuilt.one](https://unbuilt.one)

## 🎉 Recognition

Contributors will be:
- Listed in CONTRIBUTORS.md
- Mentioned in release notes
- Credited in documentation

## 📄 License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

Thank you for contributing to Unbuilt! Together, we're building a platform that helps discover what doesn't exist yet. 🚀
