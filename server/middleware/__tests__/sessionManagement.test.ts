import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import {
  trackSession,
  enforceConcurrentSessions,
  monitorSessionSecurity,
  performSessionCleanup,
  requireFreshSession,
  validateDeviceConsistency
} from '../sessionManagement';
import { sessionManager, SessionManager } from '../../services/sessionManager';
import { AppError } from '../errorHandler';

// Mock sessionManager
vi.mock('../../services/sessionManager', () => ({
  sessionManager: {
    getSessionById: vi.fn(),
    updateSessionActivity: vi.fn(),
    getUserSessions: vi.fn(),
    handleSecurityEvent: vi.fn(),
    cleanupExpiredSessions: vi.fn()
  },
  SessionManager: {
    parseDeviceInfo: vi.fn()
  }
}));

describe('Session Management Middleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockReq = {
      headers: {},
      ip: '127.0.0.1',
      connection: { remoteAddress: '127.0.0.1' } as any
    };
    
    mockRes = {};
    mockNext = vi.fn();
    
    vi.clearAllMocks();
  });

  describe('trackSession', () => {
    it('should continue without tracking when user is not authenticated', async () => {
      mockReq.user = undefined;

      await trackSession(mockReq as Request, mockRes as Response, mockNext);

      expect(sessionManager.getSessionById).not.toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalled();
    });

    it('should continue without tracking when user has no jti', async () => {
      mockReq.user = { id: 1 } as any;

      await trackSession(mockReq as Request, mockRes as Response, mockNext);

      expect(sessionManager.getSessionById).not.toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalled();
    });

    it('should track session and update activity', async () => {
      const mockSession = {
        id: 'session-1',
        userId: 1,
        deviceInfo: { browser: 'Chrome', platform: 'Windows' },
        ipAddress: '127.0.0.1',
        issuedAt: new Date(),
        expiresAt: new Date(),
        lastActivity: new Date(),
        isActive: true
      };
      
      mockReq.user = { id: 1, jti: 'session-1' } as any;
      mockReq.headers = { 'user-agent': 'Mozilla/5.0' };
      
      vi.mocked(SessionManager.parseDeviceInfo).mockReturnValue({
        browser: 'Chrome',
        platform: 'Windows'
      } as any);
      vi.mocked(sessionManager.getSessionById).mockResolvedValue(mockSession as any);

      await trackSession(mockReq as Request, mockRes as Response, mockNext);

      expect(sessionManager.getSessionById).toHaveBeenCalledWith('session-1');
      expect(sessionManager.updateSessionActivity).toHaveBeenCalledWith('session-1');
      expect(mockReq.sessionInfo).toEqual(mockSession);
      expect(mockNext).toHaveBeenCalled();
    });

    it('should continue even if tracking fails', async () => {
      mockReq.user = { id: 1, jti: 'session-1' } as any;
      vi.mocked(sessionManager.getSessionById).mockRejectedValue(new Error('Database error'));

      await trackSession(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should handle missing IP address', async () => {
      const mockSession = {
        id: 'session-1',
        userId: 1,
        deviceInfo: {},
        ipAddress: 'unknown',
        issuedAt: new Date(),
        expiresAt: new Date(),
        lastActivity: new Date(),
        isActive: true
      };
      
      mockReq.user = { id: 1, jti: 'session-1' } as any;
      mockReq.ip = undefined;
      mockReq.connection = {} as any;
      
      vi.mocked(sessionManager.getSessionById).mockResolvedValue(mockSession as any);

      await trackSession(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('enforceConcurrentSessions', () => {
    it('should continue when user is not authenticated', async () => {
      mockReq.user = undefined;

      const middleware = enforceConcurrentSessions(5);
      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(sessionManager.getUserSessions).not.toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalled();
    });

    it('should continue when sessions are within limit', async () => {
      mockReq.user = { id: 1 } as any;
      vi.mocked(sessionManager.getUserSessions).mockResolvedValue([
        { id: 'session-1' },
        { id: 'session-2' }
      ] as any);

      const middleware = enforceConcurrentSessions(5);
      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(sessionManager.getUserSessions).toHaveBeenCalledWith(1);
      expect(mockNext).toHaveBeenCalled();
    });

    it('should log warning when sessions exceed limit', async () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      mockReq.user = { id: 1 } as any;
      
      const sessions = Array.from({ length: 6 }, (_, i) => ({ id: `session-${i}` }));
      vi.mocked(sessionManager.getUserSessions).mockResolvedValue(sessions as any);

      const middleware = enforceConcurrentSessions(5);
      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('User 1 has 6 active sessions, limit is 5')
      );
      expect(mockNext).toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });

    it('should continue even if error occurs', async () => {
      mockReq.user = { id: 1 } as any;
      vi.mocked(sessionManager.getUserSessions).mockRejectedValue(new Error('Database error'));

      const middleware = enforceConcurrentSessions(5);
      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('monitorSessionSecurity', () => {
    it('should continue when user is not authenticated', async () => {
      mockReq.user = undefined;

      await monitorSessionSecurity(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should continue when sessionInfo is not available', async () => {
      mockReq.user = { id: 1 } as any;
      mockReq.sessionInfo = undefined;

      await monitorSessionSecurity(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should continue when IP address matches', async () => {
      mockReq.user = { id: 1 } as any;
      mockReq.sessionInfo = {
        id: 'session-1',
        userId: 1,
        ipAddress: '127.0.0.1',
        deviceInfo: {},
        issuedAt: new Date(),
        expiresAt: new Date(),
        lastActivity: new Date(),
        isActive: true
      };
      mockReq.ip = '127.0.0.1';

      await monitorSessionSecurity(mockReq as Request, mockRes as Response, mockNext);

      expect(sessionManager.handleSecurityEvent).not.toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalled();
    });

    it('should log warning and security event when IP changes', async () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      mockReq.user = { id: 1 } as any;
      mockReq.sessionInfo = {
        id: 'session-1',
        userId: 1,
        ipAddress: '127.0.0.1',
        deviceInfo: {},
        issuedAt: new Date(),
        expiresAt: new Date(),
        lastActivity: new Date(),
        isActive: true
      };
      mockReq.ip = '192.168.1.1';
      mockReq.headers = { 'user-agent': 'Mozilla/5.0' };

      await monitorSessionSecurity(mockReq as Request, mockRes as Response, mockNext);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('IP address change detected for user 1')
      );
      expect(sessionManager.handleSecurityEvent).toHaveBeenCalledWith({
        type: 'SUSPICIOUS_LOGIN',
        userId: 1,
        details: {
          originalIp: '127.0.0.1',
          currentIp: '192.168.1.1',
          sessionId: 'session-1',
          userAgent: 'Mozilla/5.0'
        },
        timestamp: expect.any(Date)
      });
      expect(mockNext).toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });

    it('should not log event for unknown session IP', async () => {
      mockReq.user = { id: 1 } as any;
      mockReq.sessionInfo = {
        id: 'session-1',
        userId: 1,
        ipAddress: 'unknown',
        deviceInfo: {},
        issuedAt: new Date(),
        expiresAt: new Date(),
        lastActivity: new Date(),
        isActive: true
      };
      mockReq.ip = '192.168.1.1';

      await monitorSessionSecurity(mockReq as Request, mockRes as Response, mockNext);

      expect(sessionManager.handleSecurityEvent).not.toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalled();
    });

    it('should continue even if error occurs', async () => {
      mockReq.user = { id: 1 } as any;
      mockReq.sessionInfo = {
        id: 'session-1',
        userId: 1,
        ipAddress: '127.0.0.1',
        deviceInfo: {},
        issuedAt: new Date(),
        expiresAt: new Date(),
        lastActivity: new Date(),
        isActive: true
      };
      mockReq.ip = '192.168.1.1';
      vi.mocked(sessionManager.handleSecurityEvent).mockRejectedValue(new Error('Logging error'));

      await monitorSessionSecurity(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('performSessionCleanup', () => {
    it('should cleanup expired sessions', async () => {
      vi.mocked(sessionManager.cleanupExpiredSessions).mockResolvedValue(5);
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      await performSessionCleanup();

      expect(sessionManager.cleanupExpiredSessions).toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Session cleanup completed: 5 expired sessions removed')
      );
      
      consoleSpy.mockRestore();
    });

    it('should not log when no sessions cleaned', async () => {
      vi.mocked(sessionManager.cleanupExpiredSessions).mockResolvedValue(0);
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      await performSessionCleanup();

      expect(consoleSpy).not.toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });

    it('should handle errors gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      vi.mocked(sessionManager.cleanupExpiredSessions).mockRejectedValue(new Error('Cleanup error'));

      await performSessionCleanup();

      expect(consoleSpy).toHaveBeenCalledWith('Session cleanup error:', expect.any(Error));
      
      consoleSpy.mockRestore();
    });
  });

  describe('requireFreshSession', () => {
    it('should return error when sessionInfo is not available', () => {
      mockReq.sessionInfo = undefined;

      const middleware = requireFreshSession(30);
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Session information not available',
          code: 'SESSION_INFO_MISSING'
        })
      );
    });

    it('should allow access when session is fresh', () => {
      mockReq.sessionInfo = {
        id: 'session-1',
        userId: 1,
        ipAddress: '127.0.0.1',
        deviceInfo: {},
        issuedAt: new Date(Date.now() - 10 * 60 * 1000), // 10 minutes ago
        expiresAt: new Date(),
        lastActivity: new Date(),
        isActive: true
      };

      const middleware = requireFreshSession(30);
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should deny access when session is too old', () => {
      mockReq.sessionInfo = {
        id: 'session-1',
        userId: 1,
        ipAddress: '127.0.0.1',
        deviceInfo: {},
        issuedAt: new Date(Date.now() - 45 * 60 * 1000), // 45 minutes ago
        expiresAt: new Date(),
        lastActivity: new Date(),
        isActive: true
      };

      const middleware = requireFreshSession(30);
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Fresh authentication required for this operation',
          code: 'FRESH_AUTH_REQUIRED'
        })
      );
    });

    it('should use custom max age', () => {
      mockReq.sessionInfo = {
        id: 'session-1',
        userId: 1,
        ipAddress: '127.0.0.1',
        deviceInfo: {},
        issuedAt: new Date(Date.now() - 8 * 60 * 1000), // 8 minutes ago
        expiresAt: new Date(),
        lastActivity: new Date(),
        isActive: true
      };

      const middleware = requireFreshSession(5); // 5 minutes
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 'FRESH_AUTH_REQUIRED'
        })
      );
    });
  });

  describe('validateDeviceConsistency', () => {
    it('should continue when sessionInfo is not available', () => {
      mockReq.sessionInfo = undefined;

      const middleware = validateDeviceConsistency();
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should continue when device matches', () => {
      mockReq.sessionInfo = {
        id: 'session-1',
        userId: 1,
        ipAddress: '127.0.0.1',
        deviceInfo: { browser: 'Chrome', platform: 'Windows' },
        issuedAt: new Date(),
        expiresAt: new Date(),
        lastActivity: new Date(),
        isActive: true
      };
      mockReq.headers = { 'user-agent': 'Mozilla/5.0' };
      mockReq.user = { id: 1 } as any;
      
      vi.mocked(SessionManager.parseDeviceInfo).mockReturnValue({
        browser: 'Chrome',
        platform: 'Windows'
      } as any);

      const middleware = validateDeviceConsistency();
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should log warning when device mismatches in non-strict mode', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      mockReq.sessionInfo = {
        id: 'session-1',
        userId: 1,
        ipAddress: '127.0.0.1',
        deviceInfo: { browser: 'Chrome', platform: 'Windows' },
        issuedAt: new Date(),
        expiresAt: new Date(),
        lastActivity: new Date(),
        isActive: true
      };
      mockReq.headers = { 'user-agent': 'Mozilla/5.0' };
      mockReq.user = { id: 1 } as any;
      
      vi.mocked(SessionManager.parseDeviceInfo).mockReturnValue({
        browser: 'Firefox',
        platform: 'Linux'
      } as any);
      vi.mocked(sessionManager.handleSecurityEvent).mockResolvedValue(undefined);

      const middleware = validateDeviceConsistency(false);
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Device mismatch detected'),
        expect.any(Object)
      );
      expect(mockNext).toHaveBeenCalledWith();
      
      consoleSpy.mockRestore();
    });

    it('should deny access when device mismatches in strict mode', () => {
      mockReq.sessionInfo = {
        id: 'session-1',
        userId: 1,
        ipAddress: '127.0.0.1',
        deviceInfo: { browser: 'Chrome', platform: 'Windows' },
        issuedAt: new Date(),
        expiresAt: new Date(),
        lastActivity: new Date(),
        isActive: true
      };
      mockReq.headers = { 'user-agent': 'Mozilla/5.0' };
      mockReq.user = { id: 1 } as any;
      
      vi.mocked(SessionManager.parseDeviceInfo).mockReturnValue({
        browser: 'Firefox',
        platform: 'Linux'
      } as any);

      const middleware = validateDeviceConsistency(true);
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Device validation failed',
          code: 'DEVICE_MISMATCH'
        })
      );
    });

    it('should log security event on device mismatch', () => {
      mockReq.sessionInfo = {
        id: 'session-1',
        userId: 1,
        ipAddress: '127.0.0.1',
        deviceInfo: { browser: 'Chrome', platform: 'Windows' },
        issuedAt: new Date(),
        expiresAt: new Date(),
        lastActivity: new Date(),
        isActive: true
      };
      mockReq.headers = { 'user-agent': 'Mozilla/5.0' };
      mockReq.user = { id: 1 } as any;
      
      vi.mocked(SessionManager.parseDeviceInfo).mockReturnValue({
        browser: 'Firefox',
        platform: 'Linux'
      } as any);
      vi.mocked(sessionManager.handleSecurityEvent).mockResolvedValue(undefined);

      const middleware = validateDeviceConsistency(false);
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(sessionManager.handleSecurityEvent).toHaveBeenCalledWith({
        type: 'SUSPICIOUS_LOGIN',
        userId: 1,
        details: {
          sessionDevice: { browser: 'Chrome', platform: 'Windows' },
          currentDevice: { browser: 'Firefox', platform: 'Linux' },
          sessionId: 'session-1'
        },
        timestamp: expect.any(Date)
      });
    });
  });
});
