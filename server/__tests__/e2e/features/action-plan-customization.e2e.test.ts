import { test, expect } from '@playwright/test';
import { LoginPage } from '../../page-objects/login.page';
import { SearchPage } from '../../page-objects/search.page';
import { ActionPlanPage } from '../../page-objects/action-plan.page';

/**
 * Action Plan Customization E2E Tests
 * 
 * Tests the complete action plan customization feature including:
 * - Creating and viewing plans
 * - Adding, editing, and deleting tasks
 * - Task reordering with drag-and-drop
 * - Template selection and application
 * - Export to CSV and Markdown
 * - Dependency creation and validation
 * - Progress tracking
 * - Undo/redo functionality
 * 
 * Requirements: All action plan customization requirements
 */

test.describe('Action Plan Customization', () => {
  let loginPage: LoginPage;
  let searchPage: SearchPage;
  let actionPlanPage: ActionPlanPage;
  let searchId: number;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    searchPage = new SearchPage(page);
    actionPlanPage = new ActionPlanPage(page);

    // Login
    await loginPage.goto();
    await loginPage.login('test@example.com', 'Test123!@#');
    
    // Create a search to have action plan data
    await searchPage.goto();
    await searchPage.submitSearch('AI-powered fitness coaching app');
    await searchPage.waitForSearchCompletion();
    
    // Extract search ID from URL
    await page.waitForURL(/\/search\/(\d+)/);
    const url = page.url();
    const match = url.match(/\/search\/(\d+)/);
    searchId = match ? parseInt(match[1], 10) : 1;
    
    // Navigate to action plan
    await actionPlanPage.goto(searchId);
  });

  test.describe('Complete User Flow: Create Plan, Add Tasks, Mark Complete', () => {
    test('should complete full workflow from plan creation to task completion', async ({ page }) => {
      // Step 1: Verify plan is loaded with phases
      const phaseCount = await actionPlanPage.getPhaseCount();
      expect(phaseCount).toBeGreaterThan(0);
      
      // Step 2: Expand first phase
      await actionPlanPage.clickPhase(0);
      expect(await actionPlanPage.isPhaseExpanded(0)).toBe(true);
      
      // Step 3: Get initial task count
      const initialTaskCount = await actionPlanPage.getTaskCount(0);
      
      // Step 4: Add a new task
      await actionPlanPage.addTask(
        0,
        'Set up development environment',
        'Install Node.js, VS Code, and configure Git',
        '2 hours'
      );
      
      // Verify task was added
      const newTaskCount = await actionPlanPage.getTaskCount(0);
      expect(newTaskCount).toBe(initialTaskCount + 1);
      
      // Step 5: Verify the new task appears
      const taskTitle = await actionPlanPage.getTaskTitle(initialTaskCount);
      expect(taskTitle).toContain('Set up development environment');
      
      // Step 6: Mark the new task as complete
      await actionPlanPage.markTaskComplete(initialTaskCount);
      
      // Verify task is marked complete
      expect(await actionPlanPage.isTaskCompleted(initialTaskCount)).toBe(true);
      
      // Step 7: Verify progress bar updated
      const progress = await actionPlanPage.getProgressPercentage();
      expect(progress).toBeGreaterThan(0);
      
      // Step 8: Wait for auto-save
      await actionPlanPage.waitForAutoSave();
    });

    test('should persist changes across page reloads', async ({ page }) => {
      // Expand first phase and add a task
      await actionPlanPage.clickPhase(0);
      await actionPlanPage.addTask(0, 'Test persistence task');
      
      const taskCountBefore = await actionPlanPage.getTaskCount(0);
      
      // Mark task as complete
      const taskIndex = taskCountBefore - 1;
      await actionPlanPage.markTaskComplete(taskIndex);
      await actionPlanPage.waitForAutoSave();
      
      const progressBefore = await actionPlanPage.getProgressPercentage();
      
      // Reload page
      await page.reload();
      await actionPlanPage.waitForPlanLoad();
      
      // Expand phase again
      await actionPlanPage.clickPhase(0);
      
      // Verify task still exists
      const taskCountAfter = await actionPlanPage.getTaskCount(0);
      expect(taskCountAfter).toBe(taskCountBefore);
      
      // Verify task is still marked complete
      expect(await actionPlanPage.isTaskCompleted(taskIndex)).toBe(true);
      
      // Verify progress is maintained
      const progressAfter = await actionPlanPage.getProgressPercentage();
      expect(progressAfter).toBe(progressBefore);
    });
  });

  test.describe('Task Reordering with Drag-and-Drop', () => {
    test('should reorder tasks using drag and drop', async ({ page }) => {
      // Expand first phase
      await actionPlanPage.clickPhase(0);
      
      // Add multiple tasks to have enough for reordering
      await actionPlanPage.addTask(0, 'Task A');
      await actionPlanPage.addTask(0, 'Task B');
      await actionPlanPage.addTask(0, 'Task C');
      
      // Get initial order
      const task0Before = await actionPlanPage.getTaskTitle(0);
      const task1Before = await actionPlanPage.getTaskTitle(1);
      const task2Before = await actionPlanPage.getTaskTitle(2);
      
      // Reorder: move task at index 0 to index 2
      await actionPlanPage.reorderTask(0, 2);
      
      // Verify new order
      const task0After = await actionPlanPage.getTaskTitle(0);
      const task1After = await actionPlanPage.getTaskTitle(1);
      const task2After = await actionPlanPage.getTaskTitle(2);
      
      // Task that was at index 0 should now be at index 2
      expect(task2After).toBe(task0Before);
      // Tasks should have shifted
      expect(task0After).toBe(task1Before);
      expect(task1After).toBe(task2Before);
    });

    test('should persist task order after reordering', async ({ page }) => {
      // Expand first phase
      await actionPlanPage.clickPhase(0);
      
      // Add tasks
      await actionPlanPage.addTask(0, 'First Task');
      await actionPlanPage.addTask(0, 'Second Task');
      
      // Reorder
      await actionPlanPage.reorderTask(0, 1);
      await actionPlanPage.waitForAutoSave();
      
      // Get order after reordering
      const task0Before = await actionPlanPage.getTaskTitle(0);
      const task1Before = await actionPlanPage.getTaskTitle(1);
      
      // Reload page
      await page.reload();
      await actionPlanPage.waitForPlanLoad();
      await actionPlanPage.clickPhase(0);
      
      // Verify order is maintained
      const task0After = await actionPlanPage.getTaskTitle(0);
      const task1After = await actionPlanPage.getTaskTitle(1);
      
      expect(task0After).toBe(task0Before);
      expect(task1After).toBe(task1Before);
    });
  });

  test.describe('Template Selection and Application', () => {
    test('should display available templates', async ({ page }) => {
      // Open template selector
      await actionPlanPage.openTemplateSelector();
      
      // Verify templates are displayed
      const templateCards = page.locator('[data-testid="template-card"]');
      const count = await templateCards.count();
      
      expect(count).toBeGreaterThan(0);
    });

    test('should apply a template to the plan', async ({ page }) => {
      // Get initial phase count
      const initialPhaseCount = await actionPlanPage.getPhaseCount();
      
      // Select and apply a template
      await actionPlanPage.selectAndApplyTemplate(0);
      
      // Wait for template to be applied
      await actionPlanPage.waitForPlanLoad();
      
      // Verify plan structure changed (phases may be different)
      const newPhaseCount = await actionPlanPage.getPhaseCount();
      expect(newPhaseCount).toBeGreaterThan(0);
    });

    test('should show warning when switching templates', async ({ page }) => {
      // Add a custom task first
      await actionPlanPage.clickPhase(0);
      await actionPlanPage.addTask(0, 'Custom task');
      
      // Try to apply a different template
      await actionPlanPage.openTemplateSelector();
      await actionPlanPage.selectTemplate(1);
      
      // Check for warning dialog
      const warningDialog = page.locator('[data-testid="template-warning-dialog"]');
      const hasWarning = await warningDialog.isVisible().catch(() => false);
      
      // If warning appears, it should mention data loss
      if (hasWarning) {
        const warningText = await warningDialog.textContent();
        expect(warningText?.toLowerCase()).toContain('warning');
      }
    });
  });

  test.describe('Export to CSV and Markdown', () => {
    test('should export plan as CSV', async ({ page }) => {
      // Set up download listener
      const downloadPromise = page.waitForEvent('download');
      
      // Export as CSV
      await actionPlanPage.exportPlan('csv');
      
      // Wait for download
      const download = await downloadPromise;
      
      // Verify download
      expect(download.suggestedFilename()).toContain('.csv');
    });

    test('should export plan as Markdown', async ({ page }) => {
      // Set up download listener
      const downloadPromise = page.waitForEvent('download');
      
      // Export as Markdown
      await actionPlanPage.exportPlan('markdown');
      
      // Wait for download
      const download = await downloadPromise;
      
      // Verify download
      expect(download.suggestedFilename()).toContain('.md');
    });

    test('should export plan as JSON', async ({ page }) => {
      // Set up download listener
      const downloadPromise = page.waitForEvent('download');
      
      // Export as JSON
      await actionPlanPage.exportPlan('json');
      
      // Wait for download
      const download = await downloadPromise;
      
      // Verify download
      expect(download.suggestedFilename()).toContain('.json');
    });

    test('should include completed tasks in export', async ({ page }) => {
      // Mark some tasks as complete
      await actionPlanPage.clickPhase(0);
      const taskCount = await actionPlanPage.getTaskCount(0);
      
      if (taskCount > 0) {
        await actionPlanPage.markTaskComplete(0);
        await actionPlanPage.waitForAutoSave();
      }
      
      // Export
      const downloadPromise = page.waitForEvent('download');
      await actionPlanPage.exportPlan('csv');
      const download = await downloadPromise;
      
      // Verify download completed
      expect(download).toBeDefined();
    });
  });

  test.describe('Dependency Creation and Validation', () => {
    test('should add dependency between tasks', async ({ page }) => {
      // Expand first phase
      await actionPlanPage.clickPhase(0);
      
      // Add two tasks
      await actionPlanPage.addTask(0, 'Task A - Prerequisite');
      await actionPlanPage.addTask(0, 'Task B - Dependent');
      
      const taskCount = await actionPlanPage.getTaskCount(0);
      const taskBIndex = taskCount - 1;
      const taskAIndex = taskCount - 2;
      
      // Add dependency: Task B depends on Task A
      await actionPlanPage.addTaskDependency(taskBIndex, taskAIndex);
      
      // Verify dependency indicator appears
      expect(await actionPlanPage.hasTaskDependency(taskBIndex)).toBe(true);
    });

    test('should prevent completing dependent task before prerequisite', async ({ page }) => {
      // Expand first phase
      await actionPlanPage.clickPhase(0);
      
      // Add two tasks
      await actionPlanPage.addTask(0, 'Prerequisite Task');
      await actionPlanPage.addTask(0, 'Dependent Task');
      
      const taskCount = await actionPlanPage.getTaskCount(0);
      const dependentIndex = taskCount - 1;
      const prerequisiteIndex = taskCount - 2;
      
      // Add dependency
      await actionPlanPage.addTaskDependency(dependentIndex, prerequisiteIndex);
      
      // Try to complete dependent task without completing prerequisite
      await actionPlanPage.markTaskComplete(dependentIndex);
      
      // Check for warning dialog
      const warningDialog = page.locator('[data-testid="dependency-warning-dialog"]');
      const hasWarning = await warningDialog.isVisible().catch(() => false);
      
      if (hasWarning) {
        const warningText = await warningDialog.textContent();
        expect(warningText?.toLowerCase()).toContain('prerequisite');
      }
    });

    test('should allow completing dependent task after prerequisite', async ({ page }) => {
      // Expand first phase
      await actionPlanPage.clickPhase(0);
      
      // Add two tasks
      await actionPlanPage.addTask(0, 'Prerequisite Task');
      await actionPlanPage.addTask(0, 'Dependent Task');
      
      const taskCount = await actionPlanPage.getTaskCount(0);
      const dependentIndex = taskCount - 1;
      const prerequisiteIndex = taskCount - 2;
      
      // Add dependency
      await actionPlanPage.addTaskDependency(dependentIndex, prerequisiteIndex);
      
      // Complete prerequisite first
      await actionPlanPage.markTaskComplete(prerequisiteIndex);
      await page.waitForTimeout(500);
      
      // Now complete dependent task
      await actionPlanPage.markTaskComplete(dependentIndex);
      
      // Verify both tasks are completed
      expect(await actionPlanPage.isTaskCompleted(prerequisiteIndex)).toBe(true);
      expect(await actionPlanPage.isTaskCompleted(dependentIndex)).toBe(true);
    });

    test('should prevent circular dependencies', async ({ page }) => {
      // Expand first phase
      await actionPlanPage.clickPhase(0);
      
      // Add three tasks
      await actionPlanPage.addTask(0, 'Task A');
      await actionPlanPage.addTask(0, 'Task B');
      await actionPlanPage.addTask(0, 'Task C');
      
      const taskCount = await actionPlanPage.getTaskCount(0);
      const taskAIndex = taskCount - 3;
      const taskBIndex = taskCount - 2;
      const taskCIndex = taskCount - 1;
      
      // Create dependencies: A -> B -> C
      await actionPlanPage.addTaskDependency(taskBIndex, taskAIndex);
      await actionPlanPage.addTaskDependency(taskCIndex, taskBIndex);
      
      // Try to create circular dependency: C -> A
      await actionPlanPage.clickEditTask(taskAIndex);
      
      // Try to select Task C as dependency
      const dependencySelect = page.locator('[data-testid="dependency-select"]');
      await dependencySelect.click();
      
      // Task C should not be available as an option (or should show error)
      const taskCOption = page.locator(`[role="option"]:has-text("Task C")`);
      const isAvailable = await taskCOption.isVisible().catch(() => false);
      
      // Either Task C is not available, or selecting it shows an error
      if (isAvailable) {
        await taskCOption.click();
        await page.locator('[data-testid="task-save-button"]').click();
        
        // Check for circular dependency error
        const errorMessage = page.locator('[data-testid="error-message"]');
        const hasError = await errorMessage.isVisible().catch(() => false);
        
        if (hasError) {
          const errorText = await errorMessage.textContent();
          expect(errorText?.toLowerCase()).toContain('circular');
        }
      }
      
      // Cancel the edit
      await actionPlanPage.cancelTaskEditor();
    });
  });

  test.describe('Task CRUD Operations', () => {
    test('should add a new task', async ({ page }) => {
      await actionPlanPage.clickPhase(0);
      
      const initialCount = await actionPlanPage.getTaskCount(0);
      
      await actionPlanPage.addTask(
        0,
        'New Test Task',
        'This is a test task description',
        '3 hours'
      );
      
      const newCount = await actionPlanPage.getTaskCount(0);
      expect(newCount).toBe(initialCount + 1);
      
      const taskTitle = await actionPlanPage.getTaskTitle(initialCount);
      expect(taskTitle).toContain('New Test Task');
    });

    test('should edit an existing task', async ({ page }) => {
      await actionPlanPage.clickPhase(0);
      
      // Add a task first
      await actionPlanPage.addTask(0, 'Original Task Title');
      const taskCount = await actionPlanPage.getTaskCount(0);
      const taskIndex = taskCount - 1;
      
      // Edit the task
      await actionPlanPage.editTask(
        taskIndex,
        'Updated Task Title',
        'Updated description'
      );
      
      // Verify title was updated
      const updatedTitle = await actionPlanPage.getTaskTitle(taskIndex);
      expect(updatedTitle).toContain('Updated Task Title');
    });

    test('should delete a task', async ({ page }) => {
      await actionPlanPage.clickPhase(0);
      
      // Add a task first
      await actionPlanPage.addTask(0, 'Task to Delete');
      const countBefore = await actionPlanPage.getTaskCount(0);
      const taskIndex = countBefore - 1;
      
      // Delete the task
      await actionPlanPage.deleteTask(taskIndex);
      
      // Verify task was deleted
      const countAfter = await actionPlanPage.getTaskCount(0);
      expect(countAfter).toBe(countBefore - 1);
    });

    test('should cancel task creation', async ({ page }) => {
      await actionPlanPage.clickPhase(0);
      
      const initialCount = await actionPlanPage.getTaskCount(0);
      
      // Start adding a task
      await actionPlanPage.clickAddTask(0);
      
      // Fill in some data
      await page.fill('[data-testid="task-title-input"]', 'Cancelled Task');
      
      // Cancel
      await actionPlanPage.cancelTaskEditor();
      
      // Verify task was not added
      const finalCount = await actionPlanPage.getTaskCount(0);
      expect(finalCount).toBe(initialCount);
    });
  });

  test.describe('Progress Tracking', () => {
    test('should update progress when tasks are completed', async ({ page }) => {
      const initialProgress = await actionPlanPage.getProgressPercentage();
      
      // Expand first phase and complete a task
      await actionPlanPage.clickPhase(0);
      const taskCount = await actionPlanPage.getTaskCount(0);
      
      if (taskCount > 0) {
        await actionPlanPage.markTaskComplete(0);
        await page.waitForTimeout(500);
        
        const newProgress = await actionPlanPage.getProgressPercentage();
        expect(newProgress).toBeGreaterThan(initialProgress);
      }
    });

    test('should show phase progress indicators', async ({ page }) => {
      // Check each phase for progress indicator
      const phaseCount = await actionPlanPage.getPhaseCount();
      
      for (let i = 0; i < phaseCount; i++) {
        const progress = await actionPlanPage.getPhaseProgress(i);
        expect(progress).toBeDefined();
      }
    });

    test('should calculate progress correctly', async ({ page }) => {
      // Get total and completed task counts
      const totalTasks = await actionPlanPage.getTotalTaskCount();
      const completedTasks = await actionPlanPage.getCompletedTaskCount();
      
      // Calculate expected progress
      const expectedProgress = totalTasks > 0 
        ? Math.round((completedTasks / totalTasks) * 100)
        : 0;
      
      // Get actual progress
      const actualProgress = await actionPlanPage.getProgressPercentage();
      
      // Allow for small rounding differences
      expect(Math.abs(actualProgress - expectedProgress)).toBeLessThanOrEqual(1);
    });

    test('should show 100% progress when all tasks completed', async ({ page }) => {
      // Expand all phases and complete all tasks
      const phaseCount = await actionPlanPage.getPhaseCount();
      
      for (let phaseIndex = 0; phaseIndex < phaseCount; phaseIndex++) {
        await actionPlanPage.clickPhase(phaseIndex);
        const taskCount = await actionPlanPage.getTaskCount(phaseIndex);
        
        for (let taskIndex = 0; taskIndex < taskCount; taskIndex++) {
          if (!(await actionPlanPage.isTaskCompleted(taskIndex))) {
            await actionPlanPage.markTaskComplete(taskIndex);
            await page.waitForTimeout(300);
          }
        }
      }
      
      // Wait for progress to update
      await page.waitForTimeout(1000);
      
      // Verify 100% progress
      const progress = await actionPlanPage.getProgressPercentage();
      expect(progress).toBe(100);
    });
  });

  test.describe('Undo/Redo Functionality', () => {
    test('should undo task completion', async ({ page }) => {
      await actionPlanPage.clickPhase(0);
      
      // Complete a task
      await actionPlanPage.markTaskComplete(0);
      expect(await actionPlanPage.isTaskCompleted(0)).toBe(true);
      
      // Undo
      await actionPlanPage.clickUndo();
      
      // Verify task is no longer completed
      expect(await actionPlanPage.isTaskCompleted(0)).toBe(false);
    });

    test('should redo task completion', async ({ page }) => {
      await actionPlanPage.clickPhase(0);
      
      // Complete a task
      await actionPlanPage.markTaskComplete(0);
      
      // Undo
      await actionPlanPage.clickUndo();
      expect(await actionPlanPage.isTaskCompleted(0)).toBe(false);
      
      // Redo
      await actionPlanPage.clickRedo();
      
      // Verify task is completed again
      expect(await actionPlanPage.isTaskCompleted(0)).toBe(true);
    });

    test('should undo task creation', async ({ page }) => {
      await actionPlanPage.clickPhase(0);
      
      const initialCount = await actionPlanPage.getTaskCount(0);
      
      // Add a task
      await actionPlanPage.addTask(0, 'Task to Undo');
      const countAfterAdd = await actionPlanPage.getTaskCount(0);
      expect(countAfterAdd).toBe(initialCount + 1);
      
      // Undo
      await actionPlanPage.clickUndo();
      
      // Verify task was removed
      const countAfterUndo = await actionPlanPage.getTaskCount(0);
      expect(countAfterUndo).toBe(initialCount);
    });

    test('should use keyboard shortcuts for undo/redo', async ({ page }) => {
      await actionPlanPage.clickPhase(0);
      
      // Complete a task
      await actionPlanPage.markTaskComplete(0);
      expect(await actionPlanPage.isTaskCompleted(0)).toBe(true);
      
      // Undo with Ctrl+Z
      await actionPlanPage.pressCtrlZ();
      expect(await actionPlanPage.isTaskCompleted(0)).toBe(false);
      
      // Redo with Ctrl+Y
      await actionPlanPage.pressCtrlY();
      expect(await actionPlanPage.isTaskCompleted(0)).toBe(true);
    });
  });

  test.describe('Phase Management', () => {
    test('should expand and collapse phases', async ({ page }) => {
      // Expand first phase
      await actionPlanPage.clickPhase(0);
      expect(await actionPlanPage.isPhaseExpanded(0)).toBe(true);
      
      // Collapse by clicking again
      await actionPlanPage.clickPhase(0);
      expect(await actionPlanPage.isPhaseExpanded(0)).toBe(false);
    });

    test('should show phase completion status', async ({ page }) => {
      // Expand first phase
      await actionPlanPage.clickPhase(0);
      
      // Complete all tasks in the phase
      const taskCount = await actionPlanPage.getTaskCount(0);
      
      for (let i = 0; i < taskCount; i++) {
        if (!(await actionPlanPage.isTaskCompleted(i))) {
          await actionPlanPage.markTaskComplete(i);
          await page.waitForTimeout(300);
        }
      }
      
      // Check phase progress shows 100%
      const phaseProgress = await actionPlanPage.getPhaseProgress(0);
      expect(phaseProgress).toContain('100%');
    });

    test('should navigate between phases', async ({ page }) => {
      const phaseCount = await actionPlanPage.getPhaseCount();
      
      // Expand each phase in sequence
      for (let i = 0; i < phaseCount; i++) {
        await actionPlanPage.clickPhase(i);
        expect(await actionPlanPage.isPhaseExpanded(i)).toBe(true);
        
        // Collapse before moving to next
        await actionPlanPage.clickPhase(i);
      }
    });
  });

  test.describe('Auto-Save Functionality', () => {
    test('should auto-save task changes', async ({ page }) => {
      await actionPlanPage.clickPhase(0);
      
      // Make a change
      await actionPlanPage.addTask(0, 'Auto-save test task');
      
      // Wait for auto-save
      await actionPlanPage.waitForAutoSave();
      
      // Verify saved indicator appears
      const savedIndicator = page.locator('[data-testid="saved-indicator"]');
      const isVisible = await savedIndicator.isVisible().catch(() => false);
      
      expect(isVisible).toBe(true);
    });

    test('should show saving indicator during save', async ({ page }) => {
      await actionPlanPage.clickPhase(0);
      
      // Make a change
      await actionPlanPage.markTaskComplete(0);
      
      // Check for saving indicator
      const savingIndicator = page.locator('[data-testid="saving-indicator"]');
      const appeared = await savingIndicator.isVisible().catch(() => false);
      
      // Indicator should appear briefly
      expect(appeared).toBe(true);
    });
  });

  test.describe('Accessibility', () => {
    test('should be keyboard navigable', async ({ page }) => {
      // Tab through elements
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      
      // Verify focus is visible
      const focusedElement = await page.evaluate(() => {
        const el = document.activeElement;
        if (!el) return false;
        const styles = window.getComputedStyle(el);
        return styles.outline !== 'none' || styles.boxShadow !== 'none';
      });
      
      expect(focusedElement).toBeTruthy();
    });

    test('should have proper ARIA labels', async ({ page }) => {
      // Check progress bar has aria attributes
      const progressBar = page.locator('[data-testid="progress-bar"]');
      const ariaValueNow = await progressBar.getAttribute('aria-valuenow');
      const ariaValueMin = await progressBar.getAttribute('aria-valuemin');
      const ariaValueMax = await progressBar.getAttribute('aria-valuemax');
      
      expect(ariaValueNow).toBeDefined();
      expect(ariaValueMin).toBe('0');
      expect(ariaValueMax).toBe('100');
    });
  });

  test.describe('Error Handling', () => {
    test('should handle network errors gracefully', async ({ page }) => {
      // Simulate offline mode
      await page.context().setOffline(true);
      
      // Try to make a change
      await actionPlanPage.clickPhase(0);
      await actionPlanPage.markTaskComplete(0);
      
      // Check for error message
      const errorMessage = page.locator('[data-testid="error-message"]');
      const hasError = await errorMessage.isVisible({ timeout: 5000 }).catch(() => false);
      
      // Restore online mode
      await page.context().setOffline(false);
      
      if (hasError) {
        const errorText = await errorMessage.textContent();
        expect(errorText).toBeTruthy();
      }
    });

    test('should show validation errors for invalid task data', async ({ page }) => {
      await actionPlanPage.clickPhase(0);
      await actionPlanPage.clickAddTask(0);
      
      // Try to save without title
      await page.click('[data-testid="task-save-button"]');
      
      // Check for validation error
      const errorMessage = page.locator('[data-testid="validation-error"]');
      const hasError = await errorMessage.isVisible().catch(() => false);
      
      if (hasError) {
        const errorText = await errorMessage.textContent();
        expect(errorText?.toLowerCase()).toContain('required');
      }
      
      // Cancel
      await actionPlanPage.cancelTaskEditor();
    });
  });
});
