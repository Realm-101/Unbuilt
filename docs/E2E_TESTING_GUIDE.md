# E2E Testing Guide

## Overview

This guide provides comprehensive instructions for writing, running, and maintaining end-to-end (E2E) tests for the Unbuilt application. Our E2E testing framework uses Playwright with the Page Object pattern to ensure maintainable, reliable, and comprehensive test coverage.

## Table of Contents

- [Getting Started](#getting-started)
- [Running Tests](#running-tests)
- [Writing Tests](#writing-tests)
- [Page Object Pattern](#page-object-pattern)
- [Test Data Management](#test-data-management)
- [Debugging Tests](#debugging-tests)
- [Best Practices](#best-practices)
- [Common Patterns](#common-patterns)
- [Troubleshooting](#troubleshooting)

## Getting Started

### Prerequisites

- Node.js 20+
- npm 10+
- PostgreSQL database (for test data)

### Installation

E2E testing dependencies are already included in the project. If you need to reinstall:

```bash
npm install
npx playwright install --with-deps
```

### Project Structure

```
server/__tests__/
├── e2e/                          # E2E test suites
│   ├── auth/                     # Authentication tests
│   ├── features/                 # Core feature tests
│   ├── sharing/                  # Sharing and export tests
│   ├── navigation/               # Navigation tests
│   ├── accessibility/            # WCAG compliance tests
│   ├── visual/                   # Visual regression tests
│   ├── performance/              # Performance tests
│   ├── security/                 # Security tests
│   └── documentation/            # Documentation validation
├── page-objects/                 # Page Object Models
├── fixtures/                     # Test data factories
├── helpers/                      # Test utilities
├── config/                       # Test configuration
└── reporters/                    # Custom reporters
```

## Running Tests

### Basic Commands

```bash
# Run all E2E tests
npm run test:e2e

# Run tests in headed mode (see browser)
npm run test:e2e -- --headed

# Run specific test file
npm run test:e2e -- auth/authentication.e2e.test.ts

# Run tests matching a pattern
npm run test:e2e -- --grep "login"

# Run tests in debug mode
npm run test:e2e -- --debug
```

### Browser-Specific Tests

```bash
# Run on specific browser
npm run test:e2e -- --project=chromium
npm run test:e2e -- --project=firefox
npm run test:e2e -- --project=webkit

# Run on mobile browsers
npm run test:e2e -- --project=mobile-chrome
npm run test:e2e -- --project=mobile-safari
```

### Test Filtering

```bash
# Run only tests with specific tag
npm run test:e2e -- --grep @smoke

# Skip tests with specific tag
npm run test:e2e -- --grep-invert @slow

# Run tests in specific directory
npm run test:e2e -- e2e/auth/
```

### Parallel Execution

```bash
# Run with specific number of workers
npm run test:e2e -- --workers=4

# Run tests serially (one at a time)
npm run test:e2e -- --workers=1
```

## Writing Tests

### Test File Structure

Create test files following this pattern:

```typescript
import { test, expect } from '@playwright/test';
import { LoginPage } from '../page-objects/login.page';
import { DashboardPage } from '../page-objects/dashboard.page';
import { UserFactory } from '../fixtures/user.factory';

test.describe('User Authentication', () => {
  let testUser: any;

  test.beforeEach(async ({ page, context }) => {
    // Clear state
    await context.clearCookies();
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });

    // Create test data
    testUser = await UserFactory.create();
    await testUser.persist();
  });

  test.afterEach(async () => {
    // Cleanup
    if (testUser) {
      await testUser.cleanup();
    }
  });

  test('should login successfully with valid credentials', async ({ page }) => {
    // Arrange
    const loginPage = new LoginPage(page);
    
    // Act
    await loginPage.goto();
    await loginPage.login(testUser.email, testUser.password);
    
    // Assert
    const dashboardPage = new DashboardPage(page);
    await expect(page).toHaveURL('/dashboard');
    await expect(dashboardPage.locator('[data-testid="welcome-message"]')).toBeVisible();
  });
});
```

### AAA Pattern (Arrange-Act-Assert)

Always structure tests using the AAA pattern:

```typescript
test('should create new search', async ({ page }) => {
  // Arrange - Set up test data and page objects
  const searchPage = new SearchPage(page);
  const testQuery = 'Gaps in sustainable packaging';
  
  // Act - Perform the action
  await searchPage.goto();
  await searchPage.submitSearch(testQuery);
  await searchPage.waitForSearchCompletion();
  
  // Assert - Verify the results
  const resultsPage = new SearchResultsPage(page);
  const score = await resultsPage.getInnovationScore();
  expect(score).toBeGreaterThan(0);
});
```

### Using Assertions

Use Playwright's built-in assertions with auto-retry:

```typescript
// ✅ Good - Auto-retry assertions
await expect(page.locator('[data-testid="message"]')).toBeVisible();
await expect(page.locator('[data-testid="count"]')).toHaveText('5');
await expect(page).toHaveURL('/dashboard');
await expect(page.locator('[data-testid="button"]')).toBeEnabled();

// ❌ Bad - Manual assertions without retry
const isVisible = await page.locator('[data-testid="message"]').isVisible();
expect(isVisible).toBe(true);
```

## Page Object Pattern

### What is the Page Object Pattern?

The Page Object pattern encapsulates page structure and interactions in dedicated classes, making tests more maintainable and reducing duplication.

### Creating a Page Object

All Page Objects extend `BasePage`:

```typescript
import { Page } from '@playwright/test';
import { BasePage } from './base.page';

export class MyPage extends BasePage {
  // Define selectors as private readonly
  private readonly emailInput = '[data-testid="email-input"]';
  private readonly submitButton = '[data-testid="submit-button"]';
  private readonly errorMessage = '[data-testid="error-message"]';

  constructor(page: Page) {
    super(page);
  }

  // Navigation methods
  async goto(): Promise<void> {
    await super.goto('/my-page');
  }

  // Action methods
  async fillEmail(email: string): Promise<void> {
    await this.fill(this.emailInput, email);
  }

  async clickSubmit(): Promise<void> {
    await this.click(this.submitButton);
  }

  // Query methods
  async getErrorMessage(): Promise<string> {
    return await this.getText(this.errorMessage);
  }

  async isErrorVisible(): Promise<boolean> {
    return await this.locator(this.errorMessage).isVisible();
  }

  // High-level workflow methods
  async submitForm(email: string): Promise<void> {
    await this.fillEmail(email);
    await this.clickSubmit();
  }
}
```

### Selector Strategy

**Always use `data-testid` attributes:**

```typescript
// ✅ Good - Stable, semantic selectors
private readonly loginButton = '[data-testid="login-button"]';
private readonly emailInput = '[data-testid="email-input"]';

// ❌ Bad - Fragile selectors that break with styling changes
private readonly loginButton = '.btn-primary';
private readonly emailInput = '#email';
```

### Method Naming Conventions

- **Action methods**: Start with verb (click, fill, select, toggle)
- **Query methods**: Start with get, is, has
- **Navigation methods**: Use goto, navigateTo
- **Wait methods**: Start with waitFor

```typescript
// Action methods
async clickSubmitButton(): Promise<void>
async fillSearchInput(query: string): Promise<void>
async selectCategory(category: string): Promise<void>

// Query methods
async getErrorMessage(): Promise<string>
async isFormVisible(): Promise<boolean>
async hasResults(): Promise<boolean>

// Navigation methods
async goto(): Promise<void>
async navigateToSettings(): Promise<void>

// Wait methods
async waitForResults(): Promise<void>
async waitForLoadingComplete(): Promise<void>
```

### Using BasePage Methods

The `BasePage` class provides common functionality:

```typescript
// Navigation
await this.goto('/path');
await this.waitForPageLoad();

// Element interactions
await this.click(selector);
await this.fill(selector, value);
const text = await this.getText(selector);
const locator = this.locator(selector);

// Accessibility
await this.checkAccessibility();

// Screenshots
await this.takeScreenshot('screenshot-name');

// Performance
const metrics = await this.measurePerformance();
```

## Test Data Management

### Using Factories

Factories provide consistent test data creation:

```typescript
import { UserFactory } from '../fixtures/user.factory';
import { SearchFactory } from '../fixtures/search.factory';

// Create test user
const user = await UserFactory.create({
  email: 'test@example.com',
  plan: 'pro'
});
await user.persist();

// Create test search
const search = await SearchFactory.create(user.id, {
  query: 'Test query',
  innovationScore: 85
});
await search.persist();

// Cleanup
await user.cleanup();
await search.cleanup();
```

### Test Isolation

Each test must be completely independent:

```typescript
test.beforeEach(async ({ page, context }) => {
  // Clear browser state
  await context.clearCookies();
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  // Create fresh test data
  testUser = await UserFactory.create();
  await testUser.persist();
});

test.afterEach(async () => {
  // Cleanup test data
  if (testUser) {
    await testUser.cleanup();
  }
});
```

## Debugging Tests

### Visual Debugging

```bash
# Run in headed mode to see browser
npm run test:e2e -- --headed

# Run with slow motion (useful for watching interactions)
npm run test:e2e -- --headed --slow-mo=1000
```

### Playwright Inspector

```bash
# Open Playwright Inspector for step-by-step debugging
npm run test:e2e -- --debug

# Debug specific test
npm run test:e2e -- auth/authentication.e2e.test.ts --debug
```

### Trace Viewer

Generate and view traces for failed tests:

```bash
# Run tests with trace on failure
npm run test:e2e -- --trace on

# View trace file
npx playwright show-trace server/__tests__/reports/traces/trace.zip
```

### Screenshots and Videos

Screenshots and videos are automatically captured on failure:

```
server/__tests__/reports/
├── screenshots/    # Screenshots on failure
└── videos/         # Videos on failure
```

### Console Logging

Add debug logging in tests:

```typescript
test('should login', async ({ page }) => {
  // Enable console logging
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  
  // Your test code
  await loginPage.goto();
  console.log('Navigated to login page');
  
  await loginPage.login(email, password);
  console.log('Submitted login form');
});
```

### Pause Execution

```typescript
test('should login', async ({ page }) => {
  await loginPage.goto();
  
  // Pause execution for manual inspection
  await page.pause();
  
  await loginPage.login(email, password);
});
```

## Best Practices

### DO ✅

- **Use Page Objects** for all UI interactions
- **Use data-testid** attributes for selectors
- **Write independent tests** that don't depend on other tests
- **Use Playwright assertions** with auto-retry
- **Test accessibility** on every page
- **Clean up test data** after each test
- **Use factories** for test data creation
- **Run tests in parallel** when possible
- **Capture artifacts** on failure

### DON'T ❌

- **Don't use CSS classes** or IDs as selectors
- **Don't write dependent tests** that rely on execution order
- **Don't use setTimeout** - use proper waits instead
- **Don't hardcode test data** in tests
- **Don't skip accessibility tests**
- **Don't ignore flaky tests**
- **Don't leave test data** in the database
- **Don't test implementation details**
- **Don't commit failing tests**

### Waiting for Elements

```typescript
// ✅ Good - Explicit waits
await page.waitForSelector('[data-testid="results"]');
await page.waitForLoadState('networkidle');
await page.waitForURL('/dashboard');

// ❌ Bad - Arbitrary timeouts
await page.waitForTimeout(5000);
```

### Error Handling

```typescript
// ✅ Good - Descriptive error messages
await expect(page.locator('[data-testid="error"]'))
  .toHaveText('Invalid email format', { 
    timeout: 5000 
  });

// ✅ Good - Soft assertions for multiple checks
await expect.soft(page.locator('[data-testid="title"]')).toBeVisible();
await expect.soft(page.locator('[data-testid="subtitle"]')).toBeVisible();
```

## Common Patterns

### Authentication Flow

```typescript
test('should require authentication', async ({ page }) => {
  const loginPage = new LoginPage(page);
  const dashboardPage = new DashboardPage(page);
  
  // Try to access protected page
  await page.goto('/dashboard');
  
  // Should redirect to login
  await expect(page).toHaveURL('/login');
  
  // Login and verify access
  await loginPage.login(testUser.email, testUser.password);
  await expect(page).toHaveURL('/dashboard');
});
```

### Form Submission

```typescript
test('should submit form with validation', async ({ page }) => {
  const formPage = new FormPage(page);
  
  // Submit empty form
  await formPage.goto();
  await formPage.clickSubmit();
  
  // Verify validation errors
  await expect(formPage.locator('[data-testid="email-error"]'))
    .toHaveText('Email is required');
  
  // Submit valid form
  await formPage.fillForm({
    email: 'test@example.com',
    name: 'Test User'
  });
  await formPage.clickSubmit();
  
  // Verify success
  await expect(page).toHaveURL('/success');
});
```

### API Mocking

```typescript
test('should handle API errors', async ({ page }) => {
  // Mock API response
  await page.route('**/api/searches', route => {
    route.fulfill({
      status: 500,
      body: JSON.stringify({ error: 'Server error' })
    });
  });
  
  const searchPage = new SearchPage(page);
  await searchPage.goto();
  await searchPage.submitSearch('test query');
  
  // Verify error handling
  await expect(page.locator('[data-testid="error-message"]'))
    .toHaveText('Failed to create search');
});
```

### File Upload

```typescript
test('should upload file', async ({ page }) => {
  const uploadPage = new UploadPage(page);
  await uploadPage.goto();
  
  // Upload file
  await page.setInputFiles(
    '[data-testid="file-input"]',
    'path/to/test-file.pdf'
  );
  
  await uploadPage.clickSubmit();
  
  // Verify upload success
  await expect(page.locator('[data-testid="success-message"]'))
    .toBeVisible();
});
```

## Troubleshooting

### Test Timeouts

If tests timeout:

1. **Increase timeout** for slow operations:
```typescript
test('slow operation', async ({ page }) => {
  test.setTimeout(60000); // 60 seconds
  
  await searchPage.waitForSearchCompletion(60000);
});
```

2. **Check for proper waits**:
```typescript
// Wait for network to be idle
await page.waitForLoadState('networkidle');

// Wait for specific element
await page.waitForSelector('[data-testid="results"]');
```

### Flaky Tests

If tests fail intermittently:

1. **Add proper waits** instead of arbitrary timeouts
2. **Use more stable selectors** (data-testid)
3. **Ensure test isolation** (clean state between tests)
4. **Check for race conditions** in async operations

### Element Not Found

If elements aren't found:

1. **Verify selector** using browser DevTools
2. **Check if element is in iframe**:
```typescript
const frame = page.frameLocator('iframe[name="myframe"]');
await frame.locator('[data-testid="button"]').click();
```

3. **Wait for element to appear**:
```typescript
await page.waitForSelector('[data-testid="button"]', {
  state: 'visible'
});
```

### Screenshots Don't Match

For visual regression tests:

1. **Update baselines** after intentional changes:
```bash
npm run test:e2e -- --update-snapshots
```

2. **Check for dynamic content** (timestamps, random IDs)
3. **Mask dynamic regions**:
```typescript
await expect(page).toHaveScreenshot('page.png', {
  mask: [page.locator('[data-testid="timestamp"]')]
});
```

## Additional Resources

- [Playwright Documentation](https://playwright.dev)
- [E2E Testing Standards](.kiro/steering/e2e-testing.md)
- [Test Maintenance Guide](./E2E_TEST_MAINTENANCE.md)
- [CI/CD Integration](../.github/workflows/e2e-tests.yml)

## Getting Help

- Check existing tests for examples
- Review Page Objects for available methods
- Consult the steering file: `.kiro/steering/e2e-testing.md`
- Ask in team chat or create an issue

## Next Steps

1. Read the [Test Maintenance Guide](./E2E_TEST_MAINTENANCE.md)
2. Review existing tests in `server/__tests__/e2e/`
3. Try running tests locally
4. Write your first test following the patterns above
