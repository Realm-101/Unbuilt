/**
 * Rate Limiting Middleware Tests
 * 
 * Tests for rate limiting, progressive delays, and abuse prevention
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mockRequest, mockResponse, mockNext } from '../../mocks/express';
import {
  createRateLimit,
  authRateLimit,
  loginRateLimit,
  clearAllRateLimits,
  getRateLimitStatus,
  getSuspiciousIPs,
  clearSuspiciousIP
} from '../../../middleware/rateLimiting';

// Mock security logger
vi.mock('../../../services/securityLogger', () => ({
  securityLogger: {
    logSecurityEvent: vi.fn().mockResolvedValue(undefined)
  }
}));

describe('Rate Limiting Middleware', () => {
  beforeEach(() => {
    // Clear all rate limits before each test
    clearAllRateLimits();
    vi.clearAllMocks();
  });

  describe('createRateLimit', () => {
    it('should allow requests within rate limit', async () => {
      const rateLimit = createRateLimit({
        windowMs: 60000,
        maxAttempts: 5
      });

      const req = mockRequest({ ip: '192.168.1.1' });
      const res = mockResponse();
      const next = mockNext();

      await rateLimit(req as any, res as any, next);

      expect(next).toHaveBeenCalledWith();
      expect(res.set).toHaveBeenCalledWith(
        expect.objectContaining({
          'X-RateLimit-Limit': '5',
          'X-RateLimit-Remaining': '4'
        })
      );
    });

    it('should block requests exceeding rate limit', async () => {
      const rateLimit = createRateLimit({
        windowMs: 60000,
        maxAttempts: 3
      });

      const req = mockRequest({ ip: '192.168.1.2' });
      const res = mockResponse();
      const next = mockNext();

      // Make 4 requests (1 over limit)
      for (let i = 0; i < 4; i++) {
        await rateLimit(req as any, res as any, next);
      }

      // Last call should have error
      expect(next).toHaveBeenLastCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('Rate limit exceeded')
        })
      );
    });

    it('should set correct rate limit headers', async () => {
      const rateLimit = createRateLimit({
        windowMs: 60000,
        maxAttempts: 10
      });

      const req = mockRequest({ ip: '192.168.1.3' });
      const res = mockResponse();
      const next = mockNext();

      await rateLimit(req as any, res as any, next);

      expect(res.set).toHaveBeenCalledWith(
        expect.objectContaining({
          'X-RateLimit-Limit': '10',
          'X-RateLimit-Remaining': '9',
          'X-RateLimit-Reset': expect.any(String),
          'X-RateLimit-Window': expect.any(String)
        })
      );
    });

    it('should use custom key generator', async () => {
      const rateLimit = createRateLimit({
        windowMs: 60000,
        maxAttempts: 5,
        keyGenerator: (req) => `custom:${req.body?.email || 'unknown'}`
      });

      const req1 = mockRequest({ 
        ip: '192.168.1.4',
        body: { email: 'user1@example.com' }
      });
      const req2 = mockRequest({ 
        ip: '192.168.1.4',
        body: { email: 'user2@example.com' }
      });
      const res = mockResponse();
      const next = mockNext();

      // Different emails should have separate rate limits
      for (let i = 0; i < 5; i++) {
        await rateLimit(req1 as any, res as any, next);
      }
      
      // This should still work (different key)
      await rateLimit(req2 as any, res as any, next);
      
      expect(next).toHaveBeenLastCalledWith();
    });

    it('should reset rate limit after window expires', async () => {
      const windowMs = 100; // 100ms window for testing
      const rateLimit = createRateLimit({
        windowMs,
        maxAttempts: 2
      });

      const req = mockRequest({ ip: '192.168.1.5' });
      const res = mockResponse();
      const next = mockNext();

      // Exhaust rate limit
      await rateLimit(req as any, res as any, next);
      await rateLimit(req as any, res as any, next);
      await rateLimit(req as any, res as any, next);

      // Should be blocked
      expect(next).toHaveBeenLastCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('Rate limit exceeded')
        })
      );

      // Wait for window to expire
      await new Promise(resolve => setTimeout(resolve, windowMs + 50));

      // Should work again
      vi.clearAllMocks();
      await rateLimit(req as any, res as any, next);
      expect(next).toHaveBeenCalledWith();
    });
  });

  describe('Progressive Delay', () => {
    it('should apply progressive delay after repeated violations', async () => {
      const rateLimit = createRateLimit({
        windowMs: 60000,
        maxAttempts: 2,
        progressiveDelay: true
      });

      const req = mockRequest({ ip: '192.168.1.6' });
      const res = mockResponse();
      const next = mockNext();

      // Exceed limit multiple times
      for (let i = 0; i < 10; i++) {
        await rateLimit(req as any, res as any, next);
      }

      // Check that record shows blocking
      const status = getRateLimitStatus('rate_limit:192.168.1.6');
      expect(status).toBeTruthy();
      expect(status?.isBlocked).toBe(true);
      expect(status?.blockUntil).toBeGreaterThan(Date.now());
    });

    it('should block requests during progressive delay period', async () => {
      const rateLimit = createRateLimit({
        windowMs: 60000,
        maxAttempts: 1,
        progressiveDelay: true
      });

      const req = mockRequest({ ip: '192.168.1.7' });
      const res = mockResponse();
      const next = mockNext();

      // Exceed limit to trigger delay
      for (let i = 0; i < 5; i++) {
        await rateLimit(req as any, res as any, next);
      }

      // Next request should be blocked
      vi.clearAllMocks();
      await rateLimit(req as any, res as any, next);
      
      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 'RATE_LIMIT_IP_BLOCKED'
        })
      );
    });
  });

  describe('CAPTCHA Integration', () => {
    it('should require CAPTCHA after threshold violations', async () => {
      const rateLimit = createRateLimit({
        windowMs: 60000,
        maxAttempts: 2,
        captchaThreshold: 3
      });

      const req = mockRequest({ ip: '192.168.1.8' });
      const res = mockResponse();
      const next = mockNext();

      // Exceed limit 3 times to trigger CAPTCHA
      for (let i = 0; i < 6; i++) {
        await rateLimit(req as any, res as any, next);
      }

      const status = getRateLimitStatus('rate_limit:192.168.1.8');
      expect(status?.captchaRequired).toBe(true);
    });

    it('should accept valid CAPTCHA token', async () => {
      const rateLimit = createRateLimit({
        windowMs: 60000,
        maxAttempts: 1,
        captchaThreshold: 2
      });

      const req = mockRequest({ 
        ip: '192.168.1.9'
      });
      const res = mockResponse();
      const next = mockNext();

      // Trigger CAPTCHA requirement (need 2 consecutive failures)
      // First request: allowed (count=1, within limit)
      await rateLimit(req as any, res as any, next);
      
      // Second request: blocked (count=2, exceeds limit of 1, consecutiveFailures=1)
      await rateLimit(req as any, res as any, next);
      
      // Third request: blocked (count=3, consecutiveFailures=2, triggers CAPTCHA)
      await rateLimit(req as any, res as any, next);

      // Verify CAPTCHA is required
      const status = getRateLimitStatus('rate_limit:192.168.1.9');
      expect(status?.captchaRequired).toBe(true);
      expect(status?.consecutiveFailures).toBe(2);

      // Now provide CAPTCHA token
      req.headers = { 'x-captcha-token': 'valid-token' };
      vi.clearAllMocks();
      await rateLimit(req as any, res as any, next);
      
      // The request will still be rate limited, but CAPTCHA requirement should be cleared
      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 'RATE_LIMIT_EXCEEDED'
        })
      );
      
      // Verify CAPTCHA requirement was cleared
      // Note: consecutiveFailures will be 1 because the request still exceeded the limit
      // The CAPTCHA validation resets it to 0, but then the rate limit check increments it again
      const updatedStatus = getRateLimitStatus('rate_limit:192.168.1.9');
      expect(updatedStatus?.captchaRequired).toBe(false);
      expect(updatedStatus?.consecutiveFailures).toBe(1); // Incremented again after CAPTCHA validation
    });

    it('should reject requests without CAPTCHA when required', async () => {
      const rateLimit = createRateLimit({
        windowMs: 60000,
        maxAttempts: 1,
        captchaThreshold: 2
      });

      const req = mockRequest({ ip: '192.168.1.10' });
      const res = mockResponse();
      const next = mockNext();

      // Trigger CAPTCHA requirement
      for (let i = 0; i < 4; i++) {
        await rateLimit(req as any, res as any, next);
      }

      // Request without CAPTCHA should fail
      vi.clearAllMocks();
      await rateLimit(req as any, res as any, next);
      
      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 'CAPTCHA_REQUIRED'
        })
      );
    });
  });

  describe('Suspicious Activity Detection', () => {
    it('should flag IP as suspicious after excessive violations', async () => {
      const rateLimit = createRateLimit({
        windowMs: 60000,
        maxAttempts: 1
      });

      const req = mockRequest({ ip: '192.168.1.11' });
      const res = mockResponse();
      const next = mockNext();

      // Make many requests to trigger suspicious activity
      for (let i = 0; i < 15; i++) {
        await rateLimit(req as any, res as any, next);
      }

      const suspiciousIPs = getSuspiciousIPs();
      expect(suspiciousIPs).toContain('192.168.1.11');
    });

    it('should clear suspicious IP flag', () => {
      const rateLimit = createRateLimit({
        windowMs: 60000,
        maxAttempts: 1
      });

      const req = mockRequest({ ip: '192.168.1.12' });
      const res = mockResponse();
      const next = mockNext();

      // Trigger suspicious activity
      for (let i = 0; i < 15; i++) {
        rateLimit(req as any, res as any, next);
      }

      // Clear the flag
      const cleared = clearSuspiciousIP('192.168.1.12');
      expect(cleared).toBe(true);

      const suspiciousIPs = getSuspiciousIPs();
      expect(suspiciousIPs).not.toContain('192.168.1.12');
    });
  });

  describe('Predefined Rate Limiters', () => {
    it('authRateLimit should have strict limits', async () => {
      const req = mockRequest({ 
        ip: '192.168.1.13',
        path: '/api/auth/login'
      });
      const res = mockResponse();
      const next = mockNext();

      // Should allow 5 attempts
      for (let i = 0; i < 5; i++) {
        await authRateLimit(req as any, res as any, next);
      }

      // 6th should fail
      vi.clearAllMocks();
      await authRateLimit(req as any, res as any, next);
      
      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('Rate limit exceeded')
        })
      );
    });

    it('loginRateLimit should track by IP and email', async () => {
      const req1 = mockRequest({ 
        ip: '192.168.1.14',
        body: { email: 'user1@example.com' }
      });
      const req2 = mockRequest({ 
        ip: '192.168.1.14',
        body: { email: 'user2@example.com' }
      });
      const res = mockResponse();
      const next = mockNext();

      // Exhaust limit for user1
      for (let i = 0; i < 6; i++) {
        await loginRateLimit(req1 as any, res as any, next);
      }

      // user2 should still work (different key)
      vi.clearAllMocks();
      await loginRateLimit(req2 as any, res as any, next);
      expect(next).toHaveBeenCalledWith();
    });
  });

  describe('IP Address Detection', () => {
    it('should extract IP from X-Forwarded-For header', async () => {
      const rateLimit = createRateLimit({
        windowMs: 60000,
        maxAttempts: 5
      });

      const req = mockRequest({ 
        headers: { 'x-forwarded-for': '203.0.113.1, 198.51.100.1' }
      });
      const res = mockResponse();
      const next = mockNext();

      await rateLimit(req as any, res as any, next);

      // Should use first IP in X-Forwarded-For
      const status = getRateLimitStatus('rate_limit:203.0.113.1');
      expect(status).toBeTruthy();
    });

    it('should extract IP from X-Real-IP header', async () => {
      const rateLimit = createRateLimit({
        windowMs: 60000,
        maxAttempts: 5
      });

      const req = mockRequest({ 
        headers: { 'x-real-ip': '203.0.113.2' }
      });
      const res = mockResponse();
      const next = mockNext();

      await rateLimit(req as any, res as any, next);

      const status = getRateLimitStatus('rate_limit:203.0.113.2');
      expect(status).toBeTruthy();
    });

    it('should extract IP from CF-Connecting-IP header', async () => {
      const rateLimit = createRateLimit({
        windowMs: 60000,
        maxAttempts: 5
      });

      const req = mockRequest({ 
        headers: { 'cf-connecting-ip': '203.0.113.3' }
      });
      const res = mockResponse();
      const next = mockNext();

      await rateLimit(req as any, res as any, next);

      const status = getRateLimitStatus('rate_limit:203.0.113.3');
      expect(status).toBeTruthy();
    });
  });

  describe('Error Handling', () => {
    it('should handle errors gracefully', async () => {
      const rateLimit = createRateLimit({
        windowMs: 60000,
        maxAttempts: 5,
        keyGenerator: () => {
          throw new Error('Key generation failed');
        }
      });

      const req = mockRequest({ ip: '192.168.1.15' });
      const res = mockResponse();
      const next = mockNext();

      await rateLimit(req as any, res as any, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 'RATE_LIMIT_SYSTEM_ERROR'
        })
      );
    });
  });

  describe('Custom Callbacks', () => {
    it('should call onLimitReached callback', async () => {
      const onLimitReached = vi.fn();
      const rateLimit = createRateLimit({
        windowMs: 60000,
        maxAttempts: 2,
        onLimitReached
      });

      const req = mockRequest({ ip: '192.168.1.16' });
      const res = mockResponse();
      const next = mockNext();

      // Exceed limit
      for (let i = 0; i < 3; i++) {
        await rateLimit(req as any, res as any, next);
      }

      expect(onLimitReached).toHaveBeenCalled();
    });
  });
});

