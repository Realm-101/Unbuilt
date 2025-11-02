# E2E Testing Standards

## Overview

This steering file defines standards and best practices for end-to-end (E2E) testing in the Unbuilt application. All E2E tests use Playwright with the Page Object pattern for maintainability and reliability.

## Test Organization

### Directory Structure

```
server/__tests__/e2e/
├── auth/                    # Authentication tests
├── features/                # Core feature tests
├── sharing/                 # Sharing and export tests
├── navigation/              # Navigation and UX tests
├── accessibility/           # WCAG compliance tests
├── visual/                  # Visual regression tests
├── performance/             # Performance tests
├── security/                # Security tests
└── documentation/           # Documentation validation tests
```

### Page Objects

```
server/__tests__/page-objects/
├── base.page.ts            # Base class with common functionality
├── login.page.ts           # Login page interactions
├── dashboard.page.ts       # Dashboard interactions
├── search.page.ts          # Search creation
├── search-results.page.ts  # Search results viewing
├── conversation.page.ts    # AI conversations
├── resource-library.page.ts # Resource library
├── project.page.ts         # Project management
└── settings.page.ts        # Settings page
```

## Page Object Pattern

### Base Page Class

All Page Objects MUST extend BasePage:

```typescript
import { BasePage } from './base.page';

export class MyPage extends BasePage {
  // Define selectors as private readonly
  private readonly myButton = '[data-testid="my-button"]';
  
  constructor(page: Page) {
    super(page);
  }
  
  // Implement high-level methods
  async clickMyButton(): Promise<void> {
    await this.click(this.myButton);
  }
}
```

### Selector Strategy

1. **Always use data-testid attributes** for stable selectors
2. **Never use CSS classes or IDs** that may change with styling
3. **Avoid XPath** unless absolutely necessary
4. **Use semantic selectors** when data-testid is not available

```typescript
// ✅ Good
private readonly submitButton = '[data-testid="submit-button"]';

// ❌ Bad
private readonly submitButton = '.btn-primary';
private readonly submitButton = '#submit';
```

### Method Naming

- Use descriptive, action-oriented names
- Prefix with action verb (click, fill, get, is, wait)
- Return appropriate types (Promise<void>, Promise<string>, Promise<boolean>)

```typescript
// ✅ Good
async clickSubmitButton(): Promise<void>
async getErrorMessage(): Promise<string>
async isFormVisible(): Promise<boolean>
async waitForResults(): Promise<void>

// ❌ Bad
async submit(): Promise<void>  // Too generic
async error(): Promise<string>  // Not descriptive
async visible(): Promise<boolean>  // Missing context
```

## Test Writing Standards

### Test Structure (AAA Pattern)

```typescript
test('should create new search successfully', async ({ page }) => {
  // Arrange - Set up test data and page objects
  const searchPage = new SearchPage(page);
  const testQuery = 'Gaps in sustainable packaging';
  
  // Act - Perform the action
  await searchPage.goto();
  await searchPage.submitSearch(testQuery);
  await searchPage.waitForSearchCompletion();
  
  // Assert - Verify the results
  const resultsPage = new SearchResultsPage(page);
  await expect(resultsPage.getInnovationScore()).resolves.toBeGreaterThan(0);
});
```

### Test Isolation

Each test MUST be completely independent:

```typescript
test.beforeEach(async ({ page, context }) => {
  // Clear state
  await context.clearCookies();
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  
  // Create fresh test data
  const testUser = await UserFactory.create();
  await testUser.persist();
  
  // Store for cleanup
  (page as any).testUser = testUser;
});

test.afterEach(async ({ page }) => {
  // Cleanup test data
  const testUser = (page as any).testUser;
  if (testUser) {
    await testUser.cleanup();
  }
});
```

### Assertions

Use Playwright's built-in assertions:

```typescript
// ✅ Good - Playwright assertions with auto-retry
await expect(page.locator('[data-testid="message"]')).toBeVisible();
await expect(page.locator('[data-testid="count"]')).toHaveText('5');
await expect(page).toHaveURL('/dashboard');

// ❌ Bad - Manual assertions without retry
const isVisible = await page.locator('[data-testid="message"]').isVisible();
expect(isVisible).toBe(true);
```

## Accessibility Testing

### WCAG 2.1 AA Compliance

All pages MUST pass WCAG 2.1 Level AA:

```typescript
test('should have no accessibility violations', async ({ page }) => {
  await page.goto('/');
  await injectAxe(page);
  
  const violations = await getViolations(page, undefined, {
    runOnly: {
      type: 'tag',
      values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']
    }
  });
  
  expect(violations).toHaveLength(0);
});
```

### Keyboard Navigation

All interactive elements MUST be keyboard accessible:

```typescript
test('should be keyboard navigable', async ({ page }) => {
  await page.goto('/');
  
  // Tab through elements
  await page.keyboard.press('Tab');
  
  // Verify focus is visible
  const focusedElement = await page.evaluate(() => {
    const el = document.activeElement;
    const styles = window.getComputedStyle(el!);
    return styles.outline !== 'none' || styles.boxShadow !== 'none';
  });
  
  expect(focusedElement).toBeTruthy();
});
```

## Performance Testing

### Core Web Vitals Thresholds

All pages MUST meet these thresholds:

- **LCP (Largest Contentful Paint)**: < 2.5 seconds
- **FID (First Input Delay)**: < 100 milliseconds
- **CLS (Cumulative Layout Shift)**: < 0.1

```typescript
test('should meet Core Web Vitals', async ({ page }) => {
  await page.goto('/');
  
  const metrics = await page.evaluate(() => {
    return new Promise((resolve) => {
      new PerformanceObserver((list) => {
        const lcp = list.getEntries().find(e => e.entryType === 'largest-contentful-paint');
        resolve({ lcp: lcp?.startTime || 0 });
      }).observe({ entryTypes: ['largest-contentful-paint'] });
    });
  });
  
  expect(metrics.lcp).toBeLessThan(2500);
});
```

### Page Load Times

- Homepage: < 3 seconds
- Dashboard: < 3 seconds
- Search results: < 3 seconds
- API responses: < 500ms

## Visual Regression Testing

### Screenshot Comparison

Use Playwright's built-in screenshot comparison:

```typescript
test('should match visual baseline', async ({ page }) => {
  await page.goto('/dashboard');
  await page.waitForLoadState('networkidle');
  
  await expect(page).toHaveScreenshot('dashboard.png', {
    maxDiffPixels: 100,
    threshold: 0.2
  });
});
```

### Updating Baselines

When UI changes are intentional:

```bash
# Update all baselines
npm run test:e2e -- --update-snapshots

# Update specific test
npm run test:e2e -- visual/theme-validation.e2e.test.ts --update-snapshots
```

## Security Testing

### Required Security Tests

1. **Security Headers**: Verify CSP, HSTS, X-Frame-Options, etc.
2. **Input Validation**: Test SQL injection and XSS prevention
3. **Rate Limiting**: Verify rate limits are enforced
4. **Authentication**: Test JWT validation and session management

```typescript
test('should have security headers', async ({ page }) => {
  const response = await page.goto('/');
  const headers = response?.headers();
  
  expect(headers?.['content-security-policy']).toBeDefined();
  expect(headers?.['strict-transport-security']).toBeDefined();
  expect(headers?.['x-frame-options']).toBe('DENY');
});
```

## Test Data Management

### Factories

Use factories for consistent test data:

```typescript
// Create test user
const user = await UserFactory.create({
  email: 'test@example.com',
  plan: 'pro'
});

// Create test search
const search = await SearchFactory.create(user.id, {
  query: 'Test query',
  innovationScore: 85
});
```

### Cleanup

Always clean up test data:

```typescript
test.afterEach(async () => {
  await UserFactory.cleanup(testUser.id);
  await SearchFactory.cleanup(testSearch.id);
});
```

## CI/CD Integration

### Running Tests in CI

Tests run automatically on:
- Pull requests
- Pushes to main/develop branches
- Scheduled nightly runs

### Test Artifacts

On failure, CI uploads:
- Screenshots
- Videos
- Trace files
- Test reports

### Parallel Execution

Tests run in parallel across multiple browsers:
- Chromium
- Firefox
- WebKit
- Mobile Chrome
- Mobile Safari

## Debugging Tests

### Local Debugging

```bash
# Run tests in headed mode
npm run test:e2e -- --headed

# Run specific test file
npm run test:e2e -- auth/login.e2e.test.ts

# Debug with Playwright Inspector
npm run test:e2e -- --debug

# Generate trace for failed test
npm run test:e2e -- --trace on
```

### Viewing Traces

```bash
# Open trace viewer
npx playwright show-trace server/__tests__/reports/traces/trace.zip
```

## Best Practices

### DO

✅ Use Page Objects for all UI interactions
✅ Use data-testid attributes for selectors
✅ Write independent, isolated tests
✅ Use Playwright's built-in assertions
✅ Test accessibility on every page
✅ Measure performance metrics
✅ Clean up test data after each test
✅ Use factories for test data creation
✅ Run tests in parallel when possible
✅ Capture screenshots/videos on failure

### DON'T

❌ Use CSS classes or IDs as selectors
❌ Write tests that depend on other tests
❌ Use manual waits (setTimeout)
❌ Hardcode test data in tests
❌ Skip accessibility tests
❌ Ignore flaky tests
❌ Leave test data in database
❌ Use XPath unless necessary
❌ Test implementation details
❌ Commit failing tests

## Flaky Test Management

### Identifying Flaky Tests

Monitor test stability in CI:
- Track retry rates
- Identify tests that fail intermittently
- Review test execution times

### Fixing Flaky Tests

1. **Add proper waits**: Use `waitForSelector`, `waitForLoadState`
2. **Improve selectors**: Use more stable data-testid attributes
3. **Increase timeouts**: For slow operations (search completion)
4. **Add retry logic**: For network-dependent operations
5. **Isolate test data**: Ensure no data conflicts

### Temporary Retries

Use retries sparingly:

```typescript
// Only for known flaky tests being fixed
test.describe.configure({ retries: 2 });
```

## Performance Optimization

### Test Execution Speed

- Use `test.describe.configure({ mode: 'parallel' })` for independent tests
- Reuse browser contexts when possible
- Minimize navigation between pages
- Use API calls for setup when possible

### Resource Usage

- Limit concurrent workers in CI (4 workers)
- Use headless mode in CI
- Clean up resources after tests
- Disable unnecessary browser features

## Maintenance

### Regular Updates

- Update Playwright monthly
- Review and update baselines after UI changes
- Fix flaky tests immediately
- Update Page Objects when UI changes
- Keep documentation current

### Test Health Monitoring

Track these metrics:
- Pass rate (target: >95%)
- Flaky test rate (target: <5%)
- Average execution time
- Coverage of documented features

## Documentation Requirements

### Test Documentation

Each test file SHOULD include:
- Description of what is being tested
- Reference to requirements
- Setup/teardown requirements
- Known issues or limitations

```typescript
/**
 * Authentication E2E Tests
 * 
 * Tests user registration, login, and session management flows.
 * 
 * Requirements: 2.1, 2.2, 2.3, 2.4
 * 
 * Setup: Requires clean database state
 * Cleanup: Removes test users after execution
 */
```

### Page Object Documentation

Each Page Object SHOULD include:
- Purpose and scope
- Available methods
- Example usage

```typescript
/**
 * LoginPage - Handles login page interactions
 * 
 * Example:
 * ```
 * const loginPage = new LoginPage(page);
 * await loginPage.goto();
 * await loginPage.login('user@example.com', 'password');
 * ```
 */
```

## Questions or Issues?

For questions about E2E testing:
1. Check this steering file
2. Review existing tests for examples
3. Consult the E2E Testing Guide in docs/
4. Ask in team chat or create an issue
