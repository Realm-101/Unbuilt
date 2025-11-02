/**
 * PlanFactory - Test Data Factory for Action Plans
 * 
 * Provides methods to create, persist, and cleanup test action plans for integration testing.
 * 
 * Requirements: All action plan customization requirements
 */

import { db } from '../../db';
import { actionPlans, planPhases, planTasks, taskDependencies } from '@shared/schema';
import { eq, and } from 'drizzle-orm';

export interface TestPlan {
  id?: number;
  searchId: number;
  userId: number;
  templateId?: number | null;
  title: string;
  description?: string;
  status?: 'active' | 'completed' | 'archived';
  originalPlan?: any;
  customizations?: any;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface TestPhase {
  id?: number;
  planId: number;
  name: string;
  description?: string;
  order: number;
  estimatedDuration?: string;
  isCustom?: boolean;
}

export interface TestTask {
  id?: number;
  phaseId: number;
  planId: number;
  title: string;
  description?: string;
  estimatedTime?: string;
  resources?: string[];
  order: number;
  status?: 'not_started' | 'in_progress' | 'completed' | 'skipped';
  isCustom?: boolean;
  assigneeId?: number | null;
  completedAt?: Date | null;
  completedBy?: number | null;
}

export interface TestDependency {
  id?: number;
  taskId: number;
  prerequisiteTaskId: number;
}

export class PlanFactory {
  private static counter = 0;

  /**
   * Create a test plan with defaults and optional overrides
   */
  static create(overrides: Partial<TestPlan> = {}): TestPlan {
    const counter = ++this.counter;
    
    return {
      searchId: overrides.searchId || 1,
      userId: overrides.userId || 1,
      templateId: overrides.templateId || null,
      title: `Test Plan ${counter}`,
      description: `Test plan description ${counter}`,
      status: 'active',
      originalPlan: {},
      customizations: {},
      ...overrides,
    };
  }

  /**
   * Persist a test plan to the database
   */
  static async persist(plan: TestPlan): Promise<TestPlan> {
    try {
      const result = await db.insert(actionPlans).values({
        searchId: plan.searchId,
        userId: plan.userId,
        templateId: plan.templateId || null,
        title: plan.title,
        description: plan.description || '',
        status: plan.status || 'active',
        originalPlan: plan.originalPlan || {},
        customizations: plan.customizations || {},
        createdAt: plan.createdAt || new Date(),
        updatedAt: plan.updatedAt || new Date(),
      }).returning();
      
      return {
        ...plan,
        id: result[0].id,
      };
    } catch (error) {
      console.error('Failed to persist test plan:', error);
      throw error;
    }
  }

  /**
   * Create and persist a test plan in one step
   */
  static async createAndPersist(overrides: Partial<TestPlan> = {}): Promise<TestPlan> {
    const plan = this.create(overrides);
    return await this.persist(plan);
  }

  /**
   * Create a test phase
   */
  static createPhase(overrides: Partial<TestPhase> = {}): TestPhase {
    const counter = ++this.counter;
    
    return {
      planId: overrides.planId || 1,
      name: `Phase ${counter}`,
      description: `Phase description ${counter}`,
      order: overrides.order !== undefined ? overrides.order : counter,
      estimatedDuration: '2 weeks',
      isCustom: false,
      ...overrides,
    };
  }

  /**
   * Persist a test phase to the database
   */
  static async persistPhase(phase: TestPhase): Promise<TestPhase> {
    try {
      const result = await db.insert(planPhases).values({
        planId: phase.planId,
        name: phase.name,
        description: phase.description || '',
        order: phase.order,
        estimatedDuration: phase.estimatedDuration || '',
        isCustom: phase.isCustom || false,
        createdAt: new Date(),
        updatedAt: new Date(),
      }).returning();
      
      return {
        ...phase,
        id: result[0].id,
      };
    } catch (error) {
      console.error('Failed to persist test phase:', error);
      throw error;
    }
  }

  /**
   * Create a test task
   */
  static createTask(overrides: Partial<TestTask> = {}): TestTask {
    const counter = ++this.counter;
    
    return {
      phaseId: overrides.phaseId || 1,
      planId: overrides.planId || 1,
      title: `Task ${counter}`,
      description: `Task description ${counter}`,
      estimatedTime: '2 hours',
      resources: [],
      order: overrides.order !== undefined ? overrides.order : counter,
      status: 'not_started',
      isCustom: false,
      assigneeId: null,
      completedAt: null,
      completedBy: null,
      ...overrides,
    };
  }

  /**
   * Persist a test task to the database
   */
  static async persistTask(task: TestTask): Promise<TestTask> {
    try {
      const result = await db.insert(planTasks).values({
        phaseId: task.phaseId,
        planId: task.planId,
        title: task.title,
        description: task.description || '',
        estimatedTime: task.estimatedTime || '',
        resources: task.resources || [],
        order: task.order,
        status: task.status || 'not_started',
        isCustom: task.isCustom || false,
        assigneeId: task.assigneeId || null,
        completedAt: task.completedAt || null,
        completedBy: task.completedBy || null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }).returning();
      
      return {
        ...task,
        id: result[0].id,
      };
    } catch (error) {
      console.error('Failed to persist test task:', error);
      throw error;
    }
  }

  /**
   * Create a test dependency
   */
  static createDependency(overrides: Partial<TestDependency> = {}): TestDependency {
    return {
      taskId: overrides.taskId || 1,
      prerequisiteTaskId: overrides.prerequisiteTaskId || 1,
      ...overrides,
    };
  }

  /**
   * Persist a test dependency to the database
   */
  static async persistDependency(dependency: TestDependency): Promise<TestDependency> {
    try {
      const result = await db.insert(taskDependencies).values({
        taskId: dependency.taskId,
        prerequisiteTaskId: dependency.prerequisiteTaskId,
        createdAt: new Date(),
      }).returning();
      
      return {
        ...dependency,
        id: result[0].id,
      };
    } catch (error) {
      console.error('Failed to persist test dependency:', error);
      throw error;
    }
  }

  /**
   * Create a complete plan with phases and tasks
   */
  static async createCompletePlan(
    userId: number,
    searchId: number,
    options: {
      phaseCount?: number;
      tasksPerPhase?: number;
    } = {}
  ): Promise<{
    plan: TestPlan;
    phases: TestPhase[];
    tasks: TestTask[];
  }> {
    const phaseCount = options.phaseCount || 3;
    const tasksPerPhase = options.tasksPerPhase || 3;

    // Create plan
    const plan = await this.createAndPersist({
      userId,
      searchId,
      title: 'Complete Test Plan',
      description: 'A complete test plan with phases and tasks',
    });

    // Create phases
    const phases: TestPhase[] = [];
    for (let i = 0; i < phaseCount; i++) {
      const phase = await this.persistPhase({
        planId: plan.id!,
        name: `Phase ${i + 1}`,
        description: `Description for phase ${i + 1}`,
        order: i,
      });
      phases.push(phase);
    }

    // Create tasks
    const tasks: TestTask[] = [];
    for (const phase of phases) {
      for (let i = 0; i < tasksPerPhase; i++) {
        const task = await this.persistTask({
          phaseId: phase.id!,
          planId: plan.id!,
          title: `Task ${i + 1} in ${phase.name}`,
          description: `Description for task ${i + 1}`,
          order: i,
        });
        tasks.push(task);
      }
    }

    return { plan, phases, tasks };
  }

  /**
   * Cleanup a test plan and all related data
   */
  static async cleanup(planId: number): Promise<void> {
    try {
      if (!planId) {
        console.warn('No plan ID provided for cleanup');
        return;
      }

      // Delete dependencies first (foreign key constraints)
      const tasks = await db.query.planTasks.findMany({
        where: (planTasks, { eq }) => eq(planTasks.planId, planId),
      });

      for (const task of tasks) {
        await db.delete(taskDependencies)
          .where(eq(taskDependencies.taskId, task.id));
        await db.delete(taskDependencies)
          .where(eq(taskDependencies.prerequisiteTaskId, task.id));
      }

      // Delete tasks
      await db.delete(planTasks).where(eq(planTasks.planId, planId));

      // Delete phases
      await db.delete(planPhases).where(eq(planPhases.planId, planId));

      // Delete plan
      await db.delete(actionPlans).where(eq(actionPlans.id, planId));
    } catch (error) {
      console.error('Failed to cleanup test plan:', error);
      throw error;
    }
  }

  /**
   * Cleanup multiple test plans
   */
  static async cleanupMany(planIds: number[]): Promise<void> {
    try {
      for (const planId of planIds) {
        await this.cleanup(planId);
      }
    } catch (error) {
      console.error('Failed to cleanup test plans:', error);
      throw error;
    }
  }
}
