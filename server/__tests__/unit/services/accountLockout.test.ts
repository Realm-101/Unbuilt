/**
 * Unit Tests for AccountLockoutService
 * Tests account lockout triggers, unlocks, and policy enforcement
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock database module FIRST (before any imports that use it)
vi.mock('../../../db', () => ({
  db: {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
  },
}));

// Mock security logger
vi.mock('../../../services/securityLogger', () => ({
  securityLogger: {
    logSecurityEvent: vi.fn().mockResolvedValue(undefined),
  },
}));

// Centralized test utilities
import {
  configureMockDbChain,
  resetAllMocks,
} from '../../imports';

// Import mocked modules at top level (after vi.mock calls)
import { db } from '../../../db';
import { securityLogger } from '../../../services/securityLogger';

// Service being tested
import { AccountLockoutService, type LockoutConfig } from '../../../services/accountLockout';

describe('AccountLockoutService', () => {
  let service: AccountLockoutService;
  let mockUser: any;

  beforeEach(() => {
    // Create service with default config
    service = new AccountLockoutService();

    // Create mock user
    mockUser = {
      id: 1,
      email: 'test@example.com',
      username: 'testuser',
      failedLoginAttempts: 0,
      lastFailedLogin: null,
      accountLocked: false,
      lockoutExpires: null,
      updatedAt: new Date().toISOString(),
    };
  });

  afterEach(() => {
    resetAllMocks();
  });

  describe('Lockout Trigger Tests', () => {
    it('should lock account after configured failed attempts', async () => {
      // Mock user with 4 failed attempts (one more will lock)
      const userWithAttempts = {
        ...mockUser,
        failedLoginAttempts: 4,
        lastFailedLogin: new Date().toISOString(),
      };

      // Mock select chain to return user
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([userWithAttempts]),
        }),
      } as any);

      // Mock update chain
      vi.mocked(db.update).mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined),
        }),
      } as any);

      const status = await service.recordFailedAttempt(1, 'test@example.com', '127.0.0.1');

      expect(status.isLocked).toBe(true);
      expect(status.remainingAttempts).toBe(0);
      expect(status.lockoutExpiresAt).not.toBeNull();
      expect(vi.mocked(db.update)).toHaveBeenCalled();
    });

    it('should increment failed attempt counter correctly', async () => {
      // Mock select chain to return user
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([mockUser]),
        }),
      } as any);

      // Mock update chain
      const mockSet = vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      });
      vi.mocked(db.update).mockReturnValue({
        set: mockSet,
      } as any);

      const status = await service.recordFailedAttempt(1, 'test@example.com', '127.0.0.1');

      expect(status.isLocked).toBe(false);
      expect(status.remainingAttempts).toBe(4); // 5 max - 1 attempt
      expect(mockSet).toHaveBeenCalledWith(
        expect.objectContaining({
          failedLoginAttempts: 1,
        })
      );
    });

    it('should set lockout timestamp when locking account', async () => {
      const userWithAttempts = {
        ...mockUser,
        failedLoginAttempts: 4,
        lastFailedLogin: new Date().toISOString(),
      };

      // Mock select chain to return user
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([userWithAttempts]),
        }),
      } as any);

      // Mock update chain
      vi.mocked(db.update).mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined),
        }),
      } as any);

      const beforeLockout = new Date();
      const status = await service.recordFailedAttempt(1, 'test@example.com', '127.0.0.1');
      const afterLockout = new Date();

      expect(status.lockoutExpiresAt).not.toBeNull();
      expect(status.lockoutExpiresAt!.getTime()).toBeGreaterThan(beforeLockout.getTime());
      expect(status.lockoutExpiresAt!.getTime()).toBeGreaterThan(afterLockout.getTime());
    });

    it('should track failed attempts for correct user', async () => {
      const mockWhere = vi.fn().mockResolvedValue([mockUser]);
      
      // Mock select chain to return user
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: mockWhere,
        }),
      } as any);

      // Mock update chain
      vi.mocked(db.update).mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined),
        }),
      } as any);

      await service.recordFailedAttempt(1, 'test@example.com', '127.0.0.1');

      expect(mockWhere).toHaveBeenCalled();
    });

    it('should log security event when account is locked', async () => {
      const userWithAttempts = {
        ...mockUser,
        failedLoginAttempts: 4,
        lastFailedLogin: new Date().toISOString(),
      };

      // Mock select chain to return user
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([userWithAttempts]),
        }),
      } as any);

      // Mock update chain
      vi.mocked(db.update).mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined),
        }),
      } as any);

      await service.recordFailedAttempt(1, 'test@example.com', '127.0.0.1');

      expect(securityLogger.logSecurityEvent).toHaveBeenCalledWith(
        'ACCOUNT_LOCKED',
        'account_lockout',
        true,
        expect.objectContaining({
          userId: 1,
          userEmail: 'test@example.com',
          ipAddress: '127.0.0.1',
        })
      );
    });
  });

  describe('Unlock Tests', () => {
    it('should automatically unlock after duration expires', async () => {
      // Mock locked user with expired lockout
      const expiredLockout = new Date(Date.now() - 1000); // 1 second ago
      const lockedUser = {
        ...mockUser,
        accountLocked: true,
        lockoutExpires: expiredLockout.toISOString(),
        failedLoginAttempts: 5,
      };

      // Mock select chain to return locked user
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([lockedUser]),
        }),
      } as any);

      // Mock update chain
      vi.mocked(db.update).mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined),
        }),
      } as any);

      const isLocked = await service.isAccountLocked(1);

      expect(isLocked).toBe(false);
      expect(vi.mocked(db.update)).toHaveBeenCalled();
    });

    it('should manually unlock account by admin', async () => {
      const mockSet = vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      });

      // Mock select chain to return user
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([mockUser]),
        }),
      } as any);

      // Mock update chain
      vi.mocked(db.update).mockReturnValue({
        set: mockSet,
      } as any);

      await service.unlockAccount(1, 'admin@example.com');

      expect(mockSet).toHaveBeenCalledWith(
        expect.objectContaining({
          accountLocked: false,
          failedLoginAttempts: 0,
          lockoutExpires: null,
        })
      );
    });

    it('should reset attempt counter on unlock', async () => {
      

      configureMockDbChain(db as any, {
        select: {
          result: [mockUser],
        },
      });

      vi.mocked(db.update).mockReturnThis();
      vi.mocked(db.set).mockReturnThis();
      vi.mocked(db.where).mockResolvedValue(undefined);

      await service.unlockAccount(1);

      expect(vi.mocked(db.set)).toHaveBeenCalledWith(
        expect.objectContaining({
          failedLoginAttempts: 0,
        })
      );
    });

    it('should clear lockout timestamp on unlock', async () => {
      

      configureMockDbChain(db as any, {
        select: {
          result: [mockUser],
        },
      });

      vi.mocked(db.update).mockReturnThis();
      vi.mocked(db.set).mockReturnThis();
      vi.mocked(db.where).mockResolvedValue(undefined);

      await service.unlockAccount(1);

      expect(vi.mocked(db.set)).toHaveBeenCalledWith(
        expect.objectContaining({
          lockoutExpires: null,
        })
      );
    });

    it('should log security event for manual unlock', async () => {
      // Mock multiple select calls
      let callCount = 0;
      vi.mocked(db.select).mockImplementation(() => ({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(callCount++ === 0 ? [mockUser] : [mockUser]),
        }),
      } as any));

      // Mock update chain
      vi.mocked(db.update).mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined),
        }),
      } as any);

      await service.unlockAccount(1, 'admin@example.com');

      expect(securityLogger.logSecurityEvent).toHaveBeenCalledWith(
        'ACCOUNT_UNLOCKED',
        'manual_unlock',
        true,
        expect.objectContaining({
          userId: 1,
          metadata: expect.objectContaining({
            unlockedBy: 'admin@example.com',
          }),
        })
      );
    });
  });

  describe('Lockout Policy Tests', () => {
    it('should respect configurable attempt limits', async () => {
      // Create service with custom config
      const customService = new AccountLockoutService({
        maxFailedAttempts: 3,
      });

      const userWithAttempts = {
        ...mockUser,
        failedLoginAttempts: 2,
        lastFailedLogin: new Date().toISOString(),
      };

      // Mock select chain to return user
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([userWithAttempts]),
        }),
      } as any);

      // Mock update chain
      vi.mocked(db.update).mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined),
        }),
      } as any);

      const status = await customService.recordFailedAttempt(1, 'test@example.com', '127.0.0.1');

      expect(status.isLocked).toBe(true);
    });

    it('should respect configurable lockout duration', async () => {
      const customService = new AccountLockoutService({
        lockoutDurationMinutes: 30,
        progressiveLockout: false,
      });

      const userWithAttempts = {
        ...mockUser,
        failedLoginAttempts: 4,
        lastFailedLogin: new Date().toISOString(),
      };

      // Mock select chain to return user
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([userWithAttempts]),
        }),
      } as any);

      // Mock update chain
      vi.mocked(db.update).mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined),
        }),
      } as any);

      const beforeLockout = new Date();
      const status = await customService.recordFailedAttempt(1, 'test@example.com', '127.0.0.1');

      const expectedExpiry = new Date(beforeLockout.getTime() + 30 * 60 * 1000);
      const actualExpiry = status.lockoutExpiresAt!;

      // Allow 1 second tolerance
      expect(Math.abs(actualExpiry.getTime() - expectedExpiry.getTime())).toBeLessThan(1000);
    });

    it('should support progressive lockout duration', async () => {
      const customService = new AccountLockoutService({
        lockoutDurationMinutes: 15,
        progressiveLockout: true,
      });

      const userWithManyAttempts = {
        ...mockUser,
        failedLoginAttempts: 9, // Will trigger progressive lockout
        lastFailedLogin: new Date().toISOString(),
      };

      // Mock select chain to return user
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([userWithManyAttempts]),
        }),
      } as any);

      // Mock update chain
      vi.mocked(db.update).mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined),
        }),
      } as any);

      const beforeLockout = new Date();
      const status = await customService.recordFailedAttempt(1, 'test@example.com', '127.0.0.1');

      // Progressive lockout should increase duration
      const minExpectedExpiry = new Date(beforeLockout.getTime() + 15 * 60 * 1000);
      expect(status.lockoutExpiresAt!.getTime()).toBeGreaterThan(minExpectedExpiry.getTime());
    });

    it('should reset attempts after configured time period', async () => {
      const customService = new AccountLockoutService({
        resetAttemptsAfterMinutes: 30,
      });

      // Mock user with old failed attempt
      const oldAttemptTime = new Date(Date.now() - 31 * 60 * 1000); // 31 minutes ago
      const userWithOldAttempts = {
        ...mockUser,
        failedLoginAttempts: 3,
        lastFailedLogin: oldAttemptTime.toISOString(),
      };

      // Mock select chain to return user
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([userWithOldAttempts]),
        }),
      } as any);

      // Mock update chain
      vi.mocked(db.update).mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined),
        }),
      } as any);

      const status = await customService.recordFailedAttempt(1, 'test@example.com', '127.0.0.1');

      // Should have reset to 1 attempt (the current one)
      expect(status.remainingAttempts).toBe(4);
    });

    it('should allow getting and updating configuration', () => {
      const config = service.getConfig();
      expect(config.maxFailedAttempts).toBe(5);

      service.updateConfig({ maxFailedAttempts: 10 });
      const updatedConfig = service.getConfig();
      expect(updatedConfig.maxFailedAttempts).toBe(10);
    });
  });

  describe('Account Status Checks', () => {
    it('should correctly report locked status', async () => {
      const lockedUser = {
        ...mockUser,
        accountLocked: true,
        lockoutExpires: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
        failedLoginAttempts: 5,
      };

      // Mock select chain to return locked user
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([lockedUser]),
        }),
      } as any);

      const isLocked = await service.isAccountLocked(1);
      expect(isLocked).toBe(true);
    });

    it('should correctly report unlocked status', async () => {
      // Mock select chain to return user
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([mockUser]),
        }),
      } as any);

      const isLocked = await service.isAccountLocked(1);
      expect(isLocked).toBe(false);
    });

    it('should get detailed account lockout status', async () => {
      const userWithAttempts = {
        ...mockUser,
        failedLoginAttempts: 2,
        lastFailedLogin: new Date().toISOString(),
      };

      // Mock multiple select calls
      let callCount = 0;
      vi.mocked(db.select).mockImplementation(() => ({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(callCount++ === 0 ? [userWithAttempts] : [userWithAttempts]),
        }),
      } as any));

      const status = await service.getAccountLockoutStatus(1);

      expect(status.isLocked).toBe(false);
      expect(status.remainingAttempts).toBe(3);
      expect(status.lockoutExpiresAt).toBeNull();
    });

    it('should handle non-existent user gracefully', async () => {
      // Mock select chain to return empty array
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      } as any);

      const isLocked = await service.isAccountLocked(999);
      expect(isLocked).toBe(false);
    });
  });

  describe('Successful Login Handling', () => {
    it('should reset failed attempts on successful login', async () => {
      const mockSet = vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      });

      // Mock update chain
      vi.mocked(db.update).mockReturnValue({
        set: mockSet,
      } as any);

      await service.recordSuccessfulLogin(1);

      expect(mockSet).toHaveBeenCalledWith(
        expect.objectContaining({
          failedLoginAttempts: 0,
          accountLocked: false,
          lockoutExpires: null,
        })
      );
    });

    it('should clear lockout on successful login', async () => {
      const mockSet = vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      });

      // Mock update chain
      vi.mocked(db.update).mockReturnValue({
        set: mockSet,
      } as any);

      await service.recordSuccessfulLogin(1);

      expect(mockSet).toHaveBeenCalledWith(
        expect.objectContaining({
          accountLocked: false,
          lockoutExpires: null,
        })
      );
    });
  });
});
