import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import {
  secureErrorHandler,
  errorHandlerMiddleware,
  AppError,
  ErrorType,
  SecurityEventType,
  asyncHandler,
  sendSuccess,
  sendError
} from '../errorHandler';

// Mock console methods
const mockConsoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

// Helper to create mock request/response objects
const createMockReq = (overrides: Partial<Request> = {}): Partial<Request> => ({
  method: 'GET',
  path: '/api/test',
  ip: '127.0.0.1',
  headers: { 'user-agent': 'test-agent' },
  connection: { remoteAddress: '127.0.0.1' },
  ...overrides
});

const createMockRes = (): Partial<Response> => {
  const res: any = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    statusCode: 200
  };
  return res;
};

const createMockNext = (): NextFunction => vi.fn();

describe('SecureErrorHandler', () => {
  beforeEach(() => {
    mockConsoleError.mockClear();
    secureErrorHandler.clearSecurityEvents();
  });

  describe('Error Sanitization', () => {
    it('should sanitize sensitive information from error messages', () => {
      const req = createMockReq() as Request;
      const res = createMockRes() as Response;
      const next = createMockNext();

      const sensitiveError = new Error('Database connection failed with password: secret123');
      
      errorHandlerMiddleware(sensitiveError, req, res, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Internal server error',
          message: 'Internal server error',
          code: 'SYS_UNKNOWN'
        })
      );
    });

    it('should replace known sensitive messages with generic ones', () => {
      const req = createMockReq() as Request;
      const res = createMockRes() as Response;
      const next = createMockNext();

      const authError = new Error('Invalid credentials provided');
      
      errorHandlerMiddleware(authError, req, res, next);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Authentication failed'
        })
      );
    });

    it('should preserve non-sensitive error messages', () => {
      const req = createMockReq() as Request;
      const res = createMockRes() as Response;
      const next = createMockNext();

      const safeError = new Error('Invalid input format');
      
      errorHandlerMiddleware(safeError, req, res, next);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Invalid input format'
        })
      );
    });
  });

  describe('AppError Handling', () => {
    it('should handle authentication errors correctly', () => {
      const req = createMockReq() as Request;
      const res = createMockRes() as Response;
      const next = createMockNext();

      const authError = AppError.createAuthenticationError('Token expired', 'AUTH_TOKEN_EXPIRED');
      
      errorHandlerMiddleware(authError, req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Authentication failed',
          message: 'Session expired, please login again',
          code: 'AUTH_TOKEN_EXPIRED',
          statusCode: 401
        })
      );
    });

    it('should handle validation errors correctly', () => {
      const req = createMockReq() as Request;
      const res = createMockRes() as Response;
      const next = createMockNext();

      const validationError = AppError.createValidationError(
        'Email is required',
        'VAL_EMAIL_REQUIRED',
        { field: 'email' }
      );
      
      errorHandlerMiddleware(validationError, req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Invalid input data',
          code: 'VAL_EMAIL_REQUIRED',
          statusCode: 400
        })
      );
    });

    it('should handle authorization errors correctly', () => {
      const req = createMockReq() as Request;
      const res = createMockRes() as Response;
      const next = createMockNext();

      const authzError = AppError.createAuthorizationError('Insufficient permissions', 'AUTHZ_INSUFFICIENT');
      
      errorHandlerMiddleware(authzError, req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Access denied',
          code: 'AUTHZ_INSUFFICIENT',
          statusCode: 403
        })
      );
    });
  });

  describe('Zod Error Handling', () => {
    it('should handle Zod validation errors', () => {
      const req = createMockReq() as Request;
      const res = createMockRes() as Response;
      const next = createMockNext();

      const schema = z.object({ email: z.string().email() });
      
      try {
        schema.parse({ email: 'invalid-email' });
      } catch (zodError) {
        errorHandlerMiddleware(zodError as z.ZodError, req, res, next);
      }

      expect(res.status).toHaveBeenCalledWith(400);
      const jsonCall = (res.json as any).mock.calls[0][0];
      expect(jsonCall).toMatchObject({
        success: false,
        error: 'Invalid input data',
        code: 'VAL_INVALID_INPUT'
      });
      expect(jsonCall.message).toBeDefined();
      expect(jsonCall.fields).toBeDefined();
    });
  });

  describe('Security Event Logging', () => {
    it('should log authentication failures as security events', () => {
      const req = createMockReq({ user: { id: 'user123' } }) as Request;
      const res = createMockRes() as Response;
      const next = createMockNext();

      const authError = AppError.createAuthenticationError();
      
      errorHandlerMiddleware(authError, req, res, next);

      const events = secureErrorHandler.getSecurityEvents();
      expect(events).toHaveLength(1);
      expect(events[0]).toMatchObject({
        type: SecurityEventType.AUTH_FAILURE,
        userId: 'user123',
        ip: '127.0.0.1',
        userAgent: 'test-agent',
        endpoint: '/api/test',
        method: 'GET'
      });
    });

    it('should log rate limit violations as security events', () => {
      const req = createMockReq() as Request;
      const res = createMockRes() as Response;
      const next = createMockNext();

      const rateLimitError = AppError.createRateLimitError();
      
      errorHandlerMiddleware(rateLimitError, req, res, next);

      const events = secureErrorHandler.getSecurityEvents();
      expect(events).toHaveLength(1);
      expect(events[0].type).toBe(SecurityEventType.RATE_LIMIT_EXCEEDED);
    });

    it('should include request details in security events', () => {
      const req = createMockReq({
        path: '/api/sensitive',
        method: 'POST',
        user: { id: 'user456' }
      }) as Request;
      const res = createMockRes() as Response;
      const next = createMockNext();

      const authzError = AppError.createAuthorizationError();
      
      errorHandlerMiddleware(authzError, req, res, next);

      const events = secureErrorHandler.getSecurityEvents();
      expect(events[0]).toMatchObject({
        endpoint: '/api/sensitive',
        method: 'POST',
        userId: 'user456'
      });
    });
  });

  describe('Request ID Generation', () => {
    it('should include unique request IDs in error responses', () => {
      const req = createMockReq() as Request;
      const res = createMockRes() as Response;
      const next = createMockNext();

      const error = new Error('Test error');
      
      errorHandlerMiddleware(error, req, res, next);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          requestId: expect.stringMatching(/^[a-f0-9]{16}$/)
        })
      );
    });

    it('should generate different request IDs for different errors', () => {
      const req1 = createMockReq() as Request;
      const res1 = createMockRes() as Response;
      const req2 = createMockReq() as Request;
      const res2 = createMockRes() as Response;
      const next = createMockNext();

      errorHandlerMiddleware(new Error('Error 1'), req1, res1, next);
      errorHandlerMiddleware(new Error('Error 2'), req2, res2, next);

      const call1 = (res1.json as any).mock.calls[0][0];
      const call2 = (res2.json as any).mock.calls[0][0];

      expect(call1.requestId).not.toBe(call2.requestId);
    });
  });

  describe('Async Handler', () => {
    it('should catch async errors and pass them to next', async () => {
      const next = vi.fn();
      const asyncError = new Error('Async error');
      
      const asyncRoute = asyncHandler(async () => {
        throw asyncError;
      });

      await asyncRoute({}, {}, next);

      expect(next).toHaveBeenCalledWith(asyncError);
    });

    it('should handle successful async operations', async () => {
      const next = vi.fn();
      const res = { json: vi.fn() };
      
      const asyncRoute = asyncHandler(async (req: any, res: any) => {
        res.json({ success: true });
      });

      await asyncRoute({}, res, next);

      expect(res.json).toHaveBeenCalledWith({ success: true });
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('Helper Functions', () => {
    it('should send standardized success responses', () => {
      const res = createMockRes() as Response;
      const data = { id: 1, name: 'Test' };

      sendSuccess(res, data, 'Operation successful', 201);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Operation successful',
        data,
        timestamp: expect.any(String)
      });
    });

    it('should send standardized error responses', () => {
      const res = createMockRes() as Response;
      const error = AppError.createValidationError();

      sendError(res, error);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Invalid input data',
          code: 'VAL_INVALID'
        })
      );
    });
  });

  describe('Error Factory Methods', () => {
    it('should create authentication errors with correct properties', () => {
      const error = AppError.createAuthenticationError('Custom auth message', 'CUSTOM_AUTH_CODE');

      expect(error.type).toBe(ErrorType.AUTHENTICATION);
      expect(error.statusCode).toBe(401);
      expect(error.code).toBe('CUSTOM_AUTH_CODE');
      expect(error.message).toBe('Custom auth message');
      expect(error.isOperational).toBe(true);
    });

    it('should create validation errors with details', () => {
      const details = { field: 'email', value: 'invalid' };
      const error = AppError.createValidationError('Invalid email', 'VAL_EMAIL', details);

      expect(error.type).toBe(ErrorType.VALIDATION);
      expect(error.statusCode).toBe(400);
      expect(error.details).toEqual(details);
    });

    it('should create system errors with correct defaults', () => {
      const error = AppError.createSystemError();

      expect(error.type).toBe(ErrorType.SYSTEM);
      expect(error.statusCode).toBe(500);
      expect(error.code).toBe('SYS_ERROR');
      expect(error.message).toBe('Internal server error');
    });
  });
});