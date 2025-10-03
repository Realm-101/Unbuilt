import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { securityLogger } from '../../services/securityLogger';
import {
  logRateLimitExceeded,
  securityErrorHandler,
  addSecurityContext
} from '../securityMonitoring';

describe('Security Logger Integration Tests', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockReq = {
      path: '/api/test',
      method: 'GET',
      headers: {},
      connection: { remoteAddress: '127.0.0.1' } as any,
      socket: { remoteAddress: '127.0.0.1' } as any,
      user: { id: 1, email: 'test@example.com' } as any
    };
    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis()
    };
    mockNext = vi.fn();
  });

  describe('logSecurityEvent signature verification', () => {
    it('should call logSecurityEvent with correct parameters for rate limit', async () => {
      const spy = vi.spyOn(securityLogger, 'logSecurityEvent');
      
      // Add security context first
      addSecurityContext(mockReq as Request, mockRes as Response, mockNext);
      
      // Call the rate limit logger
      logRateLimitExceeded(mockReq as Request, mockRes as Response, mockNext);
      
      // Wait for async call
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Verify the call was made with correct signature
      expect(spy).toHaveBeenCalledWith(
        'RATE_LIMIT_EXCEEDED',
        'rate_limit_exceeded',
        false,
        expect.objectContaining({
          userId: expect.any(Number),
          ipAddress: expect.any(String),
          userAgent: expect.any(String),
          resource: expect.any(String),
          metadata: expect.any(Object)
        }),
        'Rate limit exceeded'
      );
      
      spy.mockRestore();
    });

    it('should call logSecurityEvent with correct parameters for security errors', async () => {
      const spy = vi.spyOn(securityLogger, 'logSecurityEvent');
      
      // Add security context first
      addSecurityContext(mockReq as Request, mockRes as Response, mockNext);
      
      // Create a security error
      const error = new Error('Unauthorized access');
      (error as any).statusCode = 401;
      (error as any).name = 'UnauthorizedError';
      
      // Call the error handler
      securityErrorHandler(error, mockReq as Request, mockRes as Response, mockNext);
      
      // Wait for async call
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Verify the call was made with correct signature
      expect(spy).toHaveBeenCalledWith(
        'SECURITY_VIOLATION',
        'security_error',
        false,
        expect.objectContaining({
          userId: expect.any(Number),
          ipAddress: expect.any(String),
          userAgent: expect.any(String),
          resource: expect.any(String),
          metadata: expect.objectContaining({
            errorType: 'UnauthorizedError'
          })
        }),
        'Unauthorized access'
      );
      
      spy.mockRestore();
    });

    it('should handle missing user context gracefully', async () => {
      const spy = vi.spyOn(securityLogger, 'logSecurityEvent');
      
      // Remove user from request
      delete mockReq.user;
      
      // Add security context
      addSecurityContext(mockReq as Request, mockRes as Response, mockNext);
      
      // Call the rate limit logger
      logRateLimitExceeded(mockReq as Request, mockRes as Response, mockNext);
      
      // Wait for async call
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Verify the call was made even without user
      expect(spy).toHaveBeenCalledWith(
        'RATE_LIMIT_EXCEEDED',
        'rate_limit_exceeded',
        false,
        expect.objectContaining({
          userId: undefined,
          ipAddress: expect.any(String),
          userAgent: expect.any(String)
        }),
        'Rate limit exceeded'
      );
      
      spy.mockRestore();
    });
  });

  describe('Security context handling', () => {
    it('should add security context to request', () => {
      addSecurityContext(mockReq as Request, mockRes as Response, mockNext);
      
      expect((mockReq as any).securityContext).toBeDefined();
      expect((mockReq as any).securityContext.ipAddress).toBeDefined();
      expect((mockReq as any).securityContext.userAgent).toBeDefined();
      expect((mockReq as any).requestId).toBeDefined();
      expect(mockNext).toHaveBeenCalled();
    });

    it('should extract IP from X-Forwarded-For header', () => {
      mockReq.headers = {
        'x-forwarded-for': '192.168.1.1, 10.0.0.1'
      };
      
      addSecurityContext(mockReq as Request, mockRes as Response, mockNext);
      
      expect((mockReq as any).securityContext.ipAddress).toBe('192.168.1.1');
    });

    it('should extract IP from X-Real-IP header', () => {
      mockReq.headers = {
        'x-real-ip': '192.168.1.2'
      };
      
      addSecurityContext(mockReq as Request, mockRes as Response, mockNext);
      
      expect((mockReq as any).securityContext.ipAddress).toBe('192.168.1.2');
    });
  });
});
