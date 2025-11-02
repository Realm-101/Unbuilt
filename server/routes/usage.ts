import { Router } from 'express';
import { jwtAuth } from '../middleware/jwtAuth';
import { apiRateLimit } from '../middleware/rateLimiting';
import { asyncHandler, sendSuccess, AppError } from '../middleware/errorHandler';
import { usageTrackingService } from '../services/usageTrackingService';
import { costMonitoringService } from '../services/costMonitoringService';
import { z } from 'zod';

const router = Router();

/**
 * GET /api/usage/current
 * Get current month usage statistics for the authenticated user
 */
router.get(
  '/current',
  apiRateLimit,
  jwtAuth,
  asyncHandler(async (req, res) => {
    const userId = req.user!.id;
    const now = new Date();

    const stats = await usageTrackingService.getMonthlyUsageStats(
      userId,
      now.getFullYear(),
      now.getMonth() + 1
    );

    sendSuccess(res, stats);
  })
);

/**
 * GET /api/usage/monthly
 * Get monthly usage statistics for a specific month
 */
router.get(
  '/monthly',
  apiRateLimit,
  jwtAuth,
  asyncHandler(async (req, res) => {
    const userId = req.user!.id;

    // Validate query parameters
    const querySchema = z.object({
      year: z.coerce.number().int().min(2020).max(2100),
      month: z.coerce.number().int().min(1).max(12),
    });

    const { year, month } = querySchema.parse(req.query);

    const stats = await usageTrackingService.getMonthlyUsageStats(
      userId,
      year,
      month
    );

    sendSuccess(res, stats);
  })
);

/**
 * GET /api/usage/analysis/:analysisId
 * Get usage statistics for a specific analysis
 */
router.get(
  '/analysis/:analysisId',
  apiRateLimit,
  jwtAuth,
  asyncHandler(async (req, res) => {
    const userId = req.user!.id;
    const analysisId = parseInt(req.params.analysisId);

    if (isNaN(analysisId) || analysisId <= 0) {
      throw AppError.createValidationError('Invalid analysis ID', 'INVALID_ANALYSIS_ID');
    }

    const stats = await usageTrackingService.getAnalysisUsageStats(
      analysisId,
      userId
    );

    if (!stats) {
      throw AppError.createNotFoundError(
        'No conversation found for this analysis',
        'CONVERSATION_NOT_FOUND'
      );
    }

    sendSuccess(res, stats);
  })
);

/**
 * GET /api/usage/summary
 * Get overall usage summary for the authenticated user
 */
router.get(
  '/summary',
  apiRateLimit,
  jwtAuth,
  asyncHandler(async (req, res) => {
    const userId = req.user!.id;

    // Validate query parameters
    const querySchema = z.object({
      startDate: z.string().datetime().optional(),
      endDate: z.string().datetime().optional(),
    });

    const { startDate, endDate } = querySchema.parse(req.query);

    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;

    const stats = await usageTrackingService.getUserUsageStats(
      userId,
      start,
      end
    );

    sendSuccess(res, stats);
  })
);

/**
 * GET /api/usage/tokens/current-month
 * Get total token usage for the current month
 */
router.get(
  '/tokens/current-month',
  apiRateLimit,
  jwtAuth,
  asyncHandler(async (req, res) => {
    const userId = req.user!.id;

    const tokenUsage = await usageTrackingService.getCurrentMonthTokenUsage(userId);

    sendSuccess(res, {
      userId,
      month: new Date().toLocaleString('default', { month: 'long', year: 'numeric' }),
      tokensUsed: tokenUsage,
    });
  })
);

/**
 * GET /api/usage/questions/current-month
 * Get total questions asked in the current month
 */
router.get(
  '/questions/current-month',
  apiRateLimit,
  jwtAuth,
  asyncHandler(async (req, res) => {
    const userId = req.user!.id;

    const questionCount = await usageTrackingService.getCurrentMonthQuestionCount(userId);

    sendSuccess(res, {
      userId,
      month: new Date().toLocaleString('default', { month: 'long', year: 'numeric' }),
      questionsAsked: questionCount,
    });
  })
);

/**
 * GET /api/usage/admin/summary
 * Get usage summary for all users (admin only)
 * TODO: Add admin authorization middleware
 */
router.get(
  '/admin/summary',
  apiRateLimit,
  jwtAuth,
  asyncHandler(async (req, res) => {
    // TODO: Check if user is admin
    // For now, we'll allow any authenticated user (should be restricted in production)

    // Validate query parameters
    const querySchema = z.object({
      startDate: z.string().datetime().optional(),
      endDate: z.string().datetime().optional(),
    });

    const { startDate, endDate } = querySchema.parse(req.query);

    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;

    const summary = await usageTrackingService.getAllUsersUsageSummary(start, end);

    sendSuccess(res, summary);
  })
);

/**
 * GET /api/usage/cost/breakdown
 * Get cost breakdown for the authenticated user
 */
router.get(
  '/cost/breakdown',
  apiRateLimit,
  jwtAuth,
  asyncHandler(async (req, res) => {
    const userId = req.user!.id;

    // Validate query parameters
    const querySchema = z.object({
      startDate: z.string().datetime().optional(),
      endDate: z.string().datetime().optional(),
    });

    const { startDate, endDate } = querySchema.parse(req.query);

    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;

    const breakdown = await costMonitoringService.getUserCostBreakdown(
      userId,
      start,
      end
    );

    sendSuccess(res, breakdown);
  })
);

/**
 * GET /api/usage/cost/conversation/:conversationId
 * Get cost for a specific conversation
 */
router.get(
  '/cost/conversation/:conversationId',
  apiRateLimit,
  jwtAuth,
  asyncHandler(async (req, res) => {
    const conversationId = parseInt(req.params.conversationId);

    if (isNaN(conversationId) || conversationId <= 0) {
      throw AppError.createValidationError('Invalid conversation ID', 'INVALID_CONVERSATION_ID');
    }

    const cost = await costMonitoringService.calculateConversationCost(conversationId);

    sendSuccess(res, {
      conversationId,
      cost: Math.round(cost * 100) / 100,
    });
  })
);

/**
 * GET /api/usage/cost/metrics
 * Get real-time cost metrics
 */
router.get(
  '/cost/metrics',
  apiRateLimit,
  jwtAuth,
  asyncHandler(async (req, res) => {
    const metrics = await costMonitoringService.getRealTimeCostMetrics();

    sendSuccess(res, metrics);
  })
);

/**
 * GET /api/usage/admin/cost/report
 * Generate cost report for a period (admin only)
 * TODO: Add admin authorization middleware
 */
router.get(
  '/admin/cost/report',
  apiRateLimit,
  jwtAuth,
  asyncHandler(async (req, res) => {
    // TODO: Check if user is admin

    // Validate query parameters
    const querySchema = z.object({
      startDate: z.string().datetime(),
      endDate: z.string().datetime(),
    });

    const { startDate, endDate } = querySchema.parse(req.query);

    const report = await costMonitoringService.generateCostReport(
      new Date(startDate),
      new Date(endDate)
    );

    sendSuccess(res, report);
  })
);

/**
 * GET /api/usage/admin/cost/alerts
 * Get current cost alerts (admin only)
 * TODO: Add admin authorization middleware
 */
router.get(
  '/admin/cost/alerts',
  apiRateLimit,
  jwtAuth,
  asyncHandler(async (req, res) => {
    // TODO: Check if user is admin

    const alerts = await costMonitoringService.monitorCosts();

    sendSuccess(res, {
      alerts,
      count: alerts.length,
      timestamp: new Date().toISOString(),
    });
  })
);

export default router;
