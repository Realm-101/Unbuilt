import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import express, { type Express } from 'express';
import { registerRoutes } from '../../routes';
import { setupTestDatabase, cleanupTestDatabase, createTestUser, createTestPlan, createTestPhase, createTestTask } from '../../__tests__/helpers/test-db';
import type { Server } from 'http';

describe('Dependency API Endpoints', () => {
  let app: Express;
  let server: Server;
  let authToken: string;
  let userId: number;
  let planId: number;
  let phaseId: number;
  let task1Id: number;
  let task2Id: number;
  let task3Id: number;

  beforeEach(async () => {
    await setupTestDatabase();
    
    app = express();
    app.use(express.json());
    server = await registerRoutes(app);

    // Create test user and get auth token
    const { user, token } = await createTestUser();
    authToken = token;
    userId = user.id;

    // Create test plan, phase, and tasks
    const plan = await createTestPlan(userId);
    planId = plan.id;

    const phase = await createTestPhase(planId);
    phaseId = phase.id;

    const task1 = await createTestTask(planId, phaseId, { order: 1 });
    task1Id = task1.id;

    const task2 = await createTestTask(planId, phaseId, { order: 2 });
    task2Id = task2.id;

    const task3 = await createTestTask(planId, phaseId, { order: 3 });
    task3Id = task3.id;
  });

  afterEach(async () => {
    await cleanupTestDatabase();
    if (server) {
      server.close();
    }
  });

  describe('GET /api/tasks/:taskId/dependencies', () => {
    it('should return empty dependencies for task with no dependencies', async () => {
      const response = await request(app)
        .get(`/api/tasks/${task1Id}/dependencies`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual({
        prerequisites: [],
        dependents: [],
      });
    });

    it('should return prerequisites and dependents for task with dependencies', async () => {
      // Add dependency: task2 depends on task1
      await request(app)
        .post(`/api/tasks/${task2Id}/dependencies`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ prerequisiteTaskId: task1Id })
        .expect(200);

      // Get dependencies for task1 (should have task2 as dependent)
      const response1 = await request(app)
        .get(`/api/tasks/${task1Id}/dependencies`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response1.body.success).toBe(true);
      expect(response1.body.data.prerequisites).toEqual([]);
      expect(response1.body.data.dependents).toEqual([task2Id]);

      // Get dependencies for task2 (should have task1 as prerequisite)
      const response2 = await request(app)
        .get(`/api/tasks/${task2Id}/dependencies`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response2.body.success).toBe(true);
      expect(response2.body.data.prerequisites).toEqual([task1Id]);
      expect(response2.body.data.dependents).toEqual([]);
    });

    it('should return 401 if not authenticated', async () => {
      await request(app)
        .get(`/api/tasks/${task1Id}/dependencies`)
        .expect(401);
    });

    it('should return 404 if task not found', async () => {
      await request(app)
        .get('/api/tasks/99999/dependencies')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });
  });

  describe('POST /api/tasks/:taskId/dependencies', () => {
    it('should add a dependency successfully', async () => {
      const response = await request(app)
        .post(`/api/tasks/${task2Id}/dependencies`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ prerequisiteTaskId: task1Id })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        taskId: task2Id,
        prerequisiteTaskId: task1Id,
      });
      expect(response.body.data.id).toBeDefined();
      expect(response.body.data.createdAt).toBeDefined();
    });

    it('should prevent task from depending on itself', async () => {
      const response = await request(app)
        .post(`/api/tasks/${task1Id}/dependencies`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ prerequisiteTaskId: task1Id })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('cannot depend on itself');
    });

    it('should prevent duplicate dependencies', async () => {
      // Add dependency first time
      await request(app)
        .post(`/api/tasks/${task2Id}/dependencies`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ prerequisiteTaskId: task1Id })
        .expect(200);

      // Try to add same dependency again
      const response = await request(app)
        .post(`/api/tasks/${task2Id}/dependencies`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ prerequisiteTaskId: task1Id })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('already exists');
    });

    it('should prevent circular dependencies', async () => {
      // Create chain: task2 depends on task1
      await request(app)
        .post(`/api/tasks/${task2Id}/dependencies`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ prerequisiteTaskId: task1Id })
        .expect(200);

      // Try to create circular dependency: task1 depends on task2
      const response = await request(app)
        .post(`/api/tasks/${task1Id}/dependencies`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ prerequisiteTaskId: task2Id })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('circular dependency');
    });

    it('should prevent complex circular dependencies', async () => {
      // Create chain: task2 -> task1, task3 -> task2
      await request(app)
        .post(`/api/tasks/${task2Id}/dependencies`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ prerequisiteTaskId: task1Id })
        .expect(200);

      await request(app)
        .post(`/api/tasks/${task3Id}/dependencies`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ prerequisiteTaskId: task2Id })
        .expect(200);

      // Try to create circular dependency: task1 -> task3
      const response = await request(app)
        .post(`/api/tasks/${task1Id}/dependencies`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ prerequisiteTaskId: task3Id })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('circular dependency');
    });

    it('should return 401 if not authenticated', async () => {
      await request(app)
        .post(`/api/tasks/${task2Id}/dependencies`)
        .send({ prerequisiteTaskId: task1Id })
        .expect(401);
    });

    it('should return 400 if prerequisiteTaskId is missing', async () => {
      await request(app)
        .post(`/api/tasks/${task2Id}/dependencies`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({})
        .expect(400);
    });

    it('should return 404 if task not found', async () => {
      await request(app)
        .post('/api/tasks/99999/dependencies')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ prerequisiteTaskId: task1Id })
        .expect(404);
    });

    it('should return 404 if prerequisite task not found', async () => {
      await request(app)
        .post(`/api/tasks/${task2Id}/dependencies`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ prerequisiteTaskId: 99999 })
        .expect(404);
    });
  });

  describe('POST /api/tasks/:taskId/dependencies/validate', () => {
    it('should validate a valid dependency', async () => {
      const response = await request(app)
        .post(`/api/tasks/${task2Id}/dependencies/validate`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ prerequisiteTaskId: task1Id })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual({
        isValid: true,
        errors: [],
        circularDependencies: [],
      });
    });

    it('should detect circular dependency', async () => {
      // Create dependency: task2 depends on task1
      await request(app)
        .post(`/api/tasks/${task2Id}/dependencies`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ prerequisiteTaskId: task1Id })
        .expect(200);

      // Validate circular dependency: task1 depends on task2
      const response = await request(app)
        .post(`/api/tasks/${task1Id}/dependencies/validate`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ prerequisiteTaskId: task2Id })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.isValid).toBe(false);
      expect(response.body.data.errors).toContain('Circular dependency detected');
      expect(response.body.data.circularDependencies.length).toBeGreaterThan(0);
    });

    it('should detect complex circular dependency', async () => {
      // Create chain: task2 -> task1, task3 -> task2
      await request(app)
        .post(`/api/tasks/${task2Id}/dependencies`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ prerequisiteTaskId: task1Id })
        .expect(200);

      await request(app)
        .post(`/api/tasks/${task3Id}/dependencies`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ prerequisiteTaskId: task2Id })
        .expect(200);

      // Validate circular dependency: task1 -> task3
      const response = await request(app)
        .post(`/api/tasks/${task1Id}/dependencies/validate`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ prerequisiteTaskId: task3Id })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.isValid).toBe(false);
      expect(response.body.data.errors).toContain('Circular dependency detected');
    });

    it('should return 401 if not authenticated', async () => {
      await request(app)
        .post(`/api/tasks/${task2Id}/dependencies/validate`)
        .send({ prerequisiteTaskId: task1Id })
        .expect(401);
    });

    it('should return 400 if prerequisiteTaskId is missing', async () => {
      await request(app)
        .post(`/api/tasks/${task2Id}/dependencies/validate`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({})
        .expect(400);
    });
  });

  describe('DELETE /api/tasks/dependencies/:dependencyId', () => {
    it('should remove a dependency successfully', async () => {
      // Add dependency first
      const addResponse = await request(app)
        .post(`/api/tasks/${task2Id}/dependencies`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ prerequisiteTaskId: task1Id })
        .expect(200);

      const dependencyId = addResponse.body.data.id;

      // Remove dependency
      const response = await request(app)
        .delete(`/api/tasks/dependencies/${dependencyId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.message).toBe('Dependency removed successfully');

      // Verify dependency is removed
      const checkResponse = await request(app)
        .get(`/api/tasks/${task2Id}/dependencies`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(checkResponse.body.data.prerequisites).toEqual([]);
    });

    it('should return 401 if not authenticated', async () => {
      await request(app)
        .delete('/api/tasks/dependencies/1')
        .expect(401);
    });

    it('should return 404 if dependency not found', async () => {
      await request(app)
        .delete('/api/tasks/dependencies/99999')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });
  });
});
