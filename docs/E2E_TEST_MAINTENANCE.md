# E2E Test Maintenance Guide

## Overview

This guide provides comprehensive instructions for maintaining, debugging, and troubleshooting the E2E test suite. It covers baseline management, flaky test handling, performance optimization, and best practices for keeping tests reliable and maintainable.

## Table of Contents

- [Visual Regression Baseline Management](#visual-regression-baseline-management)
- [Flaky Test Handling](#flaky-test-handling)
- [Test Performance Optimization](#test-performance-optimization)
- [Debugging Strategies](#debugging-strategies)
- [Test Health Monitoring](#test-health-monitoring)
- [Common Issues and Solutions](#common-issues-and-solutions)
- [CI/CD Maintenance](#cicd-maintenance)
- [Best Practices](#best-practices)

## Visual Regression Baseline Management

### Understanding Baselines

Visual regression tests compare current screenshots against baseline images. When UI changes are intentional, baselines need to be updated.

### When to Update Baselines

Update baselines when:
- ✅ Intentional UI changes (design updates, new features)
- ✅ Theme or color scheme changes
- ✅ Layout improvements
- ✅ Font or typography updates
- ❌ NOT for unintentional visual bugs

### Updating All Baselines

```bash
# Update all visual regression baselines
npm run test:e2e -- --update-snapshots

# Update baselines for specific test file
npm run test:e2e -- visual/theme-validation.e2e.test.ts --update-snapshots

# Update baselines for specific browser
npm run test:e2e -- --project=chromium --update-snapshots
```

### Reviewing Baseline Changes

Before updating baselines:

1. **Run tests to see failures**:
```bash
npm run test:e2e -- visual/
```

2. **Review diff images** in `server/__tests__/reports/`:
   - `*-actual.png` - Current screenshot
   - `*-expected.png` - Baseline screenshot
   - `*-diff.png` - Highlighted differences

3. **Verify changes are intentional**:
   - Check if differences match expected UI changes
   - Look for unintended side effects
   - Ensure changes are consistent across viewports

4. **Update baselines** if changes are correct:
```bash
npm run test:e2e -- --update-snapshots
```

5. **Commit updated baselines**:
```bash
git add server/__tests__/e2e/**/*.png
git commit -m "test: update visual regression baselines for [feature]"
```

### Baseline Storage

Baselines are stored in:
```
server/__tests__/e2e/
├── visual/
│   ├── theme-validation.e2e.test.ts-snapshots/
│   │   ├── homepage-chromium-darwin.png
│   │   ├── dashboard-chromium-darwin.png
│   │   └── ...
│   └── responsive-design.e2e.test.ts-snapshots/
│       └── ...
```

### Platform-Specific Baselines

Playwright generates platform-specific baselines (darwin, linux, win32). This is normal and ensures consistent results across different operating systems.

### Masking Dynamic Content

For elements that change frequently (timestamps, random IDs):

```typescript
await expect(page).toHaveScreenshot('page.png', {
  mask: [
    page.locator('[data-testid="timestamp"]'),
    page.locator('[data-testid="random-id"]')
  ]
});
```

## Flaky Test Handling

### Identifying Flaky Tests

Flaky tests fail intermittently without code changes. Signs include:
- Tests that pass on retry
- Tests that fail in CI but pass locally
- Tests with timing-related failures
- Tests that fail randomly across runs

### Monitoring Flaky Tests

Use the test health monitoring system:

```bash
# Generate test health report
npm run test:health-report

# View flaky test statistics
cat server/__tests__/reports/test-health-report.json
```

The report shows:
- Flaky test rate
- Tests requiring retries
- Average execution times
- Failure patterns

### Common Causes of Flakiness

1. **Race Conditions**
   - Async operations completing in different orders
   - Network requests with variable timing
   - Animation or transition timing

2. **Insufficient Waits**
   - Not waiting for elements to appear
   - Not waiting for network requests
   - Not waiting for animations to complete

3. **Test Interdependence**
   - Tests affecting each other's state
   - Shared test data causing conflicts
   - Browser state not properly reset

4. **Dynamic Content**
   - Timestamps or dates
   - Random IDs or values
   - External API responses

### Fixing Flaky Tests

#### 1. Add Proper Waits

```typescript
// ❌ Bad - No wait
await page.click('[data-testid="button"]');
const text = await page.textContent('[data-testid="result"]');

// ✅ Good - Wait for element
await page.click('[data-testid="button"]');
await page.waitForSelector('[data-testid="result"]', { state: 'visible' });
const text = await page.textContent('[data-testid="result"]');

// ✅ Better - Use Playwright assertions with auto-retry
await page.click('[data-testid="button"]');
await expect(page.locator('[data-testid="result"]')).toBeVisible();
const text = await page.locator('[data-testid="result"]').textContent();
```

#### 2. Wait for Network Idle

```typescript
// Wait for all network requests to complete
await page.goto('/dashboard');
await page.waitForLoadState('networkidle');

// Wait for specific API call
await page.waitForResponse(response => 
  response.url().includes('/api/searches') && response.status() === 200
);
```

#### 3. Improve Selectors

```typescript
// ❌ Bad - Fragile selector
await page.click('.btn-primary');

// ✅ Good - Stable data-testid
await page.click('[data-testid="submit-button"]');

// ✅ Better - Use Page Object
await loginPage.clickSubmitButton();
```

#### 4. Ensure Test Isolation

```typescript
test.beforeEach(async ({ page, context }) => {
  // Clear all state
  await context.clearCookies();
  await context.clearPermissions();
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
    indexedDB.deleteDatabase('mydb');
  });

  // Create fresh test data
  testUser = await UserFactory.create();
  await testUser.persist();
});

test.afterEach(async () => {
  // Clean up test data
  if (testUser) {
    await testUser.cleanup();
  }
});
```

#### 5. Handle Dynamic Content

```typescript
// Mock dynamic values
await page.addInitScript(() => {
  // Override Date.now() for consistent timestamps
  Date.now = () => 1234567890000;
  
  // Override Math.random() for consistent IDs
  Math.random = () => 0.5;
});

// Or ignore dynamic content in assertions
await expect(page.locator('[data-testid="message"]'))
  .toHaveText(/Success: .*/); // Regex to match dynamic part
```

### Temporary Retry Configuration

Use retries sparingly and only while fixing the root cause:

```typescript
// For specific flaky test
test('flaky test', async ({ page }) => {
  test.setTimeout(30000); // Increase timeout
  test.slow(); // Mark as slow (3x timeout)
  
  // Test code
});

// For entire test file
test.describe.configure({ retries: 2 });
```

**Important**: Retries mask problems. Always fix the root cause instead of relying on retries.

## Test Performance Optimization

### Measuring Test Performance

```bash
# Run tests with timing information
npm run test:e2e -- --reporter=list

# Generate performance report
npm run test:health-report
```

### Optimization Strategies

#### 1. Parallel Execution

```typescript
// Enable parallel execution (default)
test.describe.configure({ mode: 'parallel' });

// Run specific tests serially if needed
test.describe.serial('Sequential flow', () => {
  test('step 1', async () => { /* ... */ });
  test('step 2', async () => { /* ... */ });
});
```

#### 2. Reuse Browser Contexts

```typescript
// Reuse authenticated state
test.use({
  storageState: 'server/__tests__/.auth/user.json'
});

// Setup authentication once
test.beforeAll(async ({ browser }) => {
  const context = await browser.newContext();
  const page = await context.newPage();
  
  // Login
  await page.goto('/login');
  await page.fill('[data-testid="email"]', 'test@example.com');
  await page.fill('[data-testid="password"]', 'password');
  await page.click('[data-testid="submit"]');
  
  // Save state
  await context.storageState({ 
    path: 'server/__tests__/.auth/user.json' 
  });
  
  await context.close();
});
```

#### 3. Optimize Waits

```typescript
// ❌ Bad - Arbitrary timeout
await page.waitForTimeout(5000);

// ✅ Good - Wait for specific condition
await page.waitForSelector('[data-testid="results"]');

// ✅ Better - Use assertion with auto-retry
await expect(page.locator('[data-testid="results"]')).toBeVisible();
```

#### 4. Reduce Test Scope

```typescript
// ❌ Bad - Testing too much in one test
test('complete user flow', async ({ page }) => {
  // 50 lines of test code testing multiple features
});

// ✅ Good - Focused tests
test('should login successfully', async ({ page }) => {
  // 10 lines testing only login
});

test('should create search', async ({ page }) => {
  // 10 lines testing only search creation
});
```

#### 5. Use API for Setup

```typescript
// ❌ Bad - UI setup for every test
test.beforeEach(async ({ page }) => {
  await page.goto('/login');
  await page.fill('[data-testid="email"]', 'test@example.com');
  await page.fill('[data-testid="password"]', 'password');
  await page.click('[data-testid="submit"]');
  await page.waitForURL('/dashboard');
});

// ✅ Good - API setup
test.beforeEach(async ({ page }) => {
  const token = await apiLogin('test@example.com', 'password');
  await page.goto('/dashboard', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
});
```

## Debugging Strategies

### Visual Debugging

#### Headed Mode

```bash
# Run tests with visible browser
npm run test:e2e -- --headed

# Run with slow motion (1 second between actions)
npm run test:e2e -- --headed --slow-mo=1000
```

#### Playwright Inspector

```bash
# Open Playwright Inspector
npm run test:e2e -- --debug

# Debug specific test
npm run test:e2e -- auth/authentication.e2e.test.ts --debug
```

Features:
- Step through test execution
- Inspect element selectors
- View console logs
- Examine network requests
- Take screenshots at any point

### Trace Viewer

Generate and view detailed traces:

```bash
# Run tests with trace
npm run test:e2e -- --trace on

# View trace file
npx playwright show-trace server/__tests__/reports/traces/trace.zip
```

Trace viewer shows:
- Timeline of all actions
- Screenshots at each step
- Network activity
- Console logs
- Source code
- DOM snapshots

### Console Logging

Add debug logging to tests:

```typescript
test('debug test', async ({ page }) => {
  // Log page console messages
  page.on('console', msg => {
    console.log(`PAGE LOG [${msg.type()}]:`, msg.text());
  });

  // Log network requests
  page.on('request', request => {
    console.log('REQUEST:', request.method(), request.url());
  });

  page.on('response', response => {
    console.log('RESPONSE:', response.status(), response.url());
  });

  // Your test code
  await page.goto('/');
  console.log('Current URL:', page.url());
});
```

### Pause Execution

```typescript
test('pause test', async ({ page }) => {
  await page.goto('/');
  
  // Pause for manual inspection
  await page.pause();
  
  // Continue with test
  await page.click('[data-testid="button"]');
});
```

### Screenshot Debugging

```typescript
test('screenshot debug', async ({ page }) => {
  await page.goto('/');
  
  // Take screenshot at specific point
  await page.screenshot({ 
    path: 'debug-screenshot.png',
    fullPage: true 
  });
  
  // Take screenshot of specific element
  await page.locator('[data-testid="form"]').screenshot({
    path: 'form-screenshot.png'
  });
});
```

## Test Health Monitoring

### Generating Health Reports

```bash
# Generate comprehensive health report
npm run test:health-report

# View report
cat server/__tests__/reports/test-health-report.json
```

### Health Metrics

The health report tracks:

1. **Flaky Test Rate**
   - Percentage of tests requiring retries
   - Target: < 5%

2. **Test Execution Time**
   - Average time per test
   - Slowest tests
   - Total suite execution time

3. **Failure Patterns**
   - Most common failure reasons
   - Tests failing in specific browsers
   - Time-based failure patterns

4. **Test Stability**
   - Pass rate over time
   - Retry success rate
   - Consistent failures vs. intermittent

### Monitoring in CI

GitHub Actions automatically tracks:
- Test pass/fail rates
- Execution time trends
- Flaky test detection
- Browser-specific issues

View metrics in:
- GitHub Actions workflow runs
- Test report artifacts
- PR status checks

### Setting Up Alerts

Configure alerts for:
- Flaky test rate > 5%
- Test execution time > 20 minutes
- Pass rate < 95%
- Consistent test failures

## Common Issues and Solutions

### Issue: Tests Timeout

**Symptoms:**
- Tests fail with "Timeout exceeded" errors
- Tests hang indefinitely

**Solutions:**

1. **Increase timeout for slow operations:**
```typescript
test('slow operation', async ({ page }) => {
  test.setTimeout(60000); // 60 seconds
  
  await searchPage.waitForSearchCompletion(60000);
});
```

2. **Check for missing waits:**
```typescript
// Add proper waits
await page.waitForLoadState('networkidle');
await page.waitForSelector('[data-testid="results"]');
```

3. **Verify selectors are correct:**
```typescript
// Use Playwright Inspector to verify selectors
npm run test:e2e -- --debug
```

### Issue: Element Not Found

**Symptoms:**
- "Element not found" errors
- "Selector resolved to hidden element"

**Solutions:**

1. **Wait for element to appear:**
```typescript
await page.waitForSelector('[data-testid="button"]', {
  state: 'visible',
  timeout: 10000
});
```

2. **Check if element is in iframe:**
```typescript
const frame = page.frameLocator('iframe[name="myframe"]');
await frame.locator('[data-testid="button"]').click();
```

3. **Verify selector in DevTools:**
```javascript
// In browser console
document.querySelector('[data-testid="button"]')
```

4. **Use more specific selector:**
```typescript
// Instead of
await page.click('button');

// Use
await page.click('[data-testid="submit-button"]');
```

### Issue: Visual Regression Failures

**Symptoms:**
- Screenshot comparison failures
- Pixel differences in images

**Solutions:**

1. **Review diff images:**
```
server/__tests__/reports/
├── *-actual.png
├── *-expected.png
└── *-diff.png
```

2. **Update baselines if changes are intentional:**
```bash
npm run test:e2e -- --update-snapshots
```

3. **Mask dynamic content:**
```typescript
await expect(page).toHaveScreenshot('page.png', {
  mask: [page.locator('[data-testid="timestamp"]')]
});
```

4. **Adjust threshold for minor differences:**
```typescript
await expect(page).toHaveScreenshot('page.png', {
  maxDiffPixels: 100,
  threshold: 0.2
});
```

### Issue: Flaky Authentication Tests

**Symptoms:**
- Login tests fail intermittently
- Session state inconsistent

**Solutions:**

1. **Clear state before each test:**
```typescript
test.beforeEach(async ({ page, context }) => {
  await context.clearCookies();
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
});
```

2. **Wait for authentication to complete:**
```typescript
await loginPage.login(email, password);
await page.waitForURL('/dashboard');
await page.waitForLoadState('networkidle');
```

3. **Verify authentication state:**
```typescript
const token = await page.evaluate(() => 
  localStorage.getItem('auth_token')
);
expect(token).toBeTruthy();
```

### Issue: Tests Pass Locally but Fail in CI

**Symptoms:**
- Tests pass on local machine
- Same tests fail in GitHub Actions

**Solutions:**

1. **Check for timing differences:**
```typescript
// CI may be slower, increase timeouts
test.setTimeout(60000);
```

2. **Ensure test isolation:**
```typescript
// Don't rely on local state or files
test.beforeEach(async () => {
  // Create fresh test data
});
```

3. **Use consistent test data:**
```typescript
// Don't use Date.now() or Math.random()
const testData = {
  timestamp: 1234567890000,
  id: 'test-id-123'
};
```

4. **Check browser differences:**
```bash
# Test with same browser as CI
npm run test:e2e -- --project=chromium
```

## CI/CD Maintenance

### Updating Playwright

```bash
# Update Playwright
npm install -D @playwright/test@latest

# Update browsers
npx playwright install --with-deps
```

### Managing Test Artifacts

Artifacts are automatically uploaded on test failure:
- Screenshots
- Videos
- Trace files
- Test reports

**Retention:**
- Test reports: 30 days
- Screenshots/videos: 7 days

**Cleanup:**
```bash
# Clean local artifacts
rm -rf server/__tests__/reports/*

# Artifacts in CI are cleaned automatically
```

### Updating CI Configuration

When modifying `.github/workflows/e2e-tests.yml`:

1. **Test locally first:**
```bash
npm run test:e2e
```

2. **Verify on feature branch:**
   - Create PR
   - Check workflow runs successfully
   - Review test results

3. **Monitor after merge:**
   - Watch first few runs on main
   - Check for any new failures
   - Verify artifact uploads

### Optimizing CI Performance

1. **Use matrix strategy** for parallel browser testing
2. **Cache dependencies** (npm, Playwright browsers)
3. **Run smoke tests** before full suite
4. **Skip tests** for documentation-only changes

## Best Practices

### Test Maintenance Schedule

**Daily:**
- Monitor CI test results
- Fix failing tests immediately
- Review flaky test reports

**Weekly:**
- Generate test health report
- Review slow tests
- Update test documentation

**Monthly:**
- Update Playwright and dependencies
- Review and update visual baselines
- Audit test coverage
- Clean up obsolete tests

### Code Review Checklist

When reviewing test changes:

- [ ] Tests follow Page Object pattern
- [ ] Selectors use data-testid attributes
- [ ] Tests are independent and isolated
- [ ] Proper waits instead of timeouts
- [ ] Test data is cleaned up
- [ ] Assertions use Playwright's built-in methods
- [ ] Tests have descriptive names
- [ ] No hardcoded values or credentials

### Documentation Updates

Keep documentation current:

1. **Update Page Objects** when UI changes
2. **Update test guides** when patterns change
3. **Document known issues** in test files
4. **Update README** with new test commands

### Version Control

**Commit messages:**
```bash
# Good commit messages
git commit -m "test: add E2E tests for search feature"
git commit -m "test: fix flaky authentication test"
git commit -m "test: update visual baselines for theme change"

# Bad commit messages
git commit -m "fix tests"
git commit -m "update"
```

**What to commit:**
- ✅ Test files
- ✅ Page Objects
- ✅ Visual regression baselines
- ✅ Test configuration
- ❌ Test reports
- ❌ Screenshots (except baselines)
- ❌ Videos

## Getting Help

### Resources

- [Playwright Documentation](https://playwright.dev)
- [E2E Testing Guide](./E2E_TESTING_GUIDE.md)
- [E2E Testing Standards](../.kiro/steering/e2e-testing.md)
- [Test Health Monitoring](../server/__tests__/helpers/TEST_HEALTH_MONITORING.md)

### Troubleshooting Steps

1. **Check test output** for error messages
2. **Review screenshots/videos** from failure
3. **Run test locally** with `--headed` and `--debug`
4. **Check recent changes** that might affect test
5. **Review similar tests** for patterns
6. **Consult documentation** and guides
7. **Ask team** or create issue if stuck

### Reporting Issues

When reporting test issues:

1. **Describe the problem** clearly
2. **Include error messages** and stack traces
3. **Attach screenshots/videos** if available
4. **Provide steps to reproduce**
5. **Note environment** (OS, browser, Node version)
6. **Link to failing CI run** if applicable

## Summary

Maintaining E2E tests requires:
- Regular monitoring and health checks
- Prompt fixing of flaky tests
- Keeping baselines up to date
- Optimizing test performance
- Following best practices
- Good documentation

By following this guide, you'll keep the E2E test suite reliable, maintainable, and valuable for the team.
