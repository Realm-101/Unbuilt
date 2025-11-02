/**
 * HTTPS Enforcement and Session Security Middleware Tests
 * 
 * Tests for HTTPS enforcement, secure cookies, and session security
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mockRequest, mockResponse, mockNext } from '../../mocks/express';
import {
  HTTPSEnforcementMiddleware,
  SecureCookieMiddleware,
  SessionSecurityMiddleware,
  createHTTPSEnforcementMiddleware,
  createSecureCookieMiddleware,
  createSessionSecurityMiddleware
} from '../../../middleware/httpsEnforcement';

// Mock security logger
vi.mock('../../../services/securityLogger', () => ({
  securityLogger: {
    logSecurityEvent: vi.fn().mockResolvedValue(undefined)
  }
}));

// Mock security config
vi.mock('../../../config/securityConfig', () => ({
  securityConfig: {
    getConfig: () => ({
      environment: 'production',
      security: {
        https: {
          enforce: true
        },
        cookies: {
          secure: true,
          httpOnly: true,
          sameSite: 'strict',
          maxAge: 3600000
        }
      }
    })
  }
}));

describe('HTTPS Enforcement Middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('HTTPSEnforcementMiddleware', () => {
    it('should allow HTTPS requests', async () => {
      const middleware = new HTTPSEnforcementMiddleware();
      const req = mockRequest({ 
        secure: true,
        protocol: 'https'
      });
      const res = mockResponse();
      const next = mockNext();

      await middleware.middleware()(req as any, res as any, next);

      expect(next).toHaveBeenCalled();
      expect(res.redirect).not.toHaveBeenCalled();
    });

    it('should redirect HTTP to HTTPS', async () => {
      const middleware = new HTTPSEnforcementMiddleware();
      const req = mockRequest({ 
        secure: false,
        protocol: 'http',
        headers: { host: 'example.com' },
        originalUrl: '/path?query=value'
      });
      const res = mockResponse();
      const next = mockNext();

      await middleware.middleware()(req as any, res as any, next);

      expect(res.status).toHaveBeenCalledWith(301);
      expect(res.redirect).toHaveBeenCalledWith('https://example.com/path?query=value');
    });

    it('should trust X-Forwarded-Proto header', async () => {
      const middleware = new HTTPSEnforcementMiddleware({ trustProxy: true });
      const req = mockRequest({ 
        secure: false,
        headers: { 'x-forwarded-proto': 'https' }
      });
      const res = mockResponse();
      const next = mockNext();

      await middleware.middleware()(req as any, res as any, next);

      expect(next).toHaveBeenCalled();
      expect(res.redirect).not.toHaveBeenCalled();
    });

    it('should trust X-Forwarded-SSL header', async () => {
      const middleware = new HTTPSEnforcementMiddleware({ trustProxy: true });
      const req = mockRequest({ 
        secure: false,
        headers: { 'x-forwarded-ssl': 'on' }
      });
      const res = mockResponse();
      const next = mockNext();

      await middleware.middleware()(req as any, res as any, next);

      expect(next).toHaveBeenCalled();
      expect(res.redirect).not.toHaveBeenCalled();
    });

    it('should set HSTS header for HTTPS connections', async () => {
      const middleware = new HTTPSEnforcementMiddleware({
        maxAge: 31536000,
        includeSubDomains: true,
        preload: false
      });
      const req = mockRequest({ secure: true });
      const res = mockResponse();
      const next = mockNext();

      await middleware.middleware()(req as any, res as any, next);

      expect(res.setHeader).toHaveBeenCalledWith(
        'Strict-Transport-Security',
        'max-age=31536000; includeSubDomains'
      );
    });

    it('should include preload in HSTS header when enabled', async () => {
      const middleware = new HTTPSEnforcementMiddleware({
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
      });
      const req = mockRequest({ secure: true });
      const res = mockResponse();
      const next = mockNext();

      await middleware.middleware()(req as any, res as any, next);

      expect(res.setHeader).toHaveBeenCalledWith(
        'Strict-Transport-Security',
        'max-age=31536000; includeSubDomains; preload'
      );
    });

    it('should exclude specified paths', async () => {
      const middleware = new HTTPSEnforcementMiddleware({
        excludePaths: ['/health', '/api/health']
      });
      const req = mockRequest({ 
        secure: false,
        path: '/health'
      });
      const res = mockResponse();
      const next = mockNext();

      await middleware.middleware()(req as any, res as any, next);

      expect(next).toHaveBeenCalled();
      expect(res.redirect).not.toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      const middleware = new HTTPSEnforcementMiddleware();
      const req = mockRequest({ 
        secure: false
      });
      
      // Override get to throw an error
      req.get = vi.fn(() => {
        throw new Error('Header error');
      });
      
      const res = mockResponse();
      const next = mockNext();

      await middleware.middleware()(req as any, res as any, next);

      // Should continue despite error
      expect(next).toHaveBeenCalled();
    });
  });

  describe('Secure Cookie Middleware', () => {
    it('should apply secure cookie options', () => {
      const middleware = new SecureCookieMiddleware();
      const req = mockRequest();
      const res = mockResponse();
      const next = mockNext();

      // Store original cookie function
      const originalCookie = res.cookie;

      middleware.middleware()(req as any, res as any, next);

      // Verify middleware was called
      expect(next).toHaveBeenCalled();
      
      // The middleware wraps res.cookie, so it should be different from original
      expect(res.cookie).not.toBe(originalCookie);
    });

    it('should set httpOnly flag', () => {
      const middleware = new SecureCookieMiddleware();
      const req = mockRequest();
      const res = mockResponse();
      const next = mockNext();

      const originalCookie = res.cookie;
      let capturedOptions: any;

      // Capture the options passed to cookie
      (res.cookie as any) = vi.fn((name, value, options) => {
        capturedOptions = options;
        return res;
      });

      middleware.middleware()(req as any, res as any, next);
      res.cookie('test', 'value', {});

      expect(capturedOptions?.httpOnly).toBe(true);
    });

    it('should set secure flag', () => {
      const middleware = new SecureCookieMiddleware();
      const req = mockRequest();
      const res = mockResponse();
      const next = mockNext();

      let capturedOptions: any;
      (res.cookie as any) = vi.fn((name, value, options) => {
        capturedOptions = options;
        return res;
      });

      middleware.middleware()(req as any, res as any, next);
      res.cookie('test', 'value', {});

      expect(capturedOptions?.secure).toBe(true);
    });

    it('should set sameSite flag', () => {
      const middleware = new SecureCookieMiddleware();
      const req = mockRequest();
      const res = mockResponse();
      const next = mockNext();

      let capturedOptions: any;
      (res.cookie as any) = vi.fn((name, value, options) => {
        capturedOptions = options;
        return res;
      });

      middleware.middleware()(req as any, res as any, next);
      res.cookie('test', 'value', {});

      expect(capturedOptions?.sameSite).toBe('strict');
    });

    it('should preserve custom options', () => {
      const middleware = new SecureCookieMiddleware();
      const req = mockRequest();
      const res = mockResponse();
      const next = mockNext();

      let capturedOptions: any;
      (res.cookie as any) = vi.fn((name, value, options) => {
        capturedOptions = options;
        return res;
      });

      middleware.middleware()(req as any, res as any, next);
      res.cookie('test', 'value', { path: '/custom', maxAge: 9999 });

      expect(capturedOptions?.path).toBe('/custom');
      expect(capturedOptions?.maxAge).toBe(9999);
    });

    it('should handle errors gracefully', () => {
      const middleware = new SecureCookieMiddleware();
      const req = mockRequest();
      const res = mockResponse();
      const next = mockNext();

      // Make cookie throw an error
      (res.cookie as any) = vi.fn(() => {
        throw new Error('Cookie error');
      });

      middleware.middleware()(req as any, res as any, next);

      // Should still call next
      expect(next).toHaveBeenCalled();
    });
  });

  describe('Session Security Middleware', () => {
    it('should generate CSRF token for new sessions', async () => {
      const middleware = new SessionSecurityMiddleware();
      const session: any = {};
      const req = mockRequest({ session });
      const res = mockResponse();
      const next = mockNext();

      await middleware.middleware()(req as any, res as any, next);

      expect(session.csrfToken).toBeDefined();
      expect(typeof session.csrfToken).toBe('string');
      expect(session.csrfToken.length).toBeGreaterThan(0);
    });

    it('should add security metadata to session', async () => {
      const middleware = new SessionSecurityMiddleware();
      const session: any = {};
      const req = mockRequest({ 
        session,
        ip: '192.168.1.1',
        headers: { 'user-agent': 'Test Browser' }
      });
      const res = mockResponse();
      const next = mockNext();

      await middleware.middleware()(req as any, res as any, next);

      expect(session.security).toBeDefined();
      expect(session.security.createdAt).toBeDefined();
      expect(session.security.lastActivity).toBeDefined();
      expect(session.security.ipAddress).toBe('192.168.1.1');
      expect(session.security.userAgent).toBe('Test Browser');
    });

    it('should update lastActivity on subsequent requests', async () => {
      const middleware = new SessionSecurityMiddleware();
      const session: any = {
        security: {
          createdAt: new Date('2024-01-01').toISOString(),
          lastActivity: new Date('2024-01-01').toISOString(),
          ipAddress: '192.168.1.1',
          userAgent: 'Test Browser'
        }
      };
      const req = mockRequest({ session });
      const res = mockResponse();
      const next = mockNext();

      const oldActivity = session.security.lastActivity;
      await new Promise(resolve => setTimeout(resolve, 10));

      await middleware.middleware()(req as any, res as any, next);

      expect(session.security.lastActivity).not.toBe(oldActivity);
    });

    it('should detect IP address changes', async () => {
      const middleware = new SessionSecurityMiddleware();
      const session: any = {
        userId: 123,
        security: {
          createdAt: new Date().toISOString(),
          lastActivity: new Date().toISOString(),
          ipAddress: '192.168.1.1',
          userAgent: 'Test Browser'
        }
      };
      const req = mockRequest({ 
        session,
        ip: '192.168.1.2' // Different IP
      });
      const res = mockResponse();
      const next = mockNext();

      await middleware.middleware()(req as any, res as any, next);

      // Should log the IP change (check security logger was called)
      const { securityLogger } = await import('../../../services/securityLogger');
      expect(securityLogger.logSecurityEvent).toHaveBeenCalled();
    });

    it('should detect User-Agent changes', async () => {
      const middleware = new SessionSecurityMiddleware();
      const session: any = {
        userId: 123,
        security: {
          createdAt: new Date().toISOString(),
          lastActivity: new Date().toISOString(),
          ipAddress: '192.168.1.1',
          userAgent: 'Test Browser'
        }
      };
      const req = mockRequest({ 
        session,
        ip: '192.168.1.1',
        headers: { 'user-agent': 'Different Browser' }
      });
      const res = mockResponse();
      const next = mockNext();

      await middleware.middleware()(req as any, res as any, next);

      // Should log the User-Agent change
      const { securityLogger } = await import('../../../services/securityLogger');
      expect(securityLogger.logSecurityEvent).toHaveBeenCalled();
    });

    it('should handle missing session gracefully', async () => {
      const middleware = new SessionSecurityMiddleware();
      const req = mockRequest(); // No session
      const res = mockResponse();
      const next = mockNext();

      await middleware.middleware()(req as any, res as any, next);

      expect(next).toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      // Mock securityLogger to return a resolved promise
      const { securityLogger } = await import('../../../services/securityLogger');
      vi.mocked(securityLogger.logSecurityEvent).mockResolvedValue(undefined);
      
      const middleware = new SessionSecurityMiddleware();
      const req = mockRequest({ 
        session: {
          get security() {
            throw new Error('Session error');
          }
        }
      });
      const res = mockResponse();
      const next = mockNext();

      await middleware.middleware()(req as any, res as any, next);

      // Should continue despite error
      expect(next).toHaveBeenCalled();
    });
  });

  describe('Factory Functions', () => {
    it('createHTTPSEnforcementMiddleware should create middleware', async () => {
      const middleware = createHTTPSEnforcementMiddleware();
      const req = mockRequest({ secure: true });
      const res = mockResponse();
      const next = mockNext();

      await middleware(req as any, res as any, next);

      expect(next).toHaveBeenCalled();
    });

    it('createHTTPSEnforcementMiddleware should accept options', async () => {
      const middleware = createHTTPSEnforcementMiddleware({
        excludePaths: ['/custom']
      });
      const req = mockRequest({ 
        secure: false,
        path: '/custom'
      });
      const res = mockResponse();
      const next = mockNext();

      await middleware(req as any, res as any, next);

      expect(next).toHaveBeenCalled();
      expect(res.redirect).not.toHaveBeenCalled();
    });

    it('createSecureCookieMiddleware should create middleware', () => {
      const middleware = createSecureCookieMiddleware();
      const req = mockRequest();
      const res = mockResponse();
      const next = mockNext();

      middleware(req as any, res as any, next);

      expect(next).toHaveBeenCalled();
    });

    it('createSessionSecurityMiddleware should create middleware', async () => {
      const middleware = createSessionSecurityMiddleware();
      const req = mockRequest({ session: {} });
      const res = mockResponse();
      const next = mockNext();

      await middleware(req as any, res as any, next);

      expect(next).toHaveBeenCalled();
    });
  });
});

