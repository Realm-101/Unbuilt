import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { TaskService } from '../taskService';
import { db } from '../../db';
import { 
  users, 
  searches, 
  actionPlans, 
  planPhases, 
  planTasks,
  taskHistory,
  taskDependencies,
  type User,
  type Search,
  type ActionPlan,
  type PlanPhase,
  type PlanTask,
} from '@shared/schema';
import { eq, and, or } from 'drizzle-orm';

describe('TaskService', () => {
  let taskService: TaskService;
  let testUser: User;
  let testSearch: Search;
  let testPlan: ActionPlan;
  let testPhase: PlanPhase;

  beforeEach(async () => {
    taskService = new TaskService();

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
    testUser = user;

    // Create test search
    const [search] = await db
      .insert(searches)
      .values({
        query: 'Test search query',
        userId: testUser.id,
        resultsCount: 5,
      })
      .returning();
    testSearch = search;

    // Create test action plan
    const [plan] = await db
      .insert(actionPlans)
      .values({
        searchId: testSearch.id,
        userId: testUser.id,
        title: 'Test Action Plan',
        description: 'Test plan description',
        status: 'active',
        originalPlan: { phases: [] },
        customizations: {},
      })
      .returning();
    testPlan = plan;

    // Create test phase
    const [phase] = await db
      .insert(planPhases)
      .values({
        planId: testPlan.id,
        name: 'Test Phase',
        description: 'Test phase description',
        order: 0,
        estimatedDuration: '2 weeks',
        isCustom: false,
      })
      .returning();
    testPhase = phase;
  });

  afterEach(async () => {
    // Clean up in reverse order of dependencies
    if (testPhase) {
      // Delete task history first (references tasks)
      const tasks = await db.select().from(planTasks).where(eq(planTasks.phaseId, testPhase.id));
      for (const task of tasks) {
        await db.delete(taskHistory).where(eq(taskHistory.taskId, task.id));
      }
      await db.delete(planTasks).where(eq(planTasks.phaseId, testPhase.id));
      await db.delete(planPhases).where(eq(planPhases.id, testPhase.id));
    }
    if (testPlan) {
      await db.delete(actionPlans).where(eq(actionPlans.id, testPlan.id));
    }
    if (testSearch) {
      await db.delete(searches).where(eq(searches.id, testSearch.id));
    }
    if (testUser) {
      await db.delete(users).where(eq(users.id, testUser.id));
    }
  });

  describe('createTask', () => {
    it('should create a new task successfully', async () => {
      const taskData = {
        phaseId: testPhase.id,
        planId: testPlan.id,
        title: 'Test Task',
        description: 'Test task description',
        estimatedTime: '4 hours',
        resources: ['https://example.com/resource'],
        order: 0,
        status: 'not_started' as const,
        isCustom: false,
      };

      const task = await taskService.createTask(taskData, testUser.id);

      expect(task).toBeDefined();
      expect(task.title).toBe(taskData.title);
      expect(task.description).toBe(taskData.description);
      expect(task.phaseId).toBe(testPhase.id);
      expect(task.planId).toBe(testPlan.id);
      expect(task.status).toBe('not_started');
      expect(task.createdAt).toBeDefined();
      expect(task.updatedAt).toBeDefined();
    });

    it('should record task creation in history', async () => {
      const taskData = {
        phaseId: testPhase.id,
        planId: testPlan.id,
        title: 'Test Task',
        order: 0,
        status: 'not_started' as const,
        isCustom: false,
      };

      const task = await taskService.createTask(taskData, testUser.id);

      const history = await db
        .select()
        .from(taskHistory)
        .where(eq(taskHistory.taskId, task.id));

      expect(history).toHaveLength(1);
      expect(history[0].action).toBe('created');
      expect(history[0].userId).toBe(testUser.id);
    });

    it('should throw error if phase does not exist', async () => {
      const taskData = {
        phaseId: 99999,
        planId: testPlan.id,
        title: 'Test Task',
        order: 0,
        status: 'not_started' as const,
        isCustom: false,
      };

      await expect(
        taskService.createTask(taskData, testUser.id)
      ).rejects.toThrow('Phase not found');
    });

    it('should throw error if user does not have access to plan', async () => {
      // Create another user
      const [otherUser] = await db
        .insert(users)
        .values({
          email: `other-${Date.now()}@example.com`,
          password: 'hashedpassword',
          name: 'Other User',
        })
        .returning();

      const taskData = {
        phaseId: testPhase.id,
        planId: testPlan.id,
        title: 'Test Task',
        order: 0,
        status: 'not_started' as const,
        isCustom: false,
      };

      await expect(
        taskService.createTask(taskData, otherUser.id)
      ).rejects.toThrow('Plan not found or access denied');

      // Cleanup
      await db.delete(users).where(eq(users.id, otherUser.id));
    });
  });

  describe('getTaskById', () => {
    it('should retrieve task by ID', async () => {
      const [task] = await db
        .insert(planTasks)
        .values({
          phaseId: testPhase.id,
          planId: testPlan.id,
          title: 'Test Task',
          order: 0,
          status: 'not_started',
          isCustom: false,
        })
        .returning();

      const retrievedTask = await taskService.getTaskById(task.id, testUser.id);

      expect(retrievedTask).toBeDefined();
      expect(retrievedTask?.id).toBe(task.id);
      expect(retrievedTask?.title).toBe('Test Task');
    });

    it('should return null if task does not exist', async () => {
      const task = await taskService.getTaskById(99999, testUser.id);
      expect(task).toBeNull();
    });

    it('should return null if user does not have access', async () => {
      const [task] = await db
        .insert(planTasks)
        .values({
          phaseId: testPhase.id,
          planId: testPlan.id,
          title: 'Test Task',
          order: 0,
          status: 'not_started',
          isCustom: false,
        })
        .returning();

      // Create another user
      const [otherUser] = await db
        .insert(users)
        .values({
          email: `other-${Date.now()}@example.com`,
          password: 'hashedpassword',
          name: 'Other User',
        })
        .returning();

      const retrievedTask = await taskService.getTaskById(task.id, otherUser.id);
      expect(retrievedTask).toBeNull();

      // Cleanup
      await db.delete(users).where(eq(users.id, otherUser.id));
    });
  });

  describe('getTasksByPhaseId', () => {
    it('should retrieve all tasks for a phase ordered by order field', async () => {
      // Create multiple tasks
      await db.insert(planTasks).values([
        {
          phaseId: testPhase.id,
          planId: testPlan.id,
          title: 'Task 1',
          order: 2,
          status: 'not_started',
          isCustom: false,
        },
        {
          phaseId: testPhase.id,
          planId: testPlan.id,
          title: 'Task 2',
          order: 0,
          status: 'not_started',
          isCustom: false,
        },
        {
          phaseId: testPhase.id,
          planId: testPlan.id,
          title: 'Task 3',
          order: 1,
          status: 'not_started',
          isCustom: false,
        },
      ]);

      const tasks = await taskService.getTasksByPhaseId(testPhase.id, testUser.id);

      expect(tasks).toHaveLength(3);
      expect(tasks[0].title).toBe('Task 2'); // order: 0
      expect(tasks[1].title).toBe('Task 3'); // order: 1
      expect(tasks[2].title).toBe('Task 1'); // order: 2
    });

    it('should throw error if user does not have access to phase', async () => {
      const [otherUser] = await db
        .insert(users)
        .values({
          email: `other-${Date.now()}@example.com`,
          password: 'hashedpassword',
          name: 'Other User',
        })
        .returning();

      await expect(
        taskService.getTasksByPhaseId(testPhase.id, otherUser.id)
      ).rejects.toThrow('Phase not found or access denied');

      // Cleanup
      await db.delete(users).where(eq(users.id, otherUser.id));
    });
  });

  describe('getTasksByPlanId', () => {
    it('should retrieve all tasks for a plan', async () => {
      await db.insert(planTasks).values([
        {
          phaseId: testPhase.id,
          planId: testPlan.id,
          title: 'Task 1',
          order: 0,
          status: 'not_started',
          isCustom: false,
        },
        {
          phaseId: testPhase.id,
          planId: testPlan.id,
          title: 'Task 2',
          order: 1,
          status: 'completed',
          isCustom: false,
        },
      ]);

      const tasks = await taskService.getTasksByPlanId(testPlan.id, testUser.id);

      expect(tasks).toHaveLength(2);
    });

    it('should filter tasks by status', async () => {
      await db.insert(planTasks).values([
        {
          phaseId: testPhase.id,
          planId: testPlan.id,
          title: 'Task 1',
          order: 0,
          status: 'not_started',
          isCustom: false,
        },
        {
          phaseId: testPhase.id,
          planId: testPlan.id,
          title: 'Task 2',
          order: 1,
          status: 'completed',
          isCustom: false,
        },
        {
          phaseId: testPhase.id,
          planId: testPlan.id,
          title: 'Task 3',
          order: 2,
          status: 'completed',
          isCustom: false,
        },
      ]);

      const completedTasks = await taskService.getTasksByPlanId(
        testPlan.id,
        testUser.id,
        'completed'
      );

      expect(completedTasks).toHaveLength(2);
      expect(completedTasks.every(t => t.status === 'completed')).toBe(true);
    });
  });

  describe('updateTask', () => {
    it('should update task successfully', async () => {
      const [task] = await db
        .insert(planTasks)
        .values({
          phaseId: testPhase.id,
          planId: testPlan.id,
          title: 'Original Title',
          description: 'Original description',
          order: 0,
          status: 'not_started',
          isCustom: false,
        })
        .returning();

      const updatedTask = await taskService.updateTask(
        task.id,
        testUser.id,
        {
          title: 'Updated Title',
          description: 'Updated description',
        }
      );

      expect(updatedTask.title).toBe('Updated Title');
      expect(updatedTask.description).toBe('Updated description');
    });

    it('should record update in history', async () => {
      const [task] = await db
        .insert(planTasks)
        .values({
          phaseId: testPhase.id,
          planId: testPlan.id,
          title: 'Original Title',
          order: 0,
          status: 'not_started',
          isCustom: false,
        })
        .returning();

      await taskService.updateTask(task.id, testUser.id, {
        title: 'Updated Title',
      });

      const history = await db
        .select()
        .from(taskHistory)
        .where(eq(taskHistory.taskId, task.id));

      expect(history.length).toBeGreaterThan(0);
      const updateEntry = history.find(h => h.action === 'updated');
      expect(updateEntry).toBeDefined();
    });
  });

  describe('updateTaskStatus', () => {
    it('should update task status to completed', async () => {
      const [task] = await db
        .insert(planTasks)
        .values({
          phaseId: testPhase.id,
          planId: testPlan.id,
          title: 'Test Task',
          order: 0,
          status: 'not_started',
          isCustom: false,
        })
        .returning();

      const updatedTask = await taskService.updateTaskStatus(
        task.id,
        testUser.id,
        'completed'
      );

      expect(updatedTask.status).toBe('completed');
      expect(updatedTask.completedAt).toBeDefined();
      expect(updatedTask.completedBy).toBe(testUser.id);
    });

    it('should clear completion data when moving back to not completed', async () => {
      const [task] = await db
        .insert(planTasks)
        .values({
          phaseId: testPhase.id,
          planId: testPlan.id,
          title: 'Test Task',
          order: 0,
          status: 'completed',
          completedAt: new Date().toISOString(),
          completedBy: testUser.id,
          isCustom: false,
        })
        .returning();

      const updatedTask = await taskService.updateTaskStatus(
        task.id,
        testUser.id,
        'in_progress'
      );

      expect(updatedTask.status).toBe('in_progress');
      expect(updatedTask.completedAt).toBeNull();
      expect(updatedTask.completedBy).toBeNull();
    });

    it('should record status change in history', async () => {
      const [task] = await db
        .insert(planTasks)
        .values({
          phaseId: testPhase.id,
          planId: testPlan.id,
          title: 'Test Task',
          order: 0,
          status: 'not_started',
          isCustom: false,
        })
        .returning();

      await taskService.updateTaskStatus(task.id, testUser.id, 'completed');

      const history = await db
        .select()
        .from(taskHistory)
        .where(eq(taskHistory.taskId, task.id));

      const completedEntry = history.find(h => h.action === 'completed');
      expect(completedEntry).toBeDefined();
    });
  });

  describe('deleteTask', () => {
    it('should delete task successfully', async () => {
      const [task] = await db
        .insert(planTasks)
        .values({
          phaseId: testPhase.id,
          planId: testPlan.id,
          title: 'Test Task',
          order: 0,
          status: 'not_started',
          isCustom: false,
        })
        .returning();

      await taskService.deleteTask(task.id, testUser.id);

      const deletedTask = await db
        .select()
        .from(planTasks)
        .where(eq(planTasks.id, task.id));

      expect(deletedTask).toHaveLength(0);
    });

    it('should delete task history when deleting task', async () => {
      const [task] = await db
        .insert(planTasks)
        .values({
          phaseId: testPhase.id,
          planId: testPlan.id,
          title: 'Test Task',
          order: 0,
          status: 'not_started',
          isCustom: false,
        })
        .returning();

      // Create some history
      await taskService.updateTask(task.id, testUser.id, { description: 'Updated' });

      await taskService.deleteTask(task.id, testUser.id);

      // Verify task was deleted
      const deletedTask = await db
        .select()
        .from(planTasks)
        .where(eq(planTasks.id, task.id));

      expect(deletedTask).toHaveLength(0);
      
      // Verify history was also deleted
      const history = await db
        .select()
        .from(taskHistory)
        .where(eq(taskHistory.taskId, task.id));
      
      expect(history).toHaveLength(0);
    });

    it('should throw error when task not found', async () => {
      await expect(
        taskService.deleteTask(99999, testUser.id)
      ).rejects.toThrow('Task not found or access denied');
    });

    it('should throw error when user does not have access', async () => {
      const [task] = await db
        .insert(planTasks)
        .values({
          phaseId: testPhase.id,
          planId: testPlan.id,
          title: 'Test Task',
          order: 0,
          status: 'not_started',
          isCustom: false,
        })
        .returning();

      // Try to delete with different user ID
      await expect(
        taskService.deleteTask(task.id, 99999)
      ).rejects.toThrow('Task not found or access denied');
    });

    it('should delete task dependencies when deleting task', async () => {
      // Create two tasks
      const [task1, task2] = await db
        .insert(planTasks)
        .values([
          {
            phaseId: testPhase.id,
            planId: testPlan.id,
            title: 'Task 1',
            order: 0,
            status: 'not_started',
            isCustom: false,
          },
          {
            phaseId: testPhase.id,
            planId: testPlan.id,
            title: 'Task 2',
            order: 1,
            status: 'not_started',
            isCustom: false,
          },
        ])
        .returning();

      // Create dependency: task2 depends on task1
      await db
        .insert(taskDependencies)
        .values({
          taskId: task2.id,
          prerequisiteTaskId: task1.id,
        });

      // Verify dependency exists
      const depsBefore = await db
        .select()
        .from(taskDependencies)
        .where(
          or(
            eq(taskDependencies.taskId, task1.id),
            eq(taskDependencies.prerequisiteTaskId, task1.id)
          )
        );
      expect(depsBefore).toHaveLength(1);

      // Delete task1
      await taskService.deleteTask(task1.id, testUser.id);

      // Verify task was deleted
      const deletedTask = await db
        .select()
        .from(planTasks)
        .where(eq(planTasks.id, task1.id));
      expect(deletedTask).toHaveLength(0);

      // Verify dependencies were also deleted
      const depsAfter = await db
        .select()
        .from(taskDependencies)
        .where(
          or(
            eq(taskDependencies.taskId, task1.id),
            eq(taskDependencies.prerequisiteTaskId, task1.id)
          )
        );
      expect(depsAfter).toHaveLength(0);
    });
  });

  describe('reorderTasks', () => {
    it('should reorder tasks successfully', async () => {
      const [task1, task2, task3] = await db
        .insert(planTasks)
        .values([
          {
            phaseId: testPhase.id,
            planId: testPlan.id,
            title: 'Task 1',
            order: 0,
            status: 'not_started',
            isCustom: false,
          },
          {
            phaseId: testPhase.id,
            planId: testPlan.id,
            title: 'Task 2',
            order: 1,
            status: 'not_started',
            isCustom: false,
          },
          {
            phaseId: testPhase.id,
            planId: testPlan.id,
            title: 'Task 3',
            order: 2,
            status: 'not_started',
            isCustom: false,
          },
        ])
        .returning();

      // Reorder: task3, task1, task2
      const reorderedTasks = await taskService.reorderTasks(
        testPhase.id,
        testUser.id,
        [task3.id, task1.id, task2.id]
      );

      expect(reorderedTasks).toHaveLength(3);
      expect(reorderedTasks[0].id).toBe(task3.id);
      expect(reorderedTasks[0].order).toBe(0);
      expect(reorderedTasks[1].id).toBe(task1.id);
      expect(reorderedTasks[1].order).toBe(1);
      expect(reorderedTasks[2].id).toBe(task2.id);
      expect(reorderedTasks[2].order).toBe(2);
    });

    it('should throw error if task does not belong to phase', async () => {
      // Create another phase
      const [otherPhase] = await db
        .insert(planPhases)
        .values({
          planId: testPlan.id,
          name: 'Other Phase',
          order: 1,
          isCustom: false,
        })
        .returning();

      const [task1] = await db
        .insert(planTasks)
        .values({
          phaseId: testPhase.id,
          planId: testPlan.id,
          title: 'Task 1',
          order: 0,
          status: 'not_started',
          isCustom: false,
        })
        .returning();

      const [task2] = await db
        .insert(planTasks)
        .values({
          phaseId: otherPhase.id,
          planId: testPlan.id,
          title: 'Task 2',
          order: 0,
          status: 'not_started',
          isCustom: false,
        })
        .returning();

      await expect(
        taskService.reorderTasks(testPhase.id, testUser.id, [task1.id, task2.id])
      ).rejects.toThrow('does not belong to phase');

      // Cleanup - delete tasks first, then phase
      await db.delete(planTasks).where(eq(planTasks.phaseId, otherPhase.id));
      await db.delete(planPhases).where(eq(planPhases.id, otherPhase.id));
    });

    it('should record reorder action in history', async () => {
      const [task1, task2] = await db
        .insert(planTasks)
        .values([
          {
            phaseId: testPhase.id,
            planId: testPlan.id,
            title: 'Task 1',
            order: 0,
            status: 'not_started',
            isCustom: false,
          },
          {
            phaseId: testPhase.id,
            planId: testPlan.id,
            title: 'Task 2',
            order: 1,
            status: 'not_started',
            isCustom: false,
          },
        ])
        .returning();

      await taskService.reorderTasks(
        testPhase.id,
        testUser.id,
        [task2.id, task1.id]
      );

      const history = await db
        .select()
        .from(taskHistory)
        .where(eq(taskHistory.taskId, task2.id));

      const reorderEntry = history.find(h => h.action === 'reordered');
      expect(reorderEntry).toBeDefined();
    });
  });

  describe('getTaskHistory', () => {
    it('should retrieve task history', async () => {
      const [task] = await db
        .insert(planTasks)
        .values({
          phaseId: testPhase.id,
          planId: testPlan.id,
          title: 'Test Task',
          order: 0,
          status: 'not_started',
          isCustom: false,
        })
        .returning();

      // Perform some operations
      await taskService.updateTask(task.id, testUser.id, { title: 'Updated Title' });
      await taskService.updateTaskStatus(task.id, testUser.id, 'completed');

      const history = await taskService.getTaskHistory(task.id, testUser.id);

      expect(history.length).toBeGreaterThan(0);
      expect(history.some(h => h.action === 'updated')).toBe(true);
      expect(history.some(h => h.action === 'completed')).toBe(true);
    });

    it('should limit history results', async () => {
      const [task] = await db
        .insert(planTasks)
        .values({
          phaseId: testPhase.id,
          planId: testPlan.id,
          title: 'Test Task',
          order: 0,
          status: 'not_started',
          isCustom: false,
        })
        .returning();

      // Create multiple history entries
      for (let i = 0; i < 10; i++) {
        await taskService.updateTask(task.id, testUser.id, {
          description: `Update ${i}`,
        });
      }

      const history = await taskService.getTaskHistory(task.id, testUser.id, 5);

      expect(history.length).toBeLessThanOrEqual(5);
    });
  });

  describe('getTasksByAssignee', () => {
    it('should retrieve tasks assigned to a user', async () => {
      await db.insert(planTasks).values([
        {
          phaseId: testPhase.id,
          planId: testPlan.id,
          title: 'Task 1',
          order: 0,
          status: 'not_started',
          assigneeId: testUser.id,
          isCustom: false,
        },
        {
          phaseId: testPhase.id,
          planId: testPlan.id,
          title: 'Task 2',
          order: 1,
          status: 'not_started',
          assigneeId: null,
          isCustom: false,
        },
      ]);

      const tasks = await taskService.getTasksByAssignee(
        testPlan.id,
        testUser.id,
        testUser.id
      );

      expect(tasks).toHaveLength(1);
      expect(tasks[0].title).toBe('Task 1');
      expect(tasks[0].assigneeId).toBe(testUser.id);
    });
  });

  describe('bulkUpdateTaskStatus', () => {
    it('should update status for multiple tasks', async () => {
      const [task1, task2, task3] = await db
        .insert(planTasks)
        .values([
          {
            phaseId: testPhase.id,
            planId: testPlan.id,
            title: 'Task 1',
            order: 0,
            status: 'not_started',
            isCustom: false,
          },
          {
            phaseId: testPhase.id,
            planId: testPlan.id,
            title: 'Task 2',
            order: 1,
            status: 'not_started',
            isCustom: false,
          },
          {
            phaseId: testPhase.id,
            planId: testPlan.id,
            title: 'Task 3',
            order: 2,
            status: 'not_started',
            isCustom: false,
          },
        ])
        .returning();

      const updatedTasks = await taskService.bulkUpdateTaskStatus(
        [task1.id, task2.id, task3.id],
        testUser.id,
        'completed'
      );

      expect(updatedTasks).toHaveLength(3);
      expect(updatedTasks.every(t => t.status === 'completed')).toBe(true);
    });
  });

  describe('hasAccess', () => {
    it('should return true if user has access to task', async () => {
      const [task] = await db
        .insert(planTasks)
        .values({
          phaseId: testPhase.id,
          planId: testPlan.id,
          title: 'Test Task',
          order: 0,
          status: 'not_started',
          isCustom: false,
        })
        .returning();

      const hasAccess = await taskService.hasAccess(task.id, testUser.id);
      expect(hasAccess).toBe(true);
    });

    it('should return false if user does not have access to task', async () => {
      const [task] = await db
        .insert(planTasks)
        .values({
          phaseId: testPhase.id,
          planId: testPlan.id,
          title: 'Test Task',
          order: 0,
          status: 'not_started',
          isCustom: false,
        })
        .returning();

      const [otherUser] = await db
        .insert(users)
        .values({
          email: `other-${Date.now()}@example.com`,
          password: 'hashedpassword',
          name: 'Other User',
        })
        .returning();

      const hasAccess = await taskService.hasAccess(task.id, otherUser.id);
      expect(hasAccess).toBe(false);

      // Cleanup
      await db.delete(users).where(eq(users.id, otherUser.id));
    });
  });
});
