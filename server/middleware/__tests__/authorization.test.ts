import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import {
  addUserAuthorization,
  requirePermission,
  requireAnyPermission,
  requireAdmin,
  requireSuperAdmin,
  validateResourceOwnership,
  validateOwnResource,
  requireSelfOrAdmin,
  logAuthorizationEvent,
  requireRole,
  requireTeamAccess
} from '../authorization';
import { AuthorizationService, UserRole } from '../../services/authorizationService';
import { AppError } from '../errorHandler';

// Mock AuthorizationService
vi.mock('../../services/authorizationService', () => ({
  AuthorizationService: {
    getUserRole: vi.fn(),
    getUserPermissions: vi.fn(),
    requirePermission: vi.fn(),
    requireAnyPermission: vi.fn(),
    requireAdmin: vi.fn(),
    requireSuperAdmin: vi.fn(),
    validateResourceOwnership: vi.fn(),
    isAdmin: vi.fn(),
    isSuperAdmin: vi.fn()
  },
  UserRole: {
    USER: 'USER',
    ADMIN: 'ADMIN',
    SUPER_ADMIN: 'SUPER_ADMIN'
  }
}));

describe('Authorization Middleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;
  let jsonMock: ReturnType<typeof vi.fn>;
  let statusMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    jsonMock = vi.fn();
    statusMock = vi.fn().mockReturnValue({ json: jsonMock });
    
    mockReq = {
      params: {},
      body: {},
      query: {},
      originalUrl: '/api/test'
    };
    
    mockRes = {
      status: statusMock,
      json: jsonMock
    };
    
    mockNext = vi.fn();
    
    vi.clearAllMocks();
  });

  describe('addUserAuthorization', () => {
    it('should add role and permissions when user exists', () => {
      const mockUser = { id: 1, email: 'test@example.com' };
      mockReq.user = mockUser as any;
      
      vi.mocked(AuthorizationService.getUserRole).mockReturnValue(UserRole.USER);
      vi.mocked(AuthorizationService.getUserPermissions).mockReturnValue(['users:read']);

      addUserAuthorization(mockReq as Request, mockRes as Response, mockNext);

      expect(mockReq.userRole).toBe(UserRole.USER);
      expect(mockReq.userPermissions).toEqual(['users:read']);
      expect(mockNext).toHaveBeenCalled();
    });

    it('should continue without adding authorization when user does not exist', () => {
      mockReq.user = undefined;

      addUserAuthorization(mockReq as Request, mockRes as Response, mockNext);

      expect(mockReq.userRole).toBeUndefined();
      expect(mockReq.userPermissions).toBeUndefined();
      expect(mockNext).toHaveBeenCalled();
    });

    it('should continue even if error occurs', () => {
      mockReq.user = { id: 1 } as any;
      vi.mocked(AuthorizationService.getUserRole).mockImplementation(() => {
        throw new Error('Service error');
      });

      addUserAuthorization(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('requirePermission', () => {
    it('should call next when user has required permission', () => {
      mockReq.user = { id: 1 } as any;
      vi.mocked(AuthorizationService.requirePermission).mockReturnValue(undefined);

      const middleware = requirePermission('users:read');
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(AuthorizationService.requirePermission).toHaveBeenCalledWith(mockReq.user, 'users:read');
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should return error when user is not authenticated', () => {
      mockReq.user = undefined;

      const middleware = requirePermission('users:read');
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Authentication required',
          code: 'AUTH_REQUIRED'
        })
      );
    });

    it('should pass error to next when permission check fails', () => {
      mockReq.user = { id: 1 } as any;
      const error = new Error('Permission denied');
      vi.mocked(AuthorizationService.requirePermission).mockImplementation(() => {
        throw error;
      });

      const middleware = requirePermission('users:delete');
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('requireAnyPermission', () => {
    it('should call next when user has at least one required permission', () => {
      mockReq.user = { id: 1 } as any;
      vi.mocked(AuthorizationService.requireAnyPermission).mockReturnValue(undefined);

      const middleware = requireAnyPermission(['users:read', 'users:write']);
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(AuthorizationService.requireAnyPermission).toHaveBeenCalledWith(
        mockReq.user,
        ['users:read', 'users:write']
      );
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should return error when user is not authenticated', () => {
      mockReq.user = undefined;

      const middleware = requireAnyPermission(['users:read', 'users:write']);
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Authentication required',
          code: 'AUTH_REQUIRED'
        })
      );
    });
  });

  describe('requireAdmin', () => {
    it('should call next when user is admin', () => {
      mockReq.user = { id: 1 } as any;
      vi.mocked(AuthorizationService.requireAdmin).mockReturnValue(undefined);

      requireAdmin(mockReq as Request, mockRes as Response, mockNext);

      expect(AuthorizationService.requireAdmin).toHaveBeenCalledWith(mockReq.user);
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should return error when user is not authenticated', () => {
      mockReq.user = undefined;

      requireAdmin(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Authentication required',
          code: 'AUTH_REQUIRED'
        })
      );
    });

    it('should pass error when admin check fails', () => {
      mockReq.user = { id: 1 } as any;
      const error = new Error('Not admin');
      vi.mocked(AuthorizationService.requireAdmin).mockImplementation(() => {
        throw error;
      });

      requireAdmin(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('requireSuperAdmin', () => {
    it('should call next when user is super admin', () => {
      mockReq.user = { id: 1 } as any;
      vi.mocked(AuthorizationService.requireSuperAdmin).mockReturnValue(undefined);

      requireSuperAdmin(mockReq as Request, mockRes as Response, mockNext);

      expect(AuthorizationService.requireSuperAdmin).toHaveBeenCalledWith(mockReq.user);
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should return error when user is not authenticated', () => {
      mockReq.user = undefined;

      requireSuperAdmin(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Authentication required',
          code: 'AUTH_REQUIRED'
        })
      );
    });
  });

  describe('validateResourceOwnership', () => {
    it('should validate ownership from params', () => {
      mockReq.user = { id: 1 } as any;
      mockReq.params = { userId: '1' };
      vi.mocked(AuthorizationService.validateResourceOwnership).mockReturnValue(undefined);

      const middleware = validateResourceOwnership();
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(AuthorizationService.validateResourceOwnership).toHaveBeenCalledWith(
        mockReq.user,
        1,
        'read'
      );
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should validate ownership from body', () => {
      mockReq.user = { id: 1 } as any;
      mockReq.body = { userId: '1' };
      vi.mocked(AuthorizationService.validateResourceOwnership).mockReturnValue(undefined);

      const middleware = validateResourceOwnership();
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(AuthorizationService.validateResourceOwnership).toHaveBeenCalledWith(
        mockReq.user,
        1,
        'read'
      );
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should validate ownership from query', () => {
      mockReq.user = { id: 1 } as any;
      mockReq.query = { userId: '1' };
      vi.mocked(AuthorizationService.validateResourceOwnership).mockReturnValue(undefined);

      const middleware = validateResourceOwnership();
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(AuthorizationService.validateResourceOwnership).toHaveBeenCalledWith(
        mockReq.user,
        1,
        'read'
      );
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should return error when userId is missing', () => {
      mockReq.user = { id: 1 } as any;

      const middleware = validateResourceOwnership();
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "User ID parameter 'userId' not found",
          code: 'MISSING_USER_ID'
        })
      );
    });

    it('should return error when userId is invalid', () => {
      mockReq.user = { id: 1 } as any;
      mockReq.params = { userId: 'invalid' };

      const middleware = validateResourceOwnership();
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Invalid user ID format',
          code: 'INVALID_USER_ID'
        })
      );
    });

    it('should use custom parameter name', () => {
      mockReq.user = { id: 1 } as any;
      mockReq.params = { ownerId: '1' };
      vi.mocked(AuthorizationService.validateResourceOwnership).mockReturnValue(undefined);

      const middleware = validateResourceOwnership('ownerId', 'write');
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(AuthorizationService.validateResourceOwnership).toHaveBeenCalledWith(
        mockReq.user,
        1,
        'write'
      );
    });
  });

  describe('validateOwnResource', () => {
    it('should validate ownership of loaded resource', async () => {
      mockReq.user = { id: 1 } as any;
      (mockReq as any).resource = { userId: 1, name: 'Test' };
      vi.mocked(AuthorizationService.validateResourceOwnership).mockReturnValue(undefined);

      const middleware = validateOwnResource('read');
      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(AuthorizationService.validateResourceOwnership).toHaveBeenCalledWith(
        mockReq.user,
        1,
        'read'
      );
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should return error when resource is not loaded', async () => {
      mockReq.user = { id: 1 } as any;

      const middleware = validateOwnResource();
      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Resource not found or not loaded',
          code: 'RESOURCE_NOT_LOADED'
        })
      );
    });

    it('should return error when resource has no ownership info', async () => {
      mockReq.user = { id: 1 } as any;
      (mockReq as any).resource = { name: 'Test' };

      const middleware = validateOwnResource();
      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Resource does not have ownership information',
          code: 'NO_OWNERSHIP_INFO'
        })
      );
    });
  });

  describe('requireSelfOrAdmin', () => {
    it('should allow user to access own data', () => {
      mockReq.user = { id: 1 } as any;
      mockReq.params = { userId: '1' };
      vi.mocked(AuthorizationService.isAdmin).mockReturnValue(false);

      requireSelfOrAdmin(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should allow admin to access any user data', () => {
      mockReq.user = { id: 1 } as any;
      mockReq.params = { userId: '2' };
      vi.mocked(AuthorizationService.isAdmin).mockReturnValue(true);

      requireSelfOrAdmin(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should deny non-admin access to other user data', () => {
      mockReq.user = { id: 1 } as any;
      mockReq.params = { userId: '2' };
      vi.mocked(AuthorizationService.isAdmin).mockReturnValue(false);

      requireSelfOrAdmin(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Access denied: can only access own resources or admin privileges required',
          code: 'SELF_OR_ADMIN_REQUIRED'
        })
      );
    });

    it('should check id param if userId not present', () => {
      mockReq.user = { id: 1 } as any;
      mockReq.params = { id: '1' };
      vi.mocked(AuthorizationService.isAdmin).mockReturnValue(false);

      requireSelfOrAdmin(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
    });
  });

  describe('logAuthorizationEvent', () => {
    it('should log authorization event and continue', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      mockReq.user = { id: 1 } as any;
      mockReq.userRole = UserRole.USER;

      const middleware = logAuthorizationEvent('delete_user');
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('User 1 (USER) attempting delete_user')
      );
      expect(mockNext).toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });

    it('should continue even if logging fails', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {
        throw new Error('Logging error');
      });
      mockReq.user = { id: 1 } as any;

      const middleware = logAuthorizationEvent('test_action');
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });
  });

  describe('requireRole', () => {
    it('should allow access when user has required role', () => {
      mockReq.user = { id: 1 } as any;
      vi.mocked(AuthorizationService.getUserRole).mockReturnValue(UserRole.ADMIN);

      const middleware = requireRole(UserRole.ADMIN);
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should allow access when user has higher role', () => {
      mockReq.user = { id: 1 } as any;
      vi.mocked(AuthorizationService.getUserRole).mockReturnValue(UserRole.SUPER_ADMIN);

      const middleware = requireRole(UserRole.ADMIN);
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should deny access when user has lower role', () => {
      mockReq.user = { id: 1 } as any;
      vi.mocked(AuthorizationService.getUserRole).mockReturnValue(UserRole.USER);

      const middleware = requireRole(UserRole.ADMIN);
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Access denied: ADMIN role or higher required',
          code: 'INSUFFICIENT_ROLE'
        })
      );
    });
  });

  describe('requireTeamAccess', () => {
    it('should allow super admin access to any team', async () => {
      mockReq.user = { id: 1 } as any;
      mockReq.params = { teamId: '5' };
      vi.mocked(AuthorizationService.isSuperAdmin).mockReturnValue(true);

      const middleware = requireTeamAccess('read');
      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should return error when teamId is invalid', async () => {
      mockReq.user = { id: 1 } as any;
      mockReq.params = { teamId: 'invalid' };
      vi.mocked(AuthorizationService.isSuperAdmin).mockReturnValue(false);

      const middleware = requireTeamAccess('read');
      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Invalid team ID',
          code: 'INVALID_TEAM_ID'
        })
      );
    });

    it('should check teamId in body if not in params', async () => {
      mockReq.user = { id: 1 } as any;
      mockReq.body = { teamId: '5' };
      vi.mocked(AuthorizationService.isSuperAdmin).mockReturnValue(true);

      const middleware = requireTeamAccess('write');
      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
    });
  });
});
