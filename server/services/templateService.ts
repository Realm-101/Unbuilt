import { db } from '../db';
import { 
  planTemplates,
  actionPlans,
  planPhases,
  planTasks,
  type PlanTemplate,
  type InsertPlanTemplate,
  type ActionPlan,
  type InsertPlanPhase,
  type InsertPlanTask,
} from '@shared/schema';
import { eq, and, desc } from 'drizzle-orm';

/**
 * Template Service
 * Business logic layer for plan template operations
 * Handles CRUD operations, template application, and merging with AI insights
 */
export class TemplateService {
  /**
   * Get all active templates
   * Optionally filter by category
   */
  async getTemplates(category?: string): Promise<PlanTemplate[]> {
    const conditions = [eq(planTemplates.isActive, true)];
    
    if (category) {
      conditions.push(eq(planTemplates.category, category));
    }

    const templates = await db
      .select()
      .from(planTemplates)
      .where(and(...conditions))
      .orderBy(desc(planTemplates.isDefault), planTemplates.name);

    return templates;
  }

  /**
   * Get template by ID
   */
  async getTemplateById(templateId: number): Promise<PlanTemplate | null> {
    const [template] = await db
      .select()
      .from(planTemplates)
      .where(eq(planTemplates.id, templateId))
      .limit(1);

    return template || null;
  }

  /**
   * Get default template
   * Returns the first default template or the first active template
   */
  async getDefaultTemplate(): Promise<PlanTemplate | null> {
    // Try to get a default template
    const [defaultTemplate] = await db
      .select()
      .from(planTemplates)
      .where(and(
        eq(planTemplates.isDefault, true),
        eq(planTemplates.isActive, true)
      ))
      .limit(1);

    if (defaultTemplate) {
      return defaultTemplate;
    }

    // Fallback to first active template
    const [firstTemplate] = await db
      .select()
      .from(planTemplates)
      .where(eq(planTemplates.isActive, true))
      .orderBy(planTemplates.name)
      .limit(1);

    return firstTemplate || null;
  }

  /**
   * Create a new template
   */
  async createTemplate(data: InsertPlanTemplate): Promise<PlanTemplate> {
    const [template] = await db
      .insert(planTemplates)
      .values({
        ...data,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      .returning();

    return template;
  }

  /**
   * Update a template
   */
  async updateTemplate(
    templateId: number,
    updates: Partial<InsertPlanTemplate>
  ): Promise<PlanTemplate> {
    const [template] = await db
      .update(planTemplates)
      .set({
        ...updates,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(planTemplates.id, templateId))
      .returning();

    if (!template) {
      throw new Error('Template not found');
    }

    return template;
  }

  /**
   * Delete a template (soft delete by setting isActive to false)
   */
  async deleteTemplate(templateId: number): Promise<void> {
    await db
      .update(planTemplates)
      .set({
        isActive: false,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(planTemplates.id, templateId));
  }

  /**
   * Apply template to an existing plan
   * Merges template structure with AI-generated insights
   */
  async applyTemplateToPlan(
    planId: number,
    templateId: number,
    userId: number
  ): Promise<ActionPlan> {
    // Get the plan
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

    // Get the template
    const template = await this.getTemplateById(templateId);
    if (!template) {
      throw new Error('Template not found');
    }

    // Delete existing phases and tasks
    await db
      .delete(planTasks)
      .where(eq(planTasks.planId, planId));

    await db
      .delete(planPhases)
      .where(eq(planPhases.planId, planId));

    // Apply template structure
    const templatePhases = template.phases as any[];
    const aiInsights = plan.originalPlan as any;

    for (const templatePhase of templatePhases) {
      // Create phase
      const [phase] = await db
        .insert(planPhases)
        .values({
          planId,
          name: templatePhase.name,
          description: this.enhanceWithAI(templatePhase.description, aiInsights),
          order: templatePhase.order,
          estimatedDuration: templatePhase.estimatedDuration || null,
          isCustom: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })
        .returning();

      // Create tasks for this phase
      const templateTasks = templatePhase.tasks || [];
      for (const templateTask of templateTasks) {
        await db
          .insert(planTasks)
          .values({
            phaseId: phase.id,
            planId,
            title: templateTask.title,
            description: this.enhanceWithAI(templateTask.description, aiInsights),
            estimatedTime: templateTask.estimatedTime || null,
            resources: this.findRelevantResources(templateTask, aiInsights),
            order: templateTask.order,
            status: 'not_started',
            isCustom: false,
            assigneeId: null,
            completedAt: null,
            completedBy: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
      }
    }

    // Update plan with template reference
    const [updatedPlan] = await db
      .update(actionPlans)
      .set({
        templateId,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(actionPlans.id, planId))
      .returning();

    return updatedPlan;
  }

  /**
   * Enhance template content with AI-generated insights
   * Private helper method
   */
  private enhanceWithAI(content: string, aiInsights: any): string {
    // If AI insights contain relevant information, enhance the content
    // This is a simple implementation - can be made more sophisticated
    if (!aiInsights || !content) {
      return content;
    }

    // For now, just return the original content
    // In a more advanced implementation, this could:
    // - Extract relevant insights from AI analysis
    // - Append specific recommendations
    // - Customize based on industry/market
    return content;
  }

  /**
   * Find relevant resources based on task and AI insights
   * Private helper method
   */
  private findRelevantResources(task: any, aiInsights: any): string[] {
    const resources: string[] = task.resources || [];

    // If AI insights contain resource recommendations, add them
    // This is a placeholder for more sophisticated logic
    if (aiInsights?.resources) {
      // Could filter resources based on task type, phase, etc.
      resources.push(...(aiInsights.resources || []));
    }

    return resources;
  }

  /**
   * Get template usage statistics
   */
  async getTemplateUsageStats(templateId: number): Promise<{
    totalUsage: number;
    activeUsage: number;
    completedUsage: number;
  }> {
    const plans = await db
      .select()
      .from(actionPlans)
      .where(eq(actionPlans.templateId, templateId));

    return {
      totalUsage: plans.length,
      activeUsage: plans.filter(p => p.status === 'active').length,
      completedUsage: plans.filter(p => p.status === 'completed').length,
    };
  }
}

// Export singleton instance
export const templateService = new TemplateService();
