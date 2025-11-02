# Test Reporters

This directory contains custom test reporters and report generators for the E2E test suite.

## Components

### Custom Reporter (`custom.reporter.ts`)

A Playwright Reporter implementation that provides:
- Real-time test execution feedback
- Test result aggregation
- Failure screenshot attachment
- Summary statistics
- Performance metrics tracking
- Accessibility violation summaries

**Usage:**

The custom reporter is automatically configured in `playwright.config.ts`:

```typescript
reporter: [
  ['./server/__tests__/reporters/custom.reporter.ts', { 
    outputDir: 'server/__tests__/reports/custom' 
  }],
  // ... other reporters
]
```

**Output Files:**

- `summary.json` - Overall test execution summary
- `failures.json` - Detailed failure information with artifacts
- `performance.json` - Performance metrics for all tests
- `accessibility.json` - Accessibility violations summary

### Report Generator (`report-generator.ts`)

Generates comprehensive test reports in multiple formats:

**Formats:**

1. **HTML Report** (`html/custom-report.html`)
   - Beautiful, interactive HTML report
   - Embedded screenshots
   - Performance metrics visualization
   - Accessibility violation details
   - Dark theme matching Unbuilt's design

2. **JUnit XML** (`junit/custom-results.xml`)
   - CI/CD integration format
   - Compatible with Jenkins, GitLab CI, GitHub Actions
   - Includes failure details and artifacts

3. **Consolidated JSON** (`json/consolidated-report.json`)
   - Programmatic access to all test data
   - Combines summary, failures, performance, and accessibility
   - Useful for custom dashboards and analysis

4. **Performance Dashboard** (`json/performance-dashboard.json`)
   - Performance metrics summary
   - Threshold violations
   - Slowest/fastest tests

5. **Accessibility Summary** (`json/accessibility-summary.json`)
   - WCAG violation overview
   - Critical issues highlighted
   - Remediation recommendations

**Usage:**

```bash
# Generate all reports after test execution
npm run test:e2e
node server/__tests__/reporters/report-generator.ts

# Or use the npm script
npm run test:reports
```

**Programmatic Usage:**

```typescript
import { ReportGenerator } from './server/__tests__/reporters/report-generator';

const generator = new ReportGenerator();
await generator.generateAllReports();
```

## Report Structure

```
server/__tests__/reports/
├── custom/                      # Custom reporter output
│   ├── summary.json
│   ├── failures.json
│   ├── performance.json
│   └── accessibility.json
├── html/                        # HTML reports
│   ├── index.html              # Playwright default
│   └── custom-report.html      # Custom enhanced report
├── junit/                       # JUnit XML reports
│   ├── results.xml             # Playwright default
│   └── custom-results.xml      # Custom enhanced XML
├── json/                        # JSON reports
│   ├── results.json            # Playwright default
│   ├── consolidated-report.json
│   ├── performance-dashboard.json
│   └── accessibility-summary.json
├── screenshots/                 # Failure screenshots
├── videos/                      # Failure videos
└── test-results/               # Playwright artifacts
```

## Features

### Real-Time Feedback

The custom reporter provides real-time console output during test execution:

```
🚀 Starting E2E Test Suite
📁 Test Directory: /path/to/tests
🌐 Base URL: http://localhost:5000
👥 Workers: 4
🔄 Retries: 2

✅ should login successfully (1234ms)
❌ should handle invalid credentials (567ms)
⏭️  should skip disabled test (skipped)
⚠️  should be flaky test is flaky (passed on retry 1)
```

### Summary Statistics

```
============================================================
📊 Test Execution Summary
============================================================
Total Tests:     50
✅ Passed:       45
❌ Failed:       3
⏭️  Skipped:      2
⚠️  Flaky:        1
📈 Pass Rate:    90.00%
⏱️  Duration:     45.23s
============================================================
```

### Failure Details

For each failure, the reporter captures:
- Test title and file location
- Error message and stack trace
- Screenshot (if available)
- Video recording (if available)
- Trace file (if available)
- Test duration and retry count

### Performance Tracking

Automatically tracks:
- Test execution duration
- Custom performance metrics (if attached)
- Slowest/fastest tests
- Average duration
- Performance threshold violations

### Accessibility Monitoring

Tracks accessibility violations:
- Total violations by impact level
- WCAG criterion violations
- Affected elements count
- Remediation recommendations

## CI/CD Integration

### GitHub Actions

```yaml
- name: Run E2E Tests
  run: npm run test:e2e

- name: Generate Reports
  if: always()
  run: node server/__tests__/reporters/report-generator.ts

- name: Upload Reports
  if: always()
  uses: actions/upload-artifact@v3
  with:
    name: test-reports
    path: server/__tests__/reports/
```

### Reading JUnit XML

Most CI systems automatically parse JUnit XML:

```yaml
# GitLab CI
artifacts:
  reports:
    junit: server/__tests__/reports/junit/custom-results.xml

# Jenkins
junit 'server/__tests__/reports/junit/custom-results.xml'
```

## Customization

### Custom Reporter Options

```typescript
// playwright.config.ts
reporter: [
  ['./server/__tests__/reporters/custom.reporter.ts', {
    outputDir: 'custom/path',
    // Add custom options here
  }]
]
```

### Report Generator Options

```typescript
const generator = new ReportGenerator('custom/reports/path');
await generator.generateAllReports();
```

## Best Practices

1. **Always generate reports after test execution** - Reports provide valuable insights
2. **Review HTML report for visual overview** - Easy to spot patterns and issues
3. **Use JUnit XML in CI/CD** - Automatic test result integration
4. **Monitor flaky tests** - Fix them to improve reliability
5. **Track performance trends** - Identify performance regressions early
6. **Address accessibility violations** - Ensure WCAG compliance

## Troubleshooting

### Reports not generated

Ensure tests have completed:
```bash
npm run test:e2e -- --reporter=list
node server/__tests__/reporters/report-generator.ts
```

### Missing screenshots

Screenshots are only captured on failure. Check:
- `screenshot: 'only-on-failure'` in playwright.config.ts
- Test actually failed (not skipped)
- Output directory has write permissions

### Performance metrics missing

Performance metrics must be attached to test results:

```typescript
test('my test', async ({ page }, testInfo) => {
  // ... test code ...
  
  await testInfo.attach('performance-metrics', {
    body: JSON.stringify({ duration: 1234, lcp: 2500 }),
    contentType: 'application/json'
  });
});
```

### Accessibility violations not showing

Ensure accessibility tests are running:

```typescript
import { injectAxe, checkA11y } from 'axe-playwright';

test('accessibility', async ({ page }, testInfo) => {
  await page.goto('/');
  await injectAxe(page);
  
  try {
    await checkA11y(page);
  } catch (error) {
    // Violations will be attached automatically
  }
});
```

## Requirements Coverage

This implementation satisfies requirements:
- **9.1**: Test result aggregation with total, passed, failed, blocked counts
- **9.2**: Failure capture with screenshots, errors, stack traces, reproduction steps
- **9.3**: Performance metrics collection and reporting
- **9.4**: Accessibility violation listing by WCAG criterion
- **9.5**: Multiple export formats (HTML, JSON, JUnit XML)
