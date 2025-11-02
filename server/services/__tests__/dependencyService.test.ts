import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { dependencyService } from '../dependencyService';
import { planService } from '../planService';
import { taskService } from '../taskService';
import { db } from '../../db';
import { 
  users, 
  searches, 
  actionPlans, 
  planPhases, 
  planTasks,
  taskDependencies,
  taskHistory,
} from '@shared/schema';
import { eq } from 'drizzle-orm';

describe('DependencyService', () => {
  let testUserId: number;
  let testSearchId: number;
  let testPlanId: number;
  let testPhaseId: number;
  let testTaskIds: number[] = [];

  beforeEach(async () => {
    // Create test user
    const [user] = await db
      .insert(users)
      .values({
        email: `test-${Date.now()}@example.com`,
        password: 'hashedpassword',
        name: 'Test User',
        plan: 'pro',
      })
      .returning();
    testUserId = user.id;

    // Create test search
    const [search] = await db
      .insert(searches)
      .values({
        query: 'Test search for dependencies',
        userId: testUserId,
      })
      .returning();
    testSearchId = search.id;

    // Create test plan
    const plan = await planService.createPlan({
      searchId: testSearchId,
      userId: testUserId,
      title: 'Test Plan for Dependencies',
      description: 'Testing dependency management',
    });
    testPlanId = plan.id;

    // Create test phase
    const [phase] = await db
      .insert(planPhases)
      .values({
        planId: testPlanId,
        name: 'Test Phase',
        description: 'Phase for testing dependencies',
        order: 0,
      })
      .returning();
    testPhaseId = phase.id;

    // Create test tasks
    const taskData = [
      { title: 'Task A', order: 0 },
      { title: 'Task B', order: 1 },
      { title: 'Task C', order: 2 },
      { title: 'Task D', order: 3 },
    ];

    testTaskIds = [];
    for (const data of taskData) {
      const task = await taskService.createTask(
        {
          phaseId: testPhaseId,
          planId: testPlanId,
          title: data.title,
          description: `Description for ${data.title}`,
          order: data.order,
          status: 'not_started',
        },
        testUserId
      );
      testTaskIds.push(task.id);
    }
  });

  afterEach(async () => {
    // Cleanup in reverse order of creation
    if (testTaskIds.length > 0) {
      await db.delete(taskDependencies);
      await db.delete(taskHistory); // Delete task history before tasks
      await db.delete(planTasks).where(eq(planTasks.planId, testPlanId));
    }
    if (testPhaseId) {
      await db.delete(planPhases).where(eq(planPhases.id, testPhaseId));
    }
    if (testPlanId) {
      await db.delete(actionPlans).where(eq(actionPlans.id, testPlanId));
    }
    if (testSearchId) {
      await db.delete(searches).where(eq(searches.id, testSearchId));
    }
    if (testUserId) {
      await db.delete(users).where(eq(users.id, testUserId));
    }
  });

  describe('addDependency', () => {
    it('should add a valid dependency', async () => {
      const [taskA, taskB] = testTaskIds;

      const dependency = await dependencyService.addDependency(
        taskB,
        taskA,
        testUserId
      );

      expect(dependency).toBeDefined();
      expect(dependency.taskId).toBe(taskB);
      expect(dependency.prerequisiteTaskId).toBe(taskA);
    });

    it('should throw error when task depends on itself', async () => {
      const [taskA] = testTaskIds;

      await expect(
        dependencyService.addDependency(taskA, taskA, testUserId)
      ).rejects.toThrow('Task cannot depend on itself');
    });

    it('should throw error when dependency already exists', async () => {
      const [taskA, taskB] = testTaskIds;

      // Add dependency first time
      await dependencyService.addDependency(taskB, taskA, testUserId);

      // Try to add same dependency again
      await expect(
        dependencyService.addDependency(taskB, taskA, testUserId)
      ).rejects.toThrow('Dependency already exists');
    });

    it('should throw error when creating circular dependency', async () => {
      const [taskA, taskB] = testTaskIds;

      // Add A -> B
      await dependencyService.addDependency(taskB, taskA, testUserId);

      // Try to add B -> A (creates cycle)
      await expect(
        dependencyService.addDependency(taskA, taskB, testUserId)
      ).rejects.toThrow('Circular dependency detected');
    });

    it('should throw error for user without access', async () => {
      const [taskA, taskB] = testTaskIds;

      await expect(
        dependencyService.addDependency(taskB, taskA, 99999)
      ).rejects.toThrow('Task not found or access denied');
    });
  });

  describe('removeDependency', () => {
    it('should remove an existing dependency', async () => {
      const [taskA, taskB] = testTaskIds;

      // Add dependency
      const dependency = await dependencyService.addDependency(
        taskB,
        taskA,
        testUserId
      );

      // Remove dependency
      await dependencyService.removeDependency(dependency.id, testUserId);

      // Verify it's removed
      const prerequisites = await dependencyService.getPrerequisites(
        taskB,
        testUserId
      );
      expect(prerequisites).toHaveLength(0);
    });

    it('should throw error when dependency not found', async () => {
      await expect(
        dependencyService.removeDependency(99999, testUserId)
      ).rejects.toThrow('Dependency not found');
    });

    it('should throw error for user without access', async () => {
      const [taskA, taskB] = testTaskIds;

      const dependency = await dependencyService.addDependency(
        taskB,
        taskA,
        testUserId
      );

      await expect(
        dependencyService.removeDependency(dependency.id, 99999)
      ).rejects.toThrow('Access denied');
    });
  });

  describe('getPrerequisites', () => {
    it('should return empty array when task has no prerequisites', async () => {
      const [taskA] = testTaskIds;

      const prerequisites = await dependencyService.getPrerequisites(
        taskA,
        testUserId
      );

      expect(prerequisites).toEqual([]);
    });

    it('should return all prerequisites for a task', async () => {
      const [taskA, taskB, taskC] = testTaskIds;

      // Add dependencies: C depends on A and B
      await dependencyService.addDependency(taskC, taskA, testUserId);
      await dependencyService.addDependency(taskC, taskB, testUserId);

      const prerequisites = await dependencyService.getPrerequisites(
        taskC,
        testUserId
      );

      expect(prerequisites).toHaveLength(2);
      expect(prerequisites).toContain(taskA);
      expect(prerequisites).toContain(taskB);
    });
  });

  describe('getDependents', () => {
    it('should return empty array when task has no dependents', async () => {
      const [taskA] = testTaskIds;

      const dependents = await dependencyService.getDependents(
        taskA,
        testUserId
      );

      expect(dependents).toEqual([]);
    });

    it('should return all dependents for a task', async () => {
      const [taskA, taskB, taskC] = testTaskIds;

      // Add dependencies: B and C depend on A
      await dependencyService.addDependency(taskB, taskA, testUserId);
      await dependencyService.addDependency(taskC, taskA, testUserId);

      const dependents = await dependencyService.getDependents(
        taskA,
        testUserId
      );

      expect(dependents).toHaveLength(2);
      expect(dependents).toContain(taskB);
      expect(dependents).toContain(taskC);
    });
  });

  describe('getTaskDependencies', () => {
    it('should return both prerequisites and dependents', async () => {
      const [taskA, taskB, taskC] = testTaskIds;

      // Add dependencies: B depends on A, C depends on B
      await dependencyService.addDependency(taskB, taskA, testUserId);
      await dependencyService.addDependency(taskC, taskB, testUserId);

      const dependencies = await dependencyService.getTaskDependencies(
        taskB,
        testUserId
      );

      expect(dependencies.prerequisites).toEqual([taskA]);
      expect(dependencies.dependents).toEqual([taskC]);
    });
  });

  describe('validateDependency', () => {
    it('should validate a valid dependency', async () => {
      const [taskA, taskB] = testTaskIds;

      const validation = await dependencyService.validateDependency(
        taskB,
        taskA
      );

      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
      expect(validation.circularDependencies).toHaveLength(0);
    });

    it('should detect direct circular dependency', async () => {
      const [taskA, taskB] = testTaskIds;

      // Add A -> B
      await dependencyService.addDependency(taskB, taskA, testUserId);

      // Validate B -> A (would create cycle)
      const validation = await dependencyService.validateDependency(
        taskA,
        taskB
      );

      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Circular dependency detected');
      expect(validation.circularDependencies.length).toBeGreaterThan(0);
    });

    it('should detect indirect circular dependency', async () => {
      const [taskA, taskB, taskC] = testTaskIds;

      // Add A -> B -> C
      await dependencyService.addDependency(taskB, taskA, testUserId);
      await dependencyService.addDependency(taskC, taskB, testUserId);

      // Validate C -> A (would create cycle through B)
      const validation = await dependencyService.validateDependency(
        taskA,
        taskC
      );

      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Circular dependency detected');
    });

    it('should detect complex circular dependency', async () => {
      const [taskA, taskB, taskC, taskD] = testTaskIds;

      // Create chain: A -> B -> C -> D
      await dependencyService.addDependency(taskB, taskA, testUserId);
      await dependencyService.addDependency(taskC, taskB, testUserId);
      await dependencyService.addDependency(taskD, taskC, testUserId);

      // Validate D -> A (would create cycle through B and C)
      const validation = await dependencyService.validateDependency(
        taskA,
        taskD
      );

      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Circular dependency detected');
    });
  });

  describe('detectCircularDependency', () => {
    it('should return empty array when no cycle exists', async () => {
      const [taskA, taskB] = testTaskIds;

      const cycle = await dependencyService.detectCircularDependency(
        taskB,
        taskA
      );

      expect(cycle).toEqual([]);
    });

    it('should detect direct cycle', async () => {
      const [taskA, taskB] = testTaskIds;

      // Add A -> B
      await dependencyService.addDependency(taskB, taskA, testUserId);

      // Check for cycle if we add B -> A
      const cycle = await dependencyService.detectCircularDependency(
        taskA,
        taskB
      );

      expect(cycle.length).toBeGreaterThan(0);
      // Cycle should contain both tasks
      expect(cycle.map(id => parseInt(id))).toContain(taskA);
      expect(cycle.map(id => parseInt(id))).toContain(taskB);
    });

    it('should detect indirect cycle through multiple tasks', async () => {
      const [taskA, taskB, taskC] = testTaskIds;

      // Create chain: A -> B -> C
      await dependencyService.addDependency(taskB, taskA, testUserId);
      await dependencyService.addDependency(taskC, taskB, testUserId);

      // Check for cycle if we add C -> A
      const cycle = await dependencyService.detectCircularDependency(
        taskA,
        taskC
      );

      expect(cycle.length).toBeGreaterThan(0);
    });

    it('should detect long cycle', async () => {
      const [taskA, taskB, taskC, taskD] = testTaskIds;

      // Create chain: A -> B -> C -> D
      await dependencyService.addDependency(taskB, taskA, testUserId);
      await dependencyService.addDependency(taskC, taskB, testUserId);
      await dependencyService.addDependency(taskD, taskC, testUserId);

      // Check for cycle if we add D -> A
      const cycle = await dependencyService.detectCircularDependency(
        taskA,
        taskD
      );

      expect(cycle.length).toBeGreaterThan(0);
    });
  });

  describe('getPlanDependencies', () => {
    it('should return dependency map for all tasks in plan', async () => {
      const [taskA, taskB, taskC] = testTaskIds;

      // Add dependencies
      await dependencyService.addDependency(taskB, taskA, testUserId);
      await dependencyService.addDependency(taskC, taskB, testUserId);

      const dependencyMap = await dependencyService.getPlanDependencies(
        testPlanId,
        testUserId
      );

      expect(dependencyMap.size).toBe(testTaskIds.length);
      
      // Check Task A (no prerequisites, B depends on it)
      const taskADeps = dependencyMap.get(taskA);
      expect(taskADeps?.prerequisites).toEqual([]);
      expect(taskADeps?.dependents).toEqual([taskB]);

      // Check Task B (depends on A, C depends on it)
      const taskBDeps = dependencyMap.get(taskB);
      expect(taskBDeps?.prerequisites).toEqual([taskA]);
      expect(taskBDeps?.dependents).toEqual([taskC]);

      // Check Task C (depends on B, no dependents)
      const taskCDeps = dependencyMap.get(taskC);
      expect(taskCDeps?.prerequisites).toEqual([taskB]);
      expect(taskCDeps?.dependents).toEqual([]);
    });
  });

  describe('isTaskBlocked', () => {
    it('should return false when task has no prerequisites', async () => {
      const [taskA] = testTaskIds;

      const isBlocked = await dependencyService.isTaskBlocked(
        taskA,
        testUserId
      );

      expect(isBlocked).toBe(false);
    });

    it('should return true when task has incomplete prerequisites', async () => {
      const [taskA, taskB] = testTaskIds;

      // Add dependency: B depends on A
      await dependencyService.addDependency(taskB, taskA, testUserId);

      const isBlocked = await dependencyService.isTaskBlocked(
        taskB,
        testUserId
      );

      expect(isBlocked).toBe(true);
    });

    it('should return false when all prerequisites are completed', async () => {
      const [taskA, taskB] = testTaskIds;

      // Add dependency: B depends on A
      await dependencyService.addDependency(taskB, taskA, testUserId);

      // Complete task A
      await taskService.updateTaskStatus(taskA, testUserId, 'completed');

      const isBlocked = await dependencyService.isTaskBlocked(
        taskB,
        testUserId
      );

      expect(isBlocked).toBe(false);
    });

    it('should return true when some prerequisites are incomplete', async () => {
      const [taskA, taskB, taskC] = testTaskIds;

      // Add dependencies: C depends on A and B
      await dependencyService.addDependency(taskC, taskA, testUserId);
      await dependencyService.addDependency(taskC, taskB, testUserId);

      // Complete only task A
      await taskService.updateTaskStatus(taskA, testUserId, 'completed');

      const isBlocked = await dependencyService.isTaskBlocked(
        taskC,
        testUserId
      );

      expect(isBlocked).toBe(true);
    });
  });

  describe('getReadyTasks', () => {
    it('should return all tasks when no dependencies exist', async () => {
      const readyTasks = await dependencyService.getReadyTasks(
        testPlanId,
        testUserId
      );

      expect(readyTasks).toHaveLength(testTaskIds.length);
    });

    it('should return only tasks with no incomplete prerequisites', async () => {
      const [taskA, taskB, taskC] = testTaskIds;

      // Add dependencies: B depends on A, C depends on B
      await dependencyService.addDependency(taskB, taskA, testUserId);
      await dependencyService.addDependency(taskC, taskB, testUserId);

      const readyTasks = await dependencyService.getReadyTasks(
        testPlanId,
        testUserId
      );

      // Only task A should be ready (no prerequisites)
      expect(readyTasks).toContain(taskA);
      expect(readyTasks).not.toContain(taskB);
      expect(readyTasks).not.toContain(taskC);
    });

    it('should update ready tasks as prerequisites are completed', async () => {
      const [taskA, taskB, taskC] = testTaskIds;

      // Add dependencies: B depends on A, C depends on B
      await dependencyService.addDependency(taskB, taskA, testUserId);
      await dependencyService.addDependency(taskC, taskB, testUserId);

      // Initially, only A is ready
      let readyTasks = await dependencyService.getReadyTasks(
        testPlanId,
        testUserId
      );
      expect(readyTasks).toContain(taskA);

      // Complete task A
      await taskService.updateTaskStatus(taskA, testUserId, 'completed');

      // Now B should be ready
      readyTasks = await dependencyService.getReadyTasks(
        testPlanId,
        testUserId
      );
      expect(readyTasks).toContain(taskB);
      expect(readyTasks).not.toContain(taskC);

      // Complete task B
      await taskService.updateTaskStatus(taskB, testUserId, 'completed');

      // Now C should be ready
      readyTasks = await dependencyService.getReadyTasks(
        testPlanId,
        testUserId
      );
      expect(readyTasks).toContain(taskC);
    });
  });
});
