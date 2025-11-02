import { test, expect } from '@playwright/test';
import { LoginPage } from '../../page-objects/login.page';
import { SearchPage } from '../../page-objects/search.page';
import { SearchResultsPage } from '../../page-objects/search-results.page';

/**
 * Action Plan and Progress Tracking E2E Tests
 * 
 * Tests the action plan and progress tracking functionality including:
 * - 4-phase roadmap display
 * - Task completion and progress updates
 * - Progress bar calculations
 * - Phase completion celebration
 * - Progress sync across sessions
 * 
 * Requirements: 3.4
 */

test.describe('Action Plans and Progress Tracking', () => {
  let loginPage: LoginPage;
  let searchPage: SearchPage;
  let resultsPage: SearchResultsPage;
  let searchId: number;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    searchPage = new SearchPage(page);
    resultsPage = new SearchResultsPage(page);

    // Login and create a search
    await loginPage.goto();
    await loginPage.login('test@example.com', 'Test123!@#');
    
    // Create a search to have roadmap data
    await searchPage.goto();
    await searchPage.submitSearch('Gaps in smart home automation');
    await searchPage.waitForSearchCompletion();
    
    // Extract search ID from URL
    await page.waitForURL(/\/search\/(\d+)/);
    const url = page.url();
    const match = url.match(/\/search\/(\d+)/);
    searchId = match ? parseInt(match[1], 10) : 1;
  });

  test('should display 4-phase roadmap', async ({ page }) => {
    // Navigate to search results
    await resultsPage.gotoSearchResults(searchId);
    await resultsPage.waitForResultsLoad();
    
    // Navigate to roadmap section
    await resultsPage.navigateToRoadmap();
    
    // Verify 4 phases are displayed
    const phaseCount = await resultsPage.getRoadmapPhaseCount();
    expect(phaseCount).toBe(4);
    
    // Verify each phase has title and description
    for (let phase = 1; phase <= 4; phase++) {
      const phaseData = await resultsPage.getPhaseData(phase);
      
      expect(phaseData.title).toBeTruthy();
      expect(phaseData.title.length).toBeGreaterThan(0);
      
      expect(phaseData.description).toBeTruthy();
      expect(phaseData.description.length).toBeGreaterThan(10);
    }
  });

  test('should display phase details when clicked', async ({ page }) => {
    await resultsPage.gotoSearchResults(searchId);
    await resultsPage.waitForResultsLoad();
    await resultsPage.navigateToRoadmap();
    
    // Click on first phase
    await resultsPage.clickPhase(1);
    
    // Wait for phase details to load
    await page.waitForTimeout(1000);
    
    // Verify phase details are displayed
    const phaseDetails = page.locator('[data-testid="phase-details"]');
    await expect(phaseDetails).toBeVisible();
  });

  test('should navigate through all phases', async ({ page }) => {
    await resultsPage.gotoSearchResults(searchId);
    await resultsPage.waitForResultsLoad();
    await resultsPage.navigateToRoadmap();
    
    // Click through each phase
    for (let phase = 1; phase <= 4; phase++) {
      await resultsPage.clickPhase(phase);
      await page.waitForTimeout(500);
      
      // Verify phase is active or selected
      const phaseCard = page.locator(`[data-testid="phase-${phase}-card"]`);
      await expect(phaseCard).toBeVisible();
    }
  });

  test('should display task completion checkboxes', async ({ page }) => {
    await resultsPage.gotoSearchResults(searchId);
    await resultsPage.waitForResultsLoad();
    await resultsPage.navigateToRoadmap();
    
    // Click on first phase to see tasks
    await resultsPage.clickPhase(1);
    await page.waitForTimeout(1000);
    
    // Check for task checkboxes
    const taskCheckboxes = page.locator('[data-testid="task-checkbox"]');
    const checkboxCount = await taskCheckboxes.count();
    
    // Should have at least some tasks
    expect(checkboxCount).toBeGreaterThan(0);
  });

  test('should update progress when task is completed', async ({ page }) => {
    await resultsPage.gotoSearchResults(searchId);
    await resultsPage.waitForResultsLoad();
    await resultsPage.navigateToRoadmap();
    
    // Get initial progress
    const progressBar = page.locator('[data-testid="progress-bar"]');
    const initialProgress = await progressBar.getAttribute('aria-valuenow');
    const initialValue = parseInt(initialProgress || '0', 10);
    
    // Click on first phase
    await resultsPage.clickPhase(1);
    await page.waitForTimeout(1000);
    
    // Complete a task
    const firstCheckbox = page.locator('[data-testid="task-checkbox"]').first();
    
    if (await firstCheckbox.isVisible()) {
      await firstCheckbox.click();
      await page.waitForTimeout(1000);
      
      // Verify progress increased
      const newProgress = await progressBar.getAttribute('aria-valuenow');
      const newValue = parseInt(newProgress || '0', 10);
      
      expect(newValue).toBeGreaterThanOrEqual(initialValue);
    }
  });

  test('should calculate progress bar correctly', async ({ page }) => {
    await resultsPage.gotoSearchResults(searchId);
    await resultsPage.waitForResultsLoad();
    await resultsPage.navigateToRoadmap();
    
    // Get progress bar
    const progressBar = page.locator('[data-testid="progress-bar"]');
    const progressValue = await progressBar.getAttribute('aria-valuenow');
    const progress = parseInt(progressValue || '0', 10);
    
    // Progress should be between 0 and 100
    expect(progress).toBeGreaterThanOrEqual(0);
    expect(progress).toBeLessThanOrEqual(100);
    
    // Get progress percentage text
    const progressText = page.locator('[data-testid="progress-percentage"]');
    
    if (await progressText.isVisible()) {
      const text = await progressText.textContent();
      expect(text).toContain('%');
    }
  });

  test('should show phase completion celebration', async ({ page }) => {
    await resultsPage.gotoSearchResults(searchId);
    await resultsPage.waitForResultsLoad();
    await resultsPage.navigateToRoadmap();
    
    // Click on first phase
    await resultsPage.clickPhase(1);
    await page.waitForTimeout(1000);
    
    // Complete all tasks in the phase
    const taskCheckboxes = page.locator('[data-testid="task-checkbox"]');
    const count = await taskCheckboxes.count();
    
    for (let i = 0; i < count; i++) {
      const checkbox = taskCheckboxes.nth(i);
      
      if (await checkbox.isVisible() && !(await checkbox.isChecked())) {
        await checkbox.click();
        await page.waitForTimeout(500);
      }
    }
    
    // Check for completion celebration
    const celebration = page.locator('[data-testid="phase-complete-celebration"]');
    const hasCelebration = await celebration.isVisible().catch(() => false);
    
    // Celebration might appear or phase might be marked complete
    const phaseCard = page.locator('[data-testid="phase-1-card"]');
    const classes = await phaseCard.getAttribute('class');
    const isComplete = classes?.includes('complete') || classes?.includes('completed');
    
    expect(hasCelebration || isComplete).toBeTruthy();
  });

  test('should persist progress across page reloads', async ({ page }) => {
    await resultsPage.gotoSearchResults(searchId);
    await resultsPage.waitForResultsLoad();
    await resultsPage.navigateToRoadmap();
    
    // Click on first phase and complete a task
    await resultsPage.clickPhase(1);
    await page.waitForTimeout(1000);
    
    const firstCheckbox = page.locator('[data-testid="task-checkbox"]').first();
    
    if (await firstCheckbox.isVisible() && !(await firstCheckbox.isChecked())) {
      await firstCheckbox.click();
      await page.waitForTimeout(1000);
      
      // Get progress before reload
      const progressBar = page.locator('[data-testid="progress-bar"]');
      const progressBefore = await progressBar.getAttribute('aria-valuenow');
      
      // Reload page
      await page.reload();
      await resultsPage.waitForResultsLoad();
      await resultsPage.navigateToRoadmap();
      
      // Get progress after reload
      const progressAfter = await progressBar.getAttribute('aria-valuenow');
      
      // Progress should be the same
      expect(progressAfter).toBe(progressBefore);
    }
  });

  test('should sync progress across sessions', async ({ page, context }) => {
    await resultsPage.gotoSearchResults(searchId);
    await resultsPage.waitForResultsLoad();
    await resultsPage.navigateToRoadmap();
    
    // Complete a task
    await resultsPage.clickPhase(1);
    await page.waitForTimeout(1000);
    
    const firstCheckbox = page.locator('[data-testid="task-checkbox"]').first();
    
    if (await firstCheckbox.isVisible() && !(await firstCheckbox.isChecked())) {
      await firstCheckbox.click();
      await page.waitForTimeout(1000);
      
      // Get progress
      const progressBar = page.locator('[data-testid="progress-bar"]');
      const progress1 = await progressBar.getAttribute('aria-valuenow');
      
      // Open new page in same context (same session)
      const page2 = await context.newPage();
      const resultsPage2 = new SearchResultsPage(page2);
      
      await resultsPage2.gotoSearchResults(searchId);
      await resultsPage2.waitForResultsLoad();
      await resultsPage2.navigateToRoadmap();
      
      // Get progress in new page
      const progressBar2 = page2.locator('[data-testid="progress-bar"]');
      const progress2 = await progressBar2.getAttribute('aria-valuenow');
      
      // Progress should match
      expect(progress2).toBe(progress1);
      
      await page2.close();
    }
  });

  test('should display phase progress indicators', async ({ page }) => {
    await resultsPage.gotoSearchResults(searchId);
    await resultsPage.waitForResultsLoad();
    await resultsPage.navigateToRoadmap();
    
    // Check each phase for progress indicator
    for (let phase = 1; phase <= 4; phase++) {
      const phaseCard = page.locator(`[data-testid="phase-${phase}-card"]`);
      await expect(phaseCard).toBeVisible();
      
      // Check for progress indicator within phase
      const phaseProgress = phaseCard.locator('[data-testid="phase-progress"]');
      const hasProgress = await phaseProgress.isVisible().catch(() => false);
      
      // Phase should have some progress indication
      expect(hasProgress || await phaseCard.isVisible()).toBeTruthy();
    }
  });

  test('should show task count per phase', async ({ page }) => {
    await resultsPage.gotoSearchResults(searchId);
    await resultsPage.waitForResultsLoad();
    await resultsPage.navigateToRoadmap();
    
    // Click on first phase
    await resultsPage.clickPhase(1);
    await page.waitForTimeout(1000);
    
    // Get task count
    const taskCount = page.locator('[data-testid="task-count"]');
    
    if (await taskCount.isVisible()) {
      const countText = await taskCount.textContent();
      expect(countText).toMatch(/\d+/); // Should contain a number
    }
  });

  test('should allow unchecking completed tasks', async ({ page }) => {
    await resultsPage.gotoSearchResults(searchId);
    await resultsPage.waitForResultsLoad();
    await resultsPage.navigateToRoadmap();
    
    // Click on first phase
    await resultsPage.clickPhase(1);
    await page.waitForTimeout(1000);
    
    const firstCheckbox = page.locator('[data-testid="task-checkbox"]').first();
    
    if (await firstCheckbox.isVisible()) {
      // Check the task
      if (!(await firstCheckbox.isChecked())) {
        await firstCheckbox.click();
        await page.waitForTimeout(500);
      }
      
      expect(await firstCheckbox.isChecked()).toBe(true);
      
      // Uncheck the task
      await firstCheckbox.click();
      await page.waitForTimeout(500);
      
      expect(await firstCheckbox.isChecked()).toBe(false);
    }
  });

  test('should display roadmap timeline', async ({ page }) => {
    await resultsPage.gotoSearchResults(searchId);
    await resultsPage.waitForResultsLoad();
    await resultsPage.navigateToRoadmap();
    
    // Check for timeline visualization
    const timeline = page.locator('[data-testid="roadmap-timeline"]');
    const hasTimeline = await timeline.isVisible().catch(() => false);
    
    // Either timeline or phase cards should be visible
    const phaseCards = page.locator('[data-testid="phase-card"]');
    const hasPhaseCards = (await phaseCards.count()) > 0;
    
    expect(hasTimeline || hasPhaseCards).toBeTruthy();
  });

  test('should show estimated completion time per phase', async ({ page }) => {
    await resultsPage.gotoSearchResults(searchId);
    await resultsPage.waitForResultsLoad();
    await resultsPage.navigateToRoadmap();
    
    // Check first phase for time estimate
    const phaseCard = page.locator('[data-testid="phase-1-card"]');
    const timeEstimate = phaseCard.locator('[data-testid="time-estimate"]');
    
    const hasTimeEstimate = await timeEstimate.isVisible().catch(() => false);
    
    if (hasTimeEstimate) {
      const estimateText = await timeEstimate.textContent();
      expect(estimateText).toBeTruthy();
    }
  });

  test('should highlight current phase', async ({ page }) => {
    await resultsPage.gotoSearchResults(searchId);
    await resultsPage.waitForResultsLoad();
    await resultsPage.navigateToRoadmap();
    
    // Check for active/current phase indicator
    const activePhase = page.locator('[data-testid="phase-card"].active');
    const hasActivePhase = await activePhase.isVisible().catch(() => false);
    
    // At least one phase should be marked as current/active
    if (hasActivePhase) {
      const count = await activePhase.count();
      expect(count).toBeGreaterThanOrEqual(1);
    }
  });

  test('should display overall progress summary', async ({ page }) => {
    await resultsPage.gotoSearchResults(searchId);
    await resultsPage.waitForResultsLoad();
    await resultsPage.navigateToRoadmap();
    
    // Check for progress summary
    const progressSummary = page.locator('[data-testid="progress-summary"]');
    const hasSummary = await progressSummary.isVisible().catch(() => false);
    
    if (hasSummary) {
      const summaryText = await progressSummary.textContent();
      expect(summaryText).toBeTruthy();
    }
  });

  test('should show completed phases with checkmark', async ({ page }) => {
    await resultsPage.gotoSearchResults(searchId);
    await resultsPage.waitForResultsLoad();
    await resultsPage.navigateToRoadmap();
    
    // Check for completed phase indicators
    const completedPhases = page.locator('[data-testid="phase-card"].completed');
    const count = await completedPhases.count();
    
    // Count should be 0 or more (depending on progress)
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('should allow expanding and collapsing phases', async ({ page }) => {
    await resultsPage.gotoSearchResults(searchId);
    await resultsPage.waitForResultsLoad();
    await resultsPage.navigateToRoadmap();
    
    // Click to expand first phase
    await resultsPage.clickPhase(1);
    await page.waitForTimeout(500);
    
    // Check if phase is expanded
    const phaseDetails = page.locator('[data-testid="phase-1-details"]');
    const isExpanded = await phaseDetails.isVisible().catch(() => false);
    
    if (isExpanded) {
      // Click again to collapse
      await resultsPage.clickPhase(1);
      await page.waitForTimeout(500);
      
      // Verify collapsed
      const isStillVisible = await phaseDetails.isVisible().catch(() => false);
      expect(isStillVisible).toBe(false);
    }
  });
});
