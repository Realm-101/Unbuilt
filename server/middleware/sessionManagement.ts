import type { Request, Response, NextFunction } from 'express';
import { sessionManager, SessionManager } from '../services/sessionManager';
import { AppError } from './errorHandler';

// Extend Express Request type to include session info
declare global {
  namespace Express {
    interface Request {
      sessionInfo?: {
        id: string;
        deviceInfo: any;
        ipAddress: string;
        issuedAt: Date;
        expiresAt: Date;
      };
    }
  }
}

/**
 * Session tracking middleware
 * Tracks session activity and device information
 */
export const trackSession = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // Only track if user is authenticated
    if (!req.user || !req.user.jti) {
      return next();
    }

    const sessionId = req.user.jti;
    const deviceInfo = SessionManager.parseDeviceInfo(req.headers['user-agent']);
    const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';

    // Get session details
    const sessionInfo = await sessionManager.getSessionById(sessionId);
    if (sessionInfo) {
      req.sessionInfo = {
        id: sessionInfo.id,
        deviceInfo: sessionInfo.deviceInfo,
        ipAddress: sessionInfo.ipAddress,
        issuedAt: sessionInfo.issuedAt,
        expiresAt: sessionInfo.expiresAt
      };

      // Update session activity
      await sessionManager.updateSessionActivity(sessionId);
    }

    next();
  } catch (error) {
    console.error('Session tracking error:', error);
    // Don't fail the request for session tracking errors
    next();
  }
};

/**
 * Concurrent session limit enforcement middleware
 */
export const enforceConcurrentSessions = (maxSessions: number = 5) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        return next();
      }

      const activeSessions = await sessionManager.getUserSessions(req.user.id);
      
      if (activeSessions.length > maxSessions) {
        // This shouldn't happen if limits are enforced at login, but handle it
        console.warn(`User ${req.user.id} has ${activeSessions.length} active sessions, limit is ${maxSessions}`);
        
        // Could optionally revoke oldest sessions here
        // For now, just log the warning
      }

      next();
    } catch (error) {
      console.error('Concurrent session enforcement error:', error);
      next();
    }
  };
};

/**
 * Session security monitoring middleware
 * Detects suspicious session activity
 */
export const monitorSessionSecurity = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user || !req.sessionInfo) {
      return next();
    }

    const currentIp = req.ip || req.connection.remoteAddress || 'unknown';
    const sessionIp = req.sessionInfo.ipAddress;

    // Check for IP address changes (potential session hijacking)
    if (sessionIp !== 'unknown' && currentIp !== sessionIp) {
      console.warn(`⚠️ IP address change detected for user ${req.user.id}: ${sessionIp} -> ${currentIp}`);
      
      // Could implement additional security measures here:
      // - Force re-authentication
      // - Send security alert email
      // - Invalidate session
      
      // For now, just log the event
      await sessionManager.handleSecurityEvent({
        type: 'SUSPICIOUS_LOGIN',
        userId: req.user.id,
        details: {
          originalIp: sessionIp,
          currentIp: currentIp,
          sessionId: req.sessionInfo.id,
          userAgent: req.headers['user-agent']
        },
        timestamp: new Date()
      });
    }

    next();
  } catch (error) {
    console.error('Session security monitoring error:', error);
    next();
  }
};

/**
 * Session cleanup middleware (for periodic cleanup)
 * Should be called on a schedule, not on every request
 */
export const performSessionCleanup = async (): Promise<void> => {
  try {
    const cleanedCount = await sessionManager.cleanupExpiredSessions();
    if (cleanedCount > 0) {
      console.log(`🧹 Session cleanup completed: ${cleanedCount} expired sessions removed`);
    }
  } catch (error) {
    console.error('Session cleanup error:', error);
  }
};

/**
 * Middleware to require fresh authentication for sensitive operations
 */
export const requireFreshSession = (maxAgeMinutes: number = 30) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.sessionInfo) {
      return next(AppError.createAuthenticationError('Session information not available', 'SESSION_INFO_MISSING'));
    }

    const sessionAge = Date.now() - req.sessionInfo.issuedAt.getTime();
    const maxAgeMs = maxAgeMinutes * 60 * 1000;

    if (sessionAge > maxAgeMs) {
      return next(AppError.createAuthenticationError(
        'Fresh authentication required for this operation',
        'FRESH_AUTH_REQUIRED'
      ));
    }

    next();
  };
};

/**
 * Device-based session validation
 * Ensures session is being used from the same device type
 */
export const validateDeviceConsistency = (strict: boolean = false) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.sessionInfo) {
      return next();
    }

    const currentDevice = SessionManager.parseDeviceInfo(req.headers['user-agent']);
    const sessionDevice = req.sessionInfo.deviceInfo;

    // Compare device characteristics
    const deviceMismatch = 
      (sessionDevice.platform && currentDevice.platform !== sessionDevice.platform) ||
      (sessionDevice.browser && currentDevice.browser !== sessionDevice.browser);

    if (deviceMismatch) {
      console.warn(`Device mismatch detected for user ${req.user?.id}:`, {
        session: sessionDevice,
        current: currentDevice
      });

      if (strict) {
        return next(AppError.createAuthenticationError(
          'Device validation failed',
          'DEVICE_MISMATCH'
        ));
      }

      // Log security event for monitoring
      if (req.user) {
        sessionManager.handleSecurityEvent({
          type: 'SUSPICIOUS_LOGIN',
          userId: req.user.id,
          details: {
            sessionDevice,
            currentDevice,
            sessionId: req.sessionInfo.id
          },
          timestamp: new Date()
        }).catch(console.error);
      }
    }

    next();
  };
};