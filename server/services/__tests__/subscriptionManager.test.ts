import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getUserSubscriptionTier,
  hasActiveSubscription,
  canPerformAction,
  SUBSCRIPTION_LIMITS,
} from '../subscriptionManager';
import { db } from '../../db';

// Mock the database
vi.mock('../../db', () => ({
  db: {
    select: vi.fn(),
    update: vi.fn(),
  },
}));

describe('Subscription Manager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getUserSubscriptionTier', () => {
    it('should return free tier for user without subscription', async () => {
      const mockUser = {
        id: 1,
        subscriptionTier: 'free',
        subscriptionStatus: 'inactive',
        subscriptionPeriodEnd: null,
      };

      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockUser]),
          }),
        }),
      } as any);

      const tier = await getUserSubscriptionTier(1);
      expect(tier).toBe('free');
    });

    it('should return pro tier for active pro subscription', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30);

      const mockUser = {
        id: 1,
        subscriptionTier: 'pro',
        subscriptionStatus: 'active',
        subscriptionPeriodEnd: futureDate.toISOString(),
      };

      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockUser]),
          }),
        }),
      } as any);

      const tier = await getUserSubscriptionTier(1);
      expect(tier).toBe('pro');
    });

    it('should downgrade to free if subscription is expired', async () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);

      const mockUser = {
        id: 1,
        subscriptionTier: 'pro',
        subscriptionStatus: 'active',
        subscriptionPeriodEnd: pastDate.toISOString(),
      };

      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockUser]),
          }),
        }),
      } as any);

      vi.mocked(db.update).mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined),
        }),
      } as any);

      const tier = await getUserSubscriptionTier(1);
      expect(tier).toBe('free');
    });
  });

  describe('hasActiveSubscription', () => {
    it('should return false for free tier', async () => {
      const mockUser = {
        id: 1,
        subscriptionTier: 'free',
        subscriptionStatus: 'inactive',
        subscriptionPeriodEnd: null,
      };

      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockUser]),
          }),
        }),
      } as any);

      const isActive = await hasActiveSubscription(1);
      expect(isActive).toBe(false);
    });

    it('should return true for active subscription', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30);

      const mockUser = {
        id: 1,
        subscriptionTier: 'pro',
        subscriptionStatus: 'active',
        subscriptionPeriodEnd: futureDate.toISOString(),
      };

      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockUser]),
          }),
        }),
      } as any);

      const isActive = await hasActiveSubscription(1);
      expect(isActive).toBe(true);
    });
  });

  describe('canPerformAction', () => {
    it('should allow search for free user within limit', async () => {
      const mockUser = {
        id: 1,
        subscriptionTier: 'free',
        searchCount: 3,
      };

      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockUser]),
          }),
        }),
      } as any);

      const result = await canPerformAction(1, 'search');
      expect(result.allowed).toBe(true);
    });

    it('should deny search for free user over limit', async () => {
      const mockUser = {
        id: 1,
        subscriptionTier: 'free',
        searchCount: 5,
      };

      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockUser]),
          }),
        }),
      } as any);

      const result = await canPerformAction(1, 'search');
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('Search limit reached');
    });

    it('should allow unlimited searches for pro user', async () => {
      const mockUser = {
        id: 1,
        subscriptionTier: 'pro',
        searchCount: 150,
        subscriptionPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      };

      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockUser]),
          }),
        }),
      } as any);

      const result = await canPerformAction(1, 'search');
      expect(result.allowed).toBe(true);
    });

    it('should deny AI analysis for free user', async () => {
      const mockUser = {
        id: 1,
        subscriptionTier: 'free',
      };

      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockUser]),
          }),
        }),
      } as any);

      const result = await canPerformAction(1, 'aiAnalysis');
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('AI analysis is only available on Pro plans');
    });

    it('should allow AI analysis for pro user', async () => {
      const mockUser = {
        id: 1,
        subscriptionTier: 'pro',
        subscriptionPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      };

      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockUser]),
          }),
        }),
      } as any);

      const result = await canPerformAction(1, 'aiAnalysis');
      expect(result.allowed).toBe(true);
    });
  });

  describe('SUBSCRIPTION_LIMITS', () => {
    it('should have correct limits for free tier', () => {
      expect(SUBSCRIPTION_LIMITS.free.searches).toBe(5);
      expect(SUBSCRIPTION_LIMITS.free.exports).toBe(3);
      expect(SUBSCRIPTION_LIMITS.free.aiAnalysis).toBe(false);
    });

    it('should have correct limits for pro tier', () => {
      expect(SUBSCRIPTION_LIMITS.pro.searches).toBe(100);
      expect(SUBSCRIPTION_LIMITS.pro.exports).toBe(50);
      expect(SUBSCRIPTION_LIMITS.pro.aiAnalysis).toBe(true);
    });

    it('should have unlimited for enterprise tier', () => {
      expect(SUBSCRIPTION_LIMITS.enterprise.searches).toBe(-1);
      expect(SUBSCRIPTION_LIMITS.enterprise.exports).toBe(-1);
      expect(SUBSCRIPTION_LIMITS.enterprise.aiAnalysis).toBe(true);
    });
  });
});
