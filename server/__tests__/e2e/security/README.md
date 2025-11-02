# Security E2E Tests

This directory contains end-to-end tests for security features of the Unbuilt application.

## Test Files

### security-headers.e2e.test.ts
Tests security headers implementation across the application:
- **Content-Security-Policy (CSP)**: Validates CSP headers and directives
- **Strict-Transport-Security (HSTS)**: Tests HSTS configuration and persistence
- **X-Frame-Options**: Verifies clickjacking protection
- **X-Content-Type-Options**: Tests MIME type sniffing prevention
- **Referrer-Policy**: Validates referrer policy configuration
- **Additional Headers**: Tests X-XSS-Protection and server information hiding

**Requirements**: 6.1, 6.2

### input-validation.e2e.test.ts
Tests input validation and sanitization:
- **SQL Injection Prevention**: Tests parameterized queries and SQL injection attempts
- **XSS Payload Sanitization**: Validates XSS prevention across forms and inputs
- **CSRF Token Validation**: Tests CSRF protection on state-changing requests
- **Zod Schema Validation**: Validates email format, password complexity, required fields, and field length limits
- **Input Sanitization**: Tests whitespace trimming, special character handling, and unicode safety

**Requirements**: 6.3

### rate-limiting.e2e.test.ts
Tests rate limiting implementation:
- **Login Rate Limiting**: Validates 5 failed attempt limit and account lockout
- **API Rate Limiting**: Tests 429 responses and rate limit headers
- **Search Rate Limiting**: Validates free tier limit (5 searches/month) and pro tier unlimited access
- **Rate Limit Recovery**: Tests rate limit window expiration and reset
- **Bypass Prevention**: Validates rate limiting cannot be bypassed with different user agents or sessions

**Requirements**: 6.2

## Running Security Tests

### Run all security tests
```bash
npm run test:e2e -- server/__tests__/e2e/security
```

### Run specific test file
```bash
npm run test:e2e -- server/__tests__/e2e/security/security-headers.e2e.test.ts
npm run test:e2e -- server/__tests__/e2e/security/input-validation.e2e.test.ts
npm run test:e2e -- server/__tests__/e2e/security/rate-limiting.e2e.test.ts
```

### Run in headed mode (for debugging)
```bash
npm run test:e2e -- server/__tests__/e2e/security --headed
```

### Run with specific browser
```bash
npm run test:e2e -- server/__tests__/e2e/security --project=chromium
npm run test:e2e -- server/__tests__/e2e/security --project=firefox
npm run test:e2e -- server/__tests__/e2e/security --project=webkit
```

## Test Data Requirements

### User Accounts
The tests require the following test user accounts:
- `test@example.com` / `Test123!@#` - Standard test user
- `free-tier@example.com` / `Test123!@#` - Free tier user for search limit tests
- `pro-tier@example.com` / `Test123!@#` - Pro tier user for unlimited search tests

### Database State
Tests assume a clean database state with:
- No existing rate limit records for test users
- Fresh search quotas for free tier users
- Proper user roles and subscription tiers configured

## Security Test Coverage

### Headers Coverage
- ✅ Content-Security-Policy (CSP)
- ✅ Strict-Transport-Security (HSTS)
- ✅ X-Frame-Options
- ✅ X-Content-Type-Options
- ✅ Referrer-Policy
- ✅ X-XSS-Protection (legacy)
- ✅ Server information hiding

### Input Validation Coverage
- ✅ SQL injection prevention
- ✅ XSS payload sanitization
- ✅ CSRF token validation
- ✅ Email format validation
- ✅ Password complexity validation
- ✅ Required field validation
- ✅ Field length validation
- ✅ Special character handling
- ✅ Unicode safety

### Rate Limiting Coverage
- ✅ Login rate limiting (5 attempts)
- ✅ API rate limiting (429 responses)
- ✅ Search rate limiting (free tier: 5/month)
- ✅ Rate limit headers
- ✅ Retry-after information
- ✅ Rate limit recovery
- ✅ Bypass prevention

## Known Issues and Limitations

### CSRF Token Testing
Some CSRF token tests may need adjustment based on the actual CSRF implementation in the application. If CSRF tokens are not implemented, these tests will be skipped or may fail.

### Rate Limit Timing
Rate limit recovery tests that require waiting for time windows to expire are conceptual and may need mocking or extended timeouts in actual implementation.

### IP-Based Rate Limiting
Tests that verify IP-based rate limiting may behave differently in CI environments where all requests come from the same IP address.

## Best Practices

### Test Isolation
- Each test should be independent and not rely on state from other tests
- Use unique email addresses for rate limiting tests to avoid conflicts
- Clear cookies and storage between tests

### Error Handling
- Tests should handle both validation errors and rate limit errors
- Check for appropriate error messages and status codes
- Verify that security errors don't expose sensitive information

### Performance
- Security tests may be slower due to rate limiting delays
- Use appropriate timeouts for rate limit tests
- Consider running security tests separately from other test suites

## Debugging

### Common Issues

**Rate limit tests failing:**
- Check if rate limit store is being cleared between tests
- Verify test users have unique identifiers
- Ensure rate limit windows are configured correctly

**Header tests failing:**
- Verify security middleware is properly configured
- Check if headers are being set in development vs production
- Ensure HTTPS is enabled for HSTS tests

**Input validation tests failing:**
- Verify Zod schemas are properly configured
- Check if validation middleware is applied to routes
- Ensure error messages match expected patterns

### Debug Mode
Run tests with Playwright Inspector:
```bash
npm run test:e2e -- server/__tests__/e2e/security --debug
```

### Trace Files
Generate trace files for failed tests:
```bash
npm run test:e2e -- server/__tests__/e2e/security --trace on
```

View traces:
```bash
npx playwright show-trace server/__tests__/reports/traces/trace.zip
```

## Contributing

When adding new security tests:
1. Follow the existing test structure and naming conventions
2. Add appropriate test documentation and comments
3. Update this README with new test coverage
4. Ensure tests are independent and can run in any order
5. Add appropriate timeouts for rate limiting tests
6. Use data-testid attributes for stable selectors

## References

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Security Headers Best Practices](https://securityheaders.com/)
- [Content Security Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)
- [Rate Limiting Best Practices](https://www.cloudflare.com/learning/bots/what-is-rate-limiting/)
- [Input Validation Guide](https://cheatsheetseries.owasp.org/cheatsheets/Input_Validation_Cheat_Sheet.html)
