import { log } from '../vite';
import type { QueryParams } from '@shared/types';

/**
 * Query Performance Monitoring Utility
 * Tracks and logs slow database queries
 */

interface QueryMetrics {
  query: string;
  duration: number;
  timestamp: Date;
  params?: QueryParams;
}

class QueryPerformanceMonitor {
  private slowQueryThreshold: number = 100; // ms
  private queryLog: QueryMetrics[] = [];
  private maxLogSize: number = 1000;

  /**
   * Set the threshold for slow query logging (in milliseconds)
   */
  setSlowQueryThreshold(ms: number): void {
    this.slowQueryThreshold = ms;
  }

  /**
   * Log a query execution
   */
  logQuery(query: string, duration: number, params?: QueryParams): void {
    const metrics: QueryMetrics = {
      query: this.sanitizeQuery(query),
      duration,
      timestamp: new Date(),
      params: params ? this.sanitizeParams(params) : undefined
    };

    // Add to log
    this.queryLog.push(metrics);
    
    // Trim log if too large
    if (this.queryLog.length > this.maxLogSize) {
      this.queryLog.shift();
    }

    // Log slow queries
    if (duration > this.slowQueryThreshold) {
      log(`🐌 Slow query (${duration}ms): ${metrics.query}`, 'warn');
    }
  }

  /**
   * Measure query execution time
   */
  async measureQuery<T>(
    queryName: string,
    queryFn: () => Promise<T>,
    params?: QueryParams
  ): Promise<T> {
    const start = Date.now();
    
    try {
      const result = await queryFn();
      const duration = Date.now() - start;
      
      this.logQuery(queryName, duration, params);
      
      return result;
    } catch (error) {
      const duration = Date.now() - start;
      this.logQuery(`${queryName} (ERROR)`, duration, params);
      throw error;
    }
  }

  /**
   * Get slow queries from the log
   */
  getSlowQueries(limit: number = 10): QueryMetrics[] {
    return this.queryLog
      .filter(q => q.duration > this.slowQueryThreshold)
      .sort((a, b) => b.duration - a.duration)
      .slice(0, limit);
  }

  /**
   * Get query statistics
   */
  getStatistics(): {
    totalQueries: number;
    slowQueries: number;
    averageDuration: number;
    maxDuration: number;
    minDuration: number;
  } {
    if (this.queryLog.length === 0) {
      return {
        totalQueries: 0,
        slowQueries: 0,
        averageDuration: 0,
        maxDuration: 0,
        minDuration: 0
      };
    }

    const durations = this.queryLog.map(q => q.duration);
    const slowQueries = this.queryLog.filter(q => q.duration > this.slowQueryThreshold);

    return {
      totalQueries: this.queryLog.length,
      slowQueries: slowQueries.length,
      averageDuration: durations.reduce((a, b) => a + b, 0) / durations.length,
      maxDuration: Math.max(...durations),
      minDuration: Math.min(...durations)
    };
  }

  /**
   * Clear the query log
   */
  clearLog(): void {
    this.queryLog = [];
  }

  /**
   * Sanitize query string for logging (remove sensitive data)
   */
  private sanitizeQuery(query: string): string {
    // Truncate long queries
    if (query.length > 200) {
      return query.substring(0, 197) + '...';
    }
    return query;
  }

  /**
   * Sanitize query parameters for logging
   */
  private sanitizeParams(params: QueryParams): QueryParams {
    if (typeof params !== 'object' || params === null) {
      return params;
    }

    const sanitized: QueryParams = {};
    for (const [key, value] of Object.entries(params)) {
      // Hide sensitive fields
      if (key.toLowerCase().includes('password') || 
          key.toLowerCase().includes('token') ||
          key.toLowerCase().includes('secret')) {
        sanitized[key] = '[REDACTED]';
      } else {
        sanitized[key] = value;
      }
    }
    return sanitized;
  }
}

// Export singleton instance
export const queryPerformanceMonitor = new QueryPerformanceMonitor();

/**
 * Decorator for measuring query performance
 * Note: Uses 'any' for decorator target and args due to TypeScript decorator limitations
 */
export function measureQueryPerformance(queryName: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    descriptor.value = async function (...args: any[]) {
      return queryPerformanceMonitor.measureQuery(
        `${target.constructor.name}.${propertyKey}`,
        () => originalMethod.apply(this, args),
        args[0] // First argument as params
      );
    };

    return descriptor;
  };
}
