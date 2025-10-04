import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import { 
  createRateLimit, 
  authRateLimit, 
  loginRateLimit, 
  registerRateLimit,
  apiRateLimit,
  clearAllRateLimits,
  getRateLimitStatus,
  getSuspiciousIPs,
  clearSuspiciousIP
} from '../rateLimiting';
import { AppError, errorHandlerMiddleware } from '../errorHandler';

// Mock security logger
vi.mock('../../services/securityLogger', () => ({
  securityLogger: {
    logSecurityEvent: vi.fn().mockResolvedValue(undefined)
  }
}));

describe('Rate Limiting Middleware', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    clearAllRateLimits();
    vi.clearAllMocks();
  });

  // Add error handler after each test setup
  const addErrorHandler = () => {
    app.use(errorHandlerMiddleware);
  };

  afterEach(() => {
    clearAllRateLimits();
  });

  describe('createRateLimit', () => {
    it('should allow requests within the limit', async () => {
      const rateLimit = createRateLimit({
        windowMs: 60000, // 1 minute
        maxAttempts: 5
      });

      app.get('/test', rateLimit, (req, res) => {
        res.json({ success: true });
      });

      // Make 5 requests - all should succeed
      for (let i = 0; i < 5; i++) {
        const response = await request(app)
          .get('/test')
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.headers['x-ratelimit-limit']).toBe('5');
        expect(response.headers['x-ratelimit-remaining']).toBe((4 - i).toString());
      }
    });

    it('should block requests that exceed the limit', async () => {
      const rateLimit = createRateLimit({
        windowMs: 60000, // 1 minute
        maxAttempts: 3
      });

      app.get('/test', rateLimit, (req, res) => {
        res.json({ success: true });
      });
      addErrorHandler();

      // Make 3 successful requests
      for (let i = 0; i < 3; i++) {
        await request(app).get('/test').expect(200);
      }

      // 4th request should be rate limited
      const response = await request(app)
        .get('/test')
        .expect(429);

      expect(response.body.message).toContain('Rate limit exceeded');
      expect(response.body.code).toBe('RATE_LIMIT_EXCEEDED');
    });

    it('should reset rate limit after window expires', async () => {
      const rateLimit = createRateLimit({
        windowMs: 100, // 100ms for quick test
        maxAttempts: 2
      });

      app.get('/test', rateLimit, (req, res) => {
        res.json({ success: true });
      });

      // Exhaust the rate limit
      await request(app).get('/test').expect(200);
      await request(app).get('/test').expect(200);
      await request(app).get('/test').expect(429);

      // Wait for window to expire
      await new Promise(resolve => setTimeout(resolve, 150));

      // Should be able to make requests again
      await request(app).get('/test').expect(200);
    });

    it.skip('should apply progressive delays when enabled', async () => {
      // TODO: Progressive delay feature not yet implemented
      // This test is skipped until the feature is added to the rate limiting middleware
      const rateLimit = createRateLimit({
        windowMs: 60000,
        maxAttempts: 2,
        progressiveDelay: true
      });

      app.get('/test', rateLimit, (req, res) => {
        res.json({ success: true });
      });
      addErrorHandler();

      // Exhaust rate limit
      await request(app).get('/test').expect(200);
      await request(app).get('/test').expect(200);

      // Multiple violations should trigger progressive delay
      for (let i = 0; i < 5; i++) {
        await request(app).get('/test');
      }

      // Check that the IP is now blocked with progressive delay
      const response = await request(app).get('/test').expect(429);
      expect(response.body.data?.progressiveDelay).toBe(true);
    });

    it.skip('should require CAPTCHA after threshold violations', async () => {
      // TODO: CAPTCHA requirement feature not yet implemented
      // This test is skipped until the feature is added to the rate limiting middleware
      const rateLimit = createRateLimit({
        windowMs: 60000,
        maxAttempts: 2,
        captchaThreshold: 3
      });

      app.get('/test', rateLimit, (req, res) => {
        res.json({ success: true });
      });
      addErrorHandler();

      // Exhaust rate limit and trigger CAPTCHA requirement
      await request(app).get('/test').expect(200);
      await request(app).get('/test').expect(200);

      // Multiple violations to trigger CAPTCHA
      for (let i = 0; i < 4; i++) {
        await request(app).get('/test');
      }

      const response = await request(app).get('/test');
      expect(response.body.data?.captchaRequired).toBe(true);
    });

    it('should use custom key generator', async () => {
      const rateLimit = createRateLimit({
        windowMs: 60000,
        maxAttempts: 2,
        keyGenerator: (req) => `custom:${req.headers['x-user-id'] || 'anonymous'}`
      });

      app.get('/test', rateLimit, (req, res) => {
        res.json({ success: true });
      });

      // Different user IDs should have separate rate limits
      await request(app)
        .get('/test')
        .set('x-user-id', 'user1')
        .expect(200);

      await request(app)
        .get('/test')
        .set('x-user-id', 'user1')
        .expect(200);

      // user1 should be rate limited
      await request(app)
        .get('/test')
        .set('x-user-id', 'user1')
        .expect(429);

      // user2 should still be able to make requests
      await request(app)
        .get('/test')
        .set('x-user-id', 'user2')
        .expect(200);
    });

    it('should call onLimitReached callback', async () => {
      const onLimitReached = vi.fn();
      const rateLimit = createRateLimit({
        windowMs: 60000,
        maxAttempts: 1,
        onLimitReached
      });

      app.get('/test', rateLimit, (req, res) => {
        res.json({ success: true });
      });

      await request(app).get('/test').expect(200);
      await request(app).get('/test').expect(429);

      expect(onLimitReached).toHaveBeenCalledTimes(1);
      expect(onLimitReached).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          totalHits: 2,
          remainingPoints: 0
        })
      );
    });
  });

  describe('Predefined Rate Limiters', () => {
    it('should apply auth rate limiting', async () => {
      app.post('/auth/login', authRateLimit, (req, res) => {
        res.json({ success: true });
      });

      // Make requests up to the limit (5 in 15 minutes)
      for (let i = 0; i < 5; i++) {
        await request(app).post('/auth/login').expect(200);
      }

      // 6th request should be rate limited
      await request(app).post('/auth/login').expect(429);
    });

    it('should apply login-specific rate limiting with email tracking', async () => {
      app.post('/auth/login', loginRateLimit, (req, res) => {
        res.json({ success: true });
      });

      const email = 'test@example.com';

      // Make requests with the same email
      for (let i = 0; i < 5; i++) {
        await request(app)
          .post('/auth/login')
          .send({ email })
          .expect(200);
      }

      // 6th request with same email should be rate limited
      await request(app)
        .post('/auth/login')
        .send({ email })
        .expect(429);

      // Different email should still work
      await request(app)
        .post('/auth/login')
        .send({ email: 'other@example.com' })
        .expect(200);
    });

    it('should apply register rate limiting', async () => {
      app.post('/auth/register', registerRateLimit, (req, res) => {
        res.json({ success: true });
      });

      // Make requests up to the limit (3 in 1 hour)
      for (let i = 0; i < 3; i++) {
        await request(app).post('/auth/register').expect(200);
      }

      // 4th request should be rate limited
      await request(app).post('/auth/register').expect(429);
    });

    it('should apply API rate limiting', async () => {
      app.get('/api/data', apiRateLimit, (req, res) => {
        res.json({ data: 'test' });
      });

      // API rate limit is higher (100 in 15 minutes)
      // Test a few requests to ensure it works
      for (let i = 0; i < 10; i++) {
        await request(app).get('/api/data').expect(200);
      }
    });
  });

  describe('IP Detection', () => {
    it('should handle X-Forwarded-For header', async () => {
      const rateLimit = createRateLimit({
        windowMs: 60000,
        maxAttempts: 2
      });

      app.get('/test', rateLimit, (req, res) => {
        res.json({ success: true });
      });

      const forwardedIP = '192.168.1.100';

      // Make requests with forwarded IP
      await request(app)
        .get('/test')
        .set('X-Forwarded-For', `${forwardedIP}, 10.0.0.1`)
        .expect(200);

      await request(app)
        .get('/test')
        .set('X-Forwarded-For', `${forwardedIP}, 10.0.0.1`)
        .expect(200);

      // Should be rate limited for the same forwarded IP
      await request(app)
        .get('/test')
        .set('X-Forwarded-For', `${forwardedIP}, 10.0.0.1`)
        .expect(429);
    });

    it('should handle X-Real-IP header', async () => {
      const rateLimit = createRateLimit({
        windowMs: 60000,
        maxAttempts: 2
      });

      app.get('/test', rateLimit, (req, res) => {
        res.json({ success: true });
      });

      const realIP = '203.0.113.1';

      await request(app)
        .get('/test')
        .set('X-Real-IP', realIP)
        .expect(200);

      await request(app)
        .get('/test')
        .set('X-Real-IP', realIP)
        .expect(200);

      await request(app)
        .get('/test')
        .set('X-Real-IP', realIP)
        .expect(429);
    });
  });

  describe('Suspicious Activity Detection', () => {
    it('should detect and flag suspicious IPs', async () => {
      const rateLimit = createRateLimit({
        windowMs: 60000,
        maxAttempts: 2
      });

      app.get('/test', rateLimit, (req, res) => {
        res.json({ success: true });
      });

      // Make many requests to trigger suspicious activity detection
      for (let i = 0; i < 15; i++) {
        await request(app).get('/test');
      }

      // Check if IP was flagged as suspicious
      const suspiciousIPs = getSuspiciousIPs();
      expect(suspiciousIPs.length).toBeGreaterThan(0);
    });

    it('should clear suspicious IP flag', async () => {
      const rateLimit = createRateLimit({
        windowMs: 60000,
        maxAttempts: 1
      });

      app.get('/test', rateLimit, (req, res) => {
        res.json({ success: true });
      });

      // Trigger suspicious activity
      for (let i = 0; i < 15; i++) {
        await request(app).get('/test');
      }

      const suspiciousIPs = getSuspiciousIPs();
      expect(suspiciousIPs.length).toBeGreaterThan(0);

      // Clear the suspicious IP
      const cleared = clearSuspiciousIP(suspiciousIPs[0]);
      expect(cleared).toBe(true);

      const remainingSuspiciousIPs = getSuspiciousIPs();
      expect(remainingSuspiciousIPs).not.toContain(suspiciousIPs[0]);
    });
  });

  describe('Rate Limit Status', () => {
    it('should provide rate limit status information', async () => {
      const rateLimit = createRateLimit({
        windowMs: 60000,
        maxAttempts: 3
      });

      app.get('/test', rateLimit, (req, res) => {
        res.json({ success: true });
      });

      await request(app).get('/test').expect(200);

      // Check rate limit status
      const status = getRateLimitStatus('rate_limit:::ffff:127.0.0.1');
      expect(status).toBeTruthy();
      expect(status?.count).toBe(1);
    });
  });

  describe('Error Handling', () => {
    it('should handle middleware errors gracefully', async () => {
      // Create a rate limiter that will cause an error
      const rateLimit = createRateLimit({
        windowMs: 60000,
        maxAttempts: 5,
        keyGenerator: () => {
          throw new Error('Key generation error');
        }
      });

      app.get('/test', rateLimit, (req, res) => {
        res.json({ success: true });
      });
      addErrorHandler();

      const response = await request(app).get('/test').expect(500);
      expect(response.body.code).toBe('RATE_LIMIT_SYSTEM_ERROR');
    });
  });

  describe('Headers', () => {
    it('should set appropriate rate limit headers', async () => {
      const rateLimit = createRateLimit({
        windowMs: 60000,
        maxAttempts: 5
      });

      app.get('/test', rateLimit, (req, res) => {
        res.json({ success: true });
      });

      const response = await request(app).get('/test').expect(200);

      expect(response.headers['x-ratelimit-limit']).toBe('5');
      expect(response.headers['x-ratelimit-remaining']).toBe('4');
      expect(response.headers['x-ratelimit-reset']).toBeDefined();
      expect(response.headers['x-ratelimit-window']).toBe('60');
    });
  });
});
