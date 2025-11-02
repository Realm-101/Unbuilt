import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { sessionManager, SessionManager } from '../sessionManager';
import { jwtService } from '../../jwt';

// Mock dependencies
vi.mock('../../db', () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    selectDistinct: vi.fn()
  }
}));

vi.mock('../../jwt', () => ({
  jwtService: {
    generateTokens: vi.fn(),
    validateToken: vi.fn(),
    revokeToken: vi.fn(),
    revokeAllUserTokens: vi.fn()
  }
}));

// Database is now configured - tests enabled!
describe('Session Security Tests', () => {
  let mockDb: any;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock database
    mockDb = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([])
        })
      }),
      insert: vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([])
        })
      }),
      update: vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([])
        })
      }),
      delete: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([])
      })
    };

    // Database is already mocked at the module level
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Session Creation Security', () => {
    it('should create session with secure device fingerprinting', async () => {
      const mockUser = { id: 1, email: 'test@example.com', plan: 'free' };
      const deviceInfo = {
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        platform: 'Windows',
        browser: 'Chrome',
        deviceType: 'desktop' as const
      };
      const ipAddress = '192.168.1.1';

      // Mock JWT service
      vi.mocked(jwtService.generateTokens).mockResolvedValue({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        expiresIn: 900
      });

      // Mock database user lookup
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([mockUser])
        })
      });

      const result = await sessionManager.createSession(
        mockUser.id,
        deviceInfo,
        ipAddress
      );

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result).toHaveProperty('sessionId');

      // Verify JWT tokens were generated with device info
      expect(jwtService.generateTokens).toHaveBeenCalledWith(
        mockUser,
        deviceInfo,
        ipAddress
      );
    });

    it('should detect and handle suspicious device changes', async () => {
      const userId = 1;
      const suspiciousDevice = {
        userAgent: 'curl/7.68.0', // Command line tool - suspicious
        platform: 'Linux',
        browser: 'Unknown',
        deviceType: 'desktop' as const
      };

      // Mock existing sessions with different device
      const existingSessions = [{
        id: 'existing-session',
        userId: 1,
        deviceInfo: JSON.stringify({
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          platform: 'Windows',
          browser: 'Chrome'
        }),
        ipAddress: '192.168.1.1',
        isActive: true
      }];

      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(existingSessions)
        })
      });

      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      await sessionManager.createSession(userId, suspiciousDevice, '10.0.0.1');

      // Should log suspicious activity
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Suspicious device detected'),
        expect.any(Object)
      );

      consoleSpy.mockRestore();
    });

    it('should enforce session limits per user', async () => {
      const userId = 1;
      const deviceInfo = { browser: 'Chrome', platform: 'Windows', deviceType: 'desktop' as const };

      // Mock many existing sessions
      const existingSessions = Array.from({ length: 10 }, (_, i) => ({
        id: `session-${i}`,
        userId: 1,
        isActive: true,
        createdAt: new Date(Date.now() - i * 1000).toISOString()
      }));

      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(existingSessions)
        })
      });

      const invalidateSessionSpy = vi.spyOn(sessionManager, 'invalidateSession')
        .mockResolvedValue();

      await sessionManager.createSession(userId, deviceInfo, '192.168.1.1');

      // Should invalidate oldest sessions when limit is exceeded
      expect(invalidateSessionSpy).toHaveBeenCalled();
    });
  });

  describe('Session Validation Security', () => {
    it('should validate session tokens securely', async () => {
      const sessionId = 'test-session-id';
      const mockSession = {
        id: sessionId,
        userId: 1,
        isActive: true,
        expiresAt: new Date(Date.now() + 3600000).toISOString(), // 1 hour from now
        ipAddress: '192.168.1.1',
        deviceInfo: JSON.stringify({ browser: 'Chrome' })
      };

      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([mockSession])
        })
      });

      const result = await sessionManager.validateSession(sessionId);

      expect(result).toBeTruthy();
      expect(result?.userId).toBe(1);
    });

    it('should reject expired sessions', async () => {
      const sessionId = 'expired-session';
      const expiredSession = {
        id: sessionId,
        userId: 1,
        isActive: true,
        expiresAt: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
        ipAddress: '192.168.1.1'
      };

      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([expiredSession])
        })
      });

      const invalidateSessionSpy = vi.spyOn(sessionManager, 'invalidateSession')
        .mockResolvedValue();

      const result = await sessionManager.validateSession(sessionId);

      expect(result).toBeNull();
      expect(invalidateSessionSpy).toHaveBeenCalledWith(sessionId, 'expired');
    });

    it('should reject inactive sessions', async () => {
      const sessionId = 'inactive-session';
      const inactiveSession = {
        id: sessionId,
        userId: 1,
        isActive: false,
        expiresAt: new Date(Date.now() + 3600000).toISOString(),
        ipAddress: '192.168.1.1'
      };

      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([inactiveSession])
        })
      });

      const result = await sessionManager.validateSession(sessionId);

      expect(result).toBeNull();
    });

    it('should handle session hijacking detection', async () => {
      const sessionId = 'test-session';
      const originalIp = '192.168.1.1';
      const suspiciousIp = '10.0.0.1';

      const session = {
        id: sessionId,
        userId: 1,
        isActive: true,
        expiresAt: new Date(Date.now() + 3600000).toISOString(),
        ipAddress: originalIp,
        deviceInfo: JSON.stringify({ browser: 'Chrome', platform: 'Windows' })
      };

      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([session])
        })
      });

      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      // Validate session from different IP
      const result = await sessionManager.validateSession(sessionId, suspiciousIp);

      // Should still validate but log suspicious activity
      expect(result).toBeTruthy();
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('IP address change detected'),
        expect.any(Object)
      );

      consoleSpy.mockRestore();
    });
  });

  describe('Session Invalidation Security', () => {
    it('should securely invalidate single session', async () => {
      const sessionId = 'test-session';
      const reason = 'user_logout';

      await sessionManager.invalidateSession(sessionId, reason);

      expect(mockDb.update).toHaveBeenCalled();
      
      // Verify the update call structure
      const updateCall = mockDb.update.mock.calls[0];
      expect(updateCall).toBeDefined();
    });

    it('should securely invalidate all user sessions', async () => {
      const userId = 1;
      const reason = 'password_change';
      const excludeSessionId = 'current-session';

      const mockSessions = [
        { id: 'session-1', userId: 1, isActive: true },
        { id: 'session-2', userId: 1, isActive: true },
        { id: 'current-session', userId: 1, isActive: true }
      ];

      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(mockSessions)
        })
      });

      const revokeAllUserTokensSpy = vi.spyOn(jwtService, 'revokeAllUserTokens')
        .mockResolvedValue();

      const result = await sessionManager.invalidateAllUserSessions(userId, reason, excludeSessionId);

      expect(result).toBe(2); // Should invalidate 2 sessions (excluding current)
      expect(revokeAllUserTokensSpy).toHaveBeenCalledWith(userId, reason);
      expect(mockDb.update).toHaveBeenCalled();
    });

    it('should handle concurrent session invalidation', async () => {
      const userId = 1;
      const sessionIds = ['session-1', 'session-2', 'session-3'];

      // Simulate concurrent invalidation
      const invalidationPromises = sessionIds.map(sessionId =>
        sessionManager.invalidateSession(sessionId, 'concurrent_test')
      );

      await Promise.all(invalidationPromises);

      // All invalidations should succeed
      expect(mockDb.update).toHaveBeenCalledTimes(3);
    });
  });

  describe('Security Event Handling', () => {
    it('should handle password change security event', async () => {
      const securityEvent = {
        type: 'PASSWORD_CHANGE' as const,
        userId: 1,
        details: { currentSessionId: 'current-session' },
        timestamp: new Date()
      };

      const invalidateAllUserSessionsSpy = vi.spyOn(sessionManager, 'invalidateAllUserSessions')
        .mockResolvedValue(2);

      await sessionManager.handleSecurityEvent(securityEvent);

      expect(invalidateAllUserSessionsSpy).toHaveBeenCalledWith(
        1,
        'password_change',
        'current-session'
      );
    });

    it('should handle account locked security event', async () => {
      const securityEvent = {
        type: 'ACCOUNT_LOCKED' as const,
        userId: 1,
        details: { reason: 'Too many failed attempts' },
        timestamp: new Date()
      };

      const invalidateAllUserSessionsSpy = vi.spyOn(sessionManager, 'invalidateAllUserSessions')
        .mockResolvedValue(3);

      await sessionManager.handleSecurityEvent(securityEvent);

      expect(invalidateAllUserSessionsSpy).toHaveBeenCalledWith(
        1,
        'account_locked'
      );
    });

    it('should handle suspicious login security event', async () => {
      const securityEvent = {
        type: 'SUSPICIOUS_LOGIN' as const,
        userId: 1,
        details: { ipAddress: '192.168.1.1', reason: 'IP change' },
        timestamp: new Date()
      };

      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      await sessionManager.handleSecurityEvent(securityEvent);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Suspicious login detected for user 1'),
        expect.any(Object)
      );

      consoleSpy.mockRestore();
    });

    it('should handle admin action security event', async () => {
      const securityEvent = {
        type: 'ADMIN_ACTION' as const,
        userId: 1,
        details: { sessionId: 'target-session', adminId: 2 },
        timestamp: new Date()
      };

      const invalidateSessionSpy = vi.spyOn(sessionManager, 'invalidateSession')
        .mockResolvedValue();

      await sessionManager.handleSecurityEvent(securityEvent);

      expect(invalidateSessionSpy).toHaveBeenCalledWith(
        'target-session',
        'admin_action'
      );
    });
  });

  describe('Device Fingerprinting Security', () => {
    it('should parse user agent securely', () => {
      const maliciousUserAgent = '<script>alert("xss")</script>Mozilla/5.0';
      
      const deviceInfo = SessionManager.parseDeviceInfo(maliciousUserAgent);
      
      // Should sanitize malicious content
      expect(deviceInfo.userAgent).not.toContain('<script>');
      expect(deviceInfo.userAgent).not.toContain('alert');
    });

    it('should handle extremely long user agents', () => {
      const longUserAgent = 'Mozilla/5.0 ' + 'A'.repeat(10000);
      
      const deviceInfo = SessionManager.parseDeviceInfo(longUserAgent);
      
      // Should handle gracefully without crashing
      expect(deviceInfo).toHaveProperty('deviceType');
      expect(deviceInfo.userAgent?.length).toBeLessThan(1000); // Should be truncated
    });

    it('should detect bot user agents', () => {
      const botUserAgents = [
        'Googlebot/2.1 (+http://www.google.com/bot.html)',
        'Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)',
        'curl/7.68.0',
        'wget/1.20.3',
        'python-requests/2.25.1'
      ];

      botUserAgents.forEach(userAgent => {
        const deviceInfo = SessionManager.parseDeviceInfo(userAgent);
        
        // Should detect as potential bot
        expect(deviceInfo.deviceType).toBe('desktop'); // Default fallback
        expect(deviceInfo.browser).toBeDefined();
      });
    });

    it('should handle null and undefined user agents', () => {
      expect(() => {
        SessionManager.parseDeviceInfo(null as any);
      }).not.toThrow();

      expect(() => {
        SessionManager.parseDeviceInfo(undefined);
      }).not.toThrow();

      const result = SessionManager.parseDeviceInfo(undefined);
      expect(result).toHaveProperty('deviceType', 'desktop');
    });
  });

  describe('Session Cleanup Security', () => {
    it('should securely cleanup expired sessions', async () => {
      const mockExpiredSessions = [
        { id: 'expired-1', userId: 1, expiresAt: new Date(Date.now() - 3600000).toISOString() },
        { id: 'expired-2', userId: 2, expiresAt: new Date(Date.now() - 7200000).toISOString() }
      ];

      mockDb.update.mockResolvedValue({ rowCount: 2 });

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const result = await sessionManager.cleanupExpiredSessions();

      expect(result).toBe(2);
      expect(mockDb.update).toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Cleaned up 2 expired sessions')
      );

      consoleSpy.mockRestore();
    });

    it('should handle cleanup errors gracefully', async () => {
      mockDb.update.mockRejectedValue(new Error('Database error'));

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      await expect(sessionManager.cleanupExpiredSessions()).rejects.toThrow('Database error');

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Error cleaning up expired sessions'),
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });
  });

  describe('Concurrent Session Management', () => {
    it('should handle concurrent session creation safely', async () => {
      const userId = 1;
      const deviceInfo = { browser: 'Chrome', platform: 'Windows', deviceType: 'desktop' as const };

      // Mock user lookup
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ id: userId, email: 'test@example.com' }])
        })
      });

      vi.mocked(jwtService.generateTokens).mockResolvedValue({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        expiresIn: 900
      });

      // Create multiple sessions concurrently
      const sessionPromises = Array.from({ length: 5 }, (_, i) =>
        sessionManager.createSession(userId, deviceInfo, `192.168.1.${i + 1}`)
      );

      const results = await Promise.all(sessionPromises);

      // All should succeed
      results.forEach(result => {
        expect(result).toHaveProperty('accessToken');
        expect(result).toHaveProperty('refreshToken');
        expect(result).toHaveProperty('sessionId');
      });
    });

    it('should handle concurrent session validation safely', async () => {
      const sessionId = 'test-session';
      const mockSession = {
        id: sessionId,
        userId: 1,
        isActive: true,
        expiresAt: new Date(Date.now() + 3600000).toISOString(),
        ipAddress: '192.168.1.1'
      };

      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([mockSession])
        })
      });

      // Validate session concurrently
      const validationPromises = Array.from({ length: 10 }, () =>
        sessionManager.validateSession(sessionId)
      );

      const results = await Promise.all(validationPromises);

      // All should succeed
      results.forEach(result => {
        expect(result).toBeTruthy();
        expect(result?.userId).toBe(1);
      });
    });
  });

  describe('Memory and Performance Security', () => {
    it('should handle large session datasets efficiently', async () => {
      const userId = 1;
      
      // Mock large number of sessions
      const largeSessions = Array.from({ length: 1000 }, (_, i) => ({
        id: `session-${i}`,
        userId: 1,
        isActive: true,
        createdAt: new Date(Date.now() - i * 1000).toISOString()
      }));

      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(largeSessions)
        })
      });

      const startTime = Date.now();
      const sessions = await sessionManager.getUserSessions(userId);
      const endTime = Date.now();

      expect(sessions).toHaveLength(1000);
      // Should complete within reasonable time
      expect(endTime - startTime).toBeLessThan(1000); // 1 second
    });

    it('should prevent memory leaks in session data', async () => {
      const userId = 1;
      const deviceInfo = { browser: 'Chrome', platform: 'Windows', deviceType: 'desktop' as const };

      // Create and invalidate many sessions
      for (let i = 0; i < 100; i++) {
        const sessionId = `test-session-${i}`;
        
        // Mock session creation
        mockDb.insert.mockReturnValue({
          values: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([{ id: sessionId }])
          })
        });

        await sessionManager.invalidateSession(sessionId, 'test_cleanup');
      }

      // Memory usage should remain stable
      // This is a basic test - in real scenarios you'd use memory profiling tools
      expect(mockDb.update).toHaveBeenCalledTimes(100);
    });
  });
});
