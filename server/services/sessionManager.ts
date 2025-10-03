import { db } from '../db';
import { jwtTokens, users } from '@shared/schema';
import { eq, and, lt, desc, count, sql } from 'drizzle-orm';
import { jwtService } from '../jwt';
import crypto from 'crypto';

export interface SessionInfo {
  id: string;
  userId: number;
  deviceInfo: DeviceInfo;
  ipAddress: string;
  issuedAt: Date;
  expiresAt: Date;
  lastActivity: Date;
  isActive: boolean;
}

export interface DeviceInfo {
  userAgent?: string;
  platform?: string;
  browser?: string;
  os?: string;
  deviceType?: 'desktop' | 'mobile' | 'tablet';
}

export interface SessionLimits {
  maxConcurrentSessions: number;
  sessionTimeoutMinutes: number;
  refreshTokenExpiryDays: number;
}

export interface SecurityEvent {
  type: 'PASSWORD_CHANGE' | 'ACCOUNT_LOCKED' | 'SUSPICIOUS_LOGIN' | 'ADMIN_ACTION';
  userId: number;
  details?: Record<string, any>;
  timestamp: Date;
}

export class SessionManager {
  private readonly defaultLimits: SessionLimits = {
    maxConcurrentSessions: 5, // Default limit for concurrent sessions
    sessionTimeoutMinutes: 15, // Access token timeout
    refreshTokenExpiryDays: 7, // Refresh token expiry
  };

  /**
   * Create a new session with device tracking
   */
  async createSession(
    userId: number,
    deviceInfo: DeviceInfo,
    ipAddress: string,
    limits?: Partial<SessionLimits>
  ): Promise<{ accessToken: string; refreshToken: string; sessionId: string }> {
    const sessionLimits = { ...this.defaultLimits, ...limits };
    
    // Check concurrent session limits
    await this.enforceConcurrentSessionLimits(userId, sessionLimits.maxConcurrentSessions);
    
    // Get user info for token generation
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (!user) {
      throw new Error('User not found');
    }

    // Generate tokens with device info
    const tokens = await jwtService.generateTokens(
      { id: user.id, email: user.email, plan: user.plan },
      deviceInfo,
      ipAddress
    );

    // Extract session ID from refresh token
    const refreshPayload = await jwtService.validateToken(tokens.refreshToken, 'refresh');
    const sessionId = refreshPayload?.jti || crypto.randomBytes(16).toString('hex');

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      sessionId
    };
  }

  /**
   * Get all active sessions for a user
   */
  async getUserSessions(userId: number): Promise<SessionInfo[]> {
    const sessions = await db
      .select()
      .from(jwtTokens)
      .where(
        and(
          eq(jwtTokens.userId, userId),
          eq(jwtTokens.tokenType, 'refresh'),
          eq(jwtTokens.isRevoked, false),
          sql`${jwtTokens.expiresAt} > ${new Date().toISOString()}`
        )
      )
      .orderBy(desc(jwtTokens.issuedAt));

    return sessions.map(session => ({
      id: session.id,
      userId: session.userId,
      deviceInfo: session.deviceInfo ? JSON.parse(session.deviceInfo) : {},
      ipAddress: session.ipAddress ?? 'unknown',
      issuedAt: new Date(session.issuedAt),
      expiresAt: new Date(session.expiresAt),
      lastActivity: new Date(session.issuedAt), // TODO: Track last activity separately
      isActive: !session.isRevoked
    }));
  }

  /**
   * Invalidate a specific session
   * 
   * Revokes both the refresh token (session) and associated access tokens.
   * 
   * The challenge: Access tokens and refresh tokens are issued together, but we only
   * store the refresh token ID as the "session ID". To fully invalidate a session,
   * we need to also revoke the access token that was issued at the same time.
   * 
   * Solution: Use a time window approach - revoke all access tokens for this user
   * that were issued within ±1 minute of the refresh token. This handles:
   * - Clock skew between servers
   * - Slight delays in token generation
   * - Multiple tokens issued in quick succession
   * 
   * Edge case: If a user logs in twice within 1 minute, this might revoke both
   * access tokens. This is acceptable as it errs on the side of security.
   */
  async invalidateSession(sessionId: string, revokedBy?: string): Promise<void> {
    // First, revoke the refresh token (the session itself)
    await jwtService.revokeToken(sessionId, revokedBy);
    
    // Then find and revoke associated access tokens
    const [refreshToken] = await db
      .select()
      .from(jwtTokens)
      .where(eq(jwtTokens.id, sessionId));

    if (refreshToken) {
      // Define a time window around when the refresh token was issued
      const timeWindow = 60000; // 1 minute window (±30 seconds)
      const issuedTime = new Date(refreshToken.issuedAt);
      const windowStart = new Date(issuedTime.getTime() - timeWindow);
      const windowEnd = new Date(issuedTime.getTime() + timeWindow);

      // Revoke all access tokens for this user issued within the time window
      // This catches the access token that was issued alongside this refresh token
      await db
        .update(jwtTokens)
        .set({
          isRevoked: true,
          revokedAt: new Date().toISOString(),
          revokedBy: revokedBy ?? 'session_invalidation'
        })
        .where(
          and(
            eq(jwtTokens.userId, refreshToken.userId),
            eq(jwtTokens.tokenType, 'access'),
            eq(jwtTokens.isRevoked, false),
            sql`${jwtTokens.issuedAt} > ${windowStart.toISOString()}`,
            sql`${jwtTokens.issuedAt} < ${windowEnd.toISOString()}`
          )
        );
    }
  }

  /**
   * Invalidate all sessions for a user (useful for password changes, security events)
   */
  async invalidateAllUserSessions(userId: number, reason: string, excludeSessionId?: string): Promise<number> {
    const conditions = [
      eq(jwtTokens.userId, userId),
      eq(jwtTokens.isRevoked, false)
    ];

    // Exclude current session if specified
    if (excludeSessionId) {
      conditions.push(eq(jwtTokens.id, excludeSessionId));
    }

    const result = await db
      .update(jwtTokens)
      .set({
        isRevoked: true,
        revokedAt: new Date().toISOString(),
        revokedBy: reason
      })
      .where(excludeSessionId ? and(...conditions.slice(0, -1)) : and(...conditions.slice(0, -1)));

    return result.rowCount || 0;
  }

  /**
   * Handle security events that require session invalidation
   */
  async handleSecurityEvent(event: SecurityEvent): Promise<void> {
    console.log(`🔒 Handling security event: ${event.type} for user ${event.userId}`);
    
    switch (event.type) {
      case 'PASSWORD_CHANGE':
        // Invalidate all sessions except current one if provided
        const excludeSession = event.details?.currentSessionId;
        await this.invalidateAllUserSessions(
          event.userId, 
          'password_change',
          excludeSession
        );
        break;

      case 'ACCOUNT_LOCKED':
        // Invalidate all sessions immediately
        await this.invalidateAllUserSessions(event.userId, 'account_locked');
        break;

      case 'SUSPICIOUS_LOGIN':
        // Log the event but don't invalidate sessions automatically
        console.warn(`Suspicious login detected for user ${event.userId}:`, event.details);
        break;

      case 'ADMIN_ACTION':
        // Admin-initiated session termination
        if (event.details?.sessionId) {
          await this.invalidateSession(event.details.sessionId, 'admin_action');
        } else {
          await this.invalidateAllUserSessions(event.userId, 'admin_action');
        }
        break;

      default:
        console.warn(`Unknown security event type: ${event.type}`);
    }
  }

  /**
   * Enforce concurrent session limits
   * 
   * Prevents users from having too many active sessions simultaneously, which:
   * - Reduces risk of account sharing
   * - Limits damage from stolen credentials
   * - Prevents resource exhaustion
   * 
   * When the limit is exceeded, we revoke the oldest sessions first (LRU strategy).
   * This ensures the user's current/active sessions remain valid while cleaning up
   * forgotten or abandoned sessions.
   */
  private async enforceConcurrentSessionLimits(userId: number, maxSessions: number): Promise<void> {
    const activeSessions = await this.getUserSessions(userId);
    
    // Only enforce if user has reached or exceeded the limit
    if (activeSessions.length >= maxSessions) {
      // Calculate how many sessions need to be revoked
      // We add 1 because we're about to create a new session
      const sessionsToRevokeCount = activeSessions.length - maxSessions + 1;
      
      // Sort by last activity (oldest first) - LRU (Least Recently Used) eviction
      // This preserves the user's most recent/active sessions
      const sessionsToRevoke = activeSessions
        .sort((a, b) => a.lastActivity.getTime() - b.lastActivity.getTime())
        .slice(0, sessionsToRevokeCount);

      // Revoke each old session
      for (const session of sessionsToRevoke) {
        await this.invalidateSession(session.id, 'concurrent_limit_exceeded');
      }
    }
  }

  /**
   * Clean up expired sessions
   */
  async cleanupExpiredSessions(): Promise<number> {
    const now = new Date().toISOString();
    
    const result = await db
      .update(jwtTokens)
      .set({
        isRevoked: true,
        revokedAt: now,
        revokedBy: 'expired'
      })
      .where(
        and(
          lt(jwtTokens.expiresAt, now),
          eq(jwtTokens.isRevoked, false)
        )
      );

    const cleanedCount = result.rowCount || 0;
    if (cleanedCount > 0) {
      console.log(`🧹 Cleaned up ${cleanedCount} expired sessions`);
    }
    
    return cleanedCount;
  }

  /**
   * Get session statistics for monitoring
   */
  async getSessionStats(): Promise<{
    totalActiveSessions: number;
    totalUsers: number;
    averageSessionsPerUser: number;
    expiredSessionsToday: number;
  }> {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Active sessions count
    const [activeSessionsResult] = await db
      .select({ count: count() })
      .from(jwtTokens)
      .where(
        and(
          eq(jwtTokens.tokenType, 'refresh'),
          eq(jwtTokens.isRevoked, false),
          sql`${jwtTokens.expiresAt} > ${now.toISOString()}`
        )
      );

    // Unique users with active sessions
    const uniqueUsersResult = await db
      .selectDistinct({ userId: jwtTokens.userId })
      .from(jwtTokens)
      .where(
        and(
          eq(jwtTokens.tokenType, 'refresh'),
          eq(jwtTokens.isRevoked, false),
          sql`${jwtTokens.expiresAt} > ${now.toISOString()}`
        )
      );

    // Expired sessions today
    const [expiredTodayResult] = await db
      .select({ count: count() })
      .from(jwtTokens)
      .where(
        and(
          eq(jwtTokens.isRevoked, true),
          eq(jwtTokens.revokedBy, 'expired'),
          sql`${jwtTokens.revokedAt} > ${todayStart.toISOString()}`
        )
      );

    const totalActiveSessions = activeSessionsResult.count as number;
    const totalUsers = uniqueUsersResult.length;
    const averageSessionsPerUser = totalUsers > 0 ? totalActiveSessions / totalUsers : 0;
    const expiredSessionsToday = expiredTodayResult.count as number;

    return {
      totalActiveSessions,
      totalUsers,
      averageSessionsPerUser: Math.round(averageSessionsPerUser * 100) / 100,
      expiredSessionsToday
    };
  }

  /**
   * Parse device information from User-Agent string
   * 
   * Extracts platform, browser, and device type from the User-Agent header.
   * This information is used for:
   * - Session tracking and management
   * - Security monitoring (detecting unusual device patterns)
   * - Analytics and user experience optimization
   * 
   * Note: User-Agent parsing is heuristic-based and not 100% accurate.
   * Modern browsers may send simplified or standardized User-Agent strings.
   */
  static parseDeviceInfo(userAgent?: string): DeviceInfo {
    if (!userAgent) {
      return { deviceType: 'desktop' };
    }

    const deviceInfo: DeviceInfo = { userAgent };

    // Detect platform/OS using regex patterns
    // Order matters: check more specific patterns first
    if (/Windows/i.test(userAgent)) {
      deviceInfo.platform = 'Windows';
      deviceInfo.os = 'Windows';
    } else if (/Mac OS X/i.test(userAgent)) {
      deviceInfo.platform = 'macOS';
      deviceInfo.os = 'macOS';
    } else if (/Linux/i.test(userAgent)) {
      deviceInfo.platform = 'Linux';
      deviceInfo.os = 'Linux';
    } else if (/Android/i.test(userAgent)) {
      deviceInfo.platform = 'Android';
      deviceInfo.os = 'Android';
    } else if (/iOS/i.test(userAgent)) {
      deviceInfo.platform = 'iOS';
      deviceInfo.os = 'iOS';
    }

    // Detect browser
    // Note: Chrome check must exclude Edge since Edge contains "Chrome" in UA
    // Safari check must exclude Chrome since Chrome contains "Safari" in UA
    if (/Chrome/i.test(userAgent) && !/Edge/i.test(userAgent)) {
      deviceInfo.browser = 'Chrome';
    } else if (/Firefox/i.test(userAgent)) {
      deviceInfo.browser = 'Firefox';
    } else if (/Safari/i.test(userAgent) && !/Chrome/i.test(userAgent)) {
      deviceInfo.browser = 'Safari';
    } else if (/Edge/i.test(userAgent)) {
      deviceInfo.browser = 'Edge';
    }

    // Detect device type based on keywords in User-Agent
    // Mobile and tablet detection helps with responsive design and security policies
    if (/Mobile/i.test(userAgent) || /Android/i.test(userAgent) || /iPhone/i.test(userAgent)) {
      deviceInfo.deviceType = 'mobile';
    } else if (/Tablet/i.test(userAgent) || /iPad/i.test(userAgent)) {
      deviceInfo.deviceType = 'tablet';
    } else {
      deviceInfo.deviceType = 'desktop';
    }

    return deviceInfo;
  }

  /**
   * Update session activity (for tracking last activity)
   */
  async updateSessionActivity(sessionId: string): Promise<void> {
    // For now, we'll track this in memory or could add a separate table
    // This is a placeholder for future enhancement
    console.debug(`Session activity updated for: ${sessionId}`);
  }

  /**
   * Get session by ID with full details
   */
  async getSessionById(sessionId: string): Promise<SessionInfo | null> {
    const [session] = await db
      .select()
      .from(jwtTokens)
      .where(eq(jwtTokens.id, sessionId));

    if (!session) {
      return null;
    }

    return {
      id: session.id,
      userId: session.userId,
      deviceInfo: session.deviceInfo ? JSON.parse(session.deviceInfo) : {},
      ipAddress: session.ipAddress ?? 'unknown',
      issuedAt: new Date(session.issuedAt),
      expiresAt: new Date(session.expiresAt),
      lastActivity: new Date(session.issuedAt), // TODO: Track separately
      isActive: !session.isRevoked
    };
  }

  /**
   * Get count of active sessions across all users
   */
  async getActiveSessionsCount(): Promise<number> {
    const now = new Date();
    const [result] = await db
      .select({ count: count() })
      .from(jwtTokens)
      .where(
        and(
          eq(jwtTokens.tokenType, 'access'),
          eq(jwtTokens.isRevoked, false),
          sql`${jwtTokens.expiresAt} > ${now.toISOString()}`
        )
      );
    
    return result.count;
  }

}

export const sessionManager = new SessionManager();