/**
 * Lighthouse Performance Audit Script
 * 
 * Runs Lighthouse audits on key pages and validates performance metrics
 */

import lighthouse from 'lighthouse';
import * as chromeLauncher from 'chrome-launcher';
import { writeFileSync } from 'fs';
import { join } from 'path';

interface LighthouseResult {
  url: string;
  performance: number;
  accessibility: number;
  bestPractices: number;
  seo: number;
  pwa: number;
  metrics: {
    firstContentfulPaint: number;
    largestContentfulPaint: number;
    totalBlockingTime: number;
    cumulativeLayoutShift: number;
    speedIndex: number;
  };
}

const PAGES_TO_TEST = [
  { url: 'http://localhost:5000/', name: 'Landing Page' },
  { url: 'http://localhost:5000/home', name: 'Home/Dashboard' },
  { url: 'http://localhost:5000/search-results', name: 'Search Results' },
  { url: 'http://localhost:5000/pricing', name: 'Pricing Page' },
  { url: 'http://localhost:5000/search-history', name: 'Search History' },
];

const PERFORMANCE_THRESHOLDS = {
  performance: 90,
  accessibility: 90,
  bestPractices: 85,
  seo: 90,
  firstContentfulPaint: 1800, // 1.8s
  largestContentfulPaint: 2500, // 2.5s
  totalBlockingTime: 200, // 200ms
  cumulativeLayoutShift: 0.1,
  speedIndex: 3000, // 3s
};

async function runLighthouseAudit(url: string): Promise<any> {
  const chrome = await chromeLauncher.launch({ chromeFlags: ['--headless'] });
  const options = {
    logLevel: 'info' as const,
    output: 'json' as const,
    onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo', 'pwa'],
    port: chrome.port,
  };

  const runnerResult = await lighthouse(url, options);
  await chrome.kill();

  return runnerResult;
}

function extractMetrics(lhr: any): LighthouseResult['metrics'] {
  const audits = lhr.audits;
  
  return {
    firstContentfulPaint: audits['first-contentful-paint'].numericValue,
    largestContentfulPaint: audits['largest-contentful-paint'].numericValue,
    totalBlockingTime: audits['total-blocking-time'].numericValue,
    cumulativeLayoutShift: audits['cumulative-layout-shift'].numericValue,
    speedIndex: audits['speed-index'].numericValue,
  };
}

function formatResult(result: LighthouseResult): string {
  const { url, performance, accessibility, bestPractices, seo, pwa, metrics } = result;
  
  return `
📊 ${url}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Scores:
  Performance:     ${performance} ${performance >= PERFORMANCE_THRESHOLDS.performance ? '✅' : '❌'}
  Accessibility:   ${accessibility} ${accessibility >= PERFORMANCE_THRESHOLDS.accessibility ? '✅' : '❌'}
  Best Practices:  ${bestPractices} ${bestPractices >= PERFORMANCE_THRESHOLDS.bestPractices ? '✅' : '❌'}
  SEO:             ${seo} ${seo >= PERFORMANCE_THRESHOLDS.seo ? '✅' : '❌'}
  PWA:             ${pwa}

Metrics:
  FCP:  ${(metrics.firstContentfulPaint / 1000).toFixed(2)}s ${metrics.firstContentfulPaint <= PERFORMANCE_THRESHOLDS.firstContentfulPaint ? '✅' : '❌'}
  LCP:  ${(metrics.largestContentfulPaint / 1000).toFixed(2)}s ${metrics.largestContentfulPaint <= PERFORMANCE_THRESHOLDS.largestContentfulPaint ? '✅' : '❌'}
  TBT:  ${metrics.totalBlockingTime.toFixed(0)}ms ${metrics.totalBlockingTime <= PERFORMANCE_THRESHOLDS.totalBlockingTime ? '✅' : '❌'}
  CLS:  ${metrics.cumulativeLayoutShift.toFixed(3)} ${metrics.cumulativeLayoutShift <= PERFORMANCE_THRESHOLDS.cumulativeLayoutShift ? '✅' : '❌'}
  SI:   ${(metrics.speedIndex / 1000).toFixed(2)}s ${metrics.speedIndex <= PERFORMANCE_THRESHOLDS.speedIndex ? '✅' : '❌'}
`;
}

async function runAllAudits() {
  console.log('🚀 Starting Lighthouse Performance Audits...\n');
  console.log('⚠️  Make sure the development server is running on http://localhost:5000\n');

  const results: LighthouseResult[] = [];
  const failures: string[] = [];

  for (const page of PAGES_TO_TEST) {
    console.log(`\n🔍 Auditing: ${page.name}...`);
    
    try {
      const runnerResult = await runLighthouseAudit(page.url);
      const lhr = runnerResult.lhr;

      const result: LighthouseResult = {
        url: page.name,
        performance: Math.round(lhr.categories.performance.score * 100),
        accessibility: Math.round(lhr.categories.accessibility.score * 100),
        bestPractices: Math.round(lhr.categories['best-practices'].score * 100),
        seo: Math.round(lhr.categories.seo.score * 100),
        pwa: Math.round(lhr.categories.pwa.score * 100),
        metrics: extractMetrics(lhr),
      };

      results.push(result);
      console.log(formatResult(result));

      // Check for failures
      if (result.performance < PERFORMANCE_THRESHOLDS.performance) {
        failures.push(`${page.name}: Performance score ${result.performance} < ${PERFORMANCE_THRESHOLDS.performance}`);
      }
      if (result.accessibility < PERFORMANCE_THRESHOLDS.accessibility) {
        failures.push(`${page.name}: Accessibility score ${result.accessibility} < ${PERFORMANCE_THRESHOLDS.accessibility}`);
      }
      if (result.metrics.largestContentfulPaint > PERFORMANCE_THRESHOLDS.largestContentfulPaint) {
        failures.push(`${page.name}: LCP ${(result.metrics.largestContentfulPaint / 1000).toFixed(2)}s > ${PERFORMANCE_THRESHOLDS.largestContentfulPaint / 1000}s`);
      }

    } catch (error) {
      console.error(`❌ Error auditing ${page.name}:`, error);
      failures.push(`${page.name}: Audit failed - ${error}`);
    }
  }

  // Save results to file
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const reportPath = join(__dirname, `lighthouse-report-${timestamp}.json`);
  writeFileSync(reportPath, JSON.stringify(results, null, 2));
  console.log(`\n📄 Full report saved to: ${reportPath}`);

  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('📈 SUMMARY');
  console.log('='.repeat(50));
  console.log(`Total pages tested: ${results.length}`);
  console.log(`Passed: ${results.length - failures.length}`);
  console.log(`Failed: ${failures.length}`);

  if (failures.length > 0) {
    console.log('\n❌ FAILURES:');
    failures.forEach(f => console.log(`  - ${f}`));
    process.exit(1);
  } else {
    console.log('\n✅ All performance thresholds met!');
    process.exit(0);
  }
}

// Run audits
runAllAudits().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
