import { Router } from 'express';
import { securityLogger } from '../services/securityLogger';
import { jwtAuth, requireRole } from '../middleware/jwtAuth';
import { AppError, asyncHandler, sendSuccess } from '../middleware/errorHandler';
import { validateApiInput } from '../middleware/validation';
import { z } from 'zod';
import { logDataAccess } from '../middleware/securityMonitoring';

const router = Router();

// Validation schemas
const getEventsSchema = z.object({
  limit: z.coerce.number().min(1).max(1000).optional().default(100),
  offset: z.coerce.number().min(0).optional().default(0),
  eventType: z.string().optional(),
  userId: z.coerce.number().optional(),
  ipAddress: z.string().optional(),
  severity: z.enum(['info', 'warning', 'error', 'critical']).optional(),
  success: z.coerce.boolean().optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional()
});

const getAlertsSchema = z.object({
  limit: z.coerce.number().min(1).max(1000).optional().default(50),
  offset: z.coerce.number().min(0).optional().default(0),
  alertType: z.string().optional(),
  severity: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  status: z.enum(['open', 'investigating', 'resolved', 'false_positive']).optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional()
});

const resolveAlertSchema = z.object({
  alertId: z.number().int().positive(),
  resolutionNotes: z.string().min(1, 'Resolution notes are required'),
  status: z.enum(['resolved', 'false_positive']).default('resolved')
});

const metricsSchema = z.object({
  timeWindow: z.coerce.number().min(1).max(168).optional().default(24) // 1 hour to 1 week
});

/**
 * GET /api/security-monitoring/events
 * Get security audit events (admin only)
 */
router.get('/events',
  jwtAuth,
  requireRole(['admin', 'enterprise']),
  logDataAccess('security_events', 'read'),
  asyncHandler(async (req, res) => {
    const validatedQuery = getEventsSchema.parse(req.query);
    
    const events = await securityLogger.getSecurityEvents(validatedQuery);
    
    sendSuccess(res, {
      events,
      pagination: {
        limit: validatedQuery.limit,
        offset: validatedQuery.offset,
        total: events.length
      }
    });
  })
);

/**
 * GET /api/security-monitoring/alerts
 * Get security alerts (admin only)
 */
router.get('/alerts',
  jwtAuth,
  requireRole(['admin', 'enterprise']),
  logDataAccess('security_alerts', 'read'),
  asyncHandler(async (req, res) => {
    const validatedQuery = getAlertsSchema.parse(req.query);
    
    const alerts = await securityLogger.getSecurityAlerts(validatedQuery);
    
    sendSuccess(res, {
      alerts,
      pagination: {
        limit: validatedQuery.limit,
        offset: validatedQuery.offset,
        total: alerts.length
      }
    });
  })
);

/**
 * GET /api/security-monitoring/metrics
 * Get security dashboard metrics (admin only)
 */
router.get('/metrics',
  jwtAuth,
  requireRole(['admin', 'enterprise']),
  logDataAccess('security_metrics', 'read'),
  asyncHandler(async (req, res) => {
    const { timeWindow } = metricsSchema.parse(req.query);
    
    const metrics = await securityLogger.getSecurityMetrics(timeWindow);
    
    sendSuccess(res, {
      metrics,
      timeWindow,
      generatedAt: new Date().toISOString()
    });
  })
);

/**
 * POST /api/security-monitoring/alerts/:alertId/resolve
 * Resolve a security alert (admin only)
 */
router.post('/alerts/:alertId/resolve',
  jwtAuth,
  requireRole(['admin', 'enterprise']),
  validateApiInput(resolveAlertSchema.omit({ alertId: true })),
  logDataAccess('security_alerts', 'update'),
  asyncHandler(async (req, res) => {
    const alertId = parseInt(req.params.alertId);
    if (isNaN(alertId)) {
      throw AppError.createValidationError('Invalid alert ID', 'INVALID_ALERT_ID');
    }

    const { resolutionNotes, status } = req.body;
    const resolvedBy = req.user!.id;

    await securityLogger.resolveSecurityAlert(alertId, resolvedBy, resolutionNotes, status);

    sendSuccess(res, {
      message: `Alert ${alertId} has been ${status}`,
      alertId,
      resolvedBy,
      resolvedAt: new Date().toISOString()
    });
  })
);

/**
 * GET /api/security-monitoring/user-events/:userId
 * Get security events for a specific user (admin only)
 */
router.get('/user-events/:userId',
  jwtAuth,
  requireRole(['admin', 'enterprise']),
  logDataAccess('user_security_events', 'read'),
  asyncHandler(async (req, res) => {
    const userId = parseInt(req.params.userId);
    if (isNaN(userId)) {
      throw AppError.createValidationError('Invalid user ID', 'INVALID_USER_ID');
    }

    const validatedQuery = getEventsSchema.parse(req.query);
    
    const events = await securityLogger.getSecurityEvents({
      ...validatedQuery,
      userId
    });
    
    sendSuccess(res, {
      userId,
      events,
      pagination: {
        limit: validatedQuery.limit,
        offset: validatedQuery.offset,
        total: events.length
      }
    });
  })
);

/**
 * GET /api/security-monitoring/my-events
 * Get security events for the current user
 */
router.get('/my-events',
  jwtAuth,
  logDataAccess('my_security_events', 'read'),
  asyncHandler(async (req, res) => {
    const userId = req.user!.id;
    const validatedQuery = getEventsSchema.parse(req.query);
    
    // Limit what regular users can see about their own events
    const allowedEventTypes = [
      'AUTH_SUCCESS',
      'AUTH_FAILURE',
      'PASSWORD_CHANGE',
      'SESSION_CREATED',
      'SESSION_TERMINATED'
    ];

    const events = await securityLogger.getSecurityEvents({
      ...validatedQuery,
      userId
    });

    // Filter events to only show allowed types for regular users
    const filteredEvents = events.filter(event => 
      allowedEventTypes.includes(event.eventType)
    ).map(event => ({
      id: event.id,
      timestamp: event.timestamp,
      eventType: event.eventType,
      action: event.action,
      success: event.success,
      ipAddress: event.ipAddress,
      userAgent: event.userAgent,
      // Don't expose sensitive metadata to regular users
      metadata: event.eventType === 'AUTH_SUCCESS' || event.eventType === 'AUTH_FAILURE' 
        ? { endpoint: event.metadata?.endpoint }
        : {}
    }));
    
    sendSuccess(res, {
      events: filteredEvents,
      pagination: {
        limit: validatedQuery.limit,
        offset: validatedQuery.offset,
        total: filteredEvents.length
      }
    });
  })
);

/**
 * GET /api/security-monitoring/ip-events/:ipAddress
 * Get security events for a specific IP address (admin only)
 */
router.get('/ip-events/:ipAddress',
  jwtAuth,
  requireRole(['admin', 'enterprise']),
  logDataAccess('ip_security_events', 'read'),
  asyncHandler(async (req, res) => {
    const ipAddress = req.params.ipAddress;
    
    // Basic IP address validation
    if (!ipAddress || ipAddress === 'undefined') {
      throw AppError.createValidationError('Invalid IP address', 'INVALID_IP_ADDRESS');
    }

    const validatedQuery = getEventsSchema.parse(req.query);
    
    const events = await securityLogger.getSecurityEvents({
      ...validatedQuery,
      ipAddress
    });
    
    sendSuccess(res, {
      ipAddress,
      events,
      pagination: {
        limit: validatedQuery.limit,
        offset: validatedQuery.offset,
        total: events.length
      }
    });
  })
);

/**
 * GET /api/security-monitoring/dashboard
 * Get comprehensive security dashboard data (admin only)
 */
router.get('/dashboard',
  jwtAuth,
  requireRole(['admin', 'enterprise']),
  logDataAccess('security_dashboard', 'read'),
  asyncHandler(async (req, res) => {
    const { timeWindow } = metricsSchema.parse(req.query);
    
    // Get metrics and recent alerts in parallel
    const [metrics, recentAlerts, recentEvents] = await Promise.all([
      securityLogger.getSecurityMetrics(timeWindow),
      securityLogger.getSecurityAlerts({ limit: 10, status: 'open' }),
      securityLogger.getSecurityEvents({ 
        limit: 20, 
        success: false,
        startDate: new Date(Date.now() - timeWindow * 60 * 60 * 1000)
      })
    ]);
    
    sendSuccess(res, {
      dashboard: {
        metrics,
        recentAlerts,
        recentFailures: recentEvents,
        timeWindow,
        generatedAt: new Date().toISOString()
      }
    });
  })
);

export default router;