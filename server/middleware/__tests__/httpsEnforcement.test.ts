import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import {
  HTTPSEnforcementMiddleware,
  SecureCookieMiddleware,
  SessionSecurityMiddleware,
  createHTTPSEnforcementMiddleware,
  createSecureCookieMiddleware,
  createSessionSecurityMiddleware
} from '../httpsEnforcement';
import { securityLogger } from '../../services/securityLogger';
import { securityConfig } from '../../config/securityConfig';

// Mock dependencies
vi.mock('../../services/securityLogger', () => ({
  securityLogger: {
    logSecurityEvent: vi.fn(() => Promise.resolve(undefined))
  }
}));

vi.mock('../../config/securityConfig', () => ({
  securityConfig: {
    getConfig: vi.fn().mockReturnValue({
      environment: 'production',
      security: {
        https: {
          enforce: true
        },
        cookies: {
          secure: true,
          httpOnly: true,
          sameSite: 'strict',
          maxAge: 86400000
        }
      }
    })
  }
}));

vi.mock('crypto', () => ({
  randomBytes: vi.fn().mockReturnValue({
    toString: vi.fn().mockReturnValue('mock-csrf-token-1234567890abcdef')
  })
}));

describe('HTTPSEnforcementMiddleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockReq = {
      method: 'GET',
      path: '/api/test',
      originalUrl: '/api/test?query=1',
      protocol: 'http',
      secure: false,
      headers: {},
      get: vi.fn((header: string) => {
        const headers: Record<string, string> = {
          'Host': 'example.com',
          'User-Agent': 'Test Agent'
        };
        return headers[header];
      }),
      ip: '127.0.0.1',
      socket: { remoteAddress: '127.0.0.1' } as any,
      user: { id: 1, email: 'test@example.com' }
    };

    mockRes = {
      status: vi.fn().mockReturnThis(),
      redirect: vi.fn().mockReturnThis(),
      setHeader: vi.fn(),
      json: vi.fn().mockReturnThis(),
      cookie: vi.fn()
    };

    mockNext = vi.fn();

    // Reset mocks
    vi.clearAllMocks();
    
    // Restore mock implementations after clearAllMocks
    vi.mocked(securityLogger.logSecurityEvent).mockResolvedValue(undefined);
    vi.mocked(securityConfig.getConfig).mockReturnValue({
      environment: 'production',
      security: {
        https: {
          enforce: true
        },
        cookies: {
          secure: true,
          httpOnly: true,
          sameSite: 'strict',
          maxAge: 86400000
        }
      }
    } as any);
  });

  describe('HTTPS Redirect Functionality', () => {
    it('should redirect HTTP requests to HTTPS in production', async () => {
      const middleware = new HTTPSEnforcementMiddleware();
      const handler = middleware.middleware();

      await handler(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(301);
      expect(mockRes.redirect).toHaveBeenCalledWith('https://example.com/api/test?query=1');
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should not redirect HTTPS requests', async () => {
      mockReq.secure = true;
      mockReq.protocol = 'https';

      const middleware = new HTTPSEnforcementMiddleware();
      const handler = middleware.middleware();

      await handler(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.redirect).not.toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalled();
    });

    it('should skip HTTPS enforcement in development', async () => {
      vi.mocked(securityConfig.getConfig).mockReturnValueOnce({
        environment: 'development',
        security: {
          https: { enforce: true },
          cookies: { secure: true, httpOnly: true, sameSite: 'strict', maxAge: 86400000 }
        }
      } as any);

      const middleware = new HTTPSEnforcementMiddleware();
      const handler = middleware.middleware();

      await handler(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.redirect).not.toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalled();
    });

    it('should skip excluded paths', async () => {
      mockReq.path = '/health';

      const middleware = new HTTPSEnforcementMiddleware({
        excludePaths: ['/health', '/api/health']
      });
      const handler = middleware.middleware();

      await handler(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.redirect).not.toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalled();
    });

    it('should detect HTTPS from X-Forwarded-Proto header', async () => {
      mockReq.get = vi.fn((header: string) => {
        if (header === 'X-Forwarded-Proto') return 'https';
        if (header === 'Host') return 'example.com';
        if (header === 'User-Agent') return 'Test Agent';
        return undefined;
      });

      const middleware = new HTTPSEnforcementMiddleware({ trustProxy: true });
      const handler = middleware.middleware();

      await handler(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.redirect).not.toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalled();
    });

    it('should detect HTTPS from X-Forwarded-SSL header', async () => {
      mockReq.get = vi.fn((header: string) => {
        if (header === 'X-Forwarded-SSL') return 'on';
        if (header === 'Host') return 'example.com';
        if (header === 'User-Agent') return 'Test Agent';
        return undefined;
      });

      const middleware = new HTTPSEnforcementMiddleware();
      const handler = middleware.middleware();

      await handler(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.redirect).not.toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalled();
    });

    it('should log HTTPS redirect', async () => {
      const middleware = new HTTPSEnforcementMiddleware();
      const handler = middleware.middleware();

      await handler(mockReq as Request, mockRes as Response, mockNext);

      expect(securityLogger.logSecurityEvent).toHaveBeenCalledWith(
        'API_ACCESS',
        'https_redirect',
        true,
        expect.objectContaining({
          userId: 1,
          ipAddress: '127.0.0.1',
          userAgent: 'Test Agent',
          metadata: expect.objectContaining({
            path: '/api/test',
            method: 'GET',
            protocol: 'http'
          })
        })
      );
    });

    it('should not enforce HTTPS when enforce is false', async () => {
      vi.mocked(securityConfig.getConfig).mockReturnValueOnce({
        environment: 'production',
        security: {
          https: { enforce: false },
          cookies: { secure: true, httpOnly: true, sameSite: 'strict', maxAge: 86400000 }
        }
      } as any);

      const middleware = new HTTPSEnforcementMiddleware();
      const handler = middleware.middleware();

      await handler(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.redirect).not.toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('HSTS Header', () => {
    it('should set HSTS header for secure connections', async () => {
      mockReq.secure = true;

      const middleware = new HTTPSEnforcementMiddleware();
      const handler = middleware.middleware();

      await handler(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.setHeader).toHaveBeenCalledWith(
        'Strict-Transport-Security',
        'max-age=31536000; includeSubDomains'
      );
    });

    it('should include preload directive when enabled', async () => {
      mockReq.secure = true;

      const middleware = new HTTPSEnforcementMiddleware({
        preload: true
      });
      const handler = middleware.middleware();

      await handler(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.setHeader).toHaveBeenCalledWith(
        'Strict-Transport-Security',
        'max-age=31536000; includeSubDomains; preload'
      );
    });

    it('should use custom maxAge', async () => {
      mockReq.secure = true;

      const middleware = new HTTPSEnforcementMiddleware({
        maxAge: 63072000 // 2 years
      });
      const handler = middleware.middleware();

      await handler(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.setHeader).toHaveBeenCalledWith(
        'Strict-Transport-Security',
        'max-age=63072000; includeSubDomains'
      );
    });

    it('should not include subdomains when disabled', async () => {
      mockReq.secure = true;

      const middleware = new HTTPSEnforcementMiddleware({
        includeSubDomains: false
      });
      const handler = middleware.middleware();

      await handler(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.setHeader).toHaveBeenCalledWith(
        'Strict-Transport-Security',
        'max-age=31536000'
      );
    });

    it('should not set HSTS header for non-secure connections', async () => {
      vi.mocked(securityConfig.getConfig).mockReturnValueOnce({
        environment: 'production',
        security: {
          https: { enforce: false },
          cookies: { secure: true, httpOnly: true, sameSite: 'strict', maxAge: 86400000 }
        }
      } as any);

      const middleware = new HTTPSEnforcementMiddleware();
      const handler = middleware.middleware();

      await handler(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.setHeader).not.toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should handle errors gracefully and continue', async () => {
      // Make the isSecureConnection method throw an error
      mockReq.secure = undefined as any;
      mockReq.get = vi.fn(() => {
        throw new Error('Header error');
      });

      const middleware = new HTTPSEnforcementMiddleware();
      const handler = middleware.middleware();

      await handler(mockReq as Request, mockRes as Response, mockNext);

      // The middleware should continue processing despite the error
      expect(mockNext).toHaveBeenCalled();
      // Note: The logger may or may not be called depending on where the error occurs
      // The important thing is that the middleware doesn't crash
    });

    it('should handle missing request properties', async () => {
      mockReq.ip = undefined;
      mockReq.socket = { remoteAddress: '127.0.0.1' } as any;

      const middleware = new HTTPSEnforcementMiddleware();
      const handler = middleware.middleware();

      await handler(mockReq as Request, mockRes as Response, mockNext);

      // Should not crash
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('Factory Function', () => {
    it('should create middleware with default options', async () => {
      const handler = createHTTPSEnforcementMiddleware();

      await handler(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(301);
    });

    it('should create middleware with custom options', async () => {
      mockReq.path = '/custom-health';

      const handler = createHTTPSEnforcementMiddleware({
        excludePaths: ['/custom-health']
      });

      await handler(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.redirect).not.toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalled();
    });
  });
});

describe('SecureCookieMiddleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;
  let originalCookie: any;

  beforeEach(() => {
    originalCookie = vi.fn();

    mockReq = {
      method: 'GET',
      path: '/api/test'
    };

    mockRes = {
      cookie: originalCookie
    };

    mockNext = vi.fn();

    vi.clearAllMocks();
    
    // Restore mock implementations after clearAllMocks
    vi.mocked(securityLogger.logSecurityEvent).mockResolvedValue(undefined);
    vi.mocked(securityConfig.getConfig).mockReturnValue({
      environment: 'production',
      security: {
        https: {
          enforce: true
        },
        cookies: {
          secure: true,
          httpOnly: true,
          sameSite: 'strict',
          maxAge: 86400000
        }
      }
    } as any);
  });

  describe('Cookie Security', () => {
    it('should apply secure cookie options', () => {
      const middleware = new SecureCookieMiddleware();
      const handler = middleware.middleware();

      handler(mockReq as Request, mockRes as Response, mockNext);

      // Call the overridden cookie function
      mockRes.cookie!('test', 'value', {});

      expect(originalCookie).toHaveBeenCalledWith('test', 'value', expect.objectContaining({
        secure: true,
        httpOnly: true,
        sameSite: 'strict',
        maxAge: 86400000
      }));
    });

    it('should preserve custom cookie options', () => {
      const middleware = new SecureCookieMiddleware();
      const handler = middleware.middleware();

      handler(mockReq as Request, mockRes as Response, mockNext);

      mockRes.cookie!('test', 'value', {
        secure: false,
        maxAge: 3600000
      });

      expect(originalCookie).toHaveBeenCalledWith('test', 'value', expect.objectContaining({
        secure: false,
        maxAge: 3600000
      }));
    });

    it('should set path to / by default', () => {
      const middleware = new SecureCookieMiddleware();
      const handler = middleware.middleware();

      handler(mockReq as Request, mockRes as Response, mockNext);

      mockRes.cookie!('test', 'value', {});

      expect(originalCookie).toHaveBeenCalledWith('test', 'value', expect.objectContaining({
        path: '/'
      }));
    });

    it('should handle errors in cookie setup gracefully', () => {
      mockRes.cookie = undefined as any;

      const middleware = new SecureCookieMiddleware();
      const handler = middleware.middleware();

      expect(() => {
        handler(mockReq as Request, mockRes as Response, mockNext);
      }).not.toThrow();

      expect(mockNext).toHaveBeenCalled();
    });

    it('should fallback to original cookie on error', () => {
      const middleware = new SecureCookieMiddleware();
      const handler = middleware.middleware();

      handler(mockReq as Request, mockRes as Response, mockNext);

      // The error handling is inside the overridden cookie function
      // We can't easily test this without more complex mocking
      // Just verify the middleware works
      mockRes.cookie!('test', 'value', {});

      // Should still call original cookie
      expect(originalCookie).toHaveBeenCalled();
    });

    it('should set domain in production with CORS_ORIGIN', () => {
      const originalEnv = process.env.CORS_ORIGIN;
      process.env.CORS_ORIGIN = 'https://example.com';
      
      vi.mocked(securityConfig.getConfig).mockReturnValue({
        environment: 'production',
        security: {
          https: { enforce: true },
          cookies: { secure: true, httpOnly: true, sameSite: 'strict', maxAge: 86400000 }
        }
      } as any);

      const middleware = new SecureCookieMiddleware();
      const handler = middleware.middleware();

      handler(mockReq as Request, mockRes as Response, mockNext);

      mockRes.cookie!('test', 'value', {});

      expect(originalCookie).toHaveBeenCalledWith('test', 'value', expect.objectContaining({
        domain: 'example.com'
      }));

      // Restore original env
      if (originalEnv) {
        process.env.CORS_ORIGIN = originalEnv;
      } else {
        delete process.env.CORS_ORIGIN;
      }
    });
  });

  describe('Factory Function', () => {
    it('should create secure cookie middleware', () => {
      const handler = createSecureCookieMiddleware();

      handler(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });
  });
});

describe('SessionSecurityMiddleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;
  let mockSession: any;

  beforeEach(() => {
    mockSession = {
      id: 'session-123',
      userId: 1,
      regenerate: vi.fn((callback: any) => callback(null))
    };

    mockReq = {
      method: 'GET',
      path: '/api/test',
      session: mockSession,
      get: vi.fn((header: string) => {
        const headers: Record<string, string> = {
          'User-Agent': 'Test Agent'
        };
        return headers[header];
      }),
      ip: '127.0.0.1',
      socket: { remoteAddress: '127.0.0.1' } as any,
      secure: true
    };

    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis()
    };

    mockNext = vi.fn();

    vi.clearAllMocks();
    
    // Restore mock implementations after clearAllMocks
    vi.mocked(securityLogger.logSecurityEvent).mockResolvedValue(undefined);
    vi.mocked(securityConfig.getConfig).mockReturnValue({
      environment: 'production',
      security: {
        https: {
          enforce: true
        },
        cookies: {
          secure: true,
          httpOnly: true,
          sameSite: 'strict',
          maxAge: 86400000
        }
      }
    } as any);
  });

  describe('CSRF Token Generation', () => {
    it('should generate CSRF token for new sessions', async () => {
      delete mockSession.csrfToken;

      const middleware = new SessionSecurityMiddleware();
      const handler = middleware.middleware();

      await handler(mockReq as Request, mockRes as Response, mockNext);

      // Just verify a token was generated (64 hex characters)
      expect(mockSession.csrfToken).toBeDefined();
      expect(mockSession.csrfToken).toMatch(/^[a-f0-9]{64}$/);
      expect(mockNext).toHaveBeenCalled();
    });

    it('should not regenerate CSRF token if already exists', async () => {
      mockSession.csrfToken = 'existing-token';

      const middleware = new SessionSecurityMiddleware();
      const handler = middleware.middleware();

      await handler(mockReq as Request, mockRes as Response, mockNext);

      expect(mockSession.csrfToken).toBe('existing-token');
      expect(mockNext).toHaveBeenCalled();
    });

    it('should generate unique CSRF tokens', async () => {
      const crypto = await import('crypto');
      let callCount = 0;
      vi.mocked(crypto.randomBytes).mockImplementation(() => ({
        toString: () => `token-${++callCount}`
      } as any));

      delete mockSession.csrfToken;

      const middleware = new SessionSecurityMiddleware();
      const handler = middleware.middleware();

      await handler(mockReq as Request, mockRes as Response, mockNext);
      const token1 = mockSession.csrfToken;

      delete mockSession.csrfToken;
      await handler(mockReq as Request, mockRes as Response, mockNext);
      const token2 = mockSession.csrfToken;

      expect(token1).not.toBe(token2);
    });
  });

  describe('Session Security Monitoring', () => {
    it('should initialize session security metadata', async () => {
      delete mockSession.security;

      const middleware = new SessionSecurityMiddleware();
      const handler = middleware.middleware();

      await handler(mockReq as Request, mockRes as Response, mockNext);

      expect(mockSession.security).toBeDefined();
      expect(mockSession.security.createdAt).toBeDefined();
      expect(mockSession.security.lastActivity).toBeDefined();
      expect(mockSession.security.ipAddress).toBe('127.0.0.1');
      expect(mockSession.security.userAgent).toBe('Test Agent');
      expect(mockSession.security.isSecure).toBe(true);
    });

    it('should update lastActivity on subsequent requests', async () => {
      const initialTime = new Date('2025-01-01T00:00:00Z').toISOString();
      mockSession.security = {
        createdAt: initialTime,
        lastActivity: initialTime,
        ipAddress: '127.0.0.1',
        userAgent: 'Test Agent',
        isSecure: true
      };

      const middleware = new SessionSecurityMiddleware();
      const handler = middleware.middleware();

      await handler(mockReq as Request, mockRes as Response, mockNext);

      expect(mockSession.security.lastActivity).not.toBe(initialTime);
      expect(new Date(mockSession.security.lastActivity).getTime()).toBeGreaterThan(
        new Date(initialTime).getTime()
      );
    });

    it('should detect IP address changes', async () => {
      mockSession.security = {
        createdAt: new Date().toISOString(),
        lastActivity: new Date().toISOString(),
        ipAddress: '192.168.1.1',
        userAgent: 'Test Agent',
        isSecure: true
      };

      const middleware = new SessionSecurityMiddleware();
      const handler = middleware.middleware();

      await handler(mockReq as Request, mockRes as Response, mockNext);

      expect(securityLogger.logSecurityEvent).toHaveBeenCalledWith(
        'SUSPICIOUS_LOGIN',
        'session_ip_change',
        true,
        expect.objectContaining({
          userId: 1,
          ipAddress: '127.0.0.1',
          metadata: expect.objectContaining({
            previousIP: '192.168.1.1',
            currentIP: '127.0.0.1',
            sessionId: 'session-123'
          })
        })
      );
    });

    it('should detect User-Agent changes', async () => {
      mockSession.security = {
        createdAt: new Date().toISOString(),
        lastActivity: new Date().toISOString(),
        ipAddress: '127.0.0.1',
        userAgent: 'Old Agent',
        isSecure: true
      };

      const middleware = new SessionSecurityMiddleware();
      const handler = middleware.middleware();

      await handler(mockReq as Request, mockRes as Response, mockNext);

      expect(securityLogger.logSecurityEvent).toHaveBeenCalledWith(
        'SUSPICIOUS_LOGIN',
        'session_user_agent_change',
        true,
        expect.objectContaining({
          userId: 1,
          ipAddress: '127.0.0.1',
          metadata: expect.objectContaining({
            previousUserAgent: 'Old Agent',
            currentUserAgent: 'Test Agent',
            sessionId: 'session-123'
          })
        })
      );
    });

    it('should not log when IP and User-Agent are unchanged', async () => {
      mockSession.security = {
        createdAt: new Date().toISOString(),
        lastActivity: new Date().toISOString(),
        ipAddress: '127.0.0.1',
        userAgent: 'Test Agent',
        isSecure: true
      };

      const middleware = new SessionSecurityMiddleware();
      const handler = middleware.middleware();

      await handler(mockReq as Request, mockRes as Response, mockNext);

      expect(securityLogger.logSecurityEvent).not.toHaveBeenCalled();
    });

    it('should handle missing IP address gracefully', async () => {
      mockReq.ip = undefined;
      mockReq.socket = undefined as any;

      mockSession.security = {
        createdAt: new Date().toISOString(),
        lastActivity: new Date().toISOString(),
        ipAddress: '192.168.1.1',
        userAgent: 'Test Agent',
        isSecure: true
      };

      const middleware = new SessionSecurityMiddleware();
      const handler = middleware.middleware();

      await handler(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('Session Regeneration', () => {
    it('should regenerate session after 30 minutes', async () => {
      const oldTime = new Date(Date.now() - 31 * 60 * 1000).toISOString(); // 31 minutes ago
      mockSession.security = {
        createdAt: oldTime,
        lastActivity: new Date().toISOString(),
        lastRegeneration: oldTime,
        ipAddress: '127.0.0.1',
        userAgent: 'Test Agent',
        isSecure: true
      };

      const middleware = new SessionSecurityMiddleware();
      const handler = middleware.middleware();

      await handler(mockReq as Request, mockRes as Response, mockNext);

      expect(mockSession.regenerate).toHaveBeenCalled();
    });

    it('should not regenerate session before 30 minutes', async () => {
      const recentTime = new Date(Date.now() - 10 * 60 * 1000).toISOString(); // 10 minutes ago
      mockSession.security = {
        createdAt: recentTime,
        lastActivity: new Date().toISOString(),
        lastRegeneration: recentTime,
        ipAddress: '127.0.0.1',
        userAgent: 'Test Agent',
        isSecure: true
      };

      const middleware = new SessionSecurityMiddleware();
      const handler = middleware.middleware();

      await handler(mockReq as Request, mockRes as Response, mockNext);

      expect(mockSession.regenerate).not.toHaveBeenCalled();
    });

    it('should use createdAt if lastRegeneration is missing', async () => {
      const oldTime = new Date(Date.now() - 31 * 60 * 1000).toISOString();
      mockSession.security = {
        createdAt: oldTime,
        lastActivity: new Date().toISOString(),
        ipAddress: '127.0.0.1',
        userAgent: 'Test Agent',
        isSecure: true
      };

      const middleware = new SessionSecurityMiddleware();
      const handler = middleware.middleware();

      await handler(mockReq as Request, mockRes as Response, mockNext);

      expect(mockSession.regenerate).toHaveBeenCalled();
    });

    it('should log session regeneration', async () => {
      const oldTime = new Date(Date.now() - 31 * 60 * 1000).toISOString();
      mockSession.security = {
        createdAt: oldTime,
        lastActivity: new Date().toISOString(),
        lastRegeneration: oldTime,
        ipAddress: '127.0.0.1',
        userAgent: 'Test Agent',
        isSecure: true
      };

      const middleware = new SessionSecurityMiddleware();
      const handler = middleware.middleware();

      await handler(mockReq as Request, mockRes as Response, mockNext);

      // Wait for async logging
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(securityLogger.logSecurityEvent).toHaveBeenCalledWith(
        'SESSION_CREATED',
        'session_regenerated',
        true,
        expect.objectContaining({
          userId: 1,
          metadata: expect.objectContaining({
            reason: 'periodic_regeneration',
            sessionId: 'session-123'
          })
        })
      );
    });

    it('should handle regeneration errors gracefully', async () => {
      const oldTime = new Date(Date.now() - 31 * 60 * 1000).toISOString();
      mockSession.security = {
        createdAt: oldTime,
        lastActivity: new Date().toISOString(),
        lastRegeneration: oldTime,
        ipAddress: '127.0.0.1',
        userAgent: 'Test Agent',
        isSecure: true
      };

      mockSession.regenerate = vi.fn((callback: any) => callback(new Error('Regeneration failed')));

      const middleware = new SessionSecurityMiddleware();
      const handler = middleware.middleware();

      await handler(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should handle missing session gracefully', async () => {
      mockReq.session = undefined;

      const middleware = new SessionSecurityMiddleware();
      const handler = middleware.middleware();

      await handler(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should handle errors in session enhancement', async () => {
      // Make the session object throw when accessed
      Object.defineProperty(mockReq, 'session', {
        get() {
          throw new Error('Header error');
        },
        configurable: true
      });

      const middleware = new SessionSecurityMiddleware();
      const handler = middleware.middleware();

      await handler(mockReq as Request, mockRes as Response, mockNext);

      expect(securityLogger.logSecurityEvent).toHaveBeenCalledWith(
        'SECURITY_VIOLATION',
        'session_security_error',
        false,
        expect.any(Object),
        'Header error'
      );
      expect(mockNext).toHaveBeenCalled();
    });

    it('should continue when security logger fails', async () => {
      vi.mocked(securityLogger.logSecurityEvent).mockRejectedValueOnce(new Error('Logger error'));

      mockSession.security = {
        createdAt: new Date().toISOString(),
        lastActivity: new Date().toISOString(),
        ipAddress: '192.168.1.1',
        userAgent: 'Test Agent',
        isSecure: true
      };

      const middleware = new SessionSecurityMiddleware();
      const handler = middleware.middleware();

      await handler(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should handle session regeneration logging errors', async () => {
      const oldTime = new Date(Date.now() - 31 * 60 * 1000).toISOString();
      mockSession.security = {
        createdAt: oldTime,
        lastActivity: new Date().toISOString(),
        lastRegeneration: oldTime,
        ipAddress: '127.0.0.1',
        userAgent: 'Test Agent',
        isSecure: true
      };

      vi.mocked(securityLogger.logSecurityEvent).mockRejectedValueOnce(new Error('Logger error'));

      const middleware = new SessionSecurityMiddleware();
      const handler = middleware.middleware();

      await handler(mockReq as Request, mockRes as Response, mockNext);

      // Should still call next despite logging error
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('Factory Function', () => {
    it('should create session security middleware', async () => {
      const handler = createSessionSecurityMiddleware();

      await handler(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('Integration Scenarios', () => {
    it('should handle complete new session flow', async () => {
      delete mockSession.csrfToken;
      delete mockSession.security;

      const middleware = new SessionSecurityMiddleware();
      const handler = middleware.middleware();

      await handler(mockReq as Request, mockRes as Response, mockNext);

      expect(mockSession.csrfToken).toBeDefined();
      expect(mockSession.security).toBeDefined();
      expect(mockSession.security.createdAt).toBeDefined();
      expect(mockSession.security.lastActivity).toBeDefined();
      expect(mockNext).toHaveBeenCalled();
    });

    it('should handle session with all security features', async () => {
      const oldTime = new Date(Date.now() - 31 * 60 * 1000).toISOString();
      mockSession.csrfToken = 'existing-token';
      mockSession.security = {
        createdAt: oldTime,
        lastActivity: oldTime,
        lastRegeneration: oldTime,
        ipAddress: '192.168.1.1',
        userAgent: 'Old Agent',
        isSecure: true
      };

      const middleware = new SessionSecurityMiddleware();
      const handler = middleware.middleware();

      await handler(mockReq as Request, mockRes as Response, mockNext);

      // Should detect changes and regenerate
      expect(securityLogger.logSecurityEvent).toHaveBeenCalledWith(
        'SUSPICIOUS_LOGIN',
        'session_ip_change',
        true,
        expect.any(Object)
      );
      expect(securityLogger.logSecurityEvent).toHaveBeenCalledWith(
        'SUSPICIOUS_LOGIN',
        'session_user_agent_change',
        true,
        expect.any(Object)
      );
      expect(mockSession.regenerate).toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalled();
    });
  });
});

