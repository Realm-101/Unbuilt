import { sessionManager, SecurityEvent } from './sessionManager';
import { authService } from '../auth';
import { db } from '../db';
import { users } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { securityLogger } from './securityLogger';

export interface PasswordChangeRequest {
  userId: number;
  currentPassword: string;
  newPassword: string;
  currentSessionId?: string;
}

export interface AccountLockRequest {
  userId: number;
  reason: string;
  lockedBy: string;
}

export class SecurityEventHandler {
  /**
   * Handle password change with session invalidation
   */
  async handlePasswordChange(request: PasswordChangeRequest): Promise<{
    success: boolean;
    invalidatedSessions: number;
    message: string;
  }> {
    const { userId, currentPassword, newPassword, currentSessionId } = request;

    // Get user and verify current password
    const user = await authService.getUserById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    if (!user.password) {
      throw new Error('User does not have a password set');
    }

    // Verify current password
    const isCurrentPasswordValid = await authService.verifyPassword(currentPassword, user.password);
    if (!isCurrentPasswordValid) {
      throw new Error('Current password is incorrect');
    }

    // Hash new password
    const hashedNewPassword = await authService.hashPassword(newPassword);

    // Update password in database
    await db
      .update(users)
      .set({
        password: hashedNewPassword,
        updatedAt: new Date().toISOString()
      })
      .where(eq(users.id, userId));

    // Handle security event - invalidate all sessions except current one
    const securityEvent: SecurityEvent = {
      type: 'PASSWORD_CHANGE',
      userId,
      details: {
        currentSessionId,
        timestamp: new Date().toISOString()
      },
      timestamp: new Date()
    };

    await sessionManager.handleSecurityEvent(securityEvent);

    // Log security event
    await securityLogger.logSecurityEvent(
      'PASSWORD_CHANGE',
      'password_change',
      true,
      {
        userId,
        metadata: {
          currentSessionId,
          hasCurrentSession: !!currentSessionId
        }
      }
    );

    // Count invalidated sessions
    const allSessions = await sessionManager.getUserSessions(userId);
    const invalidatedCount = currentSessionId 
      ? allSessions.filter(s => s.id !== currentSessionId).length
      : allSessions.length;

    return {
      success: true,
      invalidatedSessions: invalidatedCount,
      message: `Password changed successfully. ${invalidatedCount} other sessions have been logged out.`
    };
  }

  /**
   * Handle account lockout
   */
  async handleAccountLockout(request: AccountLockRequest): Promise<{
    success: boolean;
    invalidatedSessions: number;
    message: string;
  }> {
    const { userId, reason, lockedBy } = request;

    // Update user account status
    await db
      .update(users)
      .set({
        isActive: false,
        updatedAt: new Date().toISOString()
      })
      .where(eq(users.id, userId));

    // Handle security event - invalidate all sessions
    const securityEvent: SecurityEvent = {
      type: 'ACCOUNT_LOCKED',
      userId,
      details: {
        reason,
        lockedBy,
        timestamp: new Date().toISOString()
      },
      timestamp: new Date()
    };

    await sessionManager.handleSecurityEvent(securityEvent);

    // Log security event
    await securityLogger.logSecurityEvent(
      'ACCOUNT_LOCKED',
      'account_locked',
      true,
      {
        userId,
        metadata: {
          reason,
          lockedBy
        }
      }
    );

    // Count invalidated sessions
    const allSessions = await sessionManager.getUserSessions(userId);
    const invalidatedCount = allSessions.length;

    return {
      success: true,
      invalidatedSessions: invalidatedCount,
      message: `Account locked successfully. ${invalidatedCount} sessions have been terminated.`
    };
  }

  /**
   * Handle account unlock
   */
  async handleAccountUnlock(userId: number, unlockedBy: string): Promise<{
    success: boolean;
    message: string;
  }> {
    // Update user account status
    await db
      .update(users)
      .set({
        isActive: true,
        updatedAt: new Date().toISOString()
      })
      .where(eq(users.id, userId));

    // Log security event
    await securityLogger.logSecurityEvent(
      'ACCOUNT_UNLOCKED',
      'account_unlocked',
      true,
      {
        userId,
        metadata: {
          unlockedBy
        }
      }
    );

    console.log(`🔓 Account ${userId} unlocked by ${unlockedBy}`);

    return {
      success: true,
      message: 'Account unlocked successfully'
    };
  }

  /**
   * Handle suspicious activity detection
   */
  async handleSuspiciousActivity(
    userId: number, 
    activityType: string, 
    details: Record<string, any>
  ): Promise<void> {
    const securityEvent: SecurityEvent = {
      type: 'SUSPICIOUS_LOGIN',
      userId,
      details: {
        activityType,
        ...details,
        timestamp: new Date().toISOString()
      },
      timestamp: new Date()
    };

    await sessionManager.handleSecurityEvent(securityEvent);

    // Log security event
    await securityLogger.logSuspiciousActivity(
      `${activityType}: ${JSON.stringify(details)}`,
      {
        userId,
        metadata: {
          activityType,
          ...details
        }
      }
    );

    // Log for monitoring
    console.warn(`🚨 Suspicious activity detected for user ${userId}: ${activityType}`, details);
  }

  /**
   * Handle admin-initiated session termination
   */
  async handleAdminSessionTermination(
    targetUserId: number,
    adminUserId: number,
    sessionId?: string,
    reason?: string
  ): Promise<{
    success: boolean;
    invalidatedSessions: number;
    message: string;
  }> {
    const securityEvent: SecurityEvent = {
      type: 'ADMIN_ACTION',
      userId: targetUserId,
      details: {
        adminUserId,
        sessionId,
        reason: reason || 'Admin-initiated session termination',
        timestamp: new Date().toISOString()
      },
      timestamp: new Date()
    };

    await sessionManager.handleSecurityEvent(securityEvent);

    // Log security event
    await securityLogger.logSecurityEvent(
      'ADMIN_ACTION',
      'admin_session_termination',
      true,
      {
        userId: targetUserId,
        metadata: {
          adminUserId,
          sessionId,
          reason: reason || 'Admin-initiated session termination',
          targetUserId
        }
      }
    );

    // Count invalidated sessions
    let invalidatedCount = 0;
    if (sessionId) {
      invalidatedCount = 1;
    } else {
      const allSessions = await sessionManager.getUserSessions(targetUserId);
      invalidatedCount = allSessions.length;
    }

    return {
      success: true,
      invalidatedSessions: invalidatedCount,
      message: `Admin action completed. ${invalidatedCount} sessions terminated.`
    };
  }

  /**
   * Handle failed login attempts tracking
   */
  async handleFailedLoginAttempt(
    email: string,
    ipAddress: string,
    userAgent?: string
  ): Promise<void> {
    // Get user by email
    const user = await authService.getUserByEmail(email);
    if (!user) {
      // Don't reveal if user exists or not
      return;
    }

    // Update failed login attempts
    const currentAttempts = user.failedLoginAttempts || 0;
    const newAttempts = currentAttempts + 1;
    const maxAttempts = 5; // Configurable threshold

    await db
      .update(users)
      .set({
        failedLoginAttempts: newAttempts,
        lastFailedLogin: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      })
      .where(eq(users.id, user.id));

    // Lock account if too many failed attempts
    if (newAttempts >= maxAttempts) {
      const lockoutDuration = 30 * 60 * 1000; // 30 minutes
      const lockoutExpires = new Date(Date.now() + lockoutDuration);

      await db
        .update(users)
        .set({
          accountLocked: true,
          lockoutExpires: lockoutExpires.toISOString(),
          updatedAt: new Date().toISOString()
        })
        .where(eq(users.id, user.id));

      // Handle lockout as security event
      await this.handleAccountLockout({
        userId: user.id,
        reason: `Too many failed login attempts (${newAttempts})`,
        lockedBy: 'system'
      });

      console.warn(`🔒 Account ${user.email} locked due to ${newAttempts} failed login attempts`);
    }

    // Log authentication failure
    await securityLogger.logAuthenticationEvent(
      'AUTH_FAILURE',
      email,
      {
        userId: user.id,
        ipAddress,
        userAgent,
        metadata: {
          attemptCount: newAttempts,
          accountLocked: newAttempts >= maxAttempts,
          maxAttempts
        }
      },
      `Failed login attempt ${newAttempts}/${maxAttempts}`
    );

    // Log suspicious activity
    await this.handleSuspiciousActivity(user.id, 'failed_login', {
      email,
      ipAddress,
      userAgent,
      attemptCount: newAttempts,
      accountLocked: newAttempts >= maxAttempts
    });
  }

  /**
   * Handle successful login (reset failed attempts)
   */
  async handleSuccessfulLogin(userId: number, context?: { ipAddress?: string; userAgent?: string; userEmail?: string }): Promise<void> {
    // Reset failed login attempts
    await db
      .update(users)
      .set({
        failedLoginAttempts: 0,
        lastFailedLogin: null,
        accountLocked: false,
        lockoutExpires: null,
        updatedAt: new Date().toISOString()
      })
      .where(eq(users.id, userId));

    // Log successful authentication
    if (context) {
      await securityLogger.logAuthenticationEvent(
        'AUTH_SUCCESS',
        context.userEmail || 'unknown',
        {
          userId,
          ipAddress: context.ipAddress,
          userAgent: context.userAgent,
          metadata: {
            resetFailedAttempts: true
          }
        }
      );
    }
  }

  /**
   * Check if account is currently locked
   */
  async isAccountLocked(userId: number): Promise<boolean> {
    const user = await authService.getUserById(userId);
    if (!user) {
      return false;
    }

    // Check if account is locked and lockout hasn't expired
    if (user.accountLocked) {
      if (user.lockoutExpires) {
        const lockoutExpires = new Date(user.lockoutExpires);
        if (new Date() > lockoutExpires) {
          // Lockout has expired, unlock account
          await this.handleAccountUnlock(userId, 'system_auto_unlock');
          return false;
        }
      }
      return true;
    }

    return false;
  }

  /**
   * Get recent security events for monitoring
   */
  async getRecentEvents(limit: number = 50): Promise<any[]> {
    // This is a placeholder implementation
    // In a real system, you'd have a security_events table
    return [];
  }

  /**
   * Get security events with filtering
   */
  async getSecurityEvents(options: {
    page?: number;
    limit?: number;
    eventType?: string;
    userId?: number;
  } = {}): Promise<any[]> {
    // This is a placeholder implementation
    // In a real system, you'd query a security_events table
    const { page = 1, limit = 100, eventType, userId } = options;
    
    // Return empty array for now - would be implemented with proper security events table
    return [];
  }

  /**
   * Unlock a user account
   */
  async unlockAccount(userId: number): Promise<void> {
    await db
      .update(users)
      .set({
        accountLocked: false,
        lockoutExpires: null,
        failedLoginAttempts: 0,
        updatedAt: new Date().toISOString()
      })
      .where(eq(users.id, userId));

    console.log(`🔓 Account unlocked for user ${userId}`);
  }

  /**
   * Log authorization event for security monitoring
   */
  async logAuthorizationEvent(event: {
    userId: number;
    action: string;
    resource: string;
    timestamp: Date;
    success: boolean;
    details?: Record<string, any>;
  }): Promise<void> {
    await securityLogger.logAuthorizationEvent(
      event.resource,
      event.action,
      event.success,
      {
        userId: event.userId,
        metadata: event.details
      },
      event.success ? undefined : `Authorization failed for ${event.action} on ${event.resource}`
    );
  }
}

export const securityEventHandler = new SecurityEventHandler();