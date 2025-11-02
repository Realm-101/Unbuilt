import { db } from '../db';
import { 
  actionPlans, 
  planPhases, 
  planTasks,
  searches,
  type ActionPlan,
  type InsertActionPlan,
  type PlanPhase,
  type InsertPlanPhase,
  type PlanTask,
  type InsertPlanTask,
} from '@shared/schema';
import { eq, and, desc } from 'drizzle-orm';
import { cacheService } from './cacheService';
import { queryOptimizer, invalidatePlanCache, invalidateUserPlansCache } from './queryOptimizer';
import { withQueryTracking } from './dbPerformanceMonitor';

/**
 * Plan Service
 * Business logic layer for action plan operations
 * Handles CRUD operations, versioning, and status management
 */
export class PlanService {
  /**
   * Create a new action plan
   * Simplified method for creating plans with basic data
   */
  async createPlan(data: {
    searchId: number;
    userId: number;
    templateId?: string | null;
    title: string;
    description: string;
  }): Promise<ActionPlan> {
    // Verify search exists and belongs to user
    const search = await db
      .select()
      .from(searches)
      .where(and(
        eq(searches.id, data.searchId),
        eq(searches.userId, data.userId)
      ))
      .limit(1);

    if (search.length === 0) {
      throw new Error('Search not found or access denied');
    }

    // Check if plan already exists for this search
    const existingPlan = await db
      .select()
      .from(actionPlans)
      .where(and(
        eq(actionPlans.searchId, data.searchId),
        eq(actionPlans.userId, data.userId)
      ))
      .limit(1);

    if (existingPlan.length > 0) {
      throw new Error('Action plan already exists for this search');
    }

    // Create the action plan
    const planData: InsertActionPlan = {
      searchId: data.searchId,
      userId: data.userId,
      templateId: data.templateId ? parseInt(data.templateId) : null,
      title: data.title,
      description: data.description || null,
      status: 'active',
      originalPlan: {}, // Empty initially, will be populated when AI generates content
      customizations: {}, // Empty initially
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const [newPlan] = await db
      .insert(actionPlans)
      .values(planData)
      .returning();

    return newPlan;
  }

  /**
   * Create a new action plan from search results
   * Preserves the original AI-generated content in originalPlan field
   */
  async createPlanFromSearch(
    searchId: number,
    userId: number,
    title: string,
    description: string | null,
    aiGeneratedPlan: any,
    templateId?: number
  ): Promise<ActionPlan> {
    // Verify search exists and belongs to user
    const search = await db
      .select()
      .from(searches)
      .where(and(
        eq(searches.id, searchId),
        eq(searches.userId, userId)
      ))
      .limit(1);

    if (search.length === 0) {
      throw new Error('Search not found or access denied');
    }

    // Check if plan already exists for this search
    const existingPlan = await db
      .select()
      .from(actionPlans)
      .where(and(
        eq(actionPlans.searchId, searchId),
        eq(actionPlans.userId, userId)
      ))
      .limit(1);

    if (existingPlan.length > 0) {
      throw new Error('Action plan already exists for this search');
    }

    // Create the action plan
    const planData: InsertActionPlan = {
      searchId,
      userId,
      templateId: templateId || null,
      title,
      description: description || null,
      status: 'active',
      originalPlan: aiGeneratedPlan, // Store immutable AI-generated content
      customizations: {}, // Empty initially
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const [newPlan] = await db
      .insert(actionPlans)
      .values(planData)
      .returning();

    return newPlan;
  }

  /**
   * Get action plan by ID
   * Verifies user has access to the plan
   */
  async getPlanById(planId: number, userId?: number): Promise<ActionPlan | null> {
    const cacheKey = cacheService.keys.plan(planId);
    
    return cacheService.getOrSet(
      cacheKey,
      async () => {
        const conditions = [eq(actionPlans.id, planId)];
        
        if (userId !== undefined) {
          conditions.push(eq(actionPlans.userId, userId));
        }

        const [plan] = await withQueryTracking(
          () => db
            .select()
            .from(actionPlans)
            .where(and(...conditions))
            .limit(1),
          'getPlanById'
        );

        return plan || null;
      },
      { ttl: cacheService.ttl.default }
    );
  }

  /**
   * Get phase by ID
   */
  async getPhaseById(phaseId: number): Promise<PlanPhase | null> {
    const [phase] = await db
      .select()
      .from(planPhases)
      .where(eq(planPhases.id, phaseId))
      .limit(1);

    return phase || null;
  }

  /**
   * Get action plan by search ID
   * Returns the plan associated with a specific search
   */
  async getPlanBySearchId(searchId: number, userId: number): Promise<ActionPlan | null> {
    const [plan] = await db
      .select()
      .from(actionPlans)
      .where(and(
        eq(actionPlans.searchId, searchId),
        eq(actionPlans.userId, userId)
      ))
      .limit(1);

    return plan || null;
  }

  /**
   * Get all plans for a user
   * Optionally filter by status
   */
  async getUserPlans(
    userId: number,
    status?: 'active' | 'completed' | 'archived'
  ): Promise<ActionPlan[]> {
    const cacheKey = cacheService.keys.userPlans(userId, status);
    
    return cacheService.getOrSet(
      cacheKey,
      async () => {
        const conditions = [eq(actionPlans.userId, userId)];
        
        if (status) {
          conditions.push(eq(actionPlans.status, status));
        }

        const plans = await withQueryTracking(
          () => db
            .select()
            .from(actionPlans)
            .where(and(...conditions))
            .orderBy(desc(actionPlans.updatedAt)),
          'getUserPlans'
        );

        return plans;
      },
      { ttl: cacheService.ttl.short }
    );
  }

  /**
   * Update plan (metadata and/or status)
   * Combines metadata and status updates into one method
   */
  async updatePlan(
    planId: number,
    updates: {
      title?: string;
      description?: string;
      status?: 'active' | 'completed' | 'archived';
    }
  ): Promise<ActionPlan> {
    // Get the plan (without userId check since we verify ownership in middleware)
    const plan = await this.getPlanById(planId);
    if (!plan) {
      throw new Error('Plan not found');
    }

    const updateData: Partial<InsertActionPlan> = {
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    // Set completedAt timestamp when marking as completed
    if (updates.status === 'completed' && plan.status !== 'completed') {
      updateData.completedAt = new Date().toISOString();
    }

    // Clear completedAt if moving back to active
    if (updates.status === 'active' && plan.status === 'completed') {
      updateData.completedAt = null;
    }

    const [updatedPlan] = await withQueryTracking(
      () => db
        .update(actionPlans)
        .set(updateData)
        .where(eq(actionPlans.id, planId))
        .returning(),
      'updatePlan'
    );

    // Invalidate cache
    await invalidatePlanCache(planId);
    await invalidateUserPlansCache(plan.userId);

    return updatedPlan;
  }

  /**
   * Update plan metadata (title, description)
   * Preserves original plan and tracks customizations
   */
  async updatePlanMetadata(
    planId: number,
    userId: number,
    updates: {
      title?: string;
      description?: string | null;
    }
  ): Promise<ActionPlan> {
    // Verify plan exists and user has access
    const plan = await this.getPlanById(planId, userId);
    if (!plan) {
      throw new Error('Plan not found or access denied');
    }

    // Update the plan
    const [updatedPlan] = await db
      .update(actionPlans)
      .set({
        ...updates,
        updatedAt: new Date().toISOString(),
      })
      .where(and(
        eq(actionPlans.id, planId),
        eq(actionPlans.userId, userId)
      ))
      .returning();

    return updatedPlan;
  }

  /**
   * Update plan status (active, completed, archived)
   * Sets completedAt timestamp when status changes to completed
   */
  async updatePlanStatus(
    planId: number,
    userId: number,
    status: 'active' | 'completed' | 'archived'
  ): Promise<ActionPlan> {
    // Verify plan exists and user has access
    const plan = await this.getPlanById(planId, userId);
    if (!plan) {
      throw new Error('Plan not found or access denied');
    }

    const updateData: Partial<InsertActionPlan> = {
      status,
      updatedAt: new Date().toISOString(),
    };

    // Set completedAt timestamp when marking as completed
    if (status === 'completed' && plan.status !== 'completed') {
      updateData.completedAt = new Date().toISOString();
    }

    // Clear completedAt if moving back to active
    if (status === 'active' && plan.status === 'completed') {
      updateData.completedAt = null;
    }

    const [updatedPlan] = await db
      .update(actionPlans)
      .set(updateData)
      .where(and(
        eq(actionPlans.id, planId),
        eq(actionPlans.userId, userId)
      ))
      .returning();

    return updatedPlan;
  }

  /**
   * Update plan customizations
   * Preserves original AI-generated plan while tracking user modifications
   */
  async updatePlanCustomizations(
    planId: number,
    userId: number,
    customizations: Record<string, any>
  ): Promise<ActionPlan> {
    // Verify plan exists and user has access
    const plan = await this.getPlanById(planId, userId);
    if (!plan) {
      throw new Error('Plan not found or access denied');
    }

    // Merge new customizations with existing ones
    const updatedCustomizations = {
      ...(plan.customizations as Record<string, any>),
      ...customizations,
    };

    const [updatedPlan] = await db
      .update(actionPlans)
      .set({
        customizations: updatedCustomizations,
        updatedAt: new Date().toISOString(),
      })
      .where(and(
        eq(actionPlans.id, planId),
        eq(actionPlans.userId, userId)
      ))
      .returning();

    return updatedPlan;
  }

  /**
   * Delete an action plan
   * Also deletes associated phases and tasks (cascade)
   */
  async deletePlan(planId: number, userId: number): Promise<void> {
    // Verify plan exists and user has access
    const plan = await this.getPlanById(planId, userId);
    if (!plan) {
      throw new Error('Plan not found or access denied');
    }

    // Delete the plan (cascade will handle phases and tasks)
    await db
      .delete(actionPlans)
      .where(and(
        eq(actionPlans.id, planId),
        eq(actionPlans.userId, userId)
      ));
  }

  /**
   * Get plan with phases and tasks
   * Returns complete plan structure
   */
  async getPlanWithDetails(
    planId: number,
    userId: number
  ): Promise<{
    plan: ActionPlan;
    phases: Array<PlanPhase & { tasks: PlanTask[] }>;
  } | null> {
    // Get the plan
    const plan = await this.getPlanById(planId, userId);
    if (!plan) {
      return null;
    }

    // Get phases
    const phases = await db
      .select()
      .from(planPhases)
      .where(eq(planPhases.planId, planId))
      .orderBy(planPhases.order);

    // Get tasks for each phase
    const phasesWithTasks = await Promise.all(
      phases.map(async (phase) => {
        const tasks = await db
          .select()
          .from(planTasks)
          .where(eq(planTasks.phaseId, phase.id))
          .orderBy(planTasks.order);

        return {
          ...phase,
          tasks,
        };
      })
    );

    return {
      plan,
      phases: phasesWithTasks,
    };
  }

  /**
   * Get phases with tasks for a plan
   * Used for export functionality (assumes ownership already verified)
   */
  async getPhasesWithTasks(planId: number): Promise<Array<PlanPhase & { tasks: PlanTask[] }>> {
    // Get phases
    const phases = await db
      .select()
      .from(planPhases)
      .where(eq(planPhases.planId, planId))
      .orderBy(planPhases.order);

    // Get tasks for each phase
    const phasesWithTasks = await Promise.all(
      phases.map(async (phase) => {
        const tasks = await db
          .select()
          .from(planTasks)
          .where(eq(planTasks.phaseId, phase.id))
          .orderBy(planTasks.order);

        return {
          ...phase,
          tasks,
        };
      })
    );

    return phasesWithTasks;
  }

  /**
   * Check if user has access to a plan
   */
  async hasAccess(planId: number, userId: number): Promise<boolean> {
    const plan = await this.getPlanById(planId, userId);
    return plan !== null;
  }

  /**
   * Get plan statistics
   * Returns counts and completion metrics
   */
  async getPlanStatistics(planId: number, userId: number): Promise<{
    totalPhases: number;
    totalTasks: number;
    completedTasks: number;
    inProgressTasks: number;
    notStartedTasks: number;
    skippedTasks: number;
    completionPercentage: number;
  } | null> {
    // Verify access
    const plan = await this.getPlanById(planId, userId);
    if (!plan) {
      return null;
    }

    // Get all tasks for the plan
    const tasks = await db
      .select()
      .from(planTasks)
      .where(eq(planTasks.planId, planId));

    // Get phase count
    const phases = await db
      .select()
      .from(planPhases)
      .where(eq(planPhases.planId, planId));

    // Calculate statistics
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(t => t.status === 'completed').length;
    const inProgressTasks = tasks.filter(t => t.status === 'in_progress').length;
    const notStartedTasks = tasks.filter(t => t.status === 'not_started').length;
    const skippedTasks = tasks.filter(t => t.status === 'skipped').length;
    
    const completionPercentage = totalTasks > 0 
      ? Math.round((completedTasks / totalTasks) * 100)
      : 0;

    return {
      totalPhases: phases.length,
      totalTasks,
      completedTasks,
      inProgressTasks,
      notStartedTasks,
      skippedTasks,
      completionPercentage,
    };
  }

  /**
   * Restore original AI-generated plan
   * Resets customizations while preserving the original plan
   */
  async restoreOriginalPlan(planId: number, userId: number): Promise<ActionPlan> {
    // Verify plan exists and user has access
    const plan = await this.getPlanById(planId, userId);
    if (!plan) {
      throw new Error('Plan not found or access denied');
    }

    // Clear customizations
    const [updatedPlan] = await db
      .update(actionPlans)
      .set({
        customizations: {},
        updatedAt: new Date().toISOString(),
      })
      .where(and(
        eq(actionPlans.id, planId),
        eq(actionPlans.userId, userId)
      ))
      .returning();

    return updatedPlan;
  }
}

// Export singleton instance
export const planService = new PlanService();
