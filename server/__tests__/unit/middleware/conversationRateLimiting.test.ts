/**
 * Unit Tests for Conversation Rate Limiting Middleware
 * Tests tier-based limits, daily limits, and message length validation
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import {
  checkConversationRateLimit,
  checkDailyConversationLimit,
  validateMessageLength,
  getRemainingQuestions,
  getDailyRemainingQuestions,
  CONVERSATION_LIMITS,
  type UserTier,
} from '../../../middleware/conversationRateLimiting';

// Mock database
vi.mock('../../../db', () => ({
  db: {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          limit: vi.fn(() => Promise.resolve([])),
        })),
        innerJoin: vi.fn(() => ({
          where: vi.fn(() => Promise.resolve([{ count: 0 }])),
        })),
      })),
    })),
  },
}));

// Mock error handler
vi.mock('../../../middleware/errorHandler', () => ({
  AppError: {
    createAuthenticationError: vi.fn((msg, code) => ({ message: msg, code, status: 401 })),
    createValidationError: vi.fn((msg, code, data) => ({ message: msg, code, data, status: 400 })),
    createRateLimitError: vi.fn((msg, code, data) => ({ message: msg, code, data, status: 429 })),
    createSystemError: vi.fn((msg, code) => ({ message: msg, code, status: 500 })),
  },
}));

describe('Conversation Rate Limiting Middleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;
  let setHeaderSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    setHeaderSpy = vi.fn();
    
    mockReq = {
      user: {
        id: 1,
        email: 'test@example.com',
        subscriptionTier: 'free',
      },
      params: {
        analysisId: '123',
      },
      body: {
        content: 'Test message',
      },
    };

    mockRes = {
      set: setHeaderSpy,
    };

    mockNext = vi.fn();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('CONVERSATION_LIMITS', () => {
    it('should define limits for all tiers', () => {
      expect(CONVERSATION_LIMITS.free).toBeDefined();
      expect(CONVERSATION_LIMITS.pro).toBeDefined();
      expect(CONVERSATION_LIMITS.enterprise).toBeDefined();
    });

    it('should have correct free tier limits', () => {
      expect(CONVERSATION_LIMITS.free.questionsPerAnalysis).toBe(5);
      expect(CONVERSATION_LIMITS.free.maxMessageLength).toBe(500);
      expect(CONVERSATION_LIMITS.free.questionsPerDay).toBe(20);
    });

    it('should have unlimited questions for pro tier', () => {
      expect(CONVERSATION_LIMITS.pro.questionsPerAnalysis).toBe(Infinity);
      expect(CONVERSATION_LIMITS.pro.maxMessageLength).toBe(1000);
    });

    it('should have highest limits for enterprise tier', () => {
      expect(CONVERSATION_LIMITS.enterprise.questionsPerAnalysis).toBe(Infinity);
      expect(CONVERSATION_LIMITS.enterprise.maxMessageLength).toBe(2000);
      expect(CONVERSATION_LIMITS.enterprise.questionsPerDay).toBe(Infinity);
    });
  });

  describe('checkConversationRateLimit', () => {
    it('should allow request for authenticated user', async () => {
      await checkConversationRateLimit(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should reject unauthenticated user', async () => {
      mockReq.user = undefined;

      await checkConversationRateLimit(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 'NOT_AUTHENTICATED',
          status: 401,
        })
      );
    });

    it('should reject invalid analysis ID', async () => {
      mockReq.params = { analysisId: 'invalid' };

      await checkConversationRateLimit(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 'INVALID_ANALYSIS_ID',
          status: 400,
        })
      );
    });

    it('should allow unlimited questions for pro users', async () => {
      mockReq.user = { ...mockReq.user, subscriptionTier: 'pro' };

      await checkConversationRateLimit(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should allow unlimited questions for enterprise users', async () => {
      mockReq.user = { ...mockReq.user, subscriptionTier: 'enterprise' };

      await checkConversationRateLimit(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should set rate limit headers when conversation exists', async () => {
      // Mock database to return an existing conversation
      const { db } = await import('../../../db');
      vi.mocked(db.select).mockReturnValueOnce({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            limit: vi.fn(() => Promise.resolve([{ id: 1, analysisId: 123, userId: 1 }])),
          })),
        })),
      } as any);

      // Mock message count query
      vi.mocked(db.select).mockReturnValueOnce({
        from: vi.fn(() => ({
          where: vi.fn(() => Promise.resolve([{ count: 2 }])),
        })),
      } as any);

      await checkConversationRateLimit(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(setHeaderSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          'X-RateLimit-Limit': expect.any(String),
          'X-RateLimit-Remaining': expect.any(String),
        })
      );
    });
  });

  describe('validateMessageLength', () => {
    it('should allow valid message for free tier', () => {
      mockReq.body = { content: 'A'.repeat(400) };

      validateMessageLength(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should reject too long message for free tier', () => {
      mockReq.body = { content: 'A'.repeat(600) };

      validateMessageLength(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 'MESSAGE_TOO_LONG',
          status: 400,
        })
      );
    });

    it('should allow longer messages for pro tier', () => {
      mockReq.user = { ...mockReq.user, subscriptionTier: 'pro' };
      mockReq.body = { content: 'A'.repeat(900) };

      validateMessageLength(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should allow longest messages for enterprise tier', () => {
      mockReq.user = {
        id: 1,
        email: 'test@example.com',
        subscriptionTier: 'enterprise',
      };
      mockReq.body = { content: 'A'.repeat(1800) };

      validateMessageLength(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should reject missing content', () => {
      mockReq.body = {};

      validateMessageLength(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 'CONTENT_REQUIRED',
          status: 400,
        })
      );
    });

    it('should reject non-string content', () => {
      mockReq.body = { content: 123 };

      validateMessageLength(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 'CONTENT_REQUIRED',
          status: 400,
        })
      );
    });

    it('should normalize tier names', () => {
      mockReq.user = {
        id: 1,
        email: 'test@example.com',
        plan: 'premium',
        subscriptionTier: undefined,
      };
      mockReq.body = { content: 'A'.repeat(900) };

      validateMessageLength(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith();
    });
  });

  describe('getRemainingQuestions', () => {
    it('should return unlimited for pro users', async () => {
      const result = await getRemainingQuestions(1, 123, 'pro');

      expect(result.unlimited).toBe(true);
      expect(result.remaining).toBe(Infinity);
      expect(result.limit).toBe(Infinity);
    });

    it('should return unlimited for enterprise users', async () => {
      const result = await getRemainingQuestions(1, 123, 'enterprise');

      expect(result.unlimited).toBe(true);
      expect(result.remaining).toBe(Infinity);
    });

    it('should return limit for free users', async () => {
      const result = await getRemainingQuestions(1, 123, 'free');

      expect(result.unlimited).toBe(false);
      expect(result.limit).toBe(5);
      expect(result.remaining).toBeLessThanOrEqual(5);
    });

    it('should return full limit for new conversation', async () => {
      const { db } = await import('../../../db');
      vi.mocked(db.select).mockReturnValueOnce({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            limit: vi.fn(() => Promise.resolve([])), // No conversation
          })),
        })),
      } as any);

      const result = await getRemainingQuestions(1, 123, 'free');

      expect(result.remaining).toBe(5);
    });
  });

  describe('getDailyRemainingQuestions', () => {
    it('should return unlimited for enterprise users', async () => {
      const result = await getDailyRemainingQuestions(1, 'enterprise');

      expect(result.unlimited).toBe(true);
      expect(result.remaining).toBe(Infinity);
      expect(result.limit).toBe(Infinity);
    });

    it('should return daily limit for free users', async () => {
      const result = await getDailyRemainingQuestions(1, 'free');

      expect(result.unlimited).toBe(false);
      expect(result.limit).toBe(20);
      expect(result.remaining).toBeLessThanOrEqual(20);
    });

    it('should return daily limit for pro users', async () => {
      const result = await getDailyRemainingQuestions(1, 'pro');

      expect(result.unlimited).toBe(false);
      expect(result.limit).toBe(500);
    });

    it('should include reset time', async () => {
      const result = await getDailyRemainingQuestions(1, 'free');

      expect(result.resetAt).toBeInstanceOf(Date);
      expect(result.resetAt.getTime()).toBeGreaterThan(Date.now());
    });

    it('should reset at midnight', async () => {
      const result = await getDailyRemainingQuestions(1, 'free');

      const resetDate = result.resetAt;
      expect(resetDate.getHours()).toBe(0);
      expect(resetDate.getMinutes()).toBe(0);
      expect(resetDate.getSeconds()).toBe(0);
    });
  });

  describe('tier normalization', () => {
    it('should normalize "business" to "enterprise"', async () => {
      mockReq.user = { ...mockReq.user, subscriptionTier: 'business' };

      await checkConversationRateLimit(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should normalize "premium" to "pro"', async () => {
      mockReq.user = { 
        id: 1,
        email: 'test@example.com',
        plan: 'premium',
        subscriptionTier: undefined
      };
      mockReq.body = { content: 'A'.repeat(900) };

      validateMessageLength(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should default to "free" for unknown tiers', async () => {
      mockReq.user = { ...mockReq.user, subscriptionTier: 'unknown' };
      mockReq.body = { content: 'A'.repeat(600) };

      validateMessageLength(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 'MESSAGE_TOO_LONG',
        })
      );
    });
  });

  describe('error handling', () => {
    it('should handle database errors gracefully', async () => {
      const { db } = await import('../../../db');
      vi.mocked(db.select).mockImplementationOnce(() => {
        throw new Error('Database error');
      });

      await checkConversationRateLimit(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 'RATE_LIMIT_SYSTEM_ERROR',
          status: 500,
        })
      );
    });

    it('should handle validation errors gracefully', () => {
      mockReq.body = null;

      expect(() => {
        validateMessageLength(
          mockReq as Request,
          mockRes as Response,
          mockNext
        );
      }).not.toThrow();

      expect(mockNext).toHaveBeenCalled();
    });
  });
});
