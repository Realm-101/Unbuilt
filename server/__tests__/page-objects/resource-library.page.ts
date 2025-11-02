import { Page } from '@playwright/test';
import { BasePage } from './base.page';

/**
 * ResourceLibraryPage - Handles resource library browsing and interaction
 * 
 * Provides methods for searching, filtering, and interacting with resources
 * including bookmarking and rating.
 * 
 * Example:
 * ```
 * const resourcePage = new ResourceLibraryPage(page);
 * await resourcePage.goto();
 * await resourcePage.searchResources('templates');
 * await resourcePage.filterByCategory('Technology');
 * await resourcePage.bookmarkResource(0);
 * ```
 */
export class ResourceLibraryPage extends BasePage {
  // Search
  private readonly searchInput = '[data-testid="resource-search-input"]';
  private readonly searchButton = '[data-testid="resource-search-button"]';
  private readonly clearSearchButton = '[data-testid="clear-search-button"]';
  
  // Filters
  private readonly filtersButton = '[data-testid="filters-button"]';
  private readonly filtersPanel = '[data-testid="filters-panel"]';
  private readonly categoryFilter = '[data-testid="category-filter"]';
  private readonly phaseFilter = '[data-testid="phase-filter"]';
  private readonly typeFilter = '[data-testid="type-filter"]';
  private readonly ratingFilter = '[data-testid="rating-filter"]';
  private readonly premiumFilter = '[data-testid="premium-filter"]';
  
  // Filter chips
  private readonly activeFilters = '[data-testid="active-filters"]';
  private readonly filterChip = '[data-testid="filter-chip"]';
  
  // Resource cards
  private readonly resourceCard = '[data-testid="resource-card"]';
  private readonly resourceTitle = '[data-testid="resource-title"]';
  private readonly resourceDescription = '[data-testid="resource-description"]';
  private readonly resourceCategory = '[data-testid="resource-category"]';
  private readonly resourceType = '[data-testid="resource-type"]';
  private readonly resourceRating = '[data-testid="resource-rating"]';
  
  // Resource actions
  private readonly bookmarkButton = '[data-testid="bookmark-button"]';
  private readonly unbookmarkButton = '[data-testid="unbookmark-button"]';
  private readonly viewButton = '[data-testid="view-resource-button"]';
  private readonly rateButton = '[data-testid="rate-button"]';
  private readonly downloadButton = '[data-testid="download-button"]';
  
  // Rating
  private readonly ratingStars = '[data-testid="rating-stars"]';
  private readonly ratingStar = '[data-testid="rating-star"]';
  
  // Pagination
  private readonly paginationNext = '[data-testid="pagination-next"]';
  private readonly paginationPrev = '[data-testid="pagination-prev"]';
  private readonly pageNumber = '[data-testid="page-number"]';
  
  // Results info
  private readonly resultsCount = '[data-testid="results-count"]';
  private readonly emptyState = '[data-testid="empty-state"]';
  
  // Breadcrumbs
  private readonly breadcrumbs = '[data-testid="breadcrumbs"]';

  constructor(page: Page) {
    super(page);
  }

  /**
   * Navigate to the resource library page
   */
  async goto(): Promise<void> {
    await super.goto('/resources');
  }

  /**
   * Search for resources
   * @param query - The search query
   */
  async searchResources(query: string): Promise<void> {
    await this.fill(this.searchInput, query);
    await this.click(this.searchButton);
    await this.waitForResultsLoad();
  }

  /**
   * Clear the search
   */
  async clearSearch(): Promise<void> {
    await this.click(this.clearSearchButton);
    await this.waitForResultsLoad();
  }

  /**
   * Open the filters panel
   */
  async openFilters(): Promise<void> {
    if (!(await this.isFiltersPanelOpen())) {
      await this.click(this.filtersButton);
    }
  }

  /**
   * Close the filters panel
   */
  async closeFilters(): Promise<void> {
    if (await this.isFiltersPanelOpen()) {
      await this.click(this.filtersButton);
    }
  }

  /**
   * Check if filters panel is open
   */
  async isFiltersPanelOpen(): Promise<boolean> {
    return await this.locator(this.filtersPanel).isVisible();
  }

  /**
   * Filter by category
   * @param category - The category name to filter by
   */
  async filterByCategory(category: string): Promise<void> {
    await this.openFilters();
    await this.page.click(`${this.categoryFilter} [data-value="${category}"]`);
    await this.waitForResultsLoad();
  }

  /**
   * Filter by phase
   * @param phase - The phase to filter by
   */
  async filterByPhase(phase: string): Promise<void> {
    await this.openFilters();
    await this.page.click(`${this.phaseFilter} [data-value="${phase}"]`);
    await this.waitForResultsLoad();
  }

  /**
   * Filter by resource type
   * @param type - The resource type to filter by
   */
  async filterByType(type: string): Promise<void> {
    await this.openFilters();
    await this.page.click(`${this.typeFilter} [data-value="${type}"]`);
    await this.waitForResultsLoad();
  }

  /**
   * Filter by minimum rating
   * @param rating - Minimum rating (1-5)
   */
  async filterByRating(rating: number): Promise<void> {
    await this.openFilters();
    await this.page.click(`${this.ratingFilter} [data-value="${rating}"]`);
    await this.waitForResultsLoad();
  }

  /**
   * Filter to show only premium resources
   */
  async filterPremiumOnly(): Promise<void> {
    await this.openFilters();
    await this.click(this.premiumFilter);
    await this.waitForResultsLoad();
  }

  /**
   * Remove a filter chip by index
   * @param index - Zero-based index of the filter chip
   */
  async removeFilterChip(index: number): Promise<void> {
    const chips = await this.locator(this.filterChip);
    await chips.nth(index).click();
    await this.waitForResultsLoad();
  }

  /**
   * Clear all filters
   */
  async clearAllFilters(): Promise<void> {
    const clearAllButton = this.page.locator('[data-testid="clear-all-filters"]');
    
    if (await clearAllButton.isVisible()) {
      await clearAllButton.click();
      await this.waitForResultsLoad();
    }
  }

  /**
   * Get the count of resource cards displayed
   */
  async getResourceCount(): Promise<number> {
    const resources = await this.locator(this.resourceCard);
    return await resources.count();
  }

  /**
   * Get resource data by index
   * @param index - Zero-based index of the resource
   */
  async getResourceData(index: number): Promise<{
    title: string;
    description: string;
    category: string;
    type: string;
    rating: number;
  }> {
    const card = await this.locator(this.resourceCard).nth(index);
    
    const title = await card.locator(this.resourceTitle).textContent() || '';
    const description = await card.locator(this.resourceDescription).textContent() || '';
    const category = await card.locator(this.resourceCategory).textContent() || '';
    const type = await card.locator(this.resourceType).textContent() || '';
    
    const ratingText = await card.locator(this.resourceRating).textContent() || '0';
    const rating = parseFloat(ratingText.match(/(\d+(?:\.\d+)?)/)?.[1] || '0');
    
    return { title, description, category, type, rating };
  }

  /**
   * Bookmark a resource
   * @param index - Zero-based index of the resource
   */
  async bookmarkResource(index: number): Promise<void> {
    const card = await this.locator(this.resourceCard).nth(index);
    await card.locator(this.bookmarkButton).click();
  }

  /**
   * Unbookmark a resource
   * @param index - Zero-based index of the resource
   */
  async unbookmarkResource(index: number): Promise<void> {
    const card = await this.locator(this.resourceCard).nth(index);
    await card.locator(this.unbookmarkButton).click();
  }

  /**
   * Check if a resource is bookmarked
   * @param index - Zero-based index of the resource
   */
  async isResourceBookmarked(index: number): Promise<boolean> {
    const card = await this.locator(this.resourceCard).nth(index);
    const unbookmarkButton = card.locator(this.unbookmarkButton);
    return await unbookmarkButton.isVisible();
  }

  /**
   * View a resource
   * @param index - Zero-based index of the resource
   */
  async viewResource(index: number): Promise<void> {
    const card = await this.locator(this.resourceCard).nth(index);
    await card.locator(this.viewButton).click();
  }

  /**
   * Rate a resource
   * @param index - Zero-based index of the resource
   * @param rating - Rating value (1-5)
   */
  async rateResource(index: number, rating: number): Promise<void> {
    const card = await this.locator(this.resourceCard).nth(index);
    await card.locator(this.rateButton).click();
    
    // Wait for rating dialog/modal
    await this.page.waitForTimeout(500);
    
    // Click the appropriate star
    const stars = this.page.locator(`${this.ratingStar}`);
    await stars.nth(rating - 1).click();
    
    // Confirm rating if there's a confirm button
    const confirmButton = this.page.locator('[data-testid="confirm-rating"]');
    if (await confirmButton.isVisible()) {
      await confirmButton.click();
    }
  }

  /**
   * Download a resource
   * @param index - Zero-based index of the resource
   */
  async downloadResource(index: number): Promise<void> {
    const card = await this.locator(this.resourceCard).nth(index);
    await card.locator(this.downloadButton).click();
  }

  /**
   * Navigate to next page of results
   */
  async goToNextPage(): Promise<void> {
    await this.click(this.paginationNext);
    await this.waitForResultsLoad();
  }

  /**
   * Navigate to previous page of results
   */
  async goToPreviousPage(): Promise<void> {
    await this.click(this.paginationPrev);
    await this.waitForResultsLoad();
  }

  /**
   * Get the current page number
   */
  async getCurrentPageNumber(): Promise<number> {
    const activePageButton = await this.locator(`${this.pageNumber}.active`);
    const pageText = await activePageButton.textContent();
    return parseInt(pageText || '1', 10);
  }

  /**
   * Go to a specific page
   * @param pageNumber - The page number to navigate to
   */
  async goToPage(pageNumber: number): Promise<void> {
    await this.click(`${this.pageNumber}:has-text("${pageNumber}")`);
    await this.waitForResultsLoad();
  }

  /**
   * Get the total results count
   */
  async getTotalResultsCount(): Promise<number> {
    const countText = await this.getText(this.resultsCount);
    const match = countText.match(/(\d+)\s*resources?/i);
    return match ? parseInt(match[1], 10) : 0;
  }

  /**
   * Check if results are empty
   */
  async isResultsEmpty(): Promise<boolean> {
    return await this.locator(this.emptyState).isVisible();
  }

  /**
   * Wait for results to load
   */
  async waitForResultsLoad(): Promise<void> {
    await this.page.waitForLoadState('networkidle');
    await this.page.waitForTimeout(500); // Brief pause for UI updates
  }

  /**
   * Get all resource titles
   */
  async getAllResourceTitles(): Promise<string[]> {
    const cards = await this.locator(this.resourceCard);
    const count = await cards.count();
    const titles: string[] = [];
    
    for (let i = 0; i < count; i++) {
      const card = cards.nth(i);
      const title = await card.locator(this.resourceTitle).textContent();
      if (title) {
        titles.push(title.trim());
      }
    }
    
    return titles;
  }

  /**
   * Search and filter resources
   * @param query - Search query
   * @param filters - Object containing filter options
   */
  async searchAndFilter(
    query: string,
    filters?: {
      category?: string;
      phase?: string;
      type?: string;
      minRating?: number;
      premiumOnly?: boolean;
    }
  ): Promise<void> {
    // Search first
    if (query) {
      await this.searchResources(query);
    }
    
    // Apply filters
    if (filters) {
      if (filters.category) {
        await this.filterByCategory(filters.category);
      }
      
      if (filters.phase) {
        await this.filterByPhase(filters.phase);
      }
      
      if (filters.type) {
        await this.filterByType(filters.type);
      }
      
      if (filters.minRating) {
        await this.filterByRating(filters.minRating);
      }
      
      if (filters.premiumOnly) {
        await this.filterPremiumOnly();
      }
    }
  }

  /**
   * Get the count of active filters
   */
  async getActiveFilterCount(): Promise<number> {
    const chips = await this.locator(this.filterChip);
    return await chips.count();
  }

  /**
   * Check if a specific filter is active
   * @param filterText - The text of the filter to check
   */
  async isFilterActive(filterText: string): Promise<boolean> {
    const chip = this.page.locator(`${this.filterChip}:has-text("${filterText}")`);
    return await chip.isVisible();
  }
}
