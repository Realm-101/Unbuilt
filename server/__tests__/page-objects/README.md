# Page Objects

This directory contains Page Object Models (POMs) for E2E tests.

## What are Page Objects?

Page Objects encapsulate page structure, selectors, and interactions in dedicated classes. This pattern:

- **Improves maintainability**: UI changes require updates in only one location
- **Increases readability**: Tests use high-level methods instead of low-level commands
- **Reduces duplication**: Common interactions are reusable across tests
- **Provides type safety**: TypeScript ensures correct method usage

## Structure

```
page-objects/
├── base.page.ts              # Base class with common functionality
├── login.page.ts             # Login page interactions (✓ Implemented)
├── registration.page.ts      # Registration page interactions (✓ Implemented)
├── dashboard.page.ts         # Dashboard interactions (✓ Implemented)
├── search.page.ts            # Search creation and progress (✓ Implemented)
├── search-results.page.ts    # Search results viewing (✓ Implemented)
├── conversation.page.ts      # AI conversations (✓ Implemented)
├── resource-library.page.ts  # Resource library browsing (✓ Implemented)
└── project.page.ts           # Project management (✓ Implemented)
```

## Usage Example

```typescript
import { test, expect } from '@playwright/test';
import { LoginPage } from '../page-objects/login.page';
import { DashboardPage } from '../page-objects/dashboard.page';

test('should navigate to dashboard after login', async ({ page }) => {
  const loginPage = new LoginPage(page);
  const dashboardPage = new DashboardPage(page);
  
  await loginPage.goto();
  await loginPage.login('user@example.com', 'password');
  
  await expect(page).toHaveURL('/dashboard');
  const searchCount = await dashboardPage.getRecentSearchCount();
  expect(searchCount).toBeGreaterThanOrEqual(0);
});
```

## Creating a Page Object

### 1. Extend BasePage

```typescript
import { Page } from '@playwright/test';
import { BasePage } from './base.page';

export class MyPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }
}
```

### 2. Define Selectors

Use `data-testid` attributes:

```typescript
export class MyPage extends BasePage {
  private readonly submitButton = '[data-testid="submit-button"]';
  private readonly emailInput = '[data-testid="email-input"]';
  private readonly errorMessage = '[data-testid="error-message"]';
}
```

### 3. Implement Methods

Create high-level, action-oriented methods:

```typescript
export class MyPage extends BasePage {
  async submitForm(email: string): Promise<void> {
    await this.fill(this.emailInput, email);
    await this.click(this.submitButton);
  }
  
  async getErrorMessage(): Promise<string> {
    return await this.getText(this.errorMessage);
  }
  
  async isErrorVisible(): Promise<boolean> {
    return await this.locator(this.errorMessage).isVisible();
  }
}
```

## BasePage Methods

The `BasePage` class provides common functionality:

### Navigation
- `goto(path: string)`: Navigate to a path
- `waitForPageLoad()`: Wait for page to load

### Element Interactions
- `click(selector: string)`: Click an element
- `fill(selector: string, value: string)`: Fill an input
- `getText(selector: string)`: Get element text
- `locator(selector: string)`: Get a Playwright locator

### Accessibility
- `checkAccessibility()`: Run axe accessibility checks

### Screenshots
- `takeScreenshot(name: string)`: Capture a screenshot

### Performance
- `measurePerformance()`: Measure page performance metrics

## Best Practices

### DO

✅ Use descriptive method names (`clickSubmitButton`, not `click`)  
✅ Return appropriate types (`Promise<void>`, `Promise<string>`, `Promise<boolean>`)  
✅ Use `data-testid` attributes for selectors  
✅ Keep methods focused on a single action  
✅ Add JSDoc comments for complex methods  

### DON'T

❌ Use CSS classes or IDs as selectors  
❌ Include assertions in Page Objects (assertions belong in tests)  
❌ Make methods too generic (`submit()` vs `submitLoginForm()`)  
❌ Access page directly in tests (use Page Object methods)  
❌ Hardcode test data in Page Objects  

## Naming Conventions

### Methods
- **Actions**: `click*`, `fill*`, `select*`, `submit*`
- **Getters**: `get*`, `is*`, `has*`
- **Waiters**: `waitFor*`

### Examples
```typescript
async clickSubmitButton(): Promise<void>
async fillEmailInput(email: string): Promise<void>
async getErrorMessage(): Promise<string>
async isFormVisible(): Promise<boolean>
async waitForResults(): Promise<void>
```

## Testing Page Objects

Page Objects themselves don't need tests, but you should:

1. Test them through E2E tests
2. Verify selectors are correct
3. Ensure methods work as expected
4. Update when UI changes

## Resources

- [Playwright Page Object Pattern](https://playwright.dev/docs/pom)
- [E2E Testing Guide](../../docs/E2E_TESTING_GUIDE.md)
- [Steering File](.kiro/steering/e2e-testing.md)
