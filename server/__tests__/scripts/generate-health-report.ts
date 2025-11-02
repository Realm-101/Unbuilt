#!/usr/bin/env node

/**
 * Generate Test Health Report
 * 
 * Analyzes test execution history and generates a comprehensive health report
 * including flaky tests, slow tests, and stability metrics.
 * 
 * Usage:
 *   npm run test:health-report
 *   node server/__tests__/scripts/generate-health-report.ts
 */

import { createTestHealthMonitor } from '../helpers/test-health.helper';

async function main() {
  console.log('🏥 Generating Test Health Report...\n');

  const monitor = createTestHealthMonitor({
    flakyThreshold: 0.2,        // 20% retry rate
    slowTestThreshold: 30000,   // 30 seconds
    stabilityThreshold: 0.8,    // 80% stability
    failureRateThreshold: 0.1,  // 10% failure rate
  });

  // Generate comprehensive report
  const report = await monitor.generateHealthReport();

  // Print to console
  monitor.printHealthReport(report);

  // Print detailed sections
  console.log('📋 Detailed Analysis:\n');

  // Flaky tests
  const flakyTests = await monitor.getFlakyTests();
  if (flakyTests.length > 0) {
    console.log(`⚠️  Flaky Tests (${flakyTests.length}):`);
    flakyTests.slice(0, 10).forEach((test, i) => {
      console.log(`  ${i + 1}. ${test.testName}`);
      console.log(`     Retry Rate: ${(test.retryRate * 100).toFixed(1)}%`);
      console.log(`     Stability: ${(test.stabilityScore * 100).toFixed(1)}%`);
      console.log(`     Runs: ${test.totalRuns} (${test.passedRuns} passed, ${test.failedRuns} failed)`);
      console.log('');
    });
  }

  // Slow tests
  const slowTests = await monitor.getSlowTests();
  if (slowTests.length > 0) {
    console.log(`🐌 Slow Tests (${slowTests.length}):`);
    slowTests.slice(0, 10).forEach((test, i) => {
      console.log(`  ${i + 1}. ${test.testName}`);
      console.log(`     Average Duration: ${(test.averageDuration / 1000).toFixed(1)}s`);
      console.log(`     Min: ${(test.minDuration / 1000).toFixed(1)}s, Max: ${(test.maxDuration / 1000).toFixed(1)}s`);
      console.log('');
    });
  }

  // Failing tests
  const failingTests = await monitor.getFailingTests();
  if (failingTests.length > 0) {
    console.log(`❌ Failing Tests (${failingTests.length}):`);
    failingTests.slice(0, 10).forEach((test, i) => {
      const failureRate = (test.failedRuns / test.totalRuns) * 100;
      console.log(`  ${i + 1}. ${test.testName}`);
      console.log(`     Failure Rate: ${failureRate.toFixed(1)}%`);
      console.log(`     Runs: ${test.totalRuns} (${test.failedRuns} failed)`);
      if (test.lastFailure) {
        console.log(`     Last Failure: ${test.lastFailure.toISOString()}`);
      }
      console.log('');
    });
  }

  // Recommendations
  console.log('💡 Recommendations:\n');

  if (flakyTests.length > 0) {
    console.log('  • Fix flaky tests by:');
    console.log('    - Adding proper waits (waitForSelector, waitForLoadState)');
    console.log('    - Using more stable selectors (data-testid)');
    console.log('    - Improving test isolation');
    console.log('    - Increasing timeouts for slow operations');
    console.log('');
  }

  if (slowTests.length > 0) {
    console.log('  • Optimize slow tests by:');
    console.log('    - Using API calls for setup instead of UI interactions');
    console.log('    - Reducing unnecessary waits');
    console.log('    - Parallelizing independent operations');
    console.log('    - Mocking slow external services');
    console.log('');
  }

  if (failingTests.length > 0) {
    console.log('  • Address failing tests by:');
    console.log('    - Investigating root cause of failures');
    console.log('    - Updating tests for changed functionality');
    console.log('    - Fixing broken selectors');
    console.log('    - Improving error handling');
    console.log('');
  }

  if (report.overallHealth < 0.8) {
    console.log('  ⚠️  Overall test health is below 80%');
    console.log('     Consider dedicating time to test maintenance');
    console.log('');
  }

  console.log('✅ Health report generation complete\n');
  console.log(`Report saved to: server/__tests__/reports/health/health-report-latest.json`);
}

main().catch((error) => {
  console.error('Error generating health report:', error);
  process.exit(1);
});
