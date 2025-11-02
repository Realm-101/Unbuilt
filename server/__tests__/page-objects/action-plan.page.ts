import { Page } from '@playwright/test';
import { BasePage } from './base.page';

/**
 * ActionPlanPage - Handles action plan customization interactions
 * 
 * Provides methods for interacting with action plans including:
 * - Creating and viewing plans
 * - Adding, editing, and deleting tasks
 * - Reordering tasks with drag-and-drop
 * - Managing task dependencies
 * - Exporting plans
 * - Selecting templates
 * 
 * Example:
 * ```
 * const actionPlanPage = new ActionPlanPage(page);
 * await actionPlanPage.goto(searchId);
 * await actionPlanPage.addTask('Phase 1', 'New task');
 * await actionPlanPage.markTaskComplete(0);
 * ```
 */
export class ActionPlanPage extends BasePage {
  // Main action plan elements
  private readonly actionPlanContainer = '[data-testid="action-plan-view"]';
  private readonly progressBar = '[data-testid="progress-bar"]';
  private readonly progressPercentage = '[data-testid="progress-percentage"]';
  
  // Phase elements
  private readonly phaseAccordion = '[data-testid="phase-accordion"]';
  private readonly phaseHeader = '[data-testid="phase-header"]';
  private readonly phaseProgress = '[data-testid="phase-progress"]';
  
  // Task elements
  private readonly taskItem = '[data-testid="task-item"]';
  private readonly taskCheckbox = '[data-testid="task-checkbox"]';
  private readonly taskTitle = '[data-testid="task-title"]';
  private readonly taskEditButton = '[data-testid="task-edit-button"]';
  private readonly taskDeleteButton = '[data-testid="task-delete-button"]';
  private readonly taskDragHandle = '[data-testid="task-drag-handle"]';
  private readonly addTaskButton = '[data-testid="add-task-button"]';
  
  // Task editor modal
  private readonly taskEditorModal = '[data-testid="task-editor-modal"]';
  private readonly taskTitleInput = '[data-testid="task-title-input"]';
  private readonly taskDescriptionInput = '[data-testid="task-description-input"]';
  private readonly taskEstimatedTimeInput = '[data-testid="task-estimated-time-input"]';
  private readonly taskSaveButton = '[data-testid="task-save-button"]';
  private readonly taskCancelButton = '[data-testid="task-cancel-button"]';
  
  // Template selector
  private readonly templateSelector = '[data-testid="template-selector"]';
  private readonly templateCard = '[data-testid="template-card"]';
  private readonly templateApplyButton = '[data-testid="template-apply-button"]';
  
  // Export dialog
  private readonly exportButton = '[data-testid="export-button"]';
  private readonly exportDialog = '[data-testid="export-dialog"]';
  private readonly exportFormatSelect = '[data-testid="export-format-select"]';
  private readonly exportConfirmButton = '[data-testid="export-confirm-button"]';
  
  // Dependency elements
  private readonly dependencyIndicator = '[data-testid="dependency-indicator"]';
  private readonly dependencySelect = '[data-testid="dependency-select"]';
  
  // Undo/Redo
  private readonly undoButton = '[data-testid="undo-button"]';
  private readonly redoButton = '[data-testid="redo-button"]';

  constructor(page: Page) {
    super(page);
  }

  /**
   * Navigate to action plan for a specific search
   * @param searchId - The search ID
   */
  async goto(searchId: number): Promise<void> {
    await super.goto(`/search/${searchId}/action-plan`);
    await this.waitForPlanLoad();
  }

  /**
   * Wait for action plan to fully load
   */
  async waitForPlanLoad(): Promise<void> {
    await this.waitForSelector(this.actionPlanContainer);
    await this.waitForPageLoad();
  }

  // ==================== Phase Interactions ====================

  /**
   * Get the number of phases in the plan
   */
  async getPhaseCount(): Promise<number> {
    return await this.getCount(this.phaseAccordion);
  }

  /**
   * Click on a phase to expand/collapse it
   * @param phaseIndex - Zero-based index of the phase
   */
  async clickPhase(phaseIndex: number): Promise<void> {
    const phases = this.locator(this.phaseHeader);
    await phases.nth(phaseIndex).click();
    await this.wait(300); // Wait for animation
  }

  /**
   * Check if a phase is expanded
   * @param phaseIndex - Zero-based index of the phase
   */
  async isPhaseExpanded(phaseIndex: number): Promise<boolean> {
    const phase = this.locator(this.phaseAccordion).nth(phaseIndex);
    const expanded = await phase.getAttribute('data-state');
    return expanded === 'open';
  }

  /**
   * Get phase progress text
   * @param phaseIndex - Zero-based index of the phase
   */
  async getPhaseProgress(phaseIndex: number): Promise<string> {
    const phase = this.locator(this.phaseAccordion).nth(phaseIndex);
    const progress = phase.locator(this.phaseProgress);
    return await progress.textContent() || '';
  }

  // ==================== Task Interactions ====================

  /**
   * Get the number of tasks in a phase
   * @param phaseIndex - Zero-based index of the phase
   */
  async getTaskCount(phaseIndex: number): Promise<number> {
    const phase = this.locator(this.phaseAccordion).nth(phaseIndex);
    return await phase.locator(this.taskItem).count();
  }

  /**
   * Get task title by index
   * @param taskIndex - Zero-based index of the task
   */
  async getTaskTitle(taskIndex: number): Promise<string> {
    const task = this.locator(this.taskItem).nth(taskIndex);
    const title = task.locator(this.taskTitle);
    return await title.textContent() || '';
  }

  /**
   * Check if a task is completed
   * @param taskIndex - Zero-based index of the task
   */
  async isTaskCompleted(taskIndex: number): Promise<boolean> {
    const task = this.locator(this.taskItem).nth(taskIndex);
    const checkbox = task.locator(this.taskCheckbox);
    return await checkbox.isChecked();
  }

  /**
   * Mark a task as complete
   * @param taskIndex - Zero-based index of the task
   */
  async markTaskComplete(taskIndex: number): Promise<void> {
    const task = this.locator(this.taskItem).nth(taskIndex);
    const checkbox = task.locator(this.taskCheckbox);
    
    if (!(await checkbox.isChecked())) {
      await checkbox.click();
      await this.wait(500); // Wait for optimistic update
    }
  }

  /**
   * Unmark a task as complete
   * @param taskIndex - Zero-based index of the task
   */
  async unmarkTaskComplete(taskIndex: number): Promise<void> {
    const task = this.locator(this.taskItem).nth(taskIndex);
    const checkbox = task.locator(this.taskCheckbox);
    
    if (await checkbox.isChecked()) {
      await checkbox.click();
      await this.wait(500); // Wait for optimistic update
    }
  }

  // ==================== Task CRUD Operations ====================

  /**
   * Click the add task button for a phase
   * @param phaseIndex - Zero-based index of the phase
   */
  async clickAddTask(phaseIndex: number): Promise<void> {
    const phase = this.locator(this.phaseAccordion).nth(phaseIndex);
    const addButton = phase.locator(this.addTaskButton);
    await addButton.click();
    await this.waitForSelector(this.taskEditorModal);
  }

  /**
   * Add a new task to a phase
   * @param phaseIndex - Zero-based index of the phase
   * @param title - Task title
   * @param description - Task description (optional)
   * @param estimatedTime - Estimated time (optional)
   */
  async addTask(
    phaseIndex: number,
    title: string,
    description?: string,
    estimatedTime?: string
  ): Promise<void> {
    await this.clickAddTask(phaseIndex);
    
    // Fill in task details
    await this.fill(this.taskTitleInput, title);
    
    if (description) {
      await this.fill(this.taskDescriptionInput, description);
    }
    
    if (estimatedTime) {
      await this.fill(this.taskEstimatedTimeInput, estimatedTime);
    }
    
    // Save task
    await this.click(this.taskSaveButton);
    await this.waitForSelectorHidden(this.taskEditorModal);
    await this.wait(500); // Wait for task to appear
  }

  /**
   * Click edit button for a task
   * @param taskIndex - Zero-based index of the task
   */
  async clickEditTask(taskIndex: number): Promise<void> {
    const task = this.locator(this.taskItem).nth(taskIndex);
    const editButton = task.locator(this.taskEditButton);
    await editButton.click();
    await this.waitForSelector(this.taskEditorModal);
  }

  /**
   * Edit an existing task
   * @param taskIndex - Zero-based index of the task
   * @param title - New task title
   * @param description - New task description (optional)
   */
  async editTask(
    taskIndex: number,
    title: string,
    description?: string
  ): Promise<void> {
    await this.clickEditTask(taskIndex);
    
    // Clear and fill title
    await this.fill(this.taskTitleInput, '');
    await this.fill(this.taskTitleInput, title);
    
    if (description) {
      await this.fill(this.taskDescriptionInput, '');
      await this.fill(this.taskDescriptionInput, description);
    }
    
    // Save changes
    await this.click(this.taskSaveButton);
    await this.waitForSelectorHidden(this.taskEditorModal);
    await this.wait(500);
  }

  /**
   * Delete a task
   * @param taskIndex - Zero-based index of the task
   */
  async deleteTask(taskIndex: number): Promise<void> {
    const task = this.locator(this.taskItem).nth(taskIndex);
    const deleteButton = task.locator(this.taskDeleteButton);
    await deleteButton.click();
    
    // Confirm deletion if dialog appears
    const confirmButton = this.page.locator('[data-testid="confirm-delete-button"]');
    const isVisible = await confirmButton.isVisible().catch(() => false);
    
    if (isVisible) {
      await confirmButton.click();
    }
    
    await this.wait(500);
  }

  /**
   * Cancel task editor
   */
  async cancelTaskEditor(): Promise<void> {
    await this.click(this.taskCancelButton);
    await this.waitForSelectorHidden(this.taskEditorModal);
  }

  // ==================== Drag and Drop ====================

  /**
   * Reorder a task using drag and drop
   * @param fromIndex - Current index of the task
   * @param toIndex - Target index for the task
   */
  async reorderTask(fromIndex: number, toIndex: number): Promise<void> {
    const tasks = this.locator(this.taskItem);
    const fromTask = tasks.nth(fromIndex);
    const toTask = tasks.nth(toIndex);
    
    // Get bounding boxes
    const fromBox = await fromTask.boundingBox();
    const toBox = await toTask.boundingBox();
    
    if (!fromBox || !toBox) {
      throw new Error('Could not get task positions for drag and drop');
    }
    
    // Perform drag and drop
    await this.page.mouse.move(fromBox.x + fromBox.width / 2, fromBox.y + fromBox.height / 2);
    await this.page.mouse.down();
    await this.page.mouse.move(toBox.x + toBox.width / 2, toBox.y + toBox.height / 2, { steps: 10 });
    await this.page.mouse.up();
    
    await this.wait(500); // Wait for reorder to complete
  }

  // ==================== Progress Tracking ====================

  /**
   * Get overall progress percentage
   */
  async getProgressPercentage(): Promise<number> {
    const progressText = await this.getText(this.progressPercentage);
    const match = progressText.match(/(\d+)%/);
    return match ? parseInt(match[1], 10) : 0;
  }

  /**
   * Get progress bar value
   */
  async getProgressBarValue(): Promise<number> {
    const value = await this.getAttribute(this.progressBar, 'aria-valuenow');
    return value ? parseInt(value, 10) : 0;
  }

  // ==================== Template Selection ====================

  /**
   * Open template selector
   */
  async openTemplateSelector(): Promise<void> {
    const selector = this.locator(this.templateSelector);
    await selector.click();
    await this.wait(300);
  }

  /**
   * Select a template by index
   * @param templateIndex - Zero-based index of the template
   */
  async selectTemplate(templateIndex: number): Promise<void> {
    const templates = this.locator(this.templateCard);
    await templates.nth(templateIndex).click();
    await this.wait(300);
  }

  /**
   * Apply selected template
   */
  async applyTemplate(): Promise<void> {
    await this.click(this.templateApplyButton);
    await this.wait(1000); // Wait for template to be applied
  }

  /**
   * Select and apply a template
   * @param templateIndex - Zero-based index of the template
   */
  async selectAndApplyTemplate(templateIndex: number): Promise<void> {
    await this.openTemplateSelector();
    await this.selectTemplate(templateIndex);
    await this.applyTemplate();
  }

  // ==================== Export ====================

  /**
   * Open export dialog
   */
  async openExportDialog(): Promise<void> {
    await this.click(this.exportButton);
    await this.waitForSelector(this.exportDialog);
  }

  /**
   * Export plan in specified format
   * @param format - Export format (csv, json, markdown)
   */
  async exportPlan(format: 'csv' | 'json' | 'markdown'): Promise<void> {
    await this.openExportDialog();
    
    // Select format
    await this.click(this.exportFormatSelect);
    await this.page.click(`[data-value="${format}"]`);
    
    // Confirm export
    await this.click(this.exportConfirmButton);
    await this.wait(1000); // Wait for export to complete
  }

  // ==================== Dependencies ====================

  /**
   * Check if a task has dependency indicator
   * @param taskIndex - Zero-based index of the task
   */
  async hasTaskDependency(taskIndex: number): Promise<boolean> {
    const task = this.locator(this.taskItem).nth(taskIndex);
    const indicator = task.locator(this.dependencyIndicator);
    return await indicator.isVisible().catch(() => false);
  }

  /**
   * Add dependency to a task
   * @param taskIndex - Zero-based index of the task
   * @param prerequisiteIndex - Index of the prerequisite task
   */
  async addTaskDependency(taskIndex: number, prerequisiteIndex: number): Promise<void> {
    await this.clickEditTask(taskIndex);
    
    // Select dependency
    const dependencySelect = this.locator(this.dependencySelect);
    await dependencySelect.click();
    
    // Select prerequisite task
    const options = this.page.locator('[role="option"]');
    await options.nth(prerequisiteIndex).click();
    
    // Save
    await this.click(this.taskSaveButton);
    await this.waitForSelectorHidden(this.taskEditorModal);
    await this.wait(500);
  }

  // ==================== Undo/Redo ====================

  /**
   * Click undo button
   */
  async clickUndo(): Promise<void> {
    await this.click(this.undoButton);
    await this.wait(300);
  }

  /**
   * Click redo button
   */
  async clickRedo(): Promise<void> {
    await this.click(this.redoButton);
    await this.wait(300);
  }

  /**
   * Check if undo is available
   */
  async isUndoAvailable(): Promise<boolean> {
    return await this.isEnabled(this.undoButton);
  }

  /**
   * Check if redo is available
   */
  async isRedoAvailable(): Promise<boolean> {
    return await this.isEnabled(this.redoButton);
  }

  // ==================== Keyboard Shortcuts ====================

  /**
   * Use keyboard shortcut to toggle task completion
   */
  async pressSpaceToToggleTask(): Promise<void> {
    await this.pressKey('Space');
    await this.wait(300);
  }

  /**
   * Use keyboard shortcut to undo
   */
  async pressCtrlZ(): Promise<void> {
    await this.page.keyboard.press('Control+z');
    await this.wait(300);
  }

  /**
   * Use keyboard shortcut to redo
   */
  async pressCtrlY(): Promise<void> {
    await this.page.keyboard.press('Control+y');
    await this.wait(300);
  }

  // ==================== Utility Methods ====================

  /**
   * Wait for auto-save indicator
   */
  async waitForAutoSave(): Promise<void> {
    const savingIndicator = this.page.locator('[data-testid="saving-indicator"]');
    const savedIndicator = this.page.locator('[data-testid="saved-indicator"]');
    
    // Wait for "Saving..." to appear and disappear
    await savingIndicator.waitFor({ state: 'visible', timeout: 2000 }).catch(() => {});
    await savedIndicator.waitFor({ state: 'visible', timeout: 3000 }).catch(() => {});
  }

  /**
   * Check if plan is loading
   */
  async isPlanLoading(): Promise<boolean> {
    const loadingIndicator = this.page.locator('[data-testid="plan-loading"]');
    return await loadingIndicator.isVisible().catch(() => false);
  }

  /**
   * Get total task count across all phases
   */
  async getTotalTaskCount(): Promise<number> {
    return await this.getCount(this.taskItem);
  }

  /**
   * Get completed task count
   */
  async getCompletedTaskCount(): Promise<number> {
    const tasks = this.locator(this.taskItem);
    const count = await tasks.count();
    let completed = 0;
    
    for (let i = 0; i < count; i++) {
      if (await this.isTaskCompleted(i)) {
        completed++;
      }
    }
    
    return completed;
  }
}
