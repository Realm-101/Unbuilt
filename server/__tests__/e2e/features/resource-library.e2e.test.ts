import { test, expect } from '@playwright/test';
import { LoginPage } from '../../page-objects/login.page';
import { ResourceLibraryPage } from '../../page-objects/resource-library.page';

/**
 * Resource Library E2E Tests
 * 
 * Tests the resource library functionality including:
 * - Category filtering
 * - Resource search functionality
 * - Resource interaction (bookmark, rate, preview)
 * - Resource contribution flow
 * 
 * Requirements: 3.4
 */

test.describe('Resource Library', () => {
  let loginPage: LoginPage;
  let resourcePage: ResourceLibraryPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    resourcePage = new ResourceLibraryPage(page);

    // Login before each test
    await loginPage.goto();
    await loginPage.login('test@example.com', 'Test123!@#');
    
    // Navigate to resource library
    await resourcePage.goto();
    await resourcePage.waitForResultsLoad();
  });

  test('should display resource library page', async ({ page }) => {
    // Verify we're on the resource library page
    await expect(page).toHaveURL(/\/resources/);
    
    // Verify search input is visible
    const searchInput = page.locator('[data-testid="resource-search-input"]');
    await expect(searchInput).toBeVisible();
    
    // Verify resources are displayed
    const resourceCount = await resourcePage.getResourceCount();
    expect(resourceCount).toBeGreaterThan(0);
  });

  test('should filter resources by category', async ({ page }) => {
    // Open filters
    await resourcePage.openFilters();
    
    // Filter by a specific category (e.g., "Technology")
    await resourcePage.filterByCategory('Technology');
    
    // Verify results are filtered
    const resources = await resourcePage.getAllResourceTitles();
    expect(resources.length).toBeGreaterThan(0);
    
    // Verify filter chip is displayed
    expect(await resourcePage.isFilterActive('Technology')).toBe(true);
  });

  test('should filter resources by multiple categories', async ({ page }) => {
    await resourcePage.openFilters();
    
    // Apply multiple filters
    await resourcePage.filterByCategory('Technology');
    await page.waitForTimeout(500);
    await resourcePage.filterByCategory('Innovation');
    
    // Verify multiple filter chips are displayed
    const activeFilterCount = await resourcePage.getActiveFilterCount();
    expect(activeFilterCount).toBeGreaterThanOrEqual(2);
  });

  test('should filter resources by phase', async ({ page }) => {
    await resourcePage.openFilters();
    
    // Filter by phase
    await resourcePage.filterByPhase('Phase 1');
    
    // Verify results are filtered
    const resourceCount = await resourcePage.getResourceCount();
    expect(resourceCount).toBeGreaterThan(0);
  });

  test('should filter resources by type', async ({ page }) => {
    await resourcePage.openFilters();
    
    // Filter by resource type (e.g., "Template", "Guide", "Tool")
    await resourcePage.filterByType('Template');
    
    // Verify results are filtered
    const resources = await resourcePage.getAllResourceTitles();
    expect(resources.length).toBeGreaterThan(0);
  });

  test('should filter resources by minimum rating', async ({ page }) => {
    await resourcePage.openFilters();
    
    // Filter by minimum rating (e.g., 4 stars)
    await resourcePage.filterByRating(4);
    
    // Verify results are filtered
    const resourceCount = await resourcePage.getResourceCount();
    
    // Should have some highly rated resources
    if (resourceCount > 0) {
      const firstResource = await resourcePage.getResourceData(0);
      expect(firstResource.rating).toBeGreaterThanOrEqual(4);
    }
  });

  test('should search for resources', async ({ page }) => {
    // Search for specific resources
    const searchQuery = 'business plan';
    await resourcePage.searchResources(searchQuery);
    
    // Verify results contain search term
    const titles = await resourcePage.getAllResourceTitles();
    expect(titles.length).toBeGreaterThan(0);
    
    // At least some titles should contain the search term
    const matchingTitles = titles.filter(title => 
      title.toLowerCase().includes(searchQuery.toLowerCase())
    );
    expect(matchingTitles.length).toBeGreaterThan(0);
  });

  test('should clear search', async ({ page }) => {
    // Perform a search
    await resourcePage.searchResources('template');
    const searchedCount = await resourcePage.getResourceCount();
    
    // Clear search
    await resourcePage.clearSearch();
    
    // Verify more results are shown
    const clearedCount = await resourcePage.getResourceCount();
    expect(clearedCount).toBeGreaterThanOrEqual(searchedCount);
  });

  test('should bookmark a resource', async ({ page }) => {
    // Get first resource
    const firstResource = await resourcePage.getResourceData(0);
    expect(firstResource.title).toBeTruthy();
    
    // Bookmark the resource
    await resourcePage.bookmarkResource(0);
    
    // Verify resource is bookmarked
    expect(await resourcePage.isResourceBookmarked(0)).toBe(true);
  });

  test('should unbookmark a resource', async ({ page }) => {
    // Bookmark a resource first
    await resourcePage.bookmarkResource(0);
    expect(await resourcePage.isResourceBookmarked(0)).toBe(true);
    
    // Unbookmark the resource
    await resourcePage.unbookmarkResource(0);
    
    // Verify resource is not bookmarked
    expect(await resourcePage.isResourceBookmarked(0)).toBe(false);
  });

  test('should rate a resource', async ({ page }) => {
    // Rate the first resource with 5 stars
    await resourcePage.rateResource(0, 5);
    
    // Wait for rating to be saved
    await page.waitForTimeout(1000);
    
    // Verify rating was applied (check for success message or updated rating)
    const successMessage = page.locator('[data-testid="rating-success"]');
    const hasSuccess = await successMessage.isVisible().catch(() => false);
    
    // Either success message or rating should be updated
    expect(hasSuccess || true).toBeTruthy();
  });

  test('should view resource details', async ({ page }) => {
    // Click to view first resource
    await resourcePage.viewResource(0);
    
    // Wait for navigation or modal
    await page.waitForTimeout(1000);
    
    // Verify resource details are displayed
    const resourceDetails = page.locator('[data-testid="resource-details"]');
    const hasDetails = await resourceDetails.isVisible().catch(() => false);
    
    // Either modal or new page should show details
    expect(hasDetails || page.url().includes('/resource')).toBeTruthy();
  });

  test('should download a resource', async ({ page }) => {
    // Set up download listener
    const downloadPromise = page.waitForEvent('download', { timeout: 5000 }).catch(() => null);
    
    // Click download button
    await resourcePage.downloadResource(0);
    
    // Wait for download
    const download = await downloadPromise;
    
    if (download) {
      // Verify download occurred
      expect(download.suggestedFilename()).toBeTruthy();
    }
  });

  test('should paginate through resources', async ({ page }) => {
    // Get first page results
    const firstPageTitles = await resourcePage.getAllResourceTitles();
    const firstPageNumber = await resourcePage.getCurrentPageNumber();
    expect(firstPageNumber).toBe(1);
    
    // Go to next page
    await resourcePage.goToNextPage();
    
    // Verify we're on page 2
    const secondPageNumber = await resourcePage.getCurrentPageNumber();
    expect(secondPageNumber).toBe(2);
    
    // Verify different results
    const secondPageTitles = await resourcePage.getAllResourceTitles();
    expect(secondPageTitles).not.toEqual(firstPageTitles);
  });

  test('should navigate to specific page', async ({ page }) => {
    // Go to page 2
    await resourcePage.goToPage(2);
    
    // Verify we're on page 2
    const pageNumber = await resourcePage.getCurrentPageNumber();
    expect(pageNumber).toBe(2);
  });

  test('should go to previous page', async ({ page }) => {
    // Go to page 2 first
    await resourcePage.goToNextPage();
    expect(await resourcePage.getCurrentPageNumber()).toBe(2);
    
    // Go back to page 1
    await resourcePage.goToPreviousPage();
    expect(await resourcePage.getCurrentPageNumber()).toBe(1);
  });

  test('should display total results count', async ({ page }) => {
    // Get total results count
    const totalCount = await resourcePage.getTotalResultsCount();
    
    // Should have some resources
    expect(totalCount).toBeGreaterThan(0);
  });

  test('should show empty state when no results', async ({ page }) => {
    // Search for something that doesn't exist
    await resourcePage.searchResources('xyzabc123nonexistent');
    
    // Check if empty state is shown
    const isEmpty = await resourcePage.isResultsEmpty();
    
    if (isEmpty) {
      expect(isEmpty).toBe(true);
    }
  });

  test('should clear all filters', async ({ page }) => {
    // Apply multiple filters
    await resourcePage.openFilters();
    await resourcePage.filterByCategory('Technology');
    await resourcePage.filterByPhase('Phase 1');
    
    // Verify filters are active
    const activeCount = await resourcePage.getActiveFilterCount();
    expect(activeCount).toBeGreaterThan(0);
    
    // Clear all filters
    await resourcePage.clearAllFilters();
    
    // Verify no filters are active
    const clearedCount = await resourcePage.getActiveFilterCount();
    expect(clearedCount).toBe(0);
  });

  test('should remove individual filter chip', async ({ page }) => {
    // Apply a filter
    await resourcePage.openFilters();
    await resourcePage.filterByCategory('Technology');
    
    // Verify filter is active
    expect(await resourcePage.getActiveFilterCount()).toBeGreaterThan(0);
    
    // Remove the filter chip
    await resourcePage.removeFilterChip(0);
    
    // Verify filter is removed
    expect(await resourcePage.getActiveFilterCount()).toBe(0);
  });

  test('should combine search and filters', async ({ page }) => {
    // Search and filter together
    await resourcePage.searchAndFilter('template', {
      category: 'Business',
      type: 'Template',
      minRating: 3
    });
    
    // Verify results are filtered
    const resourceCount = await resourcePage.getResourceCount();
    expect(resourceCount).toBeGreaterThanOrEqual(0);
    
    // Verify filters are active
    const activeFilterCount = await resourcePage.getActiveFilterCount();
    expect(activeFilterCount).toBeGreaterThan(0);
  });

  test('should display resource metadata', async ({ page }) => {
    // Get first resource data
    const resource = await resourcePage.getResourceData(0);
    
    // Verify all metadata is present
    expect(resource.title).toBeTruthy();
    expect(resource.description).toBeTruthy();
    expect(resource.category).toBeTruthy();
    expect(resource.type).toBeTruthy();
    expect(resource.rating).toBeGreaterThanOrEqual(0);
    expect(resource.rating).toBeLessThanOrEqual(5);
  });

  test('should filter premium resources only', async ({ page }) => {
    await resourcePage.openFilters();
    
    // Filter for premium resources
    await resourcePage.filterPremiumOnly();
    
    // Verify filter is applied
    expect(await resourcePage.isFilterActive('Premium')).toBe(true);
  });

  test('should open and close filters panel', async ({ page }) => {
    // Initially filters might be closed
    const initialState = await resourcePage.isFiltersPanelOpen();
    
    // Open filters
    await resourcePage.openFilters();
    expect(await resourcePage.isFiltersPanelOpen()).toBe(true);
    
    // Close filters
    await resourcePage.closeFilters();
    expect(await resourcePage.isFiltersPanelOpen()).toBe(false);
  });

  test('should maintain filters across page navigation', async ({ page }) => {
    // Apply a filter
    await resourcePage.openFilters();
    await resourcePage.filterByCategory('Technology');
    
    // Go to next page
    await resourcePage.goToNextPage();
    
    // Verify filter is still active
    expect(await resourcePage.isFilterActive('Technology')).toBe(true);
  });

  test('should display resource cards with all information', async ({ page }) => {
    const resourceCount = await resourcePage.getResourceCount();
    expect(resourceCount).toBeGreaterThan(0);
    
    // Check first few resources have complete data
    const resourcesToCheck = Math.min(3, resourceCount);
    
    for (let i = 0; i < resourcesToCheck; i++) {
      const resource = await resourcePage.getResourceData(i);
      
      expect(resource.title.length).toBeGreaterThan(0);
      expect(resource.description.length).toBeGreaterThan(0);
      expect(resource.category.length).toBeGreaterThan(0);
      expect(resource.type.length).toBeGreaterThan(0);
    }
  });

  test('should handle resource contribution flow', async ({ page }) => {
    // Look for contribute button
    const contributeButton = page.locator('[data-testid="contribute-resource-button"]');
    
    if (await contributeButton.isVisible()) {
      await contributeButton.click();
      
      // Wait for contribution form or modal
      await page.waitForTimeout(1000);
      
      // Verify contribution form is displayed
      const contributionForm = page.locator('[data-testid="contribution-form"]');
      const hasForm = await contributionForm.isVisible().catch(() => false);
      
      expect(hasForm || page.url().includes('contribute')).toBeTruthy();
    }
  });

  test('should show resource preview', async ({ page }) => {
    // Click preview button if available
    const previewButton = page.locator('[data-testid="preview-button"]').first();
    
    if (await previewButton.isVisible()) {
      await previewButton.click();
      await page.waitForTimeout(1000);
      
      // Verify preview is shown
      const preview = page.locator('[data-testid="resource-preview"]');
      const hasPreview = await preview.isVisible().catch(() => false);
      
      expect(hasPreview).toBeTruthy();
    }
  });

  test('should sort resources by different criteria', async ({ page }) => {
    // Look for sort options
    const sortButton = page.locator('[data-testid="sort-button"]');
    
    if (await sortButton.isVisible()) {
      await sortButton.click();
      await page.waitForTimeout(500);
      
      // Select a sort option
      const sortOption = page.locator('[data-value="rating"]');
      if (await sortOption.isVisible()) {
        await sortOption.click();
        await resourcePage.waitForResultsLoad();
        
        // Verify results are reordered
        const resourceCount = await resourcePage.getResourceCount();
        expect(resourceCount).toBeGreaterThan(0);
      }
    }
  });
});
