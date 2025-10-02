import { Router } from 'express';
import { securityEventHandler } from '../services/securityEventHandler';
import { jwtAuth, requireRole } from '../middleware/jwtAuth';
import { requireFreshSession } from '../middleware/sessionManagement';
import { AppError, asyncHandler, sendSuccess } from '../middleware/errorHandler';
import { validateApiInput } from '../middleware/validation';
import { z } from 'zod';

const router = Router();

// Validation schemas
const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(6, 'New password must be at least 6 characters'),
  confirmPassword: z.string().min(6, 'Password confirmation is required')
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "New passwords don't match",
  path: ["confirmPassword"],
});

const lockAccountSchema = z.object({
  userId: z.number().int().positive('Valid user ID is required'),
  reason: z.string().min(1, 'Reason is required')
});

const unlockAccountSchema = z.object({
  userId: z.number().int().positive('Valid user ID is required')
});

const terminateSessionSchema = z.object({
  userId: z.number().int().positive('Valid user ID is required'),
  sessionId: z.string().optional(),
  reason: z.string().optional()
});

/**
 * POST /api/security/change-password
 * Change user password and invalidate other sessions
 */
router.post('/change-password', 
  jwtAuth, 
  requireFreshSession(30), // Require fresh authentication within 30 minutes
  validateApiInput(changePasswordSchema), 
  asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user!.id;
    const currentSessionId = req.user!.jti;

    try {
      const result = await securityEventHandler.handlePasswordChange({
        userId,
        currentPassword,
        newPassword,
        currentSessionId
      });

      sendSuccess(res, result);
    } catch (error: any) {
      if (error.message === 'Current password is incorrect') {
        throw AppError.createAuthenticationError('Current password is incorrect', 'INVALID_CURRENT_PASSWORD');
      }
      throw AppError.createSystemError('Failed to change password', 'PASSWORD_CHANGE_FAILED');
    }
  })
);

/**
 * POST /api/security/lock-account
 * Lock a user account (admin only)
 */
router.post('/lock-account', 
  jwtAuth, 
  requireRole(['admin', 'enterprise']),
  validateApiInput(lockAccountSchema),
  asyncHandler(async (req, res) => {
    const { userId, reason } = req.body;
    const adminUserId = req.user!.id;

    // Prevent admin from locking their own account
    if (userId === adminUserId) {
      throw AppError.createValidationError('Cannot lock your own account', 'CANNOT_LOCK_OWN_ACCOUNT');
    }

    const result = await securityEventHandler.handleAccountLockout({
      userId,
      reason,
      lockedBy: `admin_${adminUserId}`
    });

    sendSuccess(res, result);
  })
);

/**
 * POST /api/security/unlock-account
 * Unlock a user account (admin only)
 */
router.post('/unlock-account', 
  jwtAuth, 
  requireRole(['admin', 'enterprise']),
  validateApiInput(unlockAccountSchema),
  asyncHandler(async (req, res) => {
    const { userId } = req.body;
    const adminUserId = req.user!.id;

    const result = await securityEventHandler.handleAccountUnlock(
      userId, 
      `admin_${adminUserId}`
    );

    sendSuccess(res, result);
  })
);

/**
 * POST /api/security/terminate-sessions
 * Terminate user sessions (admin only)
 */
router.post('/terminate-sessions', 
  jwtAuth, 
  requireRole(['admin', 'enterprise']),
  validateApiInput(terminateSessionSchema),
  asyncHandler(async (req, res) => {
    const { userId, sessionId, reason } = req.body;
    const adminUserId = req.user!.id;

    const result = await securityEventHandler.handleAdminSessionTermination(
      userId,
      adminUserId,
      sessionId,
      reason
    );

    sendSuccess(res, result);
  })
);

/**
 * GET /api/security/account-status/:userId
 * Check if an account is locked (admin only)
 */
router.get('/account-status/:userId', 
  jwtAuth, 
  requireRole(['admin', 'enterprise']),
  asyncHandler(async (req, res) => {
    const userId = parseInt(req.params.userId);
    
    if (isNaN(userId)) {
      throw AppError.createValidationError('Invalid user ID', 'INVALID_USER_ID');
    }

    const isLocked = await securityEventHandler.isAccountLocked(userId);

    sendSuccess(res, {
      userId,
      isLocked,
      status: isLocked ? 'locked' : 'active'
    });
  })
);

/**
 * GET /api/security/my-account-status
 * Check current user's account status
 */
router.get('/my-account-status', 
  jwtAuth,
  asyncHandler(async (req, res) => {
    const userId = req.user!.id;
    const isLocked = await securityEventHandler.isAccountLocked(userId);

    sendSuccess(res, {
      userId,
      isLocked,
      status: isLocked ? 'locked' : 'active'
    });
  })
);

export default router;