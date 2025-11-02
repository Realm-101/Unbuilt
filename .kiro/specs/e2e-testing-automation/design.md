# Design Document - E2E Testing Automation

## Overview

This design outlines a comprehensive end-to-end testing automation framework for the Unbuilt application. The framework extends the existing Vitest infrastructure with Playwright-based browser automation, accessibility scanning, performance monitoring, and visual regression testing. The design follows the Page Object pattern for maintainability and integrates seamlessly with CI/CD pipelines.

### Design Goals

1. **Comprehensive Coverage**: Automate all 10 testing phases from COMPREHENSIVE_TESTING_PLAN.md
2. **Maintainability**: Use Page Object pattern to isolate UI changes
3. **Speed**: Parallel execution with test isolation
4. **Reliability**: Retry logic, stable selectors, and deterministic tests
5. **Integration**: Seamless CI/CD integration with artifact collection
6. **Reporting**: Rich HTML reports with screenshots, videos, and metrics

### Technology Stack

- **Test Runner**: Vitest 3.2+ (existing infrastructure)
- **Browser Automation**: Playwright (Chromium, Firefox, WebKit)
- **Accessibility**: @axe-core/playwright for WCAG 2.1 AA validation
- **Visual Regression**: Playwright's built-in screenshot comparison
- **Performance**: Lighthouse CI for Core Web Vitals
- **Reporting**: Playwright HTML Reporter + custom Vitest reporters

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     CI/CD Pipeline                          │
│  (GitHub Actions / GitLab CI / Jenkins)                     │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                  Test Orchestrator                          │
│  - Vitest Test Runner                                       │
│  - Parallel Execution Manager                               │
│  - Test Lifecycle Hooks                                     │
└────────────────────┬────────────────────────────────────────┘
                     │
        ┌────────────┼────────────┐
        │            │            │
        ▼            ▼            ▼
┌──────────┐  ┌──────────┐  ┌──────────┐
│ Browser  │  │Accessib. │  │Perform.  │
│Automation│  │ Scanner  │  │ Monitor  │
│(Playwright)  │(@axe-core)  │(Lighthouse)
└────┬─────┘  └────┬─────┘  └────┬─────┘
     │             │             │
     └─────────────┼─────────────┘
                   │
                   ▼
         ┌─────────────────────────────────┐
         │      Page Objects Layer         │
         │  - LoginPage                    │
         │  - DashboardPage                │
         │  - SearchPage                   │
         │  - ResourceLibraryPage          │
         └─────────────────────────────────┘
                   │
                   ▼
         ┌─────────────────────────────────┐
         │    Test Data & Fixtures         │
         │  - User Factory                 │
         │  - Search Factory               │
         │  - Database Seeding             │
         └─────────────────────────────────┘
                   │
                   ▼
         ┌─────────────────────────────────┐
         │      Test Reporting             │
         │  - HTML Reports                 │
         │  - JUnit XML                    │
         │  - Screenshots/Videos           │
         │  - Performance Metrics          │
         └─────────────────────────────────┘
```

### Directory Structure

```
server/__tests__/
├── e2e/                          # E2E test suites
│   ├── auth/
│   │   ├── registration.e2e.test.ts
│   │   ├── login.e2e.test.ts
│   │   ├── password-security.e2e.test.ts
│   │   └── session-management.e2e.test.ts
│   ├── features/
│   │   ├── gap-analysis.e2e.test.ts
│   │   ├── ai-conversations.e2e.test.ts
│   │   ├── action-plans.e2e.test.ts
│   │   ├── resource-library.e2e.test.ts
│   │   └── project-management.e2e.test.ts
│   ├── sharing/
│   │   ├── share-links.e2e.test.ts
│   │   └── exports.e2e.test.ts
│   ├── navigation/
│   │   ├── dashboard.e2e.test.ts
│   │   ├── keyboard-shortcuts.e2e.test.ts
│   │   └── mobile-responsive.e2e.test.ts
│   ├── accessibility/
│   │   ├── wcag-compliance.e2e.test.ts
│   │   ├── keyboard-navigation.e2e.test.ts
│   │   └── screen-reader.e2e.test.ts
│   ├── visual/
│   │   ├── theme-validation.e2e.test.ts
│   │   └── responsive-design.e2e.test.ts
│   ├── performance/
│   │   ├── load-times.e2e.test.ts
│   │   ├── core-web-vitals.e2e.test.ts
│   │   └── api-performance.e2e.test.ts
│   ├── security/
│   │   ├── security-headers.e2e.test.ts
│   │   ├── rate-limiting.e2e.test.ts
│   │   └── input-validation.e2e.test.ts
│   └── documentation/
│       ├── user-guide-validation.e2e.test.ts
│       └── faq-validation.e2e.test.ts
├── page-objects/                 # Page Object Models
│   ├── base.page.ts
│   ├── login.page.ts
│   ├── dashboard.page.ts
│   ├── search.page.ts
│   ├── search-results.page.ts
│   ├── conversation.page.ts
│   ├── resource-library.page.ts
│   ├── project.page.ts
│   └── settings.page.ts
├── fixtures/                     # Test data factories
│   ├── user.factory.ts
│   ├── search.factory.ts
│   ├── conversation.factory.ts
│   └── resource.factory.ts
├── helpers/                      # Test utilities
│   ├── playwright.helper.ts
│   ├── accessibility.helper.ts
│   ├── performance.helper.ts
│   └── visual-regression.helper.ts
├── config/                       # Test configuration
│   ├── playwright.config.ts
│   ├── e2e.config.ts
│   └── test-environments.ts
└── reports/                      # Generated reports
    ├── html/
    ├── junit/
    ├── screenshots/
    └── videos/
```

## Components and Interfaces

### 1. Test Configuration

**File**: `server/__tests__/config/playwright.config.ts`

```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: '../e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 4 : undefined,
  reporter: [
    ['html', { outputFolder: 'server/__tests__/reports/html' }],
    ['junit', { outputFile: 'server/__tests__/reports/junit/results.xml' }],
    ['json', { outputFile: 'server/__tests__/reports/json/results.json' }]
  ],
  use: {
    baseURL: process.env.TEST_BASE_URL || 'http://localhost:5000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 10000,
    navigationTimeout: 30000
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] }
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] }
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] }
    },
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'] }
    },
    {
      name: 'mobile-safari',
      use: { ...devices['iPhone 12'] }
    }
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5000',
    reuseExistingServer: !process.env.CI,
    timeout: 120000
  }
});
```

### 2. Base Page Object

**File**: `server/__tests__/page-objects/base.page.ts`

```typescript
import { Page, Locator } from '@playwright/test';

export abstract class BasePage {
  constructor(protected page: Page) {}

  // Navigation
  async goto(path: string = ''): Promise<void> {
    await this.page.goto(path);
    await this.waitForPageLoad();
  }

  async waitForPageLoad(): Promise<void> {
    await this.page.waitForLoadState('networkidle');
  }

  // Element interactions
  protected async click(selector: string): Promise<void> {
    await this.page.click(selector);
  }

  protected async fill(selector: string, value: string): Promise<void> {
    await this.page.fill(selector, value);
  }

  protected async getText(selector: string): Promise<string> {
    return await this.page.textContent(selector) || '';
  }

  protected locator(selector: string): Locator {
    return this.page.locator(selector);
  }

  // Accessibility helpers
  async checkAccessibility(): Promise<void> {
    const { injectAxe, checkA11y } = await import('axe-playwright');
    await injectAxe(this.page);
    await checkA11y(this.page, undefined, {
      detailedReport: true,
      detailedReportOptions: { html: true }
    });
  }

  // Screenshot helpers
  async takeScreenshot(name: string): Promise<void> {
    await this.page.screenshot({
      path: `server/__tests__/reports/screenshots/${name}.png`,
      fullPage: true
    });
  }

  // Performance helpers
  async measurePerformance(): Promise<PerformanceMetrics> {
    const metrics = await this.page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      const paint = performance.getEntriesByType('paint');
      
      return {
        domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
        loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
        firstPaint: paint.find(p => p.name === 'first-paint')?.startTime || 0,
        firstContentfulPaint: paint.find(p => p.name === 'first-contentful-paint')?.startTime || 0
      };
    });
    
    return metrics;
  }
}

interface PerformanceMetrics {
  domContentLoaded: number;
  loadComplete: number;
  firstPaint: number;
  firstContentfulPaint: number;
}
```

### 3. Login Page Object

**File**: `server/__tests__/page-objects/login.page.ts`

```typescript
import { Page } from '@playwright/test';
import { BasePage } from './base.page';

export class LoginPage extends BasePage {
  // Selectors using data-testid
  private readonly emailInput = '[data-testid="login-email"]';
  private readonly passwordInput = '[data-testid="login-password"]';
  private readonly submitButton = '[data-testid="login-submit"]';
  private readonly errorMessage = '[data-testid="login-error"]';
  private readonly signupLink = '[data-testid="signup-link"]';

  constructor(page: Page) {
    super(page);
  }

  async goto(): Promise<void> {
    await super.goto('/login');
  }

  async login(email: string, password: string): Promise<void> {
    await this.fill(this.emailInput, email);
    await this.fill(this.passwordInput, password);
    await this.click(this.submitButton);
    await this.page.waitForURL('/dashboard');
  }

  async getErrorMessage(): Promise<string> {
    return await this.getText(this.errorMessage);
  }

  async isErrorVisible(): Promise<boolean> {
    return await this.locator(this.errorMessage).isVisible();
  }

  async goToSignup(): Promise<void> {
    await this.click(this.signupLink);
  }
}
```

### 4. Dashboard Page Object

**File**: `server/__tests__/page-objects/dashboard.page.ts`

```typescript
import { Page } from '@playwright/test';
import { BasePage } from './base.page';

export class DashboardPage extends BasePage {
  private readonly newSearchButton = '[data-testid="new-search-button"]';
  private readonly recentSearches = '[data-testid="recent-searches"]';
  private readonly favorites = '[data-testid="favorites"]';
  private readonly projects = '[data-testid="projects"]';
  private readonly searchOverview = '[data-testid="search-overview"]';

  constructor(page: Page) {
    super(page);
  }

  async goto(): Promise<void> {
    await super.goto('/dashboard');
  }

  async clickNewSearch(): Promise<void> {
    await this.click(this.newSearchButton);
  }

  async getRecentSearchCount(): Promise<number> {
    const searches = await this.locator(`${this.recentSearches} [data-testid="search-card"]`).count();
    return searches;
  }

  async getFavoritesCount(): Promise<number> {
    const favorites = await this.locator(`${this.favorites} [data-testid="favorite-card"]`).count();
    return favorites;
  }

  async useKeyboardShortcut(shortcut: string): Promise<void> {
    await this.page.keyboard.press(shortcut);
  }
}
```

### 5. Search Page Object

**File**: `server/__tests__/page-objects/search.page.ts`

```typescript
import { Page } from '@playwright/test';
import { BasePage } from './base.page';

export class SearchPage extends BasePage {
  private readonly searchInput = '[data-testid="search-input"]';
  private readonly submitButton = '[data-testid="search-submit"]';
  private readonly progressIndicator = '[data-testid="search-progress"]';
  private readonly phaseIndicators = '[data-testid="phase-indicator"]';

  constructor(page: Page) {
    super(page);
  }

  async goto(): Promise<void> {
    await super.goto('/search/new');
  }

  async submitSearch(query: string): Promise<void> {
    await this.fill(this.searchInput, query);
    await this.click(this.submitButton);
  }

  async waitForSearchCompletion(timeoutMs: number = 180000): Promise<void> {
    await this.page.waitForSelector('[data-testid="search-complete"]', {
      timeout: timeoutMs
    });
  }

  async getCurrentPhase(): Promise<string> {
    const activePhase = await this.locator(`${this.phaseIndicators}.active`);
    return await activePhase.textContent() || '';
  }

  async getProgressPercentage(): Promise<number> {
    const progress = await this.locator(this.progressIndicator).getAttribute('aria-valuenow');
    return parseInt(progress || '0', 10);
  }
}
```

## Data Models

### Test User Model

```typescript
interface TestUser {
  id?: number;
  email: string;
  password: string;
  role: 'admin' | 'user' | 'guest';
  plan: 'free' | 'pro' | 'enterprise';
  createdAt?: Date;
}
```

### Test Search Model

```typescript
interface TestSearch {
  id?: number;
  userId: number;
  query: string;
  innovationScore: number;
  feasibilityRating: 'high' | 'medium' | 'low';
  status: 'pending' | 'completed' | 'failed';
  results?: SearchResults;
  createdAt?: Date;
}

interface SearchResults {
  executiveSummary: string;
  gaps: Gap[];
  roadmap: Phase[];
}
```

### Accessibility Violation Model

```typescript
interface AccessibilityViolation {
  id: string;
  impact: 'critical' | 'serious' | 'moderate' | 'minor';
  description: string;
  help: string;
  helpUrl: string;
  nodes: ViolationNode[];
}

interface ViolationNode {
  html: string;
  target: string[];
  failureSummary: string;
}
```

### Performance Metrics Model

```typescript
interface PerformanceMetrics {
  url: string;
  timestamp: Date;
  metrics: {
    ttfb: number;           // Time to First Byte
    fcp: number;            // First Contentful Paint
    lcp: number;            // Largest Contentful Paint
    fid: number;            // First Input Delay
    cls: number;            // Cumulative Layout Shift
    tti: number;            // Time to Interactive
  };
  lighthouse?: {
    performance: number;
    accessibility: number;
    bestPractices: number;
    seo: number;
  };
}
```

## Error Handling

### Test Retry Strategy

```typescript
// Automatic retry on failure
test.describe.configure({ retries: 2 });

// Custom retry logic for flaky tests
async function retryOperation<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delayMs: number = 1000
): Promise<T> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      if (attempt === maxRetries) throw error;
      await new Promise(resolve => setTimeout(resolve, delayMs * attempt));
    }
  }
  throw new Error('Max retries exceeded');
}
```

### Error Capture and Reporting

```typescript
test.afterEach(async ({ page }, testInfo) => {
  if (testInfo.status !== 'passed') {
    // Capture screenshot
    const screenshot = await page.screenshot();
    await testInfo.attach('screenshot', {
      body: screenshot,
      contentType: 'image/png'
    });

    // Capture console logs
    const logs = await page.evaluate(() => {
      return (window as any).__testLogs || [];
    });
    await testInfo.attach('console-logs', {
      body: JSON.stringify(logs, null, 2),
      contentType: 'application/json'
    });

    // Capture network requests
    const requests = await page.evaluate(() => {
      return performance.getEntriesByType('resource').map(r => ({
        name: r.name,
        duration: r.duration
      }));
    });
    await testInfo.attach('network-requests', {
      body: JSON.stringify(requests, null, 2),
      contentType: 'application/json'
    });
  }
});
```

## Testing Strategy

### Test Isolation

Each test should be completely independent:

```typescript
test.beforeEach(async ({ page, context }) => {
  // Clear cookies and storage
  await context.clearCookies();
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  // Create fresh test user
  const testUser = await createTestUser();
  
  // Store in test context
  (page as any).testUser = testUser;
});

test.afterEach(async ({ page }) => {
  // Cleanup test data
  const testUser = (page as any).testUser;
  if (testUser) {
    await deleteTestUser(testUser.id);
  }
});
```

### Parallel Execution

```typescript
// Run tests in parallel within a file
test.describe.configure({ mode: 'parallel' });

// Run specific tests serially
test.describe.serial('Authentication flow', () => {
  test('register user', async () => { /* ... */ });
  test('verify email', async () => { /* ... */ });
  test('login', async () => { /* ... */ });
});
```

### Test Data Factories

```typescript
// User factory
export class UserFactory {
  static create(overrides: Partial<TestUser> = {}): TestUser {
    return {
      email: `test-${Date.now()}@example.com`,
      password: 'Test123!@#',
      role: 'user',
      plan: 'free',
      ...overrides
    };
  }

  static async persist(user: TestUser): Promise<TestUser> {
    const result = await db.insert(users).values(user).returning();
    return result[0];
  }

  static async cleanup(userId: number): Promise<void> {
    await db.delete(users).where(eq(users.id, userId));
  }
}

// Search factory
export class SearchFactory {
  static create(userId: number, overrides: Partial<TestSearch> = {}): TestSearch {
    return {
      userId,
      query: 'Test search query',
      innovationScore: 75,
      feasibilityRating: 'high',
      status: 'completed',
      ...overrides
    };
  }
}
```

## Performance Testing

### Core Web Vitals Measurement

```typescript
import { test, expect } from '@playwright/test';

test('should meet Core Web Vitals thresholds', async ({ page }) => {
  await page.goto('/');

  const metrics = await page.evaluate(() => {
    return new Promise((resolve) => {
      new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lcp = entries.find(e => e.entryType === 'largest-contentful-paint');
        const fid = entries.find(e => e.entryType === 'first-input');
        const cls = entries.find(e => e.entryType === 'layout-shift');

        resolve({
          lcp: lcp?.startTime || 0,
          fid: (fid as any)?.processingStart - (fid as any)?.startTime || 0,
          cls: (cls as any)?.value || 0
        });
      }).observe({ entryTypes: ['largest-contentful-paint', 'first-input', 'layout-shift'] });
    });
  });

  expect(metrics.lcp).toBeLessThan(2500); // Good: < 2.5s
  expect(metrics.fid).toBeLessThan(100);  // Good: < 100ms
  expect(metrics.cls).toBeLessThan(0.1);  // Good: < 0.1
});
```

### Lighthouse Integration

```typescript
import lighthouse from 'lighthouse';
import { chromium } from 'playwright';

async function runLighthouse(url: string) {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  const result = await lighthouse(url, {
    port: new URL(browser.wsEndpoint()).port,
    output: 'json',
    onlyCategories: ['performance', 'accessibility', 'best-practices']
  });

  await browser.close();

  return {
    performance: result.lhr.categories.performance.score * 100,
    accessibility: result.lhr.categories.accessibility.score * 100,
    bestPractices: result.lhr.categories['best-practices'].score * 100
  };
}
```

## Accessibility Testing

### WCAG 2.1 AA Compliance

```typescript
import { test, expect } from '@playwright/test';
import { injectAxe, checkA11y, getViolations } from 'axe-playwright';

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

test('should have proper color contrast', async ({ page }) => {
  await page.goto('/');
  await injectAxe(page);

  const violations = await getViolations(page, undefined, {
    runOnly: {
      type: 'rule',
      values: ['color-contrast']
    }
  });

  expect(violations).toHaveLength(0);
});
```

### Keyboard Navigation Testing

```typescript
test('should be fully keyboard navigable', async ({ page }) => {
  await page.goto('/');

  // Tab through all interactive elements
  const interactiveElements = await page.locator('button, a, input, select, textarea').count();
  
  for (let i = 0; i < interactiveElements; i++) {
    await page.keyboard.press('Tab');
    
    // Verify focus is visible
    const focusedElement = await page.evaluate(() => {
      const el = document.activeElement;
      const styles = window.getComputedStyle(el!);
      return {
        outline: styles.outline,
        outlineWidth: styles.outlineWidth,
        boxShadow: styles.boxShadow
      };
    });

    expect(
      focusedElement.outline !== 'none' ||
      focusedElement.outlineWidth !== '0px' ||
      focusedElement.boxShadow !== 'none'
    ).toBeTruthy();
  }
});
```

## Visual Regression Testing

### Screenshot Comparison

```typescript
test('should match visual baseline', async ({ page }) => {
  await page.goto('/dashboard');
  await page.waitForLoadState('networkidle');

  // Take screenshot and compare with baseline
  await expect(page).toHaveScreenshot('dashboard.png', {
    maxDiffPixels: 100,
    threshold: 0.2
  });
});

test('should match theme colors', async ({ page }) => {
  await page.goto('/');

  const colors = await page.evaluate(() => {
    const root = document.documentElement;
    const styles = getComputedStyle(root);
    
    return {
      purple: styles.getPropertyValue('--flame-purple'),
      red: styles.getPropertyValue('--flame-red'),
      orange: styles.getPropertyValue('--flame-orange'),
      white: styles.getPropertyValue('--flame-white')
    };
  });

  expect(colors.purple).toBeTruthy();
  expect(colors.red).toBeTruthy();
  expect(colors.orange).toBeTruthy();
  expect(colors.white).toBeTruthy();
});
```

## CI/CD Integration

### GitHub Actions Workflow

```yaml
name: E2E Tests

on:
  pull_request:
  push:
    branches: [main, develop]

jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        browser: [chromium, firefox, webkit]
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Install Playwright browsers
        run: npx playwright install --with-deps ${{ matrix.browser }}
      
      - name: Run E2E tests
        run: npm run test:e2e -- --project=${{ matrix.browser }}
        env:
          TEST_BASE_URL: http://localhost:5000
      
      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: test-results-${{ matrix.browser }}
          path: server/__tests__/reports/
          retention-days: 30
      
      - name: Upload screenshots
        if: failure()
        uses: actions/upload-artifact@v3
        with:
          name: screenshots-${{ matrix.browser }}
          path: server/__tests__/reports/screenshots/
          retention-days: 7
```

## Test Reporting

### Custom Reporter

```typescript
import { Reporter, TestCase, TestResult } from '@playwright/test/reporter';

class CustomReporter implements Reporter {
  onTestEnd(test: TestCase, result: TestResult) {
    const status = result.status;
    const duration = result.duration;
    
    console.log(`${status.toUpperCase()}: ${test.title} (${duration}ms)`);
    
    if (status === 'failed') {
      console.error(`  Error: ${result.error?.message}`);
      console.error(`  Stack: ${result.error?.stack}`);
    }
  }

  onEnd() {
    console.log('Test run completed');
  }
}

export default CustomReporter;
```

## Security Considerations

1. **Test Data Isolation**: Each test creates and cleans up its own data
2. **Credential Management**: Use environment variables for sensitive data
3. **Rate Limiting**: Respect rate limits in tests, use test-specific endpoints
4. **HTTPS**: Run tests against HTTPS endpoints in staging/production
5. **Authentication**: Use test-specific auth tokens with limited permissions

## Maintenance Strategy

1. **Regular Updates**: Update Playwright and dependencies monthly
2. **Baseline Updates**: Review and update visual baselines after intentional UI changes
3. **Flaky Test Management**: Track and fix flaky tests, use retries sparingly
4. **Performance Monitoring**: Track test execution time, optimize slow tests
5. **Documentation**: Keep Page Objects and test documentation up-to-date
