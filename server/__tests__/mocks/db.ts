import { vi } from 'vitest';
import { createDatabaseMock } from '../helpers/databaseMock';
import { mockFactory } from './factory';

/**
 * Global database mock for all tests
 * This provides a consistent mock across all test files
 * 
 * Note: Consider using mockFactory.createMockDb() directly in new tests
 * for better test isolation
 */
export const mockDb = createDatabaseMock();

/**
 * Reset the database mock between tests
 * 
 * Note: Consider using mockFactory.resetAllMocks() in new tests
 */
export function resetDbMock() {
  vi.clearAllMocks();
  Object.assign(mockDb, createDatabaseMock());
}

/**
 * Create a new database mock instance
 * Use this when you need a fresh mock for a specific test
 * 
 * @returns New mock database instance
 */
export function createMockDb() {
  return mockFactory.createMockDb();
}

/**
 * Configure the database mock with specific responses
 */
export function configureMockDb(config: {
  selectResult?: any[];
  insertResult?: any[];
  updateResult?: any[];
  deleteResult?: any[];
}) {
  if (config.selectResult !== undefined) {
    mockDb.select = vi.fn().mockImplementation(() => ({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(config.selectResult),
        orderBy: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue(config.selectResult),
        }),
        groupBy: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue(config.selectResult),
          }),
        }),
      }),
    }));
  }
  
  if (config.insertResult !== undefined) {
    mockDb.insert = vi.fn().mockImplementation(() => ({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue(config.insertResult),
      }),
    }));
  }
  
  if (config.updateResult !== undefined) {
    mockDb.update = vi.fn().mockImplementation(() => ({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(config.updateResult),
      }),
    }));
  }
  
  if (config.deleteResult !== undefined) {
    mockDb.delete = vi.fn().mockImplementation(() => ({
      where: vi.fn().mockResolvedValue(config.deleteResult),
    }));
  }
}

// Export the db mock as the default export
export const db = mockDb;
