import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { requireRole } from '../middleware/authorization';
import { apiRateLimit } from '../middleware/rateLimiting';
import { asyncHandler, sendSuccess } from '../middleware/errorHandler';
import { conversationLogger, ConversationEventType } from '../services/conversationLogger';

const router = Router();

/**
 * GET /api/conversation-logs
 * Get recent conversation logs
 * Admin only
 */
router.get(
  '/',
  requireAuth,
  requireRole(['admin']),
  apiRateLimit,
  asyncHandler(async (req, res) => {
    const { limit, eventType, level } = req.query;

    const limitNum = limit ? parseInt(limit as string) : 100;
    let logs = conversationLogger.getRecentLogs(limitNum);

    // Filter by event type if specified
    if (eventType) {
      logs = logs.filter((log) => log.eventType === eventType);
    }

    // Filter by level if specified
    if (level) {
      logs = logs.filter((log) => log.level === level);
    }

    sendSuccess(res, { logs, count: logs.length });
  })
);

/**
 * GET /api/conversation-logs/performance
 * Get AI performance logs
 * Admin only
 */
router.get(
  '/performance',
  requireAuth,
  requireRole(['admin']),
  apiRateLimit,
  asyncHandler(async (req, res) => {
    const { limit } = req.query;

    const limitNum = limit ? parseInt(limit as string) : 100;
    const logs = conversationLogger.getRecentPerformanceLogs(limitNum);
    const stats = conversationLogger.getPerformanceStats();

    sendSuccess(res, { logs, stats, count: logs.length });
  })
);

/**
 * GET /api/conversation-logs/feedback
 * Get user feedback logs
 * Admin only
 */
router.get(
  '/feedback',
  requireAuth,
  requireRole(['admin']),
  apiRateLimit,
  asyncHandler(async (req, res) => {
    const { limit } = req.query;

    const limitNum = limit ? parseInt(limit as string) : 100;
    const logs = conversationLogger.getRecentFeedbackLogs(limitNum);
    const stats = conversationLogger.getFeedbackStats();

    sendSuccess(res, { logs, stats, count: logs.length });
  })
);

/**
 * GET /api/conversation-logs/errors
 * Get error logs
 * Admin only
 */
router.get(
  '/errors',
  requireAuth,
  requireRole(['admin']),
  apiRateLimit,
  asyncHandler(async (req, res) => {
    const { limit } = req.query;

    const limitNum = limit ? parseInt(limit as string) : 100;
    const logs = conversationLogger.getErrorLogs(limitNum);

    sendSuccess(res, { logs, count: logs.length });
  })
);

/**
 * GET /api/conversation-logs/conversation/:conversationId
 * Get logs for a specific conversation
 * Admin or conversation owner
 */
router.get(
  '/conversation/:conversationId',
  requireAuth,
  apiRateLimit,
  asyncHandler(async (req, res) => {
    const conversationId = parseInt(req.params.conversationId);

    // TODO: Add ownership check for non-admin users

    const logs = conversationLogger.getLogsByConversation(conversationId);

    sendSuccess(res, { logs, count: logs.length });
  })
);

/**
 * GET /api/conversation-logs/user/:userId
 * Get logs for a specific user
 * Admin or the user themselves
 */
router.get(
  '/user/:userId',
  requireAuth,
  apiRateLimit,
  asyncHandler(async (req, res) => {
    const userId = parseInt(req.params.userId);

    // Check authorization
    if (req.user!.id !== userId && req.user!.role !== 'admin') {
      throw new Error('Unauthorized to view this user\'s logs');
    }

    const logs = conversationLogger.getLogsByUser(userId);

    sendSuccess(res, { logs, count: logs.length });
  })
);

/**
 * GET /api/conversation-logs/export
 * Export all logs
 * Admin only
 */
router.get(
  '/export',
  requireAuth,
  requireRole(['admin']),
  apiRateLimit,
  asyncHandler(async (req, res) => {
    const exportData = conversationLogger.exportLogs();

    res.setHeader('Content-Type', 'application/json');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="conversation-logs-${new Date().toISOString()}.json"`
    );

    res.send(JSON.stringify(exportData, null, 2));
  })
);

/**
 * GET /api/conversation-logs/stats
 * Get logging statistics
 * Admin only
 */
router.get(
  '/stats',
  requireAuth,
  requireRole(['admin']),
  apiRateLimit,
  asyncHandler(async (req, res) => {
    const performanceStats = conversationLogger.getPerformanceStats();
    const feedbackStats = conversationLogger.getFeedbackStats();

    sendSuccess(res, {
      performance: performanceStats,
      feedback: feedbackStats,
    });
  })
);

export default router;
