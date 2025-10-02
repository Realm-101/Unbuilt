# Credential Security Guide

This document outlines the security measures implemented to prevent hardcoded credentials and ensure secure credential management.

## Overview

The application implements multiple layers of protection against hardcoded credentials:

1. **Environment-based configuration** - All credentials are loaded from environment variables
2. **Automated credential detection** - Scripts scan for potential hardcoded credentials
3. **Production safety checks** - Demo credentials are blocked in production
4. **Secure documentation** - All examples use placeholders instead of real credentials

## Environment Variables

### Required Security Variables

```bash
# JWT Authentication (Required for production)
JWT_ACCESS_SECRET=[your_jwt_access_secret_min_32_chars]
JWT_REFRESH_SECRET=[your_jwt_refresh_secret_min_32_chars_different_from_access]
COOKIE_SECRET=[your_cookie_secret_min_32_chars]

# Database
DATABASE_URL=[your_database_connection_string]
```

### Demo User Configuration (Development Only)

```bash
# Demo User Configuration (Development only)
# Leave empty in production to disable demo user creation
DEMO_USER_EMAIL=[your_demo_email]
DEMO_USER_PASSWORD=[your_secure_password_min_8_chars]
```

**Important:** Demo user credentials are automatically blocked in production environments.

## Credential Detection System

### Automated Scanning

The application includes automated credential detection that scans for:

- Hardcoded passwords and API keys
- Database connection strings with embedded credentials
- JWT secrets and tokens
- Common test credentials
- Email/password combinations

### Running Credential Scans

```bash
# Basic scan
npm run security:scan

# Strict scan (fails on high severity issues)
npm run security:scan-strict

# Manual scan with options
npx tsx server/scripts/detectCredentials.ts --path ./server --fail-on-high
```

### Pre-commit Hooks

Set up pre-commit hooks to automatically scan for credentials:

**Linux/macOS:**
```bash
# Make script executable
chmod +x scripts/pre-commit-security-check.sh

# Add to git hooks
cp scripts/pre-commit-security-check.sh .git/hooks/pre-commit
```

**Windows:**
```powershell
# Copy PowerShell script
Copy-Item scripts/pre-commit-security-check.ps1 .git/hooks/pre-commit.ps1
```

## Demo User Security

### Development Environment

The demo user service provides secure demo user creation for development:

- **Environment-based**: Uses `DEMO_USER_EMAIL` and `DEMO_USER_PASSWORD` environment variables
- **Validation**: Enforces email format and password strength requirements
- **Single creation**: Only creates demo user once per application instance
- **Graceful handling**: Skips creation if user already exists or credentials are invalid

### Production Safety

- **Automatic blocking**: Demo user creation is automatically disabled in production
- **Environment validation**: Warns if demo credentials are set in production
- **Security logging**: All demo user operations are logged for audit purposes

### Password Requirements

Demo user passwords must meet these requirements:
- Minimum 8 characters
- At least one letter
- At least one number

## Security Best Practices

### For Developers

1. **Never commit credentials**: Use environment variables for all sensitive data
2. **Use placeholders in documentation**: Replace real credentials with `[placeholder]` format
3. **Run security scans**: Use `npm run security:scan` before committing
4. **Review environment files**: Ensure `.env.example` uses placeholders only

### For DevOps/Deployment

1. **Environment validation**: Application validates required environment variables on startup
2. **Production checks**: Demo credentials are automatically blocked in production
3. **Secure defaults**: Missing optional variables use secure defaults
4. **Logging**: Security events are logged without exposing sensitive data

### For Security Audits

1. **Automated scanning**: Credential detection runs in CI/CD pipelines
2. **Pattern matching**: Advanced regex patterns detect various credential formats
3. **Severity classification**: Issues are classified as low, medium, or high severity
4. **Audit trails**: All security-related operations are logged

## Troubleshooting

### Common Issues

**"Missing required environment variables" error:**
- Ensure all required security variables are set
- Check variable names match exactly (case-sensitive)
- Verify minimum length requirements (32 characters for secrets)

**"Demo user credentials detected in production" warning:**
- Remove `DEMO_USER_EMAIL` and `DEMO_USER_PASSWORD` from production environment
- Demo users are automatically disabled in production for security

**Credential detection false positives:**
- Review the detected pattern to understand why it was flagged
- Ensure environment variables are used instead of hardcoded values
- Update patterns in `server/utils/credentialDetection.ts` if needed

### Getting Help

If you encounter security-related issues:

1. Run `npm run security:scan` for detailed information
2. Check the logs for specific error messages
3. Review this documentation for best practices
4. Consult the security team for production deployments

## Implementation Details

### Files Modified

- `.env.example` - Updated to use placeholder credentials
- `README.md` - Updated documentation to use placeholders
- `server/services/demoUser.ts` - Enhanced with production safety checks
- `server/utils/credentialDetection.ts` - Comprehensive credential detection
- `server/scripts/detectCredentials.ts` - CLI tool for credential scanning

### Security Measures Added

1. **Production blocking** - Demo user creation blocked in production
2. **Environment validation** - Startup validation of security variables
3. **Credential detection** - Automated scanning for hardcoded credentials
4. **Secure documentation** - All examples use placeholders
5. **Pre-commit hooks** - Automated security checks before commits

This comprehensive approach ensures that credentials are managed securely throughout the development lifecycle while maintaining ease of use for developers.