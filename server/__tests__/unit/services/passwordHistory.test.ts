/**
 * Unit Tests for PasswordHistoryService
 * Tests password reuse prevention and history management
 * Requirements: 3.4, 3.5, 3.6
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock database module FIRST (before any imports that use it)
vi.mock('../../../db', () => ({
  db: {
    select: vi.fn().mockReturnThis(),
    selectDistinct: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
  },
}));

// Centralized test utilities
import {
  configureMockDbChain,
  resetAllMocks,
} from '../../imports';

// Import mocked dependencies AFTER mocks are set up
import { db } from '../../../db';

describe('PasswordHistoryService', () => {
  let service: any;
  let PasswordHistoryService: any;
  let mockPasswordHistory: any[];
  let mockUser: any;

  beforeEach(async () => {
    // Import service inside test to avoid hoisting issues
    const { PasswordHistoryService: ServiceClass } = await import('../../../services/passwordHistory');
    PasswordHistoryService = ServiceClass;
    service = new PasswordHistoryService();

    // Create mock password history entries
    mockPasswordHistory = [
      {
        id: 1,
        userId: 1,
        passwordHash: '$2b$10$oldHash1',
        createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days ago
        replacedAt: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: 2,
        userId: 1,
        passwordHash: '$2b$10$oldHash2',
        createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(), // 60 days ago
        replacedAt: new Date(Date.now() - 55 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: 3,
        userId: 1,
        passwordHash: '$2b$10$oldHash3',
        createdAt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(), // 90 days ago
        replacedAt: new Date(Date.now() - 85 * 24 * 60 * 60 * 1000).toISOString(),
      },
    ];

    mockUser = {
      id: 1,
      lastPasswordChange: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    };
  });

  afterEach(() => {
    resetAllMocks();
  });

  describe('Password History Retrieval Tests', () => {
    it('should retrieve password history for user', async () => {
      vi.mocked(db.select).mockReturnThis();
      vi.mocked(db.from).mockReturnThis();
      vi.mocked(db.where).mockReturnThis();
      vi.mocked(db.orderBy).mockReturnThis();
      vi.mocked(db.limit).mockResolvedValue(mockPasswordHistory);

      const history = await service.getPasswordHistory(1);

      expect(history).toEqual(mockPasswordHistory);
      expect(db.select).toHaveBeenCalled();
    });

    it('should handle empty password history', async () => {
      configureMockDbChain(db as any, {
        select: {
          result: [],
        },
      });

      const history = await service.getPasswordHistory(999);

      expect(history).toEqual([]);
    });

    it('should respect limit parameter', async () => {
      vi.mocked(db.select).mockReturnThis();
      vi.mocked(db.from).mockReturnThis();
      vi.mocked(db.where).mockReturnThis();
      vi.mocked(db.orderBy).mockReturnThis();
      vi.mocked(db.limit).mockResolvedValue(mockPasswordHistory.slice(0, 2));

      const history = await service.getPasswordHistory(1, 2);

      expect(history).toHaveLength(2);
    });

    it('should get recent password hashes', async () => {
      configureMockDbChain(db as any, {
        select: {
          result: mockPasswordHistory,
        },
      });

      const hashes = await service.getRecentPasswordHashes(1);

      expect(hashes).toEqual([
        '$2b$10$oldHash1',
        '$2b$10$oldHash2',
        '$2b$10$oldHash3',
      ]);
    });

    it('should return empty array when no history exists', async () => {
      configureMockDbChain(db as any, {
        select: {
          result: [],
        },
      });

      const hashes = await service.getRecentPasswordHashes(1);

      expect(hashes).toEqual([]);
    });
  });

  describe('Password Reuse Detection Tests', () => {
    it('should detect password in history', async () => {
      vi.mocked(db.select).mockReturnThis();
      vi.mocked(db.from).mockReturnThis();
      vi.mocked(db.where).mockReturnThis();
      vi.mocked(db.limit).mockResolvedValue([{ count: 1 }]);

      const isInHistory = await service.isPasswordInHistory(1, '$2b$10$oldHash1');

      expect(isInHistory).toBe(true);
      expect(db.select).toHaveBeenCalled();
    });

    it('should allow passwords not in history', async () => {
      configureMockDbChain(db as any, {
        select: {
          result: [],
        },
      });

      const isInHistory = await service.isPasswordInHistory(1, '$2b$10$newHash');

      expect(isInHistory).toBe(false);
    });

    it('should handle database errors gracefully', async () => {
      vi.mocked(db.select).mockImplementation(() => {
        throw new Error('Database error');
      });

      await expect(service.isPasswordInHistory(1, '$2b$10$testHash')).rejects.toThrow('Database error');
    });
  });

  describe('Password History Management Tests', () => {
    it('should add password to history with previous password', async () => {
      // Mock user query - need to return iterable result
      vi.mocked(db.select).mockReturnThis();
      vi.mocked(db.from).mockReturnThis();
      vi.mocked(db.where).mockResolvedValue([mockUser]);

      vi.mocked(db.insert).mockReturnThis();
      vi.mocked(db.values).mockResolvedValue(undefined);

      // Mock cleanup to return 0 (no entries deleted)
      vi.spyOn(service, 'cleanupPasswordHistory').mockResolvedValue(0);

      await service.addPasswordToHistory(1, '$2b$10$newHash', '$2b$10$previousHash');

      expect(db.insert).toHaveBeenCalled();
      expect(db.values).toHaveBeenCalledWith({
        userId: 1,
        passwordHash: '$2b$10$previousHash',
        createdAt: expect.any(String),
        replacedAt: expect.any(String),
      });
      expect(service.cleanupPasswordHistory).toHaveBeenCalledWith(1);
    });

    it('should skip history insertion when no previous password', async () => {
      vi.mocked(db.insert).mockReturnThis();
      vi.mocked(db.values).mockResolvedValue(undefined);

      // Mock cleanup to return 0
      vi.spyOn(service, 'cleanupPasswordHistory').mockResolvedValue(0);

      await service.addPasswordToHistory(1, '$2b$10$newHash');

      expect(db.insert).not.toHaveBeenCalled();
      expect(service.cleanupPasswordHistory).toHaveBeenCalledWith(1);
    });

    it('should use current time when user has no lastPasswordChange', async () => {
      // Mock user with no lastPasswordChange
      vi.mocked(db.select).mockReturnThis();
      vi.mocked(db.from).mockReturnThis();
      vi.mocked(db.where).mockResolvedValue([{ lastPasswordChange: null }]);

      vi.mocked(db.insert).mockReturnThis();
      vi.mocked(db.values).mockResolvedValue(undefined);
      vi.spyOn(service, 'cleanupPasswordHistory').mockResolvedValue(0);

      const beforeAdd = new Date();
      await service.addPasswordToHistory(1, '$2b$10$newHash', '$2b$10$previousHash');
      const afterAdd = new Date();

      expect(db.values).toHaveBeenCalled();
      const call = vi.mocked(db.values).mock.calls[0][0];
      const createdAt = new Date(call.createdAt);
      
      expect(createdAt.getTime()).toBeGreaterThanOrEqual(beforeAdd.getTime());
      expect(createdAt.getTime()).toBeLessThanOrEqual(afterAdd.getTime());
    });
  });

  describe('Password History Cleanup Tests', () => {
    it('should delete old entries when limit exceeded', async () => {
      // Mock 7 entries (exceeds MAX_HISTORY_COUNT of 5)
      const manyEntries = Array.from({ length: 7 }, (_, i) => ({
        id: i + 1,
        userId: 1,
        passwordHash: `$2b$10$hash${i}`,
        createdAt: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString(),
      }));

      configureMockDbChain(db as any, {
        select: {
          result: manyEntries,
        },
      });

      vi.mocked(db.delete).mockReturnThis();
      vi.mocked(db.where).mockResolvedValue(undefined);

      const deleted = await service.cleanupPasswordHistory(1);

      expect(deleted).toBe(2); // Should delete 2 oldest entries
      expect(db.delete).toHaveBeenCalledTimes(2);
    });

    it('should not delete when under limit', async () => {
      // Mock 3 entries (under MAX_HISTORY_COUNT of 5)
      configureMockDbChain(db as any, {
        select: {
          result: mockPasswordHistory,
        },
      });

      const deleted = await service.cleanupPasswordHistory(1);

      expect(deleted).toBe(0);
      expect(db.delete).not.toHaveBeenCalled();
    });

    it('should handle empty history', async () => {
      configureMockDbChain(db as any, {
        select: {
          result: [],
        },
      });

      const deleted = await service.cleanupPasswordHistory(1);

      expect(deleted).toBe(0);
      expect(db.delete).not.toHaveBeenCalled();
    });

    it('should cleanup all users password history', async () => {
      // Mock distinct user IDs
      vi.mocked(db.selectDistinct).mockReturnThis();
      vi.mocked(db.from).mockResolvedValue([{ userId: 1 }, { userId: 2 }, { userId: 3 }]);

      // Mock cleanup to return 2 deleted entries per user
      vi.spyOn(service, 'cleanupPasswordHistory').mockResolvedValue(2);

      const result = await service.cleanupAllPasswordHistory();

      expect(result.usersProcessed).toBe(3);
      expect(result.entriesDeleted).toBe(6); // 3 users * 2 deleted each
      expect(service.cleanupPasswordHistory).toHaveBeenCalledTimes(3);
    });
  });

  describe('User Deletion Tests', () => {
    it('should delete all password history for user', async () => {
      vi.mocked(db.delete).mockReturnThis();
      vi.mocked(db.where).mockResolvedValue({ rowCount: 3 });

      const deleted = await service.deleteUserPasswordHistory(1);

      expect(deleted).toBe(3);
      expect(db.delete).toHaveBeenCalled();
      expect(db.where).toHaveBeenCalled();
    });

    it('should handle user with no history', async () => {
      vi.mocked(db.delete).mockReturnThis();
      vi.mocked(db.where).mockResolvedValue({ rowCount: 0 });

      const deleted = await service.deleteUserPasswordHistory(999);

      expect(deleted).toBe(0);
    });

    it('should handle null rowCount', async () => {
      vi.mocked(db.delete).mockReturnThis();
      vi.mocked(db.where).mockResolvedValue({ rowCount: null });

      const deleted = await service.deleteUserPasswordHistory(1);

      expect(deleted).toBe(0);
    });
  });

  describe('Password History Statistics Tests', () => {
    it('should calculate statistics correctly', async () => {
      configureMockDbChain(db as any, {
        select: {
          result: mockPasswordHistory,
        },
      });

      const stats = await service.getPasswordHistoryStats(1);

      expect(stats.totalEntries).toBe(3);
      expect(stats.oldestEntry).toBeInstanceOf(Date);
      expect(stats.newestEntry).toBeInstanceOf(Date);
      expect(stats.averagePasswordAge).toBeGreaterThan(0);
    });

    it('should handle empty history', async () => {
      configureMockDbChain(db as any, {
        select: {
          result: [],
        },
      });

      const stats = await service.getPasswordHistoryStats(1);

      expect(stats.totalEntries).toBe(0);
      expect(stats.oldestEntry).toBeNull();
      expect(stats.newestEntry).toBeNull();
      expect(stats.averagePasswordAge).toBe(0);
    });

    it('should calculate average password age', async () => {
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

      const recentHistory = [
        {
          id: 1,
          userId: 1,
          passwordHash: '$2b$10$hash1',
          createdAt: thirtyDaysAgo.toISOString(),
          replacedAt: now.toISOString(),
        },
        {
          id: 2,
          userId: 1,
          passwordHash: '$2b$10$hash2',
          createdAt: sixtyDaysAgo.toISOString(),
          replacedAt: thirtyDaysAgo.toISOString(),
        },
      ];

      configureMockDbChain(db as any, {
        select: {
          result: recentHistory,
        },
      });

      const stats = await service.getPasswordHistoryStats(1);

      // Average should be around 45 days (30 + 60) / 2
      expect(stats.averagePasswordAge).toBeGreaterThan(40);
      expect(stats.averagePasswordAge).toBeLessThan(50);
    });

    it('should identify oldest and newest entries', async () => {
      configureMockDbChain(db as any, {
        select: {
          result: mockPasswordHistory,
        },
      });

      const stats = await service.getPasswordHistoryStats(1);

      const oldestDate = new Date(mockPasswordHistory[2].createdAt);
      const newestDate = new Date(mockPasswordHistory[0].createdAt);

      expect(stats.oldestEntry?.getTime()).toBe(oldestDate.getTime());
      expect(stats.newestEntry?.getTime()).toBe(newestDate.getTime());
    });
  });
});
