import bcrypt from 'bcrypt';
import { db } from './db';
import { users, sessions, type User, type InsertUser } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { passwordSecurityService } from './services/passwordSecurity';
import { passwordHistoryService } from './services/passwordHistory';
import { accountLockoutService } from './services/accountLockout';

export class AuthService {
  async hashPassword(password: string): Promise<string> {
    // Use the enhanced password security service
    return passwordSecurityService.hashPassword(password);
  }

  async verifyPassword(password: string, hash: string): Promise<boolean> {
    return passwordSecurityService.verifyPassword(password, hash);
  }

  async createUser(userData: InsertUser): Promise<User> {
    let hashedPassword = null;
    let passwordStrengthScore = 0;

    if (userData.password) {
      // Validate password strength before hashing
      const strengthResult = passwordSecurityService.validatePasswordStrength(userData.password);
      if (!strengthResult.isValid) {
        throw new Error(`Password does not meet security requirements: ${strengthResult.feedback.join(', ')}`);
      }
      
      hashedPassword = await this.hashPassword(userData.password);
      passwordStrengthScore = strengthResult.score;
    }
    
    const [user] = await db.insert(users).values({
      ...userData,
      password: hashedPassword,
      passwordStrengthScore,
      lastPasswordChange: new Date().toISOString(),
    }).returning();
    
    return user;
  }

  async createOAuthUser(userData: {
    email: string;
    name?: string;
    avatar?: string;
    provider: string;
    providerId: string;
  }): Promise<User> {
    const [user] = await db.insert(users).values({
      email: userData.email,
      name: userData.name,
      avatar: userData.avatar,
      provider: userData.provider,
      providerId: userData.providerId,
      password: null, // OAuth users don't have passwords
    }).returning();
    
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async getUserById(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async validateUser(email: string, password: string, ipAddress?: string): Promise<User | null> {
    const user = await this.getUserByEmail(email);
    if (!user || !user.password) return null;
    
    // Check if account is locked
    const isLocked = await accountLockoutService.isAccountLocked(user.id);
    if (isLocked) {
      return null; // Don't reveal that account is locked in this method
    }
    
    const isValid = await this.verifyPassword(password, user.password);
    if (!isValid) {
      // Record failed attempt if IP address is provided
      if (ipAddress) {
        await accountLockoutService.recordFailedAttempt(user.id, email, ipAddress);
      }
      return null;
    }
    
    // Record successful login to reset failed attempts
    await accountLockoutService.recordSuccessfulLogin(user.id);
    
    return user;
  }

  async createSession(userId: number): Promise<string> {
    const sessionId = this.generateSessionId();
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
    
    await db.insert(sessions).values({
      sid: sessionId,
      sess: { userId },
      expire: expiresAt.toISOString(),
    });
    
    return sessionId;
  }

  async getSessionUser(sessionId: string): Promise<User | null> {
    const [session] = await db.select().from(sessions).where(eq(sessions.sid, sessionId));
    
    if (!session || new Date(session.expire) < new Date()) {
      if (session) {
        await this.deleteSession(sessionId);
      }
      return null;
    }
    
    const sessionData = session.sess as { userId: number };
    const user = await this.getUserById(sessionData.userId);
    return user || null;
  }

  async deleteSession(sessionId: string): Promise<void> {
    await db.delete(sessions).where(eq(sessions.sid, sessionId));
  }

  async updateUserPlan(userId: number, plan: string, subscriptionData?: any): Promise<void> {
    await db.update(users).set({
      plan,
      subscriptionStatus: subscriptionData?.status || 'active',
      stripeSubscriptionId: subscriptionData?.id,
      stripeCustomerId: subscriptionData?.customerId,
      updatedAt: new Date().toISOString(),
    }).where(eq(users.id, userId));
  }

  async incrementSearchCount(userId: number): Promise<void> {
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (user) {
      await db.update(users).set({
        searchCount: user.searchCount + 1,
      }).where(eq(users.id, userId));
    }
  }

  async resetSearchCount(userId: number): Promise<void> {
    await db.update(users).set({
      searchCount: 0,
      lastResetDate: new Date().toISOString(),
    }).where(eq(users.id, userId));
  }

  async updateUserProfile(userId: number, updates: Partial<User>): Promise<User | undefined> {
    const [updatedUser] = await db.update(users).set({
      ...updates,
      updatedAt: new Date().toISOString(),
    }).where(eq(users.id, userId)).returning();
    
    return updatedUser;
  }

  async canUserSearch(userId: number): Promise<boolean> {
    const user = await this.getUserById(userId);
    if (!user) return false;
    
    if (user.plan === 'pro' || user.plan === 'enterprise') {
      return true; // Unlimited searches
    }
    
    // Check if it's a new month for free users
    const lastReset = new Date(user.lastResetDate);
    const now = new Date();
    const isNewMonth = now.getMonth() !== lastReset.getMonth() || now.getFullYear() !== lastReset.getFullYear();
    
    if (isNewMonth) {
      await this.resetSearchCount(userId);
      return true;
    }
    
    return user.searchCount < 5; // Free tier limit
  }

  /**
   * Change user password with security validation
   */
  async changePassword(
    userId: number, 
    currentPassword: string, 
    newPassword: string
  ): Promise<{ success: boolean; errors: string[] }> {
    const user = await this.getUserById(userId);
    if (!user || !user.password) {
      return { success: false, errors: ['User not found or no password set'] };
    }

    // Get previous password hashes for validation
    const previousPasswords = await passwordHistoryService.getRecentPasswordHashes(userId);

    // Validate password change
    const validation = await passwordSecurityService.validatePasswordChange(
      currentPassword,
      newPassword,
      user.password,
      previousPasswords
    );

    if (!validation.isValid) {
      return { success: false, errors: validation.errors };
    }

    // Add current password to history before changing
    await passwordHistoryService.addPasswordToHistory(userId, user.password, user.password);

    // Hash new password and calculate strength score
    const newPasswordHash = await this.hashPassword(newPassword);
    const strengthResult = passwordSecurityService.validatePasswordStrength(newPassword);

    // Update user with new password
    await db.update(users).set({
      password: newPasswordHash,
      passwordStrengthScore: strengthResult.score,
      lastPasswordChange: new Date().toISOString(),
      forcePasswordChange: false,
      passwordExpiryWarningSent: false,
      updatedAt: new Date().toISOString()
    }).where(eq(users.id, userId));

    return { success: true, errors: [] };
  }

  /**
   * Check if user needs to change password
   */
  async shouldForcePasswordChange(userId: number): Promise<boolean> {
    const user = await this.getUserById(userId);
    if (!user) return false;

    // Check force password change flag
    if (user.forcePasswordChange) return true;

    // Check password expiration
    if (user.lastPasswordChange) {
      const lastChange = new Date(user.lastPasswordChange);
      return passwordSecurityService.isPasswordExpired(lastChange);
    }

    return false;
  }

  /**
   * Get password security status for a user
   */
  async getPasswordSecurityStatus(userId: number): Promise<{
    strengthScore: number;
    lastChanged: Date | null;
    isExpired: boolean;
    daysUntilExpiry: number;
    forceChange: boolean;
  }> {
    const user = await this.getUserById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const lastChanged = user.lastPasswordChange ? new Date(user.lastPasswordChange) : null;
    const isExpired = lastChanged ? passwordSecurityService.isPasswordExpired(lastChanged) : false;
    
    let daysUntilExpiry = 0;
    if (lastChanged) {
      const expiryDate = new Date(lastChanged.getTime() + (90 * 24 * 60 * 60 * 1000)); // 90 days
      const now = new Date();
      daysUntilExpiry = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    }

    return {
      strengthScore: user.passwordStrengthScore || 0,
      lastChanged,
      isExpired,
      daysUntilExpiry: Math.max(0, daysUntilExpiry),
      forceChange: user.forcePasswordChange || false
    };
  }

  private generateSessionId(): string {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  }
}

export const authService = new AuthService();