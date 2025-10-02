import { db } from '../db';
import { users } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { securityEventHandler } from './securityEventHandler';

export interface LockoutConfig {
  maxFailedAttempts: number;
  lockoutDurationMinutes: number;
  progressiveLockout: boolean;
  resetAttemptsAfterMinutes: number;
}

export interface AccountLockoutStatus {
  isLocked: boolean;
  remainingAttempts: number;
  lockoutExpiresAt: Date | null;
  nextAttemptAllowedAt: Date | null;
}

export class AccountLockoutService {
  private static readonly DEFAULT_CONFIG: LockoutConfig = {
    maxFailedAttempts: 5,
    lockoutDurationMinutes: 15,
    progressiveLockout: true,
    resetAttemptsAfterMinutes: 60
  };

  private config: LockoutConfig;

  constructor(config: Partial<LockoutConfig> = {}) {
    this.config = { ...AccountLockoutService.DEFAULT_CONFIG, ...config };
  }

  /**
   * Record a failed login attempt and potentially lock the account
   */
  async recordFailedAttempt(userId: number, email: string, ipAddress: string): Promise<AccountLockoutStatus> {
    const user = await this.getUserById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const now = new Date();
    let failedAttempts = user.failedLoginAttempts || 0;
    let lastFailedLogin = user.lastFailedLogin ? new Date(user.lastFailedLogin) : null;

    // Reset attempts if enough time has passed since last failed attempt
    if (lastFailedLogin && this.shouldResetAttempts(lastFailedLogin, now)) {
      failedAttempts = 0;
    }

    failedAttempts += 1;

    // Determine if account should be locked
    const shouldLock = failedAttempts >= this.config.maxFailedAttempts;
    let lockoutExpires: Date | null = null;

    if (shouldLock) {
      const lockoutDuration = this.calculateLockoutDuration(failedAttempts);
      lockoutExpires = new Date(now.getTime() + lockoutDuration * 60 * 1000);

      // Log security event for account lockout
      const { securityLogger } = await import('./securityLogger');
      await securityLogger.logSecurityEvent(
        userId,
        'ACCOUNT_LOCKED',
        'account_lockout',
        true,
        {
          userEmail: email,
          ipAddress,
          failedAttempts,
          lockoutDuration,
          lockoutExpires: lockoutExpires.toISOString()
        },
        'warning'
      );
    }

    // Update user record
    await db.update(users).set({
      failedLoginAttempts: failedAttempts,
      lastFailedLogin: now.toISOString(),
      accountLocked: shouldLock,
      lockoutExpires: lockoutExpires?.toISOString() || null,
      updatedAt: now.toISOString()
    }).where(eq(users.id, userId));

    return this.getAccountStatus(failedAttempts, shouldLock, lockoutExpires);
  }

  /**
   * Record a successful login and reset failed attempts
   */
  async recordSuccessfulLogin(userId: number): Promise<void> {
    const now = new Date();
    
    await db.update(users).set({
      failedLoginAttempts: 0,
      lastFailedLogin: null,
      accountLocked: false,
      lockoutExpires: null,
      updatedAt: now.toISOString()
    }).where(eq(users.id, userId));
  }

  /**
   * Check if an account is currently locked
   */
  async isAccountLocked(userId: number): Promise<boolean> {
    const user = await this.getUserById(userId);
    if (!user) {
      return false;
    }

    // If not marked as locked, it's not locked
    if (!user.accountLocked) {
      return false;
    }

    // Check if lockout has expired
    if (user.lockoutExpires) {
      const lockoutExpires = new Date(user.lockoutExpires);
      const now = new Date();
      
      if (now >= lockoutExpires) {
        // Lockout has expired, unlock the account
        await this.unlockAccount(userId);
        return false;
      }
    }

    return true;
  }

  /**
   * Get detailed account lockout status
   */
  async getAccountLockoutStatus(userId: number): Promise<AccountLockoutStatus> {
    const user = await this.getUserById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const isLocked = await this.isAccountLocked(userId);
    const failedAttempts = user.failedLoginAttempts || 0;
    const remainingAttempts = Math.max(0, this.config.maxFailedAttempts - failedAttempts);
    const lockoutExpires = user.lockoutExpires ? new Date(user.lockoutExpires) : null;

    return this.getAccountStatus(failedAttempts, isLocked, lockoutExpires);
  }

  /**
   * Manually unlock an account (admin function)
   */
  async unlockAccount(userId: number, unlockedBy?: string): Promise<void> {
    const now = new Date();
    
    await db.update(users).set({
      failedLoginAttempts: 0,
      lastFailedLogin: null,
      accountLocked: false,
      lockoutExpires: null,
      updatedAt: now.toISOString()
    }).where(eq(users.id, userId));

    // Log security event for manual unlock
    if (unlockedBy) {
      const user = await this.getUserById(userId);
      if (user) {
        const { securityLogger } = await import('./securityLogger');
        await securityLogger.logSecurityEvent(
          userId,
          'ACCOUNT_UNLOCKED',
          'manual_unlock',
          true,
          {
            userEmail: user.email,
            unlockedBy,
            timestamp: now.toISOString()
          },
          'info'
        );
      }
    }
  }

  /**
   * Get lockout configuration
   */
  getConfig(): LockoutConfig {
    return { ...this.config };
  }

  /**
   * Update lockout configuration
   */
  updateConfig(newConfig: Partial<LockoutConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  private async getUserById(userId: number) {
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    return user;
  }

  private shouldResetAttempts(lastFailedLogin: Date, now: Date): boolean {
    const minutesSinceLastAttempt = (now.getTime() - lastFailedLogin.getTime()) / (1000 * 60);
    return minutesSinceLastAttempt >= this.config.resetAttemptsAfterMinutes;
  }

  private calculateLockoutDuration(failedAttempts: number): number {
    if (!this.config.progressiveLockout) {
      return this.config.lockoutDurationMinutes;
    }

    // Progressive lockout: increase duration with more attempts
    const baseMinutes = this.config.lockoutDurationMinutes;
    const multiplier = Math.min(failedAttempts - this.config.maxFailedAttempts + 1, 8); // Cap at 8x
    return baseMinutes * multiplier;
  }

  private getAccountStatus(
    failedAttempts: number,
    isLocked: boolean,
    lockoutExpires: Date | null
  ): AccountLockoutStatus {
    const remainingAttempts = Math.max(0, this.config.maxFailedAttempts - failedAttempts);
    
    // Calculate next attempt allowed time (progressive delay)
    let nextAttemptAllowedAt: Date | null = null;
    if (failedAttempts > 0 && !isLocked) {
      const delayMinutes = Math.min(failedAttempts * 2, 10); // Max 10 minute delay
      nextAttemptAllowedAt = new Date(Date.now() + delayMinutes * 60 * 1000);
    }

    return {
      isLocked,
      remainingAttempts,
      lockoutExpiresAt: lockoutExpires,
      nextAttemptAllowedAt
    };
  }
}

export const accountLockoutService = new AccountLockoutService();