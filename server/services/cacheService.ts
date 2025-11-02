/**
 * Cache Service
 * 
 * Provides Redis-based caching with fallback to in-memory cache
 * for improved query performance and reduced database load.
 */

import { createClient, RedisClientType } from 'redis';

interface CacheOptions {
  ttl?: number; // Time to live in seconds
  prefix?: string; // Key prefix for namespacing
}

interface CacheStats {
  hits: number;
  misses: number;
  sets: number;
  deletes: number;
  errors: number;
}

class CacheService {
  private client: RedisClientType | null = null;
  private memoryCache: Map<string, { value: any; expires: number }> = new Map();
  private isRedisAvailable: boolean = false;
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    sets: 0,
    deletes: 0,
    errors: 0,
  };

  // Default TTL values (in seconds)
  private readonly DEFAULT_TTL = 3600; // 1 hour
  private readonly SHORT_TTL = 300; // 5 minutes
  private readonly LONG_TTL = 86400; // 24 hours

  // Memory cache size limit
  private readonly MAX_MEMORY_CACHE_SIZE = 1000;

  constructor() {
    this.initializeRedis();
  }

  /**
   * Initialize Redis client
   */
  private async initializeRedis(): Promise<void> {
    try {
      const redisUrl = process.env.REDIS_URL;
      
      if (!redisUrl) {
        console.warn('⚠️ REDIS_URL not configured. Using in-memory cache fallback.');
        return;
      }

      this.client = createClient({
        url: redisUrl,
        socket: {
          reconnectStrategy: (retries) => {
            if (retries > 10) {
              console.error('❌ Redis connection failed after 10 retries');
              return new Error('Redis connection failed');
            }
            return Math.min(retries * 100, 3000);
          },
        },
      });

      this.client.on('error', (err) => {
        console.error('Redis Client Error:', err);
        this.stats.errors++;
        this.isRedisAvailable = false;
      });

      this.client.on('connect', () => {
        console.log('✅ Redis connected');
        this.isRedisAvailable = true;
      });

      this.client.on('disconnect', () => {
        console.warn('⚠️ Redis disconnected');
        this.isRedisAvailable = false;
      });

      await this.client.connect();
    } catch (error) {
      console.error('Failed to initialize Redis:', error);
      this.isRedisAvailable = false;
    }
  }

  /**
   * Get value from cache
   */
  async get<T>(key: string, options: CacheOptions = {}): Promise<T | null> {
    const fullKey = this.buildKey(key, options.prefix);

    try {
      // Try Redis first
      if (this.isRedisAvailable && this.client) {
        const value = await this.client.get(fullKey);
        if (value) {
          this.stats.hits++;
          return JSON.parse(value) as T;
        }
      }

      // Fallback to memory cache
      const cached = this.memoryCache.get(fullKey);
      if (cached && cached.expires > Date.now()) {
        this.stats.hits++;
        return cached.value as T;
      }

      // Remove expired entry
      if (cached) {
        this.memoryCache.delete(fullKey);
      }

      this.stats.misses++;
      return null;
    } catch (error) {
      console.error('Cache get error:', error);
      this.stats.errors++;
      return null;
    }
  }

  /**
   * Set value in cache
   */
  async set<T>(
    key: string,
    value: T,
    options: CacheOptions = {}
  ): Promise<boolean> {
    const fullKey = this.buildKey(key, options.prefix);
    const ttl = options.ttl || this.DEFAULT_TTL;

    try {
      const serialized = JSON.stringify(value);

      // Try Redis first
      if (this.isRedisAvailable && this.client) {
        await this.client.setEx(fullKey, ttl, serialized);
        this.stats.sets++;
        return true;
      }

      // Fallback to memory cache
      this.setMemoryCache(fullKey, value, ttl);
      this.stats.sets++;
      return true;
    } catch (error) {
      console.error('Cache set error:', error);
      this.stats.errors++;
      return false;
    }
  }

  /**
   * Delete value from cache
   */
  async delete(key: string, options: CacheOptions = {}): Promise<boolean> {
    const fullKey = this.buildKey(key, options.prefix);

    try {
      // Delete from Redis
      if (this.isRedisAvailable && this.client) {
        await this.client.del(fullKey);
      }

      // Delete from memory cache
      this.memoryCache.delete(fullKey);
      this.stats.deletes++;
      return true;
    } catch (error) {
      console.error('Cache delete error:', error);
      this.stats.errors++;
      return false;
    }
  }

  /**
   * Delete multiple keys matching a pattern
   */
  async deletePattern(pattern: string, options: CacheOptions = {}): Promise<number> {
    const fullPattern = this.buildKey(pattern, options.prefix);
    let deletedCount = 0;

    try {
      // Delete from Redis
      if (this.isRedisAvailable && this.client) {
        const keys = await this.client.keys(fullPattern);
        if (keys.length > 0) {
          deletedCount = await this.client.del(keys);
        }
      }

      // Delete from memory cache
      for (const key of this.memoryCache.keys()) {
        if (this.matchPattern(key, fullPattern)) {
          this.memoryCache.delete(key);
          deletedCount++;
        }
      }

      this.stats.deletes += deletedCount;
      return deletedCount;
    } catch (error) {
      console.error('Cache delete pattern error:', error);
      this.stats.errors++;
      return 0;
    }
  }

  /**
   * Get or set value (cache-aside pattern)
   */
  async getOrSet<T>(
    key: string,
    fetchFn: () => Promise<T>,
    options: CacheOptions = {}
  ): Promise<T> {
    // Try to get from cache
    const cached = await this.get<T>(key, options);
    if (cached !== null) {
      return cached;
    }

    // Fetch from source
    const value = await fetchFn();

    // Store in cache
    await this.set(key, value, options);

    return value;
  }

  /**
   * Invalidate cache for a specific entity
   */
  async invalidateEntity(entityType: string, entityId: number | string): Promise<void> {
    await this.deletePattern(`${entityType}:${entityId}:*`);
    await this.deletePattern(`${entityType}:list:*`);
  }

  /**
   * Clear all cache
   */
  async clear(): Promise<void> {
    try {
      if (this.isRedisAvailable && this.client) {
        await this.client.flushDb();
      }
      this.memoryCache.clear();
    } catch (error) {
      console.error('Cache clear error:', error);
      this.stats.errors++;
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats & { hitRate: number; memorySize: number } {
    const total = this.stats.hits + this.stats.misses;
    const hitRate = total > 0 ? (this.stats.hits / total) * 100 : 0;

    return {
      ...this.stats,
      hitRate: Math.round(hitRate * 100) / 100,
      memorySize: this.memoryCache.size,
    };
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      errors: 0,
    };
  }

  /**
   * Check if Redis is available
   */
  isAvailable(): boolean {
    return this.isRedisAvailable;
  }

  /**
   * Close Redis connection
   */
  async close(): Promise<void> {
    if (this.client) {
      await this.client.quit();
    }
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  private buildKey(key: string, prefix?: string): string {
    const parts = ['unbuilt'];
    if (prefix) parts.push(prefix);
    parts.push(key);
    return parts.join(':');
  }

  private setMemoryCache<T>(key: string, value: T, ttl: number): void {
    // Enforce size limit
    if (this.memoryCache.size >= this.MAX_MEMORY_CACHE_SIZE) {
      // Remove oldest entry
      const firstKey = this.memoryCache.keys().next().value;
      if (firstKey) {
        this.memoryCache.delete(firstKey);
      }
    }

    this.memoryCache.set(key, {
      value,
      expires: Date.now() + ttl * 1000,
    });
  }

  private matchPattern(key: string, pattern: string): boolean {
    const regex = new RegExp(
      '^' + pattern.replace(/\*/g, '.*').replace(/\?/g, '.') + '$'
    );
    return regex.test(key);
  }

  // ============================================================================
  // Predefined Cache Keys
  // ============================================================================

  /**
   * Cache key builders for common entities
   */
  keys = {
    // Action Plans
    plan: (planId: number) => `plan:${planId}`,
    planWithTasks: (planId: number) => `plan:${planId}:with-tasks`,
    userPlans: (userId: number, status?: string) =>
      `user:${userId}:plans${status ? `:${status}` : ''}`,
    
    // Tasks
    task: (taskId: number) => `task:${taskId}`,
    phaseTasks: (phaseId: number) => `phase:${phaseId}:tasks`,
    taskDependencies: (taskId: number) => `task:${taskId}:dependencies`,
    
    // Progress
    planProgress: (planId: number) => `plan:${planId}:progress`,
    userProgress: (userId: number) => `user:${userId}:progress`,
    
    // Searches
    search: (searchId: number) => `search:${searchId}`,
    searchResults: (searchId: number) => `search:${searchId}:results`,
    userSearches: (userId: number) => `user:${userId}:searches`,
    
    // Conversations
    conversation: (conversationId: number) => `conversation:${conversationId}`,
    conversationMessages: (conversationId: number) =>
      `conversation:${conversationId}:messages`,
    
    // Resources
    resource: (resourceId: number) => `resource:${resourceId}`,
    resourcesByCategory: (categoryId: number) =>
      `resources:category:${categoryId}`,
    userBookmarks: (userId: number) => `user:${userId}:bookmarks`,
    
    // Users
    user: (userId: number) => `user:${userId}`,
    userSubscription: (userId: number) => `user:${userId}:subscription`,
    
    // Templates
    templates: () => 'templates:all',
    template: (templateId: number) => `template:${templateId}`,
  };

  /**
   * TTL presets
   */
  ttl = {
    short: this.SHORT_TTL,
    default: this.DEFAULT_TTL,
    long: this.LONG_TTL,
  };
}

// Export singleton instance
export const cacheService = new CacheService();

// Export types
export type { CacheOptions, CacheStats };
