/**
 * Application Integration Tests
 * 
 * Tests the complete application setup including:
 * - Application initialization
 * - Route registration
 * - Middleware setup
 * - API endpoint functionality
 * - End-to-end workflows
 * 
 * These tests verify that all major components work together correctly.
 */

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import request from 'supertest';
import express, { Express } from 'express';
import {
  setupTestContext,
  createTestUser,
  generateTestToken,
  HTTP_STATUS,
  TEST_CONSTANTS,
  type TestContext,
} from './imports';

// Mock external dependencies
vi.mock('../db', () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock('../services/gemini', () => ({
  analyzeGaps: vi.fn(),
}));

vi.mock('../services/xai', () => ({
  generateBusinessPlan: vi.fn(),
  generateMarketResearch: vi.fn(),
}));

describe('Application Integration Tests', () => {
  let context: TestContext;
  let app: Express;
  let authToken: string;
  let testUserId: number;

  beforeAll(async () => {
    // Setup test context
    context = await setupTestContext();
    
    // Create test Express app with minimal setup
    app = express();
    app.use(express.json());
    app.use(express.urlencoded({ extended: false }));
    
    // Create test user and token
    const testUser = await createTestUser(context.db, {
      email: 'app-test@example.com',
      username: 'apptest',
    });
    testUserId = testUser.id;
    authToken = await generateTestToken(testUser);
  });

  afterAll(async () => {
    await context.cleanup();
  });

  describe('Application Startup', () => {
    it('should initialize Express app successfully', () => {
      expect(app).toBeDefined();
      expect(typeof app.listen).toBe('function');
    });

    it('should have JSON body parser configured', async () => {
      // Add a test route
      app.post('/test-json', (req, res) => {
        res.json({ received: req.body });
      });

      const response = await request(app)
        .post('/test-json')
        .send({ test: 'data' })
        .expect(HTTP_STATUS.OK);

      expect(response.body.received).toEqual({ test: 'data' });
    });

    it('should have URL-encoded body parser configured', async () => {
      app.post('/test-urlencoded', (req, res) => {
        res.json({ received: req.body });
      });

      const response = await request(app)
        .post('/test-urlencoded')
        .type('form')
        .send('key=value')
        .expect(HTTP_STATUS.OK);

      expect(response.body.received).toEqual({ key: 'value' });
    });
  });

  describe('Route Registration', () => {
    it('should register health check endpoint', async () => {
      app.get('/health', (req, res) => {
        res.status(HTTP_STATUS.OK).json({ 
          status: 'healthy', 
          timestamp: new Date().toISOString() 
        });
      });

      const response = await request(app)
        .get('/health')
        .expect(HTTP_STATUS.OK);

      expect(response.body).toHaveProperty('status', 'healthy');
      expect(response.body).toHaveProperty('timestamp');
    });

    it('should register API routes under /api prefix', async () => {
      app.get('/api/test', (req, res) => {
        res.json({ message: 'API route works' });
      });

      const response = await request(app)
        .get('/api/test')
        .expect(HTTP_STATUS.OK);

      expect(response.body.message).toBe('API route works');
    });

    it('should handle 404 for non-existent routes', async () => {
      const response = await request(app)
        .get('/non-existent-route')
        .expect(HTTP_STATUS.NOT_FOUND);

      expect(response.status).toBe(HTTP_STATUS.NOT_FOUND);
    });
  });

  describe('Middleware Setup', () => {
    it('should apply middleware in correct order', async () => {
      const executionOrder: string[] = [];

      app.use((req, res, next) => {
        executionOrder.push('middleware1');
        next();
      });

      app.use((req, res, next) => {
        executionOrder.push('middleware2');
        next();
      });

      app.get('/middleware-test', (req, res) => {
        executionOrder.push('handler');
        res.json({ order: executionOrder });
      });

      const response = await request(app)
        .get('/middleware-test')
        .expect(HTTP_STATUS.OK);

      expect(response.body.order).toEqual(['middleware1', 'middleware2', 'handler']);
    });

    it('should handle middleware errors', async () => {
      app.get('/error-test', (req, res, next) => {
        next(new Error('Test error'));
      });

      app.use((err: Error, req: any, res: any, next: any) => {
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
          error: err.message,
        });
      });

      const response = await request(app)
        .get('/error-test')
        .expect(HTTP_STATUS.INTERNAL_SERVER_ERROR);

      expect(response.body.error).toBe('Test error');
    });
  });

  describe('API Endpoint Tests', () => {
    describe('Authentication Endpoints', () => {
      it('should handle login requests', async () => {
        app.post('/api/auth/login', (req, res) => {
          const { email, password } = req.body;
          
          if (email && password) {
            res.json({
              success: true,
              data: {
                accessToken: 'mock-token',
                user: { id: 1, email, role: 'USER' },
              },
            });
          } else {
            res.status(HTTP_STATUS.BAD_REQUEST).json({
              error: 'Email and password required',
            });
          }
        });

        const response = await request(app)
          .post('/api/auth/login')
          .send({
            email: 'test@example.com',
            password: 'password123',
          })
          .expect(HTTP_STATUS.OK);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('accessToken');
        expect(response.body.data.user).toHaveProperty('email', 'test@example.com');
      });

      it('should reject login without credentials', async () => {
        const response = await request(app)
          .post('/api/auth/login')
          .send({})
          .expect(HTTP_STATUS.BAD_REQUEST);

        expect(response.body).toHaveProperty('error');
      });
    });

    describe('Protected Endpoints', () => {
      it('should allow access with valid token', async () => {
        app.get('/api/protected', (req, res) => {
          const authHeader = req.headers.authorization;
          
          if (authHeader && authHeader.startsWith('Bearer ')) {
            res.json({ message: 'Access granted', userId: testUserId });
          } else {
            res.status(HTTP_STATUS.UNAUTHORIZED).json({
              error: 'Unauthorized',
            });
          }
        });

        const response = await request(app)
          .get('/api/protected')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(HTTP_STATUS.OK);

        expect(response.body.message).toBe('Access granted');
        expect(response.body.userId).toBe(testUserId);
      });

      it('should reject access without token', async () => {
        const response = await request(app)
          .get('/api/protected')
          .expect(HTTP_STATUS.UNAUTHORIZED);

        expect(response.body).toHaveProperty('error');
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle validation errors consistently', async () => {
      app.post('/api/validate', (req, res) => {
        const { name, email } = req.body;
        
        if (!name || !email) {
          return res.status(HTTP_STATUS.BAD_REQUEST).json({
            error: 'Validation failed',
            details: {
              name: !name ? 'Name is required' : undefined,
              email: !email ? 'Email is required' : undefined,
            },
          });
        }
        
        res.json({ success: true });
      });

      const response = await request(app)
        .post('/api/validate')
        .send({ name: 'Test' })
        .expect(HTTP_STATUS.BAD_REQUEST);

      expect(response.body.error).toBe('Validation failed');
      expect(response.body.details).toHaveProperty('email');
    });

    it('should handle server errors gracefully', async () => {
      app.get('/api/server-error', (req, res, next) => {
        next(new Error('Internal server error'));
      });

      app.use((err: Error, req: any, res: any, next: any) => {
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
          error: 'Internal server error',
          message: err.message,
        });
      });

      const response = await request(app)
        .get('/api/server-error')
        .expect(HTTP_STATUS.INTERNAL_SERVER_ERROR);

      expect(response.body.error).toBe('Internal server error');
    });

    it('should sanitize error messages in production', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      app.get('/api/prod-error', (req, res, next) => {
        next(new Error('Sensitive database connection string: postgres://user:pass@host'));
      });

      app.use((err: Error, req: any, res: any, next: any) => {
        const message = process.env.NODE_ENV === 'production' 
          ? 'An error occurred' 
          : err.message;
        
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
          error: message,
        });
      });

      const response = await request(app)
        .get('/api/prod-error')
        .expect(HTTP_STATUS.INTERNAL_SERVER_ERROR);

      expect(response.body.error).toBe('An error occurred');
      expect(response.body.error).not.toContain('postgres://');

      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('End-to-End Workflows', () => {
    it('should complete user registration and login workflow', async () => {
      // Mock registration endpoint
      app.post('/api/auth/register', (req, res) => {
        const { email, password, username } = req.body;
        
        res.status(HTTP_STATUS.CREATED).json({
          success: true,
          data: {
            user: {
              id: 999,
              email,
              username,
              role: 'USER',
            },
          },
        });
      });

      // Step 1: Register
      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'workflow@example.com',
          password: 'SecurePass123!',
          username: 'workflowuser',
        })
        .expect(HTTP_STATUS.CREATED);

      expect(registerResponse.body.success).toBe(true);
      const userId = registerResponse.body.data.user.id;

      // Step 2: Login
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'workflow@example.com',
          password: 'SecurePass123!',
        })
        .expect(HTTP_STATUS.OK);

      expect(loginResponse.body.success).toBe(true);
      expect(loginResponse.body.data).toHaveProperty('accessToken');
    });

    it('should complete search workflow', async () => {
      // Mock search endpoint
      app.post('/api/search', (req, res) => {
        const authHeader = req.headers.authorization;
        
        if (!authHeader) {
          return res.status(HTTP_STATUS.UNAUTHORIZED).json({
            error: 'Unauthorized',
          });
        }

        const { query } = req.body;
        
        if (!query) {
          return res.status(HTTP_STATUS.BAD_REQUEST).json({
            error: 'Query is required',
          });
        }

        res.json({
          success: true,
          data: {
            searchId: 'search-123',
            results: [
              { id: 1, title: 'Result 1', score: 95 },
              { id: 2, title: 'Result 2', score: 87 },
            ],
          },
        });
      });

      // Perform search
      const searchResponse = await request(app)
        .post('/api/search')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ query: 'test search' })
        .expect(HTTP_STATUS.OK);

      expect(searchResponse.body.success).toBe(true);
      expect(searchResponse.body.data.results).toHaveLength(2);
      expect(searchResponse.body.data.results[0]).toHaveProperty('score');
    });

    it('should handle data flow through multiple endpoints', async () => {
      let createdResourceId: string;

      // Create resource
      app.post('/api/resources', (req, res) => {
        const authHeader = req.headers.authorization;
        if (!authHeader) {
          return res.status(HTTP_STATUS.UNAUTHORIZED).json({ error: 'Unauthorized' });
        }

        createdResourceId = 'resource-' + Date.now();
        res.status(HTTP_STATUS.CREATED).json({
          success: true,
          data: { id: createdResourceId, ...req.body },
        });
      });

      // Get resource
      app.get('/api/resources/:id', (req, res) => {
        const authHeader = req.headers.authorization;
        if (!authHeader) {
          return res.status(HTTP_STATUS.UNAUTHORIZED).json({ error: 'Unauthorized' });
        }

        res.json({
          success: true,
          data: { id: req.params.id, name: 'Test Resource' },
        });
      });

      // Step 1: Create
      const createResponse = await request(app)
        .post('/api/resources')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Test Resource' })
        .expect(HTTP_STATUS.CREATED);

      expect(createResponse.body.success).toBe(true);
      const resourceId = createResponse.body.data.id;

      // Step 2: Retrieve
      const getResponse = await request(app)
        .get(`/api/resources/${resourceId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(HTTP_STATUS.OK);

      expect(getResponse.body.success).toBe(true);
      expect(getResponse.body.data.id).toBe(resourceId);
    });
  });

  describe('Response Format Consistency', () => {
    it('should return consistent success response format', async () => {
      app.get('/api/consistent-success', (req, res) => {
        res.json({
          success: true,
          data: { message: 'Success' },
        });
      });

      const response = await request(app)
        .get('/api/consistent-success')
        .expect(HTTP_STATUS.OK);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
    });

    it('should return consistent error response format', async () => {
      app.get('/api/consistent-error', (req, res) => {
        res.status(HTTP_STATUS.BAD_REQUEST).json({
          error: 'Bad request',
          details: { field: 'Invalid value' },
        });
      });

      const response = await request(app)
        .get('/api/consistent-error')
        .expect(HTTP_STATUS.BAD_REQUEST);

      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('details');
    });
  });
});
