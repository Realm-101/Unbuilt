import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import plansRouter from '../plans';
import { jwtAuth } from '../../middleware/jwtAuth';
import { db } from '../../db';
import { users, searches, actionPlans, planPhases } from '@shared/schema';
import { eq } from 'drizzle-orm';

// Mock JWT auth middleware - will be updated with actual user ID in tests
let mockUserId = 1;
vi.mock('../../middleware/jwtAuth', () => ({
  jwtAuth: (req: any, res: any, next: any) => {
    req.user = { id: mockUserId, email: 'test-plans@example.com', plan: 'pro' };
    next();
  },
}));

describe('Plans API Routes', () => {
  let app: express.Application;
  let testUserId: number;
  let testSearchId: number;

  beforeEach(async () => {
    // Set up Express app with routes
    app = express();
    app.use(express.json());
    app.use('/api/plans', plansRouter);
    
    // Add error handling middleware
    const { errorHandlerMiddleware } = await import('../../middleware/errorHandler');
    app.use(errorHandlerMiddleware);

    // Clean up any existing test data first (in correct order)
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.email, 'test-plans@example.com'))
      .limit(1);
    
    if (existingUser.length > 0) {
      const userId = existingUser[0].id;
      
      // Get all plans for this user
      const plans = await db
        .select()
        .from(actionPlans)
        .where(eq(actionPlans.userId, userId));
      
      // Delete in correct order: tasks -> phases -> plans -> searches -> users
      for (const plan of plans) {
        const { planTasks } = await import('@shared/schema');
        await db.delete(planTasks).where(eq(planTasks.planId, plan.id));
        await db.delete(planPhases).where(eq(planPhases.planId, plan.id));
      }
      
      await db.delete(actionPlans).where(eq(actionPlans.userId, userId));
      await db.delete(searches).where(eq(searches.userId, userId));
      await db.delete(users).where(eq(users.id, userId));
    }

    // Create test user
    const [user] = await db
      .insert(users)
      .values({
        email: 'test-plans@example.com',
        plan: 'pro',
      })
      .returning();
    testUserId = user.id;
    mockUserId = user.id; // Update mock to use actual user ID

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
    // Clean up test data in correct order (respecting foreign key constraints)
    // Get all plans for this user
    const plans = await db
      .select()
      .from(actionPlans)
      .where(eq(actionPlans.userId, testUserId));
    
    // Delete in correct order: tasks -> phases -> plans -> searches -> users
    for (const plan of plans) {
      const { planTasks } = await import('@shared/schema');
      await db.delete(planTasks).where(eq(planTasks.planId, plan.id));
      await db.delete(planPhases).where(eq(planPhases.planId, plan.id));
    }
    
    await db.delete(actionPlans).where(eq(actionPlans.userId, testUserId));
    await db.delete(searches).where(eq(searches.userId, testUserId));
    await db.delete(users).where(eq(users.id, testUserId));
  });

  describe('POST /api/plans', () => {
    it('should create a new action plan', async () => {
      const response = await request(app)
        .post('/api/plans')
        .send({
          searchId: testSearchId,
          title: 'Test Action Plan',
          description: 'Test description',
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.title).toBe('Test Action Plan');
      expect(response.body.data.searchId).toBe(testSearchId);
      expect(response.body.data.userId).toBe(testUserId);
    });

    it('should reject plan creation with invalid search ID', async () => {
      const response = await request(app)
        .post('/api/plans')
        .send({
          searchId: 99999,
          title: 'Test Action Plan',
        });

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/plans/search/:searchId', () => {
    it('should fetch plan by search ID', async () => {
      // Create a plan first
      const [plan] = await db
        .insert(actionPlans)
        .values({
          searchId: testSearchId,
          userId: testUserId,
          title: 'Test Plan',
          description: 'Test description',
          status: 'active',
          originalPlan: {},
          customizations: {},
        })
        .returning();

      const response = await request(app)
        .get(`/api/plans/search/${testSearchId}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(plan.id);
      expect(response.body.data.searchId).toBe(testSearchId);
    });

    it('should return 404 for non-existent search', async () => {
      const response = await request(app)
        .get('/api/plans/search/99999');

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });
  });

  describe('PATCH /api/plans/:planId', () => {
    it('should update plan metadata', async () => {
      // Create a plan first
      const [plan] = await db
        .insert(actionPlans)
        .values({
          searchId: testSearchId,
          userId: testUserId,
          title: 'Original Title',
          description: 'Original description',
          status: 'active',
          originalPlan: {},
          customizations: {},
        })
        .returning();

      const response = await request(app)
        .patch(`/api/plans/${plan.id}`)
        .send({
          title: 'Updated Title',
          description: 'Updated description',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.title).toBe('Updated Title');
      expect(response.body.data.description).toBe('Updated description');
    });

    it('should update plan status', async () => {
      // Create a plan first
      const [plan] = await db
        .insert(actionPlans)
        .values({
          searchId: testSearchId,
          userId: testUserId,
          title: 'Test Plan',
          description: 'Test description',
          status: 'active',
          originalPlan: {},
          customizations: {},
        })
        .returning();

      const response = await request(app)
        .patch(`/api/plans/${plan.id}`)
        .send({
          status: 'completed',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('completed');
      expect(response.body.data.completedAt).toBeTruthy();
    });
  });

  describe('GET /api/plans/:planId/tasks', () => {
    it('should fetch all tasks for a plan', async () => {
      // Create a plan with phases and tasks
      const [plan] = await db
        .insert(actionPlans)
        .values({
          searchId: testSearchId,
          userId: testUserId,
          title: 'Test Plan',
          description: 'Test description',
          status: 'active',
          originalPlan: {},
          customizations: {},
        })
        .returning();

      const [phase] = await db
        .insert(planPhases)
        .values({
          planId: plan.id,
          name: 'Phase 1',
          description: 'Test phase',
          order: 0,
          estimatedDuration: '2 weeks',
          isCustom: false,
        })
        .returning();

      const response = await request(app)
        .get(`/api/plans/${plan.id}/tasks`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  describe('POST /api/plans/:planId/apply-template', () => {
    it('should apply template to existing plan', async () => {
      // Create a plan
      const [plan] = await db
        .insert(actionPlans)
        .values({
          searchId: testSearchId,
          userId: testUserId,
          title: 'Test Plan',
          description: 'Test description',
          status: 'active',
          originalPlan: { phases: [] },
          customizations: {},
        })
        .returning();

      // Create a phase and task
      const [phase] = await db
        .insert(planPhases)
        .values({
          planId: plan.id,
          name: 'Old Phase',
          description: 'Old phase description',
          order: 1,
          isCustom: false,
        })
        .returning();

      // Get a template (assuming template with ID 1 exists from seed data)
      const templateId = 1;

      const response = await request(app)
        .post(`/api/plans/${plan.id}/apply-template`)
        .send({
          templateId,
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.templateId).toBe(templateId);
      expect(response.body.message).toBe('Template applied successfully');
    });

    it('should return 404 for non-existent plan', async () => {
      const response = await request(app)
        .post('/api/plans/99999/apply-template')
        .send({
          templateId: 1,
        });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });

    it('should return 400 for invalid template ID', async () => {
      // Create a plan
      const [plan] = await db
        .insert(actionPlans)
        .values({
          searchId: testSearchId,
          userId: testUserId,
          title: 'Test Plan',
          description: 'Test description',
          status: 'active',
          originalPlan: {},
          customizations: {},
        })
        .returning();

      const response = await request(app)
        .post(`/api/plans/${plan.id}/apply-template`)
        .send({
          templateId: 'invalid',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should deny access to plans owned by other users', async () => {
      // Create another user
      const [otherUser] = await db
        .insert(users)
        .values({
          email: 'other-user@example.com',
          plan: 'free',
        })
        .returning();

      // Create a search for the other user
      const [otherSearch] = await db
        .insert(searches)
        .values({
          query: 'Other user search',
          userId: otherUser.id,
          resultsCount: 0,
        })
        .returning();

      // Create a plan for the other user
      const [otherPlan] = await db
        .insert(actionPlans)
        .values({
          searchId: otherSearch.id,
          userId: otherUser.id,
          title: 'Other User Plan',
          description: 'Other user description',
          status: 'active',
          originalPlan: {},
          customizations: {},
        })
        .returning();

      const response = await request(app)
        .post(`/api/plans/${otherPlan.id}/apply-template`)
        .send({
          templateId: 1,
        });

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/plans/users/:userId/progress/summary', () => {
    it('should return progress summary for user with active plans', async () => {
      // Create a plan with tasks
      const [plan] = await db
        .insert(actionPlans)
        .values({
          searchId: testSearchId,
          userId: testUserId,
          title: 'Test Plan',
          description: 'Test description',
          status: 'active',
          originalPlan: {},
          customizations: {},
        })
        .returning();

      const [phase] = await db
        .insert(planPhases)
        .values({
          planId: plan.id,
          name: 'Phase 1',
          description: 'Test phase',
          order: 0,
          estimatedDuration: '2 weeks',
          isCustom: false,
        })
        .returning();

      // Create some tasks
      const { planTasks } = await import('@shared/schema');
      await db.insert(planTasks).values([
        {
          phaseId: phase.id,
          planId: plan.id,
          title: 'Task 1',
          description: 'Test task 1',
          order: 0,
          status: 'completed',
          isCustom: false,
          completedAt: new Date().toISOString(),
        },
        {
          phaseId: phase.id,
          planId: plan.id,
          title: 'Task 2',
          description: 'Test task 2',
          order: 1,
          status: 'in_progress',
          isCustom: false,
        },
        {
          phaseId: phase.id,
          planId: plan.id,
          title: 'Task 3',
          description: 'Test task 3',
          order: 2,
          status: 'not_started',
          isCustom: false,
        },
      ]);

      const response = await request(app)
        .get(`/api/plans/users/${testUserId}/progress/summary`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('activePlans');
      expect(response.body.data).toHaveProperty('totalTasks');
      expect(response.body.data).toHaveProperty('completedTasks');
      expect(response.body.data).toHaveProperty('overallCompletionPercentage');
      expect(response.body.data).toHaveProperty('averageVelocity');
      expect(response.body.data.activePlans).toBe(1);
      expect(response.body.data.totalTasks).toBe(3);
      expect(response.body.data.completedTasks).toBe(1);
    });

    it('should return zero metrics for user with no active plans', async () => {
      const response = await request(app)
        .get(`/api/plans/users/${testUserId}/progress/summary`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.activePlans).toBe(0);
      expect(response.body.data.totalTasks).toBe(0);
      expect(response.body.data.completedTasks).toBe(0);
      expect(response.body.data.overallCompletionPercentage).toBe(0);
      expect(response.body.data.averageVelocity).toBe(0);
    });

    it('should deny access to other users summary', async () => {
      // Create another user with unique email
      const uniqueEmail = `other-summary-user-${Date.now()}@example.com`;
      const [otherUser] = await db
        .insert(users)
        .values({
          email: uniqueEmail,
          plan: 'free',
        })
        .returning();

      const response = await request(app)
        .get(`/api/plans/users/${otherUser.id}/progress/summary`);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Access denied');
      
      // Clean up the other user
      await db.delete(users).where(eq(users.id, otherUser.id));
    });

    it('should return 400 for invalid user ID', async () => {
      const response = await request(app)
        .get('/api/plans/users/invalid/progress/summary');

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should aggregate metrics across multiple active plans', async () => {
      // Create first plan with tasks
      const [plan1] = await db
        .insert(actionPlans)
        .values({
          searchId: testSearchId,
          userId: testUserId,
          title: 'Plan 1',
          description: 'First plan',
          status: 'active',
          originalPlan: {},
          customizations: {},
        })
        .returning();

      const [phase1] = await db
        .insert(planPhases)
        .values({
          planId: plan1.id,
          name: 'Phase 1',
          description: 'Test phase',
          order: 0,
          estimatedDuration: '2 weeks',
          isCustom: false,
        })
        .returning();

      // Create second search and plan
      const [search2] = await db
        .insert(searches)
        .values({
          query: 'Second search',
          userId: testUserId,
          resultsCount: 0,
        })
        .returning();

      const [plan2] = await db
        .insert(actionPlans)
        .values({
          searchId: search2.id,
          userId: testUserId,
          title: 'Plan 2',
          description: 'Second plan',
          status: 'active',
          originalPlan: {},
          customizations: {},
        })
        .returning();

      const [phase2] = await db
        .insert(planPhases)
        .values({
          planId: plan2.id,
          name: 'Phase 1',
          description: 'Test phase',
          order: 0,
          estimatedDuration: '2 weeks',
          isCustom: false,
        })
        .returning();

      // Create tasks for both plans
      const { planTasks } = await import('@shared/schema');
      await db.insert(planTasks).values([
        // Plan 1 tasks
        {
          phaseId: phase1.id,
          planId: plan1.id,
          title: 'Task 1',
          description: 'Test task',
          order: 0,
          status: 'completed',
          isCustom: false,
          completedAt: new Date().toISOString(),
        },
        {
          phaseId: phase1.id,
          planId: plan1.id,
          title: 'Task 2',
          description: 'Test task',
          order: 1,
          status: 'completed',
          isCustom: false,
          completedAt: new Date().toISOString(),
        },
        // Plan 2 tasks
        {
          phaseId: phase2.id,
          planId: plan2.id,
          title: 'Task 3',
          description: 'Test task',
          order: 0,
          status: 'completed',
          isCustom: false,
          completedAt: new Date().toISOString(),
        },
        {
          phaseId: phase2.id,
          planId: plan2.id,
          title: 'Task 4',
          description: 'Test task',
          order: 1,
          status: 'not_started',
          isCustom: false,
        },
      ]);

      const response = await request(app)
        .get(`/api/plans/users/${testUserId}/progress/summary`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.activePlans).toBe(2);
      expect(response.body.data.totalTasks).toBe(4);
      expect(response.body.data.completedTasks).toBe(3);
      expect(response.body.data.overallCompletionPercentage).toBeGreaterThan(0);
    });
  });

  describe('POST /api/plans/:planId/export', () => {
    it('should export plan to CSV format', async () => {
      // Create a plan with phases and tasks
      const [plan] = await db
        .insert(actionPlans)
        .values({
          searchId: testSearchId,
          userId: testUserId,
          title: 'Export Test Plan',
          description: 'Plan for export testing',
          status: 'active',
          originalPlan: {},
          customizations: {},
        })
        .returning();

      const [phase] = await db
        .insert(planPhases)
        .values({
          planId: plan.id,
          name: 'Test Phase',
          description: 'Phase for export',
          order: 0,
          estimatedDuration: '2 weeks',
          isCustom: false,
        })
        .returning();

      const { planTasks } = await import('@shared/schema');
      await db
        .insert(planTasks)
        .values({
          phaseId: phase.id,
          planId: plan.id,
          title: 'Test Task',
          description: 'Task for export',
          order: 0,
          status: 'not_started',
          estimatedTime: '4 hours',
          resources: ['Resource 1'],
          isCustom: false,
        });

      const response = await request(app)
        .post(`/api/plans/${plan.id}/export`)
        .send({
          format: 'csv',
          includeCompleted: true,
          includeSkipped: true,
        });

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toBe('text/csv');
      expect(response.headers['content-disposition']).toContain('attachment');
      expect(response.headers['content-disposition']).toContain('.csv');
      
      // Verify CSV content
      const csvContent = response.text;
      expect(csvContent).toContain('Phase,Phase Order,Task');
      expect(csvContent).toContain('Test Phase');
      expect(csvContent).toContain('Test Task');
    });

    it('should export plan to JSON format', async () => {
      // Create a plan with phases and tasks
      const [plan] = await db
        .insert(actionPlans)
        .values({
          searchId: testSearchId,
          userId: testUserId,
          title: 'JSON Export Plan',
          description: 'Plan for JSON export',
          status: 'active',
          originalPlan: {},
          customizations: {},
        })
        .returning();

      const [phase] = await db
        .insert(planPhases)
        .values({
          planId: plan.id,
          name: 'JSON Phase',
          description: 'Phase for JSON export',
          order: 0,
          estimatedDuration: '1 week',
          isCustom: false,
        })
        .returning();

      const { planTasks } = await import('@shared/schema');
      await db
        .insert(planTasks)
        .values({
          phaseId: phase.id,
          planId: plan.id,
          title: 'JSON Task',
          description: 'Task for JSON export',
          order: 0,
          status: 'completed',
          estimatedTime: '2 hours',
          resources: [],
          isCustom: false,
          completedAt: new Date().toISOString(),
        });

      const response = await request(app)
        .post(`/api/plans/${plan.id}/export`)
        .send({
          format: 'json',
          includeCompleted: true,
          includeSkipped: true,
        });

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toBe('application/json');
      expect(response.headers['content-disposition']).toContain('attachment');
      expect(response.headers['content-disposition']).toContain('.json');
      
      // Verify JSON structure
      const jsonContent = JSON.parse(response.text);
      expect(jsonContent).toHaveProperty('exportMetadata');
      expect(jsonContent).toHaveProperty('plan');
      expect(jsonContent).toHaveProperty('statistics');
      expect(jsonContent).toHaveProperty('phases');
      expect(jsonContent.plan.title).toBe('JSON Export Plan');
      expect(jsonContent.phases).toHaveLength(1);
      expect(jsonContent.phases[0].name).toBe('JSON Phase');
      expect(jsonContent.phases[0].tasks).toHaveLength(1);
    });

    it('should export plan to Markdown format', async () => {
      // Create a plan with phases and tasks
      const [plan] = await db
        .insert(actionPlans)
        .values({
          searchId: testSearchId,
          userId: testUserId,
          title: 'Markdown Export Plan',
          description: 'Plan for Markdown export',
          status: 'active',
          originalPlan: {},
          customizations: {},
        })
        .returning();

      const [phase] = await db
        .insert(planPhases)
        .values({
          planId: plan.id,
          name: 'Markdown Phase',
          description: 'Phase for Markdown export',
          order: 0,
          estimatedDuration: '3 weeks',
          isCustom: false,
        })
        .returning();

      const { planTasks } = await import('@shared/schema');
      await db
        .insert(planTasks)
        .values([
          {
            phaseId: phase.id,
            planId: plan.id,
            title: 'Completed Task',
            description: 'This task is done',
            order: 0,
            status: 'completed',
            estimatedTime: '1 hour',
            resources: [],
            isCustom: false,
            completedAt: new Date().toISOString(),
          },
          {
            phaseId: phase.id,
            planId: plan.id,
            title: 'Pending Task',
            description: 'This task is pending',
            order: 1,
            status: 'not_started',
            estimatedTime: '3 hours',
            resources: ['Resource A', 'Resource B'],
            isCustom: true,
          },
        ]);

      const response = await request(app)
        .post(`/api/plans/${plan.id}/export`)
        .send({
          format: 'markdown',
          includeCompleted: true,
          includeSkipped: true,
        });

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toBe('text/markdown');
      expect(response.headers['content-disposition']).toContain('attachment');
      expect(response.headers['content-disposition']).toContain('.md');
      
      // Verify Markdown content
      const mdContent = response.text;
      expect(mdContent).toContain('# Markdown Export Plan');
      expect(mdContent).toContain('## Markdown Phase');
      expect(mdContent).toContain('- [x] Completed Task');
      expect(mdContent).toContain('- [ ] Pending Task');
      expect(mdContent).toContain('✏️'); // Custom task indicator
    });

    it('should exclude completed tasks when requested', async () => {
      // Create a plan with mixed task statuses
      const [plan] = await db
        .insert(actionPlans)
        .values({
          searchId: testSearchId,
          userId: testUserId,
          title: 'Filter Test Plan',
          description: 'Plan for filter testing',
          status: 'active',
          originalPlan: {},
          customizations: {},
        })
        .returning();

      const [phase] = await db
        .insert(planPhases)
        .values({
          planId: plan.id,
          name: 'Filter Phase',
          description: 'Phase for filter testing',
          order: 0,
          estimatedDuration: '1 week',
          isCustom: false,
        })
        .returning();

      const { planTasks } = await import('@shared/schema');
      await db
        .insert(planTasks)
        .values([
          {
            phaseId: phase.id,
            planId: plan.id,
            title: 'Completed Task',
            description: 'Done',
            order: 0,
            status: 'completed',
            estimatedTime: '1 hour',
            resources: [],
            isCustom: false,
            completedAt: new Date().toISOString(),
          },
          {
            phaseId: phase.id,
            planId: plan.id,
            title: 'Pending Task',
            description: 'Not done',
            order: 1,
            status: 'not_started',
            estimatedTime: '2 hours',
            resources: [],
            isCustom: false,
          },
        ]);

      const response = await request(app)
        .post(`/api/plans/${plan.id}/export`)
        .send({
          format: 'json',
          includeCompleted: false,
          includeSkipped: true,
        });

      expect(response.status).toBe(200);
      
      const jsonContent = JSON.parse(response.text);
      expect(jsonContent.phases[0].tasks).toHaveLength(1);
      expect(jsonContent.phases[0].tasks[0].title).toBe('Pending Task');
      expect(jsonContent.phases[0].tasks[0].status).toBe('not_started');
    });

    it('should reject invalid export format', async () => {
      // Create a plan
      const [plan] = await db
        .insert(actionPlans)
        .values({
          searchId: testSearchId,
          userId: testUserId,
          title: 'Invalid Format Plan',
          description: 'Plan for invalid format test',
          status: 'active',
          originalPlan: {},
          customizations: {},
        })
        .returning();

      const response = await request(app)
        .post(`/api/plans/${plan.id}/export`)
        .send({
          format: 'invalid-format',
          includeCompleted: true,
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should deny export access to non-owner', async () => {
      // Create another user
      const [otherUser] = await db
        .insert(users)
        .values({
          email: 'other-user@example.com',
          plan: 'free',
        })
        .returning();

      // Create a search for other user
      const [otherSearch] = await db
        .insert(searches)
        .values({
          query: 'Other user search',
          userId: otherUser.id,
          resultsCount: 0,
        })
        .returning();

      // Create a plan for other user
      const [otherPlan] = await db
        .insert(actionPlans)
        .values({
          searchId: otherSearch.id,
          userId: otherUser.id,
          title: 'Other User Plan',
          description: 'Plan owned by other user',
          status: 'active',
          originalPlan: {},
          customizations: {},
        })
        .returning();

      // Try to export other user's plan
      const response = await request(app)
        .post(`/api/plans/${otherPlan.id}/export`)
        .send({
          format: 'csv',
          includeCompleted: true,
        });

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);

      // Clean up other user's data
      await db.delete(actionPlans).where(eq(actionPlans.id, otherPlan.id));
      await db.delete(searches).where(eq(searches.id, otherSearch.id));
      await db.delete(users).where(eq(users.id, otherUser.id));
    });
  });
});
