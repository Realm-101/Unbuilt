import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import express from 'express';
import { sanitizeInput, validateAuthInput, validateApiInput } from '../inputSanitization';
import { validateQueryResults, validateSearchData } from '../queryValidation';

// Create a test Express app
const createTestApp = () => {
  const app = express();
  app.use(express.json());
  
  // Apply our security middleware
  app.use('/api', sanitizeInput, validateApiInput);
  
  // Mock auth routes with security middleware
  app.post('/api/auth/login', validateAuthInput, (req, res) => {
    res.json({ success: true, data: req.body });
  });
  
  app.post('/api/auth/register', validateAuthInput, (req, res) => {
    res.json({ success: true, data: req.body });
  });
  
  // Mock API routes with query validation
  app.get('/api/search/:id', validateQueryResults, (req, res) => {
    // Simulate returning user data with sensitive fields
    const mockData = {
      id: parseInt(req.params.id),
      userId: 1,
      query: 'test search',
      password: 'secret123',
      stripeCustomerId: 'cus_123',
      email: 'test@example.com'
    };
    res.json(mockData);
  });
  
  app.get('/api/ideas', validateSearchData, (req, res) => {
    // Mock user in request for testing
    (req as any).user = { id: 1 };
    
    const mockIdeas = [
      {
        id: 1,
        userId: 1,
        title: 'My Idea',
        password: 'secret',
        stripeCustomerId: 'cus_123'
      },
      {
        id: 2,
        userId: 2,
        title: 'Other Idea',
        password: 'secret2',
        stripeCustomerId: 'cus_456'
      }
    ];
    res.json(mockIdeas);
  });
  
  // Test endpoint for SQL injection attempts
  app.post('/api/test-injection', (req, res) => {
    res.json({ received: req.body });
  });
  
  return app;
};

describe('SQL Injection Prevention Integration Tests', () => {
  let app: express.Application;
  
  beforeAll(() => {
    app = createTestApp();
  });
  
  describe('Authentication Endpoints', () => {
    it('should block SQL injection in login email', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: "admin'; DROP TABLE users; --",
          password: 'password123'
        });
      
      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid input');
      expect(response.body.message).toBe('Request contains potentially malicious content');
    });
    
    it('should block SQL injection in register data', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@example.com',
          password: 'password123',
          name: "John'; DELETE FROM users WHERE '1'='1"
        });
      
      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid input');
    });
    
    it('should allow clean authentication data', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'password123'
        });
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.email).toBe('test@example.com');
    });
  });
  
  describe('API Endpoints', () => {
    it('should block NoSQL injection attempts', async () => {
      const response = await request(app)
        .post('/api/test-injection')
        .send({
          filter: { $where: 'this.username == "admin"' },
          query: { $ne: null }
        });
      
      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid input');
    });
    
    it('should sanitize XSS attempts', async () => {
      const response = await request(app)
        .post('/api/test-injection')
        .send({
          name: '<script>alert("xss")</script>John',
          description: 'Hello <img src="x" onerror="alert(1)"> world'
        });
      
      expect(response.status).toBe(200);
      expect(response.body.received.name).toBe('John');
      expect(response.body.received.description).toBe('Hello  world');
    });
    
    it('should validate ID parameters', async () => {
      const response = await request(app)
        .get('/api/search/invalid-id');
      
      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Validation error');
      expect(response.body.message).toBe('Invalid ID parameter');
    });
    
    it('should sanitize response data and remove sensitive fields', async () => {
      const response = await request(app)
        .get('/api/search/123');
      
      expect(response.status).toBe(200);
      expect(response.body.id).toBe(123);
      expect(response.body.query).toBe('test search');
      expect(response.body.email).toBe('test@example.com');
      // Sensitive fields should be removed
      expect(response.body.password).toBeUndefined();
      expect(response.body.stripeCustomerId).toBeUndefined();
    });
    
    it('should filter results by ownership', async () => {
      const response = await request(app)
        .get('/api/ideas');
      
      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toHaveLength(1); // Only user's own idea
      expect(response.body[0].id).toBe(1);
      expect(response.body[0].title).toBe('My Idea');
      // Sensitive fields should be removed
      expect(response.body[0].password).toBeUndefined();
      expect(response.body[0].stripeCustomerId).toBeUndefined();
    });
  });
  
  describe('Advanced SQL Injection Patterns', () => {
    const advancedInjectionAttempts = [
      // Union-based injections
      "' UNION SELECT username, password FROM users --",
      "' UNION ALL SELECT NULL, username||':'||password FROM users --",
      
      // Boolean-based blind injections
      "' AND (SELECT COUNT(*) FROM users) > 0 --",
      "' AND (SELECT SUBSTRING(password,1,1) FROM users WHERE username='admin')='a' --",
      
      // Time-based blind injections
      "'; WAITFOR DELAY '00:00:05' --",
      "' AND (SELECT COUNT(*) FROM users WHERE SLEEP(5)) --",
      
      // Error-based injections
      "' AND EXTRACTVALUE(1, CONCAT(0x7e, (SELECT version()), 0x7e)) --",
      "' AND (SELECT * FROM (SELECT COUNT(*),CONCAT(version(),FLOOR(RAND(0)*2))x FROM information_schema.tables GROUP BY x)a) --",
      
      // Stacked queries
      "'; INSERT INTO users (username, password) VALUES ('hacker', 'password'); --",
      "'; UPDATE users SET password='hacked' WHERE username='admin'; --",
      
      // Comment variations
      "admin'/**/OR/**/1=1/**/--",
      "admin'%20OR%201=1%20--",
      "admin'+OR+1=1+--"
    ];
    
    advancedInjectionAttempts.forEach((injection, index) => {
      it(`should block advanced SQL injection attempt ${index + 1}`, async () => {
        const response = await request(app)
          .post('/api/test-injection')
          .send({
            email: `test@example.com${injection}`,
            search: injection,
            filter: injection
          });
        
        expect(response.status).toBe(400);
        expect(response.body.error).toBe('Invalid input');
        expect(response.body.message).toBe('Request contains potentially malicious content');
      });
    });
  });
  
  describe('NoSQL Injection Patterns', () => {
    const noSqlInjectionAttempts = [
      // MongoDB operator injections
      '{"$where": "function() { return this.username == \'admin\' }"}',
      '{"$regex": ".*", "$options": "i"}',
      '{"$gt": ""}',
      '{"$lt": "zzz"}',
      '{"$ne": null}',
      '{"$in": ["admin", "root"]}',
      '{"$nin": []}',
      '{"$exists": true}',
      
      // JavaScript injections
      'function() { return true; }',
      'javascript:alert(1)',
      'eval(String.fromCharCode(97,108,101,114,116,40,49,41))',
      
      // Complex nested injections
      '{"$or": [{"username": {"$regex": ".*"}}, {"password": {"$exists": true}}]}',
      '{"username": {"$where": "this.username.length > 0"}}'
    ];
    
    noSqlInjectionAttempts.forEach((injection, index) => {
      it(`should block NoSQL injection attempt ${index + 1}`, async () => {
        const response = await request(app)
          .post('/api/test-injection')
          .send({
            filter: injection,
            query: injection,
            search: injection
          });
        
        expect(response.status).toBe(400);
        expect(response.body.error).toBe('Invalid input');
        expect(response.body.message).toBe('Request contains potentially malicious content');
      });
    });
  });
  
  describe('XSS Prevention', () => {
    const xssAttempts = [
      '<script>alert("xss")</script>',
      '<img src="x" onerror="alert(1)">',
      '<svg onload="alert(1)">',
      'javascript:alert(1)',
      '<iframe src="javascript:alert(1)"></iframe>',
      '<object data="javascript:alert(1)"></object>',
      '<embed src="javascript:alert(1)">',
      '<link rel="stylesheet" href="javascript:alert(1)">',
      '<style>@import "javascript:alert(1)";</style>',
      '<meta http-equiv="refresh" content="0;url=javascript:alert(1)">'
    ];
    
    xssAttempts.forEach((xss, index) => {
      it(`should sanitize XSS attempt ${index + 1}`, async () => {
        const response = await request(app)
          .post('/api/test-injection')
          .send({
            name: `John${xss}`,
            description: `Hello ${xss} world`,
            comment: xss
          });
        
        expect(response.status).toBe(200);
        // XSS should be sanitized, not blocked
        expect(response.body.received.name).not.toContain('<script>');
        expect(response.body.received.name).not.toContain('javascript:');
        expect(response.body.received.description).not.toContain('<img');
        expect(response.body.received.description).not.toContain('onerror');
      });
    });
  });
  
  describe('Edge Cases', () => {
    it('should handle null and undefined values', async () => {
      const response = await request(app)
        .post('/api/test-injection')
        .send({
          name: null,
          description: undefined,
          tags: [null, undefined, 'valid']
        });
      
      expect(response.status).toBe(200);
      expect(response.body.received.tags).toEqual([null, undefined, 'valid']);
    });
    
    it('should handle deeply nested objects', async () => {
      const response = await request(app)
        .post('/api/test-injection')
        .send({
          user: {
            profile: {
              settings: {
                name: '<script>alert("deep")</script>John',
                preferences: {
                  theme: 'dark',
                  malicious: "'; DROP TABLE users; --"
                }
              }
            }
          }
        });
      
      expect(response.status).toBe(400); // Should be blocked due to SQL injection
    });
    
    it('should handle large payloads', async () => {
      const largeString = 'a'.repeat(10000);
      const response = await request(app)
        .post('/api/test-injection')
        .send({
          data: largeString,
          array: new Array(1000).fill('test')
        });
      
      expect(response.status).toBe(200);
      expect(response.body.received.data).toBe(largeString);
      expect(response.body.received.array).toHaveLength(1000);
    });
  });
});