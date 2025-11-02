import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { db } from '../../db';
import { users, actionPlans, planPhases, planTasks, taskDependencies } from '../../../shared/schema';
import { TaskService } from '../taskService';
import { DependencyService } from '../dependencyService';
import { eq } from 'drizzle-orm';

/**
 * Dependency Warnings Tests
 * 
 * Tests for task 25: Add dependency warnings
 * Requirements: 5.5
 */
describe('Dependency Warnings', () => {
  let testUserId: number;
  let testPlanId: number;
  let testPhaseId: number;
  let taskService: TaskService;
  let dependencyService: DependencyService;

  beforeEach(async () => {
    // Create test user
    const [user] = await db.insert(users).values({
      email: `test-dep-warnings-${Date.now()}@example.com`,
      password: 'hashedpassword',
      plan: 'pro',
    }).returning();
    testUserId = user.id;

    // Create test plan
    const [plan] = await db.insert(actionPlans).values({
      userId: testUserId,
      searchId: 1,
      title: 'Test Plan for Dependency Warnings',
      description: 'Testing dependency warnings',
      status: 'active',
      originalPlan: {},
      customizations: {},
    }).returning();
    testPlanId = plan.id;

    // Create test phase
    const [phase] = await db.insert(planPhases).values({
      planId: testPlanId,
      name: 'Test Phase',
      description: 'Test phase for dependency warnings',
      order: 0,
      estimatedDuration: '1 week',
      isCustom: false,
    }).returning();
    testPhaseId = phase.id;

    taskService = new TaskService();
    dependencyService = new DependencyService();
  });

  afterEach(async () => {
    // Cleanup
    if (testPlanId) {
      await db.delete(taskDependencies).where(eq(taskDependencies.taskId, testPlanId));
      await db.delete(planTasks).where(eq(planTasks.planId, testPlanId));
      await db.delete(planPhases).where(eq(planPhases.planId, testPlanId));
      await db.delete(actionPlans).where(eq(actionPlans.id, testPlanId));
    }
    if (testUserId) {
      await db.delete(users).where(eq(users.id, testUserId));
    }
  });

  it('should get incomplete prerequisites for a task', async () => {
    // Create prerequisite task (not completed)
    const [prereqTask] = await db.insert(planTasks).values({
      planId: testPlanId,
      phaseId: testPhaseId,
      title: 'Prerequisite Task',
      description: 'Must be completed first',
      order: 0,
      status: 'not_started',
      isCustom: false,
    }).returning();

    // Create dependent task
    const [dependentTask] = await db.insert(planTasks).values({
      planId: testPlanId,
      phaseId: testPhaseId,
      title: 'Dependent Task',
      description: 'Depends on prerequisite',
      order: 1,
      status: 'not_started',
      isCustom: false,
    }).returning();

    // Add dependency
    await dependencyService.addDependency(
      dependentTask.id,
      prereqTask.id,
      testUserId
    );

    // Get incomplete prerequisites
    const incompletePrereqs = await dependencyService.getIncompletePrerequisites(
      dependentTask.id,
      testUserId
    );

    expect(incompletePrereqs).toHaveLength(1);
    expect(incompletePrereqs[0].id).toBe(prereqTask.id);
    expect(incompletePrereqs[0].status).toBe('not_started');
  });

  it('should return empty array when all prerequisites are completed', async () => {
    // Create prerequisite task (completed)
    const [prereqTask] = await db.insert(planTasks).values({
      planId: testPlanId,
      phaseId: testPhaseId,
      title: 'Prerequisite Task',
      description: 'Already completed',
      order: 0,
      status: 'completed',
      isCustom: false,
      completedAt: new Date().toISOString(),
      completedBy: testUserId,
    }).returning();

    // Create dependent task
    const [dependentTask] = await db.insert(planTasks).values({
      planId: testPlanId,
      phaseId: testPhaseId,
      title: 'Dependent Task',
      description: 'Depends on prerequisite',
      order: 1,
      status: 'not_started',
      isCustom: false,
    }).returning();

    // Add dependency
    await dependencyService.addDependency(
      dependentTask.id,
      prereqTask.id,
      testUserId
    );

    // Get incomplete prerequisites
    const incompletePrereqs = await dependencyService.getIncompletePrerequisites(
      dependentTask.id,
      testUserId
    );

    expect(incompletePrereqs).toHaveLength(0);
  });

  it('should update task status with override flag', async () => {
    // Create prerequisite task (not completed)
    const [prereqTask] = await db.insert(planTasks).values({
      planId: testPlanId,
      phaseId: testPhaseId,
      title: 'Prerequisite Task',
      description: 'Not completed',
      order: 0,
      status: 'not_started',
      isCustom: false,
    }).returning();

    // Create dependent task
    const [dependentTask] = await db.insert(planTasks).values({
      planId: testPlanId,
      phaseId: testPhaseId,
      title: 'Dependent Task',
      description: 'Will be completed with override',
      order: 1,
      status: 'not_started',
      isCustom: false,
    }).returning();

    // Add dependency
    await dependencyService.addDependency(
      dependentTask.id,
      prereqTask.id,
      testUserId
    );

    // Update task status with override
    const updatedTask = await taskService.updateTaskStatus(
      dependentTask.id,
      testUserId,
      'completed',
      true // override prerequisites
    );

    expect(updatedTask.status).toBe('completed');
    expect(updatedTask.completedAt).toBeTruthy();
    expect(updatedTask.completedBy).toBe(testUserId);

    // Verify task history was recorded with override flag
    const history = await taskService.getTaskHistory(dependentTask.id, testUserId, 1);
    expect(history).toHaveLength(1);
    expect(history[0].action).toBe('completed');
    expect(history[0].newState).toHaveProperty('overridePrerequisites', true);
  });

  it('should handle multiple incomplete prerequisites', async () => {
    // Create multiple prerequisite tasks
    const [prereq1] = await db.insert(planTasks).values({
      planId: testPlanId,
      phaseId: testPhaseId,
      title: 'Prerequisite 1',
      description: 'First prerequisite',
      order: 0,
      status: 'not_started',
      isCustom: false,
    }).returning();

    const [prereq2] = await db.insert(planTasks).values({
      planId: testPlanId,
      phaseId: testPhaseId,
      title: 'Prerequisite 2',
      description: 'Second prerequisite',
      order: 1,
      status: 'in_progress',
      isCustom: false,
    }).returning();

    const [prereq3] = await db.insert(planTasks).values({
      planId: testPlanId,
      phaseId: testPhaseId,
      title: 'Prerequisite 3',
      description: 'Third prerequisite (completed)',
      order: 2,
      status: 'completed',
      isCustom: false,
      completedAt: new Date().toISOString(),
      completedBy: testUserId,
    }).returning();

    // Create dependent task
    const [dependentTask] = await db.insert(planTasks).values({
      planId: testPlanId,
      phaseId: testPhaseId,
      title: 'Dependent Task',
      description: 'Has multiple prerequisites',
      order: 3,
      status: 'not_started',
      isCustom: false,
    }).returning();

    // Add dependencies
    await dependencyService.addDependency(dependentTask.id, prereq1.id, testUserId);
    await dependencyService.addDependency(dependentTask.id, prereq2.id, testUserId);
    await dependencyService.addDependency(dependentTask.id, prereq3.id, testUserId);

    // Get incomplete prerequisites
    const incompletePrereqs = await dependencyService.getIncompletePrerequisites(
      dependentTask.id,
      testUserId
    );

    // Should return 2 incomplete prerequisites (not_started and in_progress)
    expect(incompletePrereqs).toHaveLength(2);
    const prereqIds = incompletePrereqs.map(t => t.id);
    expect(prereqIds).toContain(prereq1.id);
    expect(prereqIds).toContain(prereq2.id);
    expect(prereqIds).not.toContain(prereq3.id);
  });
});
