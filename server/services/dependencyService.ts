import { db } from '../db';
import { 
  taskDependencies,
  planTasks,
  actionPlans,
  type TaskDependency,
  type InsertTaskDependency,
  type DependencyValidation,
} from '@shared/schema';
import { eq, and, or } from 'drizzle-orm';

/**
 * Dependency Service
 * Business logic layer for task dependency operations
 * Handles CRUD operations, circular dependency detection, and validation
 * 
 * Requirements: 5.1, 5.6
 */
export class DependencyService {
  /**
   * Add a dependency between tasks
   * Validates that no circular dependencies are created
   */
  async addDependency(
    taskId: number,
    prerequisiteTaskId: number,
    userId: number
  ): Promise<TaskDependency> {
    // Validate that task cannot depend on itself
    if (taskId === prerequisiteTaskId) {
      throw new Error('Task cannot depend on itself');
    }

    // Verify both tasks exist and user has access
    const [task, prerequisiteTask] = await Promise.all([
      this.getTaskWithAccess(taskId, userId),
      this.getTaskWithAccess(prerequisiteTaskId, userId),
    ]);

    if (!task) {
      throw new Error('Task not found or access denied');
    }

    if (!prerequisiteTask) {
      throw new Error('Prerequisite task not found or access denied');
    }

    // Verify both tasks belong to the same plan
    if (task.planId !== prerequisiteTask.planId) {
      throw new Error('Tasks must belong to the same plan');
    }

    // Check if dependency already exists
    const existingDependency = await db
      .select()
      .from(taskDependencies)
      .where(and(
        eq(taskDependencies.taskId, taskId),
        eq(taskDependencies.prerequisiteTaskId, prerequisiteTaskId)
      ))
      .limit(1);

    if (existingDependency.length > 0) {
      throw new Error('Dependency already exists');
    }

    // Validate that adding this dependency won't create a circular reference
    const validation = await this.validateDependency(taskId, prerequisiteTaskId);
    
    if (!validation.isValid) {
      const errorMessage = validation.errors.join(', ');
      throw new Error(`Cannot add dependency: ${errorMessage}`);
    }

    // Create the dependency
    const dependencyData: InsertTaskDependency = {
      taskId,
      prerequisiteTaskId,
      createdAt: new Date().toISOString(),
    };

    const [newDependency] = await db
      .insert(taskDependencies)
      .values(dependencyData)
      .returning();

    return newDependency;
  }

  /**
   * Remove a dependency
   */
  async removeDependency(
    dependencyId: number,
    userId: number
  ): Promise<void> {
    // Get the dependency
    const [dependency] = await db
      .select()
      .from(taskDependencies)
      .where(eq(taskDependencies.id, dependencyId))
      .limit(1);

    if (!dependency) {
      throw new Error('Dependency not found');
    }

    // Verify user has access to the task
    const task = await this.getTaskWithAccess(dependency.taskId, userId);
    if (!task) {
      throw new Error('Access denied');
    }

    // Delete the dependency
    await db
      .delete(taskDependencies)
      .where(eq(taskDependencies.id, dependencyId));
  }

  /**
   * Get all prerequisites for a task
   * Returns tasks that must be completed before this task can start
   */
  async getPrerequisites(
    taskId: number,
    userId: number
  ): Promise<number[]> {
    // Verify user has access to the task
    const task = await this.getTaskWithAccess(taskId, userId);
    if (!task) {
      throw new Error('Task not found or access denied');
    }

    // Get all dependencies where this task is the dependent
    const dependencies = await db
      .select()
      .from(taskDependencies)
      .where(eq(taskDependencies.taskId, taskId));

    return dependencies.map(d => d.prerequisiteTaskId);
  }

  /**
   * Get all dependents for a task
   * Returns tasks that depend on this task being completed
   */
  async getDependents(
    taskId: number,
    userId: number
  ): Promise<number[]> {
    // Verify user has access to the task
    const task = await this.getTaskWithAccess(taskId, userId);
    if (!task) {
      throw new Error('Task not found or access denied');
    }

    // Get all dependencies where this task is the prerequisite
    const dependencies = await db
      .select()
      .from(taskDependencies)
      .where(eq(taskDependencies.prerequisiteTaskId, taskId));

    return dependencies.map(d => d.taskId);
  }

  /**
   * Get all dependencies for a task (both prerequisites and dependents)
   */
  async getTaskDependencies(
    taskId: number,
    userId: number
  ): Promise<{
    prerequisites: number[];
    dependents: number[];
  }> {
    const [prerequisites, dependents] = await Promise.all([
      this.getPrerequisites(taskId, userId),
      this.getDependents(taskId, userId),
    ]);

    return {
      prerequisites,
      dependents,
    };
  }

  /**
   * Validate a potential dependency
   * Checks for circular dependencies before adding
   * 
   * Requirements: 5.6
   */
  async validateDependency(
    taskId: number,
    prerequisiteTaskId: number
  ): Promise<DependencyValidation> {
    const errors: string[] = [];
    const circularDependencies: string[][] = [];

    // Check if adding this dependency would create a cycle
    const cycle = await this.detectCircularDependency(taskId, prerequisiteTaskId);
    
    if (cycle.length > 0) {
      errors.push('Circular dependency detected');
      circularDependencies.push(cycle);
    }

    return {
      isValid: errors.length === 0,
      errors,
      circularDependencies,
    };
  }

  /**
   * Detect circular dependencies using Depth-First Search (DFS)
   * Returns the cycle path if found, empty array otherwise
   * 
   * Algorithm:
   * 1. Start from the prerequisite task
   * 2. Follow all its prerequisites recursively
   * 3. If we reach the original task, we have a cycle
   * 
   * Requirements: 5.6
   */
  async detectCircularDependency(
    taskId: number,
    prerequisiteTaskId: number
  ): Promise<string[]> {
    // Build a graph of all dependencies for the plan
    const task = await db
      .select()
      .from(planTasks)
      .where(eq(planTasks.id, taskId))
      .limit(1);

    if (task.length === 0) {
      return [];
    }

    const planId = task[0].planId;

    // Get all tasks in the plan
    const planTasksData = await db
      .select()
      .from(planTasks)
      .where(eq(planTasks.planId, planId));

    // Get all dependencies in the plan
    const allDependencies = await db
      .select()
      .from(taskDependencies)
      .where(or(
        ...planTasksData.map(t => eq(taskDependencies.taskId, t.id))
      ));

    // Build adjacency list (task -> list of prerequisites)
    const graph = new Map<number, number[]>();
    
    // Initialize graph with all tasks
    for (const t of planTasksData) {
      graph.set(t.id, []);
    }

    // Add existing dependencies
    for (const dep of allDependencies) {
      const prerequisites = graph.get(dep.taskId) || [];
      prerequisites.push(dep.prerequisiteTaskId);
      graph.set(dep.taskId, prerequisites);
    }

    // Add the new dependency we're testing
    const prerequisites = graph.get(taskId) || [];
    prerequisites.push(prerequisiteTaskId);
    graph.set(taskId, prerequisites);

    // Perform DFS to detect cycle
    const visited = new Set<number>();
    const recursionStack = new Set<number>();
    const path: number[] = [];

    const dfs = (currentTaskId: number): boolean => {
      visited.add(currentTaskId);
      recursionStack.add(currentTaskId);
      path.push(currentTaskId);

      const taskPrerequisites = graph.get(currentTaskId) || [];

      for (const prereq of taskPrerequisites) {
        if (!visited.has(prereq)) {
          if (dfs(prereq)) {
            return true; // Cycle found
          }
        } else if (recursionStack.has(prereq)) {
          // Found a cycle - add the prerequisite to complete the cycle
          path.push(prereq);
          return true;
        }
      }

      recursionStack.delete(currentTaskId);
      path.pop();
      return false;
    };

    // Start DFS from the prerequisite task
    // If we can reach the original task, we have a cycle
    if (dfs(prerequisiteTaskId)) {
      // Extract the cycle from the path
      const cycleStartIndex = path.indexOf(path[path.length - 1]);
      const cycle = path.slice(cycleStartIndex);
      
      // Convert task IDs to strings for the return value
      return cycle.map(id => id.toString());
    }

    return [];
  }

  /**
   * Get all dependencies for a plan
   * Returns a map of task ID to its dependencies
   */
  async getPlanDependencies(
    planId: number,
    userId: number
  ): Promise<Map<number, { prerequisites: number[]; dependents: number[] }>> {
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

    // Get all tasks in the plan
    const tasks = await db
      .select()
      .from(planTasks)
      .where(eq(planTasks.planId, planId));

    // Get all dependencies for tasks in this plan
    const dependencies = await db
      .select()
      .from(taskDependencies)
      .where(or(
        ...tasks.map(t => eq(taskDependencies.taskId, t.id))
      ));

    // Build the dependency map
    const dependencyMap = new Map<number, { prerequisites: number[]; dependents: number[] }>();

    // Initialize map with all tasks
    for (const task of tasks) {
      dependencyMap.set(task.id, { prerequisites: [], dependents: [] });
    }

    // Populate dependencies
    for (const dep of dependencies) {
      const taskDeps = dependencyMap.get(dep.taskId);
      if (taskDeps) {
        taskDeps.prerequisites.push(dep.prerequisiteTaskId);
      }

      const prereqDeps = dependencyMap.get(dep.prerequisiteTaskId);
      if (prereqDeps) {
        prereqDeps.dependents.push(dep.taskId);
      }
    }

    return dependencyMap;
  }

  /**
   * Check if a task is blocked by incomplete prerequisites
   * Returns both the blocked status and the incomplete prerequisite tasks
   * 
   * Requirements: 5.5
   */
  async isTaskBlocked(
    taskId: number,
    userId: number
  ): Promise<boolean> {
    const prerequisites = await this.getPrerequisites(taskId, userId);

    if (prerequisites.length === 0) {
      return false;
    }

    // Check if any prerequisites are not completed
    const prerequisiteTasks = await db
      .select()
      .from(planTasks)
      .where(or(
        ...prerequisites.map(id => eq(planTasks.id, id))
      ));

    return prerequisiteTasks.some(task => task.status !== 'completed');
  }

  /**
   * Get incomplete prerequisite tasks for a task
   * Used for displaying warning messages
   * 
   * Requirements: 5.5
   */
  async getIncompletePrerequisites(
    taskId: number,
    userId: number
  ): Promise<typeof planTasks.$inferSelect[]> {
    const prerequisites = await this.getPrerequisites(taskId, userId);

    if (prerequisites.length === 0) {
      return [];
    }

    // Get all prerequisite tasks
    const prerequisiteTasks = await db
      .select()
      .from(planTasks)
      .where(or(
        ...prerequisites.map(id => eq(planTasks.id, id))
      ));

    // Filter to only incomplete tasks
    return prerequisiteTasks.filter(task => task.status !== 'completed');
  }

  /**
   * Get all tasks that are ready to start (no incomplete prerequisites)
   */
  async getReadyTasks(
    planId: number,
    userId: number
  ): Promise<number[]> {
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

    // Get all not started tasks
    const notStartedTasks = await db
      .select()
      .from(planTasks)
      .where(and(
        eq(planTasks.planId, planId),
        eq(planTasks.status, 'not_started')
      ));

    // Filter tasks that have no incomplete prerequisites
    const readyTasks: number[] = [];

    for (const task of notStartedTasks) {
      const isBlocked = await this.isTaskBlocked(task.id, userId);
      if (!isBlocked) {
        readyTasks.push(task.id);
      }
    }

    return readyTasks;
  }

  /**
   * Private helper to get task with access verification
   */
  private async getTaskWithAccess(
    taskId: number,
    userId: number
  ): Promise<typeof planTasks.$inferSelect | null> {
    const [result] = await db
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

    return result?.task || null;
  }
}

// Export singleton instance
export const dependencyService = new DependencyService();
