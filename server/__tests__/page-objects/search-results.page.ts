import { Page } from '@playwright/test';
import { BasePage } from './base.page';

/**
 * SearchResultsPage - Handles search results viewing and interaction
 * 
 * Provides methods for viewing search results, extracting data,
 * navigating roadmaps, and managing favorites.
 * 
 * Example:
 * ```
 * const resultsPage = new SearchResultsPage(page);
 * await resultsPage.goto(searchId);
 * const score = await resultsPage.getInnovationScore();
 * await resultsPage.favoriteResult(0);
 * ```
 */
export class SearchResultsPage extends BasePage {
  // Main result sections
  private readonly executiveSummary = '[data-testid="executive-summary"]';
  private readonly innovationScore = '[data-testid="innovation-score"]';
  private readonly feasibilityRating = '[data-testid="feasibility-rating"]';
  private readonly marketPotential = '[data-testid="market-potential"]';
  
  // Result cards
  private readonly resultCard = '[data-testid="result-card"]';
  private readonly gapCategoryCard = '[data-testid="gap-category-card"]';
  
  // Result card elements
  private readonly resultTitle = '[data-testid="result-title"]';
  private readonly resultDescription = '[data-testid="result-description"]';
  private readonly resultCategory = '[data-testid="result-category"]';
  
  // Action buttons
  private readonly saveButton = '[data-testid="save-button"]';
  private readonly shareButton = '[data-testid="share-button"]';
  private readonly viewDetailsButton = '[data-testid="view-details-button"]';
  private readonly exportButton = '[data-testid="export-button"]';
  
  // Favorite/bookmark
  private readonly favoriteButton = '[data-testid="favorite-button"]';
  private readonly unfavoriteButton = '[data-testid="unfavorite-button"]';
  private readonly bookmarkIcon = '[data-testid="bookmark-icon"]';
  
  // Roadmap/Action Plan
  private readonly roadmapSection = '[data-testid="roadmap-section"]';
  private readonly phaseCard = '[data-testid="phase-card"]';
  private readonly phase1Card = '[data-testid="phase-1-card"]';
  private readonly phase2Card = '[data-testid="phase-2-card"]';
  private readonly phase3Card = '[data-testid="phase-3-card"]';
  private readonly phase4Card = '[data-testid="phase-4-card"]';
  
  // Filters and sorting
  private readonly categoryFilter = '[data-testid="category-filter"]';
  private readonly sortBySelect = '[data-testid="sort-by-select"]';
  private readonly searchFilter = '[data-testid="search-filter"]';
  
  // View modes
  private readonly resultsView = '[data-testid="results-view"]';
  private readonly analyticsView = '[data-testid="analytics-view"]';
  private readonly viewModeToggle = '[data-testid="view-mode-toggle"]';
  
  // Pagination
  private readonly paginationNext = '[data-testid="pagination-next"]';
  private readonly paginationPrev = '[data-testid="pagination-prev"]';
  private readonly pageNumber = '[data-testid="page-number"]';

  constructor(page: Page) {
    super(page);
  }

  /**
   * Navigate to search results page
   * @param searchId - The ID of the search
   */
  async gotoSearchResults(searchId: number): Promise<void> {
    await super.goto(`/search/${searchId}`);
  }

  /**
   * Get the executive summary text
   */
  async getExecutiveSummary(): Promise<string> {
    return await this.getText(this.executiveSummary);
  }

  /**
   * Get the innovation score
   * @returns Innovation score as a number (0-10)
   */
  async getInnovationScore(): Promise<number> {
    const scoreText = await this.getText(this.innovationScore);
    const match = scoreText.match(/(\d+(?:\.\d+)?)/);
    return match ? parseFloat(match[1]) : 0;
  }

  /**
   * Get the feasibility rating
   * @returns Feasibility rating ('high', 'medium', or 'low')
   */
  async getFeasibilityRating(): Promise<string> {
    const rating = await this.getText(this.feasibilityRating);
    return rating.toLowerCase().trim();
  }

  /**
   * Get the market potential rating
   * @returns Market potential rating ('high', 'medium', or 'low')
   */
  async getMarketPotential(): Promise<string> {
    const potential = await this.getText(this.marketPotential);
    return potential.toLowerCase().trim();
  }

  /**
   * Get the count of result cards displayed
   */
  async getResultCount(): Promise<number> {
    const results = await this.locator(this.gapCategoryCard);
    return await results.count();
  }

  /**
   * Get result data by index
   * @param index - Zero-based index of the result
   */
  async getResultData(index: number): Promise<{
    title: string;
    description: string;
    category: string;
  }> {
    const card = await this.locator(this.gapCategoryCard).nth(index);
    
    const title = await card.locator(this.resultTitle).textContent() || '';
    const description = await card.locator(this.resultDescription).textContent() || '';
    const category = await card.locator(this.resultCategory).textContent() || '';
    
    return { title, description, category };
  }

  /**
   * Click the favorite/bookmark button for a result
   * @param index - Zero-based index of the result
   */
  async favoriteResult(index: number): Promise<void> {
    const card = await this.locator(this.gapCategoryCard).nth(index);
    await card.locator(this.favoriteButton).click();
  }

  /**
   * Click the unfavorite button for a result
   * @param index - Zero-based index of the result
   */
  async unfavoriteResult(index: number): Promise<void> {
    const card = await this.locator(this.gapCategoryCard).nth(index);
    await card.locator(this.unfavoriteButton).click();
  }

  /**
   * Check if a result is favorited
   * @param index - Zero-based index of the result
   */
  async isResultFavorited(index: number): Promise<boolean> {
    const card = await this.locator(this.gapCategoryCard).nth(index);
    const bookmarkIcon = card.locator(this.bookmarkIcon);
    
    // Check if the bookmark icon has a "filled" or "active" class
    const classes = await bookmarkIcon.getAttribute('class');
    return classes?.includes('filled') || classes?.includes('active') || false;
  }

  /**
   * Click the share button for a result
   * @param index - Zero-based index of the result
   */
  async shareResult(index: number): Promise<void> {
    const card = await this.locator(this.gapCategoryCard).nth(index);
    await card.locator(this.shareButton).click();
  }

  /**
   * Click the view details button for a result
   * @param index - Zero-based index of the result
   */
  async viewResultDetails(index: number): Promise<void> {
    const card = await this.locator(this.gapCategoryCard).nth(index);
    await card.locator(this.viewDetailsButton).click();
  }

  /**
   * Navigate to the roadmap section
   */
  async navigateToRoadmap(): Promise<void> {
    await this.page.evaluate(() => {
      const roadmap = document.querySelector('[data-testid="roadmap-section"]');
      roadmap?.scrollIntoView({ behavior: 'smooth' });
    });
    
    await this.page.waitForTimeout(500); // Wait for scroll
  }

  /**
   * Get the count of roadmap phases
   */
  async getRoadmapPhaseCount(): Promise<number> {
    const phases = await this.locator(this.phaseCard);
    return await phases.count();
  }

  /**
   * Get phase data by phase number
   * @param phaseNumber - The phase number (1-4)
   */
  async getPhaseData(phaseNumber: number): Promise<{
    title: string;
    description: string;
  }> {
    const phaseCard = await this.locator(`[data-testid="phase-${phaseNumber}-card"]`);
    
    const title = await phaseCard.locator('[data-testid="phase-title"]').textContent() || '';
    const description = await phaseCard.locator('[data-testid="phase-description"]').textContent() || '';
    
    return { title, description };
  }

  /**
   * Click on a specific phase card
   * @param phaseNumber - The phase number (1-4)
   */
  async clickPhase(phaseNumber: number): Promise<void> {
    await this.click(`[data-testid="phase-${phaseNumber}-card"]`);
  }

  /**
   * Filter results by category
   * @param category - The category to filter by
   */
  async filterByCategory(category: string): Promise<void> {
    await this.click(this.categoryFilter);
    await this.page.click(`[data-value="${category}"]`);
  }

  /**
   * Sort results
   * @param sortBy - The sort option (e.g., 'relevance', 'feasibility', 'innovation')
   */
  async sortResults(sortBy: string): Promise<void> {
    await this.click(this.sortBySelect);
    await this.page.click(`[data-value="${sortBy}"]`);
  }

  /**
   * Search within results
   * @param query - The search query
   */
  async searchWithinResults(query: string): Promise<void> {
    await this.fill(this.searchFilter, query);
  }

  /**
   * Switch to analytics view
   */
  async switchToAnalyticsView(): Promise<void> {
    await this.click('[data-value="analytics"]');
  }

  /**
   * Switch to results view
   */
  async switchToResultsView(): Promise<void> {
    await this.click('[data-value="results"]');
  }

  /**
   * Check if analytics view is active
   */
  async isAnalyticsViewActive(): Promise<boolean> {
    return await this.locator(this.analyticsView).isVisible();
  }

  /**
   * Click the export button
   */
  async clickExport(): Promise<void> {
    await this.click(this.exportButton);
  }

  /**
   * Navigate to next page of results
   */
  async goToNextPage(): Promise<void> {
    await this.click(this.paginationNext);
  }

  /**
   * Navigate to previous page of results
   */
  async goToPreviousPage(): Promise<void> {
    await this.click(this.paginationPrev);
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
  }

  /**
   * Wait for results to load
   */
  async waitForResultsLoad(): Promise<void> {
    await this.waitForPageLoad();
    await this.page.waitForSelector(this.gapCategoryCard, { state: 'visible' });
  }

  /**
   * Check if results page is empty
   */
  async isResultsEmpty(): Promise<boolean> {
    const count = await this.getResultCount();
    return count === 0;
  }

  /**
   * Get all result titles
   */
  async getAllResultTitles(): Promise<string[]> {
    const cards = await this.locator(this.gapCategoryCard);
    const count = await cards.count();
    const titles: string[] = [];
    
    for (let i = 0; i < count; i++) {
      const card = cards.nth(i);
      const title = await card.locator(this.resultTitle).textContent();
      if (title) {
        titles.push(title);
      }
    }
    
    return titles;
  }
}
