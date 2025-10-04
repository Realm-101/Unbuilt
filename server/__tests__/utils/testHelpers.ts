/**
 * Test Helpers
 * 
 * Utility functions for setting up and tearing down test environments.
 * These helpers ensure consistent test setup across the entire test suite.
 */

import { vi } from 'vitest';
import type { User } from '../../../shared/types';
import { mockFactory, type MockDatabase } from '../mocks/factory';

/**
 * Test Context Interface
 * Contains all the common test setup data
 */
export interface TestContext {
  db: MockDatabase;
  user: User;
  token: string;
  cleanup: () => Promise<void>;
}

/**
 * Setup a complete test context with database, user, and token
 * 
 * Usage:
 * ```typescript
 * let context: TestContext;
 * 
 * beforeAll(async () => {
 *   context = await setupTestContext();
 * });
 * 
 * afterAll(async () => {
 *   await context.cleanup();
 * });
 * ```
 * 
 * @param userOverrides - Optional user properties to override
 * @returns Complete test context
 */
export async function setupTestContext(
  userOverrides?: Partial<User>
): Promise<TestContext> {
  const db = mockFactory.createMockDb();
  const user = await createTestUser(db, userOverrides);
  const token = await generateTestToken(user);

  return {
    db,
    user,
    token,
    cleanup: async () => {
      await cleanupTestData(db);
      mockFactory.resetAllMocks();
    },
  };
}

/**
 * Create a test user in the mock database
 * 
 * @param db - Mock database instance
 * @param overrides - Optional user properties to override
 * @returns Created user object
 */
export async function createTestUser(
  db: MockDatabase,
  overrides?: Partial<User>
): Promise<User> {
  const user = mockFactory.createMockUser(overrides);

  // Mock the database insert to return the user
  db.insert = vi.fn().mockImplementation(() => ({
    values: vi.fn().mockReturnValue({
      returning: vi.fn().mockResolvedValue([user]),
    }),
  }));

  // Mock the database select to return the user
  db.select = vi.fn().mockImplementation(() => ({
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue([user]),
    }),
  }));

  return user;
}

/**
 * Generate a test JWT token for a user
 * 
 * @param user - User to generate token for
 * @returns JWT token string
 */
export async function generateTestToken(user: User): Promise<string> {
  // For testing, we use a simple mock token
  // In real tests, you might want to use the actual JWT service
  const mockToken = `mock-jwt-token-${user.id}-${Date.now()}`;
  return mockToken;
}

/**
 * Generate a valid test JWT token using the actual JWT service
 * Use this when you need a real token that can be verified
 * 
 * @param user - User to generate token for
 * @returns Real JWT token string
 */
export async function generateRealTestToken(user: User): Promise<string> {
  // This would use the actual JWT service
  // For now, return a mock token
  // TODO: Implement real JWT generation when JWT service is available
  return generateTestToken(user);
}

/**
 * Create multiple test users at once
 * 
 * @param db - Mock database instance
 * @param count - Number of users to create
 * @param baseOverrides - Base properties to apply to all users
 * @returns Array of created users
 */
export async function createTestUsers(
  db: MockDatabase,
  count: number,
  baseOverrides?: Partial<User>
): Promise<User[]> {
  const users: User[] = [];

  for (let i = 0; i < count; i++) {
    const user = await createTestUser(db, {
      ...baseOverrides,
      email: `test-${i}@example.com`,
      username: `testuser${i}`,
    });
    users.push(user);
  }

  return users;
}

/**
 * Create a test admin user
 * 
 * @param db - Mock database instance
 * @param overrides - Optional user properties to override
 * @returns Created admin user
 */
export async function createTestAdmin(
  db: MockDatabase,
  overrides?: Partial<User>
): Promise<User> {
  return createTestUser(db, {
    role: 'ADMIN',
    ...overrides,
  });
}

/**
 * Create a test demo user
 * 
 * @param db - Mock database instance
 * @param overrides - Optional user properties to override
 * @returns Created demo user
 */
export async function createTestDemoUser(
  db: MockDatabase,
  overrides?: Partial<User>
): Promise<User> {
  return createTestUser(db, {
    isDemo: true,
    ...overrides,
  });
}

/**
 * Clean up test data from the mock database
 * 
 * @param db - Mock database instance
 */
export async function cleanupTestData(db: MockDatabase): Promise<void> {
  // Reset all mock functions
  if (db.select?.mockReset) db.select.mockReset();
  if (db.insert?.mockReset) db.insert.mockReset();
  if (db.update?.mockReset) db.update.mockReset();
  if (db.delete?.mockReset) db.delete.mockReset();
}

/**
 * Wait for a specified amount of time
 * Useful for testing time-based functionality
 * 
 * @param ms - Milliseconds to wait
 */
export async function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Mock the current time for testing
 * 
 * @param date - Date to mock as current time
 * @returns Function to restore real time
 */
export function mockTime(date: Date): () => void {
  const realDate = Date;
  const mockDate = new Date(date);

  global.Date = class extends Date {
    constructor() {
      super();
      return mockDate;
    }
    static now() {
      return mockDate.getTime();
    }
  } as any;

  return () => {
    global.Date = realDate;
  };
}

/**
 * Create a mock error for testing error handling
 * 
 * @param message - Error message
 * @param code - Optional error code
 * @returns Error object
 */
export function createTestError(message: string, code?: string): Error {
  const error = new Error(message);
  if (code) {
    (error as any).code = code;
  }
  return error;
}

/**
 * Assert that a function throws an error
 * 
 * @param fn - Function that should throw
 * @param expectedMessage - Optional expected error message
 */
export async function expectToThrow(
  fn: () => Promise<any> | any,
  expectedMessage?: string
): Promise<void> {
  let error: Error | undefined;

  try {
    await fn();
  } catch (e) {
    error = e as Error;
  }

  if (!error) {
    throw new Error('Expected function to throw an error, but it did not');
  }

  if (expectedMessage && !error.message.includes(expectedMessage)) {
    throw new Error(
      `Expected error message to include "${expectedMessage}", but got "${error.message}"`
    );
  }
}

/**
 * Create a test request ID for tracking
 * 
 * @returns Unique request ID
 */
export function createTestRequestId(): string {
  return `test-req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Sleep for testing async operations
 * Alias for wait() with a more descriptive name
 * 
 * @param ms - Milliseconds to sleep
 */
export const sleep = wait;
