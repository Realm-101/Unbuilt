# Test Helpers

This directory contains helper utilities for E2E testing with Playwright.

## Available Helpers

### 1. Debug Helper (`debug.helper.ts`)

Comprehensive debugging utilities for Playwright tests.

**Features:**
- Playwright Inspector integration
- Trace file generation
- Selector suggestion tool
- Performance profiling
- Debug snapshots
- Element information logging

**Documentation:** [DEBUG_TOOLS.md](./DEBUG_TOOLS.md)

**Quick Start:**
```typescript
import { createDebugHelper } from '../helpers/debug.helper';

test('my test', async ({ page, context }) => {
  const debug = createDebugHelper(page, context);
  
  // Use inspector
  await debug.startInspector();
  
  // Generate traces
  await debug.startTracing('test-name');
  // ... test actions
  await debug.stopTracing('test-name');
  
  // Get selector suggestions
  await debug.suggestSelectors('[data-testid="element"]');
  
  // Profile performance
  debug.startStep('Step name');
  // ... step actions
  debug.endStep('Step name');
  await debug.generatePerformanceProfile('test-name');
});
```

### 2. Test Health Monitor (`test-health.helper.ts`)

Tracks test stability, performance, and reliability.

**Features:**
- Automatic test result recording
- Flaky test detection
- Slow test identification
- Failing test monitoring
- Stability score calculation
- Alert system
- Health reports

**Documentation:** [TEST_HEALTH_MONITORING.md](./TEST_HEALTH_MONITORING.md)

**Quick Start:**
```typescript
import { createTestHealthMonitor, recordTestFromPlaywright } from '../helpers/test-health.helper';

const monitor = createTestHealthMonitor();

test.afterEach(async ({}, testInfo) => {
  await recordTestFromPlaywright(testInfo, monitor);
});

// Generate report
const report = await monitor.generateHealthReport();
monitor.printHealthReport(report);
```

### 3. Accessibility Helper (`accessibility.helper.ts`)

WCAG 2.1 AA compliance testing utilities.

**Features:**
- Axe-core integration
- WCAG rule configuration
- Violation reporting
- Remediation guidance

**Quick Start:**
```typescript
import { checkAccessibility, getAccessibilityViolations } from '../helpers/accessibility.helper';

test('accessibility', async ({ page }) => {
  await page.goto('/');
  await checkAccessibility(page);
});
```

### 4. Performance Helper (`performance.helper.ts`)

Core Web Vitals and performance measurement.

**Features:**
- Core Web Vitals measurement
- Lighthouse integration
- Performance metrics collection
- Trend tracking

**Quick Start:**
```typescript
import { measureCoreWebVitals, runLighthouse } from '../helpers/performance.helper';

test('performance', async ({ page }) => {
  await page.goto('/');
  const metrics = await measureCoreWebVitals(page);
  expect(metrics.lcp).toBeLessThan(2500);
});
```

### 5. Visual Regression Helper (`visual-regression.helper.ts`)

Screenshot comparison and visual testing.

**Features:**
- Screenshot capture
- Baseline management
- Diff generation
- Threshold configuration

**Quick Start:**
```typescript
import { captureScreenshot, compareWithBaseline } from '../helpers/visual-regression.helper';

test('visual', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveScreenshot('page.png');
});
```

## Common Commands

### Debugging

```bash
# Run with inspector
PWDEBUG=1 npm run test:e2e

# Debug mode with extra logging
DEBUG=true npm run test:e2e

# View trace file
npx playwright show-trace server/__tests__/reports/traces/trace.zip

# Run specific test with debugging
PWDEBUG=1 npm run test:e2e -- auth/login.e2e.test.ts
```

### Health Monitoring

```bash
# Generate health report
npm run test:health-report

# View latest report
cat server/__tests__/reports/health/health-report-latest.json
```

### Performance Testing

```bash
# Run performance tests
npm run test:e2e -- performance/

# Run Lighthouse audit
npm run test:lighthouse
```

### Accessibility Testing

```bash
# Run accessibility tests
npm run test:e2e -- accessibility/

# Run WCAG compliance tests
npm run test:e2e -- accessibility/wcag-compliance.e2e.test.ts
```

## Helper Usage Patterns

### Pattern 1: Debug Flaky Test

```typescript
test('flaky test investigation', async ({ page, context }) => {
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

### Pattern 2: Monitor Test Health

```typescript
import { createTestHealthMonitor, recordTestFromPlaywright } from '../helpers/test-health.helper';

const monitor = createTestHealthMonitor({
  flakyThreshold: 0.2,
  slowTestThreshold: 30000,
  stabilityThreshold: 0.8,
  failureRateThreshold: 0.1,
});

test.afterEach(async ({}, testInfo) => {
  await recordTestFromPlaywright(testInfo, monitor);
});

test.afterAll(async () => {
  const report = await monitor.generateHealthReport();
  monitor.printHealthReport(report);
});
```

### Pattern 3: Comprehensive Test with All Helpers

```typescript
import { createDebugHelper } from '../helpers/debug.helper';
import { checkAccessibility } from '../helpers/accessibility.helper';
import { measureCoreWebVitals } from '../helpers/performance.helper';

test('comprehensive test', async ({ page, context }) => {
  const debug = createDebugHelper(page, context);
  
  // Start tracing
  await debug.startTracing('comprehensive-test');
  
  // Navigate
  debug.startStep('Navigation');
  await page.goto('/dashboard');
  debug.endStep('Navigation');
  
  // Check accessibility
  debug.startStep('Accessibility Check');
  await checkAccessibility(page);
  debug.endStep('Accessibility Check');
  
  // Measure performance
  debug.startStep('Performance Measurement');
  const metrics = await measureCoreWebVitals(page);
  expect(metrics.lcp).toBeLessThan(2500);
  debug.endStep('Performance Measurement');
  
  // Visual regression
  debug.startStep('Visual Check');
  await expect(page).toHaveScreenshot('dashboard.png');
  debug.endStep('Visual Check');
  
  // Stop tracing and generate profile
  await debug.stopTracing('comprehensive-test');
  await debug.generatePerformanceProfile('comprehensive-test');
});
```

## Output Locations

All helper outputs are saved to `server/__tests__/reports/`:

```
server/__tests__/reports/
├── traces/              # Trace files from debug helper
├── performance/         # Performance profiles
├── debug-snapshots/     # Debug snapshots
├── health/              # Health reports and data
│   ├── test-health-data.json
│   ├── health-report-latest.json
│   └── health-report-{timestamp}.json
├── screenshots/         # Test screenshots
├── videos/              # Test videos
└── html/                # HTML reports
```

## Best Practices

### Debugging

1. ✅ Use traces for flaky test investigation
2. ✅ Profile slow tests to find bottlenecks
3. ✅ Capture snapshots on test failures
4. ✅ Use selector suggestions for broken tests
5. ✅ Enable debug mode locally, disable in CI

### Health Monitoring

1. ✅ Generate health reports daily
2. ✅ Review alerts weekly
3. ✅ Fix critical issues immediately
4. ✅ Track metrics over time
5. ✅ Adjust thresholds based on project needs

### Accessibility

1. ✅ Test all pages for WCAG 2.1 AA compliance
2. ✅ Fix critical violations immediately
3. ✅ Test keyboard navigation
4. ✅ Verify color contrast ratios

### Performance

1. ✅ Measure Core Web Vitals on key pages
2. ✅ Keep LCP < 2.5s, FID < 100ms, CLS < 0.1
3. ✅ Run Lighthouse audits regularly
4. ✅ Track performance trends

### Visual Regression

1. ✅ Update baselines after intentional UI changes
2. ✅ Use appropriate thresholds for comparison
3. ✅ Test at multiple viewport sizes
4. ✅ Review diffs carefully

## Troubleshooting

### Debug Helper Issues

**Inspector not opening:**
```bash
# Ensure PWDEBUG is set
PWDEBUG=1 npm run test:e2e

# Or use headed mode
npm run test:e2e -- --headed
```

**Trace files too large:**
```typescript
// Disable screenshots in traces
await context.tracing.start({
  screenshots: false,
  snapshots: true,
  sources: true,
});
```

### Health Monitor Issues

**No data available:**
1. Ensure tests are recording results
2. Check `test.afterEach` hook is configured
3. Verify data file exists

**Inaccurate metrics:**
1. Clear health data and start fresh
2. Ensure consistent test naming
3. Check retry counting

### Performance Issues

**Metrics not accurate:**
1. Run tests in production mode
2. Disable browser extensions
3. Use consistent network conditions

### Accessibility Issues

**False positives:**
1. Review axe-core rules
2. Adjust rule configuration
3. Add exceptions for known issues

## Additional Resources

- [Playwright Documentation](https://playwright.dev)
- [Axe-core Rules](https://github.com/dequelabs/axe-core/blob/develop/doc/rule-descriptions.md)
- [Web Vitals](https://web.dev/vitals/)
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)

## Contributing

When adding new helpers:

1. Create helper file in `server/__tests__/helpers/`
2. Add comprehensive JSDoc comments
3. Create documentation file (e.g., `HELPER_NAME.md`)
4. Add usage examples
5. Update this README
6. Add tests if applicable

## Support

For questions or issues with test helpers:

1. Check the documentation files in this directory
2. Review existing tests for examples
3. Consult the E2E Testing Guide in `docs/`
4. Create an issue or ask in team chat
