# Contributing to Unbuilt

Thank you for your interest in contributing to Unbuilt! This document provides guidelines and information for contributors.

## 🚀 Getting Started

### Prerequisites

- Node.js 20+
- PostgreSQL database
- Git
- Basic knowledge of TypeScript, React, and Express.js

### Development Setup

1. **Fork and Clone**
   ```bash
   git clone https://github.com/YOUR_USERNAME/unbuilt.Cloud.git
   cd unbuilt.Cloud
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Database Setup**
   ```bash
   npm run db:push
   npm run migrate:security
   ```

5. **Start Development**
   ```bash
   npm run dev
   ```

## 📝 Development Guidelines

### Code Style

- **TypeScript:** Use strict mode, avoid `any` types
- **Formatting:** Run `npm run format` before committing
- **Linting:** Ensure `npm run lint` passes
- **Type Checking:** Run `npm run type-check` to verify types

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

1. **Create a Branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make Changes**
   - Write clean, documented code
   - Add tests for new features
   - Update documentation as needed

3. **Test Your Changes**
   ```bash
   npm run build          # Ensure build succeeds
   npm run type-check     # Verify types
   npm test              # Run tests
   npm run security:checklist  # Security validation
   ```

4. **Commit and Push**
   ```bash
   git add .
   git commit -m "feat(scope): description"
   git push origin feature/your-feature-name
   ```

5. **Create Pull Request**
   - Provide clear description of changes
   - Reference related issues
   - Include screenshots for UI changes
   - Ensure CI checks pass

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

## 🧪 Testing

### Running Tests

```bash
npm test                    # All tests
npm run test:security      # Security tests
npm run test:integration   # Integration tests
```

### Writing Tests

- Write tests for new features
- Ensure edge cases are covered
- Test error handling
- Verify security measures

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
