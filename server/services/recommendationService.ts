import { db } from '../db';
import { 
  planTasks,
  planPhases,
  actionPlans,
  resources,
  resourceCategories,
  type PlanTask,
  type PlanPhase,
  type Resource,
} from '@shared/schema';
import { eq, and, lt, gte, desc, sql } from 'drizzle-orm';

/**
 * Recommendation types
 */
export interface Recommendation {
  id: string;
  type: 'stuck_task' | 'phase_complete' | 'plan_review' | 'task_tip';
  priority: 'high' | 'medium' | 'low';
  title: string;
  message: string;
  actionable: boolean;
  metadata?: {
    taskId?: number;
    phaseId?: number;
    planId?: number;
    resources?: Resource[];
    suggestions?: string[];
    [key: string]: any;
  };
  createdAt: Date;
}

/**
 * Task tips by category/type
 */
const TASK_TIPS: Record<string, string[]> = {
  research: [
    'Start with secondary research (online sources, reports) before conducting primary research',
    'Use tools like Google Trends, SimilarWeb, and industry reports to validate market size',
    'Interview at least 10-15 potential customers to get meaningful insights',
    'Document all research findings in a centralized location for easy reference',
  ],
  validation: [
    'Create a simple landing page to test demand before building the full product',
    'Use surveys and polls to validate assumptions quickly and cost-effectively',
    'Run small paid ad campaigns to test messaging and gauge interest',
    'Build a minimum viable product (MVP) to test core functionality with real users',
  ],
  development: [
    'Break large development tasks into smaller, manageable chunks (2-3 days each)',
    'Use agile methodologies with short sprints to maintain momentum',
    'Prioritize features based on user value and technical complexity',
    'Set up continuous integration/deployment early to streamline releases',
  ],
  launch: [
    'Create a pre-launch email list to build anticipation',
    'Prepare press releases and reach out to relevant media outlets',
    'Leverage social media and content marketing to generate buzz',
    'Have a clear launch day plan with specific goals and metrics',
  ],
  marketing: [
    'Focus on one or two marketing channels initially rather than spreading thin',
    'Create valuable content that addresses your target audience\'s pain points',
    'Use analytics to track what\'s working and double down on successful tactics',
    'Build partnerships with complementary businesses for cross-promotion',
  ],
  sales: [
    'Develop a clear value proposition that resonates with your target customers',
    'Create a sales process with defined stages and conversion metrics',
    'Use CRM tools to track leads and follow-ups systematically',
    'Practice your pitch and refine it based on customer feedback',
  ],
  operations: [
    'Document all processes and procedures for consistency and scalability',
    'Automate repetitive tasks wherever possible to save time',
    'Set up key performance indicators (KPIs) to monitor business health',
    'Build systems that can scale as your business grows',
  ],
  finance: [
    'Separate personal and business finances from day one',
    'Track all expenses meticulously for tax purposes and financial planning',
    'Create financial projections with conservative, realistic, and optimistic scenarios',
    'Maintain a cash reserve for unexpected expenses or opportunities',
  ],
};

/**
 * Recommendation Service
 * Generates smart recommendations based on plan progress and user behavior
 * 
 * Requirements: 8.1, 8.2, 8.3, 8.4
 */
export class RecommendationService {
  /**
   * Get all recommendations for a plan
   * Combines all recommendation types
   */
  async getRecommendationsForPlan(
    planId: number,
    userId: number
  ): Promise<Recommendation[]> {
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

    const recommendations: Recommendation[] = [];

    // Get all recommendation types
    const [
      stuckTaskRecs,
      phaseCompleteRecs,
      planReviewRecs,
      taskTipRecs,
    ] = await Promise.all([
      this.detectStuckTasks(planId),
      this.recommendResourcesForCompletedPhases(planId),
      this.detectPlanReviewNeeded(planId),
      this.generateTaskTips(planId),
    ]);

    recommendations.push(
      ...stuckTaskRecs,
      ...phaseCompleteRecs,
      ...planReviewRecs,
      ...taskTipRecs
    );

    // Sort by priority (high -> medium -> low) and then by creation date
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    recommendations.sort((a, b) => {
      const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
      if (priorityDiff !== 0) return priorityDiff;
      return b.createdAt.getTime() - a.createdAt.getTime();
    });

    return recommendations;
  }

  /**
   * Detect tasks stuck for >7 days
   * Requirement: 8.1
   */
  async detectStuckTasks(planId: number): Promise<Recommendation[]> {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // Find tasks that are in_progress for more than 7 days
    const stuckTasks = await db
      .select()
      .from(planTasks)
      .where(and(
        eq(planTasks.planId, planId),
        eq(planTasks.status, 'in_progress'),
        lt(planTasks.updatedAt, sevenDaysAgo.toISOString())
      ));

    const recommendations: Recommendation[] = [];

    for (const task of stuckTasks) {
      const daysSinceUpdate = Math.floor(
        (Date.now() - new Date(task.updatedAt).getTime()) / (1000 * 60 * 60 * 24)
      );

      recommendations.push({
        id: `stuck-task-${task.id}`,
        type: 'stuck_task',
        priority: daysSinceUpdate > 14 ? 'high' : 'medium',
        title: 'Task Appears Stuck',
        message: `"${task.title}" has been in progress for ${daysSinceUpdate} days. Consider breaking it into smaller subtasks or reassessing the approach.`,
        actionable: true,
        metadata: {
          taskId: task.id,
          planId: task.planId,
          phaseId: task.phaseId,
          daysSinceUpdate,
          suggestions: [
            'Break the task into 2-3 smaller, more manageable subtasks',
            'Review if you have all the resources and information needed',
            'Consider if the task scope needs to be adjusted',
            'Reach out for help or collaboration if you\'re blocked',
          ],
        },
        createdAt: new Date(),
      });
    }

    return recommendations;
  }

  /**
   * Recommend resources when phase completes
   * Requirement: 8.2
   */
  async recommendResourcesForCompletedPhases(
    planId: number
  ): Promise<Recommendation[]> {
    // Get all phases for the plan
    const phases = await db
      .select()
      .from(planPhases)
      .where(eq(planPhases.planId, planId))
      .orderBy(planPhases.order);

    const recommendations: Recommendation[] = [];

    for (const phase of phases) {
      // Get all tasks for this phase
      const tasks = await db
        .select()
        .from(planTasks)
        .where(eq(planTasks.phaseId, phase.id));

      // Check if phase is completed (all tasks completed or skipped)
      const allTasksComplete = tasks.every(
        t => t.status === 'completed' || t.status === 'skipped'
      );

      if (!allTasksComplete || tasks.length === 0) {
        continue;
      }

      // Check if there's a next phase
      const nextPhase = phases.find(p => p.order === phase.order + 1);
      if (!nextPhase) {
        continue; // No next phase, skip recommendation
      }

      // Get relevant resources for the next phase
      const relevantResources = await this.getResourcesForPhase(nextPhase.name);

      if (relevantResources.length > 0) {
        recommendations.push({
          id: `phase-complete-${phase.id}`,
          type: 'phase_complete',
          priority: 'medium',
          title: `${phase.name} Complete! 🎉`,
          message: `Great job completing ${phase.name}! Here are some resources to help you with the next phase: ${nextPhase.name}`,
          actionable: true,
          metadata: {
            phaseId: phase.id,
            planId: phase.planId,
            nextPhaseId: nextPhase.id,
            nextPhaseName: nextPhase.name,
            resources: relevantResources,
          },
          createdAt: new Date(),
        });
      }
    }

    return recommendations;
  }

  /**
   * Detect multiple skipped tasks and prompt plan review
   * Requirement: 8.3
   */
  async detectPlanReviewNeeded(planId: number): Promise<Recommendation[]> {
    const recommendations: Recommendation[] = [];

    // Get all tasks for the plan
    const tasks = await db
      .select()
      .from(planTasks)
      .where(eq(planTasks.planId, planId));

    const skippedTasks = tasks.filter(t => t.status === 'skipped');
    const totalTasks = tasks.length;
    const skippedPercentage = totalTasks > 0 
      ? (skippedTasks.length / totalTasks) * 100 
      : 0;

    // If more than 20% of tasks are skipped, recommend plan review
    if (skippedPercentage > 20 && skippedTasks.length >= 3) {
      recommendations.push({
        id: `plan-review-${planId}`,
        type: 'plan_review',
        priority: 'high',
        title: 'Plan Review Recommended',
        message: `You've skipped ${skippedTasks.length} tasks (${Math.round(skippedPercentage)}% of your plan). Consider reviewing your action plan to ensure it aligns with your current goals and resources.`,
        actionable: true,
        metadata: {
          planId,
          skippedCount: skippedTasks.length,
          totalTasks,
          skippedPercentage: Math.round(skippedPercentage),
          skippedTasks: skippedTasks.map(t => ({
            id: t.id,
            title: t.title,
            phaseId: t.phaseId,
          })),
          suggestions: [
            'Review skipped tasks to see if they\'re still relevant',
            'Consider if your plan needs to be adjusted based on new learnings',
            'Delete tasks that are no longer applicable to your goals',
            'Add new tasks that better reflect your current direction',
          ],
        },
        createdAt: new Date(),
      });
    }

    // Also check for phases with all tasks skipped
    const phases = await db
      .select()
      .from(planPhases)
      .where(eq(planPhases.planId, planId));

    for (const phase of phases) {
      const phaseTasks = tasks.filter(t => t.phaseId === phase.id);
      const phaseSkippedTasks = phaseTasks.filter(t => t.status === 'skipped');

      if (phaseTasks.length > 0 && phaseSkippedTasks.length === phaseTasks.length) {
        recommendations.push({
          id: `phase-review-${phase.id}`,
          type: 'plan_review',
          priority: 'medium',
          title: `${phase.name} Phase Skipped`,
          message: `All tasks in ${phase.name} have been skipped. Consider if this phase is still relevant to your plan or if it needs to be restructured.`,
          actionable: true,
          metadata: {
            planId,
            phaseId: phase.id,
            phaseName: phase.name,
            suggestions: [
              'Review if this phase is necessary for your current goals',
              'Consider merging this phase with another if tasks overlap',
              'Delete the phase if it\'s no longer relevant',
              'Restructure tasks to make them more actionable',
            ],
          },
          createdAt: new Date(),
        });
      }
    }

    return recommendations;
  }

  /**
   * Generate tips and best practices for task types
   * Requirement: 8.4
   */
  async generateTaskTips(planId: number): Promise<Recommendation[]> {
    const recommendations: Recommendation[] = [];

    // Get current in-progress or not-started tasks
    const activeTasks = await db
      .select()
      .from(planTasks)
      .where(and(
        eq(planTasks.planId, planId),
        sql`${planTasks.status} IN ('not_started', 'in_progress')`
      ))
      .orderBy(planTasks.order)
      .limit(5); // Only get tips for next 5 tasks

    for (const task of activeTasks) {
      // Determine task category based on title/description keywords
      const taskText = `${task.title} ${task.description || ''}`.toLowerCase();
      let category: string | null = null;
      let tips: string[] = [];

      // Match task to category
      for (const [cat, catTips] of Object.entries(TASK_TIPS)) {
        if (taskText.includes(cat)) {
          category = cat;
          tips = catTips;
          break;
        }
      }

      // If no specific category match, provide general tips
      if (!category) {
        // Check for common keywords
        if (taskText.includes('research') || taskText.includes('analyze') || taskText.includes('study')) {
          category = 'research';
          tips = TASK_TIPS.research;
        } else if (taskText.includes('test') || taskText.includes('validate') || taskText.includes('prototype')) {
          category = 'validation';
          tips = TASK_TIPS.validation;
        } else if (taskText.includes('build') || taskText.includes('develop') || taskText.includes('create')) {
          category = 'development';
          tips = TASK_TIPS.development;
        } else if (taskText.includes('launch') || taskText.includes('release')) {
          category = 'launch';
          tips = TASK_TIPS.launch;
        } else if (taskText.includes('market') || taskText.includes('promote') || taskText.includes('advertise')) {
          category = 'marketing';
          tips = TASK_TIPS.marketing;
        } else if (taskText.includes('sell') || taskText.includes('sales') || taskText.includes('customer')) {
          category = 'sales';
          tips = TASK_TIPS.sales;
        } else if (taskText.includes('process') || taskText.includes('system') || taskText.includes('workflow')) {
          category = 'operations';
          tips = TASK_TIPS.operations;
        } else if (taskText.includes('budget') || taskText.includes('finance') || taskText.includes('cost')) {
          category = 'finance';
          tips = TASK_TIPS.finance;
        }
      }

      if (category && tips.length > 0) {
        // Pick a random tip from the category
        const randomTip = tips[Math.floor(Math.random() * tips.length)];

        recommendations.push({
          id: `task-tip-${task.id}`,
          type: 'task_tip',
          priority: 'low',
          title: `Tip for "${task.title}"`,
          message: randomTip,
          actionable: false,
          metadata: {
            taskId: task.id,
            planId: task.planId,
            category,
            allTips: tips,
          },
          createdAt: new Date(),
        });
      }
    }

    return recommendations;
  }

  /**
   * Get resources relevant to a phase
   * Helper method to fetch resources from the business tools library
   */
  private async getResourcesForPhase(phaseName: string): Promise<Resource[]> {
    // Map phase names to resource phase relevance
    const phaseMapping: Record<string, string[]> = {
      'research': ['research'],
      'validation': ['validation', 'research'],
      'development': ['development'],
      'prototype': ['development', 'validation'],
      'mvp': ['development'],
      'launch': ['launch'],
      'marketing': ['launch'],
      'growth': ['launch'],
    };

    // Determine which phase relevance to search for
    const phaseLower = phaseName.toLowerCase();
    let phaseRelevance: string[] = [];

    for (const [key, values] of Object.entries(phaseMapping)) {
      if (phaseLower.includes(key)) {
        phaseRelevance = values;
        break;
      }
    }

    if (phaseRelevance.length === 0) {
      // Default to general resources
      phaseRelevance = ['research', 'validation', 'development', 'launch'];
    }

    // Query resources that match the phase relevance
    const relevantResources = await db
      .select()
      .from(resources)
      .where(and(
        eq(resources.isActive, true),
        sql`${resources.phaseRelevance}::jsonb ?| array[${phaseRelevance.map(p => `'${p}'`).join(',')}]`
      ))
      .orderBy(desc(resources.averageRating), desc(resources.viewCount))
      .limit(5);

    return relevantResources;
  }

  /**
   * Dismiss a recommendation
   * (For future implementation - could store dismissed recommendations in DB)
   */
  async dismissRecommendation(
    recommendationId: string,
    userId: number
  ): Promise<void> {
    // TODO: Implement persistence of dismissed recommendations
    // For now, this is a no-op as recommendations are generated on-demand
    console.log(`User ${userId} dismissed recommendation ${recommendationId}`);
  }

  /**
   * Get recommendation statistics for a plan
   * Useful for analytics and monitoring
   */
  async getRecommendationStats(
    planId: number,
    userId: number
  ): Promise<{
    totalRecommendations: number;
    byType: Record<string, number>;
    byPriority: Record<string, number>;
  }> {
    const recommendations = await this.getRecommendationsForPlan(planId, userId);

    const byType: Record<string, number> = {};
    const byPriority: Record<string, number> = {};

    for (const rec of recommendations) {
      byType[rec.type] = (byType[rec.type] || 0) + 1;
      byPriority[rec.priority] = (byPriority[rec.priority] || 0) + 1;
    }

    return {
      totalRecommendations: recommendations.length,
      byType,
      byPriority,
    };
  }
}

// Export singleton instance
export const recommendationService = new RecommendationService();
