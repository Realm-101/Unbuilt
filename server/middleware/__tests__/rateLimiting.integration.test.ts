import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import { 
  authRateLimit, 
  loginRateLimit, 
  registerRateLimit,
  apiRateLimit,
  clearAllRateLimits,
  getSuspiciousIPs,
  clearSuspiciousIP
} from '../rateLimiting';
import { securityLogger } from '../../services/securityLogger';

// Mock security logger
vi.mock('../../services/securityLogger', () => ({
  securityLogger: {
    logSecurityEvent: vi.fn().mockResolvedValue(undefined)
  }
}));

describe('Rate Limiting Integration Tests', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    clearAllRateLimits();
    vi.clearAllMocks();
  });

  afterEach(() => {
    clearAllRateLimits();
  });

  describe('Authentication Rate Limiting', () => {
    beforeEach(() => {
      app.post('/auth/login', loginRateLimit, (req, res) => {
        // Simulate login logic
        const { email, password } = req.body;
        if (email === 'valid@test.com' && password === 'correct') {
          res.json({ success: true, token: 'fake-jwt-token' });
        } else {
          res.status(401).json({ error: 'Invalid credentials' });
        }
      });

      app.post('/auth/register', registerRateLimit, (req, res) => {
        res.json({ success: true, user: { id: 1, email: req.body.email } });
      });

      app.post('/auth/refresh', authRateLimit, (req, res) => {
        res.json({ success: true, token: 'new-fake-jwt-token' });
      });
    });

    it('should allow legitimate login attempts within rate limit', async () => {
      const email = 'valid@test.com';
      const password = 'correct';

      // Make successful login attempts within the limit
      for (let i = 0; i < 3; i++) {
        const response = await request(app)
          .post('/auth/login')
          .send({ email, password })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.headers['x-ratelimit-remaining']).toBeDefined();
      }
    });

    it('should block brute force login attempts', async () => {
      const email = 'test@example.com';
      const wrongPassword = 'wrongpassword';

      // Make failed login attempts up to the limit
      for (let i = 0; i < 5; i++) {
        await request(app)
          .post('/auth/login')
          .send({ email, password: wrongPassword })
          .expect(401);
      }

      // Next attempt should be rate limited
      const response = await request(app)
        .post('/auth/login')
        .send({ email, password: wrongPassword })
        .expect(429);

      expect(response.body.code).toBe('RATE_LIMIT_EXCEEDED');
      expect(response.body.error).toContain('Rate limit exceeded');

      // Verify security event was logged
      expect(securityLogger.logSecurityEvent).toHaveBeenCalledWith(
        null,
        'LOGIN_BRUTE_FORCE_DETECTED',
        'login_attempt',
        false,
        expect.objectContaining({
          email,
          attempts: 6
        }),
        'error'
      );
    });

    it('should apply progressive delays for repeated violations', async () => {
      const email = 'test@example.com';

      // Exhaust rate limit multiple times to trigger progressive delay
      for (let round = 0; round < 3; round++) {
        // Make requests up to the limit
        for (let i = 0; i < 5; i++) {
          await request(app)
            .post('/auth/login')
            .send({ email, password: 'wrong' });
        }

        // Make additional requests to trigger progressive delay
        for (let i = 0; i < 5; i++) {
          const response = await request(app)
            .post('/auth/login')
            .send({ email, password: 'wrong' })
            .expect(429);

          if (round > 0) {
            expect(response.body.details?.progressiveDelay).toBe(true);
          }
        }
      }
    });

    it('should require CAPTCHA after threshold violations', async () => {
      const email = 'test@example.com';

      // Make enough failed attempts to trigger CAPTCHA requirement
      for (let i = 0; i < 10; i++) {
        await request(app)
          .post('/auth/login')
          .send({ email, password: 'wrong' });
      }

      const response = await request(app)
        .post('/auth/login')
        .send({ email, password: 'wrong' })
        .expect(429);

      expect(response.body.details?.captchaRequired).toBe(true);
    });

    it('should track different emails separately for login rate limiting', async () => {
      const email1 = 'user1@test.com';
      const email2 = 'user2@test.com';

      // Exhaust rate limit for email1
      for (let i = 0; i < 5; i++) {
        await request(app)
          .post('/auth/login')
          .send({ email: email1, password: 'wrong' })
          .expect(401);
      }

      // email1 should be rate limited
      await request(app)
        .post('/auth/login')
        .send({ email: email1, password: 'wrong' })
        .expect(429);

      // email2 should still work
      await request(app)
        .post('/auth/login')
        .send({ email: email2, password: 'wrong' })
        .expect(401);
    });

    it('should apply different rate limits to different endpoints', async () => {
      // Login has stricter rate limiting (5 attempts)
      for (let i = 0; i < 5; i++) {
        await request(app)
          .post('/auth/login')
          .send({ email: 'test@test.com', password: 'wrong' })
          .expect(401);
      }

      await request(app)
        .post('/auth/login')
        .send({ email: 'test@test.com', password: 'wrong' })
        .expect(429);

      // Register has different rate limiting (3 attempts per hour)
      for (let i = 0; i < 3; i++) {
        await request(app)
          .post('/auth/register')
          .send({ email: `test${i}@test.com`, password: 'password' })
          .expect(200);
      }

      await request(app)
        .post('/auth/register')
        .send({ email: 'test4@test.com', password: 'password' })
        .expect(429);
    });
  });

  describe('API Rate Limiting', () => {
    beforeEach(() => {
      app.get('/api/data', apiRateLimit, (req, res) => {
        res.json({ data: 'test data' });
      });

      app.post('/api/create', apiRateLimit, (req, res) => {
        res.json({ success: true, id: 123 });
      });
    });

    it('should allow high volume of API requests', async () => {
      // API rate limit is higher (100 requests per 15 minutes)
      for (let i = 0; i < 50; i++) {
        await request(app)
          .get('/api/data')
          .expect(200);
      }

      // Should still be within limits
      const response = await request(app)
        .get('/api/data')
        .expect(200);

      expect(response.headers['x-ratelimit-remaining']).toBeDefined();
      expect(parseInt(response.headers['x-ratelimit-remaining'])).toBeGreaterThan(0);
    });

    it('should eventually rate limit high volume API requests', async () => {
      // Make requests up to the API limit (100)
      for (let i = 0; i < 100; i++) {
        await request(app).get('/api/data').expect(200);
      }

      // Next request should be rate limited
      await request(app).get('/api/data').expect(429);
    });
  });

  describe('IP-based Rate Limiting', () => {
    beforeEach(() => {
      app.post('/test', authRateLimit, (req, res) => {
        res.json({ success: true });
      });
    });

    it('should handle X-Forwarded-For header correctly', async () => {
      const forwardedIP = '192.168.1.100';

      // Make requests with forwarded IP
      for (let i = 0; i < 5; i++) {
        await request(app)
          .post('/test')
          .set('X-Forwarded-For', `${forwardedIP}, 10.0.0.1`)
          .expect(200);
      }

      // Should be rate limited for the same forwarded IP
      await request(app)
        .post('/test')
        .set('X-Forwarded-For', `${forwardedIP}, 10.0.0.1`)
        .expect(429);

      // Different IP should still work
      await request(app)
        .post('/test')
        .set('X-Forwarded-For', '192.168.1.200, 10.0.0.1')
        .expect(200);
    });

    it('should handle X-Real-IP header correctly', async () => {
      const realIP = '203.0.113.1';

      for (let i = 0; i < 5; i++) {
        await request(app)
          .post('/test')
          .set('X-Real-IP', realIP)
          .expect(200);
      }

      await request(app)
        .post('/test')
        .set('X-Real-IP', realIP)
        .expect(429);
    });

    it('should handle Cloudflare CF-Connecting-IP header', async () => {
      const cfIP = '198.51.100.1';

      for (let i = 0; i < 5; i++) {
        await request(app)
          .post('/test')
          .set('CF-Connecting-IP', cfIP)
          .expect(200);
      }

      await request(app)
        .post('/test')
        .set('CF-Connecting-IP', cfIP)
        .expect(429);
    });
  });

  describe('Suspicious Activity Detection', () => {
    beforeEach(() => {
      app.post('/test', authRateLimit, (req, res) => {
        res.json({ success: true });
      });
    });

    it('should detect and flag suspicious IPs', async () => {
      // Make many requests to trigger suspicious activity detection
      for (let i = 0; i < 20; i++) {
        await request(app).post('/test');
      }

      // Check if IP was flagged as suspicious
      const suspiciousIPs = getSuspiciousIPs();
      expect(suspiciousIPs.length).toBeGreaterThan(0);

      // Verify security event was logged
      expect(securityLogger.logSecurityEvent).toHaveBeenCalledWith(
        null,
        'SUSPICIOUS_ACTIVITY_DETECTED',
        '/test',
        false,
        expect.objectContaining({
          flaggedAsSuspicious: true,
          reason: 'Excessive rate limit violations'
        }),
        'warning'
      );
    });

    it('should allow clearing suspicious IP flags', async () => {
      // Trigger suspicious activity
      for (let i = 0; i < 20; i++) {
        await request(app).post('/test');
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

  describe('Rate Limit Headers', () => {
    beforeEach(() => {
      app.get('/test', authRateLimit, (req, res) => {
        res.json({ success: true });
      });
    });

    it('should set correct rate limit headers', async () => {
      const response = await request(app).get('/test').expect(200);

      expect(response.headers['x-ratelimit-limit']).toBe('5');
      expect(response.headers['x-ratelimit-remaining']).toBe('4');
      expect(response.headers['x-ratelimit-reset']).toBeDefined();
      expect(response.headers['x-ratelimit-window']).toBe('900'); // 15 minutes in seconds

      // Make another request
      const response2 = await request(app).get('/test').expect(200);
      expect(response2.headers['x-ratelimit-remaining']).toBe('3');
    });

    it('should show zero remaining when rate limited', async () => {
      // Exhaust the rate limit
      for (let i = 0; i < 5; i++) {
        await request(app).get('/test').expect(200);
      }

      const response = await request(app).get('/test').expect(429);
      expect(response.headers['x-ratelimit-remaining']).toBe('0');
    });
  });

  describe('Security Event Logging', () => {
    beforeEach(() => {
      app.post('/auth/login', loginRateLimit, (req, res) => {
        res.status(401).json({ error: 'Invalid credentials' });
      });
    });

    it('should log rate limit exceeded events', async () => {
      const email = 'test@example.com';

      // Exhaust rate limit
      for (let i = 0; i < 5; i++) {
        await request(app)
          .post('/auth/login')
          .send({ email, password: 'wrong' })
          .expect(401);
      }

      // Trigger rate limit
      await request(app)
        .post('/auth/login')
        .send({ email, password: 'wrong' })
        .expect(429);

      // Verify security events were logged
      expect(securityLogger.logSecurityEvent).toHaveBeenCalledWith(
        null,
        'RATE_LIMIT_EXCEEDED',
        '/auth/login',
        false,
        expect.objectContaining({
          attempts: 6,
          maxAttempts: 5
        }),
        'warning'
      );
    });

    it('should log progressive delay events', async () => {
      const email = 'test@example.com';

      // Trigger multiple rate limit violations to activate progressive delay
      for (let i = 0; i < 15; i++) {
        await request(app)
          .post('/auth/login')
          .send({ email, password: 'wrong' });
      }

      // Verify progressive delay was logged
      expect(securityLogger.logSecurityEvent).toHaveBeenCalledWith(
        null,
        'RATE_LIMIT_PROGRESSIVE_DELAY',
        '/auth/login',
        false,
        expect.objectContaining({
          delayMs: expect.any(Number),
          consecutiveFailures: expect.any(Number)
        }),
        'warning'
      );
    });

    it('should log CAPTCHA requirement events', async () => {
      const email = 'test@example.com';

      // Make enough requests to trigger CAPTCHA requirement
      for (let i = 0; i < 10; i++) {
        await request(app)
          .post('/auth/login')
          .send({ email, password: 'wrong' });
      }

      // Verify CAPTCHA requirement was logged
      expect(securityLogger.logSecurityEvent).toHaveBeenCalledWith(
        null,
        'RATE_LIMIT_CAPTCHA_TRIGGERED',
        '/auth/login',
        false,
        expect.objectContaining({
          captchaThreshold: 3
        }),
        'warning'
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle rate limiting system errors gracefully', async () => {
      // Create a middleware that will cause an error
      app.get('/error-test', (req, res, next) => {
        // Simulate an error in rate limiting
        const error = new Error('Rate limiting system error');
        error.name = 'RATE_LIMIT_SYSTEM_ERROR';
        next(error);
      }, (error: any, req: any, res: any, next: any) => {
        res.status(500).json({
          error: 'Internal server error',
          code: 'RATE_LIMIT_SYSTEM_ERROR'
        });
      });

      const response = await request(app).get('/error-test').expect(500);
      expect(response.body.code).toBe('RATE_LIMIT_SYSTEM_ERROR');
    });
  });
});