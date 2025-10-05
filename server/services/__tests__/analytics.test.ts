import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AnalyticsService } from '../analytics';
import { db } from '../../db';

// Mock the database
vi.mock('../../db', () => ({
  db: {
    insert: vi.fn(() => ({
      values: vi.fn().mockResolvedValue(undefined),
    })),
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          limit: vi.fn().mockResolvedValue([{ analyticsOptOut: false }]),
          orderBy: vi.fn().mockResolvedValue([]),
          groupBy: vi.fn(() => ({
            orderBy: vi.fn(() => ({
              limit: vi.fn().mockResolvedValue([]),
            })),
          })),
        })),
      })),
    })),
    delete: vi.fn(() => ({
      where: vi.fn().mockResolvedValue({ rowCount: 0 }),
    })),
  },
}));

describe('AnalyticsService', () => {
  let analyticsService: AnalyticsService;

  beforeEach(() => {
    analyticsService = new AnalyticsService();
    vi.clearAllMocks();
  });

  describe('trackEvent', () => {
    it('should track a generic event', async () => {
      const event = {
        eventType: 'test_event',
        userId: 1,
        metadata: { test: 'data' },
      };

      await analyticsService.trackEvent(event);

      expect(db.insert).toHaveBeenCalled();
    });

    it('should not throw on database errors', async () => {
      vi.mocked(db.insert).mockImplementationOnce(() => {
        throw new Error('Database error');
      });

      const event = {
        eventType: 'test_event',
        userId: 1,
      };

      // Should not throw
      await expect(analyticsService.trackEvent(event)).resolves.toBeUndefined();
    });
  });

  describe('trackSearch', () => {
    it('should track a search query', async () => {
      await analyticsService.trackSearch(1, 'test query', 5);

      expect(db.insert).toHaveBeenCalled();
    });

    it('should handle undefined userId', async () => {
      await analyticsService.trackSearch(undefined, 'test query', 5);

      expect(db.insert).toHaveBeenCalled();
    });
  });

  describe('trackExport', () => {
    it('should track an export action', async () => {
      await analyticsService.trackExport(1, 'pdf', 123);

      expect(db.insert).toHaveBeenCalled();
    });
  });

  describe('trackPageView', () => {
    it('should track a page view', async () => {
      await analyticsService.trackPageView(1, '/dashboard', 'https://example.com');

      expect(db.insert).toHaveBeenCalled();
    });

    it('should track page view without referrer', async () => {
      await analyticsService.trackPageView(1, '/dashboard');

      expect(db.insert).toHaveBeenCalled();
    });
  });

  describe('trackFeatureUsage', () => {
    it('should track feature usage', async () => {
      await analyticsService.trackFeatureUsage(1, 'search', 'advanced_filter');

      expect(db.insert).toHaveBeenCalled();
    });
  });

  describe('trackSignup', () => {
    it('should track user signup', async () => {
      await analyticsService.trackSignup(1, 'google');

      expect(db.insert).toHaveBeenCalled();
    });
  });

  describe('trackSubscription', () => {
    it('should track subscription events', async () => {
      await analyticsService.trackSubscription(1, 'created', 'pro');

      expect(db.insert).toHaveBeenCalled();
    });
  });

  describe('getMetrics', () => {
    it('should return aggregated metrics', async () => {
      const startDate = new Date('2025-01-01');
      const endDate = new Date('2025-01-31');

      // Mock the database responses with proper structure for all queries
      let callCount = 0;
      vi.mocked(db.select).mockImplementation(() => ({
        from: vi.fn(() => ({
          where: vi.fn(() => {
            callCount++;
            // First 4 calls are count queries, next 2 are groupBy queries
            if (callCount <= 6) {
              return {
                groupBy: vi.fn(() => ({
                  orderBy: vi.fn(() => ({
                    limit: vi.fn().mockResolvedValue([]),
                  })),
                })),
              };
            }
            // Last 2 calls are for conversion rate
            return Promise.resolve([{ count: 0 }]);
          }),
        })),
      } as any));

      const metrics = await analyticsService.getMetrics(startDate, endDate);

      expect(metrics).toHaveProperty('totalSearches');
      expect(metrics).toHaveProperty('totalExports');
      expect(metrics).toHaveProperty('totalPageViews');
      expect(metrics).toHaveProperty('activeUsers');
      expect(metrics).toHaveProperty('popularSearches');
      expect(metrics).toHaveProperty('exportsByFormat');
      expect(metrics).toHaveProperty('conversionRate');
      expect(Array.isArray(metrics.popularSearches)).toBe(true);
      expect(typeof metrics.exportsByFormat).toBe('object');
    });
  });

  describe('getUserAnalytics', () => {
    it('should return user-specific analytics', async () => {
      const userId = 1;
      const startDate = new Date('2025-01-01');
      const endDate = new Date('2025-01-31');

      const events = await analyticsService.getUserAnalytics(userId, startDate, endDate);

      expect(db.select).toHaveBeenCalled();
      expect(Array.isArray(events)).toBe(true);
    });
  });

  describe('cleanupOldData', () => {
    it('should delete old analytics data', async () => {
      vi.mocked(db.delete).mockReturnValue({
        where: vi.fn().mockResolvedValue({ rowCount: 100 }),
      } as any);

      const deletedCount = await analyticsService.cleanupOldData(90);

      expect(db.delete).toHaveBeenCalled();
      expect(deletedCount).toBe(100);
    });

    it('should use default retention period', async () => {
      vi.mocked(db.delete).mockReturnValue({
        where: vi.fn().mockResolvedValue({ rowCount: 50 }),
      } as any);

      const deletedCount = await analyticsService.cleanupOldData();

      expect(deletedCount).toBe(50);
    });
  });
});
