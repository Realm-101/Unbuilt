import { test, expect } from '@playwright/test';
import { createPerformanceHelper, PERFORMANCE_THRESHOLDS } from '../../helpers/performance.helper';
import { LoginPage } from '../../page-objects/login.page';
import { DashboardPage } from '../../page-objects/dashboard.page';

/**
 * Page Load Times E2E Tests
 * 
 * Tests that all pages load within the 3-second requirement.
 * Measures navigation timing and validates against thresholds.
 * 
 * Requirements: 5.1, 5.2
 */

test.describe('Page Load Times', () => {
  test.beforeEach(async ({ page }) => {
    // Clear cache for consistent measurements
    await page.context().clearCookies();
  });

  test('homepage should load within 3 seconds', async ({ page }) => {
    const perfHelper = createPerformanceHelper(page);
    
    // Navigate to homepage
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Measure performance
    const metrics = await perfHelper.collectMetrics();
    const pageLoadTime = metrics.navigationTiming.loadEventEnd - metrics.navigationTiming.fetchStart;
    
    console.log(`Homepage load time: ${pageLoadTime.toFixed(0)}ms`);
    
    // Validate against threshold
    expect(pageLoadTime).toBeLessThan(PERFORMANCE_THRESHOLDS.pageLoad);
    
    // Save trend data
    await perfHelper.saveTrendData(metrics);
  });

  test('login page should load within 3 seconds', async ({ page }) => {
    const perfHelper = createPerformanceHelper(page);
    const loginPage = new LoginPage(page);
    
    // Navigate to login page
    await loginPage.goto();
    
    // Measure performance
    const metrics = await perfHelper.collectMetrics();
    const pageLoadTime = metrics.navigationTiming.loadEventEnd - metrics.navigationTiming.fetchStart;
    
    console.log(`Login page load time: ${pageLoadTime.toFixed(0)}ms`);
    
    // Validate against threshold
    expect(pageLoadTime).toBeLessThan(PERFORMANCE_THRESHOLDS.pageLoad);
    
    // Save trend data
    await perfHelper.saveTrendData(metrics);
  });

  test('dashboard should load within 3 seconds for authenticated user', async ({ page }) => {
    const perfHelper = createPerformanceHelper(page);
    const loginPage = new LoginPage(page);
    const dashboardPage = new DashboardPage(page);
    
    // Login first
    await loginPage.goto();
    await loginPage.login('test@example.com', 'Test123!@#');
    
    // Clear performance data from login
    await page.evaluate(() => performance.clearResourceTimings());
    
    // Navigate to dashboard
    await dashboardPage.goto();
    
    // Measure performance
    const metrics = await perfHelper.collectMetrics();
    const pageLoadTime = metrics.navigationTiming.loadEventEnd - metrics.navigationTiming.fetchStart;
    
    console.log(`Dashboard load time: ${pageLoadTime.toFixed(0)}ms`);
    
    // Validate against threshold
    expect(pageLoadTime).toBeLessThan(PERFORMANCE_THRESHOLDS.pageLoad);
    
    // Save trend data
    await perfHelper.saveTrendData(metrics);
  });

  test('search results page should load within 3 seconds', async ({ page }) => {
    const perfHelper = createPerformanceHelper(page);
    
    // Navigate to a mock search results page
    // Note: In real scenario, this would be after completing a search
    await page.goto('/search/results/mock-id');
    await page.waitForLoadState('networkidle');
    
    // Measure performance
    const metrics = await perfHelper.collectMetrics();
    const pageLoadTime = metrics.navigationTiming.loadEventEnd - metrics.navigationTiming.fetchStart;
    
    console.log(`Search results page load time: ${pageLoadTime.toFixed(0)}ms`);
    
    // Validate against threshold
    expect(pageLoadTime).toBeLessThan(PERFORMANCE_THRESHOLDS.pageLoad);
  });

  test('resource library should load within 3 seconds', async ({ page }) => {
    const perfHelper = createPerformanceHelper(page);
    
    // Navigate to resource library
    await page.goto('/resources');
    await page.waitForLoadState('networkidle');
    
    // Measure performance
    const metrics = await perfHelper.collectMetrics();
    const pageLoadTime = metrics.navigationTiming.loadEventEnd - metrics.navigationTiming.fetchStart;
    
    console.log(`Resource library load time: ${pageLoadTime.toFixed(0)}ms`);
    
    // Validate against threshold
    expect(pageLoadTime).toBeLessThan(PERFORMANCE_THRESHOLDS.pageLoad);
    
    // Save trend data
    await perfHelper.saveTrendData(metrics);
  });

  test('should measure Time to First Byte (TTFB)', async ({ page }) => {
    const perfHelper = createPerformanceHelper(page);
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    const metrics = await perfHelper.collectMetrics();
    const ttfb = metrics.coreWebVitals.ttfb;
    
    console.log(`TTFB: ${ttfb.toFixed(0)}ms`);
    
    // TTFB should be under 800ms
    expect(ttfb).toBeLessThan(PERFORMANCE_THRESHOLDS.ttfb);
  });

  test('should measure First Contentful Paint (FCP)', async ({ page }) => {
    const perfHelper = createPerformanceHelper(page);
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    const metrics = await perfHelper.collectMetrics();
    const fcp = metrics.coreWebVitals.fcp;
    
    console.log(`FCP: ${fcp.toFixed(0)}ms`);
    
    // FCP should be under 1.8s
    expect(fcp).toBeLessThan(PERFORMANCE_THRESHOLDS.fcp);
  });

  test('should measure DOM Interactive time', async ({ page }) => {
    const perfHelper = createPerformanceHelper(page);
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    const metrics = await perfHelper.collectMetrics();
    const domInteractive = metrics.navigationTiming.domInteractive;
    
    console.log(`DOM Interactive: ${domInteractive.toFixed(0)}ms`);
    
    // DOM should be interactive quickly
    expect(domInteractive).toBeLessThan(2000);
  });

  test('should track resource loading metrics', async ({ page }) => {
    const perfHelper = createPerformanceHelper(page);
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    const metrics = await perfHelper.collectMetrics();
    const resources = metrics.resourceTiming;
    
    console.log(`Total resources: ${resources.totalResources}`);
    console.log(`Total size: ${(resources.totalSize / 1024).toFixed(2)} KB`);
    console.log(`Total duration: ${resources.totalDuration.toFixed(0)}ms`);
    
    // Log resource breakdown by type
    Object.entries(resources.resourcesByType).forEach(([type, typeMetrics]) => {
      console.log(`  ${type}: ${typeMetrics.count} resources, ${(typeMetrics.size / 1024).toFixed(2)} KB`);
    });
    
    // Validate reasonable resource counts
    expect(resources.totalResources).toBeLessThan(100); // Not too many resources
    expect(resources.totalSize).toBeLessThan(5 * 1024 * 1024); // Under 5MB total
  });

  test('should generate performance report', async ({ page }) => {
    const perfHelper = createPerformanceHelper(page);
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    const report = await perfHelper.generateReport(false);
    
    console.log(perfHelper.formatReportForConsole(report));
    
    // Validate report structure
    expect(report.url).toBeTruthy();
    expect(report.timestamp).toBeInstanceOf(Date);
    expect(report.metrics).toBeDefined();
    expect(report.passed).toBeDefined();
    
    // Check if performance passed
    if (!report.passed) {
      console.error('Performance failures:', report.failures);
    }
    
    expect(report.passed).toBe(true);
  });
});
