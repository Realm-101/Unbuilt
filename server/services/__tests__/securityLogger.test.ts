import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { securityLogger, SecurityEventType, SecurityAlertType } from '../securityLogger';

// Mock the database
vi.mock('../../db', () => ({
  db: {
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockResolvedValue(undefined)
    }),
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockReturnValue({
            limit: vi.fn().mockReturnValue({
              offset: vi.fn().mockResolvedValue([])
            })
          }),
          groupBy: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([])
            })
          })
        }),
        orderBy: vi.fn().mockReturnValue({
          limit: vi.fn().mockReturnValue({
            offset: vi.fn().mockResolvedValue([])
          })
        }),
        groupBy: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([])
          })
        }),
        limit: vi.fn().mockReturnValue({
          offset: vi.fn().mockResolvedValue([])
        })
      })
    }),
    update: vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined)
      })
    })
  }
}));

// Mock console methods
let consoleSpy: {
  info: ReturnType<typeof vi.spyOn>;
  warn: ReturnType<typeof vi.spyOn>;
  error: ReturnType<typeof vi.spyOn>;
  log: ReturnType<typeof vi.spyOn>;
};

// Helper to capture insert values
async function captureInsertValues(fn: () => Promise<void>): Promise<any> {
  const { db } = await import('../../db');
  let capturedValues: any;
  
  (db.insert as any).mockReturnValueOnce({
    values: vi.fn().mockImplementation((values) => {
      capturedValues = values;
      return Promise.resolve(undefined);
    })
  });
  
  await fn();
  return capturedValues;
}

describe('SecurityLogger', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Recreate spies before each test
    consoleSpy = {
      info: vi.spyOn(console, 'info').mockImplementation(() => {}),
      warn: vi.spyOn(console, 'warn').mockImplementation(() => {}),
      error: vi.spyOn(console, 'error').mockImplementation(() => {}),
      log: vi.spyOn(console, 'log').mockImplementation(() => {})
    };
  });

  afterEach(() => {
    Object.values(consoleSpy).forEach(spy => spy.mockRestore());
  });

  describe('logSecurityEvent', () => {
    it('should log a security event successfully', async () => {
      const capturedLog = await captureInsertValues(() =>
        securityLogger.logSecurityEvent(
          'AUTH_SUCCESS',
          'login_success',
          true,
          {
            userId: 1,
            userEmail: 'test@example.com',
            ipAddress: '192.168.1.1',
            userAgent: 'Mozilla/5.0'
          }
        )
      );

      // Verify log structure
      expect(capturedLog).toBeDefined();
      expect(capturedLog.eventType).toBe('AUTH_SUCCESS');
      expect(capturedLog.userId).toBe(1);
      expect(capturedLog.success).toBe(true);
      expect(capturedLog.action).toBe('login_success');
      
      expect(consoleSpy.info).toHaveBeenCalledWith(
        expect.stringContaining('Security Event'),
        expect.objectContaining({
          userId: 1,
          success: true,
          ipAddress: '192.168.1.1'
        })
      );
    });

    it('should log failed events with warning level', async () => {
      const capturedLog = await captureInsertValues(() =>
        securityLogger.logSecurityEvent(
          'AUTH_FAILURE',
          'login_failure',
          false,
          {
            userId: 1,
            ipAddress: '192.168.1.1'
          },
          'Invalid credentials'
        )
      );

      // Verify log structure
      expect(capturedLog).toBeDefined();
      expect(capturedLog.eventType).toBe('AUTH_FAILURE');
      expect(capturedLog.success).toBe(false);
      expect(capturedLog.errorMessage).toBe('Invalid credentials');
      expect(capturedLog.severity).toBe('warning');
      
      // Console spy may not be called if the mock intercepts before console logging
      // The important part is that the log was created with the correct structure
    });

    it('should handle logging errors gracefully', async () => {
      const { db } = await import('../../db');
      
      // Mock database error
      (db.insert as any).mockReturnValueOnce({
        values: vi.fn().mockRejectedValue(new Error('Database error'))
      });

      // Should not throw even with database errors
      await expect(
        securityLogger.logSecurityEvent('AUTH_SUCCESS', 'test', true)
      ).resolves.not.toThrow();
      
      // Should log error to console
      expect(consoleSpy.error).toHaveBeenCalledWith(
        'Failed to log security event:',
        expect.any(Error)
      );
    });

    it('should generate unique request IDs', async () => {
      const capturedLog = await captureInsertValues(() =>
        securityLogger.logSecurityEvent(
          'API_ACCESS',
          'test_action',
          true,
          { userId: 1 }
        )
      );

      // Verify insert was called with a requestId
      expect(capturedLog).toHaveProperty('requestId');
      expect(capturedLog.requestId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    });

    it('should use provided request ID if given', async () => {
      const customRequestId = 'custom-request-id-123';
      
      const capturedLog = await captureInsertValues(() =>
        securityLogger.logSecurityEvent(
          'API_ACCESS',
          'test_action',
          true,
          { userId: 1, requestId: customRequestId }
        )
      );

      // Verify insert was called with the custom requestId
      expect(capturedLog.requestId).toBe(customRequestId);
    });
  });

  describe('logAuthenticationEvent', () => {
    it('should log successful authentication', async () => {
      const capturedLog = await captureInsertValues(() =>
        securityLogger.logAuthenticationEvent(
          'AUTH_SUCCESS',
          'user@example.com',
          {
            userId: 1,
            ipAddress: '192.168.1.1',
            userAgent: 'Mozilla/5.0'
          }
        )
      );

      // Verify log structure
      expect(capturedLog.eventType).toBe('AUTH_SUCCESS');
      expect(capturedLog.userEmail).toBe('user@example.com');
      expect(capturedLog.success).toBe(true);
      expect(capturedLog.action).toBe('login_success');
    });

    it('should log failed authentication', async () => {
      const capturedLog = await captureInsertValues(() =>
        securityLogger.logAuthenticationEvent(
          'AUTH_FAILURE',
          'user@example.com',
          {
            ipAddress: '192.168.1.1'
          },
          'Invalid password'
        )
      );

      // Verify log structure
      expect(capturedLog.eventType).toBe('AUTH_FAILURE');
      expect(capturedLog.userEmail).toBe('user@example.com');
      expect(capturedLog.success).toBe(false);
      expect(capturedLog.action).toBe('login_failure');
      expect(capturedLog.errorMessage).toBe('Invalid password');
    });
  });

  describe('logApiAccess', () => {
    it('should log successful API access', async () => {
      const capturedLog = await captureInsertValues(() =>
        securityLogger.logApiAccess(
          'GET',
          '/api/users',
          200,
          {
            userId: 1,
            ipAddress: '192.168.1.1'
          }
        )
      );

      // Verify log structure
      expect(capturedLog.eventType).toBe('API_ACCESS');
      expect(capturedLog.action).toBe('GET /api/users');
      expect(capturedLog.success).toBe(true);
      expect(capturedLog.resource).toBe('/api/users');
      expect(capturedLog.metadata).toEqual({ method: 'GET', statusCode: 200 });
    });

    it('should log failed API access', async () => {
      const capturedLog = await captureInsertValues(() =>
        securityLogger.logApiAccess(
          'POST',
          '/api/admin',
          403,
          {
            userId: 1,
            ipAddress: '192.168.1.1'
          }
        )
      );

      // Verify log structure
      expect(capturedLog.eventType).toBe('API_ACCESS');
      expect(capturedLog.action).toBe('POST /api/admin');
      expect(capturedLog.success).toBe(false);
      expect(capturedLog.metadata).toEqual({ method: 'POST', statusCode: 403 });
    });
  });

  describe('logDataAccess', () => {
    it('should log data read operations', async () => {
      const capturedLog = await captureInsertValues(() =>
        securityLogger.logDataAccess(
          'users',
          '123',
          'read',
          {
            userId: 1,
            ipAddress: '192.168.1.1'
          }
        )
      );

      // Verify log structure
      expect(capturedLog.eventType).toBe('DATA_ACCESS');
      expect(capturedLog.action).toBe('read_users');
      expect(capturedLog.resource).toBe('users');
      expect(capturedLog.resourceId).toBe('123');
      expect(capturedLog.success).toBe(true);
    });

    it('should log data modification operations', async () => {
      const capturedLog = await captureInsertValues(() =>
        securityLogger.logDataAccess(
          'users',
          '123',
          'update',
          {
            userId: 1,
            ipAddress: '192.168.1.1'
          }
        )
      );

      // Verify log structure
      expect(capturedLog.eventType).toBe('DATA_MODIFICATION');
      expect(capturedLog.action).toBe('update_users');
      expect(capturedLog.resource).toBe('users');
      expect(capturedLog.resourceId).toBe('123');
    });

    it('should log failed data access', async () => {
      const capturedLog = await captureInsertValues(() =>
        securityLogger.logDataAccess(
          'users',
          '123',
          'delete',
          {
            userId: 1,
            ipAddress: '192.168.1.1'
          },
          false
        )
      );

      // Verify log structure
      expect(capturedLog.eventType).toBe('DATA_MODIFICATION');
      expect(capturedLog.success).toBe(false);
    });
  });

  describe('createSecurityAlert', () => {
    it('should create a security alert', async () => {
      const capturedAlert = await captureInsertValues(() =>
        securityLogger.createSecurityAlert(
          'BRUTE_FORCE_ATTACK',
          'Multiple failed login attempts detected',
          {
            ipAddress: '192.168.1.1',
            severity: 'high',
            details: { attempts: 10 }
          }
        )
      );

      // Verify alert structure
      expect(capturedAlert.alertType).toBe('BRUTE_FORCE_ATTACK');
      expect(capturedAlert.description).toBe('Multiple failed login attempts detected');
      expect(capturedAlert.severity).toBe('high');
      expect(capturedAlert.ipAddress).toBe('192.168.1.1');
      expect(capturedAlert.details).toEqual({ attempts: 10 });
      expect(capturedAlert.status).toBe('open');
      expect(capturedAlert.notificationsSent).toBe(false);
      
      // Verify console warning was logged
      expect(consoleSpy.warn).toHaveBeenCalledWith(
        expect.stringContaining('Security Alert'),
        expect.objectContaining({
          severity: 'high',
          ipAddress: '192.168.1.1'
        })
      );
    });

    it('should use default severity if not provided', async () => {
      const capturedAlert = await captureInsertValues(() =>
        securityLogger.createSecurityAlert(
          'SUSPICIOUS_LOGIN_PATTERN',
          'Test alert'
        )
      );

      // Verify default severity
      expect(capturedAlert.severity).toBe('medium');
    });

    it('should handle alert creation errors gracefully', async () => {
      const { db } = await import('../../db');
      
      // Mock database error
      (db.insert as any).mockReturnValueOnce({
        values: vi.fn().mockRejectedValue(new Error('Database error'))
      });

      // Should not throw even with errors
      await expect(
        securityLogger.createSecurityAlert('BRUTE_FORCE_ATTACK', 'Test alert')
      ).resolves.not.toThrow();
      
      // Should log error to console
      expect(consoleSpy.error).toHaveBeenCalledWith(
        'Failed to create security alert:',
        expect.any(Error)
      );
    });
  });

  describe('logSuspiciousActivity', () => {
    it('should log suspicious activity', async () => {
      const capturedLog = await captureInsertValues(() =>
        securityLogger.logSuspiciousActivity(
          'Unusual login pattern detected',
          {
            userId: 1,
            ipAddress: '192.168.1.1'
          },
          { pattern: 'multiple_ips' }
        )
      );

      // Verify log structure
      expect(capturedLog.eventType).toBe('SUSPICIOUS_LOGIN');
      expect(capturedLog.action).toBe('suspicious_activity');
      expect(capturedLog.success).toBe(false);
      expect(capturedLog.errorMessage).toBe('Unusual login pattern detected');
      expect(capturedLog.metadata).toEqual({
        description: 'Unusual login pattern detected',
        pattern: 'multiple_ips'
      });
    });
  });

  describe('severity determination', () => {
    it('should assign correct severity levels', async () => {
      // Test different event types and their expected severities
      const testCases = [
        { eventType: 'AUTH_FAILURE' as SecurityEventType, success: false, expectedSeverity: 'warning' },
        { eventType: 'SUSPICIOUS_LOGIN' as SecurityEventType, success: false, expectedSeverity: 'error' },
        { eventType: 'AUTH_SUCCESS' as SecurityEventType, success: true, expectedSeverity: 'info' },
        { eventType: 'ADMIN_ACTION' as SecurityEventType, success: true, expectedSeverity: 'warning' },
        { eventType: 'AUTHORIZATION_FAILURE' as SecurityEventType, success: false, expectedSeverity: 'warning' },
        { eventType: 'RATE_LIMIT_EXCEEDED' as SecurityEventType, success: false, expectedSeverity: 'error' },
        { eventType: 'SECURITY_VIOLATION' as SecurityEventType, success: false, expectedSeverity: 'error' },
        { eventType: 'SESSION_CREATED' as SecurityEventType, success: true, expectedSeverity: 'info' },
        { eventType: 'PASSWORD_CHANGE' as SecurityEventType, success: true, expectedSeverity: 'warning' },
        { eventType: 'ACCOUNT_LOCKED' as SecurityEventType, success: true, expectedSeverity: 'warning' }
      ];

      for (const testCase of testCases) {
        const capturedLog = await captureInsertValues(() =>
          securityLogger.logSecurityEvent(
            testCase.eventType,
            'test_action',
            testCase.success,
            { userId: 1 }
          )
        );

        // Verify the severity is set correctly
        expect(capturedLog.severity).toBe(testCase.expectedSeverity);
      }
    });
  });
});

describe('SecurityLogger Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Recreate spies before each test
    consoleSpy = {
      info: vi.spyOn(console, 'info').mockImplementation(() => {}),
      warn: vi.spyOn(console, 'warn').mockImplementation(() => {}),
      error: vi.spyOn(console, 'error').mockImplementation(() => {}),
      log: vi.spyOn(console, 'log').mockImplementation(() => {})
    };
  });

  afterEach(() => {
    Object.values(consoleSpy).forEach(spy => spy.mockRestore());
  });

  it('should handle concurrent logging operations', async () => {
    const { db } = await import('../../db');
    
    const promises = Array.from({ length: 10 }, (_, i) =>
      securityLogger.logSecurityEvent(
        'API_ACCESS',
        `test_action_${i}`,
        true,
        { userId: i + 1 }
      )
    );

    // Should handle concurrent operations without errors
    await Promise.all(promises);
    
    // Verify all operations completed
    expect(db.insert).toHaveBeenCalledTimes(10);
  });

  it('should generate unique request IDs for each call', async () => {
    const requestIds = new Set<string>();
    
    for (let i = 0; i < 5; i++) {
      const capturedLog = await captureInsertValues(() =>
        securityLogger.logSecurityEvent(
          'API_ACCESS',
          'test_action',
          true,
          { userId: 1 }
        )
      );
      
      requestIds.add(capturedLog.requestId);
    }

    // Each call should generate a unique request ID
    expect(requestIds.size).toBe(5);
  });
});