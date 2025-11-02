import { db } from '../db';
import { 
  actionPlans,
  planTasks,
  planPhases,
  progressSnapshots,
  type ProgressMetrics,
  type ProgressSnapshot,
  type InsertProgressSnapshot,
} from '@shared/schema';
import { eq, and, desc, sql, gte } from 'drizzle-orm';

/**
 * Progress Service
 * Business logic layer for progress calculation and analytics
 * Handles real-time metrics, velocity tracking, and historical snapshots
 */
export class ProgressService {
  /**
   * Calculate real-time progress metrics for a plan
   * Returns comprehensive progress data including completion percentage,
   * velocity, and average task time
   */
  async calculateProgress(
    planId: number,
    userId: number
  ): Promise<ProgressMetrics | null> {
    // Verify user has access to the plan
    const [plan] = await db
      .select()
      .from(actionPlans)
      .where(and(
        eq(actionPlans.id, planId),
        eq(actionPlans.userId, userId)
      ))
      .limit(1);

    if (!plan) {
      return null;
    }

    // Get all tasks for the plan
    const tasks = await db
      .select()
      .from(planTasks)
      .where(eq(planTasks.planId, planId));

    // Calculate basic counts
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(t => t.status === 'completed').length;
    const inProgressTasks = tasks.filter(t => t.status === 'in_progress').length;
    const skippedTasks = tasks.filter(t => t.status === 'skipped').length;
    const notStartedTasks = tasks.filter(t => t.status === 'not_started').length;

    // Calculate completion percentage
    const completionPercentage = totalTasks > 0 
      ? Math.round((completedTasks / totalTasks) * 100)
      : 0;

    // Calculate average task time (for completed tasks)
    const averageTaskTime = this.calculateAverageTaskTime(tasks);

    // Calculate velocity (tasks per week)
    const velocity = await this.calculateVelocity(planId, tasks);

    // Determine current phase
    const currentPhase = await this.determineCurrentPhase(planId);

    // Estimate completion date
    const estimatedCompletion = this.estimateCompletion(
      notStartedTasks + inProgressTasks,
      velocity,
      plan.createdAt
    );

    return {
      totalTasks,
      completedTasks,
      inProgressTasks,
      skippedTasks,
      completionPercentage,
      currentPhase,
      estimatedCompletion,
      velocity,
      averageTaskTime,
    };
  }

  /**
   * Calculate average time per task in hours
   * Based on completed tasks with completion timestamps
   */
  private calculateAverageTaskTime(tasks: typeof planTasks.$inferSelect[]): number {
    const completedTasksWithTime = tasks.filter(
      t => t.status === 'completed' && t.completedAt && t.createdAt
    );

    if (completedTasksWithTime.length === 0) {
      return 0;
    }

    const totalHours = completedTasksWithTime.reduce((sum, task) => {
      const created = new Date(task.createdAt).getTime();
      const completed = new Date(task.completedAt!).getTime();
      const hours = (completed - created) / (1000 * 60 * 60);
      return sum + hours;
    }, 0);

    return Math.round(totalHours / completedTasksWithTime.length);
  }

  /**
   * Calculate completion velocity (tasks per week)
   * Based on recent completion history
   */
  private async calculateVelocity(
    planId: number,
    tasks: typeof planTasks.$inferSelect[]
  ): Promise<number> {
    // Get completed tasks from the last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentCompletedTasks = tasks.filter(
      t => t.status === 'completed' && 
           t.completedAt && 
           new Date(t.completedAt) >= thirtyDaysAgo
    );

    if (recentCompletedTasks.length === 0) {
      return 0;
    }

    // Calculate weeks elapsed since first completion
    const firstCompletion = recentCompletedTasks.reduce((earliest, task) => {
      const taskDate = new Date(task.completedAt!);
      return taskDate < earliest ? taskDate : earliest;
    }, new Date(recentCompletedTasks[0].completedAt!));

    const now = new Date();
    const weeksElapsed = (now.getTime() - firstCompletion.getTime()) / (1000 * 60 * 60 * 24 * 7);

    // Avoid division by zero
    if (weeksElapsed < 0.1) {
      return recentCompletedTasks.length; // All completed in less than a week
    }

    return Math.round((recentCompletedTasks.length / weeksElapsed) * 10) / 10; // Round to 1 decimal
  }

  /**
   * Determine the current phase based on task completion
   * Returns the name of the phase currently being worked on
   */
  private async determineCurrentPhase(planId: number): Promise<string | undefined> {
    // Get all phases with their tasks
    const phases = await db
      .select()
      .from(planPhases)
      .where(eq(planPhases.planId, planId))
      .orderBy(planPhases.order);

    for (const phase of phases) {
      // Get tasks for this phase
      const phaseTasks = await db
        .select()
        .from(planTasks)
        .where(eq(planTasks.phaseId, phase.id));

      // Check if phase has incomplete tasks
      const hasIncompleteTasks = phaseTasks.some(
        t => t.status === 'not_started' || t.status === 'in_progress'
      );

      if (hasIncompleteTasks) {
        return phase.name;
      }
    }

    // All phases complete or no phases
    return phases.length > 0 ? phases[phases.length - 1].name : undefined;
  }

  /**
   * Estimate completion date based on velocity
   */
  private estimateCompletion(
    remainingTasks: number,
    velocity: number,
    planCreatedAt: string
  ): Date | null {
    if (remainingTasks === 0) {
      return null; // Already complete
    }

    if (velocity === 0) {
      return null; // No velocity data yet
    }

    const weeksToComplete = remainingTasks / velocity;
    const daysToComplete = weeksToComplete * 7;

    const estimatedDate = new Date();
    estimatedDate.setDate(estimatedDate.getDate() + Math.ceil(daysToComplete));

    return estimatedDate;
  }

  /**
   * Create a progress snapshot for historical tracking
   * Should be called periodically (e.g., daily) or after significant changes
   */
  async createProgressSnapshot(
    planId: number,
    userId: number
  ): Promise<ProgressSnapshot> {
    // Calculate current progress
    const progress = await this.calculateProgress(planId, userId);
    
    if (!progress) {
      throw new Error('Plan not found or access denied');
    }

    // Create snapshot record
    const snapshotData: InsertProgressSnapshot = {
      planId,
      totalTasks: progress.totalTasks,
      completedTasks: progress.completedTasks,
      inProgressTasks: progress.inProgressTasks,
      skippedTasks: progress.skippedTasks,
      completionPercentage: progress.completionPercentage,
      averageTaskTime: progress.averageTaskTime || null,
      velocity: progress.velocity ? Math.round(progress.velocity) : null,
      timestamp: new Date().toISOString(),
    };

    const [snapshot] = await db
      .insert(progressSnapshots)
      .values(snapshotData)
      .returning();

    return snapshot;
  }

  /**
   * Get progress history for a plan
   * Returns snapshots ordered by timestamp
   */
  async getProgressHistory(
    planId: number,
    userId: number,
    limit: number = 30
  ): Promise<ProgressSnapshot[]> {
    // Verify user has access to the plan
    const [plan] = await db
      .select()
      .from(actionPlans)
      .where(and(
        eq(actionPlans.id, planId),
        eq(actionPlans.userId, userId)
      ))
      .limit(1);

    if (!plan) {
      throw new Error('Plan not found or access denied');
    }

    // Get snapshots
    const snapshots = await db
      .select()
      .from(progressSnapshots)
      .where(eq(progressSnapshots.planId, planId))
      .orderBy(desc(progressSnapshots.timestamp))
      .limit(limit);

    return snapshots;
  }

  /**
   * Identify phases taking longer than estimated
   * Returns phases with their estimated vs actual duration
   */
  async identifySlowPhases(
    planId: number,
    userId: number
  ): Promise<Array<{
    phaseId: number;
    phaseName: string;
    estimatedDuration: string | null;
    actualDuration: number; // in days
    isOverdue: boolean;
  }>> {
    // Verify user has access to the plan
    const [plan] = await db
      .select()
      .from(actionPlans)
      .where(and(
        eq(actionPlans.id, planId),
        eq(actionPlans.userId, userId)
      ))
      .limit(1);

    if (!plan) {
      throw new Error('Plan not found or access denied');
    }

    // Get all phases
    const phases = await db
      .select()
      .from(planPhases)
      .where(eq(planPhases.planId, planId))
      .orderBy(planPhases.order);

    const slowPhases = [];

    for (const phase of phases) {
      // Get tasks for this phase
      const phaseTasks = await db
        .select()
        .from(planTasks)
        .where(eq(planTasks.phaseId, phase.id));

      if (phaseTasks.length === 0) {
        continue;
      }

      // Calculate actual duration
      const firstTaskCreated = phaseTasks.reduce((earliest, task) => {
        const taskDate = new Date(task.createdAt);
        return taskDate < earliest ? taskDate : earliest;
      }, new Date(phaseTasks[0].createdAt));

      // Find last completed task or use current date
      const completedTasks = phaseTasks.filter(t => t.status === 'completed' && t.completedAt);
      const lastCompleted = completedTasks.length > 0
        ? completedTasks.reduce((latest, task) => {
            const taskDate = new Date(task.completedAt!);
            return taskDate > latest ? taskDate : latest;
          }, new Date(completedTasks[0].completedAt!))
        : new Date();

      const actualDurationMs = lastCompleted.getTime() - firstTaskCreated.getTime();
      const actualDurationDays = Math.ceil(actualDurationMs / (1000 * 60 * 60 * 24));

      // Parse estimated duration (e.g., "2 weeks" -> 14 days)
      const estimatedDays = this.parseEstimatedDuration(phase.estimatedDuration);

      // Check if phase is taking longer than estimated
      const isOverdue = estimatedDays !== null && actualDurationDays > estimatedDays;

      // Only include phases that are overdue or in progress
      const hasIncompleteTasks = phaseTasks.some(
        t => t.status === 'not_started' || t.status === 'in_progress'
      );

      if (isOverdue || hasIncompleteTasks) {
        slowPhases.push({
          phaseId: phase.id,
          phaseName: phase.name,
          estimatedDuration: phase.estimatedDuration,
          actualDuration: actualDurationDays,
          isOverdue,
        });
      }
    }

    return slowPhases;
  }

  /**
   * Parse estimated duration string to days
   * Supports formats like "2 weeks", "3 days", "1 month"
   */
  private parseEstimatedDuration(duration: string | null): number | null {
    if (!duration) {
      return null;
    }

    const match = duration.match(/(\d+)\s*(day|days|week|weeks|month|months)/i);
    if (!match) {
      return null;
    }

    const value = parseInt(match[1]);
    const unit = match[2].toLowerCase();

    switch (unit) {
      case 'day':
      case 'days':
        return value;
      case 'week':
      case 'weeks':
        return value * 7;
      case 'month':
      case 'months':
        return value * 30; // Approximate
      default:
        return null;
    }
  }

  /**
   * Get progress summary for all active plans for a user
   * Used for dashboard overview
   */
  async getUserProgressSummary(userId: number): Promise<{
    activePlans: number;
    totalTasks: number;
    completedTasks: number;
    overallCompletionPercentage: number;
    averageVelocity: number;
  }> {
    // Get all active plans for user
    const plans = await db
      .select()
      .from(actionPlans)
      .where(and(
        eq(actionPlans.userId, userId),
        eq(actionPlans.status, 'active')
      ));

    if (plans.length === 0) {
      return {
        activePlans: 0,
        totalTasks: 0,
        completedTasks: 0,
        overallCompletionPercentage: 0,
        averageVelocity: 0,
      };
    }

    // Calculate aggregate metrics
    let totalTasks = 0;
    let completedTasks = 0;
    let totalVelocity = 0;
    let plansWithVelocity = 0;

    for (const plan of plans) {
      const progress = await this.calculateProgress(plan.id, userId);
      if (progress) {
        totalTasks += progress.totalTasks;
        completedTasks += progress.completedTasks;
        
        if (progress.velocity && progress.velocity > 0) {
          totalVelocity += progress.velocity;
          plansWithVelocity++;
        }
      }
    }

    const overallCompletionPercentage = totalTasks > 0
      ? Math.round((completedTasks / totalTasks) * 100)
      : 0;

    const averageVelocity = plansWithVelocity > 0
      ? Math.round((totalVelocity / plansWithVelocity) * 10) / 10
      : 0;

    return {
      activePlans: plans.length,
      totalTasks,
      completedTasks,
      overallCompletionPercentage,
      averageVelocity,
    };
  }

  /**
   * Check if a progress snapshot should be created
   * Returns true if no snapshot exists for today
   */
  async shouldCreateSnapshot(planId: number): Promise<boolean> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [recentSnapshot] = await db
      .select()
      .from(progressSnapshots)
      .where(and(
        eq(progressSnapshots.planId, planId),
        gte(progressSnapshots.timestamp, today.toISOString())
      ))
      .limit(1);

    return !recentSnapshot;
  }
}

// Export singleton instance
export const progressService = new ProgressService();
