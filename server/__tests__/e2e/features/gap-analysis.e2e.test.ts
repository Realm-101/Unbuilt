import { test, expect } from '@playwright/test';
import { LoginPage } from '../../page-objects/login.page';
import { DashboardPage } from '../../page-objects/dashboard.page';
import { SearchPage } from '../../page-objects/search.page';
import { SearchResultsPage } from '../../page-objects/search-results.page';

/**
 * Gap Analysis Search E2E Tests
 * 
 * Tests the core gap analysis search functionality including:
 * - Search creation with keyboard shortcuts
 * - Search submission and progress monitoring
 * - 4-phase completion validation
 * - Search results display
 * - Search history and favorites
 * 
 * Requirements: 3.1, 3.2
 */

test.describe('Gap Analysis Search', () => {
  let loginPage: LoginPage;
  let dashboardPage: DashboardPage;
  let searchPage: SearchPage;
  let resultsPage: SearchResultsPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    dashboardPage = new DashboardPage(page);
    searchPage = new SearchPage(page);
    resultsPage = new SearchResultsPage(page);

    // Login before each test
    await loginPage.goto();
    await loginPage.login('test@example.com', 'Test123!@#');
    await dashboardPage.waitForDashboardLoad();
  });

  test('should create new search with keyboard shortcut', async ({ page }) => {
    // Use keyboard shortcut to create new search (Ctrl+K or Cmd+K)
    const isMac = process.platform === 'darwin';
    const shortcut = isMac ? 'Meta+k' : 'Control+k';
    
    await dashboardPage.useKeyboardShortcut(shortcut);
    
    // Verify we're on the search page
    await expect(page).toHaveURL(/\/search\/new/);
    
    // Verify search input is focused
    const searchInput = page.locator('[data-testid="search-input"]');
    await expect(searchInput).toBeFocused();
  });

  test('should submit search and monitor progress through 4 phases', async ({ page }) => {
    // Navigate to search page
    await searchPage.goto();
    
    // Submit a search query
    const testQuery = 'Gaps in sustainable packaging for e-commerce';
    await searchPage.submitSearch(testQuery);
    
    // Verify search is loading
    expect(await searchPage.isSearchLoading()).toBe(true);
    
    // Monitor progress through all 4 phases
    const phases: number[] = [];
    const startTime = Date.now();
    
    await searchPage.monitorSearchProgress((phase, progress) => {
      if (!phases.includes(phase)) {
        phases.push(phase);
        console.log(`Phase ${phase} started - Progress: ${progress}%`);
      }
    });
    
    const duration = Date.now() - startTime;
    
    // Verify all 4 phases were completed
    expect(phases).toContain(1);
    expect(phases).toContain(2);
    expect(phases).toContain(3);
    expect(phases).toContain(4);
    
    // Verify completion time is within 2-3 minutes (with some buffer)
    expect(duration).toBeLessThan(240000); // 4 minutes max
    
    // Verify search completed successfully
    expect(await searchPage.isSearchComplete()).toBe(true);
  });

  test('should validate 4-phase completion within time limit', async ({ page }) => {
    await searchPage.goto();
    
    const testQuery = 'AI-powered healthcare diagnostics gaps';
    await searchPage.submitSearch(testQuery);
    
    const startTime = Date.now();
    
    // Wait for each phase to complete
    for (let phase = 1; phase <= 4; phase++) {
      await searchPage.waitForPhase(phase, 60000);
      expect(await searchPage.getCurrentPhase()).toBe(phase);
    }
    
    // Wait for final completion
    await searchPage.waitForSearchCompletion();
    
    const duration = Date.now() - startTime;
    
    // Verify completion within 3 minutes (180 seconds)
    expect(duration).toBeLessThan(180000);
    
    // Verify all phases are marked as completed
    for (let phase = 1; phase <= 4; phase++) {
      expect(await searchPage.isPhaseCompleted(phase)).toBe(true);
    }
    
    // Verify progress is 100%
    expect(await searchPage.getProgressPercentage()).toBe(100);
  });

  test('should display search results with summary, score, and ratings', async ({ page }) => {
    // Create and complete a search
    await searchPage.goto();
    await searchPage.submitSearch('Gaps in renewable energy storage');
    await searchPage.waitForSearchCompletion();
    
    // Navigate to results (should auto-redirect or click to view)
    await page.waitForURL(/\/search\/\d+/);
    
    // Verify executive summary is displayed
    const summary = await resultsPage.getExecutiveSummary();
    expect(summary).toBeTruthy();
    expect(summary.length).toBeGreaterThan(50);
    
    // Verify innovation score is displayed and valid
    const innovationScore = await resultsPage.getInnovationScore();
    expect(innovationScore).toBeGreaterThan(0);
    expect(innovationScore).toBeLessThanOrEqual(10);
    
    // Verify feasibility rating is displayed
    const feasibilityRating = await resultsPage.getFeasibilityRating();
    expect(['high', 'medium', 'low']).toContain(feasibilityRating);
    
    // Verify market potential is displayed
    const marketPotential = await resultsPage.getMarketPotential();
    expect(['high', 'medium', 'low']).toContain(marketPotential);
    
    // Verify result cards are displayed
    const resultCount = await resultsPage.getResultCount();
    expect(resultCount).toBeGreaterThan(0);
  });

  test('should display and interact with search results', async ({ page }) => {
    // Complete a search
    await searchPage.goto();
    await searchPage.submitSearch('Gaps in electric vehicle charging infrastructure');
    await searchPage.waitForSearchCompletion();
    await page.waitForURL(/\/search\/\d+/);
    
    // Get first result data
    const firstResult = await resultsPage.getResultData(0);
    expect(firstResult.title).toBeTruthy();
    expect(firstResult.description).toBeTruthy();
    expect(firstResult.category).toBeTruthy();
    
    // Verify roadmap is displayed
    await resultsPage.navigateToRoadmap();
    const phaseCount = await resultsPage.getRoadmapPhaseCount();
    expect(phaseCount).toBe(4);
    
    // Verify each phase has data
    for (let phase = 1; phase <= 4; phase++) {
      const phaseData = await resultsPage.getPhaseData(phase);
      expect(phaseData.title).toBeTruthy();
      expect(phaseData.description).toBeTruthy();
    }
  });

  test('should add search to favorites', async ({ page }) => {
    // Complete a search
    await searchPage.goto();
    await searchPage.submitSearch('Gaps in remote work collaboration tools');
    await searchPage.waitForSearchCompletion();
    await page.waitForURL(/\/search\/\d+/);
    
    // Favorite the first result
    await resultsPage.favoriteResult(0);
    
    // Verify result is favorited
    expect(await resultsPage.isResultFavorited(0)).toBe(true);
    
    // Navigate back to dashboard
    await dashboardPage.goto();
    await dashboardPage.waitForDashboardLoad();
    
    // Verify favorites count increased
    const favoritesCount = await dashboardPage.getFavoritesCount();
    expect(favoritesCount).toBeGreaterThan(0);
  });

  test('should display search in history', async ({ page }) => {
    // Get initial search count
    await dashboardPage.goto();
    await dashboardPage.waitForDashboardLoad();
    const initialCount = await dashboardPage.getRecentSearchCount();
    
    // Create a new search
    await searchPage.goto();
    await searchPage.submitSearch('Gaps in cybersecurity for IoT devices');
    await searchPage.waitForSearchCompletion();
    
    // Navigate back to dashboard
    await dashboardPage.goto();
    await dashboardPage.waitForDashboardLoad();
    
    // Verify search appears in history
    const newCount = await dashboardPage.getRecentSearchCount();
    expect(newCount).toBeGreaterThan(initialCount);
  });

  test('should handle search with empty query', async ({ page }) => {
    await searchPage.goto();
    
    // Try to submit empty search
    await searchPage.clearSearchInput();
    
    // Verify submit button is disabled
    expect(await searchPage.isSubmitButtonDisabled()).toBe(true);
  });

  test('should display progress indicators during search', async ({ page }) => {
    await searchPage.goto();
    await searchPage.submitSearch('Gaps in quantum computing applications');
    
    // Verify progress indicators are visible
    await page.waitForTimeout(2000); // Wait for search to start
    
    // Check that we can get current phase
    const currentPhase = await searchPage.getCurrentPhase();
    expect(currentPhase).toBeGreaterThanOrEqual(1);
    expect(currentPhase).toBeLessThanOrEqual(4);
    
    // Check that progress percentage is updating
    const progress = await searchPage.getProgressPercentage();
    expect(progress).toBeGreaterThanOrEqual(0);
    expect(progress).toBeLessThanOrEqual(100);
    
    // Wait for completion
    await searchPage.waitForSearchCompletion();
  });

  test('should navigate from dashboard to search results', async ({ page }) => {
    // Create a search first
    await searchPage.goto();
    await searchPage.submitSearch('Gaps in blockchain for supply chain');
    await searchPage.waitForSearchCompletion();
    
    // Go back to dashboard
    await dashboardPage.goto();
    await dashboardPage.waitForDashboardLoad();
    
    // Click on the recent search
    await dashboardPage.clickRecentSearch(0);
    
    // Verify we're on the search results page
    await expect(page).toHaveURL(/\/search\/\d+/);
    
    // Verify results are displayed
    const summary = await resultsPage.getExecutiveSummary();
    expect(summary).toBeTruthy();
  });

  test('should unfavorite a search result', async ({ page }) => {
    // Complete a search and favorite it
    await searchPage.goto();
    await searchPage.submitSearch('Gaps in mental health apps');
    await searchPage.waitForSearchCompletion();
    await page.waitForURL(/\/search\/\d+/);
    
    // Favorite the result
    await resultsPage.favoriteResult(0);
    expect(await resultsPage.isResultFavorited(0)).toBe(true);
    
    // Unfavorite the result
    await resultsPage.unfavoriteResult(0);
    expect(await resultsPage.isResultFavorited(0)).toBe(false);
  });

  test('should display all result titles', async ({ page }) => {
    await searchPage.goto();
    await searchPage.submitSearch('Gaps in sustainable fashion');
    await searchPage.waitForSearchCompletion();
    await page.waitForURL(/\/search\/\d+/);
    
    // Get all result titles
    const titles = await resultsPage.getAllResultTitles();
    
    // Verify we have multiple results
    expect(titles.length).toBeGreaterThan(0);
    
    // Verify each title is non-empty
    titles.forEach(title => {
      expect(title.length).toBeGreaterThan(0);
    });
  });
});
