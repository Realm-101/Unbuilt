import { test, expect } from '@playwright/test';
import { createPerformanceHelper, PERFORMANCE_THRESHOLDS } from '../../helpers/performance.helper';
import { LoginPage } from '../../page-objects/login.page';
import { DashboardPage } from '../../page-objects/dashboard.page';

/**
 * Core Web Vitals E2E Tests
 * 
 * Tests Core Web Vitals metrics (LCP, FID, CLS) against Google's thresholds.
 * These metrics are critical for user experience and SEO.
 * 
 * Requirements: 5.2, 5.3
 */

test.describe('Core Web Vitals', () => {
  test.beforeEach(async ({ page }) => {
    // Clear cache for consistent measurements
    await page.context().clearCookies();
  });

  test('homepage should meet Core Web Vitals thresholds', async ({ page }) => {
    const perfHelper = createPerformanceHelper(page);
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Measure Core Web Vitals
    const vitals = await perfHelper.measureCoreWebVitals();
    
    console.log('Core Web Vitals:');
    console.log(`  LCP: ${vitals.lcp.toFixed(0)}ms (threshold: ${PERFORMANCE_THRESHOLDS.lcp}ms)`);
    console.log(`  FID: ${vitals.fid.toFixed(0)}ms (threshold: ${PERFORMANCE_THRESHOLDS.fid}ms)`);
    console.log(`  CLS: ${vitals.cls.toFixed(3)} (threshold: ${PERFORMANCE_THRESHOLDS.cls})`);
    console.log(`  FCP: ${vitals.fcp.toFixed(0)}ms (threshold: ${PERFORMANCE_THRESHOLDS.fcp}ms)`);
    console.log(`  TTFB: ${vitals.ttfb.toFixed(0)}ms (threshold: ${PERFORMANCE_THRESHOLDS.ttfb}ms)`);
    
    // Validate Core Web Vitals
    const validation = perfHelper.validateCoreWebVitals(vitals);
    
    if (!validation.passed) {
      console.error('Core Web Vitals failures:', validation.failures);
    }
    
    expect(validation.passed).toBe(true);
    expect(vitals.lcp).toBeLessThan(PERFORMANCE_THRESHOLDS.lcp);
    expect(vitals.fid).toBeLessThan(PERFORMANCE_THRESHOLDS.fid);
    expect(vitals.cls).toBeLessThan(PERFORMANCE_THRESHOLDS.cls);
  });

  test('dashboard should meet Core Web Vitals thresholds', async ({ page }) => {
    const perfHelper = createPerformanceHelper(page);
    const loginPage = new LoginPage(page);
    const dashboardPage = new DashboardPage(page);
    
    // Login first
    await loginPage.goto();
    await loginPage.login('test@example.com', 'Test123!@#');
    
    // Navigate to dashboard
    await dashboardPage.goto();
    
    // Measure Core Web Vitals
    const vitals = await perfHelper.measureCoreWebVitals();
    
    console.log('Dashboard Core Web Vitals:');
    console.log(`  LCP: ${vitals.lcp.toFixed(0)}ms`);
    console.log(`  FID: ${vitals.fid.toFixed(0)}ms`);
    console.log(`  CLS: ${vitals.cls.toFixed(3)}`);
    
    // Validate
    expect(vitals.lcp).toBeLessThan(PERFORMANCE_THRESHOLDS.lcp);
    expect(vitals.cls).toBeLessThan(PERFORMANCE_THRESHOLDS.cls);
  });

  test('should measure Largest Contentful Paint (LCP)', async ({ page }) => {
    const perfHelper = createPerformanceHelper(page);
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    const vitals = await perfHelper.measureCoreWebVitals();
    
    console.log(`LCP: ${vitals.lcp.toFixed(0)}ms`);
    
    // LCP should be under 2.5 seconds (Good)
    expect(vitals.lcp).toBeLessThan(PERFORMANCE_THRESHOLDS.lcp);
    
    // Warn if approaching threshold
    if (vitals.lcp > 2000) {
      console.warn(`⚠️  LCP is approaching threshold: ${vitals.lcp.toFixed(0)}ms`);
    }
  });

  test('should measure First Input Delay (FID)', async ({ page }) => {
    const perfHelper = createPerformanceHelper(page);
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Simulate user interaction to trigger FID measurement
    await page.click('body');
    
    const vitals = await perfHelper.measureCoreWebVitals();
    
    console.log(`FID: ${vitals.fid.toFixed(0)}ms`);
    
    // FID should be under 100ms (Good)
    // Note: FID may be 0 if no interaction occurred
    if (vitals.fid > 0) {
      expect(vitals.fid).toBeLessThan(PERFORMANCE_THRESHOLDS.fid);
    }
  });

  test('should measure Cumulative Layout Shift (CLS)', async ({ page }) => {
    const perfHelper = createPerformanceHelper(page);
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Wait a bit for any layout shifts to occur
    await page.waitForTimeout(2000);
    
    const vitals = await perfHelper.measureCoreWebVitals();
    
    console.log(`CLS: ${vitals.cls.toFixed(3)}`);
    
    // CLS should be under 0.1 (Good)
    expect(vitals.cls).toBeLessThan(PERFORMANCE_THRESHOLDS.cls);
    
    // Warn if any layout shift detected
    if (vitals.cls > 0) {
      console.warn(`⚠️  Layout shift detected: ${vitals.cls.toFixed(3)}`);
    }
  });

  test('should measure Time to Interactive (TTI)', async ({ page }) => {
    const perfHelper = createPerformanceHelper(page);
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    const vitals = await perfHelper.measureCoreWebVitals();
    
    console.log(`TTI: ${vitals.tti.toFixed(0)}ms`);
    
    // TTI should be under 3.8 seconds
    expect(vitals.tti).toBeLessThan(PERFORMANCE_THRESHOLDS.tti);
  });

  test('should track Core Web Vitals trends', async ({ page }) => {
    const perfHelper = createPerformanceHelper(page);
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    const metrics = await perfHelper.collectMetrics();
    
    // Save trend data
    await perfHelper.saveTrendData(metrics);
    
    // Get trends for LCP
    const lcpTrend = perfHelper.getTrend(page.url(), 'lcp');
    
    if (lcpTrend) {
      console.log('LCP Trend:');
      console.log(`  Average: ${lcpTrend.average.toFixed(0)}ms`);
      console.log(`  Min: ${lcpTrend.min.toFixed(0)}ms`);
      console.log(`  Max: ${lcpTrend.max.toFixed(0)}ms`);
      console.log(`  Trend: ${lcpTrend.trend}`);
      
      // Warn if trend is degrading
      if (lcpTrend.trend === 'degrading') {
        console.warn('⚠️  LCP performance is degrading over time');
      }
    }
  });

  test('should validate all Core Web Vitals together', async ({ page }) => {
    const perfHelper = createPerformanceHelper(page);
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Generate comprehensive report
    const report = await perfHelper.generateReport(false);
    
    console.log(perfHelper.formatReportForConsole(report));
    
    // All Core Web Vitals should pass
    expect(report.passed).toBe(true);
    
    // Check individual metrics
    expect(report.metrics.coreWebVitals.lcp).toBeLessThan(PERFORMANCE_THRESHOLDS.lcp);
    expect(report.metrics.coreWebVitals.cls).toBeLessThan(PERFORMANCE_THRESHOLDS.cls);
    
    // Verify no critical failures
    const criticalFailures = report.failures.filter(f => 
      f.includes('LCP') || f.includes('FID') || f.includes('CLS')
    );
    expect(criticalFailures).toHaveLength(0);
  });

  test('should measure Core Web Vitals on mobile viewport', async ({ page }) => {
    const perfHelper = createPerformanceHelper(page);
    
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    const vitals = await perfHelper.measureCoreWebVitals();
    
    console.log('Mobile Core Web Vitals:');
    console.log(`  LCP: ${vitals.lcp.toFixed(0)}ms`);
    console.log(`  FID: ${vitals.fid.toFixed(0)}ms`);
    console.log(`  CLS: ${vitals.cls.toFixed(3)}`);
    
    // Mobile should also meet thresholds
    expect(vitals.lcp).toBeLessThan(PERFORMANCE_THRESHOLDS.lcp);
    expect(vitals.cls).toBeLessThan(PERFORMANCE_THRESHOLDS.cls);
  });

  test('should measure Core Web Vitals with slow network', async ({ page, context }) => {
    const perfHelper = createPerformanceHelper(page);
    
    // Simulate slow 3G network
    await context.route('**/*', async (route) => {
      await new Promise(resolve => setTimeout(resolve, 100)); // Add 100ms delay
      await route.continue();
    });
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    const vitals = await perfHelper.measureCoreWebVitals();
    
    console.log('Slow Network Core Web Vitals:');
    console.log(`  LCP: ${vitals.lcp.toFixed(0)}ms`);
    console.log(`  TTFB: ${vitals.ttfb.toFixed(0)}ms`);
    
    // With slow network, some metrics may be higher but should still be reasonable
    expect(vitals.lcp).toBeLessThan(PERFORMANCE_THRESHOLDS.lcp * 1.5); // Allow 50% more time
  });
});
