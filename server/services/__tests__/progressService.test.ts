import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { progressService } from '../progressService';
import { db } from '../../db';
import { 
  users, 
  searches, 
  actionPlans, 
  planPhases, 
  planTasks,
  progressSnapshots
} from '../../../shared/schema';
import { eq } from 'drizzle-orm';

describe('ProgressService', () => {
  let testUserId: number;
  let testSearchId: number;
  let testPlanId: number;
  let testPhaseId: number;

  beforeEach(async () => {
    const [user] = await db.insert(users).values({
      email: 'progress-test@example.com',
      password: 'hashed_password',
      plan: 'pro',
    }).returning();
    testUserId = user.id;

    const [search] = await db.insert(searches).values({
      userId: testUserId,
      query: 'Test gap analysis',
    }).returning();
    testSearchId = search.id;

    const [plan] = await db.insert(actionPlans).values({
      searchId: testSearchId,
      userId: testUserId,
      title: 'Test Action Plan',
      description: 'Test plan for progress tracking',
      status: 'active',
      originalPlan: {},
      customizations: {},
    }).returning();
    testPlanId = plan.id;

    const [phase] = await db.insert(planPhases).values({
      planId: testPlanId,
      name: 'Research Phase',
      description: 'Initial research and validation',
      order: 1,
      estimatedDuration: '2 weeks',
      isCustom: false,
    }).returning();
    testPhaseId = phase.id;
  });

  afterEach(async () => {
    await db.delete(progressSnapshots).where(eq(progressSnapshots.planId, testPlanId));
    await db.delete(planTasks).where(eq(planTasks.planId, testPlanId));
    await db.delete(planPhases).where(eq(planPhases.planId, testPlanId));
    await db.delete(actionPlans).where(eq(actionPlans.id, testPlanId));
    await db.delete(searches).where(eq(searches.id, testSearchId));
    await db.delete(users).where(eq(users.id, testUserId));
  });

  describe('calculateProgress', () => {
    it('should return null for non-existent plan', async () => {
      const progress = await progressService.calculateProgress(99999, testUserId);
      expect(progress).toBeNull();
    });

    it('should calculate progress for plan with no tasks', async () => {
      const progress = await progressService.calculateProgress(testPlanId, testUserId);
      expect(progress).toBeDefined();
      expect(progress?.totalTasks).toBe(0);
      expect(progress?.completedTasks).toBe(0);
    });
  });
});

import { progressService } from '../progressService';
import { db } from '../../db';
import { 
  users, 
  searches, 
  actionPlans, 
  planPhases, 
  planTasks,
  progressSnapshots
} from '../../../shared/schema';
import { eq } from 'drizzle-orm';

describe('ProgressService', () => {
  let testUserId: number;
  let testSearchId: number;
  let testPlanId: number;
  let testPhaseId: number;

  beforeEach(async () => {
    const [user] = await db.insert(users).values({
      email: 'progress-test@example.com',
      password: 'hashed_password',
      plan: 'pro',
    }).returning();
    testUserId = user.id;

    const [search] = await db.insert(searches).values({
      userId: testUserId,
      query: 'Test gap analysis',
    }).returning();
    testSearchId = search.id;

    const [plan] = await db.insert(actionPlans).values({
      searchId: testSearchId,
      userId: testUserId,
      title: 'Test Action Plan',
      description: 'Test plan for progress tracking',
      status: 'active',
      originalPlan: {},
      customizations: {},
    }).returning();
    testPlanId = plan.id;

    const [phase] = await db.insert(planPhases).values({
      planId: testPlanId,
      name: 'Research Phase',
      description: 'Initial research and validation',
      order: 1,
      estimatedDuration: '2 weeks',
      isCustom: false,
    }).returning();
    testPhaseId = phase.id;
  });

  afterEach(async () => {
    await db.delete(progressSnapshots).where(eq(progressSnapshots.planId, testPlanId));
    await db.delete(planTasks).where(eq(planTasks.planId, testPlanId));
    await db.delete(planPhases).where(eq(planPhases.planId, testPlanId));
    await db.delete(actionPlans).where(eq(actionPlans.id, testPlanId));
    await db.delete(searches).where(eq(searches.id, testSearchId));
    await db.delete(users).where(eq(users.id, testUserId));
  });

  describe('calculateProgress', () => {
    it('should return null for non-existent plan', async () => {
      const progress = await progressService.calculateProgress(99999, testUserId);
      expect(progress).toBeNull();
    });

    it('should return null when user does not own the plan', async () => {
      const progress = await progressService.calculateProgress(testPlanId, 99999);
      expect(progress).toBeNull();
    });

    it('should calculate progress for plan with no tasks', async () => {
      const progress = await progressService.calculateProgress(testPlanId, testUserId);
      expect(progress).toBeDefined();
      expect(progress?.totalTasks).toBe(0);
      expect(progress?.completedTasks).toBe(0);
      expect(progress?.completionPercentage).toBe(0);
    });

    it('should calculate progress with mixed task statuses', async () => {
      await db.insert(planTasks).values([
        {
          planId: testPlanId,
          phaseId: testPhaseId,
          title: 'Task 1',
          description: 'Completed task',
          order: 1,
          status: 'completed',
          isCustom: false,
          completedAt: new Date().toISOString(),
        },
        {
          planId: testPlanId,
          phaseId: testPhaseId,
          title: 'Task 2',
          description: 'In progress task',
          order: 2,
          status: 'in_progress',
          isCustom: false,
        },
      ]);

      const progress = await progressService.calculateProgress(testPlanId, testUserId);
      expect(progress?.totalTasks).toBe(2);
      expect(progress?.completedTasks).toBe(1);
      expect(progress?.inProgressTasks).toBe(1);
      expect(progress?.completionPercentage).toBe(50);
    });
  });

  describe('createProgressSnapshot', () => {
    it('should create a progress snapshot', async () => {
      await db.insert(planTasks).values({
        planId: testPlanId,
        phaseId: testPhaseId,
        title: 'Task 1',
        description: 'Completed task',
        order: 1,
        status: 'completed',
        isCustom: false,
        completedAt: new Date().toISOString(),
      });

      const snapshot = await progressService.createProgressSnapshot(testPlanId, testUserId);
      expect(snapshot).toBeDefined();
      expect(snapshot.planId).toBe(testPlanId);
      expect(snapshot.totalTasks).toBe(1);
      expect(snapshot.completedTasks).toBe(1);
    });

    it('should throw error for non-existent plan', async () => {
      await expect(
        progressService.createProgressSnapshot(99999, testUserId)
      ).rejects.toThrow('Plan not found or access denied');
    });
  });

  describe('getUserProgressSummary', () => {
    it('should return zero metrics when user has no active plans', async () => {
      await db.update(actionPlans)
        .set({ status: 'completed' })
        .where(eq(actionPlans.id, testPlanId));

      const summary = await progressService.getUserProgressSummary(testUserId);
      expect(summary.activePlans).toBe(0);
      expect(summary.totalTasks).toBe(0);
    });

    it('should aggregate metrics for active plans', async () => {
      await db.insert(planTasks).values({
        planId: testPlanId,
        phaseId: testPhaseId,
        title: 'Task 1',
        description: 'Completed',
        order: 1,
        status: 'completed',
        isCustom: false,
        completedAt: new Date().toISOString(),
      });

      const summary = await progressService.getUserProgressSummary(testUserId);
      expect(summary.activePlans).toBe(1);
      expect(summary.totalTasks).toBe(1);
      expect(summary.completedTasks).toBe(1);
    });
  });

  describe('shouldCreateSnapshot', () => {
    it('should return true when no snapshot exists for today', async () => {
      const shouldCreate = await progressService.shouldCreateSnapshot(testPlanId);
      expect(shouldCreate).toBe(true);
    });

    it('should return false when snapshot already exists for today', async () => {
      await progressService.createProgressSnapshot(testPlanId, testUserId);
      const shouldCreate = await progressService.shouldCreateSnapshot(testPlanId);
      expect(shouldCreate).toBe(false);
    });
  });
});
