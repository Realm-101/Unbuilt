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
    revokeToken: vi.fn()
  }
}));

describe('SessionManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('parseDeviceInfo', () => {
    it('should parse Chrome on Windows correctly', () => {
      const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36';
      
      const deviceInfo = SessionManager.parseDeviceInfo(userAgent);
      
      expect(deviceInfo).toEqual({
        userAgent,
        platform: 'Windows',
        os: 'Windows',
        browser: 'Chrome',
        deviceType: 'desktop'
      });
    });

    it('should parse Safari on macOS correctly', () => {
      const userAgent = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.1 Safari/605.1.15';
      
      const deviceInfo = SessionManager.parseDeviceInfo(userAgent);
      
      expect(deviceInfo).toEqual({
        userAgent,
        platform: 'macOS',
        os: 'macOS',
        browser: 'Safari',
        deviceType: 'desktop'
      });
    });

    it('should parse mobile Chrome on Android correctly', () => {
      const userAgent = 'Mozilla/5.0 (Linux; Android 10; SM-G973F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.120 Mobile Safari/537.36';
      
      const deviceInfo = SessionManager.parseDeviceInfo(userAgent);
      
      expect(deviceInfo).toEqual({
        userAgent,
        platform: 'Android',
        os: 'Android',
        browser: 'Chrome',
        deviceType: 'mobile'
      });
    });

    it('should parse iPad Safari correctly', () => {
      const userAgent = 'Mozilla/5.0 (iPad; CPU OS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.1 Mobile/15E148 Safari/604.1';
      
      const deviceInfo = SessionManager.parseDeviceInfo(userAgent);
      
      expect(deviceInfo).toEqual({
        userAgent,
        platform: 'iOS',
        os: 'iOS',
        browser: 'Safari',
        deviceType: 'tablet'
      });
    });

    it('should handle undefined user agent', () => {
      const deviceInfo = SessionManager.parseDeviceInfo(undefined);
      
      expect(deviceInfo).toEqual({
        deviceType: 'desktop'
      });
    });

    it('should handle Firefox correctly', () => {
      const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:89.0) Gecko/20100101 Firefox/89.0';
      
      const deviceInfo = SessionManager.parseDeviceInfo(userAgent);
      
      expect(deviceInfo).toEqual({
        userAgent,
        platform: 'Windows',
        os: 'Windows',
        browser: 'Firefox',
        deviceType: 'desktop'
      });
    });

    it('should handle Edge correctly', () => {
      const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36 Edg/91.0.864.59';
      
      const deviceInfo = SessionManager.parseDeviceInfo(userAgent);
      
      expect(deviceInfo).toEqual({
        userAgent,
        platform: 'Windows',
        os: 'Windows',
        browser: 'Edge',
        deviceType: 'desktop'
      });
    });
  });

  describe('createSession', () => {
    it('should create a session with device tracking', async () => {
      const mockUser = { id: 1, email: 'test@example.com', plan: 'free' };
      const mockDeviceInfo = { browser: 'Chrome', platform: 'Windows', deviceType: 'desktop' as const };
      const mockIpAddress = '192.168.1.1';

      // Mock database responses
      const mockDbSelect = vi.fn().mockResolvedValue([mockUser]);
      const mockDbInsert = vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{ id: 'session-id' }])
        })
      });

      // Mock JWT service
      vi.mocked(jwtService.generateTokens).mockResolvedValue({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        expiresIn: 900
      });

      vi.mocked(jwtService.validateToken).mockResolvedValue({
        sub: '1',
        email: 'test@example.com',
        role: 'free',
        iat: Date.now() / 1000,
        exp: Date.now() / 1000 + 900,
        jti: 'session-id',
        type: 'refresh'
      });

      // Mock the database
      const { db } = await import('../../db');
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([mockUser])
        })
      } as any);

      const result = await sessionManager.createSession(
        mockUser.id,
        mockDeviceInfo,
        mockIpAddress
      );

      expect(result).toEqual({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        sessionId: 'session-id'
      });

      expect(jwtService.generateTokens).toHaveBeenCalledWith(
        mockUser,
        mockDeviceInfo,
        mockIpAddress
      );
    });
  });

  describe('handleSecurityEvent', () => {
    it('should handle password change event', async () => {
      const mockEvent = {
        type: 'PASSWORD_CHANGE' as const,
        userId: 1,
        details: { currentSessionId: 'current-session' },
        timestamp: new Date()
      };

      // Mock getUserSessions to return some sessions
      const mockSessions = [
        { id: 'session-1', userId: 1, isActive: true },
        { id: 'session-2', userId: 1, isActive: true },
        { id: 'current-session', userId: 1, isActive: true }
      ];

      const getUserSessionsSpy = vi.spyOn(sessionManager, 'getUserSessions')
        .mockResolvedValue(mockSessions as any);

      const invalidateAllUserSessionsSpy = vi.spyOn(sessionManager, 'invalidateAllUserSessions')
        .mockResolvedValue(2);

      await sessionManager.handleSecurityEvent(mockEvent);

      expect(invalidateAllUserSessionsSpy).toHaveBeenCalledWith(
        1,
        'password_change',
        'current-session'
      );
    });

    it('should handle account locked event', async () => {
      const mockEvent = {
        type: 'ACCOUNT_LOCKED' as const,
        userId: 1,
        details: { reason: 'Too many failed attempts' },
        timestamp: new Date()
      };

      const invalidateAllUserSessionsSpy = vi.spyOn(sessionManager, 'invalidateAllUserSessions')
        .mockResolvedValue(3);

      await sessionManager.handleSecurityEvent(mockEvent);

      expect(invalidateAllUserSessionsSpy).toHaveBeenCalledWith(
        1,
        'account_locked'
      );
    });

    it('should handle suspicious login event', async () => {
      const mockEvent = {
        type: 'SUSPICIOUS_LOGIN' as const,
        userId: 1,
        details: { ipAddress: '192.168.1.1', reason: 'IP change' },
        timestamp: new Date()
      };

      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      await sessionManager.handleSecurityEvent(mockEvent);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Suspicious login detected for user 1'),
        expect.any(Object)
      );

      consoleSpy.mockRestore();
    });

    it('should handle admin action event', async () => {
      const mockEvent = {
        type: 'ADMIN_ACTION' as const,
        userId: 1,
        details: { sessionId: 'target-session', adminId: 2 },
        timestamp: new Date()
      };

      const invalidateSessionSpy = vi.spyOn(sessionManager, 'invalidateSession')
        .mockResolvedValue();

      await sessionManager.handleSecurityEvent(mockEvent);

      expect(invalidateSessionSpy).toHaveBeenCalledWith(
        'target-session',
        'admin_action'
      );
    });
  });

  describe('cleanupExpiredSessions', () => {
    it('should clean up expired sessions', async () => {
      const { db } = await import('../../db');
      
      const mockUpdate = vi.fn().mockResolvedValue({ rowCount: 5 });
      vi.mocked(db.update).mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(mockUpdate)
        })
      } as any);

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const result = await sessionManager.cleanupExpiredSessions();

      expect(result).toBe(5);
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Cleaned up 5 expired sessions')
      );

      consoleSpy.mockRestore();
    });

    it('should handle no expired sessions', async () => {
      const { db } = await import('../../db');
      
      const mockUpdate = vi.fn().mockResolvedValue({ rowCount: 0 });
      vi.mocked(db.update).mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(mockUpdate)
        })
      } as any);

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const result = await sessionManager.cleanupExpiredSessions();

      expect(result).toBe(0);
      expect(consoleSpy).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });
});