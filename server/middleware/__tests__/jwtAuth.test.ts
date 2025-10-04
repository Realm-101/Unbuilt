import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import { 
  jwtAuth, 
  optionalJwtAuth, 
  requireRole, 
  requireOwnership,
  requireAdminOrOwnership,
  authRateLimit
} from '../jwtAuth';
import { jwtService } from '../../jwt';
import { authService } from '../../auth';
import { AppError } from '../errorHandler';

// Mock dependencies
vi.mock('../../jwt', () => ({
  jwtService: {
    extractTokenFromHeader: vi.fn(),
    validateToken: vi.fn()
  }
}));

vi.mock('../../auth', () => ({
  authService: {
    getUserById: vi.fn()
  }
}));

describe('JWT Auth Middleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;
  let jsonMock: ReturnType<typeof vi.fn>;
  let statusMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    jsonMock = vi.fn();
    statusMock = vi.fn().mockReturnValue({ json: jsonMock });
    
    mockReq = {
      headers: {},
      params: {},
      body: {},
      query: {}
    };
    
    mockRes = {
      status: statusMock,
      json: jsonMock
    };
    
    mockNext = vi.fn();
    
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('jwtAuth', () => {
    it('should return error when no token is provided', async () => {
      vi.mocked(jwtService.extractTokenFromHeader).mockReturnValue(null);

      await jwtAuth(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'No token provided',
          code: 'AUTH_NO_TOKEN'
        })
      );
    });

    it('should return error when token is invalid', async () => {
      mockReq.headers = { authorization: 'Bearer invalid-token' };
      vi.mocked(jwtService.extractTokenFromHeader).mockReturnValue('invalid-token');
      vi.mocked(jwtService.validateToken).mockResolvedValue(null);

      await jwtAuth(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Invalid or expired token',
          code: 'AUTH_INVALID_TOKEN'
        })
      );
    });

    it('should return error when user is not found', async () => {
      const mockPayload = { sub: '1', jti: 'token-id' };
      mockReq.headers = { authorization: 'Bearer valid-token' };
      
      vi.mocked(jwtService.extractTokenFromHeader).mockReturnValue('valid-token');
      vi.mocked(jwtService.validateToken).mockResolvedValue(mockPayload as any);
      vi.mocked(authService.getUserById).mockResolvedValue(null);

      await jwtAuth(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'User account not found or inactive',
          code: 'AUTH_USER_INACTIVE'
        })
      );
    });

    it('should return error when user is inactive', async () => {
      const mockPayload = { sub: '1', jti: 'token-id' };
      const mockUser = {
        id: 1,
        email: 'test@example.com',
        isActive: false
      };
      
      mockReq.headers = { authorization: 'Bearer valid-token' };
      vi.mocked(jwtService.extractTokenFromHeader).mockReturnValue('valid-token');
      vi.mocked(jwtService.validateToken).mockResolvedValue(mockPayload as any);
      vi.mocked(authService.getUserById).mockResolvedValue(mockUser as any);

      await jwtAuth(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'User account not found or inactive',
          code: 'AUTH_USER_INACTIVE'
        })
      );
    });

    it('should attach user to request when token is valid', async () => {
      const mockPayload = { sub: '1', jti: 'token-id' };
      const mockUser = {
        id: 1,
        email: 'test@example.com',
        plan: 'pro',
        isActive: true
      };
      
      mockReq.headers = { authorization: 'Bearer valid-token' };
      vi.mocked(jwtService.extractTokenFromHeader).mockReturnValue('valid-token');
      vi.mocked(jwtService.validateToken).mockResolvedValue(mockPayload as any);
      vi.mocked(authService.getUserById).mockResolvedValue(mockUser as any);

      await jwtAuth(mockReq as Request, mockRes as Response, mockNext);

      expect(mockReq.user).toEqual({ ...mockUser, jti: 'token-id' });
      expect(mockReq.token).toBe('valid-token');
      expect(mockReq.jti).toBe('token-id');
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should handle errors gracefully', async () => {
      mockReq.headers = { authorization: 'Bearer error-token' };
      vi.mocked(jwtService.extractTokenFromHeader).mockImplementation(() => {
        throw new Error('Extraction error');
      });

      await jwtAuth(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Internal server error during authentication',
          code: 'AUTH_SYSTEM_ERROR'
        })
      );
    });
  });

  describe('optionalJwtAuth', () => {
    it('should continue without user when no token is provided', async () => {
      vi.mocked(jwtService.extractTokenFromHeader).mockReturnValue(null);

      await optionalJwtAuth(mockReq as Request, mockRes as Response, mockNext);

      expect(mockReq.user).toBeUndefined();
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should continue without user when token is invalid', async () => {
      mockReq.headers = { authorization: 'Bearer invalid-token' };
      vi.mocked(jwtService.extractTokenFromHeader).mockReturnValue('invalid-token');
      vi.mocked(jwtService.validateToken).mockResolvedValue(null);

      await optionalJwtAuth(mockReq as Request, mockRes as Response, mockNext);

      expect(mockReq.user).toBeUndefined();
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should attach user when token is valid', async () => {
      const mockPayload = { sub: '1', jti: 'token-id' };
      const mockUser = {
        id: 1,
        email: 'test@example.com',
        plan: 'pro',
        isActive: true
      };
      
      mockReq.headers = { authorization: 'Bearer valid-token' };
      vi.mocked(jwtService.extractTokenFromHeader).mockReturnValue('valid-token');
      vi.mocked(jwtService.validateToken).mockResolvedValue(mockPayload as any);
      vi.mocked(authService.getUserById).mockResolvedValue(mockUser as any);

      await optionalJwtAuth(mockReq as Request, mockRes as Response, mockNext);

      expect(mockReq.user).toEqual({ ...mockUser, jti: 'token-id' });
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should continue even if error occurs', async () => {
      mockReq.headers = { authorization: 'Bearer error-token' };
      vi.mocked(jwtService.extractTokenFromHeader).mockImplementation(() => {
        throw new Error('Extraction error');
      });

      await optionalJwtAuth(mockReq as Request, mockRes as Response, mockNext);

      expect(mockReq.user).toBeUndefined();
      expect(mockNext).toHaveBeenCalledWith();
    });
  });

  describe('requireRole', () => {
    it('should return error when user is not authenticated', () => {
      mockReq.user = undefined;
      const middleware = requireRole('pro');

      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'User not authenticated',
          code: 'AUTH_NOT_AUTHENTICATED'
        })
      );
    });

    it('should allow access when user has required role', () => {
      mockReq.user = {
        id: 1,
        email: 'test@example.com',
        plan: 'pro',
        isActive: true
      } as any;
      
      const middleware = requireRole('pro');
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should allow access when user has one of multiple required roles', () => {
      mockReq.user = {
        id: 1,
        email: 'test@example.com',
        plan: 'enterprise',
        isActive: true
      } as any;
      
      const middleware = requireRole(['pro', 'enterprise']);
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should deny access when user lacks required role', () => {
      mockReq.user = {
        id: 1,
        email: 'test@example.com',
        plan: 'free',
        isActive: true
      } as any;
      
      const middleware = requireRole('pro');
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Insufficient permissions',
          code: 'AUTHZ_INSUFFICIENT_PERMISSIONS'
        })
      );
    });
  });

  describe('requireOwnership', () => {
    it('should return 401 when user is not authenticated', () => {
      mockReq.user = undefined;
      mockReq.params = { userId: '1' };
      
      const middleware = requireOwnership();
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Authentication required',
          code: 'NOT_AUTHENTICATED'
        })
      );
    });

    it('should return 400 when userId parameter is missing', () => {
      mockReq.user = { id: 1 } as any;
      mockReq.params = {};
      
      const middleware = requireOwnership();
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Bad request',
          code: 'MISSING_USER_ID'
        })
      );
    });

    it('should allow access when user owns the resource', () => {
      mockReq.user = { id: 1 } as any;
      mockReq.params = { userId: '1' };
      
      const middleware = requireOwnership();
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should deny access when user does not own the resource', () => {
      mockReq.user = { id: 1 } as any;
      mockReq.params = { userId: '2' };
      
      const middleware = requireOwnership();
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Access denied',
          code: 'RESOURCE_ACCESS_DENIED'
        })
      );
    });

    it('should check userId in body when not in params', () => {
      mockReq.user = { id: 1 } as any;
      mockReq.params = {};
      mockReq.body = { userId: '1' };
      
      const middleware = requireOwnership();
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should check userId in query when not in params or body', () => {
      mockReq.user = { id: 1 } as any;
      mockReq.params = {};
      mockReq.body = {};
      mockReq.query = { userId: '1' };
      
      const middleware = requireOwnership();
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should use custom parameter name', () => {
      mockReq.user = { id: 1 } as any;
      mockReq.params = { ownerId: '1' };
      
      const middleware = requireOwnership('ownerId');
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
    });
  });

  describe('requireAdminOrOwnership', () => {
    it('should allow admin access regardless of ownership', () => {
      mockReq.user = { id: 1, plan: 'admin' } as any;
      mockReq.params = { userId: '2' };
      
      const middleware = requireAdminOrOwnership();
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should allow enterprise access regardless of ownership', () => {
      mockReq.user = { id: 1, plan: 'enterprise' } as any;
      mockReq.params = { userId: '2' };
      
      const middleware = requireAdminOrOwnership();
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should allow owner access', () => {
      mockReq.user = { id: 1, plan: 'free' } as any;
      mockReq.params = { userId: '1' };
      
      const middleware = requireAdminOrOwnership();
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should deny non-admin non-owner access', () => {
      mockReq.user = { id: 1, plan: 'free' } as any;
      mockReq.params = { userId: '2' };
      
      const middleware = requireAdminOrOwnership();
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Access denied',
          code: 'ADMIN_OR_OWNER_REQUIRED'
        })
      );
    });
  });

  describe('authRateLimit', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should allow first request', () => {
      mockReq.ip = '127.0.0.1';
      const middleware = authRateLimit(5, 15 * 60 * 1000);

      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should allow requests within limit', () => {
      mockReq.ip = '127.0.0.1';
      const middleware = authRateLimit(5, 15 * 60 * 1000);

      // Make 5 requests
      for (let i = 0; i < 5; i++) {
        middleware(mockReq as Request, mockRes as Response, mockNext);
      }

      expect(mockNext).toHaveBeenCalledTimes(5);
    });

    it('should block requests exceeding limit', () => {
      mockReq.ip = '127.0.0.1';
      const middleware = authRateLimit(5, 15 * 60 * 1000);

      // Make 5 requests (should all succeed)
      for (let i = 0; i < 5; i++) {
        middleware(mockReq as Request, mockRes as Response, mockNext);
      }

      // 6th request should be blocked
      mockNext.mockClear();
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Rate limit exceeded. Please try again later.',
          code: 'RATE_LIMIT_EXCEEDED'
        })
      );
    });

    it('should reset counter after window expires', () => {
      mockReq.ip = '127.0.0.1';
      const windowMs = 15 * 60 * 1000;
      const middleware = authRateLimit(5, windowMs);

      // Make 5 requests
      for (let i = 0; i < 5; i++) {
        middleware(mockReq as Request, mockRes as Response, mockNext);
      }

      // Advance time past window
      vi.advanceTimersByTime(windowMs + 1000);

      // Next request should succeed
      mockNext.mockClear();
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should track different IPs separately', () => {
      const middleware = authRateLimit(5, 15 * 60 * 1000);

      // Make 5 requests from IP 1
      mockReq.ip = '127.0.0.1';
      for (let i = 0; i < 5; i++) {
        middleware(mockReq as Request, mockRes as Response, mockNext);
      }

      // Request from IP 2 should succeed
      mockReq.ip = '192.168.1.1';
      mockNext.mockClear();
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
    });
  });
});
