/**
 * Database Mocking Strategy
 * 
 * This file provides utilities for mocking database operations in tests.
 * Choose the appropriate strategy based on your test needs:
 * 
 * 1. In-Memory Database (fastest, most isolated)
 * 2. Test Database (more realistic, requires setup)
 * 3. Mock Functions (simplest, for unit tests)
 */

import { vi } from 'vitest';

/**
 * Mock database client for unit tests
 * Use this when you want to test logic without hitting a real database
 */
export const mockDb = {
  query: vi.fn(),
  select: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  delete: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  from: vi.fn().mockReturnThis(),
  values: vi.fn().mockReturnThis(),
  returning: vi.fn().mockReturnThis(),
  execute: vi.fn(),
};

/**
 * Mock user repository
 */
export const mockUserRepository = {
  findById: vi.fn(),
  findByEmail: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
};

/**
 * Mock session repository
 */
export const mockSessionRepository = {
  findById: vi.fn(),
  findByUserId: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  deleteExpired: vi.fn(),
};

/**
 * Sample database records for testing
 */
export const sampleRecords = {
  user: {
    id: 1,
    email: 'test@example.com',
    passwordHash: '$2b$10$hashedpassword',
    plan: 'free',
    firstName: 'Test',
    lastName: 'User',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
  session: {
    id: 'session-123',
    userId: 1,
    jti: 'jwt-token-id',
    ipAddress: '127.0.0.1',
    userAgent: 'Mozilla/5.0',
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + 3600000),
  },
};

/**
 * Reset all database mocks
 * Call this in beforeEach to ensure clean state
 */
export function resetDatabaseMocks() {
  vi.clearAllMocks();
  
  // Reset mock implementations to default behavior
  mockDb.query.mockReset();
  mockDb.execute.mockResolvedValue([]);
  
  mockUserRepository.findById.mockResolvedValue(null);
  mockUserRepository.findByEmail.mockResolvedValue(null);
  mockUserRepository.create.mockResolvedValue(sampleRecords.user);
  
  mockSessionRepository.findById.mockResolvedValue(null);
  mockSessionRepository.findByUserId.mockResolvedValue([]);
  mockSessionRepository.create.mockResolvedValue(sampleRecords.session);
}

/**
 * Setup common database mock scenarios
 */
export const dbScenarios = {
  /**
   * User exists in database
   */
  userExists: (user = sampleRecords.user) => {
    mockUserRepository.findById.mockResolvedValue(user);
    mockUserRepository.findByEmail.mockResolvedValue(user);
  },
  
  /**
   * User does not exist
   */
  userNotFound: () => {
    mockUserRepository.findById.mockResolvedValue(null);
    mockUserRepository.findByEmail.mockResolvedValue(null);
  },
  
  /**
   * Database error
   */
  databaseError: (error = new Error('Database connection failed')) => {
    mockDb.query.mockRejectedValue(error);
    mockDb.execute.mockRejectedValue(error);
    mockUserRepository.findById.mockRejectedValue(error);
    mockUserRepository.findByEmail.mockRejectedValue(error);
  },
  
  /**
   * Session exists
   */
  sessionExists: (session = sampleRecords.session) => {
    mockSessionRepository.findById.mockResolvedValue(session);
    mockSessionRepository.findByUserId.mockResolvedValue([session]);
  },
};

/**
 * Test Database Setup (for integration tests)
 * 
 * Use this when you need a real database for integration tests.
 * Requires a test database to be configured.
 */
export async function setupTestDatabase() {
  // TODO: Implement test database setup
  // This could involve:
  // 1. Creating a test database
  // 2. Running migrations
  // 3. Seeding test data
  console.log('Test database setup not yet implemented');
}

/**
 * Test Database Teardown
 */
export async function teardownTestDatabase() {
  // TODO: Implement test database teardown
  // This could involve:
  // 1. Dropping test tables
  // 2. Closing connections
  console.log('Test database teardown not yet implemented');
}

/**
 * Clean test database between tests
 */
export async function cleanTestDatabase() {
  // TODO: Implement database cleaning
  // This could involve:
  // 1. Truncating all tables
  // 2. Resetting sequences
  console.log('Test database cleaning not yet implemented');
}
