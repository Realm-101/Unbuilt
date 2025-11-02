/**
 * Test script to verify report generator functionality
 * 
 * This creates sample report data and generates all report formats
 * to ensure the report generator works correctly.
 */

import * as fs from 'fs';
import * as path from 'path';
import { ReportGenerator } from './report-generator';

// Create sample report data
const sampleReportsDir = 'server/__tests__/reports/custom';

// Ensure directory exists
if (!fs.existsSync(sampleReportsDir)) {
  fs.mkdirSync(sampleReportsDir, { recursive: true });
}

// Sample summary report
const summaryReport = {
  summary: {
    status: 'passed',
    timestamp: new Date().toISOString(),
    duration: 45230,
    stats: {
      total: 50,
      passed: 45,
      failed: 3,
      skipped: 2,
      flaky: 1,
      passRate: 90.0,
    },
  },
  config: {
    workers: 4,
    retries: 2,
    baseURL: 'http://localhost:5000',
    browsers: ['chromium', 'firefox', 'webkit'],
  },
  failures: 3,
  flakyTests: 1,
  accessibilityIssues: 2,
};

// Sample failures report
const failuresReport = {
  timestamp: new Date().toISOString(),
  totalFailures: 3,
  failures: [
    {
      test: 'should handle invalid login credentials',
      file: 'server/__tests__/e2e/auth/login.e2e.test.ts',
      error: 'Expected element to be visible but it was not found',
      stack: 'Error: Expected element to be visible\n    at LoginPage.login (login.page.ts:25:10)',
      duration: 5670,
      retries: 2,
      artifacts: {
        screenshot: 'screenshot-1.png',
        video: 'video-1.webm',
        trace: 'trace-1.zip',
      },
    },
    {
      test: 'should validate search form inputs',
      file: 'server/__tests__/e2e/features/gap-analysis.e2e.test.ts',
      error: 'Timeout waiting for search completion',
      stack: 'Error: Timeout 30000ms exceeded\n    at SearchPage.waitForCompletion (search.page.ts:45:10)',
      duration: 30000,
      retries: 1,
      artifacts: {
        screenshot: 'screenshot-2.png',
        video: null,
        trace: 'trace-2.zip',
      },
    },
    {
      test: 'should display accessibility violations',
      file: 'server/__tests__/e2e/accessibility/wcag-compliance.e2e.test.ts',
      error: 'Found 5 accessibility violations',
      stack: 'Error: Accessibility violations detected\n    at checkA11y (accessibility.helper.ts:15:10)',
      duration: 2340,
      retries: 0,
      artifacts: {
        screenshot: 'screenshot-3.png',
        video: null,
        trace: null,
      },
    },
  ],
};

// Sample performance report
const performanceReport = {
  timestamp: new Date().toISOString(),
  totalTests: 15,
  metrics: [
    {
      testTitle: 'should load homepage within 3 seconds',
      duration: 2450,
      url: 'http://localhost:5000/',
      metrics: { lcp: 2100, fid: 50, cls: 0.05 },
    },
    {
      testTitle: 'should load dashboard quickly',
      duration: 2890,
      url: 'http://localhost:5000/dashboard',
      metrics: { lcp: 2500, fid: 80, cls: 0.08 },
    },
    {
      testTitle: 'should complete search in time',
      duration: 125000,
      url: 'http://localhost:5000/search/new',
      metrics: { searchDuration: 120000 },
    },
  ],
  summary: {
    averageDuration: 43446.67,
    slowestTest: {
      testTitle: 'should complete search in time',
      duration: 125000,
    },
    fastestTest: {
      testTitle: 'should load homepage within 3 seconds',
      duration: 2450,
    },
  },
};

// Sample accessibility report
const accessibilityReport = {
  timestamp: new Date().toISOString(),
  testsWithViolations: 2,
  totalViolations: 8,
  violationsByImpact: {
    critical: 2,
    serious: 3,
    moderate: 2,
    minor: 1,
  },
  details: [
    {
      test: 'should have no accessibility violations on homepage',
      violationCount: 5,
      violations: [
        {
          id: 'color-contrast',
          impact: 'serious',
          description: 'Elements must have sufficient color contrast',
          nodes: 3,
        },
        {
          id: 'button-name',
          impact: 'critical',
          description: 'Buttons must have discernible text',
          nodes: 1,
        },
        {
          id: 'image-alt',
          impact: 'serious',
          description: 'Images must have alternate text',
          nodes: 1,
        },
      ],
    },
    {
      test: 'should have accessible forms',
      violationCount: 3,
      violations: [
        {
          id: 'label',
          impact: 'critical',
          description: 'Form elements must have labels',
          nodes: 2,
        },
        {
          id: 'aria-required-attr',
          impact: 'serious',
          description: 'Required ARIA attributes must be provided',
          nodes: 1,
        },
      ],
    },
  ],
};

// Write sample reports
fs.writeFileSync(
  path.join(sampleReportsDir, 'summary.json'),
  JSON.stringify(summaryReport, null, 2)
);

fs.writeFileSync(
  path.join(sampleReportsDir, 'failures.json'),
  JSON.stringify(failuresReport, null, 2)
);

fs.writeFileSync(
  path.join(sampleReportsDir, 'performance.json'),
  JSON.stringify(performanceReport, null, 2)
);

fs.writeFileSync(
  path.join(sampleReportsDir, 'accessibility.json'),
  JSON.stringify(accessibilityReport, null, 2)
);

console.log('✅ Sample report data created');
console.log('📊 Generating reports...\n');

// Generate all reports
const generator = new ReportGenerator();
generator.generateAllReports()
  .then(() => {
    console.log('\n✅ Report generation test complete!');
    console.log('\n📁 Generated reports:');
    console.log('   - HTML: server/__tests__/reports/html/custom-report.html');
    console.log('   - JUnit XML: server/__tests__/reports/junit/custom-results.xml');
    console.log('   - JSON: server/__tests__/reports/json/consolidated-report.json');
    console.log('   - Performance: server/__tests__/reports/json/performance-dashboard.json');
    console.log('   - Accessibility: server/__tests__/reports/json/accessibility-summary.json');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Report generation test failed:', error);
    process.exit(1);
  });
