/**
 * Integration Test Template
 * 
 * This template provides a starting point for writing integration tests.
 * Copy this file and modify it for your specific test needs.
 * 
 * Integration tests should:
 * - Test multiple components working together
 * - Test API endpoints end-to-end
 * - Use real HTTP requests (via supertest)
 * - Mock external services but not internal ones
 * - Verify complete workflows
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import {
  setupTestContext,
  createTestUser,
  generateTestToken,
  HTTP_STATUS,
  type TestContext,
} from '../imports';

// Import your Express app
// import { app } from '../../app';

// This is a template file - skip it in test runs
describe.skip('Feature Integration Tests', () => {
  let context: TestContext;
  let app: Express;
  let authToken: string;

  beforeAll(async () => {
    // Set up test context once for all tests
    context = await setupTestContext();
    // app = createTestApp(context.db);
    
    // Create a test user and get auth token
    const testUser = await createTestUser(context.db, {
      email: 'integration@example.com',
    });
    authToken = await generateTestToken(testUser);
  });

  afterAll(async () => {
    // Clean up after all tests
    await context.cleanup();
  });

  beforeEach(() => {
    // Reset any state between tests if needed
  });

  describe('POST /api/endpoint', () => {
    it('should create resource successfully', async () => {
      // Arrange
      const requestData = {
        name: 'Test Resource',
        value: 123,
      };

      // Act
      const response = await request(app)
        .post('/api/endpoint')
        .set('Authorization', `Bearer ${authToken}`)
        .send(requestData)
        .expect(HTTP_STATUS.CREATED);

      // Assert
      expect(response.body).toMatchObject({
        success: true,
        data: expect.objectContaining({
          name: 'Test Resource',
          value: 123,
        }),
      });
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data).toHaveProperty('createdAt');
    });

    it('should reject unauthenticated requests', async () => {
      // Act
      const response = await request(app)
        .post('/api/endpoint')
        .send({ name: 'Test' })
        .expect(HTTP_STATUS.UNAUTHORIZED);

      // Assert
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Unauthorized');
    });

    it('should validate request body', async () => {
      // Act
      const response = await request(app)
        .post('/api/endpoint')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ invalid: 'data' })
        .expect(HTTP_STATUS.BAD_REQUEST);

      // Assert
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Validation');
    });

    it('should handle duplicate resources', async () => {
      // Arrange - Create first resource
      await request(app)
        .post('/api/endpoint')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Unique Name' })
        .expect(HTTP_STATUS.CREATED);

      // Act - Try to create duplicate
      const response = await request(app)
        .post('/api/endpoint')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Unique Name' })
        .expect(HTTP_STATUS.CONFLICT);

      // Assert
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('already exists');
    });
  });

  describe('GET /api/endpoint/:id', () => {
    let resourceId: number;

    beforeEach(async () => {
      // Create a resource for testing
      const response = await request(app)
        .post('/api/endpoint')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Test Resource' });
      
      resourceId = response.body.data.id;
    });

    it('should retrieve resource by ID', async () => {
      // Act
      const response = await request(app)
        .get(`/api/endpoint/${resourceId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(HTTP_STATUS.OK);

      // Assert
      expect(response.body).toMatchObject({
        success: true,
        data: expect.objectContaining({
          id: resourceId,
          name: 'Test Resource',
        }),
      });
    });

    it('should return 404 for non-existent resource', async () => {
      // Act
      const response = await request(app)
        .get('/api/endpoint/99999')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(HTTP_STATUS.NOT_FOUND);

      // Assert
      expect(response.body).toHaveProperty('error');
    });

    it('should enforce resource ownership', async () => {
      // Arrange - Create another user
      const otherUser = await createTestUser(context.db, {
        email: 'other@example.com',
      });
      const otherToken = await generateTestToken(otherUser);

      // Act - Try to access first user's resource
      const response = await request(app)
        .get(`/api/endpoint/${resourceId}`)
        .set('Authorization', `Bearer ${otherToken}`)
        .expect(HTTP_STATUS.FORBIDDEN);

      // Assert
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Access denied');
    });
  });

  describe('PUT /api/endpoint/:id', () => {
    it('should update resource', async () => {
      // Arrange - Create resource
      const createResponse = await request(app)
        .post('/api/endpoint')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Original Name' });
      
      const resourceId = createResponse.body.data.id;

      // Act - Update resource
      const response = await request(app)
        .put(`/api/endpoint/${resourceId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Updated Name' })
        .expect(HTTP_STATUS.OK);

      // Assert
      expect(response.body.data).toMatchObject({
        id: resourceId,
        name: 'Updated Name',
      });
    });
  });

  describe('DELETE /api/endpoint/:id', () => {
    it('should delete resource', async () => {
      // Arrange - Create resource
      const createResponse = await request(app)
        .post('/api/endpoint')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'To Delete' });
      
      const resourceId = createResponse.body.data.id;

      // Act - Delete resource
      await request(app)
        .delete(`/api/endpoint/${resourceId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(HTTP_STATUS.NO_CONTENT);

      // Assert - Verify deletion
      await request(app)
        .get(`/api/endpoint/${resourceId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(HTTP_STATUS.NOT_FOUND);
    });
  });

  describe('Complete Workflow', () => {
    it('should complete full CRUD workflow', async () => {
      // Create
      const createResponse = await request(app)
        .post('/api/endpoint')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Workflow Test' })
        .expect(HTTP_STATUS.CREATED);

      const resourceId = createResponse.body.data.id;

      // Read
      await request(app)
        .get(`/api/endpoint/${resourceId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(HTTP_STATUS.OK);

      // Update
      await request(app)
        .put(`/api/endpoint/${resourceId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Updated' })
        .expect(HTTP_STATUS.OK);

      // Delete
      await request(app)
        .delete(`/api/endpoint/${resourceId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(HTTP_STATUS.NO_CONTENT);
    });
  });
});

/**
 * Tips for writing good integration tests:
 * 
 * 1. Test complete workflows, not just individual endpoints
 * 2. Use real HTTP requests via supertest
 * 3. Test authentication and authorization
 * 4. Test error cases and edge cases
 * 5. Verify response status codes and body structure
 * 6. Test resource ownership and permissions
 * 7. Clean up test data after tests
 * 8. Use beforeAll for expensive setup
 * 9. Use beforeEach for test-specific setup
 * 10. Test the happy path and error paths
 */
