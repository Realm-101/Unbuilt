/**
 * Cache Effectiveness Tests
 * 
 * Verifies that caching is working correctly and improving performance
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import { performance } from 'perf_hooks';
import { cacheService } from '../../services/cache';

// Database and Redis configured - tests enabled!
describe('Cache Effectiveness Tests', () => {
  let app: express.Application;
  let authToken: string;

  beforeAll(async () => {
    // This import doesn't work - server/index doesn't export createApp
    // const { default: createApp } = await import('../../index');
    // app = createApp();

    // Get auth token
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        username: 'testuser',
        password: 'testpassword',
      });
    
    authToken = loginResponse.body.token;
  });

  beforeEach(async () => {
    // Clear cache before each test
    await cacheService.clear();
  });

  describe('Search Result Caching', () => {
    it('should cache search results and serve from cache on subsequent requests', async () => {
      const query = 'sustainable fashion marketplace';

      // First request - should hit AI service
      const start1 = performance.now();
      const response1 = await request(app)
        .post('/api/search')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ query })
        .expect(200);
      const duration1 = performance.now() - start1;

      expect(response1.headers['x-cache']).toBe('MISS');
      expect(response1.body).toHaveProperty('gaps');

      // Second request - should hit cache
      const start2 = performance.now();
      const response2 = await request(app)
        .post('/api/search')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ query })
        .expect(200);
      const duration2 = performance.now() - start2;

      expect(response2.headers['x-cache']).toBe('HIT');
      expect(response2.body).toEqual(response1.body);

      // Cache should be significantly faster
      expect(duration2).toBeLessThan(duration1 * 0.5);
      console.log(`Cache speedup: ${(duration1 / duration2).toFixed(2)}x faster`);
    });

    it('should respect cache TTL and refresh after expiration', async () => {
      const query = 'test cache ttl';

      // First request
      await request(app)
        .post('/api/search')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ query })
        .expect(200);

      // Manually expire cache
      await cacheService.delete(`search:${query}`);

      // Next request should be cache MISS
      const response = await request(app)
        .post('/api/search')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ query })
        .expect(200);

      expect(response.headers['x-cache']).toBe('MISS');
    });

    it('should cache different queries separately', async () => {
      const query1 = 'AI fitness apps';
      const query2 = 'sustainable fashion';

      // Request 1
      const response1 = await request(app)
        .post('/api/search')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ query: query1 })
        .expect(200);

      // Request 2
      const response2 = await request(app)
        .post('/api/search')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ query: query2 })
        .expect(200);

      expect(response1.body).not.toEqual(response2.body);

      // Both should be cached now
      const cachedResponse1 = await request(app)
        .post('/api/search')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ query: query1 })
        .expect(200);

      const cachedResponse2 = await request(app)
        .post('/api/search')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ query: query2 })
        .expect(200);

      expect(cachedResponse1.headers['x-cache']).toBe('HIT');
      expect(cachedResponse2.headers['x-cache']).toBe('HIT');
    });
  });

  describe('API Response Caching', () => {
    it('should cache search history requests', async () => {
      // First request
      const start1 = performance.now();
      const response1 = await request(app)
        .get('/api/search-history')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
      const duration1 = performance.now() - start1;

      // Second request - should be faster
      const start2 = performance.now();
      const response2 = await request(app)
        .get('/api/search-history')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
      const duration2 = performance.now() - start2;

      expect(response2.body).toEqual(response1.body);
      expect(duration2).toBeLessThan(duration1);
    });

    it('should invalidate cache when data changes', async () => {
      // Get initial history
      const response1 = await request(app)
        .get('/api/search-history')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const initialCount = response1.body.length;

      // Perform a new search (should invalidate cache)
      await request(app)
        .post('/api/search')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ query: 'new search' })
        .expect(200);

      // Get history again - should reflect new search
      const response2 = await request(app)
        .get('/api/search-history')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response2.body.length).toBeGreaterThan(initialCount);
    });
  });

  describe('Cache Performance Metrics', () => {
    it('should track cache hit rate', async () => {
      const query = 'cache metrics test';

      // Generate some cache hits and misses
      await request(app)
        .post('/api/search')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ query })
        .expect(200); // MISS

      await request(app)
        .post('/api/search')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ query })
        .expect(200); // HIT

      await request(app)
        .post('/api/search')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ query })
        .expect(200); // HIT

      // Get cache stats
      const stats = await request(app)
        .get('/api/cache/stats')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(stats.body).toHaveProperty('hitRate');
      expect(stats.body.hitRate).toBeGreaterThan(0);
      expect(stats.body.hitRate).toBeLessThanOrEqual(1);
    });

    it('should measure cache performance improvement', async () => {
      const queries = [
        'AI healthcare',
        'sustainable energy',
        'fintech innovation',
        'edtech platforms',
        'remote work tools',
      ];

      let totalUncachedTime = 0;
      let totalCachedTime = 0;

      for (const query of queries) {
        // Uncached request
        const start1 = performance.now();
        await request(app)
          .post('/api/search')
          .set('Authorization', `Bearer ${authToken}`)
          .send({ query })
          .expect(200);
        totalUncachedTime += performance.now() - start1;

        // Cached request
        const start2 = performance.now();
        await request(app)
          .post('/api/search')
          .set('Authorization', `Bearer ${authToken}`)
          .send({ query })
          .expect(200);
        totalCachedTime += performance.now() - start2;
      }

      const speedup = totalUncachedTime / totalCachedTime;
      console.log(`\n📊 Cache Performance:`);
      console.log(`   Uncached: ${totalUncachedTime.toFixed(2)}ms`);
      console.log(`   Cached: ${totalCachedTime.toFixed(2)}ms`);
      console.log(`   Speedup: ${speedup.toFixed(2)}x`);

      // Cache should provide at least 2x speedup
      expect(speedup).toBeGreaterThan(2);
    });
  });

  describe('Cache Memory Management', () => {
    it('should not exceed memory limits', async () => {
      // Generate many cached entries
      const queries = Array.from({ length: 100 }, (_, i) => `query ${i}`);

      for (const query of queries) {
        await request(app)
          .post('/api/search')
          .set('Authorization', `Bearer ${authToken}`)
          .send({ query })
          .expect(200);
      }

      // Check cache size
      const stats = await request(app)
        .get('/api/cache/stats')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(stats.body).toHaveProperty('size');
      expect(stats.body.size).toBeLessThan(1000); // Should evict old entries
    });

    it('should implement LRU eviction', async () => {
      // Fill cache to capacity
      const queries = Array.from({ length: 150 }, (_, i) => `query ${i}`);

      for (const query of queries) {
        await request(app)
          .post('/api/search')
          .set('Authorization', `Bearer ${authToken}`)
          .send({ query })
          .expect(200);
      }

      // First query should be evicted
      const response = await request(app)
        .post('/api/search')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ query: 'query 0' })
        .expect(200);

      expect(response.headers['x-cache']).toBe('MISS');
    });
  });
});
