/**
 * Database Mock Helper for Drizzle ORM
 * 
 * Provides comprehensive mocks for Drizzle ORM query builder
 * to support integration tests without a real database
 */

import { vi } from 'vitest';

/**
 * Creates a chainable query builder mock
 */
export function createQueryBuilderMock(returnValue: any = []) {
  const mock: any = {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    and: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    groupBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    offset: vi.fn().mockReturnThis(),
    leftJoin: vi.fn().mockReturnThis(),
    rightJoin: vi.fn().mockReturnThis(),
    innerJoin: vi.fn().mockReturnThis(),
    then: vi.fn((resolve) => resolve(returnValue)),
  };
  
  // Make it thenable (Promise-like)
  mock[Symbol.toStringTag] = 'Promise';
  
  return mock;
}

/**
 * Creates an update query builder mock
 */
export function createUpdateBuilderMock(returnValue: any = { rowsAffected: 1 }) {
  const mock: any = {
    set: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    returning: vi.fn().mockReturnThis(),
    then: vi.fn((resolve) => resolve(returnValue)),
  };
  
  mock[Symbol.toStringTag] = 'Promise';
  
  return mock;
}

/**
 * Creates an insert query builder mock
 */
export function createInsertBuilderMock(returnValue: any = { insertId: 1 }) {
  const mock: any = {
    values: vi.fn().mockReturnThis(),
    returning: vi.fn().mockReturnThis(),
    onConflictDoNothing: vi.fn().mockReturnThis(),
    onConflictDoUpdate: vi.fn().mockReturnThis(),
    then: vi.fn((resolve) => resolve(returnValue)),
  };
  
  mock[Symbol.toStringTag] = 'Promise';
  
  return mock;
}

/**
 * Creates a delete query builder mock
 */
export function createDeleteBuilderMock(returnValue: any = { rowsAffected: 1 }) {
  const mock: any = {
    where: vi.fn().mockReturnThis(),
    returning: vi.fn().mockReturnThis(),
    then: vi.fn((resolve) => resolve(returnValue)),
  };
  
  mock[Symbol.toStringTag] = 'Promise';
  
  return mock;
}

/**
 * Creates a complete database mock with all query builders
 */
export function createDatabaseMock(options: {
  selectResult?: any[];
  insertResult?: any;
  updateResult?: any;
  deleteResult?: any;
} = {}) {
  const {
    selectResult = [],
    insertResult = { insertId: 1 },
    updateResult = { rowsAffected: 1 },
    deleteResult = { rowsAffected: 1 },
  } = options;
  
  return {
    select: vi.fn(() => createQueryBuilderMock(selectResult)),
    insert: vi.fn(() => createInsertBuilderMock(insertResult)),
    update: vi.fn(() => createUpdateBuilderMock(updateResult)),
    delete: vi.fn(() => createDeleteBuilderMock(deleteResult)),
    query: {
      users: {
        findFirst: vi.fn().mockResolvedValue(null),
        findMany: vi.fn().mockResolvedValue([]),
      },
      jwtTokens: {
        findFirst: vi.fn().mockResolvedValue(null),
        findMany: vi.fn().mockResolvedValue([]),
      },
      securityAuditLogs: {
        findFirst: vi.fn().mockResolvedValue(null),
        findMany: vi.fn().mockResolvedValue([]),
      },
      securityAlerts: {
        findFirst: vi.fn().mockResolvedValue(null),
        findMany: vi.fn().mockResolvedValue([]),
      },
    },
    transaction: vi.fn(async (callback) => {
      // Execute the callback with the mock db
      return callback(createDatabaseMock(options));
    }),
  };
}

/**
 * Creates a mock for a specific table query
 */
export function createTableQueryMock(data: any[] = []) {
  return {
    findFirst: vi.fn().mockResolvedValue(data[0] || null),
    findMany: vi.fn().mockResolvedValue(data),
  };
}

/**
 * Sets up database mock in the module system
 */
export function setupDatabaseMock(mockData: {
  users?: any[];
  jwtTokens?: any[];
  securityAuditLogs?: any[];
  securityAlerts?: any[];
} = {}) {
  const db = createDatabaseMock();
  
  // Configure query mocks with provided data
  if (mockData.users) {
    db.query.users = createTableQueryMock(mockData.users);
  }
  if (mockData.jwtTokens) {
    db.query.jwtTokens = createTableQueryMock(mockData.jwtTokens);
  }
  if (mockData.securityAuditLogs) {
    db.query.securityAuditLogs = createTableQueryMock(mockData.securityAuditLogs);
  }
  if (mockData.securityAlerts) {
    db.query.securityAlerts = createTableQueryMock(mockData.securityAlerts);
  }
  
  vi.mock('../../db', () => ({
    db,
  }));
  
  return db;
}

/**
 * Helper to create a user mock object
 */
export function createMockUser(overrides: Partial<any> = {}) {
  return {
    id: 1,
    email: 'test@example.com',
    password: '$2a$10$hashedpassword',
    firstName: 'Test',
    lastName: 'User',
    plan: 'free',
    isActive: true,
    failedLoginAttempts: 0,
    lastFailedLogin: null,
    accountLockedUntil: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

/**
 * Helper to create a JWT token mock object
 */
export function createMockJwtToken(overrides: Partial<any> = {}) {
  return {
    id: 'jwt-id-123',
    userId: 1,
    issuedAt: new Date(),
    expiresAt: new Date(Date.now() + 3600000), // 1 hour from now
    isActive: true,
    deviceInfo: JSON.stringify({
      userAgent: 'Mozilla/5.0',
      platform: 'Windows',
      browser: 'Chrome',
    }),
    ipAddress: '127.0.0.1',
    ...overrides,
  };
}

/**
 * Helper to create a security audit log mock object
 */
export function createMockSecurityAuditLog(overrides: Partial<any> = {}) {
  return {
    id: 1,
    eventType: 'AUTH_SUCCESS',
    action: 'login_success',
    userId: 1,
    ipAddress: '127.0.0.1',
    userAgent: 'Mozilla/5.0',
    success: true,
    metadata: {},
    timestamp: new Date(),
    ...overrides,
  };
}

/**
 * Helper to create a security alert mock object
 */
export function createMockSecurityAlert(overrides: Partial<any> = {}) {
  return {
    id: 1,
    alertType: 'BRUTE_FORCE_ATTACK',
    severity: 'high',
    userId: 1,
    ipAddress: '127.0.0.1',
    description: 'Multiple failed login attempts detected',
    status: 'active',
    metadata: {},
    createdAt: new Date(),
    resolvedAt: null,
    resolvedBy: null,
    ...overrides,
  };
}
