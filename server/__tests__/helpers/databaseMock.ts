import { vi } from 'vitest';

/**
 * Creates a comprehensive mock for Drizzle ORM database operations
 * Supports chaining methods like .from(), .where(), .set(), etc.
 */
export function createDatabaseMock() {
  const createQueryMock = (resolvedValue: any) => {
    const chainable = {
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      offset: vi.fn().mockReturnThis(),
      groupBy: vi.fn().mockReturnThis(),
      then: vi.fn((resolve) => resolve(resolvedValue)),
    };
    
    // Make all methods return the chainable object
    Object.keys(chainable).forEach(key => {
      if (key !== 'then' && typeof chainable[key] === 'function') {
        chainable[key].mockReturnValue(chainable);
      }
    });
    
    return {
      from: vi.fn().mockReturnValue(chainable),
      where: vi.fn().mockReturnValue(chainable),
      orderBy: vi.fn().mockReturnValue(chainable),
      limit: vi.fn().mockReturnValue(chainable),
      offset: vi.fn().mockReturnValue(chainable),
      groupBy: vi.fn().mockReturnValue(chainable),
    };
  };

  const createUpdateMock = (resolvedValue: any) => ({
    set: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue(resolvedValue),
      returning: vi.fn().mockResolvedValue(resolvedValue),
    }),
  });

  const createInsertMock = (resolvedValue: any) => ({
    values: vi.fn().mockReturnValue({
      returning: vi.fn().mockResolvedValue(resolvedValue),
      onConflictDoNothing: vi.fn().mockResolvedValue(resolvedValue),
      onConflictDoUpdate: vi.fn().mockResolvedValue(resolvedValue),
    }),
    returning: vi.fn().mockResolvedValue(resolvedValue),
  });

  const createDeleteMock = (resolvedValue: any) => ({
    where: vi.fn().mockResolvedValue(resolvedValue),
    returning: vi.fn().mockResolvedValue(resolvedValue),
  });

  return {
    select: vi.fn().mockImplementation((fields?: any) => createQueryMock([])),
    update: vi.fn().mockImplementation((table: any) => createUpdateMock([])),
    insert: vi.fn().mockImplementation((table: any) => createInsertMock([])),
    delete: vi.fn().mockImplementation((table: any) => createDeleteMock([])),
    transaction: vi.fn().mockImplementation(async (callback: any) => {
      return await callback({
        select: vi.fn().mockImplementation(() => createQueryMock([])),
        update: vi.fn().mockImplementation(() => createUpdateMock([])),
        insert: vi.fn().mockImplementation(() => createInsertMock([])),
        delete: vi.fn().mockImplementation(() => createDeleteMock([])),
      });
    }),
  };
}

/**
 * Creates a mock for a specific query result
 */
export function mockQueryResult(data: any[]) {
  return {
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue(data),
      orderBy: vi.fn().mockResolvedValue(data),
      limit: vi.fn().mockResolvedValue(data),
      offset: vi.fn().mockResolvedValue(data),
      groupBy: vi.fn().mockResolvedValue(data),
    }),
    where: vi.fn().mockResolvedValue(data),
    orderBy: vi.fn().mockResolvedValue(data),
    limit: vi.fn().mockResolvedValue(data),
    offset: vi.fn().mockResolvedValue(data),
    groupBy: vi.fn().mockResolvedValue(data),
  };
}

/**
 * Creates a mock for update operations
 */
export function mockUpdateResult(data: any[]) {
  return {
    set: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue(data),
      returning: vi.fn().mockResolvedValue(data),
    }),
  };
}

/**
 * Creates a mock for insert operations
 */
export function mockInsertResult(data: any[]) {
  return {
    values: vi.fn().mockReturnValue({
      returning: vi.fn().mockResolvedValue(data),
      onConflictDoNothing: vi.fn().mockResolvedValue(data),
      onConflictDoUpdate: vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(data),
        }),
      }),
    }),
    returning: vi.fn().mockResolvedValue(data),
  };
}

/**
 * Creates a mock for delete operations
 */
export function mockDeleteResult(data: any[]) {
  return {
    where: vi.fn().mockResolvedValue(data),
    returning: vi.fn().mockResolvedValue(data),
  };
}

/**
 * Helper to create a user fixture
 */
export function createUserFixture(overrides: Partial<any> = {}) {
  return {
    id: 1,
    email: 'test@example.com',
    password: '$2a$10$hashedpassword',
    plan: 'free',
    failedLoginAttempts: 0,
    accountLockedUntil: null,
    refreshToken: null,
    refreshTokenExpiry: null,
    resetToken: null,
    resetTokenExpiry: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

/**
 * Helper to create a session fixture
 */
export function createSessionFixture(overrides: Partial<any> = {}) {
  return {
    id: 1,
    userId: 1,
    token: 'session-token-123',
    ipAddress: '192.168.1.1',
    userAgent: 'Mozilla/5.0',
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    ...overrides,
  };
}
