import { Request, Response, NextFunction } from 'express';

/**
 * Cache Statistics Middleware
 * Tracks cache hits and misses for monitoring
 */

interface CacheStats {
  hits: number;
  misses: number;
  totalRequests: number;
  hitRate: number;
}

class CacheStatsTracker {
  private stats: Map<string, CacheStats> = new Map();

  /**
   * Record a cache hit
   */
  recordHit(endpoint: string): void {
    const stats = this.getOrCreateStats(endpoint);
    stats.hits++;
    stats.totalRequests++;
    stats.hitRate = (stats.hits / stats.totalRequests) * 100;
  }

  /**
   * Record a cache miss
   */
  recordMiss(endpoint: string): void {
    const stats = this.getOrCreateStats(endpoint);
    stats.misses++;
    stats.totalRequests++;
    stats.hitRate = (stats.hits / stats.totalRequests) * 100;
  }

  /**
   * Get stats for an endpoint
   */
  getStats(endpoint: string): CacheStats | undefined {
    return this.stats.get(endpoint);
  }

  /**
   * Get all stats
   */
  getAllStats(): Record<string, CacheStats> {
    const result: Record<string, CacheStats> = {};
    this.stats.forEach((stats, endpoint) => {
      result[endpoint] = { ...stats };
    });
    return result;
  }

  /**
   * Reset stats
   */
  reset(): void {
    this.stats.clear();
  }

  /**
   * Get or create stats for an endpoint
   */
  private getOrCreateStats(endpoint: string): CacheStats {
    if (!this.stats.has(endpoint)) {
      this.stats.set(endpoint, {
        hits: 0,
        misses: 0,
        totalRequests: 0,
        hitRate: 0
      });
    }
    return this.stats.get(endpoint)!;
  }
}

// Export singleton instance
export const cacheStatsTracker = new CacheStatsTracker();

/**
 * Middleware to track cache statistics
 */
export function cacheStatsMiddleware(req: Request, res: Response, next: NextFunction): void {
  // Store original json method
  const originalJson = res.json.bind(res);

  // Override json method to capture cache hit/miss
  res.json = function(body: any) {
    if (body && typeof body === 'object' && '_cacheHit' in body) {
      const endpoint = req.path;
      if (body._cacheHit) {
        cacheStatsTracker.recordHit(endpoint);
      } else {
        cacheStatsTracker.recordMiss(endpoint);
      }
      
      // Remove _cacheHit from response
      delete body._cacheHit;
    }
    
    return originalJson(body);
  };

  next();
}
