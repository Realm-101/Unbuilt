import { Page } from '@playwright/test';
import { BasePage } from './base.page';

/**
 * DashboardPage - Handles dashboard page interactions
 * 
 * Provides methods for interacting with dashboard sections including
 * recent searches, favorites, projects, and keyboard shortcuts.
 * 
 * Example:
 * ```
 * const dashboardPage = new DashboardPage(page);
 * await dashboardPage.goto();
 * await dashboardPage.clickNewSearch();
 * const count = await dashboardPage.getRecentSearchCount();
 * ```
 */
export class DashboardPage extends BasePage {
  // Main dashboard sections
  private readonly newSearchButton = '[data-testid="new-search-button"]';
  private readonly recentSearches = '[data-testid="recent-searches"]';
  private readonly favorites = '[data-testid="favorites"]';
  private readonly projects = '[data-testid="projects"]';
  private readonly searchOverview = '[data-testid="search-overview"]';
  
  // Dashboard cards and items
  private readonly searchCard = '[data-testid="search-card"]';
  private readonly favoriteCard = '[data-testid="favorite-card"]';
  private readonly projectCard = '[data-testid="project-card"]';
  
  // Tier indicator
  private readonly tierIndicator = '[data-testid="tier-indicator"]';
  private readonly usageStats = '[data-testid="usage-stats"]';
  
  // Search filters
  private readonly searchFilters = '[data-testid="search-filters"]';
  private readonly sortBySelect = '[data-testid="sort-by-select"]';
  
  // Recommended resources
  private readonly recommendedResources = '[data-testid="recommended-resources"]';
  private readonly resourceCard = '[data-testid="resource-card"]';

  constructor(page: Page) {
    super(page);
  }

  /**
   * Navigate to the dashboard page
   */
  async goto(): Promise<void> {
    await super.goto('/dashboard');
  }

  /**
   * Click the new search button to create a new search
   */
  async clickNewSearch(): Promise<void> {
    await this.click(this.newSearchButton);
  }

  /**
   * Get the count of recent searches displayed
   */
  async getRecentSearchCount(): Promise<number> {
    const searches = await this.locator(`${this.recentSearches} ${this.searchCard}`);
    return await searches.count();
  }

  /**
   * Get the count of favorites displayed
   */
  async getFavoritesCount(): Promise<number> {
    const favorites = await this.locator(`${this.favorites} ${this.favoriteCard}`);
    return await favorites.count();
  }

  /**
   * Get the count of projects displayed
   */
  async getProjectsCount(): Promise<number> {
    const projects = await this.locator(`${this.projects} ${this.projectCard}`);
    return await projects.count();
  }

  /**
   * Get the count of recommended resources displayed
   */
  async getRecommendedResourcesCount(): Promise<number> {
    const resources = await this.locator(`${this.recommendedResources} ${this.resourceCard}`);
    return await resources.count();
  }

  /**
   * Use a keyboard shortcut
   * @param shortcut - The keyboard shortcut to press (e.g., 'Control+k', 'Meta+k')
   */
  async useKeyboardShortcut(shortcut: string): Promise<void> {
    await this.page.keyboard.press(shortcut);
  }

  /**
   * Check if the tier indicator is visible
   */
  async isTierIndicatorVisible(): Promise<boolean> {
    return await this.locator(this.tierIndicator).isVisible();
  }

  /**
   * Get the tier name from the tier indicator
   */
  async getTierName(): Promise<string> {
    return await this.getText(this.tierIndicator);
  }

  /**
   * Check if usage stats are visible
   */
  async isUsageStatsVisible(): Promise<boolean> {
    return await this.locator(this.usageStats).isVisible();
  }

  /**
   * Click on a recent search by index
   * @param index - Zero-based index of the search to click
   */
  async clickRecentSearch(index: number): Promise<void> {
    const searches = await this.locator(`${this.recentSearches} ${this.searchCard}`);
    await searches.nth(index).click();
  }

  /**
   * Click on a favorite by index
   * @param index - Zero-based index of the favorite to click
   */
  async clickFavorite(index: number): Promise<void> {
    const favorites = await this.locator(`${this.favorites} ${this.favoriteCard}`);
    await favorites.nth(index).click();
  }

  /**
   * Click on a project by index
   * @param index - Zero-based index of the project to click
   */
  async clickProject(index: number): Promise<void> {
    const projects = await this.locator(`${this.projects} ${this.projectCard}`);
    await projects.nth(index).click();
  }

  /**
   * Check if search filters are visible
   */
  async areSearchFiltersVisible(): Promise<boolean> {
    return await this.locator(this.searchFilters).isVisible();
  }

  /**
   * Change the sort order using the sort by select
   * @param sortBy - The sort option to select (e.g., 'date', 'relevance')
   */
  async changeSortBy(sortBy: string): Promise<void> {
    await this.click(this.sortBySelect);
    await this.page.click(`[data-value="${sortBy}"]`);
  }

  /**
   * Wait for dashboard to fully load
   */
  async waitForDashboardLoad(): Promise<void> {
    await this.waitForPageLoad();
    await this.page.waitForSelector(this.recentSearches, { state: 'visible' });
  }

  /**
   * Check if the dashboard is empty (no searches, favorites, or projects)
   */
  async isDashboardEmpty(): Promise<boolean> {
    const searchCount = await this.getRecentSearchCount();
    const favoritesCount = await this.getFavoritesCount();
    const projectsCount = await this.getProjectsCount();
    
    return searchCount === 0 && favoritesCount === 0 && projectsCount === 0;
  }

  /**
   * Pull to refresh on mobile (if supported)
   */
  async pullToRefresh(): Promise<void> {
    // Simulate pull-to-refresh gesture
    await this.page.mouse.move(200, 100);
    await this.page.mouse.down();
    await this.page.mouse.move(200, 300, { steps: 10 });
    await this.page.mouse.up();
    
    // Wait for refresh to complete
    await this.page.waitForTimeout(1000);
  }
}
