import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { PasswordHistoryService } from '../passwordHistory';

// Mock the database and dependencies
vi.mock('../../db', () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    delete: vi.fn(),
    selectDistinct: vi.fn()
  }
}));

vi.mock('@shared/schema', () => ({
  passwordHistory: {
    id: 'id',
    userId: 'userId',
    passwordHash: 'passwordHash',
    createdAt: 'createdAt',
    replacedAt: 'replacedAt'
  },
  users: {
    id: 'id',
    lastPasswordChange: 'lastPasswordChange'
  }
}));

vi.mock('drizzle-orm', () => ({
  eq: vi.fn(),
  desc: vi.fn(),
  and: vi.fn()
}));

describe('PasswordHistoryService', () => {
  let service: PasswordHistoryService;
  let mockDb: any;

  beforeEach(() => {
    service = new PasswordHistoryService();
    mockDb = vi.mocked(await import('../../db')).db;
    
    // Reset mocks
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('addPasswordToHistory', () => {
    it('should add password to history when previous password exists', async () => {
      const userId = 1;
      const newPasswordHash = 'new-hash';
      const previousPasswordHash = 'previous-hash';
      const lastPasswordChange = new Date('2024-01-01');

      // Mock user query
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{
            lastPasswordChange: lastPasswordChange.toISOString()
          }])
        })
      });

      // Mock insert
      mockDb.insert.mockReturnValue({
        values: vi.fn().mockResolvedValue({})
      });

      // Mock cleanup (no old entries to delete)
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockResolvedValue([]) // No entries to clean up
          })
        })
      });

      await service.addPasswordToHistory(userId, newPasswordHash, previousPasswordHash);

      expect(mockDb.insert).toHaveBeenCalled();
      const insertCall = mockDb.insert.mock.calls[0];
      expect(insertCall[0].values.mock.calls[0][0]).toMatchObject({
        userId,
        passwordHash: previousPasswordHash
      });
    });

    it('should not add to history when no previous password', async () => {
      const userId = 1;
      const newPasswordHash = 'new-hash';

      // Mock cleanup (no old entries to delete)
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockResolvedValue([]) // No entries to clean up
          })
        })
      });

      await service.addPasswordToHistory(userId, newPasswordHash);

      expect(mockDb.insert).not.toHaveBeenCalled();
    });

    it('should clean up old entries after adding', async () => {
      const userId = 1;
      const newPasswordHash = 'new-hash';
      const previousPasswordHash = 'previous-hash';

      // Mock user query
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{
            lastPasswordChange: new Date().toISOString()
          }])
        })
      });

      // Mock insert
      mockDb.insert.mockReturnValue({
        values: vi.fn().mockResolvedValue({})
      });

      // Mock cleanup - return 6 entries (more than max of 5)
      const mockEntries = Array.from({ length: 6 }, (_, i) => ({ id: i + 1 }));
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockResolvedValue(mockEntries)
          })
        })
      });

      // Mock delete operations
      mockDb.delete.mockReturnValue({
        where: vi.fn().mockResolvedValue({})
      });

      await service.addPasswordToHistory(userId, newPasswordHash, previousPasswordHash);

      expect(mockDb.delete).toHaveBeenCalled(); // Should delete the oldest entry
    });
  });

  describe('getPasswordHistory', () => {
    it('should return password history ordered by creation date', async () => {
      const userId = 1;
      const mockHistory = [
        { id: 1, userId, passwordHash: 'hash1', createdAt: '2024-01-03', replacedAt: '2024-01-04' },
        { id: 2, userId, passwordHash: 'hash2', createdAt: '2024-01-02', replacedAt: '2024-01-03' },
        { id: 3, userId, passwordHash: 'hash3', createdAt: '2024-01-01', replacedAt: '2024-01-02' }
      ];

      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue(mockHistory)
            })
          })
        })
      });

      const result = await service.getPasswordHistory(userId);

      expect(result).toEqual(mockHistory);
      expect(result).toHaveLength(3);
    });

    it('should respect limit parameter', async () => {
      const userId = 1;
      const limit = 2;

      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([])
            })
          })
        })
      });

      await service.getPasswordHistory(userId, limit);

      // Verify limit was called with correct value
      const selectChain = mockDb.select().from().where().orderBy();
      expect(selectChain.limit).toHaveBeenCalledWith(limit);
    });
  });

  describe('getRecentPasswordHashes', () => {
    it('should return array of password hashes', async () => {
      const userId = 1;
      const mockHistory = [
        { passwordHash: 'hash1' },
        { passwordHash: 'hash2' },
        { passwordHash: 'hash3' }
      ];

      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue(mockHistory)
            })
          })
        })
      });

      const result = await service.getRecentPasswordHashes(userId);

      expect(result).toEqual(['hash1', 'hash2', 'hash3']);
    });
  });

  describe('isPasswordInHistory', () => {
    it('should return true if password exists in history', async () => {
      const userId = 1;
      const passwordHash = 'existing-hash';

      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([{ count: 1 }])
          })
        })
      });

      const result = await service.isPasswordInHistory(userId, passwordHash);

      expect(result).toBe(true);
    });

    it('should return false if password does not exist in history', async () => {
      const userId = 1;
      const passwordHash = 'non-existing-hash';

      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([])
          })
        })
      });

      const result = await service.isPasswordInHistory(userId, passwordHash);

      expect(result).toBe(false);
    });
  });

  describe('cleanupPasswordHistory', () => {
    it('should delete old entries when exceeding max count', async () => {
      const userId = 1;
      const mockEntries = Array.from({ length: 7 }, (_, i) => ({ id: i + 1 }));

      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockResolvedValue(mockEntries)
          })
        })
      });

      mockDb.delete.mockReturnValue({
        where: vi.fn().mockResolvedValue({})
      });

      const result = await service.cleanupPasswordHistory(userId);

      expect(result).toBe(2); // Should delete 2 entries (7 - 5 max)
      expect(mockDb.delete).toHaveBeenCalledTimes(2);
    });

    it('should return 0 when no cleanup needed', async () => {
      const userId = 1;
      const mockEntries = Array.from({ length: 3 }, (_, i) => ({ id: i + 1 }));

      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockResolvedValue(mockEntries)
          })
        })
      });

      const result = await service.cleanupPasswordHistory(userId);

      expect(result).toBe(0);
      expect(mockDb.delete).not.toHaveBeenCalled();
    });
  });

  describe('deleteUserPasswordHistory', () => {
    it('should delete all password history for a user', async () => {
      const userId = 1;

      mockDb.delete.mockReturnValue({
        where: vi.fn().mockResolvedValue({ rowCount: 3 })
      });

      const result = await service.deleteUserPasswordHistory(userId);

      expect(result).toBe(3);
      expect(mockDb.delete).toHaveBeenCalled();
    });

    it('should handle case when no history exists', async () => {
      const userId = 1;

      mockDb.delete.mockReturnValue({
        where: vi.fn().mockResolvedValue({ rowCount: 0 })
      });

      const result = await service.deleteUserPasswordHistory(userId);

      expect(result).toBe(0);
    });
  });

  describe('getPasswordHistoryStats', () => {
    it('should return correct stats for user with history', async () => {
      const userId = 1;
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

      const mockHistory = [
        { createdAt: thirtyDaysAgo.toISOString() },
        { createdAt: sixtyDaysAgo.toISOString() }
      ];

      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue(mockHistory)
            })
          })
        })
      });

      const result = await service.getPasswordHistoryStats(userId);

      expect(result.totalEntries).toBe(2);
      expect(result.oldestEntry).toEqual(sixtyDaysAgo);
      expect(result.newestEntry).toEqual(thirtyDaysAgo);
      expect(result.averagePasswordAge).toBeCloseTo(45, 0); // Average of 30 and 60 days
    });

    it('should return empty stats for user with no history', async () => {
      const userId = 1;

      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([])
            })
          })
        })
      });

      const result = await service.getPasswordHistoryStats(userId);

      expect(result.totalEntries).toBe(0);
      expect(result.oldestEntry).toBeNull();
      expect(result.newestEntry).toBeNull();
      expect(result.averagePasswordAge).toBe(0);
    });
  });

  describe('cleanupAllPasswordHistory', () => {
    it('should process all users and return summary', async () => {
      const mockUserIds = [{ userId: 1 }, { userId: 2 }, { userId: 3 }];

      mockDb.selectDistinct.mockReturnValue({
        from: vi.fn().mockResolvedValue(mockUserIds)
      });

      // Mock individual cleanup calls
      const mockCleanupResults = [2, 1, 0]; // Different cleanup results for each user
      let cleanupCallCount = 0;
      
      // Mock the select calls for cleanup
      mockDb.select.mockImplementation(() => ({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockResolvedValue(
              // Return different numbers of entries for each user
              Array.from({ length: cleanupCallCount === 0 ? 7 : cleanupCallCount === 1 ? 6 : 3 }, 
                         (_, i) => ({ id: i + 1 }))
            )
          })
        })
      }));

      mockDb.delete.mockReturnValue({
        where: vi.fn().mockResolvedValue({})
      });

      const result = await service.cleanupAllPasswordHistory();

      expect(result.usersProcessed).toBe(3);
      expect(result.entriesDeleted).toBeGreaterThan(0);
    });
  });
});