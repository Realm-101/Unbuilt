import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { AccountLockoutService } from '../accountLockout';

// Mock the database and dependencies
vi.mock('../../db', () => ({
  db: {
    select: vi.fn(),
    update: vi.fn(),
  }
}));

vi.mock('../securityEventHandler', () => ({
  securityEventHandler: {
    logSecurityEvent: vi.fn()
  }
}));

vi.mock('@shared/schema', () => ({
  users: {
    id: 'id',
    failedLoginAttempts: 'failedLoginAttempts',
    lastFailedLogin: 'lastFailedLogin',
    accountLocked: 'accountLocked',
    lockoutExpires: 'lockoutExpires',
    updatedAt: 'updatedAt'
  }
}));

vi.mock('drizzle-orm', () => ({
  eq: vi.fn()
}));

describe('AccountLockoutService', () => {
  let service: AccountLockoutService;
  let mockDb: any;
  let mockSecurityEventHandler: any;

  beforeEach(() => {
    service = new AccountLockoutService();
    mockDb = vi.mocked(await import('../../db')).db;
    mockSecurityEventHandler = vi.mocked(await import('../securityEventHandler')).securityEventHandler;
    
    // Reset mocks
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should use default configuration', () => {
      const config = service.getConfig();
      
      expect(config.maxFailedAttempts).toBe(5);
      expect(config.lockoutDurationMinutes).toBe(15);
      expect(config.progressiveLockout).toBe(true);
      expect(config.resetAttemptsAfterMinutes).toBe(60);
    });

    it('should accept custom configuration', () => {
      const customService = new AccountLockoutService({
        maxFailedAttempts: 3,
        lockoutDurationMinutes: 30
      });
      
      const config = customService.getConfig();
      expect(config.maxFailedAttempts).toBe(3);
      expect(config.lockoutDurationMinutes).toBe(30);
      expect(config.progressiveLockout).toBe(true); // Should keep default
    });
  });

  describe('recordFailedAttempt', () => {
    it('should increment failed attempts for first failure', async () => {
      // Mock user with no previous failed attempts
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{
            id: 1,
            failedLoginAttempts: 0,
            lastFailedLogin: null,
            accountLocked: false,
            lockoutExpires: null
          }])
        })
      });

      mockDb.update.mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue({})
        })
      });

      const result = await service.recordFailedAttempt(1, 'test@example.com', '192.168.1.1');

      expect(result.isLocked).toBe(false);
      expect(result.remainingAttempts).toBe(4); // 5 - 1
      expect(mockDb.update).toHaveBeenCalled();
    });

    it('should lock account after max failed attempts', async () => {
      // Mock user with 4 previous failed attempts
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{
            id: 1,
            failedLoginAttempts: 4,
            lastFailedLogin: new Date(Date.now() - 5 * 60 * 1000).toISOString(), // 5 minutes ago
            accountLocked: false,
            lockoutExpires: null
          }])
        })
      });

      mockDb.update.mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue({})
        })
      });

      const result = await service.recordFailedAttempt(1, 'test@example.com', '192.168.1.1');

      expect(result.isLocked).toBe(true);
      expect(result.remainingAttempts).toBe(0);
      expect(result.lockoutExpiresAt).toBeDefined();
      expect(mockSecurityEventHandler.logSecurityEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'ACCOUNT_LOCKED',
          userId: 1
        })
      );
    });

    it('should reset attempts if enough time has passed', async () => {
      // Mock user with failed attempts from over an hour ago
      const oldFailedLogin = new Date(Date.now() - 2 * 60 * 60 * 1000); // 2 hours ago
      
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{
            id: 1,
            failedLoginAttempts: 3,
            lastFailedLogin: oldFailedLogin.toISOString(),
            accountLocked: false,
            lockoutExpires: null
          }])
        })
      });

      mockDb.update.mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue({})
        })
      });

      const result = await service.recordFailedAttempt(1, 'test@example.com', '192.168.1.1');

      expect(result.remainingAttempts).toBe(4); // Should be reset to 1 failed attempt
    });

    it('should throw error for non-existent user', async () => {
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]) // No user found
        })
      });

      await expect(service.recordFailedAttempt(999, 'test@example.com', '192.168.1.1'))
        .rejects.toThrow('User not found');
    });
  });

  describe('recordSuccessfulLogin', () => {
    it('should reset all lockout fields', async () => {
      mockDb.update.mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue({})
        })
      });

      await service.recordSuccessfulLogin(1);

      expect(mockDb.update).toHaveBeenCalled();
      const updateCall = mockDb.update.mock.calls[0];
      const setCall = updateCall[0].set.mock.calls[0][0];
      
      expect(setCall.failedLoginAttempts).toBe(0);
      expect(setCall.lastFailedLogin).toBeNull();
      expect(setCall.accountLocked).toBe(false);
      expect(setCall.lockoutExpires).toBeNull();
    });
  });

  describe('isAccountLocked', () => {
    it('should return false for unlocked account', async () => {
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{
            id: 1,
            accountLocked: false,
            lockoutExpires: null
          }])
        })
      });

      const isLocked = await service.isAccountLocked(1);
      expect(isLocked).toBe(false);
    });

    it('should return true for locked account within lockout period', async () => {
      const futureDate = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now
      
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{
            id: 1,
            accountLocked: true,
            lockoutExpires: futureDate.toISOString()
          }])
        })
      });

      const isLocked = await service.isAccountLocked(1);
      expect(isLocked).toBe(true);
    });

    it('should unlock expired lockout automatically', async () => {
      const pastDate = new Date(Date.now() - 10 * 60 * 1000); // 10 minutes ago
      
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{
            id: 1,
            accountLocked: true,
            lockoutExpires: pastDate.toISOString()
          }])
        })
      });

      mockDb.update.mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue({})
        })
      });

      const isLocked = await service.isAccountLocked(1);
      expect(isLocked).toBe(false);
      expect(mockDb.update).toHaveBeenCalled(); // Should have unlocked the account
    });

    it('should return false for non-existent user', async () => {
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]) // No user found
        })
      });

      const isLocked = await service.isAccountLocked(999);
      expect(isLocked).toBe(false);
    });
  });

  describe('unlockAccount', () => {
    it('should reset lockout fields and log security event', async () => {
      mockDb.update.mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue({})
        })
      });

      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{
            id: 1,
            email: 'test@example.com'
          }])
        })
      });

      await service.unlockAccount(1, 'admin');

      expect(mockDb.update).toHaveBeenCalled();
      expect(mockSecurityEventHandler.logSecurityEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'ACCOUNT_UNLOCKED',
          userId: 1
        })
      );
    });
  });

  describe('getAccountLockoutStatus', () => {
    it('should return correct status for unlocked account', async () => {
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{
            id: 1,
            failedLoginAttempts: 2,
            accountLocked: false,
            lockoutExpires: null
          }])
        })
      });

      const status = await service.getAccountLockoutStatus(1);

      expect(status.isLocked).toBe(false);
      expect(status.remainingAttempts).toBe(3); // 5 - 2
      expect(status.lockoutExpiresAt).toBeNull();
      expect(status.nextAttemptAllowedAt).toBeDefined(); // Should have progressive delay
    });

    it('should throw error for non-existent user', async () => {
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]) // No user found
        })
      });

      await expect(service.getAccountLockoutStatus(999))
        .rejects.toThrow('User not found');
    });
  });

  describe('updateConfig', () => {
    it('should update configuration', () => {
      service.updateConfig({ maxFailedAttempts: 10 });
      
      const config = service.getConfig();
      expect(config.maxFailedAttempts).toBe(10);
      expect(config.lockoutDurationMinutes).toBe(15); // Should keep original
    });
  });
});