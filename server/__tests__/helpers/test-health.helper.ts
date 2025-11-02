/**
 * Test Health Monitoring Helper
 * 
 * Tracks and monitors test health metrics including:
 * - Flaky test detection and retry rates
 * - Test execution times
 * - Test stability reports
 * - Alerting for degraded test health
 * 
 * Requirements: 13.2
 */

import { writeFile, readFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';

export interface TestResult {
  testName: string;
  status: 'passed' | 'failed' | 'skipped' | 'flaky';
  duration: number;
  retries: number;
  timestamp: Date;
  error?: string;
}

export interface TestHealthMetrics {
  testName: string;
  totalRuns: number;
  passedRuns: number;
  failedRuns: number;
  flakyRuns: number;
  averageDuration: number;
  minDuration: number;
  maxDuration: number;
  retryRate: number;
  stabilityScore: number;
  lastFailure?: Date;
  lastSuccess?: Date;
}

export interface TestHealthReport {
  generatedAt: Date;
  totalTests: number;
  healthyTests: number;
  flakyTests: number;
  slowTests: number;
  failingTests: number;
  overallHealth: number;
  metrics: TestHealthMetrics[];
  alerts: TestHealthAlert[];
}

export interface TestHealthAlert {
  severity: 'critical' | 'warning' | 'info';
  testName: string;
  message: string;
  metric: string;
  value: number;
  threshold: number;
}

export interface HealthThresholds {
  flakyThreshold: number;        // Retry rate threshold (default: 0.2 = 20%)
  slowTestThreshold: number;     // Duration threshold in ms (default: 30000)
  stabilityThreshold: number;    // Stability score threshold (default: 0.8 = 80%)
  failureRateThreshold: number;  // Failure rate threshold (default: 0.1 = 10%)
}

export class TestHealthMonitor {
  private dataFile: string;
  private thresholds: HealthThresholds;
  private testResults: Map<string, TestResult[]> = new Map();

  constructor(thresholds?: Partial<HealthThresholds>) {
    this.dataFile = join(
      process.cwd(),
      'server/__tests__/reports/health',
      'test-health-data.json'
    );

    this.thresholds = {
      flakyThreshold: thresholds?.flakyThreshold ?? 0.2,
      slowTestThreshold: thresholds?.slowTestThreshold ?? 30000,
      stabilityThreshold: thresholds?.stabilityThreshold ?? 0.8,
      failureRateThreshold: thresholds?.failureRateThreshold ?? 0.1,
    };
  }

  /**
   * Record a test result
   */
  async recordTestResult(result: TestResult): Promise<void> {
    // Load existing results
    await this.loadResults();

    // Add new result
    const results = this.testResults.get(result.testName) || [];
    results.push(result);
    this.testResults.set(result.testName, results);

    // Keep only last 100 results per test
    if (results.length > 100) {
      results.shift();
    }

    // Save results
    await this.saveResults();
  }

  /**
   * Calculate metrics for a specific test
   */
  calculateTestMetrics(testName: string): TestHealthMetrics | null {
    const results = this.testResults.get(testName);
    if (!results || results.length === 0) return null;

    const totalRuns = results.length;
    const passedRuns = results.filter((r) => r.status === 'passed').length;
    const failedRuns = results.filter((r) => r.status === 'failed').length;
    const flakyRuns = results.filter((r) => r.status === 'flaky' || r.retries > 0).length;

    const durations = results.map((r) => r.duration);
    const averageDuration = durations.reduce((sum, d) => sum + d, 0) / durations.length;
    const minDuration = Math.min(...durations);
    const maxDuration = Math.max(...durations);

    const totalRetries = results.reduce((sum, r) => sum + r.retries, 0);
    const retryRate = totalRetries / totalRuns;

    // Calculate stability score (0-1, higher is better)
    const passRate = passedRuns / totalRuns;
    const flakyPenalty = (flakyRuns / totalRuns) * 0.5;
    const stabilityScore = Math.max(0, passRate - flakyPenalty);

    const lastFailure = results
      .filter((r) => r.status === 'failed')
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())[0]?.timestamp;

    const lastSuccess = results
      .filter((r) => r.status === 'passed')
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())[0]?.timestamp;

    return {
      testName,
      totalRuns,
      passedRuns,
      failedRuns,
      flakyRuns,
      averageDuration,
      minDuration,
      maxDuration,
      retryRate,
      stabilityScore,
      lastFailure,
      lastSuccess,
    };
  }

  /**
   * Generate comprehensive health report
   */
  async generateHealthReport(): Promise<TestHealthReport> {
    await this.loadResults();

    const allMetrics: TestHealthMetrics[] = [];
    const alerts: TestHealthAlert[] = [];

    // Calculate metrics for each test
    for (const testName of this.testResults.keys()) {
      const metrics = this.calculateTestMetrics(testName);
      if (metrics) {
        allMetrics.push(metrics);

        // Check for alerts
        alerts.push(...this.checkTestHealth(metrics));
      }
    }

    // Calculate overall statistics
    const totalTests = allMetrics.length;
    const healthyTests = allMetrics.filter(
      (m) => m.stabilityScore >= this.thresholds.stabilityThreshold
    ).length;
    const flakyTests = allMetrics.filter(
      (m) => m.retryRate >= this.thresholds.flakyThreshold
    ).length;
    const slowTests = allMetrics.filter(
      (m) => m.averageDuration >= this.thresholds.slowTestThreshold
    ).length;
    const failingTests = allMetrics.filter(
      (m) => m.failedRuns / m.totalRuns >= this.thresholds.failureRateThreshold
    ).length;

    const overallHealth = totalTests > 0 ? healthyTests / totalTests : 1;

    const report: TestHealthReport = {
      generatedAt: new Date(),
      totalTests,
      healthyTests,
      flakyTests,
      slowTests,
      failingTests,
      overallHealth,
      metrics: allMetrics,
      alerts,
    };

    // Save report
    await this.saveReport(report);

    return report;
  }

  /**
   * Check test health and generate alerts
   */
  private checkTestHealth(metrics: TestHealthMetrics): TestHealthAlert[] {
    const alerts: TestHealthAlert[] = [];

    // Check for flaky tests
    if (metrics.retryRate >= this.thresholds.flakyThreshold) {
      alerts.push({
        severity: metrics.retryRate >= 0.5 ? 'critical' : 'warning',
        testName: metrics.testName,
        message: `Test is flaky with ${(metrics.retryRate * 100).toFixed(1)}% retry rate`,
        metric: 'retryRate',
        value: metrics.retryRate,
        threshold: this.thresholds.flakyThreshold,
      });
    }

    // Check for slow tests
    if (metrics.averageDuration >= this.thresholds.slowTestThreshold) {
      alerts.push({
        severity: metrics.averageDuration >= this.thresholds.slowTestThreshold * 2 ? 'critical' : 'warning',
        testName: metrics.testName,
        message: `Test is slow with average duration of ${(metrics.averageDuration / 1000).toFixed(1)}s`,
        metric: 'averageDuration',
        value: metrics.averageDuration,
        threshold: this.thresholds.slowTestThreshold,
      });
    }

    // Check for low stability
    if (metrics.stabilityScore < this.thresholds.stabilityThreshold) {
      alerts.push({
        severity: metrics.stabilityScore < 0.5 ? 'critical' : 'warning',
        testName: metrics.testName,
        message: `Test has low stability score of ${(metrics.stabilityScore * 100).toFixed(1)}%`,
        metric: 'stabilityScore',
        value: metrics.stabilityScore,
        threshold: this.thresholds.stabilityThreshold,
      });
    }

    // Check for high failure rate
    const failureRate = metrics.failedRuns / metrics.totalRuns;
    if (failureRate >= this.thresholds.failureRateThreshold) {
      alerts.push({
        severity: failureRate >= 0.5 ? 'critical' : 'warning',
        testName: metrics.testName,
        message: `Test has high failure rate of ${(failureRate * 100).toFixed(1)}%`,
        metric: 'failureRate',
        value: failureRate,
        threshold: this.thresholds.failureRateThreshold,
      });
    }

    return alerts;
  }

  /**
   * Get flaky tests
   */
  async getFlakyTests(): Promise<TestHealthMetrics[]> {
    await this.loadResults();

    const flakyTests: TestHealthMetrics[] = [];

    for (const testName of this.testResults.keys()) {
      const metrics = this.calculateTestMetrics(testName);
      if (metrics && metrics.retryRate >= this.thresholds.flakyThreshold) {
        flakyTests.push(metrics);
      }
    }

    // Sort by retry rate (highest first)
    flakyTests.sort((a, b) => b.retryRate - a.retryRate);

    return flakyTests;
  }

  /**
   * Get slow tests
   */
  async getSlowTests(): Promise<TestHealthMetrics[]> {
    await this.loadResults();

    const slowTests: TestHealthMetrics[] = [];

    for (const testName of this.testResults.keys()) {
      const metrics = this.calculateTestMetrics(testName);
      if (metrics && metrics.averageDuration >= this.thresholds.slowTestThreshold) {
        slowTests.push(metrics);
      }
    }

    // Sort by duration (slowest first)
    slowTests.sort((a, b) => b.averageDuration - a.averageDuration);

    return slowTests;
  }

  /**
   * Get failing tests
   */
  async getFailingTests(): Promise<TestHealthMetrics[]> {
    await this.loadResults();

    const failingTests: TestHealthMetrics[] = [];

    for (const testName of this.testResults.keys()) {
      const metrics = this.calculateTestMetrics(testName);
      if (metrics) {
        const failureRate = metrics.failedRuns / metrics.totalRuns;
        if (failureRate >= this.thresholds.failureRateThreshold) {
          failingTests.push(metrics);
        }
      }
    }

    // Sort by failure rate (highest first)
    failingTests.sort((a, b) => {
      const aRate = a.failedRuns / a.totalRuns;
      const bRate = b.failedRuns / b.totalRuns;
      return bRate - aRate;
    });

    return failingTests;
  }

  /**
   * Print health report to console
   */
  printHealthReport(report: TestHealthReport): void {
    console.log('\n' + '='.repeat(80));
    console.log('📊 TEST HEALTH REPORT');
    console.log('='.repeat(80));
    console.log(`Generated: ${report.generatedAt.toISOString()}`);
    console.log(`\nOverall Health: ${(report.overallHealth * 100).toFixed(1)}%`);
    console.log(`\nTest Summary:`);
    console.log(`  Total Tests: ${report.totalTests}`);
    console.log(`  ✅ Healthy: ${report.healthyTests} (${((report.healthyTests / report.totalTests) * 100).toFixed(1)}%)`);
    console.log(`  ⚠️  Flaky: ${report.flakyTests} (${((report.flakyTests / report.totalTests) * 100).toFixed(1)}%)`);
    console.log(`  🐌 Slow: ${report.slowTests} (${((report.slowTests / report.totalTests) * 100).toFixed(1)}%)`);
    console.log(`  ❌ Failing: ${report.failingTests} (${((report.failingTests / report.totalTests) * 100).toFixed(1)}%)`);

    if (report.alerts.length > 0) {
      console.log(`\n⚠️  Alerts (${report.alerts.length}):`);

      const criticalAlerts = report.alerts.filter((a) => a.severity === 'critical');
      const warningAlerts = report.alerts.filter((a) => a.severity === 'warning');

      if (criticalAlerts.length > 0) {
        console.log(`\n  🚨 Critical (${criticalAlerts.length}):`);
        criticalAlerts.slice(0, 5).forEach((alert) => {
          console.log(`    - ${alert.testName}: ${alert.message}`);
        });
      }

      if (warningAlerts.length > 0) {
        console.log(`\n  ⚠️  Warning (${warningAlerts.length}):`);
        warningAlerts.slice(0, 5).forEach((alert) => {
          console.log(`    - ${alert.testName}: ${alert.message}`);
        });
      }
    }

    console.log('\n' + '='.repeat(80) + '\n');
  }

  /**
   * Load results from file
   */
  private async loadResults(): Promise<void> {
    try {
      if (existsSync(this.dataFile)) {
        const data = await readFile(this.dataFile, 'utf-8');
        const parsed = JSON.parse(data);

        this.testResults.clear();
        for (const [testName, results] of Object.entries(parsed)) {
          this.testResults.set(
            testName,
            (results as any[]).map((r) => ({
              ...r,
              timestamp: new Date(r.timestamp),
            }))
          );
        }
      }
    } catch (error) {
      console.error('Error loading test health data:', error);
    }
  }

  /**
   * Save results to file
   */
  private async saveResults(): Promise<void> {
    try {
      await mkdir(join(process.cwd(), 'server/__tests__/reports/health'), {
        recursive: true,
      });

      const data: Record<string, TestResult[]> = {};
      for (const [testName, results] of this.testResults.entries()) {
        data[testName] = results;
      }

      await writeFile(this.dataFile, JSON.stringify(data, null, 2));
    } catch (error) {
      console.error('Error saving test health data:', error);
    }
  }

  /**
   * Save health report
   */
  private async saveReport(report: TestHealthReport): Promise<void> {
    try {
      const reportPath = join(
        process.cwd(),
        'server/__tests__/reports/health',
        `health-report-${Date.now()}.json`
      );

      await writeFile(reportPath, JSON.stringify(report, null, 2));

      // Also save as latest
      const latestPath = join(
        process.cwd(),
        'server/__tests__/reports/health',
        'health-report-latest.json'
      );

      await writeFile(latestPath, JSON.stringify(report, null, 2));

      console.log(`📊 Health report saved to: ${reportPath}`);
    } catch (error) {
      console.error('Error saving health report:', error);
    }
  }

  /**
   * Clear all health data
   */
  async clearHealthData(): Promise<void> {
    this.testResults.clear();
    await this.saveResults();
    console.log('✅ Test health data cleared');
  }
}

/**
 * Create a test health monitor instance
 */
export function createTestHealthMonitor(thresholds?: Partial<HealthThresholds>): TestHealthMonitor {
  return new TestHealthMonitor(thresholds);
}

/**
 * Record test result from Playwright test info
 */
export async function recordTestFromPlaywright(
  testInfo: any,
  monitor: TestHealthMonitor
): Promise<void> {
  const result: TestResult = {
    testName: testInfo.title,
    status: testInfo.status === 'passed' ? 'passed' : testInfo.status === 'failed' ? 'failed' : 'skipped',
    duration: testInfo.duration,
    retries: testInfo.retry,
    timestamp: new Date(),
    error: testInfo.error?.message,
  };

  // Mark as flaky if it passed after retries
  if (result.status === 'passed' && result.retries > 0) {
    result.status = 'flaky';
  }

  await monitor.recordTestResult(result);
}
