import { Page } from '@playwright/test';
import { BasePage } from './base.page';

/**
 * ProjectPage - Handles project management interactions
 * 
 * Provides methods for creating, editing, and organizing projects,
 * including CRUD operations and drag-and-drop for search organization.
 * 
 * Example:
 * ```
 * const projectPage = new ProjectPage(page);
 * await projectPage.goto();
 * await projectPage.createProject('My Innovation Project');
 * await projectPage.addSearchToProject(0, searchId);
 * ```
 */
export class ProjectPage extends BasePage {
  // Project creation
  private readonly createProjectButton = '[data-testid="create-project-button"]';
  private readonly projectNameInput = '[data-testid="project-name-input"]';
  private readonly projectDescriptionInput = '[data-testid="project-description-input"]';
  private readonly saveProjectButton = '[data-testid="save-project-button"]';
  private readonly cancelProjectButton = '[data-testid="cancel-project-button"]';
  
  // Project list
  private readonly projectCard = '[data-testid="project-card"]';
  private readonly projectTitle = '[data-testid="project-title"]';
  private readonly projectDescription = '[data-testid="project-description"]';
  private readonly projectSearchCount = '[data-testid="project-search-count"]';
  
  // Project actions
  private readonly editProjectButton = '[data-testid="edit-project-button"]';
  private readonly deleteProjectButton = '[data-testid="delete-project-button"]';
  private readonly viewProjectButton = '[data-testid="view-project-button"]';
  private readonly shareProjectButton = '[data-testid="share-project-button"]';
  
  // Project details view
  private readonly projectDetailsView = '[data-testid="project-details-view"]';
  private readonly projectHeader = '[data-testid="project-header"]';
  private readonly backToProjectsButton = '[data-testid="back-to-projects"]';
  
  // Search organization
  private readonly searchList = '[data-testid="search-list"]';
  private readonly searchItem = '[data-testid="search-item"]';
  private readonly addSearchButton = '[data-testid="add-search-button"]';
  private readonly removeSearchButton = '[data-testid="remove-search-button"]';
  private readonly searchSelector = '[data-testid="search-selector"]';
  
  // Drag and drop
  private readonly draggableSearch = '[data-testid="draggable-search"]';
  private readonly dropZone = '[data-testid="drop-zone"]';
  private readonly dragHandle = '[data-testid="drag-handle"]';
  
  // Project limits
  private readonly projectLimit = '[data-testid="project-limit"]';
  private readonly limitWarning = '[data-testid="limit-warning"]';
  private readonly upgradePrompt = '[data-testid="upgrade-prompt"]';
  
  // Modals
  private readonly createProjectModal = '[data-testid="create-project-modal"]';
  private readonly editProjectModal = '[data-testid="edit-project-modal"]';
  private readonly deleteConfirmModal = '[data-testid="delete-confirm-modal"]';
  private readonly confirmDeleteButton = '[data-testid="confirm-delete-button"]';
  
  // Empty states
  private readonly emptyProjectsState = '[data-testid="empty-projects-state"]';
  private readonly emptySearchesState = '[data-testid="empty-searches-state"]';

  constructor(page: Page) {
    super(page);
  }

  /**
   * Navigate to the projects page
   */
  async goto(): Promise<void> {
    await super.goto('/projects');
  }

  /**
   * Navigate to a specific project
   * @param projectId - The ID of the project
   */
  async gotoProject(projectId: number): Promise<void> {
    await super.goto(`/projects/${projectId}`);
  }

  /**
   * Click the create project button
   */
  async clickCreateProject(): Promise<void> {
    await this.click(this.createProjectButton);
    await this.page.waitForSelector(this.createProjectModal, { state: 'visible' });
  }

  /**
   * Create a new project
   * @param name - Project name
   * @param description - Optional project description
   */
  async createProject(name: string, description?: string): Promise<void> {
    await this.clickCreateProject();
    await this.fill(this.projectNameInput, name);
    
    if (description) {
      await this.fill(this.projectDescriptionInput, description);
    }
    
    await this.click(this.saveProjectButton);
    await this.page.waitForSelector(this.createProjectModal, { state: 'hidden' });
  }

  /**
   * Get the count of projects
   */
  async getProjectCount(): Promise<number> {
    const projects = await this.locator(this.projectCard);
    return await projects.count();
  }

  /**
   * Get project data by index
   * @param index - Zero-based index of the project
   */
  async getProjectData(index: number): Promise<{
    title: string;
    description: string;
    searchCount: number;
  }> {
    const card = await this.locator(this.projectCard).nth(index);
    
    const title = await card.locator(this.projectTitle).textContent() || '';
    const description = await card.locator(this.projectDescription).textContent() || '';
    
    const countText = await card.locator(this.projectSearchCount).textContent() || '0';
    const searchCount = parseInt(countText.match(/(\d+)/)?.[1] || '0', 10);
    
    return { title, description, searchCount };
  }

  /**
   * View a project by index
   * @param index - Zero-based index of the project
   */
  async viewProject(index: number): Promise<void> {
    const card = await this.locator(this.projectCard).nth(index);
    await card.locator(this.viewProjectButton).click();
    await this.page.waitForSelector(this.projectDetailsView, { state: 'visible' });
  }

  /**
   * Edit a project by index
   * @param index - Zero-based index of the project
   * @param newName - New project name
   * @param newDescription - New project description
   */
  async editProject(index: number, newName?: string, newDescription?: string): Promise<void> {
    const card = await this.locator(this.projectCard).nth(index);
    await card.locator(this.editProjectButton).click();
    await this.page.waitForSelector(this.editProjectModal, { state: 'visible' });
    
    if (newName) {
      await this.locator(this.projectNameInput).clear();
      await this.fill(this.projectNameInput, newName);
    }
    
    if (newDescription) {
      await this.locator(this.projectDescriptionInput).clear();
      await this.fill(this.projectDescriptionInput, newDescription);
    }
    
    await this.click(this.saveProjectButton);
    await this.page.waitForSelector(this.editProjectModal, { state: 'hidden' });
  }

  /**
   * Delete a project by index
   * @param index - Zero-based index of the project
   */
  async deleteProject(index: number): Promise<void> {
    const card = await this.locator(this.projectCard).nth(index);
    await card.locator(this.deleteProjectButton).click();
    
    // Wait for confirmation modal
    await this.page.waitForSelector(this.deleteConfirmModal, { state: 'visible' });
    await this.click(this.confirmDeleteButton);
    await this.page.waitForSelector(this.deleteConfirmModal, { state: 'hidden' });
  }

  /**
   * Share a project by index
   * @param index - Zero-based index of the project
   */
  async shareProject(index: number): Promise<void> {
    const card = await this.locator(this.projectCard).nth(index);
    await card.locator(this.shareProjectButton).click();
  }

  /**
   * Get the count of searches in a project
   */
  async getSearchCountInProject(): Promise<number> {
    const searches = await this.locator(this.searchItem);
    return await searches.count();
  }

  /**
   * Add a search to the current project
   * @param searchId - The ID of the search to add
   */
  async addSearchToProject(searchId: number): Promise<void> {
    await this.click(this.addSearchButton);
    
    // Wait for search selector
    await this.page.waitForSelector(this.searchSelector, { state: 'visible' });
    
    // Select the search
    await this.page.click(`${this.searchSelector} [data-search-id="${searchId}"]`);
    
    // Confirm if needed
    const confirmButton = this.page.locator('[data-testid="confirm-add-search"]');
    if (await confirmButton.isVisible()) {
      await confirmButton.click();
    }
  }

  /**
   * Remove a search from the project by index
   * @param index - Zero-based index of the search in the project
   */
  async removeSearchFromProject(index: number): Promise<void> {
    const searchItem = await this.locator(this.searchItem).nth(index);
    await searchItem.locator(this.removeSearchButton).click();
    
    // Confirm if needed
    const confirmButton = this.page.locator('[data-testid="confirm-remove-search"]');
    if (await confirmButton.isVisible()) {
      await confirmButton.click();
    }
  }

  /**
   * Drag and drop a search to reorder
   * @param fromIndex - Source index of the search
   * @param toIndex - Target index for the search
   */
  async reorderSearch(fromIndex: number, toIndex: number): Promise<void> {
    const searches = await this.locator(this.draggableSearch);
    const sourceSearch = searches.nth(fromIndex);
    const targetSearch = searches.nth(toIndex);
    
    // Get bounding boxes
    const sourceBox = await sourceSearch.boundingBox();
    const targetBox = await targetSearch.boundingBox();
    
    if (!sourceBox || !targetBox) {
      throw new Error('Could not get bounding boxes for drag and drop');
    }
    
    // Perform drag and drop
    await this.page.mouse.move(
      sourceBox.x + sourceBox.width / 2,
      sourceBox.y + sourceBox.height / 2
    );
    await this.page.mouse.down();
    
    await this.page.mouse.move(
      targetBox.x + targetBox.width / 2,
      targetBox.y + targetBox.height / 2,
      { steps: 10 }
    );
    
    await this.page.mouse.up();
    
    // Wait for reorder to complete
    await this.page.waitForTimeout(500);
  }

  /**
   * Drag a search using the drag handle
   * @param fromIndex - Source index of the search
   * @param toIndex - Target index for the search
   */
  async dragSearchByHandle(fromIndex: number, toIndex: number): Promise<void> {
    const searches = await this.locator(this.searchItem);
    const sourceSearch = searches.nth(fromIndex);
    const targetSearch = searches.nth(toIndex);
    
    const dragHandle = sourceSearch.locator(this.dragHandle);
    
    // Get bounding boxes
    const handleBox = await dragHandle.boundingBox();
    const targetBox = await targetSearch.boundingBox();
    
    if (!handleBox || !targetBox) {
      throw new Error('Could not get bounding boxes for drag and drop');
    }
    
    // Perform drag and drop using handle
    await this.page.mouse.move(
      handleBox.x + handleBox.width / 2,
      handleBox.y + handleBox.height / 2
    );
    await this.page.mouse.down();
    
    await this.page.mouse.move(
      targetBox.x + targetBox.width / 2,
      targetBox.y + targetBox.height / 2,
      { steps: 10 }
    );
    
    await this.page.mouse.up();
    
    // Wait for reorder to complete
    await this.page.waitForTimeout(500);
  }

  /**
   * Get the project limit information
   * @returns Object with current count and limit, or null if not visible
   */
  async getProjectLimit(): Promise<{ current: number; limit: number } | null> {
    if (!(await this.locator(this.projectLimit).isVisible())) {
      return null;
    }
    
    const limitText = await this.getText(this.projectLimit);
    const match = limitText.match(/(\d+)\s*\/\s*(\d+)/);
    
    if (match) {
      return {
        current: parseInt(match[1], 10),
        limit: parseInt(match[2], 10)
      };
    }
    
    return null;
  }

  /**
   * Check if project limit warning is visible
   */
  async isLimitWarningVisible(): Promise<boolean> {
    return await this.locator(this.limitWarning).isVisible();
  }

  /**
   * Check if upgrade prompt is visible
   */
  async isUpgradePromptVisible(): Promise<boolean> {
    return await this.locator(this.upgradePrompt).isVisible();
  }

  /**
   * Click the upgrade prompt
   */
  async clickUpgradePrompt(): Promise<void> {
    await this.click(this.upgradePrompt);
  }

  /**
   * Check if projects list is empty
   */
  async isProjectsEmpty(): Promise<boolean> {
    return await this.locator(this.emptyProjectsState).isVisible();
  }

  /**
   * Check if project has no searches
   */
  async isProjectSearchesEmpty(): Promise<boolean> {
    return await this.locator(this.emptySearchesState).isVisible();
  }

  /**
   * Go back to projects list from project details
   */
  async backToProjects(): Promise<void> {
    await this.click(this.backToProjectsButton);
  }

  /**
   * Get all project titles
   */
  async getAllProjectTitles(): Promise<string[]> {
    const cards = await this.locator(this.projectCard);
    const count = await cards.count();
    const titles: string[] = [];
    
    for (let i = 0; i < count; i++) {
      const card = cards.nth(i);
      const title = await card.locator(this.projectTitle).textContent();
      if (title) {
        titles.push(title.trim());
      }
    }
    
    return titles;
  }

  /**
   * Search for a project by name
   * @param projectName - The name of the project to find
   * @returns The index of the project or -1 if not found
   */
  async findProjectByName(projectName: string): Promise<number> {
    const titles = await this.getAllProjectTitles();
    return titles.findIndex(title => title.toLowerCase().includes(projectName.toLowerCase()));
  }

  /**
   * Wait for projects to load
   */
  async waitForProjectsLoad(): Promise<void> {
    await this.waitForPageLoad();
    await this.page.waitForTimeout(500); // Brief pause for UI updates
  }

  /**
   * Cancel project creation/editing
   */
  async cancelProjectForm(): Promise<void> {
    await this.click(this.cancelProjectButton);
  }

  /**
   * Check if create project button is disabled (at limit)
   */
  async isCreateProjectDisabled(): Promise<boolean> {
    const button = await this.locator(this.createProjectButton);
    return await button.isDisabled();
  }

  /**
   * Get search titles in the current project
   */
  async getSearchTitlesInProject(): Promise<string[]> {
    const searchItems = await this.locator(this.searchItem);
    const count = await searchItems.count();
    const titles: string[] = [];
    
    for (let i = 0; i < count; i++) {
      const item = searchItems.nth(i);
      const title = await item.locator('[data-testid="search-title"]').textContent();
      if (title) {
        titles.push(title.trim());
      }
    }
    
    return titles;
  }
}
