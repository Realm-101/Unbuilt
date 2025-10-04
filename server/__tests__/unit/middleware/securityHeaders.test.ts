/**
 * Security Headers Middleware Tests
 * 
 * Tests for security headers and CSRF protection
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mockRequest, mockResponse, mockNext } from '../../mocks/express';
import {
  SecurityHeadersMiddleware,
  CSRFProtectionMiddleware,
  createSecurityHeadersMiddleware,
  createCSRFProtectionMiddleware
} from '../../../middleware/securityHeaders';
import { securityLogger } from '../../../services/securityLogger';

// Mock security logger
vi.mock('../../../services/securityLogger', () => ({
  securityLogger: {
    logSecurityEvent: vi.fn(() => Promise.resolve(undefined))
  }
}));

// Mock security config
vi.mock('../../../config/securityConfig', () => ({
  securityConfig: {
    getConfig: () => ({
      environment: 'test',
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
    }),
    getSecurityHeaders: () => ({
      contentSecurityPolicy: "default-src 'self'",
      strictTransportSecurity: 'max-age=31536000; includeSubDomains',
      xFrameOptions: 'DENY',
      xContentTypeOptions: 'nosniff',
      referrerPolicy: 'strict-origin-when-cross-origin',
      permissionsPolicy: 'geolocation=(), microphone=(), camera=()'
    })
  }
}));

describe('Security Headers Middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Restore security logger mock after clearAllMocks
    vi.mocked(securityLogger.logSecurityEvent).mockResolvedValue(undefined);
  });

  describe('SecurityHeadersMiddleware', () => {
    it('should set all security headers by default', () => {
      const middleware = new SecurityHeadersMiddleware();
      const req = mockRequest();
      const res = mockResponse();
      const next = mockNext();

      middleware.middleware()(req as any, res as any, next);

      expect(res.setHeader).toHaveBeenCalledWith('Content-Security-Policy', expect.any(String));
      expect(res.setHeader).toHaveBeenCalledWith('Strict-Transport-Security', expect.any(String));
      expect(res.setHeader).toHaveBeenCalledWith('X-Frame-Options', expect.any(String));
      expect(res.setHeader).toHaveBeenCalledWith('X-Content-Type-Options', expect.any(String));
      expect(res.setHeader).toHaveBeenCalledWith('Referrer-Policy', expect.any(String));
      expect(res.setHeader).toHaveBeenCalledWith('Permissions-Policy', expect.any(String));
      expect(next).toHaveBeenCalled();
    });

    it('should set X-XSS-Protection header', () => {
      const middleware = new SecurityHeadersMiddleware();
      const req = mockRequest();
      const res = mockResponse();
      const next = mockNext();

      middleware.middleware()(req as any, res as any, next);

      expect(res.setHeader).toHaveBeenCalledWith('X-XSS-Protection', '1; mode=block');
    });

    it('should set X-DNS-Prefetch-Control header', () => {
      const middleware = new SecurityHeadersMiddleware();
      const req = mockRequest();
      const res = mockResponse();
      const next = mockNext();

      middleware.middleware()(req as any, res as any, next);

      expect(res.setHeader).toHaveBeenCalledWith('X-DNS-Prefetch-Control', 'off');
    });

    it('should remove X-Powered-By header', () => {
      const middleware = new SecurityHeadersMiddleware();
      const req = mockRequest();
      const res = mockResponse();
      const next = mockNext();

      middleware.middleware()(req as any, res as any, next);

      expect(res.removeHeader).toHaveBeenCalledWith('X-Powered-By');
      expect(res.removeHeader).toHaveBeenCalledWith('Server');
    });

    it('should allow disabling specific headers', () => {
      const middleware = new SecurityHeadersMiddleware({
        enableCSP: false,
        enableHSTS: false
      });
      const req = mockRequest();
      const res = mockResponse();
      const next = mockNext();

      middleware.middleware()(req as any, res as any, next);

      expect(res.setHeader).not.toHaveBeenCalledWith('Content-Security-Policy', expect.any(String));
      expect(res.setHeader).not.toHaveBeenCalledWith('Strict-Transport-Security', expect.any(String));
      expect(next).toHaveBeenCalled();
    });

    it('should set custom headers', () => {
      const middleware = new SecurityHeadersMiddleware({
        customHeaders: {
          'X-Custom-Header': 'custom-value',
          'X-Another-Header': 'another-value'
        }
      });
      const req = mockRequest();
      const res = mockResponse();
      const next = mockNext();

      middleware.middleware()(req as any, res as any, next);

      expect(res.setHeader).toHaveBeenCalledWith('X-Custom-Header', 'custom-value');
      expect(res.setHeader).toHaveBeenCalledWith('X-Another-Header', 'another-value');
    });

    it('should continue on error', () => {
      const middleware = new SecurityHeadersMiddleware();
      const req = mockRequest();
      const res = mockResponse();
      const next = mockNext();

      // Make setHeader throw an error
      (res.setHeader as any).mockImplementation(() => {
        throw new Error('Header error');
      });

      middleware.middleware()(req as any, res as any, next);

      // Should still call next
      expect(next).toHaveBeenCalled();
    });
  });

  describe('CSRF Protection Middleware', () => {
    it('should allow safe methods without CSRF token', () => {
      const middleware = new CSRFProtectionMiddleware();
      const req = mockRequest({ method: 'GET' });
      const res = mockResponse();
      const next = mockNext();

      middleware.middleware()(req as any, res as any, next);

      expect(next).toHaveBeenCalledWith();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should allow HEAD requests without CSRF token', () => {
      const middleware = new CSRFProtectionMiddleware();
      const req = mockRequest({ method: 'HEAD' });
      const res = mockResponse();
      const next = mockNext();

      middleware.middleware()(req as any, res as any, next);

      expect(next).toHaveBeenCalledWith();
    });

    it('should allow OPTIONS requests without CSRF token', () => {
      const middleware = new CSRFProtectionMiddleware();
      const req = mockRequest({ method: 'OPTIONS' });
      const res = mockResponse();
      const next = mockNext();

      middleware.middleware()(req as any, res as any, next);

      expect(next).toHaveBeenCalledWith();
    });

    it('should skip CSRF for API endpoints with JWT', () => {
      const middleware = new CSRFProtectionMiddleware();
      const req = mockRequest({ 
        method: 'POST',
        path: '/api/users',
        headers: { authorization: 'Bearer token' }
      });
      const res = mockResponse();
      const next = mockNext();

      middleware.middleware()(req as any, res as any, next);

      expect(next).toHaveBeenCalledWith();
    });

    it('should reject POST without CSRF token', () => {
      const middleware = new CSRFProtectionMiddleware();
      const req = mockRequest({ 
        method: 'POST',
        path: '/form-submit',
        session: {}
      });
      const res = mockResponse();
      const next = mockNext();

      middleware.middleware()(req as any, res as any, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'CSRF token validation failed',
          code: 'CSRF_TOKEN_INVALID'
        })
      );
    });

    it('should accept valid CSRF token from header', () => {
      const middleware = new CSRFProtectionMiddleware();
      const req = mockRequest({ 
        method: 'POST',
        path: '/form-submit',
        headers: { 'x-csrf-token': 'valid-token' },
        session: { csrfToken: 'valid-token' }
      });
      const res = mockResponse();
      const next = mockNext();

      middleware.middleware()(req as any, res as any, next);

      expect(next).toHaveBeenCalledWith();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should accept valid CSRF token from body', () => {
      const middleware = new CSRFProtectionMiddleware();
      const req = mockRequest({ 
        method: 'POST',
        path: '/form-submit',
        body: { _csrf: 'valid-token' },
        session: { csrfToken: 'valid-token' }
      });
      const res = mockResponse();
      const next = mockNext();

      middleware.middleware()(req as any, res as any, next);

      expect(next).toHaveBeenCalledWith();
    });

    it('should accept valid CSRF token from query', () => {
      const middleware = new CSRFProtectionMiddleware();
      const req = mockRequest({ 
        method: 'POST',
        path: '/form-submit',
        query: { _csrf: 'valid-token' },
        session: { csrfToken: 'valid-token' }
      });
      const res = mockResponse();
      const next = mockNext();

      middleware.middleware()(req as any, res as any, next);

      expect(next).toHaveBeenCalledWith();
    });

    it('should reject mismatched CSRF tokens', () => {
      const middleware = new CSRFProtectionMiddleware();
      const req = mockRequest({ 
        method: 'POST',
        path: '/form-submit',
        headers: { 'x-csrf-token': 'wrong-token' },
        session: { csrfToken: 'correct-token' }
      });
      const res = mockResponse();
      const next = mockNext();

      middleware.middleware()(req as any, res as any, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 'CSRF_TOKEN_INVALID'
        })
      );
    });

    it('should handle errors gracefully', () => {
      const middleware = new CSRFProtectionMiddleware();
      const req = mockRequest({ 
        method: 'POST',
        path: '/form-submit'
      });
      const res = mockResponse();
      const next = mockNext();

      // Make session access throw
      Object.defineProperty(req, 'session', {
        get: () => {
          throw new Error('Session error');
        }
      });

      middleware.middleware()(req as any, res as any, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 'CSRF_PROTECTION_ERROR'
        })
      );
    });
  });

  describe('Factory Functions', () => {
    it('createSecurityHeadersMiddleware should create middleware', () => {
      const middleware = createSecurityHeadersMiddleware();
      const req = mockRequest();
      const res = mockResponse();
      const next = mockNext();

      middleware(req as any, res as any, next);

      expect(next).toHaveBeenCalled();
    });

    it('createSecurityHeadersMiddleware should accept options', () => {
      const middleware = createSecurityHeadersMiddleware({
        enableCSP: false
      });
      const req = mockRequest();
      const res = mockResponse();
      const next = mockNext();

      middleware(req as any, res as any, next);

      expect(res.setHeader).not.toHaveBeenCalledWith('Content-Security-Policy', expect.any(String));
    });

    it('createCSRFProtectionMiddleware should create middleware', () => {
      const middleware = createCSRFProtectionMiddleware();
      const req = mockRequest({ method: 'GET' });
      const res = mockResponse();
      const next = mockNext();

      middleware(req as any, res as any, next);

      expect(next).toHaveBeenCalled();
    });
  });

  describe('Security Header Values', () => {
    it('should set correct CSP directive', () => {
      const middleware = new SecurityHeadersMiddleware();
      const req = mockRequest();
      const res = mockResponse();
      const next = mockNext();

      middleware.middleware()(req as any, res as any, next);

      expect(res.setHeader).toHaveBeenCalledWith(
        'Content-Security-Policy',
        expect.stringContaining("default-src 'self'")
      );
    });

    it('should set correct X-Frame-Options', () => {
      const middleware = new SecurityHeadersMiddleware();
      const req = mockRequest();
      const res = mockResponse();
      const next = mockNext();

      middleware.middleware()(req as any, res as any, next);

      expect(res.setHeader).toHaveBeenCalledWith('X-Frame-Options', 'DENY');
    });

    it('should set correct X-Content-Type-Options', () => {
      const middleware = new SecurityHeadersMiddleware();
      const req = mockRequest();
      const res = mockResponse();
      const next = mockNext();

      middleware.middleware()(req as any, res as any, next);

      expect(res.setHeader).toHaveBeenCalledWith('X-Content-Type-Options', 'nosniff');
    });
  });
});

