/**
 * Security Logger Mock Helper
 * 
 * Provides properly configured mocks for securityLogger that return Promises
 * to avoid "Cannot read properties of undefined (reading 'catch')" errors
 */

import { vi } from 'vitest';

/**
 * Creates a mock security logger with all methods returning resolved Promises
 */
export function createSecurityLoggerMock() {
  return {
    logSecurityEvent: vi.fn().mockResolvedValue(undefined),
    logAuthenticationEvent: vi.fn().mockResolvedValue(undefined),
    logApiAccess: vi.fn().mockResolvedValue(undefined),
    logDataAccess: vi.fn().mockResolvedValue(undefined),
    createSecurityAlert: vi.fn().mockResolvedValue(undefined),
    logSuspiciousActivity: vi.fn().mockResolvedValue(undefined),
    getSecurityEvents: vi.fn().mockResolvedValue([]),
    getSecurityAlerts: vi.fn().mockResolvedValue([]),
    getSecurityMetrics: vi.fn().mockResolvedValue({
      totalEvents: 0,
      failedLogins: 0,
      suspiciousActivities: 0,
      activeAlerts: 0,
    }),
    resolveSecurityAlert: vi.fn().mockResolvedValue(undefined),
  };
}

/**
 * Sets up security logger mock in the module system
 * Use this in beforeEach/beforeAll hooks
 */
export function setupSecurityLoggerMock() {
  const mockLogger = createSecurityLoggerMock();
  
  vi.mock('../../services/securityLogger', () => ({
    securityLogger: mockLogger,
  }));
  
  return mockLogger;
}

/**
 * Resets all security logger mocks
 * Use this in afterEach hooks
 */
export function resetSecurityLoggerMock(mockLogger: ReturnType<typeof createSecurityLoggerMock>) {
  Object.values(mockLogger).forEach(mock => {
    if (typeof mock === 'function' && 'mockClear' in mock) {
      mock.mockClear();
    }
  });
}
