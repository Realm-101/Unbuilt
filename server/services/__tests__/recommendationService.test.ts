import { describe, it, expect, beforeEach, vi } from 'vitest';
import { recommendationService, RecommendationService } from '../recommendationService';
import { db } from '../../db';

// Mock the database
vi.mock('../../db', () => ({
  db: {
    select: vi.fn(),
  },
}));

describe('RecommendationService', () => {
  let service: RecommendationService;

  beforeEach(() => {
    service = new RecommendationService();
    vi.clearAllMocks();
  });

  describe('detectStuckTasks', () => {
    it('should detect tasks stuck for more than 7 days', async () => {
      const planId = 1;
      const eightDaysAgo = new Date();
      eightDaysAgo.setDate(eightDaysAgo.getDate() - 8);

      const mockStuckTasks = [
        {
          id: 1,
          planId,
          phaseId: 1,
          title: 'Stuck Task 1',
          status: 'in_progress',
          updatedAt: eightDaysAgo.toISOString(),
        },
      ];

      // Mock the database query chain
      const mockWhere = vi.fn().mockResolvedValue(mockStuckTasks);
      const mockFrom = vi.fn().mockReturnValue({ where: mockWhere });
      (db.select as any).mockReturnValue({ from: mockFrom });

      const recommendations = await service.detectStuckTasks(planId);

      expect(recommendations).toHaveLength(1);
      expect(recommendations[0].type).toBe('stuck_task');
      expect(recommendations[0].priority).toBe('medium');
      expect(recommendations[0].metadata?.taskId).toBe(1);
      expect(recommendations[0].metadata?.daysSinceUpdate).toBeGreaterThanOrEqual(8);
    });

    it('should mark tasks stuck for >14 days as high priority', async () => {
      const planId = 1;
      const fifteenDaysAgo = new Date();
      fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15);

      const mockStuckTasks = [
        {
          id: 1,
          planId,
          phaseId: 1,
          title: 'Very Stuck Task',
          status: 'in_progress',
          updatedAt: fifteenDaysAgo.toISOString(),
        },
      ];

      const mockWhere = vi.fn().mockResolvedValue(mockStuckTasks);
      const mockFrom = vi.fn().mockReturnValue({ where: mockWhere });
      (db.select as any).mockReturnValue({ from: mockFrom });

      const recommendations = await service.detectStuckTasks(planId);

      expect(recommendations).toHaveLength(1);
      expect(recommendations[0].priority).toBe('high');
    });

    it('should return empty array when no stuck tasks', async () => {
      const planId = 1;

      const mockWhere = vi.fn().mockResolvedValue([]);
      const mockFrom = vi.fn().mockReturnValue({ where: mockWhere });
      (db.select as any).mockReturnValue({ from: mockFrom });

      const recommendations = await service.detectStuckTasks(planId);

      expect(recommendations).toHaveLength(0);
    });

    it('should include actionable suggestions in metadata', async () => {
      const planId = 1;
      const eightDaysAgo = new Date();
      eightDaysAgo.setDate(eightDaysAgo.getDate() - 8);

      const mockStuckTasks = [
        {
          id: 1,
          planId,
          phaseId: 1,
          title: 'Stuck Task',
          status: 'in_progress',
          updatedAt: eightDaysAgo.toISOString(),
        },
      ];

      const mockWhere = vi.fn().mockResolvedValue(mockStuckTasks);
      const mockFrom = vi.fn().mockReturnValue({ where: mockWhere });
      (db.select as any).mockReturnValue({ from: mockFrom });

      const recommendations = await service.detectStuckTasks(planId);

      expect(recommendations[0].metadata?.suggestions).toBeDefined();
      expect(recommendations[0].metadata?.suggestions).toBeInstanceOf(Array);
      expect(recommendations[0].metadata?.suggestions?.length).toBeGreaterThan(0);
    });
  });

  describe('detectPlanReviewNeeded', () => {
    it('should recommend plan review when >20% tasks are skipped', async () => {
      const planId = 1;

      const mockTasks = [
        { id: 1, planId, phaseId: 1, title: 'Task 1', status: 'completed' },
        { id: 2, planId, phaseId: 1, title: 'Task 2', status: 'completed' },
        { id: 3, planId, phaseId: 1, title: 'Task 3', status: 'skipped' },
        { id: 4, planId, phaseId: 1, title: 'Task 4', status: 'skipped' },
        { id: 5, planId, phaseId: 1, title: 'Task 5', status: 'skipped' },
      ];

      const mockPhases = [
        { id: 1, planId, name: 'Phase 1', order: 1 },
      ];

      // Mock tasks query
      const mockTasksWhere = vi.fn().mockResolvedValue(mockTasks);
      const mockTasksFrom = vi.fn().mockReturnValue({ where: mockTasksWhere });

      // Mock phases query
      const mockPhasesWhere = vi.fn().mockResolvedValue(mockPhases);
      const mockPhasesFrom = vi.fn().mockReturnValue({ where: mockPhasesWhere });

      (db.select as any)
        .mockReturnValueOnce({ from: mockTasksFrom })
        .mockReturnValueOnce({ from: mockPhasesFrom });

      const recommendations = await service.detectPlanReviewNeeded(planId);

      expect(recommendations.length).toBeGreaterThan(0);
      const planReviewRec = recommendations.find(r => r.id === `plan-review-${planId}`);
      expect(planReviewRec).toBeDefined();
      expect(planReviewRec?.type).toBe('plan_review');
      expect(planReviewRec?.priority).toBe('high');
      expect(planReviewRec?.metadata?.skippedCount).toBe(3);
    });

    it('should not recommend review when <20% tasks are skipped', async () => {
      const planId = 1;

      const mockTasks = [
        { id: 1, planId, phaseId: 1, title: 'Task 1', status: 'completed' },
        { id: 2, planId, phaseId: 1, title: 'Task 2', status: 'completed' },
        { id: 3, planId, phaseId: 1, title: 'Task 3', status: 'completed' },
        { id: 4, planId, phaseId: 1, title: 'Task 4', status: 'completed' },
        { id: 5, planId, phaseId: 1, title: 'Task 5', status: 'skipped' },
      ];

      const mockPhases = [
        { id: 1, planId, name: 'Phase 1', order: 1 },
      ];

      const mockTasksWhere = vi.fn().mockResolvedValue(mockTasks);
      const mockTasksFrom = vi.fn().mockReturnValue({ where: mockTasksWhere });

      const mockPhasesWhere = vi.fn().mockResolvedValue(mockPhases);
      const mockPhasesFrom = vi.fn().mockReturnValue({ where: mockPhasesWhere });

      (db.select as any)
        .mockReturnValueOnce({ from: mockTasksFrom })
        .mockReturnValueOnce({ from: mockPhasesFrom });

      const recommendations = await service.detectPlanReviewNeeded(planId);

      const planReviewRec = recommendations.find(r => r.id === `plan-review-${planId}`);
      expect(planReviewRec).toBeUndefined();
    });

    it('should detect phases with all tasks skipped', async () => {
      const planId = 1;

      const mockTasks = [
        { id: 1, planId, phaseId: 1, title: 'Task 1', status: 'skipped' },
        { id: 2, planId, phaseId: 1, title: 'Task 2', status: 'skipped' },
        { id: 3, planId, phaseId: 2, title: 'Task 3', status: 'completed' },
      ];

      const mockPhases = [
        { id: 1, planId, name: 'Research Phase', order: 1 },
        { id: 2, planId, name: 'Development Phase', order: 2 },
      ];

      const mockTasksWhere = vi.fn().mockResolvedValue(mockTasks);
      const mockTasksFrom = vi.fn().mockReturnValue({ where: mockTasksWhere });

      const mockPhasesWhere = vi.fn().mockResolvedValue(mockPhases);
      const mockPhasesFrom = vi.fn().mockReturnValue({ where: mockPhasesWhere });

      (db.select as any)
        .mockReturnValueOnce({ from: mockTasksFrom })
        .mockReturnValueOnce({ from: mockPhasesFrom });

      const recommendations = await service.detectPlanReviewNeeded(planId);

      const phaseReviewRec = recommendations.find(r => r.id === 'phase-review-1');
      expect(phaseReviewRec).toBeDefined();
      expect(phaseReviewRec?.type).toBe('plan_review');
      expect(phaseReviewRec?.metadata?.phaseName).toBe('Research Phase');
    });
  });

  describe('generateTaskTips', () => {
    it('should generate tips for research tasks', async () => {
      const planId = 1;

      const mockTasks = [
        {
          id: 1,
          planId,
          phaseId: 1,
          title: 'Conduct market research',
          description: 'Research the target market',
          status: 'not_started',
          order: 1,
        },
      ];

      const mockLimit = vi.fn().mockResolvedValue(mockTasks);
      const mockOrderBy = vi.fn().mockReturnValue({ limit: mockLimit });
      const mockWhere = vi.fn().mockReturnValue({ orderBy: mockOrderBy });
      const mockFrom = vi.fn().mockReturnValue({ where: mockWhere });
      (db.select as any).mockReturnValue({ from: mockFrom });

      const recommendations = await service.generateTaskTips(planId);

      expect(recommendations.length).toBeGreaterThan(0);
      expect(recommendations[0].type).toBe('task_tip');
      expect(recommendations[0].priority).toBe('low');
      expect(recommendations[0].metadata?.category).toBe('research');
    });

    it('should generate tips for development tasks', async () => {
      const planId = 1;

      const mockTasks = [
        {
          id: 1,
          planId,
          phaseId: 1,
          title: 'Build the application',
          description: 'Develop and create the full application',
          status: 'in_progress',
          order: 1,
        },
      ];

      const mockLimit = vi.fn().mockResolvedValue(mockTasks);
      const mockOrderBy = vi.fn().mockReturnValue({ limit: mockLimit });
      const mockWhere = vi.fn().mockReturnValue({ orderBy: mockOrderBy });
      const mockFrom = vi.fn().mockReturnValue({ where: mockWhere });
      (db.select as any).mockReturnValue({ from: mockFrom });

      const recommendations = await service.generateTaskTips(planId);

      expect(recommendations.length).toBeGreaterThan(0);
      expect(recommendations[0].metadata?.category).toBe('development');
    });

    it('should limit tips to 5 tasks', async () => {
      const planId = 1;

      const mockTasks = Array.from({ length: 10 }, (_, i) => ({
        id: i + 1,
        planId,
        phaseId: 1,
        title: `Research task ${i + 1}`,
        description: 'Research description',
        status: 'not_started',
        order: i + 1,
      }));

      const mockLimit = vi.fn().mockResolvedValue(mockTasks.slice(0, 5));
      const mockOrderBy = vi.fn().mockReturnValue({ limit: mockLimit });
      const mockWhere = vi.fn().mockReturnValue({ orderBy: mockOrderBy });
      const mockFrom = vi.fn().mockReturnValue({ where: mockWhere });
      (db.select as any).mockReturnValue({ from: mockFrom });

      const recommendations = await service.generateTaskTips(planId);

      expect(recommendations.length).toBeLessThanOrEqual(5);
    });
  });

  describe('getRecommendationsForPlan', () => {
    it('should throw error if user does not have access to plan', async () => {
      const planId = 1;
      const userId = 999;

      const mockLimit = vi.fn().mockResolvedValue([]);
      const mockWhere = vi.fn().mockReturnValue({ limit: mockLimit });
      const mockFrom = vi.fn().mockReturnValue({ where: mockWhere });
      (db.select as any).mockReturnValue({ from: mockFrom });

      await expect(
        service.getRecommendationsForPlan(planId, userId)
      ).rejects.toThrow('Plan not found or access denied');
    });

    it('should combine all recommendation types', async () => {
      const planId = 1;
      const userId = 1;

      // Use spies to mock the individual methods
      const stuckTasksSpy = vi.spyOn(service, 'detectStuckTasks').mockResolvedValue([]);
      const phaseCompleteSpy = vi.spyOn(service, 'recommendResourcesForCompletedPhases').mockResolvedValue([]);
      const planReviewSpy = vi.spyOn(service, 'detectPlanReviewNeeded').mockResolvedValue([]);
      const taskTipsSpy = vi.spyOn(service, 'generateTaskTips').mockResolvedValue([]);

      // Mock plan access check
      const mockPlan = [{ id: planId, userId, title: 'Test Plan' }];
      const mockPlanLimit = vi.fn().mockResolvedValue(mockPlan);
      const mockPlanWhere = vi.fn().mockReturnValue({ limit: mockPlanLimit });
      const mockPlanFrom = vi.fn().mockReturnValue({ where: mockPlanWhere });
      (db.select as any).mockReturnValue({ from: mockPlanFrom });

      const recommendations = await service.getRecommendationsForPlan(planId, userId);

      expect(recommendations).toBeInstanceOf(Array);
      expect(stuckTasksSpy).toHaveBeenCalledWith(planId);
      expect(phaseCompleteSpy).toHaveBeenCalledWith(planId);
      expect(planReviewSpy).toHaveBeenCalledWith(planId);
      expect(taskTipsSpy).toHaveBeenCalledWith(planId);

      // Cleanup spies
      stuckTasksSpy.mockRestore();
      phaseCompleteSpy.mockRestore();
      planReviewSpy.mockRestore();
      taskTipsSpy.mockRestore();
    });

    it('should sort recommendations by priority', async () => {
      const planId = 1;
      const userId = 1;

      // Create a spy on the service methods
      const stuckTasksSpy = vi.spyOn(service, 'detectStuckTasks').mockResolvedValue([
        {
          id: 'stuck-1',
          type: 'stuck_task',
          priority: 'medium',
          title: 'Medium Priority',
          message: 'Test',
          actionable: true,
          createdAt: new Date(),
        },
      ]);

      const phaseCompleteSpy = vi.spyOn(service, 'recommendResourcesForCompletedPhases').mockResolvedValue([
        {
          id: 'phase-1',
          type: 'phase_complete',
          priority: 'high',
          title: 'High Priority',
          message: 'Test',
          actionable: true,
          createdAt: new Date(),
        },
      ]);

      const planReviewSpy = vi.spyOn(service, 'detectPlanReviewNeeded').mockResolvedValue([]);
      const taskTipsSpy = vi.spyOn(service, 'generateTaskTips').mockResolvedValue([
        {
          id: 'tip-1',
          type: 'task_tip',
          priority: 'low',
          title: 'Low Priority',
          message: 'Test',
          actionable: false,
          createdAt: new Date(),
        },
      ]);

      // Mock plan access check
      const mockPlan = [{ id: planId, userId, title: 'Test Plan' }];
      const mockPlanLimit = vi.fn().mockResolvedValue(mockPlan);
      const mockPlanWhere = vi.fn().mockReturnValue({ limit: mockPlanLimit });
      const mockPlanFrom = vi.fn().mockReturnValue({ where: mockPlanWhere });
      (db.select as any).mockReturnValue({ from: mockPlanFrom });

      const recommendations = await service.getRecommendationsForPlan(planId, userId);

      expect(recommendations).toHaveLength(3);
      expect(recommendations[0].priority).toBe('high');
      expect(recommendations[1].priority).toBe('medium');
      expect(recommendations[2].priority).toBe('low');

      // Cleanup spies
      stuckTasksSpy.mockRestore();
      phaseCompleteSpy.mockRestore();
      planReviewSpy.mockRestore();
      taskTipsSpy.mockRestore();
    });
  });

  describe('getRecommendationStats', () => {
    it('should return statistics about recommendations', async () => {
      const planId = 1;
      const userId = 1;

      const mockRecommendations = [
        {
          id: '1',
          type: 'stuck_task',
          priority: 'high',
          title: 'Test',
          message: 'Test',
          actionable: true,
          createdAt: new Date(),
        },
        {
          id: '2',
          type: 'stuck_task',
          priority: 'medium',
          title: 'Test',
          message: 'Test',
          actionable: true,
          createdAt: new Date(),
        },
        {
          id: '3',
          type: 'task_tip',
          priority: 'low',
          title: 'Test',
          message: 'Test',
          actionable: false,
          createdAt: new Date(),
        },
      ];

      const spy = vi.spyOn(service, 'getRecommendationsForPlan').mockResolvedValue(mockRecommendations);

      const stats = await service.getRecommendationStats(planId, userId);

      expect(stats.totalRecommendations).toBe(3);
      expect(stats.byType.stuck_task).toBe(2);
      expect(stats.byType.task_tip).toBe(1);
      expect(stats.byPriority.high).toBe(1);
      expect(stats.byPriority.medium).toBe(1);
      expect(stats.byPriority.low).toBe(1);

      spy.mockRestore();
    });
  });
});
