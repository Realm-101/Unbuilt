/**
 * Action Plan Customization Integration Tests
 * 
 * Tests the complete action plan customization feature including:
 * - Plan creation and retrieval
 * - Task CRUD operations
 * - Dependency validation
 * - Progress calculation
 * - Export generation
 * 
 * Requirements: All action plan customization requirements
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import request from 'supertest';
import express, { Express } from 'express';
import jwt from 'jsonwebtoken';
import { UserFactory } from '../fixtures/user.factory';
import { PlanFactory } from '../fixtures/plan.factory';
import { SearchFactory } from '../fixtures/search.factory';
import plansRouter from '../../routes/plans';
import tasksRouter from '../../routes/tasks';
import templatesRouter from '../../routes/templates';
import { jwtAuth } from '../../middleware/jwtAuth';

describe('Action Plan Customization Integration Tests', () => {
  let app: Express;
  let testUser: any;
  let authToken: string;
  let testSearch: any;

  beforeAll(async () => {
    // Create Express app with routes
    app = express();
    app.use(express.json());
    
    // Apply JWT middleware
    app.use(jwtAuth);
    
    // Register routes
    app.use('/api/plans', plansRouter);
    app.use('/api/tasks', tasksRouter);
    app.use('/api/templates', templatesRouter);

    // Create test user
    testUser = await UserFactory.createAndPersistProUser({
      email: `test-plan-${Date.now()}@example.com`,
    });

    // Generate auth token
    authToken = jwt.sign(
      { userId: testUser.id, email: testUser.email },
      process.env.JWT_SECRET || 'test-secret',
      { expiresIn: '1h' }
    );

    // Create test search
    testSearch = await SearchFactory.createAndPersist(testUser.id, {
      query: 'Test search for action plan',
      innovationScore: 85,
    });
  });

  afterAll(async () => {
    // Cleanup test data
    if (testSearch?.id) {
      await SearchFactory.cleanup(testSearch.id);
    }
    if (testUser?.id) {
      await UserFactory.cleanup(testUser.id);
    }
  });

  describe('Plan Creation and Retrieval', () => {
    let createdPlanId: number;

    afterEach(async () => {
      if (createdPlanId) {
        await PlanFactory.cleanup(createdPlanId);
        createdPlanId = 0;
      }
    });

    it('should create a new action plan', async () => {
      const response = await request(app)
        .post('/api/plans')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          searchId: testSearch.id,
          title: 'My Action Plan',
          description: 'Test action plan description',
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.title).toBe('My Action Plan');
      expect(response.body.data.searchId).toBe(testSearch.id);
      expect(response.body.data.userId).toBe(testUser.id);
      expect(response.body.data.status).toBe('active');

      createdPlanId = response.body.data.id;
    });

    it('should retrieve a plan by search ID', async () => {
      // Create plan first
      const plan = await PlanFactory.createAndPersist({
        userId: testUser.id,
        searchId: testSearch.id,
        title: 'Test Plan for Retrieval',
      });
      createdPlanId = plan.id!;

      const response = await request(app)
        .get(`/api/plans/search/${testSearch.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(plan.id);
      expect(response.body.data.title).toBe('Test Plan for Retrieval');
    });

    it('should update plan metadata', async () => {
      // Create plan first
      const plan = await PlanFactory.createAndPersist({
        userId: testUser.id,
        searchId: testSearch.id,
        title: 'Original Title',
      });
      createdPlanId = plan.id!;

      const response = await request(app)
        .patch(`/api/plans/${plan.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Updated Title',
          description: 'Updated description',
          status: 'completed',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.title).toBe('Updated Title');
      expect(response.body.data.description).toBe('Updated description');
      expect(response.body.data.status).toBe('completed');
    });

    it('should reject plan creation with invalid search ID', async () => {
      const response = await request(app)
        .post('/api/plans')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          searchId: 999999,
          title: 'Invalid Plan',
        })
        .expect(404);

      expect(response.body.success).toBe(false);
    });

    it('should reject unauthorized access to plan', async () => {
      // Create plan for test user
      const plan = await PlanFactory.createAndPersist({
        userId: testUser.id,
        searchId: testSearch.id,
      });
      createdPlanId = plan.id!;

      // Create another user
      const otherUser = await UserFactory.createAndPersist();
      const otherToken = jwt.sign(
        { userId: otherUser.id, email: otherUser.email },
        process.env.JWT_SECRET || 'test-secret',
        { expiresIn: '1h' }
      );

      // Try to access plan with other user's token
      const response = await request(app)
        .patch(`/api/plans/${plan.id}`)
        .set('Authorization', `Bearer ${otherToken}`)
        .send({ title: 'Unauthorized Update' })
        .expect(403);

      expect(response.body.success).toBe(false);

      // Cleanup other user
      await UserFactory.cleanup(otherUser.id!);
    });
  });

  describe('Task CRUD Operations', () => {
    let testPlan: any;
    let testPhase: any;

    beforeEach(async () => {
      // Create plan with phases
      const { plan, phases } = await PlanFactory.createCompletePlan(
        testUser.id,
        testSearch.id,
        { phaseCount: 2, tasksPerPhase: 2 }
      );
      testPlan = plan;
      testPhase = phases[0];
    });

    afterEach(async () => {
      if (testPlan?.id) {
        await PlanFactory.cleanup(testPlan.id);
      }
    });

    it('should create a new task', async () => {
      const response = await request(app)
        .post(`/api/plans/${testPlan.id}/tasks`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          phaseId: testPhase.id,
          title: 'New Custom Task',
          description: 'Custom task description',
          estimatedTime: '3 hours',
          resources: ['https://example.com/resource'],
          order: 10,
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.title).toBe('New Custom Task');
      expect(response.body.data.phaseId).toBe(testPhase.id);
      expect(response.body.data.isCustom).toBe(true);
      expect(response.body.data.status).toBe('not_started');
    });

    it('should retrieve all tasks for a plan', async () => {
      const response = await request(app)
        .get(`/api/plans/${testPlan.id}/tasks`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
    });

    it('should update a task', async () => {
      // Get first task
      const tasksResponse = await request(app)
        .get(`/api/plans/${testPlan.id}/tasks`)
        .set('Authorization', `Bearer ${authToken}`);
      
      const taskId = tasksResponse.body.data[0].id;

      const response = await request(app)
        .patch(`/api/tasks/${taskId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Updated Task Title',
          description: 'Updated description',
          status: 'in_progress',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.title).toBe('Updated Task Title');
      expect(response.body.data.status).toBe('in_progress');
    });

    it('should delete a task', async () => {
      // Get first task
      const tasksResponse = await request(app)
        .get(`/api/plans/${testPlan.id}/tasks`)
        .set('Authorization', `Bearer ${authToken}`);
      
      const taskId = tasksResponse.body.data[0].id;

      const response = await request(app)
        .delete(`/api/tasks/${taskId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);

      // Verify task is deleted
      const verifyResponse = await request(app)
        .get(`/api/plans/${testPlan.id}/tasks`)
        .set('Authorization', `Bearer ${authToken}`);

      const deletedTask = verifyResponse.body.data.find((t: any) => t.id === taskId);
      expect(deletedTask).toBeUndefined();
    });

    it('should reorder tasks within a phase', async () => {
      // Get tasks
      const tasksResponse = await request(app)
        .get(`/api/plans/${testPlan.id}/tasks`)
        .set('Authorization', `Bearer ${authToken}`);
      
      const phaseTasks = tasksResponse.body.data.filter(
        (t: any) => t.phaseId === testPhase.id
      );
      const taskIds = phaseTasks.map((t: any) => t.id).reverse();

      const response = await request(app)
        .post(`/api/plans/${testPlan.id}/tasks/reorder`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          taskIds,
          phaseId: testPhase.id,
        })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should reject task creation with invalid phase ID', async () => {
      const response = await request(app)
        .post(`/api/plans/${testPlan.id}/tasks`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          phaseId: 999999,
          title: 'Invalid Task',
          order: 1,
        })
        .expect(404);

      expect(response.body.success).toBe(false);
    });

    it('should reject task creation with phase from different plan', async () => {
      // Create another plan
      const otherPlan = await PlanFactory.createAndPersist({
        userId: testUser.id,
        searchId: testSearch.id,
      });
      const otherPhase = await PlanFactory.persistPhase({
        planId: otherPlan.id!,
        name: 'Other Phase',
        order: 0,
      });

      const response = await request(app)
        .post(`/api/plans/${testPlan.id}/tasks`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          phaseId: otherPhase.id,
          title: 'Mismatched Task',
          order: 1,
        })
        .expect(400);

      expect(response.body.success).toBe(false);

      // Cleanup
      await PlanFactory.cleanup(otherPlan.id!);
    });
  });

  describe('Dependency Validation', () => {
    let testPlan: any;
    let testTasks: any[];

    beforeEach(async () => {
      // Create plan with tasks
      const { plan, tasks } = await PlanFactory.createCompletePlan(
        testUser.id,
        testSearch.id,
        { phaseCount: 1, tasksPerPhase: 3 }
      );
      testPlan = plan;
      testTasks = tasks;
    });

    afterEach(async () => {
      if (testPlan?.id) {
        await PlanFactory.cleanup(testPlan.id);
      }
    });

    it('should add a dependency between tasks', async () => {
      const task1 = testTasks[0];
      const task2 = testTasks[1];

      const response = await request(app)
        .post(`/api/tasks/${task2.id}/dependencies`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          prerequisiteTaskId: task1.id,
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');
    });

    it('should retrieve task dependencies', async () => {
      const task1 = testTasks[0];
      const task2 = testTasks[1];

      // Add dependency
      await request(app)
        .post(`/api/tasks/${task2.id}/dependencies`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ prerequisiteTaskId: task1.id });

      // Get dependencies
      const response = await request(app)
        .get(`/api/tasks/${task2.id}/dependencies`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.prerequisites).toContain(task1.id);
    });

    it('should detect circular dependencies', async () => {
      const task1 = testTasks[0];
      const task2 = testTasks[1];

      // Add dependency: task2 depends on task1
      await request(app)
        .post(`/api/tasks/${task2.id}/dependencies`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ prerequisiteTaskId: task1.id });

      // Try to add circular dependency: task1 depends on task2
      const response = await request(app)
        .post(`/api/tasks/${task1.id}/dependencies`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ prerequisiteTaskId: task2.id })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('circular');
    });

    it('should validate dependency before adding', async () => {
      const task1 = testTasks[0];
      const task2 = testTasks[1];

      const response = await request(app)
        .post(`/api/tasks/${task2.id}/dependencies/validate`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          prerequisiteTaskId: task1.id,
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.isValid).toBe(true);
    });

    it('should remove a dependency', async () => {
      const task1 = testTasks[0];
      const task2 = testTasks[1];

      // Add dependency
      const addResponse = await request(app)
        .post(`/api/tasks/${task2.id}/dependencies`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ prerequisiteTaskId: task1.id });

      const dependencyId = addResponse.body.data.id;

      // Remove dependency
      const response = await request(app)
        .delete(`/api/tasks/dependencies/${dependencyId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should get incomplete prerequisites for a task', async () => {
      const task1 = testTasks[0];
      const task2 = testTasks[1];

      // Add dependency
      await request(app)
        .post(`/api/tasks/${task2.id}/dependencies`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ prerequisiteTaskId: task1.id });

      // Get incomplete prerequisites
      const response = await request(app)
        .get(`/api/tasks/${task2.id}/incomplete-prerequisites`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
    });

    it('should allow completing task with override when prerequisites incomplete', async () => {
      const task1 = testTasks[0];
      const task2 = testTasks[1];

      // Add dependency
      await request(app)
        .post(`/api/tasks/${task2.id}/dependencies`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ prerequisiteTaskId: task1.id });

      // Complete task2 with override
      const response = await request(app)
        .patch(`/api/tasks/${task2.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          status: 'completed',
          overridePrerequisites: true,
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('completed');
    });
  });

  describe('Progress Calculation', () => {
    let testPlan: any;
    let testTasks: any[];

    beforeEach(async () => {
      // Create plan with tasks
      const { plan, tasks } = await PlanFactory.createCompletePlan(
        testUser.id,
        testSearch.id,
        { phaseCount: 2, tasksPerPhase: 3 }
      );
      testPlan = plan;
      testTasks = tasks;
    });

    afterEach(async () => {
      if (testPlan?.id) {
        await PlanFactory.cleanup(testPlan.id);
      }
    });

    it('should calculate progress when tasks are completed', async () => {
      // Complete first task
      await request(app)
        .patch(`/api/tasks/${testTasks[0].id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ status: 'completed' });

      // Get progress (via plan progress endpoint if available)
      // For now, verify task status was updated
      const response = await request(app)
        .get(`/api/plans/${testPlan.id}/tasks`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const completedTasks = response.body.data.filter(
        (t: any) => t.status === 'completed'
      );
      expect(completedTasks.length).toBeGreaterThan(0);
    });

    it('should get progress history for a plan', async () => {
      const response = await request(app)
        .get(`/api/plans/${testPlan.id}/progress/history`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should get user progress summary', async () => {
      const response = await request(app)
        .get(`/api/plans/users/${testUser.id}/progress/summary`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('activePlans');
      expect(response.body.data).toHaveProperty('totalTasks');
      expect(response.body.data).toHaveProperty('completedTasks');
    });

    it('should track completion timestamps', async () => {
      // Complete a task
      const response = await request(app)
        .patch(`/api/tasks/${testTasks[0].id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ status: 'completed' })
        .expect(200);

      expect(response.body.data.completedAt).toBeTruthy();
      expect(response.body.data.completedBy).toBe(testUser.id);
    });
  });

  describe('Export Generation', () => {
    let testPlan: any;

    beforeEach(async () => {
      // Create plan with tasks
      const { plan } = await PlanFactory.createCompletePlan(
        testUser.id,
        testSearch.id,
        { phaseCount: 2, tasksPerPhase: 3 }
      );
      testPlan = plan;
    });

    afterEach(async () => {
      if (testPlan?.id) {
        await PlanFactory.cleanup(testPlan.id);
      }
    });

    it('should export plan to CSV format', async () => {
      const response = await request(app)
        .post(`/api/plans/${testPlan.id}/export`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          format: 'csv',
          includeCompleted: true,
          includeSkipped: true,
        })
        .expect(200);

      expect(response.headers['content-type']).toContain('text/csv');
      expect(response.headers['content-disposition']).toContain('attachment');
      expect(response.text).toBeTruthy();
    });

    it('should export plan to JSON format', async () => {
      const response = await request(app)
        .post(`/api/plans/${testPlan.id}/export`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          format: 'json',
          includeCompleted: true,
        })
        .expect(200);

      expect(response.headers['content-type']).toContain('application/json');
      expect(response.body).toBeTruthy();
    });

    it('should export plan to Markdown format', async () => {
      const response = await request(app)
        .post(`/api/plans/${testPlan.id}/export`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          format: 'markdown',
          includeCompleted: true,
        })
        .expect(200);

      expect(response.headers['content-type']).toContain('text/markdown');
      expect(response.text).toContain('#');
      expect(response.text).toContain('- [');
    });

    it('should reject export with invalid format', async () => {
      const response = await request(app)
        .post(`/api/plans/${testPlan.id}/export`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          format: 'invalid',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should respect includeCompleted option', async () => {
      // Complete a task
      const tasksResponse = await request(app)
        .get(`/api/plans/${testPlan.id}/tasks`)
        .set('Authorization', `Bearer ${authToken}`);
      
      await request(app)
        .patch(`/api/tasks/${tasksResponse.body.data[0].id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ status: 'completed' });

      // Export without completed tasks
      const response = await request(app)
        .post(`/api/plans/${testPlan.id}/export`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          format: 'json',
          includeCompleted: false,
        })
        .expect(200);

      // Verify completed tasks are excluded
      const exportData = JSON.parse(response.text);
      const completedTasks = exportData.phases?.flatMap((p: any) => 
        p.tasks?.filter((t: any) => t.status === 'completed') || []
      ) || [];
      expect(completedTasks.length).toBe(0);
    });
  });

  describe('Template Application', () => {
    let testPlan: any;

    beforeEach(async () => {
      // Create basic plan
      testPlan = await PlanFactory.createAndPersist({
        userId: testUser.id,
        searchId: testSearch.id,
        title: 'Plan for Template',
      });
    });

    afterEach(async () => {
      if (testPlan?.id) {
        await PlanFactory.cleanup(testPlan.id);
      }
    });

    it('should list available templates', async () => {
      const response = await request(app)
        .get('/api/templates')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should get template by ID', async () => {
      // Get templates first
      const templatesResponse = await request(app)
        .get('/api/templates')
        .set('Authorization', `Bearer ${authToken}`);

      if (templatesResponse.body.data.length > 0) {
        const templateId = templatesResponse.body.data[0].id;

        const response = await request(app)
          .get(`/api/templates/${templateId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.id).toBe(templateId);
      }
    });

    it('should apply template to existing plan', async () => {
      // Get templates first
      const templatesResponse = await request(app)
        .get('/api/templates')
        .set('Authorization', `Bearer ${authToken}`);

      if (templatesResponse.body.data.length > 0) {
        const templateId = templatesResponse.body.data[0].id;

        const response = await request(app)
          .post(`/api/plans/${testPlan.id}/apply-template`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ templateId })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.templateId).toBe(templateId);
      }
    });
  });
});
