/**
 * Test Report Generator
 * 
 * Generates comprehensive test reports in multiple formats:
 * - HTML reports with embedded screenshots
 * - JUnit XML for CI integration
 * - JSON reports for programmatic access
 * - Performance metrics reports
 * - Accessibility violation summaries
 * 
 * Requirements: 9.1, 9.2, 9.3, 9.4, 9.5
 */

import * as fs from 'fs';
import * as path from 'path';

interface TestReport {
  summary: {
    status: string;
    timestamp: string;
    duration: number;
    stats: {
      total: number;
      passed: number;
      failed: number;
      skipped: number;
      flaky: number;
      passRate: number;
    };
  };
  config: {
    workers: number;
    retries: number;
    baseURL?: string;
    browsers: string[];
  };
  failures: number;
  flakyTests: number;
  accessibilityIssues: number;
}

interface FailureReport {
  timestamp: string;
  totalFailures: number;
  failures: Array<{
    test: string;
    file: string;
    error: string;
    stack?: string;
    duration: number;
    retries: number;
    artifacts: {
      screenshot: string | null;
      video: string | null;
      trace: string | null;
    };
  }>;
}

interface PerformanceReport {
  timestamp: string;
  totalTests: number;
  metrics: Array<{
    testTitle: string;
    duration: number;
    url?: string;
    metrics?: Record<string, number>;
  }>;
  summary: {
    averageDuration: number;
    slowestTest: any;
    fastestTest: any;
  };
}

interface AccessibilityReport {
  timestamp: string;
  testsWithViolations: number;
  totalViolations: number;
  violationsByImpact: Record<string, number>;
  details: Array<{
    test: string;
    violationCount: number;
    violations: Array<{
      id: string;
      impact: string;
      description: string;
      nodes: number;
    }>;
  }>;
}

export class ReportGenerator {
  private reportsDir: string;
  private customReportsDir: string;

  constructor(reportsDir: string = 'server/__tests__/reports') {
    this.reportsDir = reportsDir;
    this.customReportsDir = path.join(reportsDir, 'custom');
    this.ensureDirectories();
  }

  private ensureDirectories(): void {
    const dirs = [
      this.reportsDir,
      this.customReportsDir,
      path.join(this.reportsDir, 'html'),
      path.join(this.reportsDir, 'junit'),
      path.join(this.reportsDir, 'json'),
    ];

    dirs.forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
  }

  /**
   * Generate all report formats
   */
  async generateAllReports(): Promise<void> {
    console.log('📊 Generating comprehensive test reports...\n');

    try {
      // Load custom reports
      const summary = this.loadReport<TestReport>('summary.json');
      const failures = this.loadReport<FailureReport>('failures.json');
      const performance = this.loadReport<PerformanceReport>('performance.json');
      const accessibility = this.loadReport<AccessibilityReport>('accessibility.json');

      // Generate HTML report
      if (summary) {
        await this.generateHTMLReport(summary, failures, performance, accessibility);
        console.log('✅ HTML report generated');
      }

      // Generate enhanced JUnit XML
      if (summary && failures) {
        await this.generateJUnitXML(summary, failures);
        console.log('✅ JUnit XML report generated');
      }

      // Generate consolidated JSON report
      await this.generateConsolidatedJSON(summary, failures, performance, accessibility);
      console.log('✅ Consolidated JSON report generated');

      // Generate performance dashboard
      if (performance) {
        await this.generatePerformanceDashboard(performance);
        console.log('✅ Performance dashboard generated');
      }

      // Generate accessibility summary
      if (accessibility) {
        await this.generateAccessibilitySummary(accessibility);
        console.log('✅ Accessibility summary generated');
      }

      console.log('\n✨ All reports generated successfully!');
    } catch (error) {
      console.error('❌ Error generating reports:', error);
      throw error;
    }
  }

  private loadReport<T>(filename: string): T | null {
    const filePath = path.join(this.customReportsDir, filename);
    if (!fs.existsSync(filePath)) {
      return null;
    }

    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      console.warn(`⚠️  Failed to load ${filename}:`, error);
      return null;
    }
  }

  /**
   * Generate HTML report with embedded screenshots
   */
  private async generateHTMLReport(
    summary: TestReport,
    failures: FailureReport | null,
    performance: PerformanceReport | null,
    accessibility: AccessibilityReport | null
  ): Promise<void> {
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>E2E Test Report - ${new Date(summary.summary.timestamp).toLocaleString()}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #0a0a0a;
      color: #e0e0e0;
      padding: 20px;
      line-height: 1.6;
    }
    .container { max-width: 1400px; margin: 0 auto; }
    h1 { color: #ff6b35; margin-bottom: 10px; font-size: 2.5em; }
    h2 { color: #9d4edd; margin: 30px 0 15px; font-size: 1.8em; border-bottom: 2px solid #9d4edd; padding-bottom: 10px; }
    h3 { color: #ff6b35; margin: 20px 0 10px; font-size: 1.3em; }
    .header { background: linear-gradient(135deg, #1a1a1a 0%, #2d1b4e 100%); padding: 30px; border-radius: 12px; margin-bottom: 30px; box-shadow: 0 4px 20px rgba(157, 78, 221, 0.3); }
    .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin: 30px 0; }
    .stat-card {
      background: linear-gradient(135deg, #1a1a1a 0%, #2d1b4e 50%);
      padding: 20px;
      border-radius: 8px;
      border: 1px solid #9d4edd;
      box-shadow: 0 2px 10px rgba(157, 78, 221, 0.2);
    }
    .stat-label { color: #b0b0b0; font-size: 0.9em; margin-bottom: 5px; }
    .stat-value { font-size: 2.5em; font-weight: bold; color: #ff6b35; }
    .stat-value.success { color: #10b981; }
    .stat-value.error { color: #ef4444; }
    .stat-value.warning { color: #f59e0b; }
    .section { background: #1a1a1a; padding: 25px; border-radius: 8px; margin-bottom: 25px; border: 1px solid #333; }
    .failure-item {
      background: #2a1a1a;
      padding: 20px;
      margin: 15px 0;
      border-radius: 8px;
      border-left: 4px solid #ef4444;
    }
    .failure-title { color: #ff6b35; font-weight: bold; margin-bottom: 10px; font-size: 1.1em; }
    .failure-file { color: #9d4edd; font-size: 0.9em; margin-bottom: 10px; }
    .failure-error {
      background: #1a0a0a;
      padding: 15px;
      border-radius: 4px;
      font-family: 'Courier New', monospace;
      font-size: 0.9em;
      color: #ff6b6b;
      margin: 10px 0;
      overflow-x: auto;
      white-space: pre-wrap;
    }
    .artifacts { margin-top: 15px; display: flex; gap: 10px; flex-wrap: wrap; }
    .artifact-link {
      background: #9d4edd;
      color: white;
      padding: 8px 16px;
      border-radius: 4px;
      text-decoration: none;
      font-size: 0.9em;
      transition: background 0.3s;
    }
    .artifact-link:hover { background: #7b2cbf; }
    .screenshot { max-width: 100%; border-radius: 8px; margin-top: 15px; border: 2px solid #9d4edd; }
    .metric-item {
      background: #1a1a1a;
      padding: 15px;
      margin: 10px 0;
      border-radius: 6px;
      border-left: 3px solid #10b981;
    }
    .metric-title { color: #ff6b35; font-weight: bold; margin-bottom: 8px; }
    .metric-value { color: #10b981; font-size: 1.2em; }
    .violation-item {
      background: #2a1a1a;
      padding: 15px;
      margin: 10px 0;
      border-radius: 6px;
      border-left: 3px solid #f59e0b;
    }
    .violation-impact { display: inline-block; padding: 4px 12px; border-radius: 4px; font-size: 0.85em; font-weight: bold; margin-right: 10px; }
    .impact-critical { background: #ef4444; color: white; }
    .impact-serious { background: #f59e0b; color: white; }
    .impact-moderate { background: #3b82f6; color: white; }
    .impact-minor { background: #6b7280; color: white; }
    .badge { display: inline-block; padding: 4px 12px; border-radius: 4px; font-size: 0.85em; font-weight: bold; margin-right: 8px; }
    .badge-success { background: #10b981; color: white; }
    .badge-error { background: #ef4444; color: white; }
    .badge-warning { background: #f59e0b; color: white; }
    .progress-bar {
      width: 100%;
      height: 30px;
      background: #2a2a2a;
      border-radius: 15px;
      overflow: hidden;
      margin: 15px 0;
    }
    .progress-fill {
      height: 100%;
      background: linear-gradient(90deg, #10b981 0%, #059669 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: bold;
      transition: width 0.3s;
    }
    table { width: 100%; border-collapse: collapse; margin: 15px 0; }
    th, td { padding: 12px; text-align: left; border-bottom: 1px solid #333; }
    th { background: #2a2a2a; color: #ff6b35; font-weight: bold; }
    tr:hover { background: #1a1a1a; }
    .timestamp { color: #9d4edd; font-size: 0.9em; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🧪 E2E Test Report</h1>
      <p class="timestamp">Generated: ${new Date(summary.summary.timestamp).toLocaleString()}</p>
      <p class="timestamp">Duration: ${(summary.summary.duration / 1000).toFixed(2)}s</p>
      <p class="timestamp">Status: <span class="badge ${summary.summary.status === 'passed' ? 'badge-success' : 'badge-error'}">${summary.summary.status.toUpperCase()}</span></p>
    </div>

    <h2>📊 Test Statistics</h2>
    <div class="stats">
      <div class="stat-card">
        <div class="stat-label">Total Tests</div>
        <div class="stat-value">${summary.summary.stats.total}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Passed</div>
        <div class="stat-value success">${summary.summary.stats.passed}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Failed</div>
        <div class="stat-value error">${summary.summary.stats.failed}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Skipped</div>
        <div class="stat-value">${summary.summary.stats.skipped}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Flaky</div>
        <div class="stat-value warning">${summary.summary.stats.flaky}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Pass Rate</div>
        <div class="stat-value ${summary.summary.stats.passRate >= 90 ? 'success' : summary.summary.stats.passRate >= 70 ? 'warning' : 'error'}">${summary.summary.stats.passRate.toFixed(1)}%</div>
      </div>
    </div>

    <div class="progress-bar">
      <div class="progress-fill" style="width: ${summary.summary.stats.passRate}%">
        ${summary.summary.stats.passRate.toFixed(1)}%
      </div>
    </div>

    <h2>⚙️ Configuration</h2>
    <div class="section">
      <p><strong>Workers:</strong> ${summary.config.workers}</p>
      <p><strong>Retries:</strong> ${summary.config.retries}</p>
      <p><strong>Base URL:</strong> ${summary.config.baseURL || 'Not set'}</p>
      <p><strong>Browsers:</strong> ${summary.config.browsers.join(', ')}</p>
    </div>

    ${failures && failures.failures.length > 0 ? `
    <h2>❌ Failed Tests (${failures.totalFailures})</h2>
    <div class="section">
      ${failures.failures.map((failure, index) => `
        <div class="failure-item">
          <div class="failure-title">${index + 1}. ${failure.test}</div>
          <div class="failure-file">📁 ${failure.file}</div>
          <div class="failure-error">${this.escapeHtml(failure.error)}</div>
          ${failure.stack ? `<details><summary>Stack Trace</summary><div class="failure-error">${this.escapeHtml(failure.stack)}</div></details>` : ''}
          <p><strong>Duration:</strong> ${failure.duration}ms | <strong>Retries:</strong> ${failure.retries}</p>
          ${failure.artifacts.screenshot || failure.artifacts.video || failure.artifacts.trace ? `
          <div class="artifacts">
            ${failure.artifacts.screenshot ? `<a href="../test-results/${failure.artifacts.screenshot}" class="artifact-link" target="_blank">📸 Screenshot</a>` : ''}
            ${failure.artifacts.video ? `<a href="../test-results/${failure.artifacts.video}" class="artifact-link" target="_blank">🎥 Video</a>` : ''}
            ${failure.artifacts.trace ? `<a href="../test-results/${failure.artifacts.trace}" class="artifact-link" target="_blank">🔍 Trace</a>` : ''}
          </div>
          ` : ''}
        </div>
      `).join('')}
    </div>
    ` : ''}

    ${performance ? `
    <h2>⚡ Performance Metrics</h2>
    <div class="section">
      <p><strong>Tests with metrics:</strong> ${performance.totalTests}</p>
      <p><strong>Average duration:</strong> ${performance.summary.averageDuration.toFixed(2)}ms</p>
      
      <h3>Slowest Tests</h3>
      <table>
        <thead>
          <tr>
            <th>Test</th>
            <th>Duration</th>
          </tr>
        </thead>
        <tbody>
          ${performance.metrics
            .sort((a, b) => b.duration - a.duration)
            .slice(0, 10)
            .map(m => `
              <tr>
                <td>${m.testTitle}</td>
                <td>${m.duration.toFixed(2)}ms</td>
              </tr>
            `).join('')}
        </tbody>
      </table>
    </div>
    ` : ''}

    ${accessibility && accessibility.testsWithViolations > 0 ? `
    <h2>♿ Accessibility Violations</h2>
    <div class="section">
      <p><strong>Tests with violations:</strong> ${accessibility.testsWithViolations}</p>
      <p><strong>Total violations:</strong> ${accessibility.totalViolations}</p>
      
      <h3>Violations by Impact</h3>
      <div class="stats">
        ${Object.entries(accessibility.violationsByImpact).map(([impact, count]) => `
          <div class="stat-card">
            <div class="stat-label">${impact}</div>
            <div class="stat-value ${impact === 'critical' ? 'error' : impact === 'serious' ? 'warning' : ''}">${count}</div>
          </div>
        `).join('')}
      </div>

      <h3>Details</h3>
      ${accessibility.details.map(detail => `
        <div class="violation-item">
          <div class="metric-title">${detail.test}</div>
          <p><strong>Violations:</strong> ${detail.violationCount}</p>
          ${detail.violations.map(v => `
            <div style="margin: 10px 0; padding: 10px; background: #1a1a1a; border-radius: 4px;">
              <span class="violation-impact impact-${v.impact}">${v.impact.toUpperCase()}</span>
              <strong>${v.id}:</strong> ${v.description}
              <br><small>Affected nodes: ${v.nodes}</small>
            </div>
          `).join('')}
        </div>
      `).join('')}
    </div>
    ` : ''}

    <div class="section" style="margin-top: 40px; text-align: center; color: #9d4edd;">
      <p>Generated by Unbuilt E2E Test Suite</p>
      <p style="font-size: 0.9em; margin-top: 10px;">Powered by Playwright & Custom Reporter</p>
    </div>
  </div>
</body>
</html>
    `;

    const htmlPath = path.join(this.reportsDir, 'html', 'custom-report.html');
    fs.writeFileSync(htmlPath, html);
  }

  /**
   * Generate JUnit XML for CI integration
   */
  private async generateJUnitXML(
    summary: TestReport,
    failures: FailureReport
  ): Promise<void> {
    const timestamp = new Date(summary.summary.timestamp).toISOString();
    const duration = (summary.summary.duration / 1000).toFixed(3);

    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += `<testsuites name="E2E Tests" tests="${summary.summary.stats.total}" failures="${summary.summary.stats.failed}" skipped="${summary.summary.stats.skipped}" time="${duration}" timestamp="${timestamp}">\n`;
    xml += `  <testsuite name="E2E Test Suite" tests="${summary.summary.stats.total}" failures="${summary.summary.stats.failed}" skipped="${summary.summary.stats.skipped}" time="${duration}">\n`;

    // Add passed tests
    const passedCount = summary.summary.stats.passed;
    for (let i = 0; i < passedCount; i++) {
      xml += `    <testcase name="Passed Test ${i + 1}" classname="E2E" time="0.000"/>\n`;
    }

    // Add failed tests
    failures.failures.forEach(failure => {
      const testDuration = (failure.duration / 1000).toFixed(3);
      xml += `    <testcase name="${this.escapeXml(failure.test)}" classname="${this.escapeXml(failure.file)}" time="${testDuration}">\n`;
      xml += `      <failure message="${this.escapeXml(failure.error)}">\n`;
      xml += `${this.escapeXml(failure.stack || failure.error)}\n`;
      xml += `      </failure>\n`;
      if (failure.artifacts.screenshot) {
        xml += `      <system-out>Screenshot: ${failure.artifacts.screenshot}</system-out>\n`;
      }
      xml += `    </testcase>\n`;
    });

    // Add skipped tests
    const skippedCount = summary.summary.stats.skipped;
    for (let i = 0; i < skippedCount; i++) {
      xml += `    <testcase name="Skipped Test ${i + 1}" classname="E2E" time="0.000">\n`;
      xml += `      <skipped/>\n`;
      xml += `    </testcase>\n`;
    }

    xml += `  </testsuite>\n`;
    xml += `</testsuites>\n`;

    const xmlPath = path.join(this.reportsDir, 'junit', 'custom-results.xml');
    fs.writeFileSync(xmlPath, xml);
  }

  /**
   * Generate consolidated JSON report
   */
  private async generateConsolidatedJSON(
    summary: TestReport | null,
    failures: FailureReport | null,
    performance: PerformanceReport | null,
    accessibility: AccessibilityReport | null
  ): Promise<void> {
    const consolidated = {
      generated: new Date().toISOString(),
      summary: summary || null,
      failures: failures || null,
      performance: performance || null,
      accessibility: accessibility || null,
    };

    const jsonPath = path.join(this.reportsDir, 'json', 'consolidated-report.json');
    fs.writeFileSync(jsonPath, JSON.stringify(consolidated, null, 2));
  }

  /**
   * Generate performance dashboard
   */
  private async generatePerformanceDashboard(performance: PerformanceReport): Promise<void> {
    const dashboard = {
      timestamp: performance.timestamp,
      summary: {
        totalTests: performance.totalTests,
        averageDuration: performance.summary.averageDuration,
        slowestTest: {
          title: performance.summary.slowestTest.testTitle,
          duration: performance.summary.slowestTest.duration,
        },
        fastestTest: {
          title: performance.summary.fastestTest.testTitle,
          duration: performance.summary.fastestTest.duration,
        },
      },
      metrics: performance.metrics.map(m => ({
        test: m.testTitle,
        duration: m.duration,
        url: m.url,
        customMetrics: m.metrics,
      })),
      thresholds: {
        pageLoad: 3000,
        apiResponse: 500,
        searchCompletion: 180000,
      },
      violations: performance.metrics.filter(m => m.duration > 3000).length,
    };

    const dashboardPath = path.join(this.reportsDir, 'json', 'performance-dashboard.json');
    fs.writeFileSync(dashboardPath, JSON.stringify(dashboard, null, 2));
  }

  /**
   * Generate accessibility summary
   */
  private async generateAccessibilitySummary(accessibility: AccessibilityReport): Promise<void> {
    const summary = {
      timestamp: accessibility.timestamp,
      overview: {
        testsWithViolations: accessibility.testsWithViolations,
        totalViolations: accessibility.totalViolations,
        violationsByImpact: accessibility.violationsByImpact,
      },
      criticalIssues: accessibility.details
        .flatMap(d => d.violations.filter(v => v.impact === 'critical'))
        .map(v => ({
          id: v.id,
          description: v.description,
          impact: v.impact,
          nodes: v.nodes,
        })),
      recommendations: this.generateA11yRecommendations(accessibility),
    };

    const summaryPath = path.join(this.reportsDir, 'json', 'accessibility-summary.json');
    fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
  }

  private generateA11yRecommendations(accessibility: AccessibilityReport): string[] {
    const recommendations: string[] = [];

    if (accessibility.violationsByImpact.critical > 0) {
      recommendations.push('Address critical accessibility violations immediately - these prevent users from accessing content');
    }

    if (accessibility.violationsByImpact.serious > 0) {
      recommendations.push('Fix serious violations - these significantly impact user experience');
    }

    if (accessibility.totalViolations > 10) {
      recommendations.push('Consider conducting a comprehensive accessibility audit');
    }

    if (recommendations.length === 0) {
      recommendations.push('Great job! No major accessibility issues detected');
    }

    return recommendations;
  }

  private escapeHtml(text: string): string {
    const map: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;',
    };
    return text.replace(/[&<>"']/g, m => map[m]);
  }

  private escapeXml(text: string): string {
    const map: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&apos;',
    };
    return text.replace(/[&<>"']/g, m => map[m]);
  }
}

// CLI usage
const isMainModule = import.meta.url === `file://${process.argv[1]}`;
if (isMainModule) {
  const generator = new ReportGenerator();
  generator.generateAllReports()
    .then(() => {
      console.log('\n✅ Report generation complete!');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ Report generation failed:', error);
      process.exit(1);
    });
}
