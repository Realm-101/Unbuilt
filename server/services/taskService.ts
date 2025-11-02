import { db } from '../db';
import { 
  planTasks,
  taskHistory,
  planPhases,
  actionPlans,
  taskDependencies,
  type PlanTask,
  type InsertPlanTask,
  type UpdatePlanTask,
  type InsertTaskHistory,
} from '@shared/schema';
import { eq, and, desc, asc, or } from 'drizzle-orm';

/**
 * Task Service
 * Business logic layer for task operations
 * Handles CRUD operations, status updates, reordering, and history tracking
 */
export class TaskService {
  /**
   * Create a new task
   * Records creation in task history
   */
  async createTask(
    taskData: InsertPlanTask,
    userId: number
  ): Promise<PlanTask> {
    // Verify phase exists and user has access to the plan
    const phase = await db
      .select()
      .from(planPhases)
      .where(eq(planPhases.id, taskData.phaseId))
      .limit(1);

    if (phase.length === 0) {
      throw new Error('Phase not found');
    }

    // Verify user has access to the plan
    const plan = await db
      .select()
      .from(actionPlans)
      .where(and(
        eq(actionPlans.id, taskData.planId),
        eq(actionPlans.userId, userId)
      ))
      .limit(1);

    if (plan.length === 0) {
      throw new Error('Plan not found or access denied');
    }

    // Create the task
    const [newTask] = await db
      .insert(planTasks)
      .values({
        ...taskData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      .returning();

    // Record in task history
    await this.recordTaskHistory(
      newTask.id,
      userId,
      'created',
      null,
      newTask
    );

    return newTask;
  }

  /**
   * Get task by ID
   * Verifies user has access to the task's plan
   */
  async getTaskById(taskId: number, userId: number): Promise<PlanTask | null> {
    const [task] = await db
      .select({
        task: planTasks,
        plan: actionPlans,
      })
      .from(planTasks)
      .innerJoin(actionPlans, eq(planTasks.planId, actionPlans.id))
      .where(and(
        eq(planTasks.id, taskId),
        eq(actionPlans.userId, userId)
      ))
      .limit(1);

    return task?.task || null;
  }

  /**
   * Get all tasks for a phase
   * Ordered by task order field
   */
  async getTasksByPhaseId(
    phaseId: number,
    userId: number
  ): Promise<PlanTask[]> {
    // Verify user has access to the plan
    const phase = await db
      .select({
        phase: planPhases,
        plan: actionPlans,
      })
      .from(planPhases)
      .innerJoin(actionPlans, eq(planPhases.planId, actionPlans.id))
      .where(and(
        eq(planPhases.id, phaseId),
        eq(actionPlans.userId, userId)
      ))
      .limit(1);

    if (phase.length === 0) {
      throw new Error('Phase not found or access denied');
    }

    // Get tasks
    const tasks = await db
      .select()
      .from(planTasks)
      .where(eq(planTasks.phaseId, phaseId))
      .orderBy(asc(planTasks.order));

    return tasks;
  }

  /**
   * Get all tasks for a plan
   * Optionally filter by status
   */
  async getTasksByPlanId(
    planId: number,
    userId: number,
    status?: 'not_started' | 'in_progress' | 'completed' | 'skipped'
  ): Promise<PlanTask[]> {
    // Verify user has access to the plan
    const plan = await db
      .select()
      .from(actionPlans)
      .where(and(
        eq(actionPlans.id, planId),
        eq(actionPlans.userId, userId)
      ))
      .limit(1);

    if (plan.length === 0) {
      throw new Error('Plan not found or access denied');
    }

    // Build query conditions
    const conditions = [eq(planTasks.planId, planId)];
    if (status) {
      conditions.push(eq(planTasks.status, status));
    }

    // Get tasks
    const tasks = await db
      .select()
      .from(planTasks)
      .where(and(...conditions))
      .orderBy(asc(planTasks.order));

    return tasks;
  }

  /**
   * Update task
   * Records update in task history with previous and new state
   * Marks task as custom if it wasn't already (preserves original AI-generated content)
   */
  async updateTask(
    taskId: number,
    userId: number,
    updates: UpdatePlanTask
  ): Promise<PlanTask> {
    // Get current task state
    const currentTask = await this.getTaskById(taskId, userId);
    if (!currentTask) {
      throw new Error('Task not found or access denied');
    }

    // If this is the first edit of an AI-generated task, mark it as custom
    // This preserves the original AI-generated content in the task history
    const isFirstEdit = !currentTask.isCustom;
    
    // Update the task
    const [updatedTask] = await db
      .update(planTasks)
      .set({
        ...updates,
        // Mark as custom if this is the first edit of an AI-generated task
        isCustom: isFirstEdit ? true : currentTask.isCustom,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(planTasks.id, taskId))
      .returning();

    // Record in task history (preserves original state for AI-generated tasks)
    await this.recordTaskHistory(
      taskId,
      userId,
      'updated',
      currentTask,
      updatedTask
    );

    return updatedTask;
  }

  /**
   * Update task status
   * Tracks completion timestamp and user
   * 
   * Requirements: 5.5 - Dependency warnings with override
   */
  async updateTaskStatus(
    taskId: number,
    userId: number,
    status: 'not_started' | 'in_progress' | 'completed' | 'skipped',
    overridePrerequisites: boolean = false
  ): Promise<PlanTask> {
    // Get current task state
    const currentTask = await this.getTaskById(taskId, userId);
    if (!currentTask) {
      throw new Error('Task not found or access denied');
    }

    const updateData: Partial<InsertPlanTask> = {
      status,
      updatedAt: new Date().toISOString(),
    };

    // Set completion timestamp and user when marking as completed
    if (status === 'completed' && currentTask.status !== 'completed') {
      updateData.completedAt = new Date().toISOString();
      updateData.completedBy = userId;
    }

    // Clear completion data if moving back to not completed
    if (status !== 'completed' && currentTask.status === 'completed') {
      updateData.completedAt = null;
      updateData.completedBy = null;
    }

    // Update the task
    const [updatedTask] = await db
      .update(planTasks)
      .set(updateData)
      .where(eq(planTasks.id, taskId))
      .returning();

    // Record in task history
    const action = status === 'completed' ? 'completed' : 
                   status === 'skipped' ? 'skipped' : 'updated';
    
    // If override was used, record it in the history
    const historyState = overridePrerequisites 
      ? { ...updatedTask, overridePrerequisites: true }
      : updatedTask;
    
    await this.recordTaskHistory(
      taskId,
      userId,
      action,
      currentTask,
      historyState
    );

    return updatedTask;
  }

  /**
   * Delete task
   * Handles cleanup of:
   * - Task dependencies (both as dependent and prerequisite)
   * - Task history
   * - The task itself
   * 
   * Requirements: 2.5
   */
  async deleteTask(taskId: number, userId: number): Promise<void> {
    // Get current task state
    const currentTask = await this.getTaskById(taskId, userId);
    if (!currentTask) {
      throw new Error('Task not found or access denied');
    }

    // Delete task dependencies first (both where this task is dependent or prerequisite)
    // This handles the foreign key constraints
    await db
      .delete(taskDependencies)
      .where(
        or(
          eq(taskDependencies.taskId, taskId),
          eq(taskDependencies.prerequisiteTaskId, taskId)
        )
      );

    // Delete task history to avoid foreign key constraint
    await db
      .delete(taskHistory)
      .where(eq(taskHistory.taskId, taskId));

    // Delete the task
    await db
      .delete(planTasks)
      .where(eq(planTasks.id, taskId));
  }

  /**
   * Reorder tasks within a phase
   * Updates order field for all affected tasks
   */
  async reorderTasks(
    phaseId: number,
    userId: number,
    taskIds: number[]
  ): Promise<PlanTask[]> {
    // Verify user has access to the phase
    const phase = await db
      .select({
        phase: planPhases,
        plan: actionPlans,
      })
      .from(planPhases)
      .innerJoin(actionPlans, eq(planPhases.planId, actionPlans.id))
      .where(and(
        eq(planPhases.id, phaseId),
        eq(actionPlans.userId, userId)
      ))
      .limit(1);

    if (phase.length === 0) {
      throw new Error('Phase not found or access denied');
    }

    // Get all tasks in the phase to verify they all belong to this phase
    const phaseTasks = await db
      .select()
      .from(planTasks)
      .where(eq(planTasks.phaseId, phaseId));

    const phaseTaskIds = new Set(phaseTasks.map(t => t.id));
    
    // Verify all provided task IDs belong to this phase
    for (const taskId of taskIds) {
      if (!phaseTaskIds.has(taskId)) {
        throw new Error(`Task ${taskId} does not belong to phase ${phaseId}`);
      }
    }

    // Update order for each task
    // First, set all tasks to negative order values to avoid unique constraint conflicts
    const updatedTasks: PlanTask[] = [];
    
    // Step 1: Set all tasks to temporary negative order values
    for (let i = 0; i < taskIds.length; i++) {
      const taskId = taskIds[i];
      await db
        .update(planTasks)
        .set({
          order: -(i + 1), // Use negative values temporarily
          updatedAt: new Date().toISOString(),
        })
        .where(eq(planTasks.id, taskId));
    }
    
    // Step 2: Set tasks to their final positive order values
    for (let i = 0; i < taskIds.length; i++) {
      const taskId = taskIds[i];
      const newOrder = i;

      const [updatedTask] = await db
        .update(planTasks)
        .set({
          order: newOrder,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(planTasks.id, taskId))
        .returning();

      updatedTasks.push(updatedTask);
    }

    // Record reorder action in history for the first task (represents the batch operation)
    if (taskIds.length > 0) {
      await this.recordTaskHistory(
        taskIds[0],
        userId,
        'reordered',
        { taskIds: phaseTasks.map(t => t.id) },
        { taskIds }
      );
    }

    return updatedTasks;
  }

  /**
   * Get task history
   * Returns audit trail for a task
   */
  async getTaskHistory(
    taskId: number,
    userId: number,
    limit: number = 50
  ): Promise<typeof taskHistory.$inferSelect[]> {
    // Verify user has access to the task
    const task = await this.getTaskById(taskId, userId);
    if (!task) {
      throw new Error('Task not found or access denied');
    }

    // Get history
    const history = await db
      .select()
      .from(taskHistory)
      .where(eq(taskHistory.taskId, taskId))
      .orderBy(desc(taskHistory.timestamp))
      .limit(limit);

    return history;
  }

  /**
   * Record task history entry
   * Private helper method for audit trail
   */
  private async recordTaskHistory(
    taskId: number,
    userId: number,
    action: 'created' | 'updated' | 'completed' | 'skipped' | 'deleted' | 'reordered',
    previousState: any,
    newState: any
  ): Promise<void> {
    const historyData: InsertTaskHistory = {
      taskId,
      userId,
      action,
      previousState: previousState || null,
      newState: newState || null,
      timestamp: new Date().toISOString(),
    };

    await db
      .insert(taskHistory)
      .values(historyData);
  }

  /**
   * Get tasks by assignee
   * For team collaboration features
   */
  async getTasksByAssignee(
    planId: number,
    assigneeId: number,
    userId: number
  ): Promise<PlanTask[]> {
    // Verify user has access to the plan
    const plan = await db
      .select()
      .from(actionPlans)
      .where(and(
        eq(actionPlans.id, planId),
        eq(actionPlans.userId, userId)
      ))
      .limit(1);

    if (plan.length === 0) {
      throw new Error('Plan not found or access denied');
    }

    // Get tasks assigned to the user
    const tasks = await db
      .select()
      .from(planTasks)
      .where(and(
        eq(planTasks.planId, planId),
        eq(planTasks.assigneeId, assigneeId)
      ))
      .orderBy(asc(planTasks.order));

    return tasks;
  }

  /**
   * Bulk update task status
   * Useful for marking multiple tasks as complete
   */
  async bulkUpdateTaskStatus(
    taskIds: number[],
    userId: number,
    status: 'not_started' | 'in_progress' | 'completed' | 'skipped'
  ): Promise<PlanTask[]> {
    const updatedTasks: PlanTask[] = [];

    for (const taskId of taskIds) {
      const updatedTask = await this.updateTaskStatus(taskId, userId, status);
      updatedTasks.push(updatedTask);
    }

    return updatedTasks;
  }

  /**
   * Check if user has access to a task
   */
  async hasAccess(taskId: number, userId: number): Promise<boolean> {
    const task = await this.getTaskById(taskId, userId);
    return task !== null;
  }
}

// Export singleton instance
export const taskService = new TaskService();
