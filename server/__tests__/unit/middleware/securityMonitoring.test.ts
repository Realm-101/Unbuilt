/**
 * Security Monitoring Middleware Tests
 * 
 * Tests for security context, API access logging, and monitoring
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mockRequest, mockResponse, mockNext } from '../../mocks/express';

// Mock security logger BEFORE importing the module
vi.mock('../../../services/securityLogger', () => ({
  securityLogger: {
    logSecurityEvent: vi.fn().mockResolvedValue(undefined),
    logApiAccess: vi.fn().mockResolvedValue(undefined),
    logAuthenticationEvent: vi.fn().mockResolvedValue(undefined),
    logDataAccess: vi.fn().mockResolvedValue(undefined),
    logSuspiciousActivity: vi.fn().mockResolvedValue(undefined)
  }
}));

// Mock uuid
vi.mock('uuid', () => ({
  v4: () => 'test-uuid-1234'
}));

import {
  addSecurityContext,
  logApiAccess,
  logAuthenticationEvent,
  logDataAccess,
  logSuspiciousActivity,
  logRateLimitExceeded,
  securityErrorHandler
} from '../../../middleware/securityMonitoring';
import { securityLogger } from '../../../services/securityLogger';

describe('Security Monitoring Middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Restore security logger mocks after clearAllMocks
    vi.mocked(securityLogger.logSecurityEvent).mockResolvedValue(undefined);
    vi.mocked(securityLogger.logApiAccess).mockResolvedValue(undefined);
    vi.mocked(securityLogger.logAuthenticationEvent).mockResolvedValue(undefined);
    vi.mocked(securityLogger.logDataAccess).mockResolvedValue(undefined);
    vi.mocked(securityLogger.logSuspiciousActivity).mockResolvedValue(undefined);
  });

  describe('addSecurityContext', () => {
    it('should add request ID to request', () => {
      const req = mockRequest();
      const res = mockResponse();
      const next = mockNext();

      addSecurityContext(req as any, res as any, next);

      expect((req as any).requestId).toBe('test-uuid-1234');
      expect(next).toHaveBeenCalled();
    });

    it('should extract IP from X-Forwarded-For header', () => {
      const req = mockRequest({
        headers: { 'x-forwarded-for': '203.0.113.1, 198.51.100.1' }
      });
      const res = mockResponse();
      const next = mockNext();

      addSecurityContext(req as any, res as any, next);

      expect((req as any).securityContext.ipAddress).toBe('203.0.113.1');
    });

    it('should extract IP from X-Real-IP header', () => {
      const req = mockRequest({
        headers: { 'x-real-ip': '203.0.113.2' }
      });
      const res = mockResponse();
      const next = mockNext();

      addSecurityContext(req as any, res as any, next);

      expect((req as any).securityContext.ipAddress).toBe('203.0.113.2');
    });

    it('should fallback to connection remote address', () => {
      const req = mockRequest({
        connection: { remoteAddress: '192.168.1.1' }
      });
      const res = mockResponse();
      const next = mockNext();

      addSecurityContext(req as any, res as any, next);

      expect((req as any).securityContext.ipAddress).toBe('192.168.1.1');
    });

    it('should extract user agent', () => {
      const req = mockRequest({
        headers: { 'user-agent': 'Mozilla/5.0' }
      });
      const res = mockResponse();
      const next = mockNext();

      addSecurityContext(req as any, res as any, next);

      expect((req as any).securityContext.userAgent).toBe('Mozilla/5.0');
    });

    it('should include user information if authenticated', () => {
      const req = mockRequest({
        user: { id: 123, email: 'test@example.com', jti: 'jwt-id-123' }
      });
      const res = mockResponse();
      const next = mockNext();

      addSecurityContext(req as any, res as any, next);

      expect((req as any).securityContext.userId).toBe(123);
      expect((req as any).securityContext.userEmail).toBe('test@example.com');
      expect((req as any).securityContext.sessionId).toBe('jwt-id-123');
    });

    it('should handle errors gracefully', () => {
      const req = mockRequest();
      const res = mockResponse();
      const next = mockNext();

      // Make headers access throw
      Object.defineProperty(req, 'headers', {
        get: () => {
          throw new Error('Headers error');
        }
      });

      addSecurityContext(req as any, res as any, next);

      // Should still call next
      expect(next).toHaveBeenCalled();
    });
  });

  describe('logApiAccess', () => {
    it('should log API access on response end', async () => {
      const req = mockRequest({
        method: 'GET',
        path: '/api/users',
        securityContext: {
          userId: 123,
          ipAddress: '192.168.1.1',
          userAgent: 'Test Browser'
        },
        requestId: 'req-123'
      });
      const res = mockResponse();
      const next = mockNext();

      logApiAccess(req as any, res as any, next);

      // Simulate response end
      await (res.end as any)();

      expect(securityLogger.logApiAccess).toHaveBeenCalledWith(
        'GET',
        '/api/users',
        200,
        expect.objectContaining({
          userId: 123,
          ipAddress: '192.168.1.1',
          userAgent: 'Test Browser',
          requestId: 'req-123'
        })
      );
    });

    it('should include response duration', async () => {
      const req = mockRequest({
        method: 'POST',
        path: '/api/data',
        securityContext: {}
      });
      const res = mockResponse();
      const next = mockNext();

      logApiAccess(req as any, res as any, next);

      // Wait a bit
      await new Promise(resolve => setTimeout(resolve, 10));

      // Simulate response end
      await (res.end as any)();

      expect(securityLogger.logApiAccess).toHaveBeenCalledWith(
        'POST',
        '/api/data',
        200,
        expect.objectContaining({
          metadata: expect.objectContaining({
            duration: expect.any(Number)
          })
        })
      );
    });

    it('should sanitize sensitive request bodies', async () => {
      const req = mockRequest({
        method: 'POST',
        path: '/api/auth/login',
        body: { username: 'test', password: 'secret123' },
        securityContext: {}
      });
      const res = mockResponse();
      const next = mockNext();

      logApiAccess(req as any, res as any, next);
      await (res.end as any)();

      // Should not log body for sensitive endpoints (like auth endpoints)
      const call = (securityLogger.logApiAccess as any).mock.calls[0];
      expect(call[3].metadata.body).toBeUndefined();
    });

    it('should handle errors gracefully', () => {
      const req = mockRequest();
      const res = mockResponse();
      const next = mockNext();

      // Make res.end throw
      Object.defineProperty(res, 'end', {
        get: () => {
          throw new Error('End error');
        }
      });

      logApiAccess(req as any, res as any, next);

      // Should still call next
      expect(next).toHaveBeenCalled();
    });
  });

  describe('logAuthenticationEvent', () => {
    it('should log successful authentication', () => {
      const middleware = logAuthenticationEvent('AUTH_SUCCESS', 'user@example.com');
      const req = mockRequest({
        securityContext: {
          ipAddress: '192.168.1.1',
          userAgent: 'Test Browser'
        },
        requestId: 'req-123'
      });
      const res = mockResponse();
      const next = mockNext();

      middleware(req as any, res as any, next);

      expect(securityLogger.logAuthenticationEvent).toHaveBeenCalledWith(
        'AUTH_SUCCESS',
        'user@example.com',
        expect.objectContaining({
          ipAddress: '192.168.1.1',
          userAgent: 'Test Browser',
          requestId: 'req-123'
        }),
        undefined
      );
      expect(next).toHaveBeenCalled();
    });

    it('should log failed authentication with error', () => {
      const middleware = logAuthenticationEvent(
        'AUTH_FAILURE',
        'user@example.com',
        'Invalid credentials'
      );
      const req = mockRequest({
        securityContext: {}
      });
      const res = mockResponse();
      const next = mockNext();

      middleware(req as any, res as any, next);

      expect(securityLogger.logAuthenticationEvent).toHaveBeenCalledWith(
        'AUTH_FAILURE',
        'user@example.com',
        expect.any(Object),
        'Invalid credentials'
      );
    });

    it('should extract email from request body if not provided', () => {
      const middleware = logAuthenticationEvent('AUTH_FAILURE');
      const req = mockRequest({
        body: { email: 'body@example.com' },
        securityContext: {}
      });
      const res = mockResponse();
      const next = mockNext();

      middleware(req as any, res as any, next);

      expect(securityLogger.logAuthenticationEvent).toHaveBeenCalledWith(
        'AUTH_FAILURE',
        'body@example.com',
        expect.any(Object),
        undefined
      );
    });

    it('should handle errors gracefully', () => {
      const middleware = logAuthenticationEvent('AUTH_SUCCESS');
      const req = mockRequest();
      const res = mockResponse();
      const next = mockNext();

      // Make securityContext access throw
      Object.defineProperty(req, 'securityContext', {
        get: () => {
          throw new Error('Context error');
        }
      });

      middleware(req as any, res as any, next);

      // Should still call next
      expect(next).toHaveBeenCalled();
    });
  });

  describe('logDataAccess', () => {
    it('should log data read access', () => {
      const middleware = logDataAccess('user', 'read');
      const req = mockRequest({
        params: { id: '123' },
        securityContext: {
          userId: 456,
          ipAddress: '192.168.1.1'
        }
      });
      const res = mockResponse();
      const next = mockNext();

      middleware(req as any, res as any, next);

      expect(securityLogger.logDataAccess).toHaveBeenCalledWith(
        'user',
        '123',
        'read',
        expect.objectContaining({
          userId: 456,
          ipAddress: '192.168.1.1'
        })
      );
      expect(next).toHaveBeenCalled();
    });

    it('should log data create access', () => {
      const middleware = logDataAccess('document', 'create');
      const req = mockRequest({
        body: { id: 789 },
        securityContext: {}
      });
      const res = mockResponse();
      const next = mockNext();

      middleware(req as any, res as any, next);

      expect(securityLogger.logDataAccess).toHaveBeenCalledWith(
        'document',
        '789',
        'create',
        expect.any(Object)
      );
    });

    it('should log data update access', () => {
      const middleware = logDataAccess('profile', 'update');
      const req = mockRequest({
        params: { userId: '999' },
        securityContext: {}
      });
      const res = mockResponse();
      const next = mockNext();

      middleware(req as any, res as any, next);

      expect(securityLogger.logDataAccess).toHaveBeenCalledWith(
        'profile',
        '999',
        'update',
        expect.any(Object)
      );
    });

    it('should log data delete access', () => {
      const middleware = logDataAccess('item', 'delete');
      const req = mockRequest({
        params: { id: '555' },
        securityContext: {}
      });
      const res = mockResponse();
      const next = mockNext();

      middleware(req as any, res as any, next);

      expect(securityLogger.logDataAccess).toHaveBeenCalledWith(
        'item',
        '555',
        'delete',
        expect.any(Object)
      );
    });

    it('should handle missing resource ID', () => {
      const middleware = logDataAccess('resource', 'read');
      const req = mockRequest({
        securityContext: {}
      });
      const res = mockResponse();
      const next = mockNext();

      middleware(req as any, res as any, next);

      expect(securityLogger.logDataAccess).toHaveBeenCalledWith(
        'resource',
        'unknown',
        'read',
        expect.any(Object)
      );
    });
  });

  describe('logSuspiciousActivity', () => {
    it('should log suspicious activity', () => {
      const middleware = logSuspiciousActivity('Multiple failed login attempts');
      const req = mockRequest({
        securityContext: {
          userId: 123,
          ipAddress: '192.168.1.1'
        }
      });
      const res = mockResponse();
      const next = mockNext();

      middleware(req as any, res as any, next);

      expect(securityLogger.logSuspiciousActivity).toHaveBeenCalledWith(
        'Multiple failed login attempts',
        expect.objectContaining({
          userId: 123,
          ipAddress: '192.168.1.1'
        }),
        undefined
      );
      expect(next).toHaveBeenCalled();
    });

    it('should include additional metadata', () => {
      const metadata = { attemptCount: 5, timeWindow: '5 minutes' };
      const middleware = logSuspiciousActivity('Brute force detected', metadata);
      const req = mockRequest({
        securityContext: {}
      });
      const res = mockResponse();
      const next = mockNext();

      middleware(req as any, res as any, next);

      expect(securityLogger.logSuspiciousActivity).toHaveBeenCalledWith(
        'Brute force detected',
        expect.objectContaining({
          metadata: expect.objectContaining({
            attemptCount: 5,
            timeWindow: '5 minutes'
          })
        }),
        metadata
      );
    });
  });

  describe('logRateLimitExceeded', () => {
    it('should log rate limit exceeded event', () => {
      const req = mockRequest({
        method: 'POST',
        path: '/api/search',
        securityContext: {
          userId: 123,
          ipAddress: '192.168.1.1'
        }
      });
      const res = mockResponse();
      const next = mockNext();

      logRateLimitExceeded(req as any, res as any, next);

      expect(securityLogger.logSecurityEvent).toHaveBeenCalledWith(
        'RATE_LIMIT_EXCEEDED',
        'rate_limit_exceeded',
        false,
        expect.objectContaining({
          userId: 123,
          ipAddress: '192.168.1.1',
          metadata: expect.objectContaining({
            method: 'POST',
            endpoint: '/api/search'
          })
        }),
        'Rate limit exceeded'
      );
      expect(next).toHaveBeenCalled();
    });
  });

  describe('securityErrorHandler', () => {
    it('should log security-related errors', () => {
      const error = {
        name: 'UnauthorizedError',
        message: 'Invalid token',
        statusCode: 401
      };
      const req = mockRequest({
        securityContext: {
          userId: 123,
          ipAddress: '192.168.1.1'
        }
      });
      const res = mockResponse();
      const next = mockNext();

      securityErrorHandler(error, req as any, res as any, next);

      expect(securityLogger.logSecurityEvent).toHaveBeenCalledWith(
        'SECURITY_VIOLATION',
        'security_error',
        false,
        expect.objectContaining({
          userId: 123,
          ipAddress: '192.168.1.1',
          metadata: expect.objectContaining({
            errorType: 'UnauthorizedError'
          })
        }),
        'Invalid token'
      );
      expect(next).toHaveBeenCalledWith(error);
    });

    it('should detect authentication errors', () => {
      const error = {
        name: 'AuthenticationError',
        message: 'Authentication failed',
        code: 'INVALID_CREDENTIALS'
      };
      const req = mockRequest({ securityContext: {} });
      const res = mockResponse();
      const next = mockNext();

      securityErrorHandler(error, req as any, res as any, next);

      expect(securityLogger.logSecurityEvent).toHaveBeenCalled();
    });

    it('should detect rate limit errors', () => {
      const error = {
        name: 'RateLimitError',
        message: 'Too many requests',
        code: 'RATE_LIMIT_EXCEEDED'
      };
      const req = mockRequest({ securityContext: {} });
      const res = mockResponse();
      const next = mockNext();

      securityErrorHandler(error, req as any, res as any, next);

      expect(securityLogger.logSecurityEvent).toHaveBeenCalled();
    });

    it('should detect 401 status code errors', () => {
      const error = {
        name: 'Error',
        message: 'Unauthorized',
        statusCode: 401
      };
      const req = mockRequest({ securityContext: {} });
      const res = mockResponse();
      const next = mockNext();

      securityErrorHandler(error, req as any, res as any, next);

      expect(securityLogger.logSecurityEvent).toHaveBeenCalled();
    });

    it('should detect 403 status code errors', () => {
      const error = {
        name: 'Error',
        message: 'Forbidden',
        statusCode: 403
      };
      const req = mockRequest({ securityContext: {} });
      const res = mockResponse();
      const next = mockNext();

      securityErrorHandler(error, req as any, res as any, next);

      expect(securityLogger.logSecurityEvent).toHaveBeenCalled();
    });

    it('should not log non-security errors', () => {
      const error = {
        name: 'DatabaseError',
        message: 'Connection failed',
        statusCode: 500
      };
      const req = mockRequest({ securityContext: {} });
      const res = mockResponse();
      const next = mockNext();

      // Clear previous calls
      vi.clearAllMocks();

      securityErrorHandler(error, req as any, res as any, next);

      expect(securityLogger.logSecurityEvent).not.toHaveBeenCalled();
      expect(next).toHaveBeenCalledWith(error);
    });
  });
});

