/**
 * Action Plan Types
 * 
 * Type definitions for the interactive action plan feature
 */

import type { ActionPlan, PlanPhase, PlanTask } from '@shared/schema';

// Re-export types from shared schema
export type { PlanTask };

/**
 * Action Plan with related data
 */
export interface ActionPlanWithDetails extends ActionPlan {
  phases: PlanPhaseWithTasks[];
}

/**
 * Plan Phase with tasks
 */
export interface PlanPhaseWithTasks extends PlanPhase {
  tasks: PlanTask[];
}

/**
 * Progress metrics for a plan
 * Re-exported from shared schema for convenience
 */
export interface ProgressMetrics {
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  skippedTasks: number;
  completionPercentage: number;
  currentPhase?: string;
  estimatedCompletion?: Date | null;
  velocity?: number; // Tasks per week
  averageTaskTime?: number; // In hours
}

/**
 * Task status type
 */
export type TaskStatus = 'not_started' | 'in_progress' | 'completed' | 'skipped';

/**
 * Plan status type
 */
export type PlanStatus = 'active' | 'completed' | 'archived';

/**
 * Task update payload
 * 
 * Requirements: 5.5 - Dependency warnings with override
 */
export interface TaskUpdate {
  id: number;
  status?: TaskStatus;
  title?: string;
  description?: string;
  estimatedTime?: string;
  order?: number;
  assigneeId?: number | null;
  overridePrerequisites?: boolean;
}

/**
 * Dependency validation result
 */
export interface DependencyValidation {
  isValid: boolean;
  errors: string[];
  circularDependencies: string[][];
}

/**
 * Action plan state for the component
 */
export interface ActionPlanState {
  plan: ActionPlanWithDetails | null;
  progress: ProgressMetrics | null;
  isLoading: boolean;
  error: string | null;
}

/**
 * Recommendation types
 * Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6
 */
export type RecommendationType = 'stuck_task' | 'phase_complete' | 'plan_review' | 'task_tip' | 'fast_progress' | 'timeline_adjustment';
export type RecommendationPriority = 'high' | 'medium' | 'low';

export interface Recommendation {
  id: string;
  type: RecommendationType;
  priority: RecommendationPriority;
  title: string;
  message: string;
  actionable: boolean;
  metadata?: {
    taskId?: number;
    phaseId?: number;
    planId?: number;
    resources?: any[];
    suggestions?: string[];
    [key: string]: any;
  };
  createdAt: Date;
}
