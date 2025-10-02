# Environment Configuration Validation

This document describes the environment configuration validation system implemented for security hardening.

## Overview

The environment validator ensures that all required configuration is present and properly formatted before the application starts. This prevents runtime failures and security issues caused by missing or invalid configuration.

## Validation Categories

### Required Configuration

These environment variables are **required** for the application to function properly:

#### JWT Authentication
- `JWT_ACCESS_SECRET` - Secret for signing access tokens (minimum 32 characters)
- `JWT_REFRESH_SECRET` - Secret for signing refresh tokens (minimum 32 characters, must be different from access secret)
- `JWT_ACCESS_EXPIRY` - Access token expiration time (default: 15m)
- `JWT_REFRESH_EXPIRY` - Refresh token expiration time (default: 7d)

#### Database
- `DATABASE_URL` - PostgreSQL connection string

#### Security
- `CORS_ORIGIN` - Allowed CORS origin (default: http://localhost:5000)
- `COOKIE_SECRET` - Secret for cookie signing (minimum 32 characters)
- `RATE_LIMIT_WINDOW` - Rate limiting window in milliseconds (default: 900000)
- `RATE_LIMIT_MAX` - Maximum requests per window (default: 100)

### Optional Configuration

These environment variables are optional but enable additional features:

#### AI Services
- `GEMINI_API_KEY` - Google Gemini AI API key
- `XAI_API_KEY` - xAI API key
- `PERPLEXITY_API_KEY` - Perplexity AI API key

#### Email Service
- `SENDGRID_API_KEY` - SendGrid email service API key

#### Payment Processing
- `STRIPE_SECRET_KEY` - Stripe secret key
- `STRIPE_PUBLISHABLE_KEY` - Stripe publishable key (must be paired with secret key)

#### OAuth Providers
- `GOOGLE_CLIENT_ID` - Google OAuth client ID
- `GOOGLE_CLIENT_SECRET` - Google OAuth client secret (must be paired with client ID)
- `GITHUB_CLIENT_ID` - GitHub OAuth client ID
- `GITHUB_CLIENT_SECRET` - GitHub OAuth client secret (must be paired with client ID)

#### Replit Deployment
- `REPLIT_DOMAINS` - Allowed Replit domains
- `ISSUER_URL` - OIDC issuer URL
- `REPL_ID` - Replit application ID
- `SESSION_SECRET` - Session secret for Replit authentication

## Validation Behavior

### Development Mode
- Missing required secrets generate warnings but don't stop the application
- Temporary secrets are generated for JWT and cookie signing
- All validation warnings are logged with suggestions

### Production Mode
- Missing required configuration causes the application to exit with error code 1
- All secrets must be explicitly provided
- Validation errors are logged before exit

## Validation Rules

### JWT Secrets
- Must be at least 32 characters long
- Access and refresh secrets must be different
- Required in production, optional in development

### Database URL
- Must be a valid PostgreSQL connection string
- Protocol must be `postgresql:` or `postgres:`

### Paired Configuration
- Stripe keys must be configured together
- OAuth provider keys must be configured together

## Security Features

### Sensitive Value Masking
The validator includes a `maskSensitiveValues()` function that:
- Masks sensitive configuration values in logs
- Shows only first 4 and last 4 characters for long values
- Completely masks short sensitive values with `****`

### Configuration Generation
The validator provides a `getSecureConfig()` function that:
- Generates secure defaults for missing development configuration
- Validates all configuration before returning
- Throws errors for missing production configuration

## Usage

The environment validator is automatically run during application startup:

```typescript
import { envValidator } from './server/config/envValidator';

// Validate required configuration
const requiredValidation = envValidator.validateRequired();

// Validate optional configuration
const optionalValidation = envValidator.validateOptional();

// Get secure configuration
const secureConfig = envValidator.getSecureConfig();

// Mask sensitive values for logging
const maskedConfig = envValidator.maskSensitiveValues(secureConfig);
```

## Testing

The environment validator includes comprehensive unit tests covering:
- Required configuration validation
- Optional configuration validation
- Error and warning generation
- Secure configuration generation
- Sensitive value masking

Run tests with:
```bash
npm test -- server/config/envValidator.test.ts --run
```

## Example Configuration

See `.env.example` for a complete example of all supported environment variables with placeholder values.