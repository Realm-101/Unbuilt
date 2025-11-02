# Test Health Monitoring

This document describes the test health monitoring system for tracking test stability, performance, and reliability.

## Overview

The Test Health Monitoring system tracks test execution history and provides insights into:

- **Flaky Tests** - Tests with high retry rates
- **Slow Tests** - Tests exceeding duration thresholds
- **Failing Tests** - Tests with high failure rates
- **Stability Scores** - Overall test reliability metrics

## Features

### 1. Automatic Test Result Recording

Test results are automatically recorded during test execution, tracking:
- Test status (passed, failed, skipped, flaky)
- Execution duration
- Retry count
- Timestamp
- Error messages

### 2. Health Metrics Calculation

For each test, the system calculates:
- Total runs, passed runs, failed runs, flaky runs
- Average, min, and max duration
- Retry rate
- Stability score (0-1, higher is better)
- Last failure and success timestamps

### 3. Health Reports

Comprehensive reports include:
- Overall test suite health score
- Count of healthy, flaky, slow, and failing tests
- Detailed metrics for each test
- Alerts for tests exceeding thresholds

### 4. Alerting System

Automatic alerts for:
- High retry rates (flaky tests)
- Slow execution times
- Low stability scores
- High failure rates

## Usage

### Recording Test Results

#### Automatic Recording with Playwright

```typescript
import { test } from '@playwright/test';
import { createTestHealthMonitor, recordTestFromPlaywright } from '../helpers/test-health.helper';

const monitor = createTestHealthMonitor();

test.afterEach(async ({}, testInfo) => {
  await recordTestFromPlaywright(testInfo, monitor);
});

test('my test', async ({ page }) => {
  // Test code here
});
```

#### Manual Recording

```typescript
import { createTestHealthMonitor } from '../helpers/test-health.helper';

const monitor = createTestHealthMonitor();

await monitor.recordTestResult({
  testName: 'Login flow',
  status: 'passed',
  duration: 2500,
  retries: 0,
  timestamp: new Date(),
});
```

### Generating Health Reports

#### Command Line

```bash
# Generate health report
npm run test:health-report

# Or directly
node server/__tests__/scripts/generate-health-report.ts
```

#### Programmatic

```typescript
import { createTestHealthMonitor } from '../helpers/test-health.helper';

const monitor = createTestHealthMonitor();

// Generate report
const report = await monitor.generateHealthReport();

// Print to console
monitor.printHealthReport(report);

// Access report data
console.log(`Overall Health: ${report.overallHealth * 100}%`);
console.log(`Flaky Tests: ${report.flakyTests}`);
console.log(`Slow Tests: ${report.slowTests}`);
```

### Querying Specific Issues

#### Get Flaky Tests

```typescript
const monitor = createTestHealthMonitor();

const flakyTests = await monitor.getFlakyTests();

flakyTests.forEach((test) => {
  console.log(`${test.testName}: ${test.retryRate * 100}% retry rate`);
});
```

#### Get Slow Tests

```typescript
const monitor = createTestHealthMonitor();

const slowTests = await monitor.getSlowTests();

slowTests.forEach((test) => {
  console.log(`${test.testName}: ${test.averageDuration / 1000}s average`);
});
```

#### Get Failing Tests

```typescript
const monitor = createTestHealthMonitor();

const failingTests = await monitor.getFailingTests();

failingTests.forEach((test) => {
  const failureRate = (test.failedRuns / test.totalRuns) * 100;
  console.log(`${test.testName}: ${failureRate}% failure rate`);
});
```

### Custom Thresholds

Configure thresholds for your project:

```typescript
const monitor = createTestHealthMonitor({
  flakyThreshold: 0.15,        // 15% retry rate (default: 20%)
  slowTestThreshold: 20000,    // 20 seconds (default: 30s)
  stabilityThreshold: 0.9,     // 90% stability (default: 80%)
  failureRateThreshold: 0.05,  // 5% failure rate (default: 10%)
});
```

## Health Metrics Explained

### Retry Rate

Percentage of test runs that required retries:
- **< 10%**: Healthy
- **10-20%**: Monitor
- **> 20%**: Flaky - needs attention

### Stability Score

Composite score based on pass rate and flakiness:
- **> 90%**: Excellent
- **80-90%**: Good
- **60-80%**: Fair
- **< 60%**: Poor - needs immediate attention

Calculation: `passRate - (flakyRate * 0.5)`

### Average Duration

Mean execution time across all runs:
- **< 10s**: Fast
- **10-30s**: Normal
- **> 30s**: Slow - consider optimization

### Failure Rate

Percentage of test runs that failed:
- **< 5%**: Healthy
- **5-10%**: Monitor
- **> 10%**: Failing - needs fixing

## Alert Severity Levels

### Critical 🚨

Immediate attention required:
- Retry rate > 50%
- Average duration > 60s
- Stability score < 50%
- Failure rate > 50%

### Warning ⚠️

Should be addressed soon:
- Retry rate 20-50%
- Average duration 30-60s
- Stability score 50-80%
- Failure rate 10-50%

### Info ℹ️

For awareness:
- Minor deviations from thresholds
- Trends to monitor

## Health Report Output

### Console Output

```
================================================================================
📊 TEST HEALTH REPORT
================================================================================
Generated: 2025-01-29T10:30:00.000Z

Overall Health: 85.5%

Test Summary:
  Total Tests: 120
  ✅ Healthy: 103 (85.8%)
  ⚠️  Flaky: 12 (10.0%)
  🐌 Slow: 8 (6.7%)
  ❌ Failing: 5 (4.2%)

⚠️  Alerts (17):

  🚨 Critical (3):
    - auth/login.e2e.test.ts: Test is flaky with 55.0% retry rate
    - features/search.e2e.test.ts: Test is slow with average duration of 65.2s
    - security/rate-limiting.e2e.test.ts: Test has low stability score of 45.0%

  ⚠️  Warning (14):
    - features/conversations.e2e.test.ts: Test is flaky with 25.0% retry rate
    - visual/theme.e2e.test.ts: Test is slow with average duration of 35.8s
    ...

================================================================================
```

### JSON Report

Reports are saved to:
- `server/__tests__/reports/health/health-report-latest.json` (latest)
- `server/__tests__/reports/health/health-report-{timestamp}.json` (historical)

Structure:
```json
{
  "generatedAt": "2025-01-29T10:30:00.000Z",
  "totalTests": 120,
  "healthyTests": 103,
  "flakyTests": 12,
  "slowTests": 8,
  "failingTests": 5,
  "overallHealth": 0.855,
  "metrics": [
    {
      "testName": "auth/login.e2e.test.ts",
      "totalRuns": 50,
      "passedRuns": 45,
      "failedRuns": 5,
      "flakyRuns": 10,
      "averageDuration": 2500,
      "minDuration": 2000,
      "maxDuration": 5000,
      "retryRate": 0.2,
      "stabilityScore": 0.8,
      "lastFailure": "2025-01-28T15:30:00.000Z",
      "lastSuccess": "2025-01-29T10:25:00.000Z"
    }
  ],
  "alerts": [
    {
      "severity": "warning",
      "testName": "auth/login.e2e.test.ts",
      "message": "Test is flaky with 20.0% retry rate",
      "metric": "retryRate",
      "value": 0.2,
      "threshold": 0.2
    }
  ]
}
```

## CI/CD Integration

### GitHub Actions

Add health monitoring to your workflow:

```yaml
name: Test Health Report

on:
  schedule:
    - cron: '0 0 * * *'  # Daily at midnight
  workflow_dispatch:

jobs:
  health-report:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Generate health report
        run: npm run test:health-report
      
      - name: Upload report
        uses: actions/upload-artifact@v3
        with:
          name: health-report
          path: server/__tests__/reports/health/health-report-latest.json
      
      - name: Check health threshold
        run: |
          HEALTH=$(node -e "console.log(require('./server/__tests__/reports/health/health-report-latest.json').overallHealth)")
          if (( $(echo "$HEALTH < 0.8" | bc -l) )); then
            echo "::warning::Test health is below 80%: $HEALTH"
          fi
```

### Slack Notifications

Send alerts to Slack:

```typescript
import { createTestHealthMonitor } from '../helpers/test-health.helper';

const monitor = createTestHealthMonitor();
const report = await monitor.generateHealthReport();

if (report.overallHealth < 0.8) {
  // Send Slack notification
  await fetch(process.env.SLACK_WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text: `⚠️ Test Health Alert: ${(report.overallHealth * 100).toFixed(1)}%`,
      attachments: [{
        color: 'warning',
        fields: [
          { title: 'Flaky Tests', value: report.flakyTests.toString(), short: true },
          { title: 'Slow Tests', value: report.slowTests.toString(), short: true },
          { title: 'Failing Tests', value: report.failingTests.toString(), short: true },
        ]
      }]
    })
  });
}
```

## Maintenance Workflows

### Daily Health Check

```bash
# Run daily to monitor test health
npm run test:health-report
```

### Weekly Review

1. Generate health report
2. Review flaky tests
3. Investigate slow tests
4. Fix failing tests
5. Update thresholds if needed

### Monthly Cleanup

```typescript
// Clear old health data (keep last 100 runs per test)
const monitor = createTestHealthMonitor();
await monitor.clearHealthData();
```

## Best Practices

### 1. Regular Monitoring

- Generate health reports daily
- Review alerts weekly
- Address critical issues immediately

### 2. Flaky Test Management

- Fix flaky tests promptly
- Don't rely on retries as a solution
- Investigate root causes

### 3. Performance Optimization

- Keep tests under 30 seconds
- Use API calls for setup
- Parallelize when possible

### 4. Threshold Tuning

- Adjust thresholds based on your project
- Stricter for critical paths
- More lenient for complex E2E flows

### 5. Historical Tracking

- Keep health reports for trend analysis
- Track improvements over time
- Identify patterns in failures

## Troubleshooting

### No Data Available

If health reports show no data:
1. Ensure tests are recording results
2. Check that `test.afterEach` hook is configured
3. Verify data file exists: `server/__tests__/reports/health/test-health-data.json`

### Inaccurate Metrics

If metrics seem wrong:
1. Clear health data and start fresh
2. Ensure consistent test naming
3. Check that retries are properly counted

### High False Positive Rate

If too many alerts:
1. Adjust thresholds to match your project
2. Consider test complexity
3. Review alert severity levels

## Data Storage

Health data is stored in:
- **Test Results**: `server/__tests__/reports/health/test-health-data.json`
- **Reports**: `server/__tests__/reports/health/health-report-*.json`

Data retention:
- Last 100 runs per test
- All historical reports (manual cleanup)

## API Reference

### TestHealthMonitor

```typescript
class TestHealthMonitor {
  // Record a test result
  recordTestResult(result: TestResult): Promise<void>
  
  // Calculate metrics for a test
  calculateTestMetrics(testName: string): TestHealthMetrics | null
  
  // Generate comprehensive report
  generateHealthReport(): Promise<TestHealthReport>
  
  // Get flaky tests
  getFlakyTests(): Promise<TestHealthMetrics[]>
  
  // Get slow tests
  getSlowTests(): Promise<TestHealthMetrics[]>
  
  // Get failing tests
  getFailingTests(): Promise<TestHealthMetrics[]>
  
  // Print report to console
  printHealthReport(report: TestHealthReport): void
  
  // Clear all health data
  clearHealthData(): Promise<void>
}
```

### Helper Functions

```typescript
// Create monitor instance
createTestHealthMonitor(thresholds?: Partial<HealthThresholds>): TestHealthMonitor

// Record from Playwright test info
recordTestFromPlaywright(testInfo: any, monitor: TestHealthMonitor): Promise<void>
```

## Examples

See `server/__tests__/scripts/generate-health-report.ts` for a complete example.
