import { Router, Request, Response } from 'express';
import { sessionManager } from '../services/sessionManager';
import { jwtAuth } from '../middleware/jwtAuth';
import { AppError, asyncHandler, sendSuccess } from '../middleware/errorHandler';
import { validateApiInput } from '../middleware/validation';
import { z } from 'zod';

const router = Router();

// Helper to safely get jti from authenticated user
const getJti = (req: Request): string => (req.user as any)?.jti;

// Validation schemas
const invalidateSessionSchema = z.object({
  sessionId: z.string().min(1, 'Session ID is required')
});

const bulkInvalidateSchema = z.object({
  sessionIds: z.array(z.string()).min(1, 'At least one session ID is required')
});

/**
 * Get all active sessions for the current user
 */
router.get('/', jwtAuth, asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const sessions = await sessionManager.getUserSessions(userId);
  
  // Add current session indicator
  const currentSessionId = getJti(req);
  const sessionsWithCurrent = sessions.map(session => ({
    ...session,
    isCurrent: session.id === currentSessionId
  }));

  sendSuccess(res, {
    sessions: sessionsWithCurrent,
    total: sessions.length
  });
}));

/**
 * Get current session details
 */
router.get('/current', jwtAuth, asyncHandler(async (req: Request, res: Response) => {
  const sessionId = getJti(req);
  const session = await sessionManager.getSessionById(sessionId);
  
  if (!session) {
    throw AppError.createNotFoundError('Current session not found', 'SESSION_NOT_FOUND');
  }

  sendSuccess(res, {
    session: {
      ...session,
      isCurrent: true
    }
  });
}));

/**
 * Invalidate a specific session
 */
router.delete('/:sessionId', jwtAuth, validateApiInput, asyncHandler(async (req: Request, res: Response) => {
  const { sessionId } = req.params;
  const userId = req.user!.id;
  const currentSessionId = getJti(req);

  // Verify the session belongs to the user
  const session = await sessionManager.getSessionById(sessionId);
  if (!session) {
    throw AppError.createNotFoundError('Session not found', 'SESSION_NOT_FOUND');
  }

  if (session.userId !== userId) {
    throw AppError.createAuthorizationError('Cannot invalidate another user\'s session', 'SESSION_ACCESS_DENIED');
  }

  // Prevent users from invalidating their current session via this endpoint
  if (sessionId === currentSessionId) {
    throw AppError.createValidationError('Cannot invalidate current session. Use logout instead.', 'CANNOT_INVALIDATE_CURRENT');
  }

  await sessionManager.invalidateSession(sessionId, `user_${userId}`);

  sendSuccess(res, {
    message: 'Session invalidated successfully',
    sessionId
  });
}));

/**
 * Invalidate multiple sessions
 */
router.post('/invalidate-bulk', jwtAuth, validateApiInput, asyncHandler(async (req: Request, res: Response) => {
  const { sessionIds } = req.body;
  const userId = req.user!.id;
  const currentSessionId = getJti(req);

  // Filter out current session
  const sessionsToInvalidate = sessionIds.filter((id: string) => id !== currentSessionId);
  
  if (sessionsToInvalidate.length === 0) {
    throw AppError.createValidationError('No valid sessions to invalidate', 'NO_SESSIONS_TO_INVALIDATE');
  }

  // Verify all sessions belong to the user
  const userSessions = await sessionManager.getUserSessions(userId);
  const userSessionIds = userSessions.map(s => s.id);
  
  const invalidSessionIds = sessionsToInvalidate.filter((id: string) => !userSessionIds.includes(id));
  if (invalidSessionIds.length > 0) {
    throw AppError.createValidationError(
      `Invalid session IDs: ${invalidSessionIds.join(', ')}`,
      'INVALID_SESSION_IDS'
    );
  }

  // Invalidate sessions
  const results = await Promise.allSettled(
    sessionsToInvalidate.map((sessionId: string) => 
      sessionManager.invalidateSession(sessionId, `user_${userId}`)
    )
  );

  const successful = results.filter(r => r.status === 'fulfilled').length;
  const failed = results.filter(r => r.status === 'rejected').length;

  sendSuccess(res, {
    message: `${successful} sessions invalidated successfully`,
    successful,
    failed,
    total: sessionsToInvalidate.length
  });
}));

/**
 * Invalidate all other sessions (keep current session active)
 */
router.post('/invalidate-others', jwtAuth, asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const currentSessionId = getJti(req);

  const invalidatedCount = await sessionManager.invalidateAllUserSessions(
    userId,
    `user_${userId}_invalidate_others`,
    currentSessionId
  );

  sendSuccess(res, {
    message: `${invalidatedCount} other sessions invalidated successfully`,
    invalidatedCount
  });
}));

/**
 * Get session statistics (admin or for monitoring)
 */
router.get('/stats', jwtAuth, asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.id;
  
  // Get user-specific stats
  const userSessions = await sessionManager.getUserSessions(userId);
  const activeCount = userSessions.filter(s => s.isActive).length;
  
  // Calculate session age distribution
  const now = new Date();
  const sessionAges = userSessions.map(s => {
    const ageHours = (now.getTime() - s.issuedAt.getTime()) / (1000 * 60 * 60);
    return Math.round(ageHours * 100) / 100;
  });

  const avgAge = sessionAges.length > 0 
    ? sessionAges.reduce((a, b) => a + b, 0) / sessionAges.length 
    : 0;

  // Device type distribution
  const deviceTypes = userSessions.reduce((acc, session) => {
    const deviceType = session.deviceInfo.deviceType || 'unknown';
    acc[deviceType] = (acc[deviceType] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  sendSuccess(res, {
    userStats: {
      totalSessions: userSessions.length,
      activeSessions: activeCount,
      averageSessionAgeHours: Math.round(avgAge * 100) / 100,
      deviceTypes,
      oldestSession: sessionAges.length > 0 ? Math.max(...sessionAges) : 0,
      newestSession: sessionAges.length > 0 ? Math.min(...sessionAges) : 0
    }
  });
}));

/**
 * Force logout from all devices (invalidate all sessions including current)
 */
router.post('/logout-all', jwtAuth, asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.id;

  const invalidatedCount = await sessionManager.invalidateAllUserSessions(
    userId,
    `user_${userId}_logout_all`
  );

  sendSuccess(res, {
    message: 'Logged out from all devices successfully',
    invalidatedCount
  });
}));

export default router;