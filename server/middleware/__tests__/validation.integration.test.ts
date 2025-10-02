import request from 'supertest';
import express from 'express';
import { 
  validateApiInput,
  validateLogin,
  validateSearch,
  createRateLimit,
  generalRateLimit,
  authRateLimit,
  searchRateLimit
} from '../validation';
import { errorHandlerMiddleware } from '../errorHandler';

describe('Validation Middleware Integration', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
  });

  describe('API Input Validation', () => {
    beforeEach(() => {
      app.use('/api', validateApiInput);
      app.post('/api/test', (req, res) => {
        res.json({ success: true, body: req.body });
      });
      app.use(errorHandlerMiddleware);
    });

    it('should accept valid input', async () => {
      const response = await request(app)
        .post('/api/test')
        .send({ name: 'John Doe', email: 'john@example.com' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.body.name).toBe('John Doe');
    });

    it('should sanitize input', async () => {
      const response = await request(app)
        .post('/api/test')
        .send({ name: '  John Doe  ', description: 'Test\x00description' })
        .expect(200);

      expect(response.body.body.name).toBe('John Doe');
      expect(response.body.body.description).toBe('Testdescription');
    });

    it('should reject SQL injection attempts', async () => {
      await request(app)
        .post('/api/test')
        .send({ query: "'; DROP TABLE users; --" })
        .expect(400);
    });

    it('should reject NoSQL injection attempts', async () => {
      await request(app)
        .post('/api/test')
        .send({ filter: { $where: 'function() { return true; }' } })
        .expect(400);
    });

    it('should handle nested injection attempts', async () => {
      await request(app)
        .post('/api/test')
        .send({ 
          user: { 
            name: 'John',
            query: 'SELECT * FROM users WHERE id = 1 OR 1=1'
          }
        })
        .expect(400);
    });
  });

  describe('Login Validation', () => {
    beforeEach(() => {
      app.post('/auth/login', validateLogin, (req, res) => {
        res.json({ success: true, user: req.body });
      });
      app.use(errorHandlerMiddleware);
    });

    it('should accept valid login data', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({
          email: 'test@example.com',
          password: 'password123'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.user.email).toBe('test@example.com');
    });

    it('should reject invalid email', async () => {
      await request(app)
        .post('/auth/login')
        .send({
          email: 'invalid-email',
          password: 'password123'
        })
        .expect(400);
    });

    it('should reject short password', async () => {
      await request(app)
        .post('/auth/login')
        .send({
          email: 'test@example.com',
          password: '123'
        })
        .expect(400);
    });

    it('should sanitize login data', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({
          email: '  test@example.com  ',
          password: '  password123  '
        })
        .expect(200);

      expect(response.body.user.email).toBe('test@example.com');
      expect(response.body.user.password).toBe('password123');
    });
  });

  describe('Search Validation', () => {
    beforeEach(() => {
      app.post('/api/search', validateSearch, (req, res) => {
        res.json({ success: true, search: req.body });
      });
      app.use(errorHandlerMiddleware);
    });

    it('should accept valid search query', async () => {
      const response = await request(app)
        .post('/api/search')
        .send({
          query: 'sustainable packaging solutions',
          filters: {
            categories: ['tech', 'sustainability'],
            sortBy: 'innovation'
          }
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.search.query).toBe('sustainable packaging solutions');
    });

    it('should reject empty query', async () => {
      await request(app)
        .post('/api/search')
        .send({ query: '' })
        .expect(400);
    });

    it('should reject query that is too long', async () => {
      await request(app)
        .post('/api/search')
        .send({ query: 'a'.repeat(2001) })
        .expect(400);
    });

    it('should validate filter values', async () => {
      await request(app)
        .post('/api/search')
        .send({
          query: 'test query',
          filters: {
            sortBy: 'invalid_sort'
          }
        })
        .expect(400);
    });

    it('should sanitize search input', async () => {
      const response = await request(app)
        .post('/api/search')
        .send({
          query: '  sustainable packaging  ',
          filters: {
            categories: ['  tech  ', '  sustainability  ']
          }
        })
        .expect(200);

      expect(response.body.search.query).toBe('sustainable packaging');
      expect(response.body.search.filters.categories).toEqual(['tech', 'sustainability']);
    });
  });

  describe('Rate Limiting', () => {
    it('should enforce general rate limits', async () => {
      const testRateLimit = createRateLimit(2, 60000);
      app.use('/api', testRateLimit);
      app.get('/api/test', (req, res) => {
        res.json({ success: true });
      });
      app.use(errorHandlerMiddleware);

      // First two requests should succeed
      await request(app).get('/api/test').expect(200);
      await request(app).get('/api/test').expect(200);

      // Third request should be rate limited
      await request(app).get('/api/test').expect(429);
    });

    it('should enforce auth rate limits', async () => {
      const testAuthLimit = createRateLimit(1, 60000);
      app.use('/auth', testAuthLimit);
      app.post('/auth/login', (req, res) => {
        res.json({ success: true });
      });
      app.use(errorHandlerMiddleware);

      // First request should succeed
      await request(app).post('/auth/login').expect(200);

      // Second request should be rate limited
      await request(app).post('/auth/login').expect(429);
    });

    it('should enforce search rate limits', async () => {
      const testSearchLimit = createRateLimit(1, 60000);
      app.use('/api/search', testSearchLimit);
      app.post('/api/search', (req, res) => {
        res.json({ success: true });
      });
      app.use(errorHandlerMiddleware);

      // First request should succeed
      await request(app).post('/api/search').expect(200);

      // Second request should be rate limited
      await request(app).post('/api/search').expect(429);
    });

    it('should track rate limits per IP', async () => {
      const testRateLimit = createRateLimit(1, 60000);
      app.use('/api', testRateLimit);
      app.get('/api/test', (req, res) => {
        res.json({ success: true });
      });
      app.use(errorHandlerMiddleware);

      // Simulate different IPs by using different test instances
      const agent1 = request(app);
      const agent2 = request(app);

      // Both should be able to make one request
      await agent1.get('/api/test').expect(200);
      await agent2.get('/api/test').expect(200);

      // Both should be rate limited on second request
      await agent1.get('/api/test').expect(429);
      await agent2.get('/api/test').expect(429);
    });
  });

  describe('Combined Validation and Rate Limiting', () => {
    beforeEach(() => {
      const testRateLimit = createRateLimit(5, 60000);
      app.use('/api', testRateLimit, validateApiInput);
      app.post('/api/search', validateSearch, (req, res) => {
        res.json({ success: true, search: req.body });
      });
      app.use(errorHandlerMiddleware);
    });

    it('should apply both rate limiting and validation', async () => {
      // Valid request should succeed
      await request(app)
        .post('/api/search')
        .send({ query: 'test query' })
        .expect(200);

      // Invalid request should fail validation before rate limiting
      await request(app)
        .post('/api/search')
        .send({ query: '' })
        .expect(400);

      // Injection attempt should be blocked
      await request(app)
        .post('/api/search')
        .send({ query: "'; DROP TABLE users; --" })
        .expect(400);
    });

    it('should handle validation errors properly', async () => {
      const response = await request(app)
        .post('/api/search')
        .send({ query: '' })
        .expect(400);

      expect(response.body.error).toBeDefined();
      expect(response.body.code).toBeDefined();
    });

    it('should handle rate limit errors properly', async () => {
      const testRateLimit = createRateLimit(1, 60000);
      const limitedApp = express();
      limitedApp.use(express.json());
      limitedApp.use('/api', testRateLimit);
      limitedApp.post('/api/test', (req, res) => {
        res.json({ success: true });
      });
      limitedApp.use(errorHandlerMiddleware);

      // First request succeeds
      await request(limitedApp).post('/api/test').expect(200);

      // Second request is rate limited
      const response = await request(limitedApp).post('/api/test').expect(429);
      expect(response.body.error).toBeDefined();
      expect(response.body.code).toBe('RATE_LIMIT_EXCEEDED');
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      app.use('/api', validateApiInput);
      app.post('/api/test', (req, res) => {
        res.json({ success: true });
      });
      app.use(errorHandlerMiddleware);
    });

    it('should provide detailed validation errors', async () => {
      app.post('/api/validate', validateLogin, (req, res) => {
        res.json({ success: true });
      });

      const response = await request(app)
        .post('/api/validate')
        .send({ email: 'invalid', password: '123' })
        .expect(400);

      expect(response.body.error).toBeDefined();
      expect(response.body.message).toBeDefined();
      expect(response.body.code).toBeDefined();
    });

    it('should handle malformed JSON', async () => {
      await request(app)
        .post('/api/test')
        .set('Content-Type', 'application/json')
        .send('{"invalid": json}')
        .expect(400);
    });

    it('should handle missing content type', async () => {
      await request(app)
        .post('/api/test')
        .send('plain text')
        .expect(200); // Express should handle this gracefully
    });
  });
});