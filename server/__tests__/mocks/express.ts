/**
 * Express Mocks
 * 
 * Mock implementations of Express request, response, and next objects
 */

import { vi } from 'vitest';
import type { Request, Response, NextFunction } from 'express';

/**
 * Create a mock Express Request object
 */
export function mockRequest(overrides: Partial<Request> = {}): Partial<Request> {
  return {
    body: {},
    params: {},
    query: {},
    headers: {},
    cookies: {},
    signedCookies: {},
    user: undefined,
    session: {} as any,
    ip: '127.0.0.1',
    method: 'GET',
    path: '/',
    url: '/',
    originalUrl: '/',
    protocol: 'http',
    secure: false,
    xhr: false,
    get: vi.fn((header: string) => {
      const headers = (overrides.headers || {}) as Record<string, string>;
      return headers[header.toLowerCase()];
    }),
    header: vi.fn(),
    accepts: vi.fn(),
    acceptsCharsets: vi.fn(),
    acceptsEncodings: vi.fn(),
    acceptsLanguages: vi.fn(),
    is: vi.fn(),
    ...overrides,
  } as Partial<Request>;
}

/**
 * Create a mock Express Response object
 */
export function mockResponse(): Partial<Response> {
  const res: Partial<Response> = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    send: vi.fn().mockReturnThis(),
    sendStatus: vi.fn().mockReturnThis(),
    redirect: vi.fn().mockReturnThis(),
    render: vi.fn().mockReturnThis(),
    cookie: vi.fn().mockReturnThis(),
    clearCookie: vi.fn().mockReturnThis(),
    setHeader: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    header: vi.fn().mockReturnThis(),
    type: vi.fn().mockReturnThis(),
    contentType: vi.fn().mockReturnThis(),
    attachment: vi.fn().mockReturnThis(),
    download: vi.fn().mockReturnThis(),
    sendFile: vi.fn().mockReturnThis(),
    end: vi.fn().mockReturnThis(),
    on: vi.fn().mockReturnThis(),
    removeHeader: vi.fn().mockReturnThis(),
    get: vi.fn(),
    locals: {},
    headersSent: false,
    statusCode: 200,
  };
  
  return res;
}

/**
 * Create a mock Express NextFunction
 */
export function mockNext(): NextFunction {
  return vi.fn() as NextFunction;
}

/**
 * Create a mock authenticated request
 */
export function mockAuthenticatedRequest(user: any, overrides: Partial<Request> = {}): Partial<Request> {
  return mockRequest({
    user,
    headers: {
      authorization: 'Bearer mock-jwt-token',
      ...overrides.headers,
    },
    ...overrides,
  });
}

/**
 * Create a mock request with session
 */
export function mockRequestWithSession(session: any, overrides: Partial<Request> = {}): Partial<Request> {
  return mockRequest({
    session: {
      id: 'session_123',
      cookie: {
        maxAge: 3600000,
        httpOnly: true,
        secure: false,
      },
      ...session,
    } as any,
    ...overrides,
  });
}

/**
 * Create a mock request with specific headers
 */
export function mockRequestWithHeaders(headers: Record<string, string>, overrides: Partial<Request> = {}): Partial<Request> {
  return mockRequest({
    headers: {
      'content-type': 'application/json',
      ...headers,
    },
    ...overrides,
  });
}

/**
 * Create a mock POST request
 */
export function mockPostRequest(body: any, overrides: Partial<Request> = {}): Partial<Request> {
  return mockRequest({
    method: 'POST',
    body,
    headers: {
      'content-type': 'application/json',
    },
    ...overrides,
  });
}

/**
 * Create a mock GET request with query params
 */
export function mockGetRequest(query: any, overrides: Partial<Request> = {}): Partial<Request> {
  return mockRequest({
    method: 'GET',
    query,
    ...overrides,
  });
}

/**
 * Assert response status
 */
export function assertResponseStatus(res: Partial<Response>, expectedStatus: number) {
  expect(res.status).toHaveBeenCalledWith(expectedStatus);
}

/**
 * Assert response JSON
 */
export function assertResponseJson(res: Partial<Response>, expectedData: any) {
  expect(res.json).toHaveBeenCalledWith(expect.objectContaining(expectedData));
}

/**
 * Assert response sent
 */
export function assertResponseSent(res: Partial<Response>, expectedData?: any) {
  if (expectedData !== undefined) {
    expect(res.send).toHaveBeenCalledWith(expectedData);
  } else {
    expect(res.send).toHaveBeenCalled();
  }
}

/**
 * Assert next called
 */
export function assertNextCalled(next: NextFunction) {
  expect(next).toHaveBeenCalled();
}

/**
 * Assert next called with error
 */
export function assertNextCalledWithError(next: NextFunction, errorMessage?: string) {
  expect(next).toHaveBeenCalled();
  const error = (next as any).mock.calls[0][0];
  expect(error).toBeInstanceOf(Error);
  if (errorMessage) {
    expect(error.message).toContain(errorMessage);
  }
}

/**
 * Get response data from mock
 */
export function getResponseData(res: Partial<Response>): any {
  if (res.json && (res.json as any).mock?.calls?.length > 0) {
    return (res.json as any).mock.calls[0][0];
  }
  if (res.send && (res.send as any).mock?.calls?.length > 0) {
    return (res.send as any).mock.calls[0][0];
  }
  return null;
}

/**
 * Get response status from mock
 */
export function getResponseStatus(res: Partial<Response>): number | null {
  if (res.status && (res.status as any).mock?.calls?.length > 0) {
    return (res.status as any).mock.calls[0][0];
  }
  return res.statusCode || null;
}
