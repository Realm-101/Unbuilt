import { db } from '../db';
import { passwordHistory, users, type PasswordHistory, type InsertPasswordHistory } from '@shared/schema';
import { eq, desc, and } from 'drizzle-orm';

export class PasswordHistoryService {
  private static readonly MAX_HISTORY_COUNT = 5; // Keep last 5 passwords

  /**
   * Add a password to user's history when they change it
   */
  async addPasswordToHistory(userId: number, passwordHash: string, previousPasswordHash?: string): Promise<void> {
    const now = new Date();

    // If there's a previous password, add it to history
    if (previousPasswordHash) {
      // Get the user's last password change date
      const [user] = await db.select({
        lastPasswordChange: users.lastPasswordChange
      }).from(users).where(eq(users.id, userId));

      const createdAt = user?.lastPasswordChange ? new Date(user.lastPasswordChange) : now;

      await db.insert(passwordHistory).values({
        userId,
        passwordHash: previousPasswordHash,
        createdAt: createdAt.toISOString(),
        replacedAt: now.toISOString()
      });
    }

    // Clean up old password history (keep only the most recent ones)
    await this.cleanupPasswordHistory(userId);
  }

  /**
   * Get user's password history (most recent first)
   */
  async getPasswordHistory(userId: number, limit: number = PasswordHistoryService.MAX_HISTORY_COUNT): Promise<PasswordHistory[]> {
    return await db.select()
      .from(passwordHistory)
      .where(eq(passwordHistory.userId, userId))
      .orderBy(desc(passwordHistory.createdAt))
      .limit(limit);
  }

  /**
   * Get password hashes for validation (to prevent reuse)
   */
  async getRecentPasswordHashes(userId: number, count: number = PasswordHistoryService.MAX_HISTORY_COUNT): Promise<string[]> {
    const history = await this.getPasswordHistory(userId, count);
    return history.map(entry => entry.passwordHash);
  }

  /**
   * Check if a password hash exists in user's history
   */
  async isPasswordInHistory(userId: number, passwordHash: string): Promise<boolean> {
    const [result] = await db.select({ count: passwordHistory.id })
      .from(passwordHistory)
      .where(and(
        eq(passwordHistory.userId, userId),
        eq(passwordHistory.passwordHash, passwordHash)
      ))
      .limit(1);

    return !!result;
  }

  /**
   * Clean up old password history entries, keeping only the most recent ones
   */
  async cleanupPasswordHistory(userId: number): Promise<number> {
    // Get all password history entries for the user, ordered by creation date (newest first)
    const allHistory = await db.select({ id: passwordHistory.id })
      .from(passwordHistory)
      .where(eq(passwordHistory.userId, userId))
      .orderBy(desc(passwordHistory.createdAt));

    // If we have more than the max allowed, delete the oldest ones
    if (allHistory.length > PasswordHistoryService.MAX_HISTORY_COUNT) {
      const idsToDelete = allHistory
        .slice(PasswordHistoryService.MAX_HISTORY_COUNT)
        .map(entry => entry.id);

      // Delete old entries
      const deletePromises = idsToDelete.map(id =>
        db.delete(passwordHistory).where(eq(passwordHistory.id, id))
      );

      await Promise.all(deletePromises);
      return idsToDelete.length;
    }

    return 0;
  }

  /**
   * Clean up password history for all users (maintenance function)
   */
  async cleanupAllPasswordHistory(): Promise<{ usersProcessed: number; entriesDeleted: number }> {
    // Get all unique user IDs from password history
    const userIds = await db.selectDistinct({ userId: passwordHistory.userId })
      .from(passwordHistory);

    let totalDeleted = 0;
    
    for (const { userId } of userIds) {
      const deleted = await this.cleanupPasswordHistory(userId);
      totalDeleted += deleted;
    }

    return {
      usersProcessed: userIds.length,
      entriesDeleted: totalDeleted
    };
  }

  /**
   * Delete all password history for a user (when user is deleted)
   */
  async deleteUserPasswordHistory(userId: number): Promise<number> {
    const result = await db.delete(passwordHistory)
      .where(eq(passwordHistory.userId, userId));
    
    return result.rowCount || 0;
  }

  /**
   * Get password history statistics for a user
   */
  async getPasswordHistoryStats(userId: number): Promise<{
    totalEntries: number;
    oldestEntry: Date | null;
    newestEntry: Date | null;
    averagePasswordAge: number; // in days
  }> {
    const history = await this.getPasswordHistory(userId);
    
    if (history.length === 0) {
      return {
        totalEntries: 0,
        oldestEntry: null,
        newestEntry: null,
        averagePasswordAge: 0
      };
    }

    const dates = history.map(entry => new Date(entry.createdAt));
    const oldestEntry = new Date(Math.min(...dates.map(d => d.getTime())));
    const newestEntry = new Date(Math.max(...dates.map(d => d.getTime())));
    
    // Calculate average password age
    const now = new Date();
    const totalAge = dates.reduce((sum, date) => {
      const ageInDays = (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24);
      return sum + ageInDays;
    }, 0);
    
    const averagePasswordAge = totalAge / history.length;

    return {
      totalEntries: history.length,
      oldestEntry,
      newestEntry,
      averagePasswordAge
    };
  }
}

export const passwordHistoryService = new PasswordHistoryService();