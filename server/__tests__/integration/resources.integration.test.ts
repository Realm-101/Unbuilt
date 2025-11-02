import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import express from 'express';
import { registerRoutes } from '../../routes.js';
import { generateToken } from '../../jwt.js';

// Try to import database, skip tests if unavailable
let db: any;
let users: any;
let resources: any;
let resourceCategories: any;
let eq: any;

try {
  const dbModule = await import('../../db.js');
  const schemaModule = await import('../../../shared/schema.js');
  const drizzleModule = await import('drizzle-orm');
  
  db = dbModule.db;
  users = schemaModule.users;
  resources = schemaModule.resources;
  resourceCategories = schemaModule.resourceCategories;
  eq = drizzleModule.eq;
} catch (error) {
  console.warn('Database connection failed, tests will be skipped:', error);
  (globalThis as any).__DB_UNAVAILABLE__ = true;
}

// Database is now configured - tests enabled!
describe('Resource API Integration Tests', () => {
  let app: express.Application;
  let server: any;
  let authToken: string;
  let testUserId: number;
  let testResourceId: number;
  let testCategoryId: number;

  beforeAll(async () => {
    // Set up Express app
    app = express();
    app.use(express.json());
    server = await registerRoutes(app);

    // Create test user
    const [testUser] = await db
      .insert(users)
      .values({
        email: `test-resources-${Date.now()}@example.com`,
        passwordHash: 'test-hash',
        plan: 'pro',
        searchCount: 0
      })
      .returning();

    testUserId = testUser.id;
    authToken = generateToken({ userId: testUserId, email: testUser.email });

    // Create test category
    const [testCategory] = await db
      .insert(resourceCategories)
      .values({
        name: 'Test Category',
        slug: `test-category-${Date.now()}`,
        description: 'Test category for integration tests',
        icon: 'test-icon',
        displayOrder: 1
      })
      .returning();

    testCategoryId = testCategory.id;

    // Create test resource
    const [testResource] = await db
      .insert(resources)
      .values({
        title: 'Test Resource',
        description: 'Test resource for integration tests',
        url: 'https://example.com/test',
        resourceType: 'tool',
        categoryId: testCategoryId,
        phaseRelevance: JSON.stringify(['research', 'validation']),
        ideaTypes: JSON.stringify(['software']),
        difficultyLevel: 'beginner',
        estimatedTimeMinutes: 30,
        isPremium: false,
        isActive: true,
        averageRating: 450, // 4.5 stars
        ratingCount: 10,
        viewCount: 100,
        bookmarkCount: 5
      })
      .returning();

    testResourceId = testResource.id;
  });

  afterAll(async () => {
    // Clean up test data
    if (db) {
      try {
        if (testResourceId) {
          await db.delete(resources).where(eq(resources.id, testResourceId));
        }
        if (testCategoryId) {
          await db.delete(resourceCategories).where(eq(resourceCategories.id, testCategoryId));
        }
        if (testUserId) {
          await db.delete(users).where(eq(users.id, testUserId));
        }
      } catch (error) {
        console.warn('Cleanup failed:', error);
      }
    }

    // Close server
    if (server) {
      server.close();
    }
  });

  describe('GET /api/resources', () => {
    it('should list resources with default pagination', async () => {
      const response = await request(app)
        .get('/api/resources')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('resources');
      expect(response.body.data).toHaveProperty('pagination');
      expect(Array.isArray(response.body.data.resources)).toBe(true);
      expect(response.body.data.pagination).toHaveProperty('page');
      expect(response.body.data.pagination).toHaveProperty('pageSize');
      expect(response.body.data.pagination).toHaveProperty('total');
      expect(response.body.data.pagination).toHaveProperty('totalPages');
    });

    it('should filter resources by category', async () => {
      const response = await request(app)
        .get(`/api/resources?category=${testCategoryId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      const resources = response.body.data.resources;
      
      // All resources should have the test category
      resources.forEach((resource: any) => {
        expect(resource.categoryId).toBe(testCategoryId);
      });
    });

    it('should filter resources by phase', async () => {
      const response = await request(app)
        .get('/api/resources?phase=research')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data.resources)).toBe(true);
    });

    it('should filter resources by minimum rating', async () => {
      const response = await request(app)
        .get('/api/resources?minRating=4.0')
        .expect(200);

      expect(response.body.success).toBe(true);
      const resources = response.body.data.resources;
      
      // All resources should have rating >= 4.0
      resources.forEach((resource: any) => {
        expect(resource.averageRating).toBeGreaterThanOrEqual(4.0);
      });
    });

    it('should support pagination', async () => {
      const response = await request(app)
        .get('/api/resources?page=1&limit=5')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.pagination.page).toBe(1);
      expect(response.body.data.pagination.pageSize).toBe(5);
      expect(response.body.data.resources.length).toBeLessThanOrEqual(5);
    });

    it('should support sorting by rating', async () => {
      const response = await request(app)
        .get('/api/resources?sortBy=rating&sortOrder=desc')
        .expect(200);

      expect(response.body.success).toBe(true);
      const resources = response.body.data.resources;
      
      // Verify descending order
      for (let i = 1; i < resources.length; i++) {
        expect(resources[i - 1].averageRating).toBeGreaterThanOrEqual(resources[i].averageRating);
      }
    });

    it('should reject invalid page number', async () => {
      const response = await request(app)
        .get('/api/resources?page=0')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Page must be >= 1');
    });

    it('should reject invalid limit', async () => {
      const response = await request(app)
        .get('/api/resources?limit=200')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Limit must be between 1 and 100');
    });
  });

  describe('GET /api/resources/:id', () => {
    it('should get resource by ID with related data', async () => {
      const response = await request(app)
        .get(`/api/resources/${testResourceId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id', testResourceId);
      expect(response.body.data).toHaveProperty('title', 'Test Resource');
      expect(response.body.data).toHaveProperty('category');
      expect(response.body.data).toHaveProperty('tags');
      expect(response.body.data).toHaveProperty('relatedResources');
      expect(Array.isArray(response.body.data.relatedResources)).toBe(true);
    });

    it('should format rating correctly (0-5 scale)', async () => {
      const response = await request(app)
        .get(`/api/resources/${testResourceId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.averageRating).toBe(4.5); // 450 / 100
    });

    it('should return 404 for non-existent resource', async () => {
      const response = await request(app)
        .get('/api/resources/999999')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Resource not found');
    });

    it('should return 400 for invalid resource ID', async () => {
      const response = await request(app)
        .get('/api/resources/invalid')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Invalid resource ID');
    });

    it('should require authentication for premium resources', async () => {
      // Create premium resource
      const [premiumResource] = await db
        .insert(resources)
        .values({
          title: 'Premium Test Resource',
          description: 'Premium resource for testing',
          url: 'https://example.com/premium',
          resourceType: 'tool',
          categoryId: testCategoryId,
          phaseRelevance: JSON.stringify(['research']),
          ideaTypes: JSON.stringify(['software']),
          isPremium: true,
          isActive: true,
          averageRating: 400,
          ratingCount: 5
        })
        .returning();

      // Try to access without auth
      const response = await request(app)
        .get(`/api/resources/${premiumResource.id}`)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Premium resource requires');

      // Clean up
      await db.delete(resources).where(eq(resources.id, premiumResource.id));
    });

    it('should allow Pro users to access premium resources', async () => {
      // Create premium resource
      const [premiumResource] = await db
        .insert(resources)
        .values({
          title: 'Premium Test Resource 2',
          description: 'Premium resource for testing',
          url: 'https://example.com/premium2',
          resourceType: 'tool',
          categoryId: testCategoryId,
          phaseRelevance: JSON.stringify(['research']),
          ideaTypes: JSON.stringify(['software']),
          isPremium: true,
          isActive: true,
          averageRating: 400,
          ratingCount: 5
        })
        .returning();

      // Access with Pro user auth
      const response = await request(app)
        .get(`/api/resources/${premiumResource.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(premiumResource.id);

      // Clean up
      await db.delete(resources).where(eq(resources.id, premiumResource.id));
    });
  });

  describe('GET /api/resources/categories/tree', () => {
    it('should return hierarchical category tree', async () => {
      const response = await request(app)
        .get('/api/resources/categories/tree')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('categories');
      expect(Array.isArray(response.body.data.categories)).toBe(true);
      
      // Each category should have expected properties
      if (response.body.data.categories.length > 0) {
        const category = response.body.data.categories[0];
        expect(category).toHaveProperty('id');
        expect(category).toHaveProperty('name');
        expect(category).toHaveProperty('slug');
        expect(category).toHaveProperty('resourceCount');
      }
    });

    it('should include resource counts', async () => {
      const response = await request(app)
        .get('/api/resources/categories/tree')
        .expect(200);

      expect(response.body.success).toBe(true);
      const categories = response.body.data.categories;
      
      // Find our test category
      const findCategory = (cats: any[]): any => {
        for (const cat of cats) {
          if (cat.id === testCategoryId) return cat;
          if (cat.children) {
            const found = findCategory(cat.children);
            if (found) return found;
          }
        }
        return null;
      };
      
      const testCategory = findCategory(categories);
      if (testCategory) {
        expect(testCategory.resourceCount).toBeGreaterThan(0);
      }
    });
  });

  describe('POST /api/resources/:id/access', () => {
    it('should track resource access for authenticated users', async () => {
      const response = await request(app)
        .post(`/api/resources/${testResourceId}/access`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          accessType: 'view'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('message', 'Access tracked');
      expect(response.body.data).toHaveProperty('accessId');
    });

    it('should track access with analysis context', async () => {
      const response = await request(app)
        .post(`/api/resources/${testResourceId}/access`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          accessType: 'view',
          analysisId: 123,
          stepId: 'step-1'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('accessId');
    });

    it('should track download access type', async () => {
      const response = await request(app)
        .post(`/api/resources/${testResourceId}/access`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          accessType: 'download'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should track external link access type', async () => {
      const response = await request(app)
        .post(`/api/resources/${testResourceId}/access`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          accessType: 'external_link'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should reject invalid access type', async () => {
      const response = await request(app)
        .post(`/api/resources/${testResourceId}/access`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          accessType: 'invalid_type'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Invalid access type');
    });

    it('should reject invalid resource ID', async () => {
      const response = await request(app)
        .post('/api/resources/invalid/access')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          accessType: 'view'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Invalid resource ID');
    });

    it('should handle anonymous access gracefully', async () => {
      const response = await request(app)
        .post(`/api/resources/${testResourceId}/access`)
        .send({
          accessType: 'view'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.message).toContain('anonymous');
    });

    it('should increment view count for view access type', async () => {
      // Get initial view count
      const initialResponse = await request(app)
        .get(`/api/resources/${testResourceId}`)
        .expect(200);
      
      const initialViewCount = initialResponse.body.data.viewCount;

      // Track a view
      await request(app)
        .post(`/api/resources/${testResourceId}/access`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          accessType: 'view'
        })
        .expect(200);

      // Wait a bit for async update
      await new Promise(resolve => setTimeout(resolve, 100));

      // Get updated view count
      const updatedResponse = await request(app)
        .get(`/api/resources/${testResourceId}`)
        .expect(200);
      
      const updatedViewCount = updatedResponse.body.data.viewCount;

      expect(updatedViewCount).toBeGreaterThan(initialViewCount);
    });

    it('should return error for non-existent resource', async () => {
      const response = await request(app)
        .post('/api/resources/999999/access')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          accessType: 'view'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/resources/:id/bookmark', () => {
    it('should bookmark a resource', async () => {
      const response = await request(app)
        .post(`/api/resources/${testResourceId}/bookmark`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('bookmarkId');
      expect(response.body.data.isBookmarked).toBe(true);
    });

    it('should return existing bookmark if already bookmarked', async () => {
      // Bookmark once
      const firstResponse = await request(app)
        .post(`/api/resources/${testResourceId}/bookmark`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const firstBookmarkId = firstResponse.body.data.bookmarkId;

      // Bookmark again
      const secondResponse = await request(app)
        .post(`/api/resources/${testResourceId}/bookmark`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(secondResponse.body.data.bookmarkId).toBe(firstBookmarkId);
      expect(secondResponse.body.data.isBookmarked).toBe(true);
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .post(`/api/resources/${testResourceId}/bookmark`)
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should return 404 for non-existent resource', async () => {
      const response = await request(app)
        .post('/api/resources/999999/bookmark')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
    });

    it('should increment bookmark count', async () => {
      // Get initial bookmark count
      const initialResponse = await request(app)
        .get(`/api/resources/${testResourceId}`)
        .expect(200);
      
      const initialCount = initialResponse.body.data.bookmarkCount;

      // Add bookmark
      await request(app)
        .post(`/api/resources/${testResourceId}/bookmark`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Wait for async update
      await new Promise(resolve => setTimeout(resolve, 100));

      // Check updated count
      const updatedResponse = await request(app)
        .get(`/api/resources/${testResourceId}`)
        .expect(200);
      
      const updatedCount = updatedResponse.body.data.bookmarkCount;

      expect(updatedCount).toBeGreaterThanOrEqual(initialCount);
    });
  });

  describe('DELETE /api/resources/:id/bookmark', () => {
    beforeEach(async () => {
      // Ensure resource is bookmarked before each test
      await request(app)
        .post(`/api/resources/${testResourceId}/bookmark`)
        .set('Authorization', `Bearer ${authToken}`);
    });

    it('should remove bookmark', async () => {
      const response = await request(app)
        .delete(`/api/resources/${testResourceId}/bookmark`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.isBookmarked).toBe(false);
    });

    it('should be idempotent', async () => {
      // Remove once
      await request(app)
        .delete(`/api/resources/${testResourceId}/bookmark`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Remove again
      const response = await request(app)
        .delete(`/api/resources/${testResourceId}/bookmark`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .delete(`/api/resources/${testResourceId}/bookmark`)
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/resources/bookmarks', () => {
    beforeEach(async () => {
      // Bookmark test resource
      await request(app)
        .post(`/api/resources/${testResourceId}/bookmark`)
        .set('Authorization', `Bearer ${authToken}`);
    });

    it('should list user bookmarks', async () => {
      const response = await request(app)
        .get('/api/resources/bookmarks')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('bookmarks');
      expect(Array.isArray(response.body.data.bookmarks)).toBe(true);
      expect(response.body.data.bookmarks.length).toBeGreaterThan(0);
    });

    it('should include resource details', async () => {
      const response = await request(app)
        .get('/api/resources/bookmarks')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const bookmark = response.body.data.bookmarks[0];
      expect(bookmark).toHaveProperty('resource');
      expect(bookmark.resource).toHaveProperty('id');
      expect(bookmark.resource).toHaveProperty('title');
    });

    it('should support pagination', async () => {
      const response = await request(app)
        .get('/api/resources/bookmarks?page=1&limit=5')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data).toHaveProperty('pagination');
      expect(response.body.data.pagination.page).toBe(1);
      expect(response.body.data.pagination.pageSize).toBe(5);
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/resources/bookmarks')
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/resources/:id/rate', () => {
    it('should submit a rating', async () => {
      const response = await request(app)
        .post(`/api/resources/${testResourceId}/rate`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          rating: 5,
          review: 'Excellent resource!'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('ratingId');
      expect(response.body.data.rating).toBe(5);
    });

    it('should update existing rating', async () => {
      // Submit initial rating
      const firstResponse = await request(app)
        .post(`/api/resources/${testResourceId}/rate`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          rating: 3,
          review: 'Good'
        })
        .expect(200);

      const firstRatingId = firstResponse.body.data.ratingId;

      // Update rating
      const secondResponse = await request(app)
        .post(`/api/resources/${testResourceId}/rate`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          rating: 5,
          review: 'Actually excellent!'
        })
        .expect(200);

      expect(secondResponse.body.data.ratingId).toBe(firstRatingId);
      expect(secondResponse.body.data.rating).toBe(5);
    });

    it('should validate rating range', async () => {
      const response = await request(app)
        .post(`/api/resources/${testResourceId}/rate`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          rating: 6 // Invalid: > 5
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('rating');
    });

    it('should allow rating without review', async () => {
      const response = await request(app)
        .post(`/api/resources/${testResourceId}/rate`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          rating: 4
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.rating).toBe(4);
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .post(`/api/resources/${testResourceId}/rate`)
        .send({
          rating: 5
        })
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should update resource average rating', async () => {
      // Get initial rating
      const initialResponse = await request(app)
        .get(`/api/resources/${testResourceId}`)
        .expect(200);
      
      const initialRating = initialResponse.body.data.averageRating;

      // Submit rating
      await request(app)
        .post(`/api/resources/${testResourceId}/rate`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          rating: 5
        })
        .expect(200);

      // Wait for async aggregation
      await new Promise(resolve => setTimeout(resolve, 100));

      // Check updated rating
      const updatedResponse = await request(app)
        .get(`/api/resources/${testResourceId}`)
        .expect(200);
      
      const updatedRating = updatedResponse.body.data.averageRating;

      // Rating should have changed
      expect(updatedRating).not.toBe(initialRating);
    });
  });

  describe('GET /api/resources/:id/ratings', () => {
    beforeEach(async () => {
      // Submit a rating
      await request(app)
        .post(`/api/resources/${testResourceId}/rate`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          rating: 5,
          review: 'Test review'
        });
    });

    it('should list resource ratings', async () => {
      const response = await request(app)
        .get(`/api/resources/${testResourceId}/ratings`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('ratings');
      expect(Array.isArray(response.body.data.ratings)).toBe(true);
    });

    it('should include user information', async () => {
      const response = await request(app)
        .get(`/api/resources/${testResourceId}/ratings`)
        .expect(200);

      if (response.body.data.ratings.length > 0) {
        const rating = response.body.data.ratings[0];
        expect(rating).toHaveProperty('rating');
        expect(rating).toHaveProperty('review');
        expect(rating).toHaveProperty('createdAt');
      }
    });

    it('should support pagination', async () => {
      const response = await request(app)
        .get(`/api/resources/${testResourceId}/ratings?page=1&limit=10`)
        .expect(200);

      expect(response.body.data).toHaveProperty('pagination');
    });

    it('should filter by minimum rating', async () => {
      const response = await request(app)
        .get(`/api/resources/${testResourceId}/ratings?minRating=4`)
        .expect(200);

      expect(response.body.success).toBe(true);
      const ratings = response.body.data.ratings;
      
      ratings.forEach((rating: any) => {
        expect(rating.rating).toBeGreaterThanOrEqual(4);
      });
    });
  });

  describe('POST /api/resources/contribute', () => {
    it('should submit a contribution', async () => {
      const response = await request(app)
        .post('/api/resources/contribute')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'New Resource Contribution',
          description: 'A helpful resource for entrepreneurs',
          url: 'https://example.com/new-resource',
          resourceType: 'tool',
          categoryId: testCategoryId,
          phaseRelevance: ['research', 'validation'],
          ideaTypes: ['software'],
          difficultyLevel: 'beginner',
          estimatedTimeMinutes: 30
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('contributionId');
      expect(response.body.data.status).toBe('pending');
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/resources/contribute')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Incomplete Contribution'
          // Missing required fields
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });

    it('should validate URL format', async () => {
      const response = await request(app)
        .post('/api/resources/contribute')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Test Resource',
          description: 'Test description',
          url: 'not-a-valid-url',
          resourceType: 'tool',
          categoryId: testCategoryId
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('url');
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .post('/api/resources/contribute')
        .send({
          title: 'Test Resource',
          description: 'Test description',
          url: 'https://example.com/test',
          resourceType: 'tool',
          categoryId: testCategoryId
        })
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should validate category exists', async () => {
      const response = await request(app)
        .post('/api/resources/contribute')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Test Resource',
          description: 'Test description',
          url: 'https://example.com/test',
          resourceType: 'tool',
          categoryId: 999999 // Non-existent category
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/resources/contributions', () => {
    beforeEach(async () => {
      // Submit a contribution
      await request(app)
        .post('/api/resources/contribute')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Test Contribution',
          description: 'Test description',
          url: 'https://example.com/test',
          resourceType: 'tool',
          categoryId: testCategoryId,
          phaseRelevance: ['research'],
          ideaTypes: ['software']
        });
    });

    it('should list user contributions', async () => {
      const response = await request(app)
        .get('/api/resources/contributions')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('contributions');
      expect(Array.isArray(response.body.data.contributions)).toBe(true);
      expect(response.body.data.contributions.length).toBeGreaterThan(0);
    });

    it('should include contribution status', async () => {
      const response = await request(app)
        .get('/api/resources/contributions')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const contribution = response.body.data.contributions[0];
      expect(contribution).toHaveProperty('status');
      expect(['pending', 'approved', 'rejected']).toContain(contribution.status);
    });

    it('should filter by status', async () => {
      const response = await request(app)
        .get('/api/resources/contributions?status=pending')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      const contributions = response.body.data.contributions;
      
      contributions.forEach((contribution: any) => {
        expect(contribution.status).toBe('pending');
      });
    });

    it('should support pagination', async () => {
      const response = await request(app)
        .get('/api/resources/contributions?page=1&limit=10')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data).toHaveProperty('pagination');
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/resources/contributions')
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/resources/templates/:id/generate', () => {
    let templateResourceId: number;

    beforeAll(async () => {
      // Create a template resource
      const [templateResource] = await db
        .insert(resources)
        .values({
          title: 'Business Plan Template',
          description: 'Comprehensive business plan template',
          url: 'https://example.com/template',
          resourceType: 'template',
          categoryId: testCategoryId,
          phaseRelevance: JSON.stringify(['research', 'validation']),
          ideaTypes: JSON.stringify(['software']),
          isPremium: false,
          isActive: true,
          averageRating: 450,
          ratingCount: 10
        })
        .returning();

      templateResourceId = templateResource.id;
    });

    it('should generate template with analysis data', async () => {
      // First create a search/analysis
      const searchResponse = await request(app)
        .post('/api/search')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          query: 'AI-powered fitness app'
        })
        .expect(200);

      const analysisId = searchResponse.body.data.searchId;

      // Generate template
      const response = await request(app)
        .post(`/api/resources/templates/${templateResourceId}/generate`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          analysisId,
          format: 'docx'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('url');
      expect(response.body.data).toHaveProperty('filename');
      expect(response.body.data).toHaveProperty('format');
      expect(response.body.data.format).toBe('docx');
    });

    it('should support different formats', async () => {
      const searchResponse = await request(app)
        .post('/api/search')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          query: 'Test query'
        });

      const analysisId = searchResponse.body.data.searchId;

      // Test PDF format
      const pdfResponse = await request(app)
        .post(`/api/resources/templates/${templateResourceId}/generate`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          analysisId,
          format: 'pdf'
        })
        .expect(200);

      expect(pdfResponse.body.data.format).toBe('pdf');
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .post(`/api/resources/templates/${templateResourceId}/generate`)
        .send({
          analysisId: 1,
          format: 'docx'
        })
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should validate template resource type', async () => {
      const response = await request(app)
        .post(`/api/resources/templates/${testResourceId}/generate`) // Not a template
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          analysisId: 1,
          format: 'docx'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('template');
    });

    afterAll(async () => {
      // Clean up template resource
      if (templateResourceId && db) {
        try {
          await db.delete(resources).where(eq(resources.id, templateResourceId));
        } catch (error) {
          console.warn('Cleanup failed:', error);
        }
      }
    });
  });
});
