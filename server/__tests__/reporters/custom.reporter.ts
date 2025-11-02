/**
 * Custom Playwright Test Reporter
 * 
 * Implements the Playwright Reporter interface to provide:
 * - Test result aggregation
 * - Failure screenshot attachment
 * - Summary statistics
 * - Performance metrics tracking
 * - Accessibility violation summaries
 * 
 * Requirements: 9.1, 9.2, 9.3, 9.4, 9.5
 */

import {
  Reporter,
  FullConfig,
  Suite,
  TestCase,
  TestResult,
  FullResult,
} from '@playwright/test/reporter';
import * as fs from 'fs';
import * as path from 'path';

interface TestStats {
  total: number;
  passed: number;
  failed: number;
  skipped: number;
  flaky: number;
  duration: number;
  passRate: number;
}

interface FailureInfo {
  testTitle: string;
  testFile: string;
  error: string;
  stack?: string;
  screenshot?: string;
  video?: string;
  trace?: string;
  duration: number;
  retries: number;
}

interface PerformanceMetric {
  testTitle: string;
  duration: number;
  url?: string;
  metrics?: Record<string, number>;
}

interface AccessibilityViolation {
  testTitle: string;
  violations: Array<{
    id: string;
    impact: string;
    description: string;
    nodes: number;
  }>;
}

class CustomReporter implements Reporter {
  private config!: FullConfig;
  private suite!: Suite;
  private startTime!: number;
  private stats: TestStats = {
    total: 0,
    passed: 0,
    failed: 0,
    skipped: 0,
    flaky: 0,
    duration: 0,
    passRate: 0,
  };
  private failures: FailureInfo[] = [];
  private performanceMetrics: PerformanceMetric[] = [];
  private accessibilityViolations: AccessibilityViolation[] = [];
  private outputDir: string;

  constructor(options: { outputDir?: string } = {}) {
    this.outputDir = options.outputDir || 'server/__tests__/reports/custom';
    this.ensureOutputDir();
  }

  private ensureOutputDir(): void {
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }
  }

  onBegin(config: FullConfig, suite: Suite): void {
    this.config = config;
    this.suite = suite;
    this.startTime = Date.now();
    
    console.log('\n🚀 Starting E2E Test Suite');
    console.log(`📁 Test Directory: ${config.rootDir}`);
    console.log(`🌐 Base URL: ${config.projects[0]?.use?.baseURL || 'Not set'}`);
    console.log(`👥 Workers: ${config.workers}`);
    console.log(`🔄 Retries: ${config.projects[0]?.retries || 0}`);
    console.log('');
  }

  onTestBegin(test: TestCase): void {
    // Optional: Log test start
    if (process.env.VERBOSE) {
      console.log(`▶️  ${test.title}`);
    }
  }

  onTestEnd(test: TestCase, result: TestResult): void {
    this.stats.total++;
    this.stats.duration += result.duration;

    // Track test status
    if (result.status === 'passed') {
      this.stats.passed++;
      console.log(`✅ ${test.title} (${result.duration}ms)`);
    } else if (result.status === 'failed') {
      this.stats.failed++;
      console.log(`❌ ${test.title} (${result.duration}ms)`);
      this.recordFailure(test, result);
    } else if (result.status === 'skipped') {
      this.stats.skipped++;
      console.log(`⏭️  ${test.title} (skipped)`);
    } else if (result.status === 'timedOut') {
      this.stats.failed++;
      console.log(`⏱️  ${test.title} (timeout)`);
      this.recordFailure(test, result);
    }

    // Track flaky tests (passed after retry)
    if (result.status === 'passed' && result.retry > 0) {
      this.stats.flaky++;
      console.log(`⚠️  ${test.title} is flaky (passed on retry ${result.retry})`);
    }

    // Extract performance metrics
    this.extractPerformanceMetrics(test, result);

    // Extract accessibility violations
    this.extractAccessibilityViolations(test, result);
  }

  private recordFailure(test: TestCase, result: TestResult): void {
    const failure: FailureInfo = {
      testTitle: test.title,
      testFile: test.location.file,
      error: result.error?.message || 'Unknown error',
      stack: result.error?.stack,
      duration: result.duration,
      retries: result.retry,
    };

    // Attach screenshot if available
    const screenshot = result.attachments.find(a => a.name === 'screenshot');
    if (screenshot?.path) {
      failure.screenshot = screenshot.path;
    }

    // Attach video if available
    const video = result.attachments.find(a => a.name === 'video');
    if (video?.path) {
      failure.video = video.path;
    }

    // Attach trace if available
    const trace = result.attachments.find(a => a.name === 'trace');
    if (trace?.path) {
      failure.trace = trace.path;
    }

    this.failures.push(failure);
  }

  private extractPerformanceMetrics(test: TestCase, result: TestResult): void {
    // Look for performance metrics in test attachments
    const perfAttachment = result.attachments.find(
      a => a.name === 'performance-metrics' || a.contentType === 'application/json'
    );

    if (perfAttachment?.body) {
      try {
        const metrics = JSON.parse(perfAttachment.body.toString());
        this.performanceMetrics.push({
          testTitle: test.title,
          duration: result.duration,
          ...metrics,
        });
      } catch (e) {
        // Ignore parsing errors
      }
    }
  }

  private extractAccessibilityViolations(test: TestCase, result: TestResult): void {
    // Look for accessibility violations in test attachments
    const a11yAttachment = result.attachments.find(
      a => a.name === 'accessibility-violations'
    );

    if (a11yAttachment?.body) {
      try {
        const violations = JSON.parse(a11yAttachment.body.toString());
        if (violations && violations.length > 0) {
          this.accessibilityViolations.push({
            testTitle: test.title,
            violations: violations.map((v: any) => ({
              id: v.id,
              impact: v.impact,
              description: v.description,
              nodes: v.nodes?.length || 0,
            })),
          });
        }
      } catch (e) {
        // Ignore parsing errors
      }
    }
  }

  onEnd(result: FullResult): void {
    const endTime = Date.now();
    const totalDuration = endTime - this.startTime;
    
    // Calculate pass rate
    this.stats.passRate = this.stats.total > 0
      ? (this.stats.passed / this.stats.total) * 100
      : 0;

    // Print summary
    this.printSummary(totalDuration);

    // Generate reports
    this.generateSummaryReport(totalDuration, result.status);
    this.generateFailureReport();
    this.generatePerformanceReport();
    this.generateAccessibilityReport();

    console.log(`\n📊 Reports generated in: ${this.outputDir}`);
  }

  private printSummary(totalDuration: number): void {
    console.log('\n' + '='.repeat(60));
    console.log('📊 Test Execution Summary');
    console.log('='.repeat(60));
    console.log(`Total Tests:     ${this.stats.total}`);
    console.log(`✅ Passed:       ${this.stats.passed}`);
    console.log(`❌ Failed:       ${this.stats.failed}`);
    console.log(`⏭️  Skipped:      ${this.stats.skipped}`);
    console.log(`⚠️  Flaky:        ${this.stats.flaky}`);
    console.log(`📈 Pass Rate:    ${this.stats.passRate.toFixed(2)}%`);
    console.log(`⏱️  Duration:     ${(totalDuration / 1000).toFixed(2)}s`);
    console.log('='.repeat(60) + '\n');

    if (this.failures.length > 0) {
      console.log('❌ Failed Tests:');
      this.failures.forEach((failure, index) => {
        console.log(`  ${index + 1}. ${failure.testTitle}`);
        console.log(`     File: ${failure.testFile}`);
        console.log(`     Error: ${failure.error.split('\n')[0]}`);
        if (failure.screenshot) {
          console.log(`     Screenshot: ${failure.screenshot}`);
        }
      });
      console.log('');
    }

    if (this.stats.flaky > 0) {
      console.log(`⚠️  Warning: ${this.stats.flaky} flaky test(s) detected`);
      console.log('   Consider investigating and fixing flaky tests\n');
    }

    if (this.accessibilityViolations.length > 0) {
      console.log(`♿ Accessibility: ${this.accessibilityViolations.length} test(s) with violations`);
      console.log('   Review accessibility report for details\n');
    }
  }

  private generateSummaryReport(totalDuration: number, status: string): void {
    const report = {
      summary: {
        status,
        timestamp: new Date().toISOString(),
        duration: totalDuration,
        stats: this.stats,
      },
      config: {
        workers: this.config.workers,
        retries: this.config.projects[0]?.retries || 0,
        baseURL: this.config.projects[0]?.use?.baseURL,
        browsers: this.config.projects.map(p => p.name),
      },
      failures: this.failures.length,
      flakyTests: this.stats.flaky,
      accessibilityIssues: this.accessibilityViolations.length,
    };

    const reportPath = path.join(this.outputDir, 'summary.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  }

  private generateFailureReport(): void {
    if (this.failures.length === 0) return;

    const report = {
      timestamp: new Date().toISOString(),
      totalFailures: this.failures.length,
      failures: this.failures.map(f => ({
        test: f.testTitle,
        file: f.testFile,
        error: f.error,
        stack: f.stack,
        duration: f.duration,
        retries: f.retries,
        artifacts: {
          screenshot: f.screenshot ? path.basename(f.screenshot) : null,
          video: f.video ? path.basename(f.video) : null,
          trace: f.trace ? path.basename(f.trace) : null,
        },
      })),
    };

    const reportPath = path.join(this.outputDir, 'failures.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  }

  private generatePerformanceReport(): void {
    if (this.performanceMetrics.length === 0) return;

    const report = {
      timestamp: new Date().toISOString(),
      totalTests: this.performanceMetrics.length,
      metrics: this.performanceMetrics,
      summary: {
        averageDuration: this.performanceMetrics.reduce((sum, m) => sum + m.duration, 0) / this.performanceMetrics.length,
        slowestTest: this.performanceMetrics.reduce((max, m) => m.duration > max.duration ? m : max),
        fastestTest: this.performanceMetrics.reduce((min, m) => m.duration < min.duration ? m : min),
      },
    };

    const reportPath = path.join(this.outputDir, 'performance.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  }

  private generateAccessibilityReport(): void {
    if (this.accessibilityViolations.length === 0) return;

    const totalViolations = this.accessibilityViolations.reduce(
      (sum, test) => sum + test.violations.length,
      0
    );

    const violationsByImpact = this.accessibilityViolations
      .flatMap(test => test.violations)
      .reduce((acc, v) => {
        acc[v.impact] = (acc[v.impact] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

    const report = {
      timestamp: new Date().toISOString(),
      testsWithViolations: this.accessibilityViolations.length,
      totalViolations,
      violationsByImpact,
      details: this.accessibilityViolations.map(test => ({
        test: test.testTitle,
        violationCount: test.violations.length,
        violations: test.violations,
      })),
    };

    const reportPath = path.join(this.outputDir, 'accessibility.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  }

  printsToStdio(): boolean {
    return true;
  }
}

export default CustomReporter;
