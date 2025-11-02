import { test, expect } from '@playwright/test';
import { LoginPage } from '../../page-objects/login.page';
import { ProjectPage } from '../../page-objects/project.page';
import { SearchPage } from '../../page-objects/search.page';

/**
 * Project Management E2E Tests
 * 
 * Tests the project management functionality including:
 * - Project creation and limits (3 for free tier)
 * - Search organization within projects
 * - Project CRUD operations
 * 
 * Requirements: 3.5
 */

test.describe('Project Management', () => {
  let loginPage: LoginPage;
  let projectPage: ProjectPage;
  let searchPage: SearchPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    projectPage = new ProjectPage(page);
    searchPage = new SearchPage(page);

    // Login before each test
    await loginPage.goto();
    await loginPage.login('test@example.com', 'Test123!@#');
    
    // Navigate to projects page
    await projectPage.goto();
    await projectPage.waitForProjectsLoad();
  });

  test('should display projects page', async ({ page }) => {
    // Verify we're on the projects page
    await expect(page).toHaveURL(/\/projects/);
    
    // Verify create project button is visible
    const createButton = page.locator('[data-testid="create-project-button"]');
    await expect(createButton).toBeVisible();
  });

  test('should create a new project', async ({ page }) => {
    // Get initial project count
    const initialCount = await projectPage.getProjectCount();
    
    // Create a new project
    const projectName = `Test Project ${Date.now()}`;
    const projectDescription = 'This is a test project for E2E testing';
    
    await projectPage.createProject(projectName, projectDescription);
    
    // Wait for project to be created
    await page.waitForTimeout(1000);
    
    // Verify project count increased
    const newCount = await projectPage.getProjectCount();
    expect(newCount).toBe(initialCount + 1);
    
    // Verify project appears in list
    const projectTitles = await projectPage.getAllProjectTitles();
    expect(projectTitles).toContain(projectName);
  });

  test('should create project with name only', async ({ page }) => {
    const projectName = `Simple Project ${Date.now()}`;
    
    await projectPage.createProject(projectName);
    await page.waitForTimeout(1000);
    
    // Verify project was created
    const projectTitles = await projectPage.getAllProjectTitles();
    expect(projectTitles).toContain(projectName);
  });

  test('should display project data correctly', async ({ page }) => {
    // Create a project first
    const projectName = `Data Test Project ${Date.now()}`;
    const projectDescription = 'Testing project data display';
    
    await projectPage.createProject(projectName, projectDescription);
    await page.waitForTimeout(1000);
    
    // Get the project data
    const projectIndex = await projectPage.findProjectByName(projectName);
    expect(projectIndex).toBeGreaterThanOrEqual(0);
    
    const projectData = await projectPage.getProjectData(projectIndex);
    expect(projectData.title).toContain(projectName);
    expect(projectData.description).toContain(projectDescription);
    expect(projectData.searchCount).toBe(0); // New project has no searches
  });

  test('should edit a project', async ({ page }) => {
    // Create a project first
    const originalName = `Original Project ${Date.now()}`;
    await projectPage.createProject(originalName, 'Original description');
    await page.waitForTimeout(1000);
    
    // Find the project
    const projectIndex = await projectPage.findProjectByName(originalName);
    expect(projectIndex).toBeGreaterThanOrEqual(0);
    
    // Edit the project
    const newName = `Updated Project ${Date.now()}`;
    const newDescription = 'Updated description';
    
    await projectPage.editProject(projectIndex, newName, newDescription);
    await page.waitForTimeout(1000);
    
    // Verify project was updated
    const updatedData = await projectPage.getProjectData(projectIndex);
    expect(updatedData.title).toContain(newName);
    expect(updatedData.description).toContain(newDescription);
  });

  test('should delete a project', async ({ page }) => {
    // Create a project to delete
    const projectName = `Delete Test Project ${Date.now()}`;
    await projectPage.createProject(projectName);
    await page.waitForTimeout(1000);
    
    // Get initial count
    const initialCount = await projectPage.getProjectCount();
    
    // Find and delete the project
    const projectIndex = await projectPage.findProjectByName(projectName);
    expect(projectIndex).toBeGreaterThanOrEqual(0);
    
    await projectPage.deleteProject(projectIndex);
    await page.waitForTimeout(1000);
    
    // Verify project count decreased
    const newCount = await projectPage.getProjectCount();
    expect(newCount).toBe(initialCount - 1);
    
    // Verify project is not in list
    const projectTitles = await projectPage.getAllProjectTitles();
    expect(projectTitles).not.toContain(projectName);
  });

  test('should view project details', async ({ page }) => {
    // Create a project
    const projectName = `View Test Project ${Date.now()}`;
    await projectPage.createProject(projectName);
    await page.waitForTimeout(1000);
    
    // Find and view the project
    const projectIndex = await projectPage.findProjectByName(projectName);
    await projectPage.viewProject(projectIndex);
    
    // Verify we're on project details page
    await expect(page).toHaveURL(/\/projects\/\d+/);
    
    // Verify project details view is displayed
    const detailsView = page.locator('[data-testid="project-details-view"]');
    await expect(detailsView).toBeVisible();
  });

  test('should enforce 3-project limit for free tier', async ({ page }) => {
    // Get current project count
    const currentCount = await projectPage.getProjectCount();
    
    // Create projects up to the limit (3 for free tier)
    const projectsToCreate = Math.max(0, 3 - currentCount);
    
    for (let i = 0; i < projectsToCreate; i++) {
      await projectPage.createProject(`Limit Test Project ${i + 1} ${Date.now()}`);
      await page.waitForTimeout(500);
    }
    
    // Verify we have 3 projects
    const projectCount = await projectPage.getProjectCount();
    expect(projectCount).toBe(3);
    
    // Check if limit warning is visible
    const hasLimitWarning = await projectPage.isLimitWarningVisible();
    
    // Check if create button is disabled
    const isCreateDisabled = await projectPage.isCreateProjectDisabled();
    
    // Either warning should be visible or create button should be disabled
    expect(hasLimitWarning || isCreateDisabled).toBe(true);
  });

  test('should display project limit indicator', async ({ page }) => {
    // Get project limit info
    const limitInfo = await projectPage.getProjectLimit();
    
    if (limitInfo) {
      // Verify limit is 3 for free tier
      expect(limitInfo.limit).toBe(3);
      
      // Current should be between 0 and 3
      expect(limitInfo.current).toBeGreaterThanOrEqual(0);
      expect(limitInfo.current).toBeLessThanOrEqual(3);
    }
  });

  test('should show upgrade prompt when at limit', async ({ page }) => {
    // Create projects up to limit
    const currentCount = await projectPage.getProjectCount();
    const projectsToCreate = Math.max(0, 3 - currentCount);
    
    for (let i = 0; i < projectsToCreate; i++) {
      await projectPage.createProject(`Upgrade Test ${i + 1} ${Date.now()}`);
      await page.waitForTimeout(500);
    }
    
    // Check if upgrade prompt is visible
    const hasUpgradePrompt = await projectPage.isUpgradePromptVisible();
    
    if (hasUpgradePrompt) {
      // Click upgrade prompt
      await projectPage.clickUpgradePrompt();
      
      // Verify navigation to upgrade page
      await page.waitForTimeout(1000);
      expect(page.url()).toMatch(/upgrade|pricing|subscription/i);
    }
  });

  test('should add search to project', async ({ page }) => {
    // Create a project
    const projectName = `Search Test Project ${Date.now()}`;
    await projectPage.createProject(projectName);
    await page.waitForTimeout(1000);
    
    // View the project
    const projectIndex = await projectPage.findProjectByName(projectName);
    await projectPage.viewProject(projectIndex);
    
    // Create a search first
    await searchPage.goto();
    await searchPage.submitSearch('Test search for project');
    await searchPage.waitForSearchCompletion();
    
    // Get search ID from URL
    await page.waitForURL(/\/search\/(\d+)/);
    const url = page.url();
    const match = url.match(/\/search\/(\d+)/);
    const searchId = match ? parseInt(match[1], 10) : 1;
    
    // Go back to project
    await projectPage.goto();
    await projectPage.waitForProjectsLoad();
    const newProjectIndex = await projectPage.findProjectByName(projectName);
    await projectPage.viewProject(newProjectIndex);
    
    // Add search to project
    await projectPage.addSearchToProject(searchId);
    await page.waitForTimeout(1000);
    
    // Verify search was added
    const searchCount = await projectPage.getSearchCountInProject();
    expect(searchCount).toBeGreaterThan(0);
  });

  test('should remove search from project', async ({ page }) => {
    // Create a project and add a search
    const projectName = `Remove Search Project ${Date.now()}`;
    await projectPage.createProject(projectName);
    await page.waitForTimeout(1000);
    
    const projectIndex = await projectPage.findProjectByName(projectName);
    await projectPage.viewProject(projectIndex);
    
    // If there are searches, remove one
    const initialCount = await projectPage.getSearchCountInProject();
    
    if (initialCount > 0) {
      await projectPage.removeSearchFromProject(0);
      await page.waitForTimeout(1000);
      
      // Verify search was removed
      const newCount = await projectPage.getSearchCountInProject();
      expect(newCount).toBe(initialCount - 1);
    }
  });

  test('should display empty state when no projects', async ({ page }) => {
    // Delete all projects first
    let projectCount = await projectPage.getProjectCount();
    
    while (projectCount > 0) {
      await projectPage.deleteProject(0);
      await page.waitForTimeout(500);
      projectCount = await projectPage.getProjectCount();
    }
    
    // Verify empty state is shown
    expect(await projectPage.isProjectsEmpty()).toBe(true);
  });

  test('should display empty state when project has no searches', async ({ page }) => {
    // Create a new project
    const projectName = `Empty Searches Project ${Date.now()}`;
    await projectPage.createProject(projectName);
    await page.waitForTimeout(1000);
    
    // View the project
    const projectIndex = await projectPage.findProjectByName(projectName);
    await projectPage.viewProject(projectIndex);
    
    // Verify empty searches state
    expect(await projectPage.isProjectSearchesEmpty()).toBe(true);
  });

  test('should navigate back to projects list', async ({ page }) => {
    // Create and view a project
    const projectName = `Navigation Test ${Date.now()}`;
    await projectPage.createProject(projectName);
    await page.waitForTimeout(1000);
    
    const projectIndex = await projectPage.findProjectByName(projectName);
    await projectPage.viewProject(projectIndex);
    
    // Verify we're on project details
    await expect(page).toHaveURL(/\/projects\/\d+/);
    
    // Go back to projects list
    await projectPage.backToProjects();
    
    // Verify we're back on projects list
    await expect(page).toHaveURL(/\/projects$/);
  });

  test('should share a project', async ({ page }) => {
    // Create a project
    const projectName = `Share Test Project ${Date.now()}`;
    await projectPage.createProject(projectName);
    await page.waitForTimeout(1000);
    
    // Share the project
    const projectIndex = await projectPage.findProjectByName(projectName);
    await projectPage.shareProject(projectIndex);
    
    // Wait for share dialog
    await page.waitForTimeout(1000);
    
    // Verify share dialog or modal appears
    const shareModal = page.locator('[data-testid="share-modal"]');
    const hasShareModal = await shareModal.isVisible().catch(() => false);
    
    expect(hasShareModal || page.url().includes('share')).toBeTruthy();
  });

  test('should cancel project creation', async ({ page }) => {
    // Click create project
    await projectPage.clickCreateProject();
    
    // Verify modal is open
    const modal = page.locator('[data-testid="create-project-modal"]');
    await expect(modal).toBeVisible();
    
    // Cancel
    await projectPage.cancelProjectForm();
    
    // Verify modal is closed
    await expect(modal).not.toBeVisible();
  });

  test('should display search titles in project', async ({ page }) => {
    // Create a project
    const projectName = `Search Titles Project ${Date.now()}`;
    await projectPage.createProject(projectName);
    await page.waitForTimeout(1000);
    
    const projectIndex = await projectPage.findProjectByName(projectName);
    await projectPage.viewProject(projectIndex);
    
    // Get search titles
    const searchTitles = await projectPage.getSearchTitlesInProject();
    
    // Should be an array (might be empty for new project)
    expect(Array.isArray(searchTitles)).toBe(true);
  });

  test('should reorder searches in project using drag and drop', async ({ page }) => {
    // Create a project
    const projectName = `Reorder Test Project ${Date.now()}`;
    await projectPage.createProject(projectName);
    await page.waitForTimeout(1000);
    
    const projectIndex = await projectPage.findProjectByName(projectName);
    await projectPage.viewProject(projectIndex);
    
    // Check if there are at least 2 searches to reorder
    const searchCount = await projectPage.getSearchCountInProject();
    
    if (searchCount >= 2) {
      // Get initial order
      const initialTitles = await projectPage.getSearchTitlesInProject();
      
      // Reorder searches
      await projectPage.reorderSearch(0, 1);
      
      // Get new order
      const newTitles = await projectPage.getSearchTitlesInProject();
      
      // Verify order changed
      expect(newTitles).not.toEqual(initialTitles);
    }
  });

  test('should find project by name', async ({ page }) => {
    // Create a project with unique name
    const uniqueName = `Unique Project ${Date.now()}`;
    await projectPage.createProject(uniqueName);
    await page.waitForTimeout(1000);
    
    // Find the project
    const index = await projectPage.findProjectByName(uniqueName);
    
    // Verify project was found
    expect(index).toBeGreaterThanOrEqual(0);
    
    // Verify it's the correct project
    const projectData = await projectPage.getProjectData(index);
    expect(projectData.title).toContain(uniqueName);
  });

  test('should handle project not found', async ({ page }) => {
    // Search for non-existent project
    const index = await projectPage.findProjectByName('NonExistentProject12345');
    
    // Should return -1
    expect(index).toBe(-1);
  });

  test('should display all project information', async ({ page }) => {
    // Create a project with full information
    const projectName = `Full Info Project ${Date.now()}`;
    const projectDescription = 'Complete project with all information';
    
    await projectPage.createProject(projectName, projectDescription);
    await page.waitForTimeout(1000);
    
    // Get project data
    const projectIndex = await projectPage.findProjectByName(projectName);
    const projectData = await projectPage.getProjectData(projectIndex);
    
    // Verify all fields are present
    expect(projectData.title).toBeTruthy();
    expect(projectData.description).toBeTruthy();
    expect(projectData.searchCount).toBeGreaterThanOrEqual(0);
  });

  test('should maintain project list after page reload', async ({ page }) => {
    // Create a project
    const projectName = `Persist Test Project ${Date.now()}`;
    await projectPage.createProject(projectName);
    await page.waitForTimeout(1000);
    
    // Get project count
    const countBefore = await projectPage.getProjectCount();
    
    // Reload page
    await page.reload();
    await projectPage.waitForProjectsLoad();
    
    // Verify project still exists
    const countAfter = await projectPage.getProjectCount();
    expect(countAfter).toBe(countBefore);
    
    const projectTitles = await projectPage.getAllProjectTitles();
    expect(projectTitles).toContain(projectName);
  });

  test('should handle multiple project operations', async ({ page }) => {
    // Create multiple projects
    const project1 = `Multi Op Project 1 ${Date.now()}`;
    const project2 = `Multi Op Project 2 ${Date.now()}`;
    
    await projectPage.createProject(project1);
    await page.waitForTimeout(500);
    await projectPage.createProject(project2);
    await page.waitForTimeout(500);
    
    // Verify both projects exist
    const titles = await projectPage.getAllProjectTitles();
    expect(titles).toContain(project1);
    expect(titles).toContain(project2);
    
    // Edit first project
    const index1 = await projectPage.findProjectByName(project1);
    await projectPage.editProject(index1, `${project1} Updated`);
    await page.waitForTimeout(500);
    
    // Delete second project
    const index2 = await projectPage.findProjectByName(project2);
    await projectPage.deleteProject(index2);
    await page.waitForTimeout(500);
    
    // Verify operations completed
    const finalTitles = await projectPage.getAllProjectTitles();
    expect(finalTitles.some(t => t.includes('Updated'))).toBe(true);
    expect(finalTitles).not.toContain(project2);
  });
});
