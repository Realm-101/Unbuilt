import { Page } from '@playwright/test';
import { BasePage } from './base.page';

/**
 * SearchPage - Handles search creation and progress monitoring
 * 
 * Provides methods for submitting searches, monitoring progress through
 * the 4-phase analysis, and tracking completion.
 * 
 * Example:
 * ```
 * const searchPage = new SearchPage(page);
 * await searchPage.goto();
 * await searchPage.submitSearch('AI-powered healthcare solutions');
 * await searchPage.waitForSearchCompletion();
 * const phase = await searchPage.getCurrentPhase();
 * ```
 */
export class SearchPage extends BasePage {
  // Search input and submission
  private readonly searchInput = '[data-testid="search-input"]';
  private readonly submitButton = '[data-testid="search-submit"]';
  private readonly loadingIndicator = '[data-testid="search-loading"]';
  
  // Progress indicators
  private readonly progressIndicator = '[data-testid="search-progress"]';
  private readonly progressBar = '[data-testid="progress-bar"]';
  private readonly progressPercentage = '[data-testid="progress-percentage"]';
  
  // Phase indicators
  private readonly phaseIndicators = '[data-testid="phase-indicator"]';
  private readonly activePhase = '[data-testid="phase-indicator"].active';
  private readonly completedPhase = '[data-testid="phase-indicator"].completed';
  
  // Phase-specific selectors
  private readonly phase1Indicator = '[data-testid="phase-1-indicator"]';
  private readonly phase2Indicator = '[data-testid="phase-2-indicator"]';
  private readonly phase3Indicator = '[data-testid="phase-3-indicator"]';
  private readonly phase4Indicator = '[data-testid="phase-4-indicator"]';
  
  // Completion indicators
  private readonly searchComplete = '[data-testid="search-complete"]';
  private readonly searchError = '[data-testid="search-error"]';
  private readonly errorMessage = '[data-testid="error-message"]';
  
  // Status messages
  private readonly statusMessage = '[data-testid="status-message"]';
  private readonly phaseDescription = '[data-testid="phase-description"]';

  constructor(page: Page) {
    super(page);
  }

  /**
   * Navigate to the new search page
   */
  async goto(): Promise<void> {
    await super.goto('/search/new');
  }

  /**
   * Submit a search query
   * @param query - The search query to submit
   */
  async submitSearch(query: string): Promise<void> {
    await this.fill(this.searchInput, query);
    await this.click(this.submitButton);
  }

  /**
   * Wait for search to complete
   * @param timeoutMs - Maximum time to wait in milliseconds (default: 180000 = 3 minutes)
   */
  async waitForSearchCompletion(timeoutMs: number = 180000): Promise<void> {
    await this.page.waitForSelector(this.searchComplete, {
      timeout: timeoutMs,
      state: 'visible'
    });
  }

  /**
   * Wait for a specific phase to become active
   * @param phaseNumber - The phase number (1-4)
   * @param timeoutMs - Maximum time to wait in milliseconds
   */
  async waitForPhase(phaseNumber: number, timeoutMs: number = 60000): Promise<void> {
    const phaseSelector = `[data-testid="phase-${phaseNumber}-indicator"].active`;
    await this.page.waitForSelector(phaseSelector, {
      timeout: timeoutMs,
      state: 'visible'
    });
  }

  /**
   * Get the current active phase number
   * @returns The phase number (1-4) or null if no phase is active
   */
  async getCurrentPhase(): Promise<number | null> {
    const activePhaseElement = await this.locator(this.activePhase).first();
    
    if (!(await activePhaseElement.isVisible())) {
      return null;
    }
    
    const phaseText = await activePhaseElement.textContent();
    const match = phaseText?.match(/Phase (\d)/i);
    
    return match ? parseInt(match[1], 10) : null;
  }

  /**
   * Get the current phase name/description
   */
  async getCurrentPhaseName(): Promise<string> {
    const activePhaseElement = await this.locator(this.activePhase).first();
    return await activePhaseElement.textContent() || '';
  }

  /**
   * Get the progress percentage
   * @returns Progress as a number between 0 and 100
   */
  async getProgressPercentage(): Promise<number> {
    const progressElement = await this.locator(this.progressIndicator);
    const ariaValue = await progressElement.getAttribute('aria-valuenow');
    
    if (ariaValue) {
      return parseInt(ariaValue, 10);
    }
    
    // Fallback: try to get from text content
    const progressText = await this.getText(this.progressPercentage);
    const match = progressText.match(/(\d+)%/);
    
    return match ? parseInt(match[1], 10) : 0;
  }

  /**
   * Check if a specific phase is completed
   * @param phaseNumber - The phase number (1-4)
   */
  async isPhaseCompleted(phaseNumber: number): Promise<boolean> {
    const phaseSelector = `[data-testid="phase-${phaseNumber}-indicator"].completed`;
    return await this.locator(phaseSelector).isVisible();
  }

  /**
   * Get the count of completed phases
   */
  async getCompletedPhaseCount(): Promise<number> {
    const completedPhases = await this.locator(this.completedPhase);
    return await completedPhases.count();
  }

  /**
   * Check if the search is loading
   */
  async isSearchLoading(): Promise<boolean> {
    return await this.locator(this.loadingIndicator).isVisible();
  }

  /**
   * Check if the search has completed successfully
   */
  async isSearchComplete(): Promise<boolean> {
    return await this.locator(this.searchComplete).isVisible();
  }

  /**
   * Check if the search has an error
   */
  async hasSearchError(): Promise<boolean> {
    return await this.locator(this.searchError).isVisible();
  }

  /**
   * Get the error message if search failed
   */
  async getErrorMessage(): Promise<string> {
    if (await this.hasSearchError()) {
      return await this.getText(this.errorMessage);
    }
    return '';
  }

  /**
   * Get the current status message
   */
  async getStatusMessage(): Promise<string> {
    return await this.getText(this.statusMessage);
  }

  /**
   * Get the current phase description
   */
  async getPhaseDescription(): Promise<string> {
    return await this.getText(this.phaseDescription);
  }

  /**
   * Check if the submit button is disabled
   */
  async isSubmitButtonDisabled(): Promise<boolean> {
    const button = await this.locator(this.submitButton);
    return await button.isDisabled();
  }

  /**
   * Get the search input value
   */
  async getSearchInputValue(): Promise<string> {
    const input = await this.locator(this.searchInput);
    return await input.inputValue();
  }

  /**
   * Clear the search input
   */
  async clearSearchInput(): Promise<void> {
    await this.locator(this.searchInput).clear();
  }

  /**
   * Wait for all 4 phases to complete
   * @param timeoutMs - Maximum time to wait in milliseconds (default: 180000 = 3 minutes)
   */
  async waitForAllPhasesComplete(timeoutMs: number = 180000): Promise<void> {
    const startTime = Date.now();
    
    for (let phase = 1; phase <= 4; phase++) {
      const remainingTime = timeoutMs - (Date.now() - startTime);
      
      if (remainingTime <= 0) {
        throw new Error(`Timeout waiting for phase ${phase} to complete`);
      }
      
      await this.waitForPhase(phase, Math.min(remainingTime, 60000));
      
      // Wait a bit for phase to complete before checking next
      await this.page.waitForTimeout(1000);
    }
  }

  /**
   * Monitor search progress and return when complete
   * @param onProgressUpdate - Optional callback for progress updates
   * @param timeoutMs - Maximum time to wait in milliseconds
   */
  async monitorSearchProgress(
    onProgressUpdate?: (phase: number, progress: number) => void,
    timeoutMs: number = 180000
  ): Promise<void> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeoutMs) {
      if (await this.isSearchComplete()) {
        return;
      }
      
      if (await this.hasSearchError()) {
        const error = await this.getErrorMessage();
        throw new Error(`Search failed: ${error}`);
      }
      
      if (onProgressUpdate) {
        const phase = await this.getCurrentPhase();
        const progress = await this.getProgressPercentage();
        
        if (phase !== null) {
          onProgressUpdate(phase, progress);
        }
      }
      
      await this.page.waitForTimeout(2000); // Check every 2 seconds
    }
    
    throw new Error('Search did not complete within timeout');
  }
}
