/**
 * Performance Monitoring API Routes
 * 
 * Admin-only endpoints for monitoring database and cache performance
 */

import { Router, type Request, type Response } from 'express';
import { dbPerformanceMonitor } from '../../services/dbPerformanceMonitor';
import { cacheService } from '../../services/cacheService';
import { requireAuth } from '../../middleware/auth';

const router = Router();

// All routes require authentication
router.use(requireAuth);

/**
 * GET /api/admin/performance/database
 * Get database performance statistics
 */
router.get('/database', async (req: Request, res: Response) => {
  try {
    // Check if user is admin (you may want to add admin middleware)
    // For now, we'll allow any authenticated user in development
    if (process.env.NODE_ENV === 'production' && !req.user?.isAdmin) {
      return res.status(403).json({
        success: false,
        error: 'Admin access required',
      });
    }

    const stats = await dbPerformanceMonitor.getDatabaseStats();
    const poolHealth = dbPerformanceMonitor.getPoolHealth();
    const postgresStats = await dbPerformanceMonitor.getPostgresStats();

    res.json({
      success: true,
      data: {
        database: stats,
        pool: poolHealth,
        postgres: postgresStats,
      },
    });
  } catch (error) {
    console.error('Failed to get database stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve database statistics',
    });
  }
});

/**
 * GET /api/admin/performance/cache
 * Get cache performance statistics
 */
router.get('/cache', async (req: Request, res: Response) => {
  try {
    if (process.env.NODE_ENV === 'production' && !req.user?.isAdmin) {
      return res.status(403).json({
        success: false,
        error: 'Admin access required',
      });
    }

    const stats = cacheService.getStats();
    const isAvailable = cacheService.isAvailable();

    res.json({
      success: true,
      data: {
        stats,
        isRedisAvailable: isAvailable,
        cacheType: isAvailable ? 'redis' : 'memory',
      },
    });
  } catch (error) {
    console.error('Failed to get cache stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve cache statistics',
    });
  }
});

/**
 * GET /api/admin/performance/slow-queries
 * Get slow query report
 */
router.get('/slow-queries', async (req: Request, res: Response) => {
  try {
    if (process.env.NODE_ENV === 'production' && !req.user?.isAdmin) {
      return res.status(403).json({
        success: false,
        error: 'Admin access required',
      });
    }

    const limit = parseInt(req.query.limit as string) || 20;
    const slowQueries = dbPerformanceMonitor.getSlowQueries(limit);

    res.json({
      success: true,
      data: {
        slowQueries,
        threshold: 1000, // 1 second
      },
    });
  } catch (error) {
    console.error('Failed to get slow queries:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve slow queries',
    });
  }
});

/**
 * POST /api/admin/performance/analyze-table
 * Analyze a specific table and get optimization suggestions
 */
router.post('/analyze-table', async (req: Request, res: Response) => {
  try {
    if (process.env.NODE_ENV === 'production' && !req.user?.isAdmin) {
      return res.status(403).json({
        success: false,
        error: 'Admin access required',
      });
    }

    const { tableName } = req.body;

    if (!tableName) {
      return res.status(400).json({
        success: false,
        error: 'Table name is required',
      });
    }

    const analysis = await dbPerformanceMonitor.analyzeTable(tableName);

    if (!analysis) {
      return res.status(404).json({
        success: false,
        error: 'Table not found or analysis failed',
      });
    }

    res.json({
      success: true,
      data: analysis,
    });
  } catch (error) {
    console.error('Failed to analyze table:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to analyze table',
    });
  }
});

/**
 * POST /api/admin/performance/cache/clear
 * Clear all cache
 */
router.post('/cache/clear', async (req: Request, res: Response) => {
  try {
    if (process.env.NODE_ENV === 'production' && !req.user?.isAdmin) {
      return res.status(403).json({
        success: false,
        error: 'Admin access required',
      });
    }

    await cacheService.clear();

    res.json({
      success: true,
      message: 'Cache cleared successfully',
    });
  } catch (error) {
    console.error('Failed to clear cache:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to clear cache',
    });
  }
});

/**
 * POST /api/admin/performance/metrics/reset
 * Reset performance metrics
 */
router.post('/metrics/reset', async (req: Request, res: Response) => {
  try {
    if (process.env.NODE_ENV === 'production' && !req.user?.isAdmin) {
      return res.status(403).json({
        success: false,
        error: 'Admin access required',
      });
    }

    dbPerformanceMonitor.clearMetrics();
    cacheService.resetStats();

    res.json({
      success: true,
      message: 'Performance metrics reset successfully',
    });
  } catch (error) {
    console.error('Failed to reset metrics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to reset metrics',
    });
  }
});

/**
 * GET /api/admin/performance/export
 * Export performance metrics as JSON
 */
router.get('/export', async (req: Request, res: Response) => {
  try {
    if (process.env.NODE_ENV === 'production' && !req.user?.isAdmin) {
      return res.status(403).json({
        success: false,
        error: 'Admin access required',
      });
    }

    const metrics = dbPerformanceMonitor.exportMetrics();

    res.setHeader('Content-Type', 'application/json');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="performance-metrics-${Date.now()}.json"`
    );
    res.send(metrics);
  } catch (error) {
    console.error('Failed to export metrics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to export metrics',
    });
  }
});

export default router;
