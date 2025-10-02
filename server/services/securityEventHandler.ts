import { sessionManager, SecurityEvent } from './sessionManager';
import { authService } from '../auth';
import { db } from '../db';
import { users } from '@shared/schema';
import { eq } from 'drizzle-orm';

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
  async handleSuccessfulLogin(userId: number): Promise<void> {
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
}

export const securityEventHandler = new SecurityEventHandler();