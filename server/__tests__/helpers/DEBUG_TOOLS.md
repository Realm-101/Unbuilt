# Test Debugging Tools

This document describes the debugging tools available for Playwright E2E tests.

## Debug Helper

The `DebugHelper` class provides comprehensive debugging capabilities for Playwright tests.

### Features

1. **Playwright Inspector Integration** - Step-by-step debugging with UI
2. **Trace File Generation** - Detailed execution traces for post-mortem analysis
3. **Selector Suggestion Tool** - Find alternative selectors when elements fail
4. **Performance Profiling** - Track test execution time by step
5. **Debug Snapshots** - Capture page state, screenshots, and logs

## Usage

### Basic Setup

```typescript
import { test } from '@playwright/test';
import { createDebugHelper } from '../helpers/debug.helper';

test('my test', async ({ page, context }) => {
  const debug = createDebugHelper(page, context);
  
  // Your test code here
});
```

### Playwright Inspector

Start the inspector for step-by-step debugging:

```typescript
test('debug with inspector', async ({ page, context }) => {
  const debug = createDebugHelper(page, context);
  
  await page.goto('/login');
  
  // Pause execution and open inspector
  await debug.startInspector();
  
  // Continue with test...
});
```

Or run tests with inspector from command line:

```bash
# Run with inspector
PWDEBUG=1 npm run test:e2e

# Run specific test with inspector
PWDEBUG=1 npm run test:e2e -- auth/login.e2e.test.ts
```

### Trace File Generation

Generate detailed trace files for debugging:

```typescript
test('generate trace', async ({ page, context }) => {
  const debug = createDebugHelper(page, context);
  
  // Start tracing
  await debug.startTracing('login-flow');
  
  // Perform test actions
  await page.goto('/login');
  await page.fill('[data-testid="email"]', 'test@example.com');
  await page.click('[data-testid="submit"]');
  
  // Stop tracing and save
  const tracePath = await debug.stopTracing('login-flow');
  
  // View trace: npx playwright show-trace <tracePath>
});
```

View traces:

```bash
# View specific trace
npx playwright show-trace server/__tests__/reports/traces/login-flow-1234567890.zip

# Open trace viewer
npx playwright show-trace
```

### Selector Suggestions

Get alternative selectors when elements fail:

```typescript
test('suggest selectors', async ({ page, context }) => {
  const debug = createDebugHelper(page, context);
  
  await page.goto('/dashboard');
  
  // Get selector suggestions
  const suggestions = await debug.suggestSelectors('[data-testid="missing-button"]');
  
  // Suggestions are logged to console with confidence levels:
  // 1. [high] [data-testid="actual-button"] - Stable selector using data-testid
  // 2. [high] role=button - Semantic selector using ARIA role
  // 3. [medium] text=Click Me - Text-based selector
});
```

### Performance Profiling

Track test execution time by step:

```typescript
test('profile performance', async ({ page, context }) => {
  const debug = createDebugHelper(page, context);
  
  debug.startStep('Navigate to login');
  await page.goto('/login');
  debug.endStep('Navigate to login');
  
  debug.startStep('Fill login form');
  await page.fill('[data-testid="email"]', 'test@example.com');
  await page.fill('[data-testid="password"]', 'password123');
  debug.endStep('Fill login form');
  
  debug.startStep('Submit and wait');
  await page.click('[data-testid="submit"]');
  await page.waitForURL('/dashboard');
  debug.endStep('Submit and wait');
  
  // Generate performance report
  const profile = await debug.generatePerformanceProfile('login-test');
  
  // Profile includes:
  // - Total duration
  // - Duration per step
  // - Slowest step
  // - Saved to JSON file
});
```

### Debug Snapshots

Capture comprehensive debug information:

```typescript
test('capture snapshot', async ({ page, context }) => {
  const debug = createDebugHelper(page, context, {
    enableScreenshots: true,
    enableConsoleLogging: true,
    enableNetworkLogging: true,
  });
  
  await page.goto('/dashboard');
  
  // Capture snapshot at any point
  await debug.captureDebugSnapshot('dashboard-loaded');
  
  // Snapshot includes:
  // - Full page screenshot
  // - Page HTML
  // - Console logs
  // - Network requests
});
```

### Element Information

Log detailed element information:

```typescript
test('log element info', async ({ page, context }) => {
  const debug = createDebugHelper(page, context);
  
  await page.goto('/login');
  
  // Log element details
  await debug.logElementInfo('[data-testid="submit-button"]');
  
  // Output includes:
  // - Element count
  // - Visibility
  // - Enabled state
  // - Bounding box
  // - All attributes
});
```

### Wait with Logging

Enhanced waiting with debug information:

```typescript
test('wait with logging', async ({ page, context }) => {
  const debug = createDebugHelper(page, context);
  
  await page.goto('/search');
  
  const resultsLocator = page.locator('[data-testid="search-results"]');
  
  // Wait with debug logging
  await debug.waitWithLogging(resultsLocator, {
    timeout: 30000,
    state: 'visible',
  });
  
  // If timeout occurs, suggests alternative selectors
});
```

## Debug Options

Configure debug helper behavior:

```typescript
const debug = createDebugHelper(page, context, {
  enableTracing: true,              // Enable trace generation
  enableScreenshots: true,          // Enable screenshot capture
  enableConsoleLogging: true,       // Capture console logs
  enableNetworkLogging: true,       // Capture network requests
  enablePerformanceProfiling: true, // Track step performance
});
```

## Debug Mode

Enable debug mode for additional logging:

```bash
# Run tests in debug mode
DEBUG=true npm run test:e2e

# Or with Playwright debug
PWDEBUG=1 npm run test:e2e
```

Check debug mode in tests:

```typescript
import { isDebugMode, debugLog } from '../helpers/debug.helper';

test('conditional debug', async ({ page }) => {
  if (isDebugMode()) {
    console.log('Running in debug mode');
  }
  
  // Conditional debug logging
  debugLog('This only logs in debug mode', { page: page.url() });
});
```

## Common Debugging Scenarios

### Flaky Test Investigation

```typescript
test('investigate flaky test', async ({ page, context }) => {
  const debug = createDebugHelper(page, context);
  
  // Start tracing
  await debug.startTracing('flaky-test');
  
  // Profile each step
  debug.startStep('Setup');
  // ... setup code
  debug.endStep('Setup');
  
  debug.startStep('Action');
  // ... action that sometimes fails
  debug.endStep('Action');
  
  // Capture snapshot before assertion
  await debug.captureDebugSnapshot('before-assertion');
  
  // Stop tracing
  await debug.stopTracing('flaky-test');
  
  // Generate performance profile
  await debug.generatePerformanceProfile('flaky-test');
});
```

### Selector Debugging

```typescript
test('debug selector issues', async ({ page, context }) => {
  const debug = createDebugHelper(page, context);
  
  await page.goto('/dashboard');
  
  // Try to find element
  const selector = '[data-testid="missing-element"]';
  const count = await page.locator(selector).count();
  
  if (count === 0) {
    // Get suggestions
    const suggestions = await debug.suggestSelectors(selector);
    
    // Try first suggestion
    if (suggestions.length > 0) {
      const newSelector = suggestions[0].selector;
      await page.click(newSelector);
    }
  }
});
```

### Performance Investigation

```typescript
test('investigate slow test', async ({ page, context }) => {
  const debug = createDebugHelper(page, context);
  
  debug.startStep('Page Load');
  await page.goto('/dashboard');
  debug.endStep('Page Load');
  
  debug.startStep('Wait for Data');
  await page.waitForSelector('[data-testid="data-loaded"]');
  debug.endStep('Wait for Data');
  
  debug.startStep('Interaction');
  await page.click('[data-testid="button"]');
  debug.endStep('Interaction');
  
  const profile = await debug.generatePerformanceProfile('slow-test');
  
  // Check if any step is too slow
  if (profile.slowestStep.duration > 5000) {
    console.warn(`Slow step detected: ${profile.slowestStep.name}`);
  }
});
```

## Output Locations

Debug artifacts are saved to:

- **Traces**: `server/__tests__/reports/traces/`
- **Performance Profiles**: `server/__tests__/reports/performance/`
- **Debug Snapshots**: `server/__tests__/reports/debug-snapshots/`

## Best Practices

1. **Use tracing for flaky tests** - Helps identify timing issues
2. **Profile slow tests** - Find performance bottlenecks
3. **Capture snapshots on failure** - Understand test state
4. **Use selector suggestions** - Find stable alternatives
5. **Enable debug mode locally** - Get detailed logging
6. **Disable debug features in CI** - Reduce overhead

## Troubleshooting

### Inspector Not Opening

```bash
# Ensure PWDEBUG is set
PWDEBUG=1 npm run test:e2e

# Or use headed mode
npm run test:e2e -- --headed
```

### Trace Files Too Large

```typescript
// Disable screenshots in traces
await context.tracing.start({
  screenshots: false,  // Reduces file size
  snapshots: true,
  sources: true,
});
```

### Performance Profiling Overhead

```typescript
// Disable in CI
const debug = createDebugHelper(page, context, {
  enablePerformanceProfiling: !process.env.CI,
});
```

## Additional Resources

- [Playwright Inspector Docs](https://playwright.dev/docs/debug#playwright-inspector)
- [Trace Viewer Docs](https://playwright.dev/docs/trace-viewer)
- [Debugging Guide](https://playwright.dev/docs/debug)
