import { db } from '../db';
import { securityAuditLogs, securityAlerts, users } from '@shared/schema';
import type { SecurityAuditLog, InsertSecurityAuditLog, SecurityAlert, InsertSecurityAlert } from '@shared/schema';
import { eq, desc, and, gte, count, sql } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

export interface SecurityEventContext {
  userId?: number;
  userEmail?: string;
  ipAddress?: string;
  userAgent?: string;
  sessionId?: string;
  requestId?: string;
  resource?: string;
  resourceId?: string;
  metadata?: Record<string, any>;
}

export interface SecurityAlertContext {
  userId?: number;
  ipAddress?: string;
  details?: Record<string, any>;
  severity?: 'low' | 'medium' | 'high' | 'critical';
}

export type SecurityEventType = 
  | 'AUTH_SUCCESS'
  | 'AUTH_FAILURE' 
  | 'PASSWORD_CHANGE'
  | 'ACCOUNT_LOCKED'
  | 'ACCOUNT_UNLOCKED'
  | 'SESSION_CREATED'
  | 'SESSION_TERMINATED'
  | 'SUSPICIOUS_LOGIN'
  | 'RATE_LIMIT_EXCEEDED'
  | 'ADMIN_ACTION'
  | 'AUTHORIZATION_FAILURE'
  | 'DATA_ACCESS'
  | 'DATA_MODIFICATION'
  | 'API_ACCESS'
  | 'SECURITY_VIOLATION';

export type SecurityAlertType =
  | 'BRUTE_FORCE_ATTACK'
  | 'SUSPICIOUS_LOGIN_PATTERN'
  | 'RATE_LIMIT_EXCEEDED'
  | 'MULTIPLE_FAILED_LOGINS'
  | 'ACCOUNT_ENUMERATION'
  | 'UNUSUAL_ACCESS_PATTERN'
  | 'PRIVILEGE_ESCALATION_ATTEMPT'
  | 'DATA_BREACH_ATTEMPT'
  | 'MALICIOUS_REQUEST'
  | 'SECURITY_POLICY_VIOLATION';

export class SecurityLogger {
  private static instance: SecurityLogger;
  private alertThresholds = {
    FAILED_LOGIN_ATTEMPTS: 5,
    RATE_LIMIT_VIOLATIONS: 10,
    SUSPICIOUS_IPS: 3,
    TIME_WINDOW_MINUTES: 15
  };

  public static getInstance(): SecurityLogger {
    if (!SecurityLogger.instance) {
      SecurityLogger.instance = new SecurityLogger();
    }
    return SecurityLogger.instance;
  }

  /**
   * Log a security event to the audit trail
   */
  async logSecurityEvent(
    eventType: SecurityEventType,
    action: string,
    success: boolean,
    context: SecurityEventContext = {},
    errorMessage?: string
  ): Promise<void> {
    try {
      const requestId = context.requestId || uuidv4();
      
      const auditLog: InsertSecurityAuditLog = {
        timestamp: new Date().toISOString(),
        eventType,
        userId: context.userId,
        userEmail: context.userEmail,
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
        action,
        resource: context.resource,
        resourceId: context.resourceId,
        success,
        errorMessage,
        metadata: context.metadata || {},
        severity: this.determineSeverity(eventType, success),
        sessionId: context.sessionId,
        requestId
      };

      await db.insert(securityAuditLogs).values(auditLog);

      // Check if this event should trigger an alert
      await this.checkForSecurityAlerts(eventType, context, success);

      // Log to console for immediate visibility
      const logLevel = success ? 'info' : 'warn';
      console[logLevel](`🔐 Security Event: ${eventType} - ${action}`, {
        userId: context.userId,
        success,
        ipAddress: context.ipAddress,
        requestId
      });

    } catch (error) {
      console.error('Failed to log security event:', error);
      // Don't throw - logging failures shouldn't break the application
    }
  }

  /**
   * Log authentication events
   */
  async logAuthenticationEvent(
    eventType: 'AUTH_SUCCESS' | 'AUTH_FAILURE',
    userEmail: string,
    context: SecurityEventContext,
    errorMessage?: string
  ): Promise<void> {
    await this.logSecurityEvent(
      eventType,
      eventType === 'AUTH_SUCCESS' ? 'login_success' : 'login_failure',
      eventType === 'AUTH_SUCCESS',
      { ...context, userEmail },
      errorMessage
    );
  }

  /**
   * Log API access events
   */
  async logApiAccess(
    method: string,
    endpoint: string,
    statusCode: number,
    context: SecurityEventContext
  ): Promise<void> {
    const success = statusCode < 400;
    const action = `${method} ${endpoint}`;
    
    await this.logSecurityEvent(
      'API_ACCESS',
      action,
      success,
      { ...context, resource: endpoint, metadata: { method, statusCode } }
    );
  }

  /**
   * Log data access events
   */
  async logDataAccess(
    resource: string,
    resourceId: string,
    action: 'read' | 'create' | 'update' | 'delete',
    context: SecurityEventContext,
    success: boolean = true
  ): Promise<void> {
    await this.logSecurityEvent(
      action === 'read' ? 'DATA_ACCESS' : 'DATA_MODIFICATION',
      `${action}_${resource}`,
      success,
      { ...context, resource, resourceId }
    );
  }

  /**
   * Log authorization events
   */
  async logAuthorizationEvent(
    resource: string,
    action: string,
    success: boolean,
    context: SecurityEventContext,
    errorMessage?: string
  ): Promise<void> {
    await this.logSecurityEvent(
      success ? 'DATA_ACCESS' : 'AUTHORIZATION_FAILURE',
      `authorize_${action}_${resource}`,
      success,
      { ...context, resource },
      errorMessage
    );
  }

  /**
   * Log suspicious activity
   */
  async logSuspiciousActivity(
    description: string,
    context: SecurityEventContext,
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.logSecurityEvent(
      'SUSPICIOUS_LOGIN',
      'suspicious_activity',
      false,
      { ...context, metadata: { description, ...metadata } },
      description
    );
  }

  /**
   * Create a security alert
   */
  async createSecurityAlert(
    alertType: SecurityAlertType,
    description: string,
    context: SecurityAlertContext = {}
  ): Promise<void> {
    try {
      const alert: InsertSecurityAlert = {
        timestamp: new Date().toISOString(),
        alertType,
        severity: context.severity ?? 'medium',
        userId: context.userId,
        ipAddress: context.ipAddress,
        description,
        details: context.details || {},
        status: 'open',
        notificationsSent: false
      };

      await db.insert(securityAlerts).values(alert);

      // Log the alert creation
      console.warn(`🚨 Security Alert: ${alertType} - ${description}`, {
        severity: alert.severity,
        userId: context.userId,
        ipAddress: context.ipAddress
      });

      // TODO: Implement notification system (email, Slack, etc.)
      // await this.sendAlertNotifications(alert);

    } catch (error) {
      console.error('Failed to create security alert:', error);
    }
  }

  /**
   * Get recent security events with filtering
   */
  async getSecurityEvents(options: {
    limit?: number;
    offset?: number;
    eventType?: SecurityEventType;
    userId?: number;
    ipAddress?: string;
    severity?: string;
    success?: boolean;
    startDate?: Date;
    endDate?: Date;
  } = {}): Promise<SecurityAuditLog[]> {
    const {
      limit = 100,
      offset = 0,
      eventType,
      userId,
      ipAddress,
      severity,
      success,
      startDate,
      endDate
    } = options;

    let query = db.select().from(securityAuditLogs);

    // Build where conditions
    const conditions = [];
    if (eventType) conditions.push(eq(securityAuditLogs.eventType, eventType));
    if (userId) conditions.push(eq(securityAuditLogs.userId, userId));
    if (ipAddress) conditions.push(eq(securityAuditLogs.ipAddress, ipAddress));
    if (severity) conditions.push(eq(securityAuditLogs.severity, severity));
    if (success !== undefined) conditions.push(eq(securityAuditLogs.success, success));
    // Use sql template for date comparisons with string-mode timestamps
    if (startDate) conditions.push(sql`${securityAuditLogs.timestamp} >= ${startDate.toISOString()}`);
    if (endDate) conditions.push(sql`${securityAuditLogs.timestamp} <= ${endDate.toISOString()}`);

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    // @ts-ignore - Drizzle ORM type inference limitation with dynamic where conditions
    return await query
      .orderBy(desc(securityAuditLogs.timestamp))
      .limit(limit)
      .offset(offset);
  }

  /**
   * Get security alerts with filtering
   */
  async getSecurityAlerts(options: {
    limit?: number;
    offset?: number;
    alertType?: SecurityAlertType;
    severity?: string;
    status?: string;
    startDate?: Date;
    endDate?: Date;
  } = {}): Promise<SecurityAlert[]> {
    const {
      limit = 50,
      offset = 0,
      alertType,
      severity,
      status,
      startDate,
      endDate
    } = options;

    let query = db.select().from(securityAlerts);

    // Build where conditions
    const conditions = [];
    if (alertType) conditions.push(eq(securityAlerts.alertType, alertType));
    if (severity) conditions.push(eq(securityAlerts.severity, severity));
    if (status) conditions.push(eq(securityAlerts.status, status));
    // Use sql template for date comparisons with string-mode timestamps
    if (startDate) conditions.push(sql`${securityAlerts.timestamp} >= ${startDate.toISOString()}`);
    if (endDate) conditions.push(sql`${securityAlerts.timestamp} <= ${endDate.toISOString()}`);

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    // @ts-ignore - Drizzle ORM type inference limitation with dynamic where conditions
    return await query
      .orderBy(desc(securityAlerts.timestamp))
      .limit(limit)
      .offset(offset);
  }

  /**
   * Get security dashboard metrics
   */
  async getSecurityMetrics(timeWindow: number = 24): Promise<{
    totalEvents: number;
    failedLogins: number;
    suspiciousActivities: number;
    activeAlerts: number;
    topFailedIPs: Array<{ ipAddress: string; count: number }>;
    eventsByType: Array<{ eventType: string; count: number }>;
    alertsBySeverity: Array<{ severity: string; count: number }>;
  }> {
    const since = new Date(Date.now() - timeWindow * 60 * 60 * 1000).toISOString();

    // Get total events in time window
    const [totalEventsResult] = await db
      .select({ count: count() })
      .from(securityAuditLogs)
      .where(gte(securityAuditLogs.timestamp, since));

    // Get failed login attempts
    const [failedLoginsResult] = await db
      .select({ count: count() })
      .from(securityAuditLogs)
      .where(
        and(
          gte(securityAuditLogs.timestamp, since),
          eq(securityAuditLogs.eventType, 'AUTH_FAILURE')
        )
      );

    // Get suspicious activities
    const [suspiciousResult] = await db
      .select({ count: count() })
      .from(securityAuditLogs)
      .where(
        and(
          gte(securityAuditLogs.timestamp, since),
          eq(securityAuditLogs.eventType, 'SUSPICIOUS_LOGIN')
        )
      );

    // Get active alerts
    const [activeAlertsResult] = await db
      .select({ count: count() })
      .from(securityAlerts)
      .where(eq(securityAlerts.status, 'open'));

    // Get top failed IPs
    const topFailedIPs = await db
      .select({
        ipAddress: securityAuditLogs.ipAddress,
        count: count()
      })
      .from(securityAuditLogs)
      .where(
        and(
          gte(securityAuditLogs.timestamp, since),
          eq(securityAuditLogs.success, false),
          sql`${securityAuditLogs.ipAddress} IS NOT NULL`
        )
      )
      .groupBy(securityAuditLogs.ipAddress)
      .orderBy(desc(count()))
      .limit(10);

    // Get events by type
    const eventsByType = await db
      .select({
        eventType: securityAuditLogs.eventType,
        count: count()
      })
      .from(securityAuditLogs)
      .where(gte(securityAuditLogs.timestamp, since))
      .groupBy(securityAuditLogs.eventType)
      .orderBy(desc(count()));

    // Get alerts by severity
    const alertsBySeverity = await db
      .select({
        severity: securityAlerts.severity,
        count: count()
      })
      .from(securityAlerts)
      .where(gte(securityAlerts.timestamp, since))
      .groupBy(securityAlerts.severity)
      .orderBy(desc(count()));

    return {
      totalEvents: totalEventsResult.count,
      failedLogins: failedLoginsResult.count,
      suspiciousActivities: suspiciousResult.count,
      activeAlerts: activeAlertsResult.count,
      topFailedIPs: topFailedIPs.map(row => ({
        ipAddress: row.ipAddress ?? 'unknown',
        count: row.count
      })),
      eventsByType: eventsByType.map(row => ({
        eventType: row.eventType,
        count: row.count
      })),
      alertsBySeverity: alertsBySeverity.map(row => ({
        severity: row.severity,
        count: row.count
      }))
    };
  }

  /**
   * Resolve a security alert
   */
  async resolveSecurityAlert(
    alertId: number,
    resolvedBy: number,
    resolutionNotes: string,
    status: 'resolved' | 'false_positive' = 'resolved'
  ): Promise<void> {
    await db
      .update(securityAlerts)
      .set({
        status,
        resolvedBy,
        resolvedAt: new Date().toISOString(),
        resolutionNotes
      })
      .where(eq(securityAlerts.id, alertId));

    console.log(`✅ Security alert ${alertId} ${status} by user ${resolvedBy}`);
  }

  /**
   * Check for patterns that should trigger security alerts
   */
  private async checkForSecurityAlerts(
    eventType: SecurityEventType,
    context: SecurityEventContext,
    success: boolean
  ): Promise<void> {
    const now = new Date();
    const timeWindow = new Date(now.getTime() - this.alertThresholds.TIME_WINDOW_MINUTES * 60 * 1000);

    // Check for brute force attacks (multiple failed logins from same IP)
    if (eventType === 'AUTH_FAILURE' && context.ipAddress) {
      const recentFailures = await db
        .select({ count: count() })
        .from(securityAuditLogs)
        .where(
          and(
            eq(securityAuditLogs.eventType, 'AUTH_FAILURE'),
            eq(securityAuditLogs.ipAddress, context.ipAddress),
            gte(securityAuditLogs.timestamp, timeWindow.toISOString())
          )
        );

      if (recentFailures[0]?.count >= this.alertThresholds.FAILED_LOGIN_ATTEMPTS) {
        await this.createSecurityAlert(
          'BRUTE_FORCE_ATTACK',
          `Multiple failed login attempts from IP ${context.ipAddress}`,
          {
            ipAddress: context.ipAddress,
            severity: 'high',
            details: {
              failedAttempts: recentFailures[0].count,
              timeWindow: this.alertThresholds.TIME_WINDOW_MINUTES
            }
          }
        );
      }
    }

    // Check for suspicious login patterns (same user, multiple IPs)
    if (eventType === 'AUTH_SUCCESS' && context.userId && context.ipAddress) {
      const recentLogins = await db
        .select({
          ipAddress: securityAuditLogs.ipAddress,
          count: count()
        })
        .from(securityAuditLogs)
        .where(
          and(
            eq(securityAuditLogs.eventType, 'AUTH_SUCCESS'),
            eq(securityAuditLogs.userId, context.userId),
            gte(securityAuditLogs.timestamp, timeWindow.toISOString()),
            sql`${securityAuditLogs.ipAddress} IS NOT NULL`
          )
        )
        .groupBy(securityAuditLogs.ipAddress);

      if (recentLogins.length >= this.alertThresholds.SUSPICIOUS_IPS) {
        await this.createSecurityAlert(
          'SUSPICIOUS_LOGIN_PATTERN',
          `User ${context.userId} logged in from multiple IPs recently`,
          {
            userId: context.userId,
            severity: 'medium',
            details: {
              uniqueIPs: recentLogins.length,
              ipAddresses: recentLogins.map(r => r.ipAddress),
              timeWindow: this.alertThresholds.TIME_WINDOW_MINUTES
            }
          }
        );
      }
    }

    // Check for rate limiting violations
    if (eventType === 'RATE_LIMIT_EXCEEDED' && context.ipAddress) {
      const recentViolations = await db
        .select({ count: count() })
        .from(securityAuditLogs)
        .where(
          and(
            eq(securityAuditLogs.eventType, 'RATE_LIMIT_EXCEEDED'),
            eq(securityAuditLogs.ipAddress, context.ipAddress),
            gte(securityAuditLogs.timestamp, timeWindow.toISOString())
          )
        );

      if (recentViolations[0]?.count >= this.alertThresholds.RATE_LIMIT_VIOLATIONS) {
        await this.createSecurityAlert(
          'RATE_LIMIT_EXCEEDED',
          `Excessive rate limiting violations from IP ${context.ipAddress}`,
          {
            ipAddress: context.ipAddress,
            severity: 'medium',
            details: {
              violations: recentViolations[0].count,
              timeWindow: this.alertThresholds.TIME_WINDOW_MINUTES
            }
          }
        );
      }
    }
  }

  /**
   * Determine severity based on event type and success
   */
  private determineSeverity(eventType: SecurityEventType, success: boolean): string {
    if (!success) {
      switch (eventType) {
        case 'AUTH_FAILURE':
        case 'AUTHORIZATION_FAILURE':
          return 'warning';
        case 'SUSPICIOUS_LOGIN':
        case 'RATE_LIMIT_EXCEEDED':
        case 'SECURITY_VIOLATION':
          return 'error';
        default:
          return 'warning';
      }
    }

    switch (eventType) {
      case 'ADMIN_ACTION':
      case 'ACCOUNT_LOCKED':
      case 'PASSWORD_CHANGE':
        return 'warning';
      case 'SESSION_CREATED':
      case 'SESSION_TERMINATED':
      case 'AUTH_SUCCESS':
        return 'info';
      default:
        return 'info';
    }
  }
}

export const securityLogger = SecurityLogger.getInstance();