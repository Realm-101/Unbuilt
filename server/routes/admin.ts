import { Router, Request, Response } from 'express';
import { jwtAuth } from '../middleware/jwtAuth';
import { 
  requireAdmin, 
  requireSuperAdmin, 
  requirePermission,
  addUserAuthorization,
  logAuthorizationEvent
} from '../middleware/authorization';
import { validateUserProfileAccess } from '../middleware/resourceOwnership';
import { Permission } from '../services/authorizationService';
import { storage } from '../storage';
import { sessionManager } from '../services/sessionManager';
import { securityEventHandler } from '../services/securityEventHandler';
import bcrypt from 'bcrypt';
import { 
  AppError, 
  asyncHandler, 
  sendSuccess
} from '../middleware/errorHandler';

const router = Router();

// Apply JWT auth and authorization to all admin routes
router.use(jwtAuth);
router.use(addUserAuthorization);

/**
 * GET /api/admin/users
 * Get all users (admin only)
 */
router.get('/users', 
  requirePermission(Permission.MANAGE_USERS),
  logAuthorizationEvent('view_all_users'),
  asyncHandler(async (req: Request, res: Response) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const search = req.query.search as string;

    // Get users with pagination
    const users = await storage.getAllUsers({
      page,
      limit,
      search
    });

    // Remove sensitive information
    const sanitizedUsers = users.map(user => ({
      id: user.id,
      email: user.email,
      name: user.name,
      plan: user.plan,
      isActive: user.isActive,
      createdAt: user.createdAt,
      lastResetDate: user.lastResetDate,
      searchCount: user.searchCount,
      failedLoginAttempts: user.failedLoginAttempts,
      accountLocked: user.accountLocked,
      lockoutExpires: user.lockoutExpires
    }));

    sendSuccess(res, {
      users: sanitizedUsers,
      pagination: {
        page,
        limit,
        total: users.length
      }
    });
  })
);

/**
 * GET /api/admin/users/:id
 * Get specific user details (admin only)
 */
router.get('/users/:id',
  requirePermission(Permission.READ_USER_DATA),
  logAuthorizationEvent('view_user_details'),
  asyncHandler(async (req: Request, res: Response) => {
    const userId = parseInt(req.params.id);
    
    if (isNaN(userId)) {
      throw AppError.createValidationError('Invalid user ID', 'INVALID_USER_ID');
    }

    const user = await storage.getUser(userId.toString());
    
    if (!user) {
      throw AppError.createNotFoundError('User not found', 'USER_NOT_FOUND');
    }

    // Get user's sessions
    const sessions = await sessionManager.getUserSessions(userId);
    
    // Get user's recent activity
    const searches = await storage.getSearches(userId.toString());
    const ideas = await storage.getIdeas(String(userId));

    sendSuccess(res, {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        plan: user.plan,
        isActive: user.isActive,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        lastResetDate: user.lastResetDate,
        searchCount: user.searchCount,
        failedLoginAttempts: user.failedLoginAttempts,
        accountLocked: user.accountLocked,
        lockoutExpires: user.lockoutExpires,
        preferences: user.preferences
      },
      sessions: sessions.length,
      activeSessions: sessions.filter(s => s.isActive).length,
      totalSearches: searches.length,
      totalIdeas: ideas.length
    });
  })
);

/**
 * PUT /api/admin/users/:id
 * Update user details (super admin only)
 */
router.put('/users/:id',
  requirePermission(Permission.WRITE_USER_DATA),
  logAuthorizationEvent('update_user'),
  asyncHandler(async (req: Request, res: Response) => {
    const userId = parseInt(req.params.id);
    
    if (isNaN(userId)) {
      throw AppError.createValidationError('Invalid user ID', 'INVALID_USER_ID');
    }

    const { name, plan, isActive } = req.body;
    
    const existingUser = await storage.getUser(userId.toString());
    if (!existingUser) {
      throw AppError.createNotFoundError('User not found', 'USER_NOT_FOUND');
    }

    // Update user
    const updatedUser = await storage.upsertUser({
      ...existingUser,
      name: name || existingUser.name,
      plan: plan || existingUser.plan,
      isActive: isActive !== undefined ? isActive : existingUser.isActive
    });

    sendSuccess(res, {
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        name: updatedUser.name,
        plan: updatedUser.plan,
        isActive: updatedUser.isActive,
        updatedAt: updatedUser.updatedAt
      }
    }, 'User updated successfully');
  })
);

/**
 * POST /api/admin/users/:id/unlock
 * Unlock user account (admin only)
 */
router.post('/users/:id/unlock',
  requirePermission(Permission.MANAGE_USERS),
  logAuthorizationEvent('unlock_user_account'),
  asyncHandler(async (req: Request, res: Response) => {
    const userId = parseInt(req.params.id);
    
    if (isNaN(userId)) {
      throw AppError.createValidationError('Invalid user ID', 'INVALID_USER_ID');
    }

    await securityEventHandler.unlockAccount(userId);

    sendSuccess(res, null, 'User account unlocked successfully');
  })
);

/**
 * POST /api/admin/users/:id/reset-password
 * Reset user password (super admin only)
 */
router.post('/users/:id/reset-password',
  requireSuperAdmin,
  logAuthorizationEvent('admin_reset_password'),
  asyncHandler(async (req: Request, res: Response) => {
    const userId = parseInt(req.params.id);
    
    if (isNaN(userId)) {
      throw AppError.createValidationError('Invalid user ID', 'INVALID_USER_ID');
    }

    const { newPassword } = req.body;
    
    if (!newPassword || newPassword.length < 6) {
      throw AppError.createValidationError('Password must be at least 6 characters', 'INVALID_PASSWORD');
    }

    // Import auth service
    const { authService } = await import('../auth');
    
    const user = await storage.getUser(userId.toString());
    if (!user) {
      throw AppError.createNotFoundError('User not found', 'USER_NOT_FOUND');
    }

    // Update password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await storage.upsertUser({
      ...user,
      password: hashedPassword,
      lastPasswordChange: new Date().toISOString(),
      forcePasswordChange: false
    });

    // Invalidate all user sessions
    await sessionManager.invalidateAllUserSessions(userId, `admin_${req.user!.id}_password_reset`);

    sendSuccess(res, null, 'Password reset successfully. User will need to log in again.');
  })
);

/**
 * DELETE /api/admin/users/:id/sessions
 * Invalidate all user sessions (admin only)
 */
router.delete('/users/:id/sessions',
  requirePermission(Permission.MANAGE_USERS),
  logAuthorizationEvent('invalidate_user_sessions'),
  asyncHandler(async (req: Request, res: Response) => {
    const userId = parseInt(req.params.id);
    
    if (isNaN(userId)) {
      throw AppError.createValidationError('Invalid user ID', 'INVALID_USER_ID');
    }

    const invalidatedCount = await sessionManager.invalidateAllUserSessions(
      userId, 
      `admin_${req.user!.id}_session_invalidation`
    );

    sendSuccess(res, {
      invalidatedSessions: invalidatedCount
    }, 'All user sessions invalidated successfully');
  })
);

/**
 * GET /api/admin/analytics
 * Get system analytics (admin only)
 */
router.get('/analytics',
  requirePermission(Permission.VIEW_ANALYTICS),
  logAuthorizationEvent('view_system_analytics'),
  asyncHandler(async (req: Request, res: Response) => {
    // Get system statistics
    const stats = await storage.getSystemStats();
    
    // Get active sessions count
    const activeSessions = await sessionManager.getActiveSessionsCount();
    
    // Get recent security events
    const securityEvents = await securityEventHandler.getRecentEvents(50);

    sendSuccess(res, {
      stats,
      activeSessions,
      securityEvents: securityEvents.length,
      timestamp: new Date().toISOString()
    });
  })
);

/**
 * GET /api/admin/security-logs
 * Get security logs (admin only)
 */
router.get('/security-logs',
  requirePermission(Permission.VIEW_SECURITY_LOGS),
  logAuthorizationEvent('view_security_logs'),
  asyncHandler(async (req: Request, res: Response) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 100;
    const eventType = req.query.eventType as string;

    const events = await securityEventHandler.getSecurityEvents({
      page,
      limit,
      eventType
    });

    sendSuccess(res, {
      events,
      pagination: {
        page,
        limit,
        total: events.length
      }
    });
  })
);

/**
 * POST /api/admin/system/maintenance
 * Perform system maintenance tasks (super admin only)
 */
router.post('/system/maintenance',
  requireSuperAdmin,
  logAuthorizationEvent('system_maintenance'),
  asyncHandler(async (req: Request, res: Response) => {
    const { task } = req.body;
    
    let result;
    
    switch (task) {
      case 'cleanup_sessions':
        result = await sessionManager.cleanupExpiredSessions();
        break;
      case 'cleanup_tokens':
        const { jwtService } = await import('../jwt');
        result = await jwtService.cleanupExpiredTokens();
        break;
      default:
        throw AppError.createValidationError('Invalid maintenance task', 'INVALID_TASK');
    }

    sendSuccess(res, {
      task,
      result,
      timestamp: new Date().toISOString()
    }, 'Maintenance task completed successfully');
  })
);

export default router;