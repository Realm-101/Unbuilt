/**
 * Phase 3 Features Integration Tests
 * 
 * Tests the end-to-end functionality of Phase 3 features:
 * - Stripe payment flow
 * - Onboarding flow
 * - Search and export workflows
 * - Analytics tracking
 * - Search history and favorites
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';

// Try to import database, skip tests if unavailable
let db: any;
let users: any;
let searches: any;
let analyticsEvents: any;
let eq: any;

try {
  const dbModule = await import('../../db.js');
  const schemaModule = await import('../../../shared/schema.js');
  const drizzleModule = await import('drizzle-orm');
  
  db = dbModule.db;
  users = schemaModule.users;
  searches = schemaModule.searches;
  analyticsEvents = schemaModule.analyticsEvents;
  eq = drizzleModule.eq;
} catch (error) {
  console.warn('Database connection failed, tests will be skipped:', error);
  (globalThis as any).__DB_UNAVAILABLE__ = true;
}

// Mock Stripe
vi.mock('stripe', () => {
  return {
    default: vi.fn(() => ({
      checkout: {
        sessions: {
          create: vi.fn().mockResolvedValue({
            id: 'cs_test_123',
            url: 'https://checkout.stripe.com/test',
          }),
        },
      },
      billingPortal: {
        sessions: {
          create: vi.fn().mockResolvedValue({
            url: 'https://billing.stripe.com/test',
          }),
        },
      },
      webhooks: {
        constructEvent: vi.fn((payload, sig, secret) => ({
          type: 'checkout.session.completed',
          data: {
            object: {
              id: 'cs_test_123',
              customer: 'cus_test_123',
              subscription: 'sub_test_123',
              metadata: { userId: '1' },
            },
          },
        })),
      },
    })),
  };
});

// Database is now configured - tests enabled!
describe('Phase 3 Features Integration Tests', () => {
  let app: express.Application;
  let testUserId: number;
  let authToken: string;

  beforeAll(async () => {

  beforeEach(async () => {
    // Create test user
    const [user] = await db.insert(users).values({
      username: 'testuser',
      email: 'test@example.com',
      password: 'hashedpassword',
      subscriptionTier: 'free',
    }).returning();
    
    testUserId = user.id;

    // Get auth token
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        username: 'testuser',
        password: 'hashedpassword',
      });
    
    authToken = loginResponse.body.token;
  });

  afterAll(async () => {
    // Cleanup
    if (testUserId && db) {
      try {
        await db.delete(users).where(eq(users.id, testUserId));
      } catch (error) {
        console.warn('Cleanup failed:', error);
      }
    }
  });

  describe('Stripe Payment Flow', () => {
    it('should create a checkout session for Pro plan', async () => {
      const response = await request(app)
        .post('/api/stripe/create-checkout-session')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          priceId: 'price_pro_monthly',
          tier: 'pro',
        })
        .expect(200);

      expect(response.body).toHaveProperty('sessionId');
      expect(response.body).toHaveProperty('url');
      expect(response.body.url).toContain('checkout.stripe.com');
    });

    it('should handle webhook for successful payment', async () => {
      const webhookPayload = JSON.stringify({
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

      const response = await request(app)
        .post('/api/stripe/webhook')
        .set('stripe-signature', 'test_signature')
        .send(webhookPayload)
        .expect(200);

      // Verify user subscription was updated
      const [updatedUser] = await db
        .select()
        .from(users)
        .where(eq(users.id, testUserId));

      expect(updatedUser.subscriptionTier).toBe('pro');
      expect(updatedUser.stripeCustomerId).toBe('cus_test_123');
    });

    it('should create billing portal session', async () => {
      // Update user to have Stripe customer ID
      await db
        .update(users)
        .set({ stripeCustomerId: 'cus_test_123' })
        .where(eq(users.id, testUserId));

      const response = await request(app)
        .post('/api/stripe/create-portal-session')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('url');
      expect(response.body.url).toContain('billing.stripe.com');
    });

    it('should enforce plan limits', async () => {
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
        .send({ query: 'test search' })
        .expect(403);

      expect(response.body.error).toContain('limit');
    });
  });

  describe('Onboarding Flow', () => {
    it('should mark onboarding as incomplete for new users', async () => {
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, testUserId));

      expect(user.onboardingCompleted).toBe(false);
    });

    it('should update onboarding status', async () => {
      const response = await request(app)
        .post('/api/user/onboarding/complete')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);

      // Verify database update
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, testUserId));

      expect(user.onboardingCompleted).toBe(true);
    });

    it('should track onboarding progress', async () => {
      const response = await request(app)
        .post('/api/user/onboarding/progress')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          step: 'search_demo',
          completed: true,
        })
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('Search and Export Workflows', () => {
    let searchId: number;

    beforeEach(async () => {
      // Create a test search
      const [search] = await db.insert(searches).values({
        userId: testUserId,
        query: 'sustainable fashion',
        results: JSON.stringify({
          gaps: [
            {
              category: 'market',
              title: 'Eco-friendly packaging',
              description: 'Gap in sustainable packaging solutions',
              confidence: 0.85,
            },
          ],
        }),
      }).returning();

      searchId = search.id;
    });

    it('should perform search with enhanced AI analysis', async () => {
      const response = await request(app)
        .post('/api/search')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ query: 'AI-powered fitness apps' })
        .expect(200);

      expect(response.body).toHaveProperty('gaps');
      expect(Array.isArray(response.body.gaps)).toBe(true);
      
      // Verify categorized gaps
      const gap = response.body.gaps[0];
      expect(gap).toHaveProperty('category');
      expect(gap).toHaveProperty('confidence');
      expect(gap).toHaveProperty('recommendations');
    });

    it('should export search results as PDF', async () => {
      const response = await request(app)
        .post(`/api/export/${searchId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ format: 'pdf' })
        .expect(200);

      expect(response.headers['content-type']).toContain('application/pdf');
    });

    it('should export search results as Excel', async () => {
      const response = await request(app)
        .post(`/api/export/${searchId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ format: 'excel' })
        .expect(200);

      expect(response.headers['content-type']).toContain('spreadsheet');
    });

    it('should export search results as PowerPoint', async () => {
      const response = await request(app)
        .post(`/api/export/${searchId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ format: 'pptx' })
        .expect(200);

      expect(response.headers['content-type']).toContain('presentation');
    });

    it('should cache search results', async () => {
      const query = 'cached search query';

      // First request - should hit AI
      const response1 = await request(app)
        .post('/api/search')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ query })
        .expect(200);

      // Second request - should hit cache
      const response2 = await request(app)
        .post('/api/search')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ query })
        .expect(200);

      expect(response1.body).toEqual(response2.body);
      expect(response2.headers['x-cache']).toBe('HIT');
    });
  });

  describe('Analytics Tracking', () => {
    it('should track search events', async () => {
      await request(app)
        .post('/api/search')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ query: 'test analytics' })
        .expect(200);

      // Verify analytics event was created
      const events = await db
        .select()
        .from(analyticsEvents)
        .where(eq(analyticsEvents.userId, testUserId));

      const searchEvent = events.find(e => e.eventType === 'search');
      expect(searchEvent).toBeDefined();
      expect(searchEvent?.eventData).toHaveProperty('query');
    });

    it('should track export events', async () => {
      // Create a search first
      const [search] = await db.insert(searches).values({
        userId: testUserId,
        query: 'test export',
        results: JSON.stringify({ gaps: [] }),
      }).returning();

      await request(app)
        .post(`/api/export/${search.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ format: 'pdf' })
        .expect(200);

      // Verify analytics event
      const events = await db
        .select()
        .from(analyticsEvents)
        .where(eq(analyticsEvents.userId, testUserId));

      const exportEvent = events.find(e => e.eventType === 'export');
      expect(exportEvent).toBeDefined();
      expect(exportEvent?.eventData).toHaveProperty('format', 'pdf');
    });

    it('should retrieve analytics dashboard data', async () => {
      // Make user an admin
      await db
        .update(users)
        .set({ role: 'admin' })
        .where(eq(users.id, testUserId));

      const response = await request(app)
        .get('/api/analytics/dashboard')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('totalSearches');
      expect(response.body).toHaveProperty('activeUsers');
      expect(response.body).toHaveProperty('popularSearches');
    });
  });

  describe('Search History and Favorites', () => {
    let searchId: number;

    beforeEach(async () => {
      const [search] = await db.insert(searches).values({
        userId: testUserId,
        query: 'test history',
        results: JSON.stringify({ gaps: [] }),
      }).returning();

      searchId = search.id;
    });

    it('should retrieve search history', async () => {
      const response = await request(app)
        .get('/api/search-history')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
      expect(response.body[0]).toHaveProperty('query');
      expect(response.body[0]).toHaveProperty('createdAt');
    });

    it('should mark search as favorite', async () => {
      const response = await request(app)
        .post(`/api/search-history/${searchId}/favorite`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);

      // Verify database update
      const [search] = await db
        .select()
        .from(searches)
        .where(eq(searches.id, searchId));

      expect(search.isFavorite).toBe(true);
    });

    it('should retrieve only favorites', async () => {
      // Mark as favorite
      await db
        .update(searches)
        .set({ isFavorite: true })
        .where(eq(searches.id, searchId));

      const response = await request(app)
        .get('/api/search-history?favorites=true')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.every((s: any) => s.isFavorite)).toBe(true);
    });

    it('should delete search from history', async () => {
      const response = await request(app)
        .delete(`/api/search-history/${searchId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);

      // Verify deletion
      const searches = await db
        .select()
        .from(searches)
        .where(eq(searches.id, searchId));

      expect(searches.length).toBe(0);
    });

    it('should re-run saved search', async () => {
      const response = await request(app)
        .post(`/api/search-history/${searchId}/rerun`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('gaps');
      expect(response.body).toHaveProperty('query', 'test history');
    });
  });

  describe('Error Handling', () => {
    it('should return user-friendly error for invalid search', async () => {
      const response = await request(app)
        .post('/api/search')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ query: '' })
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).not.toContain('undefined');
      expect(response.body.error).not.toContain('null');
    });

    it('should handle network errors gracefully', async () => {
      // Mock network failure
      vi.mock('../../services/gemini', () => ({
        analyzeGaps: vi.fn().mockRejectedValue(new Error('Network error')),
      }));

      const response = await request(app)
        .post('/api/search')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ query: 'test network error' })
        .expect(500);

      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('retryable', true);
    });

    it('should validate export format', async () => {
      const [search] = await db.insert(searches).values({
        userId: testUserId,
        query: 'test',
        results: JSON.stringify({ gaps: [] }),
      }).returning();

      const response = await request(app)
        .post(`/api/export/${search.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ format: 'invalid' })
        .expect(400);

      expect(response.body.error).toContain('format');
    });
  });

  describe('Mobile API Responsiveness', () => {
    it('should return paginated results for mobile', async () => {
      const response = await request(app)
        .get('/api/search-history?page=1&limit=10')
        .set('Authorization', `Bearer ${authToken}`)
        .set('User-Agent', 'Mobile')
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('pagination');
      expect(response.body.pagination).toHaveProperty('page', 1);
      expect(response.body.pagination).toHaveProperty('limit', 10);
    });

    it('should optimize response size for mobile', async () => {
      const response = await request(app)
        .post('/api/search')
        .set('Authorization', `Bearer ${authToken}`)
        .set('User-Agent', 'Mobile')
        .send({ query: 'mobile test', compact: true })
        .expect(200);

      // Verify response is optimized (smaller payload)
      const responseSize = JSON.stringify(response.body).length;
      expect(responseSize).toBeLessThan(50000); // 50KB limit for mobile
    });
  });
});})
;
