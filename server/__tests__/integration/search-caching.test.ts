import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import { cacheService } from '../../services/cache';

describe('Search Result Caching Integration', () => {
  let app: express.Application;
  let authToken: string;
  let redisAvailable = false;

  beforeAll(async () => {
    // Try to connect to Redis
    try {
      await cacheService.connect();
      redisAvailable = cacheService.isAvailable();
    } catch (error) {
      console.warn('Redis not available, skipping cache integration tests');
      redisAvailable = false;
    }
    
    // Note: In a real test, you would set up the full Express app
    // For now, this is a placeholder structure
  });

  afterAll(async () => {
    // Clean up
    if (redisAvailable) {
      await cacheService.flushAll();
      await cacheService.disconnect();
    }
  });

  beforeEach(async () => {
    // Clear cache before each test
    if (redisAvailable && cacheService.isAvailable()) {
      await cacheService.flushAll();
    }
  });

  describe('Cache Service Integration', () => {
    it('should cache search results', async () => {
      if (!redisAvailable) return;
      const cacheKey = cacheService.generateKey('search', 'test-query');
      const testData = { results: ['gap1', 'gap2', 'gap3'] };

      // Set cache
      const setResult = await cacheService.set(cacheKey, testData, 300);
      expect(setResult).toBe(true);

      // Get from cache
      const cachedData = await cacheService.get(cacheKey);
      expect(cachedData).toEqual(testData);
    });

    it('should handle cache misses gracefully', async () => {
      if (!redisAvailable) return;
      const cacheKey = cacheService.generateKey('search', 'nonexistent');
      const cachedData = await cacheService.get(cacheKey);
      expect(cachedData).toBeNull();
    });

    it('should respect TTL', async () => {
      if (!redisAvailable) return;
      const cacheKey = cacheService.generateKey('search', 'ttl-test');
      const testData = { test: 'data' };

      await cacheService.set(cacheKey, testData, 1); // 1 second TTL
      
      // Should exist immediately
      let exists = await cacheService.exists(cacheKey);
      expect(exists).toBe(true);

      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 1100));

      // Should be expired
      exists = await cacheService.exists(cacheKey);
      expect(exists).toBe(false);
    });

    it('should delete cache entries', async () => {
      if (!redisAvailable) return;
      const cacheKey = cacheService.generateKey('search', 'delete-test');
      await cacheService.set(cacheKey, { test: 'data' });

      let exists = await cacheService.exists(cacheKey);
      expect(exists).toBe(true);

      await cacheService.delete(cacheKey);

      exists = await cacheService.exists(cacheKey);
      expect(exists).toBe(false);
    });

    it('should delete multiple entries by pattern', async () => {
      if (!redisAvailable) return;
      // Create multiple cache entries
      await cacheService.set(cacheService.generateKey('search', 'pattern-1'), { data: 1 });
      await cacheService.set(cacheService.generateKey('search', 'pattern-2'), { data: 2 });
      await cacheService.set(cacheService.generateKey('search', 'pattern-3'), { data: 3 });
      await cacheService.set(cacheService.generateKey('user', 'other'), { data: 4 });

      // Delete by pattern
      const deleted = await cacheService.deletePattern('gapfinder:search:pattern-*');
      expect(deleted).toBe(3);

      // Verify deletion
      const exists1 = await cacheService.exists(cacheService.generateKey('search', 'pattern-1'));
      const exists2 = await cacheService.exists(cacheService.generateKey('user', 'other'));
      expect(exists1).toBe(false);
      expect(exists2).toBe(true);
    });
  });

  describe('Cache Invalidation', () => {
    it('should invalidate cache when needed', async () => {
      if (!redisAvailable) return;
      const cacheKey = cacheService.generateKey('search', 'invalidate-test');
      await cacheService.set(cacheKey, { old: 'data' });

      // Invalidate
      await cacheService.delete(cacheKey);

      // Set new data
      await cacheService.set(cacheKey, { new: 'data' });

      const cached = await cacheService.get(cacheKey);
      expect(cached).toEqual({ new: 'data' });
    });
  });

  describe('Error Handling', () => {
    it('should handle Redis unavailability gracefully', async () => {
      // Disconnect Redis
      await cacheService.disconnect();

      const cacheKey = cacheService.generateKey('search', 'error-test');
      
      // Should not throw errors
      const setResult = await cacheService.set(cacheKey, { test: 'data' });
      expect(setResult).toBe(false);

      const getResult = await cacheService.get(cacheKey);
      expect(getResult).toBeNull();

      // Reconnect for other tests
      await cacheService.connect();
    });
  });
});

