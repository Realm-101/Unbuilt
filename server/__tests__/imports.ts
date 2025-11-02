/**
 * Centralized Test Imports
 * 
 * This file provides a single import point for all common test utilities,
 * mocks, and fixtures. This makes it easier to update imports across the
 * entire test suite and ensures consistency.
 * 
 * Usage:
 * ```typescript
 * import {
 *   mockFactory,
 *   setupTestContext,
 *   createTestUser,
 *   mockRequest,
 *   mockResponse,
 *   testUsers
 * } from '../imports';
 * ```
 */

// Re-export everything from mock factory
export {
  mockFactory,
  TestMockFactory,
  createMockDb,
  createMockUser,
  createMockRequest,
  createMockResponse,
  createMockNext,
  createMockSearchResult,
  createMockSearch,
  createMockConversation,
  createMockResource,
  resetAllMocks,
  type MockFactory,
  type MockDatabase,
} from './mocks/factory';

// Re-export everything from test helpers
export {
  setupTestContext,
  createTestUser,
  generateTestToken,
  generateRealTestToken,
  createTestUsers,
  createTestAdmin,
  createTestDemoUser,
  cleanupTestData,
  wait,
  sleep,
  mockTime,
  createTestError,
  expectToThrow,
  createTestRequestId,
  configureMockDbChain,
  createConfiguredMockDb,
  type TestContext,
} from './utils/testHelpers';

// Re-export everything from express mocks
export {
  mockRequest,
  mockResponse,
  mockNext,
  mockAuthenticatedRequest,
  mockRequestWithSession,
  mockRequestWithHeaders,
  mockPostRequest,
  mockGetRequest,
  assertResponseStatus,
  assertResponseJson,
  assertResponseSent,
  assertNextCalled,
  assertNextCalledWithError,
  getResponseData,
  getResponseStatus,
} from './mocks/express';

// Re-export everything from db mocks
export {
  mockDb,
  resetDbMock,
  configureMockDb,
  db,
  createMockDb as createDbMock, // Alias to avoid conflict
} from './mocks/db';

// Re-export test fixtures
export { testUsers } from './fixtures/users';

// Re-export database mock helper
export { createDatabaseMock } from './helpers/databaseMock';

/**
 * Common test constants
 */
export const TEST_CONSTANTS = {
  DEFAULT_PASSWORD: 'TestPassword123!',
  WEAK_PASSWORD: 'weak',
  VALID_EMAIL: 'test@example.com',
  INVALID_EMAIL: 'not-an-email',
  TEST_IP: '127.0.0.1',
  TEST_USER_AGENT: 'test-agent',
  DEFAULT_TIMEOUT: 5000,
  SHORT_TIMEOUT: 1000,
} as const;

/**
 * Common test patterns
 */
export const TEST_PATTERNS = {
  SQL_INJECTION: "'; DROP TABLE users; --",
  XSS_SCRIPT: '<script>alert("xss")</script>',
  XSS_IMG: '<img src=x onerror=alert("xss")>',
  PATH_TRAVERSAL: '../../../etc/passwd',
  COMMAND_INJECTION: '; rm -rf /',
} as const;

/**
 * Common HTTP status codes for testing
 */
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
} as const;

/**
 * Common error messages for testing
 */
export const ERROR_MESSAGES = {
  UNAUTHORIZED: 'Unauthorized',
  FORBIDDEN: 'Forbidden',
  NOT_FOUND: 'Not found',
  INVALID_CREDENTIALS: 'Invalid credentials',
  ACCOUNT_LOCKED: 'Account is locked',
  INVALID_TOKEN: 'Invalid token',
  TOKEN_EXPIRED: 'Token expired',
  VALIDATION_ERROR: 'Validation error',
  INTERNAL_ERROR: 'Internal server error',
} as const;
