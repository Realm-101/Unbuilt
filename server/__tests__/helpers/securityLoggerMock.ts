import { vi, expect } from 'vitest';

/**
 * Creates a properly mocked security logger that returns Promises
 * This ensures all async operations are handled correctly in tests
 */
export function createSecurityLoggerMock() {
  return {
    logSecurityEvent: vi.fn().mockResolvedValue(undefined),
    logAuthEvent: vi.fn().mockResolvedValue(undefined),
    logAccessEvent: vi.fn().mockResolvedValue(undefined),
    logDataEvent: vi.fn().mockResolvedValue(undefined),
    logSystemEvent: vi.fn().mockResolvedValue(undefined),
    logError: vi.fn().mockResolvedValue(undefined),
    getRecentEvents: vi.fn().mockResolvedValue([]),
    getEventsByUser: vi.fn().mockResolvedValue([]),
    getEventsByType: vi.fn().mockResolvedValue([]),
  };
}

/**
 * Creates a security logger mock that simulates errors
 */
export function createFailingSecurityLoggerMock() {
  return {
    logSecurityEvent: vi.fn().mockRejectedValue(new Error('Security logger unavailable')),
    logAuthEvent: vi.fn().mockRejectedValue(new Error('Security logger unavailable')),
    logAccessEvent: vi.fn().mockRejectedValue(new Error('Security logger unavailable')),
    logDataEvent: vi.fn().mockRejectedValue(new Error('Security logger unavailable')),
    logSystemEvent: vi.fn().mockRejectedValue(new Error('Security logger unavailable')),
    logError: vi.fn().mockRejectedValue(new Error('Security logger unavailable')),
    getRecentEvents: vi.fn().mockRejectedValue(new Error('Security logger unavailable')),
    getEventsByUser: vi.fn().mockRejectedValue(new Error('Security logger unavailable')),
    getEventsByType: vi.fn().mockRejectedValue(new Error('Security logger unavailable')),
  };
}

/**
 * Helper to verify security event was logged with correct parameters
 */
export function expectSecurityEventLogged(
  mockLogger: any,
  eventType: string,
  action: string,
  success: boolean,
  contextMatcher?: any
) {
  expect(mockLogger.logSecurityEvent).toHaveBeenCalledWith(
    eventType,
    action,
    success,
    contextMatcher ? expect.objectContaining(contextMatcher) : expect.any(Object),
    expect.anything()
  );
}

/**
 * Helper to reset all security logger mocks
 */
export function resetSecurityLoggerMock(mockLogger: any) {
  Object.values(mockLogger).forEach((fn: any) => {
    if (typeof fn.mockClear === 'function') {
      fn.mockClear();
    }
  });
}

/**
 * Helper to create a security event fixture
 */
export function createSecurityEventFixture(overrides: Partial<any> = {}) {
  return {
    id: 1,
    eventType: 'LOGIN_SUCCESS',
    action: 'user_login',
    success: true,
    userId: 1,
    ipAddress: '192.168.1.1',
    userAgent: 'Mozilla/5.0',
    timestamp: new Date(),
    metadata: {},
    ...overrides,
  };
}
