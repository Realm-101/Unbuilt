import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import captchaRoutes from '../captcha';
import { clearAllCaptchas } from '../../services/captchaService';
import { clearAllRateLimits } from '../../middleware/rateLimiting';

// Mock security logger
vi.mock('../../services/securityLogger', () => ({
  securityLogger: {
    logSecurityEvent: vi.fn().mockResolvedValue(undefined)
  }
}));

// Mock JWT auth middleware
vi.mock('../../middleware/jwtAuth', () => ({
  requireRole: () => (req: any, res: any, next: any) => {
    req.user = { id: 1, email: 'admin@test.com', role: 'admin' };
    next();
  }
}));

describe('CAPTCHA Routes Integration', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/captcha', captchaRoutes);
    clearAllCaptchas();
    clearAllRateLimits();
    vi.clearAllMocks();
  });

  afterEach(() => {
    clearAllCaptchas();
    clearAllRateLimits();
  });

  describe('POST /api/captcha/challenge', () => {
    it('should create a new CAPTCHA challenge', async () => {
      const response = await request(app)
        .post('/api/captcha/challenge')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('challengeId');
      expect(response.body.data).toHaveProperty('question');
      expect(response.body.data).toHaveProperty('expiresIn');

      expect(typeof response.body.data.challengeId).toBe('string');
      expect(typeof response.body.data.question).toBe('string');
      expect(typeof response.body.data.expiresIn).toBe('number');

      // Should be a valid UUID
      expect(response.body.data.challengeId).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      );
    });

    it('should apply rate limiting', async () => {
      // Make requests up to the rate limit
      for (let i = 0; i < 10; i++) {
        await request(app)
          .post('/api/captcha/challenge')
          .expect(200);
      }

      // Next request should be rate limited
      await request(app)
        .post('/api/captcha/challenge')
        .expect(429);
    });
  });

  describe('POST /api/captcha/verify', () => {
    it('should verify correct CAPTCHA answers', async () => {
      // Create a challenge first
      const challengeResponse = await request(app)
        .post('/api/captcha/challenge')
        .expect(200);

      const { challengeId, question } = challengeResponse.body.data;

      // Determine the correct answer based on the question
      let correctAnswer: number;
      
      if (question.includes('SECURITY')) {
        correctAnswer = 8;
      } else if (question.includes('CAPTCHA')) {
        correctAnswer = 7;
      } else if (question.includes('VERIFY')) {
        correctAnswer = 6;
      } else if (question.includes('ACCESS')) {
        correctAnswer = 6;
      } else if (question.includes('LOGIN')) {
        correctAnswer = 5;
      } else if (question.includes('AUTHENTICATION')) {
        correctAnswer = 7; // vowels
      } else if (question.includes('SECURE')) {
        correctAnswer = 4; // consonants
      } else if (question.includes('PASSWORD')) {
        correctAnswer = 16; // P is 16th letter
      } else {
        // It's a math challenge
        if (question.includes('+')) {
          const match = question.match(/(\d+) \+ (\d+)/);
          if (match) {
            correctAnswer = parseInt(match[1]) + parseInt(match[2]);
          }
        } else if (question.includes('-')) {
          const match = question.match(/(\d+) - (\d+)/);
          if (match) {
            correctAnswer = parseInt(match[1]) - parseInt(match[2]);
          }
        } else if (question.includes('×')) {
          const match = question.match(/(\d+) × (\d+)/);
          if (match) {
            correctAnswer = parseInt(match[1]) * parseInt(match[2]);
          }
        }
      }

      // Verify with correct answer
      const verifyResponse = await request(app)
        .post('/api/captcha/verify')
        .send({
          challengeId,
          answer: correctAnswer!
        })
        .expect(200);

      expect(verifyResponse.body.success).toBe(true);
      expect(verifyResponse.body.data.isValid).toBe(true);
    });

    it('should reject incorrect CAPTCHA answers', async () => {
      // Create a challenge first
      const challengeResponse = await request(app)
        .post('/api/captcha/challenge')
        .expect(200);

      const { challengeId } = challengeResponse.body.data;

      // Verify with incorrect answer
      const verifyResponse = await request(app)
        .post('/api/captcha/verify')
        .send({
          challengeId,
          answer: 999999
        })
        .expect(200);

      expect(verifyResponse.body.success).toBe(true);
      expect(verifyResponse.body.data.isValid).toBe(false);
      expect(verifyResponse.body.data.error).toContain('Incorrect answer');
      expect(verifyResponse.body.data.remainingAttempts).toBeDefined();
    });

    it('should validate request data', async () => {
      // Missing challengeId
      await request(app)
        .post('/api/captcha/verify')
        .send({
          answer: 42
        })
        .expect(400);

      // Invalid challengeId format
      await request(app)
        .post('/api/captcha/verify')
        .send({
          challengeId: 'invalid-uuid',
          answer: 42
        })
        .expect(400);

      // Missing answer
      await request(app)
        .post('/api/captcha/verify')
        .send({
          challengeId: '123e4567-e89b-12d3-a456-426614174000'
        })
        .expect(400);
    });

    it('should handle non-existent challenge IDs', async () => {
      const verifyResponse = await request(app)
        .post('/api/captcha/verify')
        .send({
          challengeId: '123e4567-e89b-12d3-a456-426614174000',
          answer: 42
        })
        .expect(200);

      expect(verifyResponse.body.data.isValid).toBe(false);
      expect(verifyResponse.body.data.error).toContain('not found or expired');
    });
  });

  describe('GET /api/captcha/challenge/:challengeId', () => {
    it('should return challenge information', async () => {
      // Create a challenge first
      const challengeResponse = await request(app)
        .post('/api/captcha/challenge')
        .expect(200);

      const { challengeId, question } = challengeResponse.body.data;

      // Get challenge info
      const infoResponse = await request(app)
        .get(`/api/captcha/challenge/${challengeId}`)
        .expect(200);

      expect(infoResponse.body.success).toBe(true);
      expect(infoResponse.body.data.question).toBe(question);
      expect(infoResponse.body.data.expiresAt).toBeDefined();
      expect(infoResponse.body.data.timeRemaining).toBeGreaterThan(0);
    });

    it('should validate challenge ID format', async () => {
      await request(app)
        .get('/api/captcha/challenge/invalid-uuid')
        .expect(400);
    });

    it('should return 404 for non-existent challenges', async () => {
      await request(app)
        .get('/api/captcha/challenge/123e4567-e89b-12d3-a456-426614174000')
        .expect(404);
    });
  });

  describe('GET /api/captcha/stats', () => {
    it('should return CAPTCHA statistics for admin users', async () => {
      // Create some challenges first
      await request(app).post('/api/captcha/challenge').expect(200);
      await request(app).post('/api/captcha/challenge').expect(200);

      const statsResponse = await request(app)
        .get('/api/captcha/stats')
        .expect(200);

      expect(statsResponse.body.success).toBe(true);
      expect(statsResponse.body.data.statistics).toHaveProperty('activeChallenges');
      expect(statsResponse.body.data.statistics).toHaveProperty('totalChallenges');
      expect(statsResponse.body.data.statistics).toHaveProperty('averageAttempts');
      expect(statsResponse.body.data.timestamp).toBeDefined();

      expect(statsResponse.body.data.statistics.activeChallenges).toBe(2);
    });
  });

  describe('Rate Limiting', () => {
    it('should apply rate limiting to all CAPTCHA endpoints', async () => {
      // Test challenge creation rate limiting
      for (let i = 0; i < 10; i++) {
        await request(app).post('/api/captcha/challenge').expect(200);
      }
      await request(app).post('/api/captcha/challenge').expect(429);

      // Reset rate limits for next test
      clearAllRateLimits();

      // Test verification rate limiting
      const challengeResponse = await request(app)
        .post('/api/captcha/challenge')
        .expect(200);

      const { challengeId } = challengeResponse.body.data;

      for (let i = 0; i < 10; i++) {
        await request(app)
          .post('/api/captcha/verify')
          .send({ challengeId, answer: 999999 });
      }

      await request(app)
        .post('/api/captcha/verify')
        .send({ challengeId, answer: 999999 })
        .expect(429);
    });
  });

  describe('Input Sanitization', () => {
    it('should sanitize input data', async () => {
      // Create a challenge first
      const challengeResponse = await request(app)
        .post('/api/captcha/challenge')
        .expect(200);

      const { challengeId } = challengeResponse.body.data;

      // Try to send malicious input
      const verifyResponse = await request(app)
        .post('/api/captcha/verify')
        .send({
          challengeId,
          answer: '<script>alert("xss")</script>42'
        })
        .expect(200);

      // Should be sanitized and converted to number
      expect(verifyResponse.body.data.isValid).toBe(false);
      expect(verifyResponse.body.data.error).toContain('Incorrect answer');
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed JSON', async () => {
      await request(app)
        .post('/api/captcha/verify')
        .set('Content-Type', 'application/json')
        .send('{"invalid": json}')
        .expect(400);
    });

    it('should handle missing request body', async () => {
      await request(app)
        .post('/api/captcha/verify')
        .expect(400);
    });
  });
});