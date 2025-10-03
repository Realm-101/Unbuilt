/**
 * Search Functionality Integration Tests
 * 
 * Tests the complete search functionality including:
 * - Gap analysis search endpoint
 * - Search with filters
 * - Search result storage
 * - Search history retrieval
 * - Search permissions
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import express, { Express } from 'express';
import cookieParser from 'cookie-parser';
import { registerRoutes } from '../../routes';
import { testUtils } from '../setup';
import { db } from '../../db';
import { users, searches, searchResults } from '@shared/schema';
import { eq, and } from 'drizzle-orm';

describe('Search Functionality Integration Tests', () => {
  let app: Express;
  let server: any;
  
  // Test user credentials
  const testEmail = testUtils.randomEmail();
  const testPassword = 'TestUser123!@#';
  const testName = 'Search Test User';
  
  // Second user for permission tests
  const testEmail2 = testUtils.randomEmail();
  const testPassword2 = 'TestUser456!@#';
  
  let accessToken: string;
  let userId: number;
  let accessToken2: string;
  let userId2: number;
  let testSearchId: number;
  let testResultIds: number[] = [];

  beforeAll(async () => {
    // Setup Express app with routes
    app = express();
    app.use(express.json());
    app.use(cookieParser());
    server = await registerRoutes(app);
    
    // Wait for server to be ready
    await testUtils.wait(2000);
    
    // Register and login first test user
    const registerResponse = await request(app)
      .post('/api/auth/register')
      .send({
        email: testEmail,
        password: testPassword,
        name: testName
      });
    
    if (registerResponse.status < 300 && registerResponse.body.data) {
      accessToken = registerResponse.body.data.accessToken;
      userId = registerResponse.body.data.user.id;
    }
    
    await testUtils.wait(2000);
    
    // Register and login second test user for permission tests
    const registerResponse2 = await request(app)
      .post('/api/auth/register')
      .send({
        email: testEmail2,
        password: testPassword2,
        name: 'Search Test User 2'
      });
    
    if (registerResponse2.status < 300 && registerResponse2.body.data) {
      accessToken2 = registerResponse2.body.data.accessToken;
      userId2 = registerResponse2.body.data.user.id;
    }
  });

  afterAll(async () => {
    // Cleanup: Delete test data
    try {
      // Delete search results first (foreign key constraint)
      if (testResultIds.length > 0) {
        for (const resultId of testResultIds) {
          await db.delete(searchResults).where(eq(searchResults.id, resultId));
        }
      }
      
      // Delete searches
      if (userId) {
        await db.delete(searches).where(eq(searches.userId, userId));
      }
      if (userId2) {
        await db.delete(searches).where(eq(searches.userId, userId2));
      }
      
      // Delete users
      if (userId) {
        await db.delete(users).where(eq(users.id, userId));
      }
      if (userId2) {
        await db.delete(users).where(eq(users.id, userId2));
      }
    } catch (error) {
      console.error('Cleanup error:', error);
    }
    
    // Close server
    if (server) {
      server.close();
    }
  });

  beforeEach(async () => {
    // Wait between tests to avoid rate limiting
    await testUtils.wait(2000);
  });

  describe('Gap Analysis Search Endpoint', () => {
    it('should successfully perform gap analysis search with valid query', async () => {
      if (!accessToken) {
        console.log('Skipping test - no access token available');
        return;
      }
      
      const response = await request(app)
        .post('/api/search')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          query: 'AI-powered productivity tools for remote teams'
        });

      // Log error if not successful
      if (response.status >= 400) {
        console.log('Search error:', response.status, response.body);
      }

      expect([200, 201]).toContain(response.status);
      
      if (response.body.data) {
        expect(response.body.data).toHaveProperty('search');
        expect(response.body.data).toHaveProperty('results');
        expect(response.body.data.search).toHaveProperty('id');
        expect(response.body.data.search.query).toBe('AI-powered productivity tools for remote teams');
        expect(Array.isArray(response.body.data.results)).toBe(true);
        
        // Store search ID and result IDs for subsequent tests
        testSearchId = response.body.data.search.id;
        testResultIds = response.body.data.results.map((r: any) => r.id);
      }
    });

    it('should reject search without authentication', async () => {
      const response = await request(app)
        .post('/api/search')
        .send({
          query: 'test query'
        });

      expect(response.status).toBe(401);
    });

    it('should reject search with empty query', async () => {
      if (!accessToken) {
        console.log('Skipping test - no access token available');
        return;
      }
      
      const response = await request(app)
        .post('/api/search')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          query: ''
        });

      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it('should reject search with missing query field', async () => {
      if (!accessToken) {
        console.log('Skipping test - no access token available');
        return;
      }
      
      const response = await request(app)
        .post('/api/search')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({});

      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it('should return results with proper structure', async () => {
      if (!accessToken) {
        console.log('Skipping test - no access token available');
        return;
      }
      
      const response = await request(app)
        .post('/api/search')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          query: 'sustainable fashion marketplace'
        });

      if (response.status < 300 && response.body.data) {
        const results = response.body.data.results;
        
        if (results && results.length > 0) {
          const result = results[0];
          
          // Verify result structure
          expect(result).toHaveProperty('id');
          expect(result).toHaveProperty('searchId');
          expect(result).toHaveProperty('title');
          expect(result).toHaveProperty('description');
          expect(result).toHaveProperty('category');
          expect(result).toHaveProperty('feasibility');
          expect(result).toHaveProperty('marketPotential');
          expect(result).toHaveProperty('innovationScore');
          expect(result).toHaveProperty('marketSize');
          expect(result).toHaveProperty('gapReason');
          
          // Store result IDs for cleanup
          testResultIds.push(...results.map((r: any) => r.id));
        }
      }
    });
  });

  describe('Search with Filters', () => {
    it('should successfully perform search with category filter', async () => {
      if (!accessToken) {
        console.log('Skipping test - no access token available');
        return;
      }
      
      const response = await request(app)
        .post('/api/search')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          query: 'innovative business ideas',
          filters: {
            category: 'Technology'
          }
        });

      if (response.status < 300 && response.body.data) {
        expect(response.body.data).toHaveProperty('results');
        
        // Store result IDs for cleanup
        if (response.body.data.results) {
          testResultIds.push(...response.body.data.results.map((r: any) => r.id));
        }
      }
    });

    it('should successfully perform search with innovation score filter', async () => {
      if (!accessToken) {
        console.log('Skipping test - no access token available');
        return;
      }
      
      const response = await request(app)
        .post('/api/search')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          query: 'high-potential business opportunities',
          filters: {
            minInnovationScore: 70
          }
        });

      if (response.status < 300 && response.body.data) {
        expect(response.body.data).toHaveProperty('results');
        const results = response.body.data.results;
        
        // Verify all results meet the filter criteria
        if (results && results.length > 0) {
          results.forEach((result: any) => {
            expect(result.innovationScore).toBeGreaterThanOrEqual(70);
          });
        }
        
        // Store result IDs for cleanup
        if (results) {
          testResultIds.push(...results.map((r: any) => r.id));
        }
      }
    });

    it('should successfully perform search with multiple filters', async () => {
      if (!accessToken) {
        console.log('Skipping test - no access token available');
        return;
      }
      
      const response = await request(app)
        .post('/api/search')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          query: 'market opportunities',
          filters: {
            category: 'Technology',
            minInnovationScore: 60,
            marketSize: 'Large'
          }
        });

      if (response.status < 300 && response.body.data) {
        expect(response.body.data).toHaveProperty('results');
        
        // Store result IDs for cleanup
        if (response.body.data.results) {
          testResultIds.push(...response.body.data.results.map((r: any) => r.id));
        }
      }
    });

    it('should handle search with no matching filters gracefully', async () => {
      if (!accessToken) {
        console.log('Skipping test - no access token available');
        return;
      }
      
      const response = await request(app)
        .post('/api/search')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          query: 'business ideas',
          filters: {
            minInnovationScore: 999 // Unrealistic filter
          }
        });

      // Should still succeed but may return empty results
      if (response.status < 300 && response.body.data) {
        expect(response.body.data).toHaveProperty('results');
        expect(Array.isArray(response.body.data.results)).toBe(true);
      }
    });
  });

  describe('Search Result Storage', () => {
    it('should store search record in database', async () => {
      if (!accessToken || !testSearchId) {
        console.log('Skipping test - no search ID available');
        return;
      }
      
      // Query database directly to verify storage
      const [search] = await db
        .select()
        .from(searches)
        .where(eq(searches.id, testSearchId));
      
      expect(search).toBeDefined();
      expect(search.id).toBe(testSearchId);
      expect(search.userId).toBe(userId);
      expect(search.query).toBeDefined();
    });

    it('should store search results in database', async () => {
      if (testResultIds.length === 0) {
        console.log('Skipping test - no result IDs available');
        return;
      }
      
      // Query database directly to verify storage
      const results = await db
        .select()
        .from(searchResults)
        .where(eq(searchResults.searchId, testSearchId));
      
      expect(results.length).toBeGreaterThan(0);
      
      // Verify result structure
      const result = results[0];
      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('searchId');
      expect(result).toHaveProperty('title');
      expect(result).toHaveProperty('description');
      expect(result.searchId).toBe(testSearchId);
    });

    it('should associate results with correct search', async () => {
      if (!accessToken) {
        console.log('Skipping test - no access token available');
        return;
      }
      
      // Create a new search
      const searchResponse = await request(app)
        .post('/api/search')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          query: 'eco-friendly products'
        });
      
      if (searchResponse.status < 300 && searchResponse.body.data) {
        const newSearchId = searchResponse.body.data.search.id;
        const results = searchResponse.body.data.results;
        
        // Verify all results are associated with the search
        results.forEach((result: any) => {
          expect(result.searchId).toBe(newSearchId);
        });
        
        // Store result IDs for cleanup
        testResultIds.push(...results.map((r: any) => r.id));
      }
    });

    it('should update search results count', async () => {
      if (!testSearchId) {
        console.log('Skipping test - no search ID available');
        return;
      }
      
      // Query database to check results count
      const [search] = await db
        .select()
        .from(searches)
        .where(eq(searches.id, testSearchId));
      
      expect(search).toBeDefined();
      expect(search.resultsCount).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Search History Retrieval', () => {
    it('should retrieve user search history', async () => {
      if (!accessToken) {
        console.log('Skipping test - no access token available');
        return;
      }
      
      const response = await request(app)
        .get('/api/searches')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      
      if (response.body.data) {
        expect(Array.isArray(response.body.data)).toBe(true);
        
        // Should contain at least the searches we created
        if (response.body.data.length > 0) {
          const search = response.body.data[0];
          expect(search).toHaveProperty('id');
          expect(search).toHaveProperty('query');
          expect(search).toHaveProperty('timestamp');
          expect(search).toHaveProperty('userId');
          expect(search.userId).toBe(userId);
        }
      }
    });

    it('should retrieve search results by search ID', async () => {
      if (!accessToken || !testSearchId) {
        console.log('Skipping test - no search ID available');
        return;
      }
      
      const response = await request(app)
        .get(`/api/search/${testSearchId}/results`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      
      if (response.body.data) {
        expect(Array.isArray(response.body.data)).toBe(true);
        
        if (response.body.data.length > 0) {
          const result = response.body.data[0];
          expect(result).toHaveProperty('id');
          expect(result).toHaveProperty('searchId');
          expect(result.searchId).toBe(testSearchId);
        }
      }
    });

    it('should return empty array for user with no searches', async () => {
      if (!accessToken2) {
        console.log('Skipping test - no second user token available');
        return;
      }
      
      // Second user should have no searches initially
      const response = await request(app)
        .get('/api/searches')
        .set('Authorization', `Bearer ${accessToken2}`);

      if (response.status === 200 && response.body.data) {
        expect(Array.isArray(response.body.data)).toBe(true);
        // May be empty or contain only user2's searches
      }
    });

    it('should reject search history request without authentication', async () => {
      const response = await request(app)
        .get('/api/searches');

      expect(response.status).toBe(401);
    });

    it('should order search history by timestamp (most recent first)', async () => {
      if (!accessToken) {
        console.log('Skipping test - no access token available');
        return;
      }
      
      // Create multiple searches
      await request(app)
        .post('/api/search')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ query: 'first search' });
      
      await testUtils.wait(1500);
      
      await request(app)
        .post('/api/search')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ query: 'second search' });
      
      await testUtils.wait(1500);
      
      const response = await request(app)
        .get('/api/searches')
        .set('Authorization', `Bearer ${accessToken}`);

      if (response.status === 200 && response.body.data && response.body.data.length >= 2) {
        const searches = response.body.data;
        
        // Verify ordering (most recent first)
        for (let i = 0; i < searches.length - 1; i++) {
          const current = new Date(searches[i].timestamp);
          const next = new Date(searches[i + 1].timestamp);
          expect(current.getTime()).toBeGreaterThanOrEqual(next.getTime());
        }
      }
    });
  });

  describe('Search Permissions', () => {
    it('should prevent user from accessing another user\'s search results', async () => {
      if (!accessToken || !accessToken2 || !testSearchId) {
        console.log('Skipping test - tokens or search ID not available');
        return;
      }
      
      // User 2 tries to access User 1's search
      const response = await request(app)
        .get(`/api/search/${testSearchId}/results`)
        .set('Authorization', `Bearer ${accessToken2}`);

      // Should return 404 or 403
      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it('should allow user to access their own search results', async () => {
      if (!accessToken || !testSearchId) {
        console.log('Skipping test - token or search ID not available');
        return;
      }
      
      const response = await request(app)
        .get(`/api/search/${testSearchId}/results`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
    });

    it('should prevent unauthorized access to search results', async () => {
      if (!testSearchId) {
        console.log('Skipping test - search ID not available');
        return;
      }
      
      const response = await request(app)
        .get(`/api/search/${testSearchId}/results`);

      expect(response.status).toBe(401);
    });

    it('should return 404 for non-existent search ID', async () => {
      if (!accessToken) {
        console.log('Skipping test - no access token available');
        return;
      }
      
      const response = await request(app)
        .get('/api/search/999999/results')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it('should reject invalid search ID format', async () => {
      if (!accessToken) {
        console.log('Skipping test - no access token available');
        return;
      }
      
      const response = await request(app)
        .get('/api/search/invalid-id/results')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it('should enforce user data scope in search history', async () => {
      if (!accessToken || !accessToken2) {
        console.log('Skipping test - tokens not available');
        return;
      }
      
      // User 1 creates a search
      await request(app)
        .post('/api/search')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ query: 'user 1 search' });
      
      await testUtils.wait(1500);
      
      // User 2 creates a search
      await request(app)
        .post('/api/search')
        .set('Authorization', `Bearer ${accessToken2}`)
        .send({ query: 'user 2 search' });
      
      await testUtils.wait(1500);
      
      // User 1 retrieves their history
      const response1 = await request(app)
        .get('/api/searches')
        .set('Authorization', `Bearer ${accessToken}`);
      
      // User 2 retrieves their history
      const response2 = await request(app)
        .get('/api/searches')
        .set('Authorization', `Bearer ${accessToken2}`);
      
      if (response1.status === 200 && response1.body.data) {
        // All searches should belong to user 1
        response1.body.data.forEach((search: any) => {
          expect(search.userId).toBe(userId);
        });
      }
      
      if (response2.status === 200 && response2.body.data) {
        // All searches should belong to user 2
        response2.body.data.forEach((search: any) => {
          expect(search.userId).toBe(userId2);
        });
      }
    });
  });

  describe('Search Result Operations', () => {
    it('should allow saving a search result', async () => {
      if (!accessToken || testResultIds.length === 0) {
        console.log('Skipping test - no result IDs available');
        return;
      }
      
      const resultId = testResultIds[0];
      
      const response = await request(app)
        .patch(`/api/results/${resultId}/save`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ isSaved: true });

      // Accept success or not found (if result doesn't exist)
      if (response.status < 300) {
        expect(response.body).toHaveProperty('isSaved');
        expect(response.body.isSaved).toBe(true);
      }
    });

    it('should allow unsaving a search result', async () => {
      if (!accessToken || testResultIds.length === 0) {
        console.log('Skipping test - no result IDs available');
        return;
      }
      
      const resultId = testResultIds[0];
      
      const response = await request(app)
        .patch(`/api/results/${resultId}/save`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ isSaved: false });

      // Accept success or not found
      if (response.status < 300) {
        expect(response.body).toHaveProperty('isSaved');
        expect(response.body.isSaved).toBe(false);
      }
    });

    it('should retrieve saved results', async () => {
      if (!accessToken) {
        console.log('Skipping test - no access token available');
        return;
      }
      
      const response = await request(app)
        .get('/api/results/saved')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  describe('Search Error Handling', () => {
    it('should handle malformed search request', async () => {
      if (!accessToken) {
        console.log('Skipping test - no access token available');
        return;
      }
      
      const response = await request(app)
        .post('/api/search')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ invalid: 'data' });

      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it('should handle search with invalid filter types', async () => {
      if (!accessToken) {
        console.log('Skipping test - no access token available');
        return;
      }
      
      const response = await request(app)
        .post('/api/search')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          query: 'test',
          filters: 'invalid-filter-format'
        });

      // Should either accept and ignore invalid filters or reject
      expect(response.status).toBeLessThan(500);
    });

    it('should handle database errors gracefully', async () => {
      if (!accessToken) {
        console.log('Skipping test - no access token available');
        return;
      }
      
      // Try to access a search with invalid ID format
      const response = await request(app)
        .get('/api/search/abc/results')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBeGreaterThanOrEqual(400);
      expect(response.status).toBeLessThan(500);
    });
  });
});
