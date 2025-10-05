import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { cacheService, CacheNamespaces, CacheTTL } from '../cache';

describe('CacheService', () => {
  beforeAll(async () => {
    // Connect to Redis before tests
    await cacheService.connect();
  });

  afterAll(async () => {
    // Clean up and disconnect after tests
    await cacheService.flushAll();
    await cacheService.disconnect();
  });

  beforeEach(async () => {
    // Clear cache before each test
    if (cacheService.isAvailable()) {
      await cacheService.flushAll();
    }
  });

  describe('Connection', () => {
    it('should connect to Redis', () => {
      // Note: This test may fail if Redis is not running locally
      // In CI/CD, you would need to set up a Redis service
      expect(cacheService.isAvailable()).toBe(true);
    });
  });

  describe('Key Generation', () => {
    it('should generate namespaced keys', () => {
      const key = cacheService.generateKey(CacheNamespaces.SEARCH_RESULTS, 'test-id');
      expect(key).toBe('gapfinder:search:test-id');
    });

    it('should generate unique keys for different namespaces', () => {
      const key1 = cacheService.generateKey(CacheNamespaces.SEARCH_RESULTS, 'id');
      const key2 = cacheService.generateKey(CacheNamespaces.USER_DATA, 'id');
      expect(key1).not.toBe(key2);
    });
  });

  describe('Set and Get', () => {
    it('should set and get a string value', async () => {
      if (!cacheService.isAvailable()) {
        console.warn('Redis not available, skipping test');
        return;
      }

      const key = cacheService.generateKey(CacheNamespaces.SEARCH_RESULTS, 'test1');
      const value = 'test value';

      await cacheService.set(key, value);
      const retrieved = await cacheService.get<string>(key);

      expect(retrieved).toBe(value);
    });

    it('should set and get an object value', async () => {
      if (!cacheService.isAvailable()) {
        console.warn('Redis not available, skipping test');
        return;
      }

      const key = cacheService.generateKey(CacheNamespaces.SEARCH_RESULTS, 'test2');
      const value = { id: 1, name: 'Test', data: [1, 2, 3] };

      await cacheService.set(key, value);
      const retrieved = await cacheService.get<typeof value>(key);

      expect(retrieved).toEqual(value);
    });

    it('should return null for non-existent key', async () => {
      if (!cacheService.isAvailable()) {
        console.warn('Redis not available, skipping test');
        return;
      }

      const key = cacheService.generateKey(CacheNamespaces.SEARCH_RESULTS, 'nonexistent');
      const retrieved = await cacheService.get(key);

      expect(retrieved).toBeNull();
    });

    it('should respect custom TTL', async () => {
      if (!cacheService.isAvailable()) {
        console.warn('Redis not available, skipping test');
        return;
      }

      const key = cacheService.generateKey(CacheNamespaces.SEARCH_RESULTS, 'test3');
      const value = 'test value';

      await cacheService.set(key, value, CacheTTL.SHORT);
      const ttl = await cacheService.ttl(key);

      // TTL should be approximately 300 seconds (5 minutes)
      expect(ttl).toBeGreaterThan(290);
      expect(ttl).toBeLessThanOrEqual(300);
    });
  });

  describe('Delete', () => {
    it('should delete a key', async () => {
      if (!cacheService.isAvailable()) {
        console.warn('Redis not available, skipping test');
        return;
      }

      const key = cacheService.generateKey(CacheNamespaces.SEARCH_RESULTS, 'test4');
      const value = 'test value';

      await cacheService.set(key, value);
      expect(await cacheService.exists(key)).toBe(true);

      await cacheService.delete(key);
      expect(await cacheService.exists(key)).toBe(false);
    });

    it('should delete multiple keys by pattern', async () => {
      if (!cacheService.isAvailable()) {
        console.warn('Redis not available, skipping test');
        return;
      }

      const namespace = CacheNamespaces.SEARCH_RESULTS;
      await cacheService.set(cacheService.generateKey(namespace, 'test5-1'), 'value1');
      await cacheService.set(cacheService.generateKey(namespace, 'test5-2'), 'value2');
      await cacheService.set(cacheService.generateKey(namespace, 'test5-3'), 'value3');

      const pattern = `gapfinder:${namespace}:test5-*`;
      const deletedCount = await cacheService.deletePattern(pattern);

      expect(deletedCount).toBe(3);
    });
  });

  describe('Exists', () => {
    it('should check if key exists', async () => {
      if (!cacheService.isAvailable()) {
        console.warn('Redis not available, skipping test');
        return;
      }

      const key = cacheService.generateKey(CacheNamespaces.SEARCH_RESULTS, 'test6');

      expect(await cacheService.exists(key)).toBe(false);

      await cacheService.set(key, 'value');
      expect(await cacheService.exists(key)).toBe(true);
    });
  });

  describe('TTL Management', () => {
    it('should set and get TTL', async () => {
      if (!cacheService.isAvailable()) {
        console.warn('Redis not available, skipping test');
        return;
      }

      const key = cacheService.generateKey(CacheNamespaces.SEARCH_RESULTS, 'test7');
      await cacheService.set(key, 'value', CacheTTL.LONG);

      const ttl = await cacheService.ttl(key);
      expect(ttl).toBeGreaterThan(3500);
      expect(ttl).toBeLessThanOrEqual(3600);
    });

    it('should update TTL for existing key', async () => {
      if (!cacheService.isAvailable()) {
        console.warn('Redis not available, skipping test');
        return;
      }

      const key = cacheService.generateKey(CacheNamespaces.SEARCH_RESULTS, 'test8');
      await cacheService.set(key, 'value', CacheTTL.SHORT);

      await cacheService.expire(key, CacheTTL.VERY_LONG);
      const ttl = await cacheService.ttl(key);

      expect(ttl).toBeGreaterThan(86300);
      expect(ttl).toBeLessThanOrEqual(86400);
    });
  });

  describe('Error Handling', () => {
    it('should handle gracefully when Redis is unavailable', async () => {
      // Disconnect to simulate unavailability
      await cacheService.disconnect();

      const key = cacheService.generateKey(CacheNamespaces.SEARCH_RESULTS, 'test9');
      
      // These should not throw errors
      const setResult = await cacheService.set(key, 'value');
      expect(setResult).toBe(false);

      const getResult = await cacheService.get(key);
      expect(getResult).toBeNull();

      const deleteResult = await cacheService.delete(key);
      expect(deleteResult).toBe(false);

      // Reconnect for other tests
      await cacheService.connect();
    });
  });
});
