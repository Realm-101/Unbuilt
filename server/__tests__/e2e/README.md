# E2E Testing with Playwright

This directory contains end-to-end tests for the Unbuilt application using Playwright.

## Directory Structure

```
e2e/
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

## Getting Started

### Installation

Install Playwright browsers:

```bash
npm run test:e2e:install
```

### Running Tests

```bash
# Run all E2E tests
npm run test:e2e

# Run tests in headed mode (see browser)
npm run test:e2e:headed

# Run tests in debug mode
npm run test:e2e:debug

# Run tests in specific browser
npm run test:e2e:chromium
npm run test:e2e:firefox
npm run test:e2e:webkit

# Run mobile tests
npm run test:e2e:mobile

# Run tests with UI mode
npm run test:e2e:ui

# View test report
npm run test:e2e:report
```

### Code Generation

Generate test code by recording interactions:

```bash
npm run test:e2e:codegen
```

## Writing Tests

### Test Structure

Follow the AAA (Arrange-Act-Assert) pattern:

```typescript
import { test, expect } from '@playwright/test';
import { LoginPage } from '../page-objects/login.page';

test('should login successfully', async ({ page }) => {
  // Arrange
  const loginPage = new LoginPage(page);
  await loginPage.goto();
  
  // Act
  await loginPage.login('user@example.com', 'password');
  
  // Assert
  await expect(page).toHaveURL('/dashboard');
});
```

### Page Objects

Use Page Objects for maintainability:

```typescript
export class LoginPage extends BasePage {
  private readonly emailInput = '[data-testid="login-email"]';
  private readonly passwordInput = '[data-testid="login-password"]';
  private readonly submitButton = '[data-testid="login-submit"]';
  
  async login(email: string, password: string): Promise<void> {
    await this.fill(this.emailInput, email);
    await this.fill(this.passwordInput, password);
    await this.click(this.submitButton);
  }
}
```

### Selectors

Always use `data-testid` attributes:

```typescript
// ✅ Good
const button = '[data-testid="submit-button"]';

// ❌ Bad
const button = '.btn-primary';
const button = '#submit';
```

## Test Isolation

Each test should be independent:

```typescript
test.beforeEach(async ({ page, context }) => {
  // Clear state
  await context.clearCookies();
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
});
```

## Debugging

### Local Debugging

```bash
# Run with Playwright Inspector
npm run test:e2e:debug

# Run specific test file
npx playwright test auth/login.e2e.test.ts

# Run with trace
npx playwright test --trace on
```

### View Traces

```bash
npx playwright show-trace server/__tests__/reports/test-results/trace.zip
```

## Configuration

Configuration is in `playwright.config.ts`:

- **Browsers**: Chromium, Firefox, WebKit, Mobile Chrome, Mobile Safari
- **Timeouts**: 30s default, 10s actions, 30s navigation
- **Retries**: 2 retries in CI, 0 locally
- **Workers**: 4 parallel workers in CI
- **Reports**: HTML, JUnit, JSON

## Best Practices

### DO

✅ Use Page Objects for UI interactions  
✅ Use `data-testid` attributes for selectors  
✅ Write independent, isolated tests  
✅ Use Playwright's built-in assertions  
✅ Test accessibility on every page  
✅ Clean up test data after each test  

### DON'T

❌ Use CSS classes or IDs as selectors  
❌ Write tests that depend on other tests  
❌ Use manual waits (`setTimeout`)  
❌ Hardcode test data in tests  
❌ Skip accessibility tests  
❌ Ignore flaky tests  

## CI/CD Integration

Tests run automatically on:
- Pull requests
- Pushes to main/develop branches
- Scheduled nightly runs

On failure, CI uploads:
- Screenshots
- Videos
- Trace files
- Test reports

## Resources

- [Playwright Documentation](https://playwright.dev)
- [E2E Testing Guide](../../docs/E2E_TESTING_GUIDE.md)
- [Page Object Pattern](../page-objects/README.md)
- [Test Data Factories](../fixtures/README.md)

## Questions?

For questions about E2E testing:
1. Check the [E2E Testing Guide](../../docs/E2E_TESTING_GUIDE.md)
2. Review existing tests for examples
3. Consult the steering file at `.kiro/steering/e2e-testing.md`
4. Ask in team chat or create an issue
