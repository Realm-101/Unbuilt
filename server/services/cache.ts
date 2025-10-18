import { createClient, RedisClientType } from 'redis';
import { log } from '../vite';

/**
 * Redis Cache Service
 * Provides caching functionality for search results and other data
 */

class CacheService {
  private client: RedisClientType | null = null;
  private isConnected: boolean = false;
  private readonly defaultTTL: number = 3600; // 1 hour in seconds

  /**
   * Initialize Redis connection
   */
  async connect(): Promise<void> {
    if (this.isConnected) {
      return;
    }

    try {
      const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
      
      this.client = createClient({
        url: redisUrl,
        socket: {
          reconnectStrategy: (retries) => {
            if (retries > 10) {
              log('Redis: Max reconnection attempts reached', 'error');
              return new Error('Max reconnection attempts reached');
            }
            return Math.min(retries * 100, 3000);
          }
        }
      });

      this.client.on('error', (err) => {
        log(`Redis Client Error: ${err.message}`, 'error');
        this.isConnected = false;
      });

      this.client.on('connect', () => {
        log('Redis: Connected successfully', 'info');
        this.isConnected = true;
      });

      this.client.on('disconnect', () => {
        log('Redis: Disconnected', 'info');
        this.isConnected = false;
      });

      await this.client.connect();
    } catch (error) {
      log(`Failed to connect to Redis: ${error}`, 'error');
      this.isConnected = false;
      // Don't throw - allow app to run without cache
    }
  }

  /**
   * Disconnect from Redis
   */
  async disconnect(): Promise<void> {
    if (this.client && this.isConnected) {
      await this.client.quit();
      this.isConnected = false;
      log('Redis: Disconnected gracefully', 'info');
    }
  }

  /**
   * Generate cache key with namespace
   */
  generateKey(namespace: string, identifier: string): string {
    return `gapfinder:${namespace}:${identifier}`;
  }

  /**
   * Set a value in cache with TTL
   */
  async set(key: string, value: unknown, ttl?: number): Promise<boolean> {
    if (!this.isConnected || !this.client) {
      log('Redis: Not connected, skipping cache set', 'warn');
      return false;
    }

    try {
      const serialized = JSON.stringify(value);
      const expirySeconds = ttl || this.defaultTTL;
      
      await this.client.setEx(key, expirySeconds, serialized);
      return true;
    } catch (error) {
      log(`Redis: Failed to set key ${key}: ${error}`, 'error');
      return false;
    }
  }

  /**
   * Get a value from cache
   */
  async get<T>(key: string): Promise<T | null> {
    if (!this.isConnected || !this.client) {
      log('Redis: Not connected, skipping cache get', 'warn');
      return null;
    }

    try {
      const value = await this.client.get(key);
      
      if (!value) {
        return null;
      }

      return JSON.parse(value) as T;
    } catch (error) {
      log(`Redis: Failed to get key ${key}: ${error}`, 'error');
      return null;
    }
  }

  /**
   * Delete a key from cache
   */
  async delete(key: string): Promise<boolean> {
    if (!this.isConnected || !this.client) {
      return false;
    }

    try {
      await this.client.del(key);
      return true;
    } catch (error) {
      log(`Redis: Failed to delete key ${key}: ${error}`, 'error');
      return false;
    }
  }

  /**
   * Delete multiple keys matching a pattern
   */
  async deletePattern(pattern: string): Promise<number> {
    if (!this.isConnected || !this.client) {
      return 0;
    }

    try {
      const keys = await this.client.keys(pattern);
      
      if (keys.length === 0) {
        return 0;
      }

      await this.client.del(keys);
      return keys.length;
    } catch (error) {
      log(`Redis: Failed to delete pattern ${pattern}: ${error}`, 'error');
      return 0;
    }
  }

  /**
   * Check if a key exists
   */
  async exists(key: string): Promise<boolean> {
    if (!this.isConnected || !this.client) {
      return false;
    }

    try {
      const result = await this.client.exists(key);
      return result === 1;
    } catch (error) {
      log(`Redis: Failed to check existence of key ${key}: ${error}`, 'error');
      return false;
    }
  }

  /**
   * Set TTL for an existing key
   */
  async expire(key: string, ttl: number): Promise<boolean> {
    if (!this.isConnected || !this.client) {
      return false;
    }

    try {
      await this.client.expire(key, ttl);
      return true;
    } catch (error) {
      log(`Redis: Failed to set TTL for key ${key}: ${error}`, 'error');
      return false;
    }
  }

  /**
   * Get remaining TTL for a key
   */
  async ttl(key: string): Promise<number> {
    if (!this.isConnected || !this.client) {
      return -1;
    }

    try {
      return await this.client.ttl(key);
    } catch (error) {
      log(`Redis: Failed to get TTL for key ${key}: ${error}`, 'error');
      return -1;
    }
  }

  /**
   * Check if cache is available
   */
  isAvailable(): boolean {
    return this.isConnected && this.client !== null;
  }

  /**
   * Flush all cache data (use with caution)
   */
  async flushAll(): Promise<boolean> {
    if (!this.isConnected || !this.client) {
      return false;
    }

    try {
      await this.client.flushAll();
      log('Redis: Flushed all cache data', 'info');
      return true;
    } catch (error) {
      log(`Redis: Failed to flush cache: ${error}`, 'error');
      return false;
    }
  }
}

// Export singleton instance
export const cacheService = new CacheService();

// Cache key namespaces
export const CacheNamespaces = {
  SEARCH_RESULTS: 'search',
  USER_DATA: 'user',
  ANALYTICS: 'analytics',
  RATE_LIMIT: 'ratelimit',
} as const;

// Cache TTL presets (in seconds)
export const CacheTTL = {
  SHORT: 300,      // 5 minutes
  MEDIUM: 1800,    // 30 minutes
  LONG: 3600,      // 1 hour
  VERY_LONG: 86400 // 24 hours
} as const;
