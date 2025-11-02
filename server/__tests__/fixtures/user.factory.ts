/**
 * UserFactory - Test Data Factory for Users
 * 
 * Provides methods to create, persist, and cleanup test users for E2E testing.
 * Supports different roles and subscription plans.
 * 
 * Requirements: 8.1, 8.2, 8.3, 8.4, 8.5
 * 
 * Example:
 * ```typescript
 * const user = UserFactory.create({ plan: 'pro' });
 * await UserFactory.persist(user);
 * // ... run tests
 * await UserFactory.cleanup(user.id);
 * ```
 */

import { db } from '../../db';
import { users } from '@shared/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcrypt';

export interface TestUser {
  id?: number;
  email: string;
  password: string;
  passwordHash?: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  plan: 'free' | 'pro' | 'enterprise';
  subscriptionTier?: 'free' | 'pro' | 'business' | 'enterprise';
  subscriptionStatus?: string;
  searchCount?: number;
  isActive?: boolean;
  provider?: string;
  providerId?: string;
  avatar?: string;
  profileImageUrl?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export class UserFactory {
  private static counter = 0;

  /**
   * Create a test user with defaults and optional overrides
   * @param overrides - Partial user data to override defaults
   * @returns Test user object
   */
  static create(overrides: Partial<TestUser> = {}): TestUser {
    const timestamp = Date.now();
    const counter = ++this.counter;
    const random = Math.random().toString(36).substring(2, 8);
    
    const defaultPassword = 'Test123!@#';
    
    return {
      email: `test-${timestamp}-${counter}-${random}@example.com`,
      password: defaultPassword,
      name: `Test User ${counter}`,
      firstName: 'Test',
      lastName: `User ${counter}`,
      plan: 'free',
      subscriptionTier: 'free',
      subscriptionStatus: 'inactive',
      searchCount: 0,
      isActive: true,
      provider: 'local',
      ...overrides,
    };
  }

  /**
   * Create a free tier user
   * @param overrides - Optional overrides
   * @returns Free tier test user
   */
  static createFreeUser(overrides: Partial<TestUser> = {}): TestUser {
    return this.create({
      plan: 'free',
      subscriptionTier: 'free',
      searchCount: 0,
      ...overrides,
    });
  }

  /**
   * Create a pro tier user
   * @param overrides - Optional overrides
   * @returns Pro tier test user
   */
  static createProUser(overrides: Partial<TestUser> = {}): TestUser {
    return this.create({
      plan: 'pro',
      subscriptionTier: 'pro',
      subscriptionStatus: 'active',
      ...overrides,
    });
  }

  /**
   * Create an enterprise tier user
   * @param overrides - Optional overrides
   * @returns Enterprise tier test user
   */
  static createEnterpriseUser(overrides: Partial<TestUser> = {}): TestUser {
    return this.create({
      plan: 'enterprise',
      subscriptionTier: 'enterprise',
      subscriptionStatus: 'active',
      ...overrides,
    });
  }

  /**
   * Create an admin user
   * @param overrides - Optional overrides
   * @returns Admin test user
   */
  static createAdminUser(overrides: Partial<TestUser> = {}): TestUser {
    return this.create({
      plan: 'enterprise',
      subscriptionTier: 'enterprise',
      subscriptionStatus: 'active',
      name: 'Admin User',
      firstName: 'Admin',
      lastName: 'User',
      ...overrides,
    });
  }

  /**
   * Create a user with OAuth provider
   * @param provider - OAuth provider (google, github, etc.)
   * @param overrides - Optional overrides
   * @returns OAuth test user
   */
  static createOAuthUser(provider: string, overrides: Partial<TestUser> = {}): TestUser {
    const counter = ++this.counter;
    return this.create({
      provider,
      providerId: `${provider}-${Date.now()}-${counter}`,
      password: '', // OAuth users don't have passwords
      ...overrides,
    });
  }

  /**
   * Persist a test user to the database
   * @param user - Test user to persist
   * @returns Persisted user with database ID
   */
  static async persist(user: TestUser): Promise<TestUser> {
    try {
      // Hash password if provided and not already hashed
      let passwordHash = user.passwordHash;
      if (user.password && !passwordHash) {
        passwordHash = await bcrypt.hash(user.password, 10);
      }

      const insertData: any = {
        email: user.email,
        password: passwordHash || null,
        name: user.name,
        firstName: user.firstName,
        lastName: user.lastName,
        plan: user.plan,
        subscriptionTier: user.subscriptionTier || user.plan,
        subscriptionStatus: user.subscriptionStatus || 'inactive',
        searchCount: user.searchCount || 0,
        isActive: user.isActive !== undefined ? user.isActive : true,
        provider: user.provider || 'local',
        providerId: user.providerId || null,
        avatar: user.avatar || null,
        profileImageUrl: user.profileImageUrl || null,
        lastResetDate: new Date(),
        createdAt: user.createdAt || new Date(),
        updatedAt: user.updatedAt || new Date(),
      };

      const result = await db.insert(users).values(insertData).returning();
      
      return {
        ...user,
        id: result[0].id,
        passwordHash,
      };
    } catch (error) {
      console.error('Failed to persist test user:', error);
      throw error;
    }
  }

  /**
   * Create and persist a test user in one step
   * @param overrides - Optional overrides
   * @returns Persisted test user
   */
  static async createAndPersist(overrides: Partial<TestUser> = {}): Promise<TestUser> {
    const user = this.create(overrides);
    return await this.persist(user);
  }

  /**
   * Create and persist a free tier user
   * @param overrides - Optional overrides
   * @returns Persisted free tier user
   */
  static async createAndPersistFreeUser(overrides: Partial<TestUser> = {}): Promise<TestUser> {
    const user = this.createFreeUser(overrides);
    return await this.persist(user);
  }

  /**
   * Create and persist a pro tier user
   * @param overrides - Optional overrides
   * @returns Persisted pro tier user
   */
  static async createAndPersistProUser(overrides: Partial<TestUser> = {}): Promise<TestUser> {
    const user = this.createProUser(overrides);
    return await this.persist(user);
  }

  /**
   * Create and persist an enterprise tier user
   * @param overrides - Optional overrides
   * @returns Persisted enterprise tier user
   */
  static async createAndPersistEnterpriseUser(overrides: Partial<TestUser> = {}): Promise<TestUser> {
    const user = this.createEnterpriseUser(overrides);
    return await this.persist(user);
  }

  /**
   * Cleanup a test user from the database
   * @param userId - ID of user to delete
   */
  static async cleanup(userId: number): Promise<void> {
    try {
      if (!userId) {
        console.warn('No user ID provided for cleanup');
        return;
      }

      await db.delete(users).where(eq(users.id, userId));
    } catch (error) {
      console.error('Failed to cleanup test user:', error);
      throw error;
    }
  }

  /**
   * Cleanup multiple test users
   * @param userIds - Array of user IDs to delete
   */
  static async cleanupMany(userIds: number[]): Promise<void> {
    try {
      for (const userId of userIds) {
        await this.cleanup(userId);
      }
    } catch (error) {
      console.error('Failed to cleanup test users:', error);
      throw error;
    }
  }

  /**
   * Cleanup all test users (users with email matching test pattern)
   * WARNING: Use with caution, only in test environments
   */
  static async cleanupAll(): Promise<void> {
    try {
      // Only cleanup users with test email pattern
      const testUsers = await db.query.users.findMany({
        where: (users, { like }) => like(users.email, 'test-%@example.com'),
      });

      const userIds = testUsers.map(u => u.id);
      await this.cleanupMany(userIds);
    } catch (error) {
      console.error('Failed to cleanup all test users:', error);
      throw error;
    }
  }

  /**
   * Find a test user by email
   * @param email - User email
   * @returns User or null
   */
  static async findByEmail(email: string): Promise<TestUser | null> {
    try {
      const result = await db.query.users.findFirst({
        where: (users, { eq }) => eq(users.email, email),
      });

      if (!result) return null;

      return {
        id: result.id,
        email: result.email,
        password: '', // Don't return password
        passwordHash: result.password || undefined,
        name: result.name || undefined,
        firstName: result.firstName || undefined,
        lastName: result.lastName || undefined,
        plan: result.plan as 'free' | 'pro' | 'enterprise',
        subscriptionTier: result.subscriptionTier as 'free' | 'pro' | 'business' | 'enterprise',
        subscriptionStatus: result.subscriptionStatus || undefined,
        searchCount: result.searchCount,
        isActive: result.isActive,
        provider: result.provider,
        providerId: result.providerId || undefined,
        avatar: result.avatar || undefined,
        profileImageUrl: result.profileImageUrl || undefined,
        createdAt: result.createdAt ? new Date(result.createdAt) : undefined,
        updatedAt: result.updatedAt ? new Date(result.updatedAt) : undefined,
      };
    } catch (error) {
      console.error('Failed to find user by email:', error);
      return null;
    }
  }

  /**
   * Update a test user's search count
   * @param userId - User ID
   * @param count - New search count
   */
  static async updateSearchCount(userId: number, count: number): Promise<void> {
    try {
      await db.update(users)
        .set({ searchCount: count })
        .where(eq(users.id, userId));
    } catch (error) {
      console.error('Failed to update search count:', error);
      throw error;
    }
  }

  /**
   * Update a test user's subscription
   * @param userId - User ID
   * @param plan - New plan
   * @param status - New status
   */
  static async updateSubscription(
    userId: number,
    plan: 'free' | 'pro' | 'enterprise',
    status: string = 'active'
  ): Promise<void> {
    try {
      await db.update(users)
        .set({
          plan,
          subscriptionTier: plan,
          subscriptionStatus: status,
        })
        .where(eq(users.id, userId));
    } catch (error) {
      console.error('Failed to update subscription:', error);
      throw error;
    }
  }
}
