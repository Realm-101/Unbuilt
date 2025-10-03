/**
 * Global Test Setup
 * 
 * This file runs before all tests and sets up the test environment.
 */

import { beforeAll, afterAll, beforeEach, afterEach, vi } from 'vitest';
import dotenv from 'dotenv';

// Load test environment variables
dotenv.config({ path: '.env.test' });

// Set test environment
process.env.NODE_ENV = 'test';

// Mock console methods to reduce noise in test output
const originalConsole = {
  log: console.log,
  error: console.error,
  warn: console.warn,
  info: console.info,
};

// Global test setup
beforeAll(() => {
  // Suppress console output during tests (optional)
  if (process.env.SUPPRESS_TEST_LOGS === 'true') {
    console.log = vi.fn();
    console.info = vi.fn();
    console.warn = vi.fn();
    // Keep console.error for debugging
  }
});

// Global test teardown
afterAll(() => {
  // Restore console methods
  if (process.env.SUPPRESS_TEST_LOGS === 'true') {
    console.log = originalConsole.log;
    console.error = originalConsole.error;
    console.warn = originalConsole.warn;
    console.info = originalConsole.info;
  }
});

// Reset mocks before each test
beforeEach(() => {
  vi.clearAllMocks();
});

// Cleanup after each test
afterEach(() => {
  vi.restoreAllMocks();
});

// Global test utilities
export const testUtils = {
  /**
   * Wait for a specified amount of time
   */
  wait: (ms: number) => new Promise(resolve => setTimeout(resolve, ms)),
  
  /**
   * Generate a random test email
   */
  randomEmail: () => `test-${Date.now()}-${Math.random().toString(36).substring(7)}@example.com`,
  
  /**
   * Generate a random test password
   */
  randomPassword: () => `Test${Math.random().toString(36).substring(2, 10)}!@#`,
  
  /**
   * Create a mock request object
   */
  mockRequest: (overrides = {}) => ({
    body: {},
    params: {},
    query: {},
    headers: {},
    user: null,
    session: {},
    ...overrides,
  }),
  
  /**
   * Create a mock response object
   */
  mockResponse: () => {
    const res: any = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
      send: vi.fn().mockReturnThis(),
      redirect: vi.fn().mockReturnThis(),
      cookie: vi.fn().mockReturnThis(),
      clearCookie: vi.fn().mockReturnThis(),
      setHeader: vi.fn().mockReturnThis(),
    };
    return res;
  },
  
  /**
   * Create a mock next function
   */
  mockNext: () => vi.fn(),
};

// Export for use in tests
export { vi };
