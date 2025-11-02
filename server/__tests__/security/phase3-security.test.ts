/**
 * Phase 3 Security Review Tests
 * 
 * Comprehensive security tests for Phase 3 features:
 * - Stripe webhook security
 * - Rate limiting
 * - Input validation
 * - Authentication flows
 * - Authorization checks
 */

import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import crypto from 'crypto';
import { registerRoutes } from '../../routes.js';
import { getTestDb, createTestUser, cleanupTestUser } from '../helpers/test-db.js';
import { generateTestToken } from '../utils/testHelpers.js';
import { db } from '../../db.js';
import { users } from '../../../shared/schema.js';
import { eq } from 'drizzle-orm';

// Database is now configured - tests enabled!
describe('Phase 3 Security Review', () => {
  let app: express.Application;
  let server: any;
  let testUserId: number;
  let authToken: string;

  beforeAll(async () => {
    // Set up Express app with routes
    app = express();
    app.use(express.json());
    server = await registerRoutes(app);
  });

  beforeEach(async () => {
    // Create test user using helper with unique email
    const testUser = await createTestUser({
      email: `security-${Date.now()}-${Math.random().toString(36).substring(7)}@test.com`,
      password: '$2b$04$hashedpasswordexample', // Pre-hashed for speed
      plan: 'free',
    });
    
    testUserId = testUser.id;

    // Generate auth token
    authToken = await generateTestToken(testUser);
  });

  afterEach(async () => {
    // Clean up test user and related data
    if (testUserId) {
      await cleanupTestUser(testUserId);
    }
  });

  describe('Stripe Webhook Security', () => {
    it('should reject webhooks without signature', async () => {
      const payload = {
        type: 'checkout.session.completed',
        data: { object: { id: 'cs_test' } },
      };

      const response = await request(app)
        .post('/api/stripe/webhook')
        .send(payload)
        .expect(401);

      expect(response.body.error).toContain('signature');
    });

    it('should reject webhooks with invalid signature', async () => {
      const payload = JSON.stringify({
        type: 'checkout.session.completed',
        data: { object: { id: 'cs_test' } },
      });

      const response = await request(app)
        .post('/api/stripe/webhook')
        .set('stripe-signature', 'invalid_signature')
        .send(payload)
        .expect(401);

      expect(response.body.error).toContain('signature');
    });

    it('should validate webhook signature correctly', async () => {
      const payload = JSON.stringify({
        type: 'checkout.session.completed',
        data: {
          object: {
            id: 'cs_test_123',
            customer: 'cus_test_123',
            subscription: 'sub_test_123',
            metadata: { userId: testUserId.toString() },
          },
        },
      });

      // Generate valid signature
      const secret = process.env.STRIPE_WEBHOOK_SECRET || 'whsec_test';
      const timestamp = Math.floor(Date.now() / 1000);
      const signedPayload = `${timestamp}.${payload}`;
      const signature = crypto
        .createHmac('sha256', secret)
        .update(signedPayload)
        .digest('hex');
      const stripeSignature = `t=${timestamp},v1=${signature}`;

      const response = await request(app)
        .post('/api/stripe/webhook')
        .set('stripe-signature', stripeSignature)
        .send(payload)
        .expect(200);

      expect(response.body.received).toBe(true);
    });

    it('should reject replay attacks (old timestamps)', async () => {
      const payload = JSON.stringify({
        type: 'checkout.session.completed',
        data: { object: { id: 'cs_test' } },
      });

      // Use old timestamp (5 minutes ago)
      const oldTimestamp = Math.floor(Date.now() / 1000) - 300;
      const secret = process.env.STRIPE_WEBHOOK_SECRET || 'whsec_test';
      const signedPayload = `${oldTimestamp}.${payload}`;
      const signature = crypto
        .createHmac('sha256', secret)
        .update(signedPayload)
        .digest('hex');
      const stripeSignature = `t=${oldTimestamp},v1=${signature}`;

      const response = await request(app)
        .post('/api/stripe/webhook')
        .set('stripe-signature', stripeSignature)
        .send(payload)
        .expect(401);

      expect(response.body.error).toContain('timestamp');
    });

    it('should prevent webhook injection attacks', async () => {
      const maliciousPayload = JSON.stringify({
        type: 'checkout.session.completed',
        data: {
          object: {
            id: 'cs_test',
            metadata: {
              userId: '1 OR 1=1', // SQL injection attempt
            },
          },
        },
      });

      const response = await request(app)
        .post('/api/stripe/webhook')
        .set('stripe-signature', 'test_sig')
        .send(maliciousPayload)
        .expect(401);

      // Should reject due to invalid signature
      expect(response.body.error).toBeDefined();
    });
  });

  describe('Rate Limiting', () => {
    it('should enforce rate limits on search endpoint', async () => {
      const requests = [];

      // Make 20 rapid requests (assuming limit is 10/minute)
      for (let i = 0; i < 20; i++) {
        requests.push(
          request(app)
            .post('/api/search')
            .set('Authorization', `Bearer ${authToken}`)
            .send({ query: `test ${i}` })
        );
      }

      const responses = await Promise.all(requests);
      const rateLimited = responses.filter(r => r.status === 429);

      expect(rateLimited.length).toBeGreaterThan(0);
    });

    it('should return proper rate limit headers', async () => {
      const response = await request(app)
        .post('/api/search')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ query: 'test' });

      expect(response.headers).toHaveProperty('x-ratelimit-limit');
      expect(response.headers).toHaveProperty('x-ratelimit-remaining');
      expect(response.headers).toHaveProperty('x-ratelimit-reset');
    });

    it('should enforce different rate limits per tier', async () => {
      // Free tier user
      const freeResponse = await request(app)
        .post('/api/search')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ query: 'test' });

      const freeLimit = parseInt(freeResponse.headers['x-ratelimit-limit']);

      // Upgrade to pro tier
      await db
        .update(users)
        .set({ subscriptionTier: 'pro' })
        .where(eq(users.id, testUserId));

      const proResponse = await request(app)
        .post('/api/search')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ query: 'test' });

      const proLimit = parseInt(proResponse.headers['x-ratelimit-limit']);

      expect(proLimit).toBeGreaterThan(freeLimit);
    });

    it('should rate limit by IP for unauthenticated requests', async () => {
      const requests = [];

      for (let i = 0; i < 15; i++) {
        requests.push(
          request(app)
            .get('/api/health')
        );
      }

      const responses = await Promise.all(requests);
      const rateLimited = responses.filter(r => r.status === 429);

      expect(rateLimited.length).toBeGreaterThan(0);
    });

    it('should reset rate limits after time window', async () => {
      // Hit rate limit
      for (let i = 0; i < 15; i++) {
        await request(app)
          .post('/api/search')
          .set('Authorization', `Bearer ${authToken}`)
          .send({ query: `test ${i}` });
      }

      // Wait for rate limit window to reset (mock time)
      vi.useFakeTimers();
      vi.advanceTimersByTime(60000); // 1 minute

      // Should work again
      const response = await request(app)
        .post('/api/search')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ query: 'test after reset' })
        .expect(200);

      expect(response.status).toBe(200);

      vi.useRealTimers();
    });
  });

  describe('Input Validation', () => {
    it('should reject XSS attempts in search queries', async () => {
      const xssPayload = '<script>alert("XSS")</script>';

      const response = await request(app)
        .post('/api/search')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ query: xssPayload })
        .expect(400);

      expect(response.body.error).toContain('invalid');
    });

    it('should sanitize HTML in user inputs', async () => {
      const htmlPayload = '<img src=x onerror=alert(1)>';

      const response = await request(app)
        .post('/api/search')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ query: htmlPayload })
        .expect(400);

      expect(response.body.error).toBeDefined();
    });

    it('should reject SQL injection attempts', async () => {
      const sqlInjection = "'; DROP TABLE users; --";

      const response = await request(app)
        .post('/api/search')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ query: sqlInjection })
        .expect(400);

      expect(response.body.error).toBeDefined();
    });

    it('should validate email format', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'testuser',
          email: 'invalid-email',
          password: 'password123',
        })
        .expect(400);

      expect(response.body.error).toContain('email');
    });

    it('should enforce password strength requirements', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'testuser',
          email: 'test@example.com',
          password: '123', // Too weak
        })
        .expect(400);

      expect(response.body.error).toContain('password');
    });

    it('should validate export format parameter', async () => {
      const response = await request(app)
        .post('/api/export/1')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ format: 'invalid_format' })
        .expect(400);

      expect(response.body.error).toContain('format');
    });

    it('should reject oversized payloads', async () => {
      const largePayload = 'a'.repeat(1000000); // 1MB

      const response = await request(app)
        .post('/api/search')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ query: largePayload })
        .expect(413);

      expect(response.body.error).toContain('large');
    });

    it('should validate numeric IDs', async () => {
      const response = await request(app)
        .get('/api/search-history/invalid_id')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body.error).toContain('id');
    });
  });

  describe('Authentication Flows', () => {
    it('should reject requests without authentication', async () => {
      const response = await request(app)
        .post('/api/search')
        .send({ query: 'test' })
        .expect(401);

      expect(response.body.error).toContain('authentication');
    });

    it('should reject invalid JWT tokens', async () => {
      const response = await request(app)
        .post('/api/search')
        .set('Authorization', 'Bearer invalid_token')
        .send({ query: 'test' })
        .expect(401);

      expect(response.body.error).toContain('token');
    });

    it('should reject expired JWT tokens', async () => {
      // Create expired token
      const jwt = require('jsonwebtoken');
      const expiredToken = jwt.sign(
        { userId: testUserId },
        process.env.JWT_SECRET || 'test_secret',
        { expiresIn: '-1h' }
      );

      const response = await request(app)
        .post('/api/search')
        .set('Authorization', `Bearer ${expiredToken}`)
        .send({ query: 'test' })
        .expect(401);

      expect(response.body.error).toContain('expired');
    });

    it('should prevent session fixation attacks', async () => {
      // Login with one session
      const login1 = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'securitytest',
          password: 'hashedpassword',
        });

      const token1 = login1.body.token;

      // Login again (should invalidate previous session)
      const login2 = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'securitytest',
          password: 'hashedpassword',
        });

      const token2 = login2.body.token;

      expect(token1).not.toBe(token2);
    });

    it('should enforce HTTPS in production', async () => {
      // Mock production environment
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const response = await request(app)
        .post('/api/auth/login')
        .set('X-Forwarded-Proto', 'http')
        .send({
          username: 'securitytest',
          password: 'hashedpassword',
        });

      // Should redirect to HTTPS or reject
      expect([301, 302, 403]).toContain(response.status);

      process.env.NODE_ENV = originalEnv;
    });

    it('should implement CSRF protection', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'securitytest',
          password: 'hashedpassword',
        });

      // Should set CSRF token
      expect(response.headers).toHaveProperty('x-csrf-token');
    });
  });

  describe('Authorization Checks', () => {
    it('should prevent users from accessing other users data', async () => {
      // Create another user using helper
      const otherUser = await createTestUser({
        email: 'other@test.com',
        password: '$2b$04$hashedpasswordexample',
      });

      // Try to access other user's search history
      const response = await request(app)
        .get(`/api/search-history?userId=${otherUser.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(403);

      expect(response.body.error).toContain('authorized');
      
      // Cleanup other user
      await cleanupTestUser(otherUser.id);
    });

    it('should enforce subscription tier limits', async () => {
      // Set user to free tier with limit reached
      await db
        .update(users)
        .set({
          subscriptionTier: 'free',
          searchesUsed: 10,
          searchesLimit: 10,
        })
        .where(eq(users.id, testUserId));

      const response = await request(app)
        .post('/api/search')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ query: 'test' })
        .expect(403);

      expect(response.body.error).toContain('limit');
    });

    it('should restrict admin endpoints to admin users', async () => {
      const response = await request(app)
        .get('/api/analytics/dashboard')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(403);

      expect(response.body.error).toContain('admin');
    });

    it('should allow admin access for admin users', async () => {
      // Make user admin
      await db
        .update(users)
        .set({ role: 'admin' })
        .where(eq(users.id, testUserId));

      const response = await request(app)
        .get('/api/analytics/dashboard')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('totalSearches');
    });

    it('should prevent privilege escalation', async () => {
      // Try to update own role to admin
      const response = await request(app)
        .patch('/api/user/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ role: 'admin' })
        .expect(403);

      expect(response.body.error).toContain('permission');
    });
  });

  describe('Data Protection', () => {
    it('should not expose sensitive data in error messages', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'nonexistent',
          password: 'wrongpassword',
        })
        .expect(401);

      // Should not reveal if user exists
      expect(response.body.error).not.toContain('user not found');
      expect(response.body.error).toContain('invalid credentials');
    });

    it('should hash passwords before storage', async () => {
      const password = 'testpassword123';
      const email = 'new@test.com';

      await request(app)
        .post('/api/auth/register')
        .send({
          name: 'New User',
          email,
          password,
        })
        .expect(201);

      // Check database
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.email, email));

      expect(user.password).not.toBe(password);
      expect(user.password).toMatch(/^\$2[aby]\$/); // bcrypt hash
      
      // Cleanup
      await cleanupTestUser(user.id);
    });

    it('should not log sensitive information', async () => {
      const consoleSpy = vi.spyOn(console, 'log');

      await request(app)
        .post('/api/auth/login')
        .send({
          username: 'securitytest',
          password: 'hashedpassword',
        });

      // Check that password was not logged
      const logs = consoleSpy.mock.calls.flat().join(' ');
      expect(logs).not.toContain('hashedpassword');

      consoleSpy.mockRestore();
    });

    it('should sanitize data in analytics', async () => {
      await request(app)
        .post('/api/search')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ query: 'sensitive search query' });

      // Make user admin to access analytics
      await db
        .update(users)
        .set({ role: 'admin' })
        .where(eq(users.id, testUserId));

      const response = await request(app)
        .get('/api/analytics/dashboard')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Analytics should not expose individual user data
      expect(response.body).not.toHaveProperty('userEmails');
      expect(response.body).not.toHaveProperty('passwords');
    });
  });
});
