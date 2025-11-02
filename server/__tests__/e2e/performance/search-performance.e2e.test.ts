import { test, expect } from '@playwright/test';
import { createPerformanceHelper, PERFORMANCE_THRESHOLDS } from '../../helpers/performance.helper';
import { LoginPage } from '../../page-objects/login.page';
import { SearchPage } from '../../page-objects/search.page';
import { SearchResultsPage } from '../../page-objects/search-results.page';

/**
 * Search Performance E2E Tests
 * 
 * Tests gap analysis search completion time.
 * Search should complete within 2-3 minutes as per requirements.
 * 
 * Requirements: 5.4, 5.5
 */

test.describe('Search Performance', () => {
  test.beforeEach(async ({ page }) => {
    const loginPage = new LoginPage(page);
    
    // Login before each test
    await loginPage.goto();
    await loginPage.login('test@example.com', 'Test123!@#');
  });

  test('gap analysis search should complete within 2-3 minutes', async ({ page }) => {
    const perfHelper = createPerformanceHelper(page);
    const searchPage = new SearchPage(page);
    const resultsPage = new SearchResultsPage(page);
    
    await searchPage.goto();
    
    // Start timing
    const startTime = Date.now();
    
    // Submit search
    await searchPage.submitSearch('Gaps in sustainable packaging for e-commerce');
    
    // Wait for search to complete (with 3-minute timeout)
    await searchPage.waitForSearchCompletion(PERFORMANCE_THRESHOLDS.searchMax);
    
    // Calculate completion time
    const completionTime = Date.now() - startTime;
    
    console.log(`Search completion time: ${(completionTime / 1000).toFixed(1)} seconds`);
    
    // Should complete within 2-3 minutes
    expect(completionTime).toBeGreaterThanOrEqual(PERFORMANCE_THRESHOLDS.searchMin);
    expect(completionTime).toBeLessThanOrEqual(PERFORMANCE_THRESHOLDS.searchMax);
    
    // Verify results are displayed
    const hasResults = await resultsPage.hasExecutiveSummary();
    expect(hasResults).toBe(true);
  });

  test('search should progress through all 4 phases', async ({ page }) => {
    const searchPage = new SearchPage(page);
    
    await searchPage.goto();
    await searchPage.submitSearch('Gaps in AI-powered healthcare diagnostics');
    
    // Track phases
    const phases: string[] = [];
    const phaseTimings: Record<string, number> = {};
    const startTime = Date.now();
    
    // Monitor phase progression
    while (phases.length < 4) {
      const currentPhase = await searchPage.getCurrentPhase();
      
      if (currentPhase && !phases.includes(currentPhase)) {
        phases.push(currentPhase);
        phaseTimings[currentPhase] = Date.now() - startTime;
        console.log(`Phase ${phases.length}: ${currentPhase} (${(phaseTimings[currentPhase] / 1000).toFixed(1)}s)`);
      }
      
      // Check if search is complete
      const isComplete = await page.locator('[data-testid="search-complete"]').isVisible().catch(() => false);
      if (isComplete) break;
      
      await page.waitForTimeout(1000);
    }
    
    // Should have progressed through all 4 phases
    expect(phases.length).toBe(4);
    
    // Log phase timings
    console.log('Phase timings:');
    Object.entries(phaseTimings).forEach(([phase, time]) => {
      console.log(`  ${phase}: ${(time / 1000).toFixed(1)}s`);
    });
  });

  test('search progress should update regularly', async ({ page }) => {
    const searchPage = new SearchPage(page);
    
    await searchPage.goto();
    await searchPage.submitSearch('Gaps in renewable energy storage');
    
    const progressUpdates: number[] = [];
    const startTime = Date.now();
    
    // Monitor progress for 30 seconds
    const monitorDuration = 30000;
    while (Date.now() - startTime < monitorDuration) {
      const progress = await searchPage.getProgressPercentage();
      
      if (progress > 0 && !progressUpdates.includes(progress)) {
        progressUpdates.push(progress);
        console.log(`Progress: ${progress}%`);
      }
      
      // Check if complete
      const isComplete = await page.locator('[data-testid="search-complete"]').isVisible().catch(() => false);
      if (isComplete) break;
      
      await page.waitForTimeout(2000);
    }
    
    // Should have multiple progress updates
    expect(progressUpdates.length).toBeGreaterThan(3);
    
    // Progress should be increasing
    for (let i = 1; i < progressUpdates.length; i++) {
      expect(progressUpdates[i]).toBeGreaterThan(progressUpdates[i - 1]);
    }
  });

  test('multiple concurrent searches should not degrade performance', async ({ page, context }) => {
    const perfHelper = createPerformanceHelper(page);
    
    // Create 3 concurrent search sessions
    const pages = await Promise.all([
      context.newPage(),
      context.newPage(),
      context.newPage()
    ]);
    
    const searchTimes: number[] = [];
    
    // Start searches concurrently
    const searches = pages.map(async (p, index) => {
      const loginPage = new LoginPage(p);
      const searchPage = new SearchPage(p);
      
      await loginPage.goto();
      await loginPage.login('test@example.com', 'Test123!@#');
      
      await searchPage.goto();
      
      const startTime = Date.now();
      await searchPage.submitSearch(`Test search ${index + 1}`);
      
      try {
        await searchPage.waitForSearchCompletion(PERFORMANCE_THRESHOLDS.searchMax);
        const completionTime = Date.now() - startTime;
        searchTimes.push(completionTime);
        console.log(`Search ${index + 1} completed in ${(completionTime / 1000).toFixed(1)}s`);
      } catch (error) {
        console.error(`Search ${index + 1} failed or timed out`);
      }
      
      await p.close();
    });
    
    await Promise.all(searches);
    
    // All searches should complete within acceptable time
    searchTimes.forEach((time, index) => {
      expect(time).toBeLessThanOrEqual(PERFORMANCE_THRESHOLDS.searchMax);
      console.log(`Search ${index + 1}: ${(time / 1000).toFixed(1)}s`);
    });
    
    // Average time should be reasonable
    const avgTime = searchTimes.reduce((a, b) => a + b, 0) / searchTimes.length;
    console.log(`Average search time: ${(avgTime / 1000).toFixed(1)}s`);
  });

  test('search should handle timeout gracefully', async ({ page }) => {
    const searchPage = new SearchPage(page);
    
    await searchPage.goto();
    await searchPage.submitSearch('Test search with potential timeout');
    
    // Wait with a shorter timeout to test timeout handling
    const shortTimeout = 10000; // 10 seconds
    
    try {
      await searchPage.waitForSearchCompletion(shortTimeout);
    } catch (error) {
      // Timeout is expected for this test
      console.log('Search timed out as expected');
    }
    
    // Check if error message is displayed
    const hasError = await page.locator('[data-testid="search-error"]').isVisible().catch(() => false);
    
    // Either search completed or error is shown
    const isComplete = await page.locator('[data-testid="search-complete"]').isVisible().catch(() => false);
    
    expect(hasError || isComplete).toBe(true);
  });

  test('search performance should be consistent across queries', async ({ page }) => {
    const searchPage = new SearchPage(page);
    const searchTimes: number[] = [];
    
    const queries = [
      'Gaps in electric vehicle charging infrastructure',
      'Gaps in remote work collaboration tools',
      'Gaps in sustainable fashion supply chains'
    ];
    
    for (const query of queries) {
      await searchPage.goto();
      
      const startTime = Date.now();
      await searchPage.submitSearch(query);
      
      try {
        await searchPage.waitForSearchCompletion(PERFORMANCE_THRESHOLDS.searchMax);
        const completionTime = Date.now() - startTime;
        searchTimes.push(completionTime);
        console.log(`"${query}" completed in ${(completionTime / 1000).toFixed(1)}s`);
      } catch (error) {
        console.error(`"${query}" failed or timed out`);
      }
      
      // Wait between searches
      await page.waitForTimeout(2000);
    }
    
    // Calculate variance
    const avgTime = searchTimes.reduce((a, b) => a + b, 0) / searchTimes.length;
    const variance = searchTimes.reduce((sum, time) => {
      return sum + Math.pow(time - avgTime, 2);
    }, 0) / searchTimes.length;
    const stdDev = Math.sqrt(variance);
    
    console.log(`Average search time: ${(avgTime / 1000).toFixed(1)}s`);
    console.log(`Standard deviation: ${(stdDev / 1000).toFixed(1)}s`);
    
    // Standard deviation should be reasonable (within 30% of average)
    expect(stdDev).toBeLessThan(avgTime * 0.3);
  });

  test('search should provide real-time progress updates', async ({ page }) => {
    const searchPage = new SearchPage(page);
    
    await searchPage.goto();
    await searchPage.submitSearch('Gaps in quantum computing applications');
    
    let lastProgress = 0;
    let updateCount = 0;
    const startTime = Date.now();
    
    // Monitor for 60 seconds
    while (Date.now() - startTime < 60000) {
      const currentProgress = await searchPage.getProgressPercentage();
      
      if (currentProgress > lastProgress) {
        updateCount++;
        console.log(`Progress update ${updateCount}: ${currentProgress}%`);
        lastProgress = currentProgress;
      }
      
      // Check if complete
      const isComplete = await page.locator('[data-testid="search-complete"]').isVisible().catch(() => false);
      if (isComplete) break;
      
      await page.waitForTimeout(3000);
    }
    
    // Should have received multiple progress updates
    expect(updateCount).toBeGreaterThan(5);
    
    console.log(`Total progress updates: ${updateCount}`);
  });

  test('search results should load quickly after completion', async ({ page }) => {
    const perfHelper = createPerformanceHelper(page);
    const searchPage = new SearchPage(page);
    const resultsPage = new SearchResultsPage(page);
    
    await searchPage.goto();
    await searchPage.submitSearch('Gaps in blockchain supply chain tracking');
    
    // Wait for search to complete
    await searchPage.waitForSearchCompletion(PERFORMANCE_THRESHOLDS.searchMax);
    
    // Measure time to display results
    const startTime = Date.now();
    
    // Wait for results to be visible
    await page.waitForSelector('[data-testid="executive-summary"]', { timeout: 5000 });
    
    const resultsLoadTime = Date.now() - startTime;
    
    console.log(`Results loaded in ${resultsLoadTime}ms`);
    
    // Results should load quickly (under 2 seconds)
    expect(resultsLoadTime).toBeLessThan(2000);
    
    // Verify results are complete
    const hasInnovationScore = await resultsPage.hasInnovationScore();
    expect(hasInnovationScore).toBe(true);
  });
});
