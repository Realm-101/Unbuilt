import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { planService } from '../planService';
import { db } from '../../db';
import { actionPlans, searches, planPhases, planTasks } from '@shared/schema';
import { eq, and } from 'drizzle-orm';

describe('PlanService', () => {
  let testUserId: number;
  let testSearchId: number;
  let testPlanId: number;

  beforeEach(async () => {
    // Create test user (assuming users table exists)
    const { users } = await import('@shared/schema');
    const [user] = await db
      .insert(users)
      .values({
        email: `test-${Date.now()}@example.com`,
        password: 'hashedpassword',
        name: 'Test User',
        plan: 'free',
      })
      .returning();
    testUserId = user.id;

    // Create test search
    const [search] = await db
      .insert(searches)
      .values({
        query: 'Test search query',
        userId: testUserId,
        resultsCount: 0,
      })
      .returning();
    testSearchId = search.id;
  });

  afterEach(async () => {
    // Cleanup: Delete test data in correct order (respecting foreign keys)
    if (testPlanId) {
      // Delete phases and tasks first (they reference the plan)
      await db.delete(planTasks).where(eq(planTasks.planId, testPlanId));
      await db.delete(planPhases).where(eq(planPhases.planId, testPlanId));
      await db.delete(actionPlans).where(eq(actionPlans.id, testPlanId));
    }
    if (testSearchId) {
      // Delete all plans for this search first
      const plansToDelete = await db
        .select()
        .from(actionPlans)
        .where(eq(actionPlans.searchId, testSearchId));
      
      for (const plan of plansToDelete) {
        await db.delete(planTasks).where(eq(planTasks.planId, plan.id));
        await db.delete(planPhases).where(eq(planPhases.planId, plan.id));
        await db.delete(actionPlans).where(eq(actionPlans.id, plan.id));
      }
      
      await db.delete(searches).where(eq(searches.id, testSearchId));
    }
    if (testUserId) {
      const { users } = await import('@shared/schema');
      // Delete all searches for this user first
      const userSearches = await db
        .select()
        .from(searches)
        .where(eq(searches.userId, testUserId));
      
      for (const search of userSearches) {
        const plansToDelete = await db
          .select()
          .from(actionPlans)
          .where(eq(actionPlans.searchId, search.id));
        
        for (const plan of plansToDelete) {
          await db.delete(planTasks).where(eq(planTasks.planId, plan.id));
          await db.delete(planPhases).where(eq(planPhases.planId, plan.id));
          await db.delete(actionPlans).where(eq(actionPlans.id, plan.id));
        }
        
        await db.delete(searches).where(eq(searches.id, search.id));
      }
      
      await db.delete(users).where(eq(users.id, testUserId));
    }
  });

  describe('createPlanFromSearch', () => {
    it('should create a new action plan from search results', async () => {
      const aiGeneratedPlan = {
        phases: [
          { name: 'Research', tasks: ['Task 1', 'Task 2'] },
          { name: 'Development', tasks: ['Task 3', 'Task 4'] },
        ],
      };

      const plan = await planService.createPlanFromSearch(
        testSearchId,
        testUserId,
        'Test Action Plan',
        'Test description',
        aiGeneratedPlan
      );

      testPlanId = plan.id;

      expect(plan).toBeDefined();
      expect(plan.searchId).toBe(testSearchId);
      expect(plan.userId).toBe(testUserId);
      expect(plan.title).toBe('Test Action Plan');
      expect(plan.description).toBe('Test description');
      expect(plan.status).toBe('active');
      expect(plan.originalPlan).toEqual(aiGeneratedPlan);
      expect(plan.customizations).toEqual({});
      expect(plan.completedAt).toBeNull();
    });

    it('should create plan with template ID', async () => {
      const aiGeneratedPlan = { phases: [] };
      const templateId = 1;

      const plan = await planService.createPlanFromSearch(
        testSearchId,
        testUserId,
        'Test Plan with Template',
        null,
        aiGeneratedPlan,
        templateId
      );

      testPlanId = plan.id;

      expect(plan.templateId).toBe(templateId);
    });

    it('should throw error if search does not exist', async () => {
      const nonExistentSearchId = 999999;

      await expect(
        planService.createPlanFromSearch(
          nonExistentSearchId,
          testUserId,
          'Test Plan',
          null,
          {}
        )
      ).rejects.toThrow('Search not found or access denied');
    });

    it('should throw error if user does not own the search', async () => {
      const otherUserId = testUserId + 1;

      await expect(
        planService.createPlanFromSearch(
          testSearchId,
          otherUserId,
          'Test Plan',
          null,
          {}
        )
      ).rejects.toThrow('Search not found or access denied');
    });

    it('should throw error if plan already exists for search', async () => {
      // Create first plan
      const plan1 = await planService.createPlanFromSearch(
        testSearchId,
        testUserId,
        'First Plan',
        null,
        {}
      );
      testPlanId = plan1.id;

      // Try to create second plan for same search
      await expect(
        planService.createPlanFromSearch(
          testSearchId,
          testUserId,
          'Second Plan',
          null,
          {}
        )
      ).rejects.toThrow('Action plan already exists for this search');
    });
  });

  describe('getPlanById', () => {
    beforeEach(async () => {
      const plan = await planService.createPlanFromSearch(
        testSearchId,
        testUserId,
        'Test Plan',
        null,
        {}
      );
      testPlanId = plan.id;
    });

    it('should retrieve plan by ID', async () => {
      const plan = await planService.getPlanById(testPlanId, testUserId);

      expect(plan).toBeDefined();
      expect(plan?.id).toBe(testPlanId);
      expect(plan?.userId).toBe(testUserId);
    });

    it('should return null if plan does not exist', async () => {
      const nonExistentPlanId = 999999;
      const plan = await planService.getPlanById(nonExistentPlanId, testUserId);

      expect(plan).toBeNull();
    });

    it('should return null if user does not own the plan', async () => {
      const otherUserId = testUserId + 1;
      const plan = await planService.getPlanById(testPlanId, otherUserId);

      expect(plan).toBeNull();
    });
  });

  describe('getPlanBySearchId', () => {
    beforeEach(async () => {
      const plan = await planService.createPlanFromSearch(
        testSearchId,
        testUserId,
        'Test Plan',
        null,
        {}
      );
      testPlanId = plan.id;
    });

    it('should retrieve plan by search ID', async () => {
      const plan = await planService.getPlanBySearchId(testSearchId, testUserId);

      expect(plan).toBeDefined();
      expect(plan?.searchId).toBe(testSearchId);
      expect(plan?.userId).toBe(testUserId);
    });

    it('should return null if no plan exists for search', async () => {
      const { users } = await import('@shared/schema');
      const [otherUser] = await db
        .insert(users)
        .values({
          email: `other-${Date.now()}@example.com`,
          password: 'hashedpassword',
          name: 'Other User',
          plan: 'free',
        })
        .returning();

      const [otherSearch] = await db
        .insert(searches)
        .values({
          query: 'Other search',
          userId: otherUser.id,
          resultsCount: 0,
        })
        .returning();

      const plan = await planService.getPlanBySearchId(otherSearch.id, otherUser.id);

      expect(plan).toBeNull();

      // Cleanup
      await db.delete(searches).where(eq(searches.id, otherSearch.id));
      await db.delete(users).where(eq(users.id, otherUser.id));
    });
  });

  describe('getUserPlans', () => {
    beforeEach(async () => {
      // Create multiple plans
      const plan1 = await planService.createPlanFromSearch(
        testSearchId,
        testUserId,
        'Plan 1',
        null,
        {}
      );
      testPlanId = plan1.id;

      // Create another search for second plan
      const [search2] = await db
        .insert(searches)
        .values({
          query: 'Second search',
          userId: testUserId,
          resultsCount: 0,
        })
        .returning();

      await planService.createPlanFromSearch(
        search2.id,
        testUserId,
        'Plan 2',
        null,
        {}
      );
    });

    it('should retrieve all plans for user', async () => {
      const plans = await planService.getUserPlans(testUserId);

      expect(plans).toHaveLength(2);
      expect(plans[0].userId).toBe(testUserId);
      expect(plans[1].userId).toBe(testUserId);
    });

    it('should filter plans by status', async () => {
      // Update one plan to completed
      await planService.updatePlanStatus(testPlanId, testUserId, 'completed');

      const activePlans = await planService.getUserPlans(testUserId, 'active');
      const completedPlans = await planService.getUserPlans(testUserId, 'completed');

      expect(activePlans).toHaveLength(1);
      expect(completedPlans).toHaveLength(1);
      expect(completedPlans[0].status).toBe('completed');
    });
  });

  describe('updatePlanMetadata', () => {
    beforeEach(async () => {
      const plan = await planService.createPlanFromSearch(
        testSearchId,
        testUserId,
        'Original Title',
        'Original description',
        {}
      );
      testPlanId = plan.id;
    });

    it('should update plan title', async () => {
      const updatedPlan = await planService.updatePlanMetadata(
        testPlanId,
        testUserId,
        { title: 'Updated Title' }
      );

      expect(updatedPlan.title).toBe('Updated Title');
      expect(updatedPlan.description).toBe('Original description');
    });

    it('should update plan description', async () => {
      const updatedPlan = await planService.updatePlanMetadata(
        testPlanId,
        testUserId,
        { description: 'Updated description' }
      );

      expect(updatedPlan.title).toBe('Original Title');
      expect(updatedPlan.description).toBe('Updated description');
    });

    it('should update both title and description', async () => {
      const updatedPlan = await planService.updatePlanMetadata(
        testPlanId,
        testUserId,
        {
          title: 'New Title',
          description: 'New description',
        }
      );

      expect(updatedPlan.title).toBe('New Title');
      expect(updatedPlan.description).toBe('New description');
    });

    it('should throw error if plan does not exist', async () => {
      const nonExistentPlanId = 999999;

      await expect(
        planService.updatePlanMetadata(nonExistentPlanId, testUserId, {
          title: 'New Title',
        })
      ).rejects.toThrow('Plan not found or access denied');
    });
  });

  describe('updatePlanStatus', () => {
    beforeEach(async () => {
      const plan = await planService.createPlanFromSearch(
        testSearchId,
        testUserId,
        'Test Plan',
        null,
        {}
      );
      testPlanId = plan.id;
    });

    it('should update plan status to completed', async () => {
      const updatedPlan = await planService.updatePlanStatus(
        testPlanId,
        testUserId,
        'completed'
      );

      expect(updatedPlan.status).toBe('completed');
      expect(updatedPlan.completedAt).toBeDefined();
      expect(updatedPlan.completedAt).not.toBeNull();
    });

    it('should update plan status to archived', async () => {
      const updatedPlan = await planService.updatePlanStatus(
        testPlanId,
        testUserId,
        'archived'
      );

      expect(updatedPlan.status).toBe('archived');
    });

    it('should clear completedAt when moving from completed to active', async () => {
      // First mark as completed
      await planService.updatePlanStatus(testPlanId, testUserId, 'completed');

      // Then move back to active
      const updatedPlan = await planService.updatePlanStatus(
        testPlanId,
        testUserId,
        'active'
      );

      expect(updatedPlan.status).toBe('active');
      expect(updatedPlan.completedAt).toBeNull();
    });

    it('should throw error if plan does not exist', async () => {
      const nonExistentPlanId = 999999;

      await expect(
        planService.updatePlanStatus(nonExistentPlanId, testUserId, 'completed')
      ).rejects.toThrow('Plan not found or access denied');
    });
  });

  describe('updatePlanCustomizations', () => {
    beforeEach(async () => {
      const plan = await planService.createPlanFromSearch(
        testSearchId,
        testUserId,
        'Test Plan',
        null,
        {}
      );
      testPlanId = plan.id;
    });

    it('should add customizations to plan', async () => {
      const customizations = {
        customField1: 'value1',
        customField2: 'value2',
      };

      const updatedPlan = await planService.updatePlanCustomizations(
        testPlanId,
        testUserId,
        customizations
      );

      expect(updatedPlan.customizations).toEqual(customizations);
    });

    it('should merge new customizations with existing ones', async () => {
      // Add first set of customizations
      await planService.updatePlanCustomizations(testPlanId, testUserId, {
        field1: 'value1',
      });

      // Add second set
      const updatedPlan = await planService.updatePlanCustomizations(
        testPlanId,
        testUserId,
        { field2: 'value2' }
      );

      expect(updatedPlan.customizations).toEqual({
        field1: 'value1',
        field2: 'value2',
      });
    });

    it('should overwrite existing customization fields', async () => {
      // Add initial customizations
      await planService.updatePlanCustomizations(testPlanId, testUserId, {
        field1: 'original',
      });

      // Update same field
      const updatedPlan = await planService.updatePlanCustomizations(
        testPlanId,
        testUserId,
        { field1: 'updated' }
      );

      expect(updatedPlan.customizations).toEqual({
        field1: 'updated',
      });
    });
  });

  describe('deletePlan', () => {
    beforeEach(async () => {
      const plan = await planService.createPlanFromSearch(
        testSearchId,
        testUserId,
        'Test Plan',
        null,
        {}
      );
      testPlanId = plan.id;
    });

    it('should delete a plan', async () => {
      await planService.deletePlan(testPlanId, testUserId);

      const plan = await planService.getPlanById(testPlanId, testUserId);
      expect(plan).toBeNull();

      testPlanId = 0; // Reset to avoid cleanup error
    });

    it('should throw error if plan does not exist', async () => {
      const nonExistentPlanId = 999999;

      await expect(
        planService.deletePlan(nonExistentPlanId, testUserId)
      ).rejects.toThrow('Plan not found or access denied');
    });

    it('should throw error if user does not own the plan', async () => {
      const otherUserId = testUserId + 1;

      await expect(
        planService.deletePlan(testPlanId, otherUserId)
      ).rejects.toThrow('Plan not found or access denied');
    });
  });

  describe('getPlanWithDetails', () => {
    beforeEach(async () => {
      const plan = await planService.createPlanFromSearch(
        testSearchId,
        testUserId,
        'Test Plan',
        null,
        {}
      );
      testPlanId = plan.id;

      // Add phases and tasks
      const [phase1] = await db
        .insert(planPhases)
        .values({
          planId: testPlanId,
          name: 'Phase 1',
          description: 'First phase',
          order: 1,
          isCustom: false,
        })
        .returning();

      await db.insert(planTasks).values([
        {
          phaseId: phase1.id,
          planId: testPlanId,
          title: 'Task 1',
          description: 'First task',
          order: 1,
          status: 'not_started',
          isCustom: false,
        },
        {
          phaseId: phase1.id,
          planId: testPlanId,
          title: 'Task 2',
          description: 'Second task',
          order: 2,
          status: 'not_started',
          isCustom: false,
        },
      ]);
    });

    it('should retrieve plan with phases and tasks', async () => {
      const result = await planService.getPlanWithDetails(testPlanId, testUserId);

      expect(result).toBeDefined();
      expect(result?.plan.id).toBe(testPlanId);
      expect(result?.phases).toHaveLength(1);
      expect(result?.phases[0].tasks).toHaveLength(2);
      expect(result?.phases[0].name).toBe('Phase 1');
      expect(result?.phases[0].tasks[0].title).toBe('Task 1');
      expect(result?.phases[0].tasks[1].title).toBe('Task 2');
    });

    it('should return null if plan does not exist', async () => {
      const nonExistentPlanId = 999999;
      const result = await planService.getPlanWithDetails(
        nonExistentPlanId,
        testUserId
      );

      expect(result).toBeNull();
    });
  });

  describe('hasAccess', () => {
    beforeEach(async () => {
      const plan = await planService.createPlanFromSearch(
        testSearchId,
        testUserId,
        'Test Plan',
        null,
        {}
      );
      testPlanId = plan.id;
    });

    it('should return true if user has access', async () => {
      const hasAccess = await planService.hasAccess(testPlanId, testUserId);
      expect(hasAccess).toBe(true);
    });

    it('should return false if user does not have access', async () => {
      const otherUserId = testUserId + 1;
      const hasAccess = await planService.hasAccess(testPlanId, otherUserId);
      expect(hasAccess).toBe(false);
    });

    it('should return false if plan does not exist', async () => {
      const nonExistentPlanId = 999999;
      const hasAccess = await planService.hasAccess(nonExistentPlanId, testUserId);
      expect(hasAccess).toBe(false);
    });
  });

  describe('getPlanStatistics', () => {
    beforeEach(async () => {
      const plan = await planService.createPlanFromSearch(
        testSearchId,
        testUserId,
        'Test Plan',
        null,
        {}
      );
      testPlanId = plan.id;

      // Add phases and tasks with different statuses
      const [phase1] = await db
        .insert(planPhases)
        .values({
          planId: testPlanId,
          name: 'Phase 1',
          order: 1,
          isCustom: false,
        })
        .returning();

      await db.insert(planTasks).values([
        {
          phaseId: phase1.id,
          planId: testPlanId,
          title: 'Task 1',
          order: 1,
          status: 'completed',
          isCustom: false,
        },
        {
          phaseId: phase1.id,
          planId: testPlanId,
          title: 'Task 2',
          order: 2,
          status: 'in_progress',
          isCustom: false,
        },
        {
          phaseId: phase1.id,
          planId: testPlanId,
          title: 'Task 3',
          order: 3,
          status: 'not_started',
          isCustom: false,
        },
        {
          phaseId: phase1.id,
          planId: testPlanId,
          title: 'Task 4',
          order: 4,
          status: 'skipped',
          isCustom: false,
        },
      ]);
    });

    it('should calculate plan statistics correctly', async () => {
      const stats = await planService.getPlanStatistics(testPlanId, testUserId);

      expect(stats).toBeDefined();
      expect(stats?.totalPhases).toBe(1);
      expect(stats?.totalTasks).toBe(4);
      expect(stats?.completedTasks).toBe(1);
      expect(stats?.inProgressTasks).toBe(1);
      expect(stats?.notStartedTasks).toBe(1);
      expect(stats?.skippedTasks).toBe(1);
      expect(stats?.completionPercentage).toBe(25); // 1 out of 4 = 25%
    });

    it('should return null if plan does not exist', async () => {
      const nonExistentPlanId = 999999;
      const stats = await planService.getPlanStatistics(
        nonExistentPlanId,
        testUserId
      );

      expect(stats).toBeNull();
    });

    it('should handle plan with no tasks', async () => {
      // Create a new plan without tasks
      const [newSearch] = await db
        .insert(searches)
        .values({
          query: 'Empty plan search',
          userId: testUserId,
          resultsCount: 0,
        })
        .returning();

      const emptyPlan = await planService.createPlanFromSearch(
        newSearch.id,
        testUserId,
        'Empty Plan',
        null,
        {}
      );

      const stats = await planService.getPlanStatistics(emptyPlan.id, testUserId);

      expect(stats?.totalTasks).toBe(0);
      expect(stats?.completionPercentage).toBe(0);

      // Cleanup
      await db.delete(actionPlans).where(eq(actionPlans.id, emptyPlan.id));
      await db.delete(searches).where(eq(searches.id, newSearch.id));
    });
  });

  describe('restoreOriginalPlan', () => {
    beforeEach(async () => {
      const plan = await planService.createPlanFromSearch(
        testSearchId,
        testUserId,
        'Test Plan',
        null,
        { original: 'data' }
      );
      testPlanId = plan.id;

      // Add some customizations
      await planService.updatePlanCustomizations(testPlanId, testUserId, {
        custom1: 'value1',
        custom2: 'value2',
      });
    });

    it('should restore original plan by clearing customizations', async () => {
      const restoredPlan = await planService.restoreOriginalPlan(
        testPlanId,
        testUserId
      );

      expect(restoredPlan.customizations).toEqual({});
      expect(restoredPlan.originalPlan).toEqual({ original: 'data' });
    });

    it('should throw error if plan does not exist', async () => {
      const nonExistentPlanId = 999999;

      await expect(
        planService.restoreOriginalPlan(nonExistentPlanId, testUserId)
      ).rejects.toThrow('Plan not found or access denied');
    });
  });
});
