/**
 * Mock Factory
 * 
 * Centralized factory for creating test mocks with consistent patterns.
 * This ensures all tests use the same mocking strategy and makes it easy
 * to update mocks across the entire test suite.
 */

import { vi } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import { createDatabaseMock } from '../helpers/databaseMock';
import type { User } from '../../../shared/types';

/**
 * Mock Factory Interface
 * Defines all mock creation methods available
 */
export interface MockFactory {
  createMockDb(): MockDatabase;
  createMockUser(overrides?: Partial<User>): User;
  createMockRequest(overrides?: Partial<Request>): Partial<Request>;
  createMockResponse(): Partial<Response>;
  createMockNext(): NextFunction;
  resetAllMocks(): void;
}

/**
 * Mock Database Interface
 * Matches Drizzle ORM query builder pattern
 */
export interface MockDatabase {
  select: ReturnType<typeof vi.fn>;
  insert: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
  from?: ReturnType<typeof vi.fn>;
  where?: ReturnType<typeof vi.fn>;
  returning?: ReturnType<typeof vi.fn>;
  orderBy?: ReturnType<typeof vi.fn>;
  limit?: ReturnType<typeof vi.fn>;
  groupBy?: ReturnType<typeof vi.fn>;
  leftJoin?: ReturnType<typeof vi.fn>;
  innerJoin?: ReturnType<typeof vi.fn>;
  query?: any;
}

/**
 * Test Mock Factory Implementation
 * 
 * Usage:
 * ```typescript
 * const factory = new TestMockFactory();
 * const mockDb = factory.createMockDb();
 * const mockUser = factory.createMockUser({ email: 'test@example.com' });
 * ```
 */
export class TestMockFactory implements MockFactory {
  private mocks: Map<string, any> = new Map();
  private mockCounter = 0;

  /**
   * Create a mock database instance
   * Returns a Drizzle ORM-compatible mock
   * 
   * @param config - Optional configuration for mock responses
   * @returns Mock database instance
   */
  createMockDb(config?: {
    selectResult?: any[];
    insertResult?: any[];
    updateResult?: any[];
    deleteResult?: any[];
  }): MockDatabase {
    const mockDb = createDatabaseMock();

    // Apply configuration if provided
    if (config) {
      if (config.selectResult !== undefined) {
        this.configureMockDbSelect(mockDb, config.selectResult);
      }
      if (config.insertResult !== undefined) {
        this.configureMockDbInsert(mockDb, config.insertResult);
      }
      if (config.updateResult !== undefined) {
        this.configureMockDbUpdate(mockDb, config.updateResult);
      }
      if (config.deleteResult !== undefined) {
        this.configureMockDbDelete(mockDb, config.deleteResult);
      }
    }

    this.mocks.set('db', mockDb);
    return mockDb;
  }

  /**
   * Configure mock database select to return specific results
   */
  private configureMockDbSelect(mockDb: MockDatabase, result: any[]): void {
    mockDb.select = vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(result),
        orderBy: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue(result),
        }),
        limit: vi.fn().mockResolvedValue(result),
        leftJoin: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(result),
        }),
      }),
    });
  }

  /**
   * Configure mock database insert to return specific results
   */
  private configureMockDbInsert(mockDb: MockDatabase, result: any[]): void {
    mockDb.insert = vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue(result),
      }),
    });
  }

  /**
   * Configure mock database update to return specific results
   */
  private configureMockDbUpdate(mockDb: MockDatabase, result: any[]): void {
    mockDb.update = vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue(result),
        }),
      }),
    });
  }

  /**
   * Configure mock database delete to return specific results
   */
  private configureMockDbDelete(mockDb: MockDatabase, result: any[]): void {
    mockDb.delete = vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue(result),
      }),
    });
  }

  /**
   * Create a mock user with default values
   * 
   * @param overrides - Partial user object to override defaults
   * @returns Complete user object with defaults
   */
  createMockUser(overrides?: Partial<User>): User {
    this.mockCounter++;

    const defaultUser: User = {
      id: this.mockCounter,
      email: `test-${this.mockCounter}@example.com`,
      name: `testuser${this.mockCounter}`,
      password: '$2b$10$hashedpassword', // Mock hashed password
      plan: 'free',
      searchCount: 0,
      lastResetDate: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      stripeCustomerId: null,
      stripeSubscriptionId: null,
      subscriptionTier: 'free',
      subscriptionStatus: 'inactive',
      subscriptionPeriodEnd: null,
      trialUsed: false,
      trialExpiration: null,
      preferences: {},
      isActive: true,
      avatar: null,
      provider: 'local',
      providerId: null,
      firstName: null,
      lastName: null,
      profileImageUrl: null,
      failedLoginAttempts: 0,
      lastFailedLogin: null,
      accountLocked: false,
      lockoutExpires: null,
      analyticsOptOut: false,
      lastPasswordChange: new Date().toISOString(),
      passwordExpiryWarningSent: false,
      forcePasswordChange: false,
      passwordStrengthScore: 0,
      ...overrides,
    };

    return defaultUser;
  }

  /**
   * Create a mock Express Request object
   * 
   * @param overrides - Partial request object to override defaults
   * @returns Mock request object
   */
  createMockRequest(overrides?: Partial<Request>): Partial<Request> {
    const mockReq: Partial<Request> = {
      body: {},
      params: {},
      query: {},
      headers: {},
      method: 'GET',
      url: '/test',
      path: '/test',
      ip: '127.0.0.1',
      socket: { remoteAddress: '127.0.0.1' } as any,
      connection: { remoteAddress: '127.0.0.1' } as any,
      get: ((header: string) => {
        if (header === 'set-cookie') {
          const value = mockReq.headers?.[header.toLowerCase()];
          return Array.isArray(value) ? value : undefined;
        }
        const value = mockReq.headers?.[header.toLowerCase()];
        return Array.isArray(value) ? value[0] : value;
      }) as any,
      ...overrides,
    };

    this.mocks.set(`req-${this.mockCounter++}`, mockReq);
    return mockReq;
  }

  /**
   * Create a mock Express Response object
   * 
   * @returns Mock response object with chainable methods
   */
  createMockResponse(): Partial<Response> {
    const mockRes: Partial<Response> = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
      send: vi.fn().mockReturnThis(),
      sendStatus: vi.fn().mockReturnThis(),
      set: vi.fn().mockReturnThis(),
      setHeader: vi.fn().mockReturnThis(),
      cookie: vi.fn().mockReturnThis(),
      clearCookie: vi.fn().mockReturnThis(),
      redirect: vi.fn().mockReturnThis(),
      locals: {},
    };

    this.mocks.set(`res-${this.mockCounter++}`, mockRes);
    return mockRes;
  }

  /**
   * Create a mock Express NextFunction
   * 
   * @returns Mock next function
   */
  createMockNext(): NextFunction {
    const mockNext = vi.fn() as NextFunction;
    this.mocks.set(`next-${this.mockCounter++}`, mockNext);
    return mockNext;
  }

  /**
   * Reset all mocks created by this factory
   * Call this in afterEach() to ensure test isolation
   */
  resetAllMocks(): void {
    this.mocks.forEach((mock) => {
      if (typeof mock === 'function' && 'mockReset' in mock) {
        (mock as any).mockReset();
      } else if (typeof mock === 'object') {
        Object.values(mock).forEach((value) => {
          if (typeof value === 'function' && 'mockReset' in value) {
            (value as any).mockReset();
          }
        });
      }
    });
    this.mocks.clear();
    this.mockCounter = 0;
  }

  /**
   * Get a previously created mock by key
   * Useful for debugging or advanced test scenarios
   */
  getMock(key: string): any {
    return this.mocks.get(key);
  }

  /**
   * Get all mocks created by this factory
   * Useful for debugging
   */
  getAllMocks(): Map<string, any> {
    return new Map(this.mocks);
  }

  /**
   * Create a mock search result
   * 
   * @param overrides - Partial search result to override defaults
   * @returns Complete search result object
   */
  createMockSearchResult(overrides?: Partial<any>): any {
    this.mockCounter++;

    return {
      id: this.mockCounter,
      searchId: 1,
      title: `Test Gap ${this.mockCounter}`,
      description: 'Test gap description',
      innovationScore: 75,
      feasibility: 'medium',
      marketPotential: 'medium',
      marketSize: '$100M TAM',
      gapReason: 'Test gap reason',
      category: 'Technology',
      confidenceScore: 80,
      priority: 'medium',
      actionableRecommendations: ['Recommendation 1', 'Recommendation 2'],
      competitorAnalysis: 'Competitor analysis text',
      industryContext: 'Industry context text',
      targetAudience: 'Target audience description',
      keyTrends: ['Trend 1', 'Trend 2'],
      createdAt: new Date().toISOString(),
      ...overrides,
    };
  }

  /**
   * Create a mock search
   * 
   * @param overrides - Partial search to override defaults
   * @returns Complete search object
   */
  createMockSearch(overrides?: Partial<any>): any {
    this.mockCounter++;

    return {
      id: this.mockCounter,
      query: `Test query ${this.mockCounter}`,
      userId: 1,
      status: 'completed',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...overrides,
    };
  }

  /**
   * Create a mock conversation
   * 
   * @param overrides - Partial conversation to override defaults
   * @returns Complete conversation object
   */
  createMockConversation(overrides?: Partial<any>): any {
    this.mockCounter++;

    return {
      id: this.mockCounter,
      searchId: 1,
      userId: 1,
      title: `Test Conversation ${this.mockCounter}`,
      messageCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...overrides,
    };
  }

  /**
   * Create a mock resource
   * 
   * @param overrides - Partial resource to override defaults
   * @returns Complete resource object
   */
  createMockResource(overrides?: Partial<any>): any {
    this.mockCounter++;

    return {
      id: this.mockCounter,
      title: `Test Resource ${this.mockCounter}`,
      description: 'Test resource description',
      url: `https://example.com/resource-${this.mockCounter}`,
      resourceType: 'article',
      category: 'general',
      tags: ['test'],
      isPremium: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...overrides,
    };
  }
}

/**
 * Global factory instance
 * Use this for most tests to ensure consistency
 */
export const mockFactory = new TestMockFactory();

/**
 * Convenience functions that use the global factory
 * These are shortcuts for common operations
 */
export const createMockDb = (config?: Parameters<TestMockFactory['createMockDb']>[0]) => mockFactory.createMockDb(config);
export const createMockUser = (overrides?: Partial<User>) => mockFactory.createMockUser(overrides);
export const createMockRequest = (overrides?: Partial<Request>) => mockFactory.createMockRequest(overrides);
export const createMockResponse = () => mockFactory.createMockResponse();
export const createMockNext = () => mockFactory.createMockNext();
export const createMockSearchResult = (overrides?: Partial<any>) => mockFactory.createMockSearchResult(overrides);
export const createMockSearch = (overrides?: Partial<any>) => mockFactory.createMockSearch(overrides);
export const createMockConversation = (overrides?: Partial<any>) => mockFactory.createMockConversation(overrides);
export const createMockResource = (overrides?: Partial<any>) => mockFactory.createMockResource(overrides);
export const resetAllMocks = () => mockFactory.resetAllMocks();
