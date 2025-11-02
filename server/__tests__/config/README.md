# E2E Test Configuration

This directory contains configuration files for E2E testing.

## Files

### `e2e.config.ts`

Centralized configuration for E2E tests including:

- **Base URLs**: Test and API URLs
- **Timeouts**: Default, navigation, action, search completion
- **Retry policies**: Default and flaky test retries
- **Performance thresholds**: Page load, API response, Core Web Vitals
- **Accessibility standards**: WCAG 2.1 AA rules and color contrast ratios
- **Visual regression**: Diff thresholds
- **Test data**: Default test users
- **Browser configuration**: Viewport sizes for different devices
- **Rate limits**: Login, API, search limits
- **Feature flags**: Free and Pro tier limits
- **Security testing**: Required headers and test payloads

### `test-environments.ts`

Environment-specific configurations for:

- **Local**: Development environment (localhost)
- **CI**: Continuous Integration environment
- **Staging**: Staging environment
- **Production**: Production environment (smoke tests only)

Each environment defines:
- Base URL and API URL
- Headless mode setting
- Slow motion delay
- Video/screenshot/trace settings

## Usage

### Import Configuration

```typescript
import { E2E_CONFIG } from '../config/e2e.config';
import { getTestEnvironment, isCI } from '../config/test-environments';

// Use configuration values
const timeout = E2E_CONFIG.timeouts.searchCompletion;
const lcpThreshold = E2E_CONFIG.performance.coreWebVitals.lcp;

// Get current environment
const env = getTestEnvironment();
console.log(`Running tests in ${env.name} environment`);

// Check if running in CI
if (isCI()) {
  // CI-specific logic
}
```

### Environment Variables

Set environment variables to customize configuration:

```bash
# Set test environment
export TEST_ENV=staging

# Set custom URLs
export TEST_BASE_URL=http://localhost:3000
export TEST_API_URL=http://localhost:3000/api

# Set test credentials
export TEST_ADMIN_EMAIL=admin@test.local
export TEST_ADMIN_PASSWORD=SecurePassword123!
```

## Configuration Values

### Timeouts

- **Default**: 30 seconds
- **Navigation**: 30 seconds
- **Action**: 10 seconds
- **Search completion**: 180 seconds (3 minutes)
- **API response**: 5 seconds

### Performance Thresholds

- **Page load**: < 3 seconds
- **API response**: < 500ms (auth endpoints)
- **Search completion**: 2-3 minutes
- **LCP**: < 2.5 seconds
- **FID**: < 100ms
- **CLS**: < 0.1

### Accessibility

- **Standard**: WCAG 2.1 Level AA
- **Rules**: wcag2a, wcag2aa, wcag21a, wcag21aa
- **Color contrast**: 4.5:1 (normal), 3:1 (large text)

### Visual Regression

- **Max diff pixels**: 100
- **Threshold**: 0.2 (20% difference)

## Modifying Configuration

### Adding New Values

1. Update `e2e.config.ts`:

```typescript
export const E2E_CONFIG = {
  // ... existing config
  
  newFeature: {
    timeout: 5000,
    retries: 3,
  },
} as const;
```

2. Update TypeScript type:

```typescript
export type E2EConfig = typeof E2E_CONFIG;
```

### Adding New Environment

1. Update `test-environments.ts`:

```typescript
export type TestEnvironment = 'local' | 'ci' | 'staging' | 'production' | 'new-env';

export const ENVIRONMENTS: Record<TestEnvironment, EnvironmentConfig> = {
  // ... existing environments
  
  'new-env': {
    name: 'new-env',
    baseURL: 'https://new-env.example.com',
    apiURL: 'https://new-env.example.com/api',
    headless: true,
    slowMo: 0,
    video: true,
    screenshot: true,
    trace: true,
  },
};
```

2. Set environment variable:

```bash
export TEST_ENV=new-env
```

## Best Practices

### DO

✅ Use configuration values instead of hardcoding  
✅ Set environment variables for sensitive data  
✅ Document new configuration values  
✅ Use TypeScript types for type safety  
✅ Keep configuration DRY (Don't Repeat Yourself)  

### DON'T

❌ Hardcode URLs, timeouts, or thresholds in tests  
❌ Commit sensitive credentials to version control  
❌ Modify configuration without updating documentation  
❌ Use magic numbers in tests  
❌ Override configuration in individual tests  

## Resources

- [Playwright Configuration](https://playwright.dev/docs/test-configuration)
- [E2E Testing Guide](../../docs/E2E_TESTING_GUIDE.md)
- [Environment Variables](https://playwright.dev/docs/test-parameterize#env-files)
