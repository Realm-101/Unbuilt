/**
 * Authorization Tests
 * 
 * Tests for role-based access control, resource ownership validation,
 * admin permissions, permission denial scenarios, and cross-user access prevention.
 * 
 * Requirements: 4.3, 4.7
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mockRequest, mockResponse, mockNext } from '../mocks/express';
import { testUsers, generateTestUser } from '../fixtures/users';
import {
  addUserAuthorization,
  requirePermission,
  requireAnyPermission,
  requireAdmin,
  requireSuperAdmin,
  validateResourceOwnership,
  validateOwnResource,
  requireSelfOrAdmin,
  requireRole,
  logAuthorizationEvent,
} from '../../middleware/authorization';
import { AuthorizationService, Permission, UserRole } from '../../services/authorizationService';
import { AppError } from '../../middleware/errorHandler';

describe('Authorization Middleware', () => {
  describe('addUserAuthorization', () => {
    it('should add role and permissions to authenticated request', () => {
      const user = testUsers.freeUser;
      const req = mockRequest({ user });
      const res = mockResponse();
      const next = mockNext();

      addUserAuthorization(req as any, res as any, next);

      expect(req.userRole).toBeDefined();
      expect(req.userPermissions).toBeDefined();
      expect(Array.isArray(req.userPermissions)).toBe(true);
      expect(next).toHaveBeenCalledWith();
    });

    it('should continue without authorization for unauthenticated request', () => {
      const req = mockRequest({ user: undefined });
      const res = mockResponse();
      const next = mockNext();

      addUserAuthorization(req as any, res as any, next);

      expect(req.userRole).toBeUndefined();
      expect(req.userPermissions).toBeUndefined();
      expect(next).toHaveBeenCalledWith();
    });

    it('should handle errors gracefully', () => {
      const req = mockRequest({ user: null });
      const res = mockResponse();
      const next = mockNext();

      // Mock getUserRole to throw error
      vi.spyOn(AuthorizationService, 'getUserRole').mockImplementation(() => {
        throw new Error('Test error');
      });

      addUserAuthorization(req as any, res as any, next);

      expect(next).toHaveBeenCalledWith();
      vi.restoreAllMocks();
    });
  });

  describe('Role-Based Access Control', () => {
    describe('requirePermission', () => {
      it('should allow user with required permission', () => {
        const user = testUsers.freeUser;
        const req = mockRequest({ user });
        const res = mockResponse();
        const next = mockNext();

        const middleware = requirePermission(Permission.READ_OWN_DATA);
        middleware(req as any, res as any, next);

        expect(next).toHaveBeenCalledWith();
      });

      it('should deny user without required permission', () => {
        const user = testUsers.freeUser;
        const req = mockRequest({ user });
        const res = mockResponse();
        const next = mockNext();

        const middleware = requirePermission(Permission.MANAGE_USERS);
        middleware(req as any, res as any, next);

        expect(next).toHaveBeenCalled();
        const error = (next as any).mock.calls[0][0];
        expect(error).toBeInstanceOf(Error);
        expect(error.statusCode).toBe(403);
      });

      it('should require authentication', () => {
        const req = mockRequest({ user: undefined });
        const res = mockResponse();
        const next = mockNext();

        const middleware = requirePermission(Permission.READ_OWN_DATA);
        middleware(req as any, res as any, next);

        expect(next).toHaveBeenCalled();
        const error = (next as any).mock.calls[0][0];
        expect(error).toBeInstanceOf(Error);
        expect(error.statusCode).toBe(401);
      });
    });

    describe('requireAnyPermission', () => {
      it('should allow user with any of the required permissions', () => {
        const user = testUsers.freeUser;
        const req = mockRequest({ user });
        const res = mockResponse();
        const next = mockNext();

        const middleware = requireAnyPermission([
          Permission.MANAGE_USERS,
          Permission.READ_OWN_DATA,
        ]);
        middleware(req as any, res as any, next);

        expect(next).toHaveBeenCalledWith();
      });

      it('should deny user without any of the required permissions', () => {
        const user = testUsers.freeUser;
        const req = mockRequest({ user });
        const res = mockResponse();
        const next = mockNext();

        const middleware = requireAnyPermission([
          Permission.MANAGE_USERS,
          Permission.MANAGE_SYSTEM,
        ]);
        middleware(req as any, res as any, next);

        expect(next).toHaveBeenCalled();
        const error = (next as any).mock.calls[0][0];
        expect(error).toBeInstanceOf(Error);
        expect(error.statusCode).toBe(403);
      });
    });

    describe('requireRole', () => {
      it('should allow user with exact role', () => {
        const user = testUsers.adminUser;
        const req = mockRequest({ user });
        const res = mockResponse();
        const next = mockNext();

        const middleware = requireRole(UserRole.ADMIN);
        middleware(req as any, res as any, next);

        expect(next).toHaveBeenCalledWith();
      });

      it('should allow user with higher role', () => {
        const user = generateTestUser({ email: 'superadmin@example.com' });
        const req = mockRequest({ user });
        const res = mockResponse();
        const next = mockNext();

        const middleware = requireRole(UserRole.ADMIN);
        middleware(req as any, res as any, next);

        expect(next).toHaveBeenCalledWith();
      });

      it('should deny user with lower role', () => {
        const user = testUsers.freeUser;
        const req = mockRequest({ user });
        const res = mockResponse();
        const next = mockNext();

        const middleware = requireRole(UserRole.ADMIN);
        middleware(req as any, res as any, next);

        expect(next).toHaveBeenCalled();
        const error = (next as any).mock.calls[0][0];
        expect(error).toBeInstanceOf(Error);
        expect(error.statusCode).toBe(403);
        expect(error.message).toContain('admin role or higher required');
      });

      it('should require authentication', () => {
        const req = mockRequest({ user: undefined });
        const res = mockResponse();
        const next = mockNext();

        const middleware = requireRole(UserRole.USER);
        middleware(req as any, res as any, next);

        expect(next).toHaveBeenCalled();
        const error = (next as any).mock.calls[0][0];
        expect(error.statusCode).toBe(401);
      });
    });
  });

  describe('Admin Permissions', () => {
    describe('requireAdmin', () => {
      it('should allow admin user', () => {
        const user = testUsers.adminUser;
        const req = mockRequest({ user });
        const res = mockResponse();
        const next = mockNext();

        requireAdmin(req as any, res as any, next);

        expect(next).toHaveBeenCalledWith();
      });

      it('should allow super admin user', () => {
        const user = generateTestUser({ email: 'superadmin@example.com' });
        const req = mockRequest({ user });
        const res = mockResponse();
        const next = mockNext();

        requireAdmin(req as any, res as any, next);

        expect(next).toHaveBeenCalledWith();
      });

      it('should deny regular user', () => {
        const user = testUsers.freeUser;
        const req = mockRequest({ user });
        const res = mockResponse();
        const next = mockNext();

        requireAdmin(req as any, res as any, next);

        expect(next).toHaveBeenCalled();
        const error = (next as any).mock.calls[0][0];
        expect(error).toBeInstanceOf(Error);
        expect(error.statusCode).toBe(403);
        expect(error.message).toContain('administrator privileges required');
      });

      it('should require authentication', () => {
        const req = mockRequest({ user: undefined });
        const res = mockResponse();
        const next = mockNext();

        requireAdmin(req as any, res as any, next);

        expect(next).toHaveBeenCalled();
        const error = (next as any).mock.calls[0][0];
        expect(error.statusCode).toBe(401);
      });
    });

    describe('requireSuperAdmin', () => {
      it('should allow super admin user', () => {
        const user = generateTestUser({ email: 'superadmin@example.com' });
        const req = mockRequest({ user });
        const res = mockResponse();
        const next = mockNext();

        requireSuperAdmin(req as any, res as any, next);

        expect(next).toHaveBeenCalledWith();
      });

      it('should deny admin user', () => {
        const user = testUsers.adminUser;
        const req = mockRequest({ user });
        const res = mockResponse();
        const next = mockNext();

        requireSuperAdmin(req as any, res as any, next);

        expect(next).toHaveBeenCalled();
        const error = (next as any).mock.calls[0][0];
        expect(error).toBeInstanceOf(Error);
        expect(error.statusCode).toBe(403);
        expect(error.message).toContain('super administrator privileges required');
      });

      it('should deny regular user', () => {
        const user = testUsers.freeUser;
        const req = mockRequest({ user });
        const res = mockResponse();
        const next = mockNext();

        requireSuperAdmin(req as any, res as any, next);

        expect(next).toHaveBeenCalled();
        const error = (next as any).mock.calls[0][0];
        expect(error.statusCode).toBe(403);
      });
    });
  });

  describe('Resource Ownership Validation', () => {
    describe('validateResourceOwnership', () => {
      it('should allow user to access own resource', () => {
        const user = testUsers.freeUser;
        const req = mockRequest({
          user,
          params: { userId: user.id.toString() },
        });
        const res = mockResponse();
        const next = mockNext();

        const middleware = validateResourceOwnership('userId', 'read');
        middleware(req as any, res as any, next);

        expect(next).toHaveBeenCalledWith();
      });

      it('should allow admin to access other user resource for read', () => {
        const user = testUsers.adminUser;
        const req = mockRequest({
          user,
          params: { userId: '999' },
        });
        const res = mockResponse();
        const next = mockNext();

        const middleware = validateResourceOwnership('userId', 'read');
        middleware(req as any, res as any, next);

        expect(next).toHaveBeenCalledWith();
      });

      it('should deny regular user from accessing other user resource', () => {
        const user = testUsers.freeUser;
        const req = mockRequest({
          user,
          params: { userId: '999' },
        });
        const res = mockResponse();
        const next = mockNext();

        const middleware = validateResourceOwnership('userId', 'read');
        middleware(req as any, res as any, next);

        expect(next).toHaveBeenCalled();
        const error = (next as any).mock.calls[0][0];
        expect(error).toBeInstanceOf(Error);
        expect(error.statusCode).toBe(403);
        expect(error.message).toContain('insufficient permissions');
      });

      it('should allow super admin to modify other user resource', () => {
        const user = generateTestUser({ email: 'superadmin@example.com' });
        const req = mockRequest({
          user,
          params: { userId: '999' },
        });
        const res = mockResponse();
        const next = mockNext();

        const middleware = validateResourceOwnership('userId', 'write');
        middleware(req as any, res as any, next);

        expect(next).toHaveBeenCalledWith();
      });

      it('should deny admin from modifying other user resource', () => {
        const user = testUsers.adminUser;
        const req = mockRequest({
          user,
          params: { userId: '999' },
        });
        const res = mockResponse();
        const next = mockNext();

        const middleware = validateResourceOwnership('userId', 'write');
        middleware(req as any, res as any, next);

        expect(next).toHaveBeenCalled();
        const error = (next as any).mock.calls[0][0];
        expect(error.statusCode).toBe(403);
      });

      it('should allow super admin to delete other user resource', () => {
        const user = generateTestUser({ email: 'superadmin@example.com' });
        const req = mockRequest({
          user,
          params: { userId: '999' },
        });
        const res = mockResponse();
        const next = mockNext();

        const middleware = validateResourceOwnership('userId', 'delete');
        middleware(req as any, res as any, next);

        expect(next).toHaveBeenCalledWith();
      });

      it('should find userId in request body', () => {
        const user = testUsers.freeUser;
        const req = mockRequest({
          user,
          body: { userId: user.id },
        });
        const res = mockResponse();
        const next = mockNext();

        const middleware = validateResourceOwnership('userId', 'read');
        middleware(req as any, res as any, next);

        expect(next).toHaveBeenCalledWith();
      });

      it('should find userId in query params', () => {
        const user = testUsers.freeUser;
        const req = mockRequest({
          user,
          query: { userId: user.id.toString() },
        });
        const res = mockResponse();
        const next = mockNext();

        const middleware = validateResourceOwnership('userId', 'read');
        middleware(req as any, res as any, next);

        expect(next).toHaveBeenCalledWith();
      });

      it('should return error if userId parameter not found', () => {
        const user = testUsers.freeUser;
        const req = mockRequest({ user });
        const res = mockResponse();
        const next = mockNext();

        const middleware = validateResourceOwnership('userId', 'read');
        middleware(req as any, res as any, next);

        expect(next).toHaveBeenCalled();
        const error = (next as any).mock.calls[0][0];
        expect(error).toBeInstanceOf(Error);
        expect(error.statusCode).toBe(400);
        expect(error.message).toContain('not found');
      });

      it('should return error if userId is invalid format', () => {
        const user = testUsers.freeUser;
        const req = mockRequest({
          user,
          params: { userId: 'invalid' },
        });
        const res = mockResponse();
        const next = mockNext();

        const middleware = validateResourceOwnership('userId', 'read');
        middleware(req as any, res as any, next);

        expect(next).toHaveBeenCalled();
        const error = (next as any).mock.calls[0][0];
        expect(error.statusCode).toBe(400);
        expect(error.message).toContain('Invalid user ID');
      });
    });

    describe('validateOwnResource', () => {
      it('should allow user to access own resource', async () => {
        const user = testUsers.freeUser;
        const resource = { id: 1, userId: user.id, name: 'Test Resource' };
        const req = mockRequest({ user });
        (req as any).resource = resource;
        const res = mockResponse();
        const next = mockNext();

        const middleware = validateOwnResource('read');
        await middleware(req as any, res as any, next);

        expect(next).toHaveBeenCalledWith();
      });

      it('should deny user from accessing other user resource', async () => {
        const user = testUsers.freeUser;
        const resource = { id: 1, userId: 999, name: 'Test Resource' };
        const req = mockRequest({ user });
        (req as any).resource = resource;
        const res = mockResponse();
        const next = mockNext();

        const middleware = validateOwnResource('read');
        await middleware(req as any, res as any, next);

        expect(next).toHaveBeenCalled();
        const error = (next as any).mock.calls[0][0];
        expect(error).toBeInstanceOf(Error);
        expect(error.statusCode).toBe(403);
      });

      it('should return error if resource not loaded', async () => {
        const user = testUsers.freeUser;
        const req = mockRequest({ user });
        const res = mockResponse();
        const next = mockNext();

        const middleware = validateOwnResource('read');
        await middleware(req as any, res as any, next);

        expect(next).toHaveBeenCalled();
        const error = (next as any).mock.calls[0][0];
        expect(error.statusCode).toBe(400);
        expect(error.message).toContain('not loaded');
      });

      it('should return error if resource has no ownership info', async () => {
        const user = testUsers.freeUser;
        const resource = { id: 1, name: 'Test Resource' };
        const req = mockRequest({ user });
        (req as any).resource = resource;
        const res = mockResponse();
        const next = mockNext();

        const middleware = validateOwnResource('read');
        await middleware(req as any, res as any, next);

        expect(next).toHaveBeenCalled();
        const error = (next as any).mock.calls[0][0];
        expect(error.statusCode).toBe(400);
        expect(error.message).toContain('ownership information');
      });
    });

    describe('requireSelfOrAdmin', () => {
      it('should allow user to access own data', () => {
        const user = testUsers.freeUser;
        const req = mockRequest({
          user,
          params: { userId: user.id.toString() },
        });
        const res = mockResponse();
        const next = mockNext();

        requireSelfOrAdmin(req as any, res as any, next);

        expect(next).toHaveBeenCalledWith();
      });

      it('should allow admin to access other user data', () => {
        const user = testUsers.adminUser;
        const req = mockRequest({
          user,
          params: { userId: '999' },
        });
        const res = mockResponse();
        const next = mockNext();

        requireSelfOrAdmin(req as any, res as any, next);

        expect(next).toHaveBeenCalledWith();
      });

      it('should deny regular user from accessing other user data', () => {
        const user = testUsers.freeUser;
        const req = mockRequest({
          user,
          params: { userId: '999' },
        });
        const res = mockResponse();
        const next = mockNext();

        requireSelfOrAdmin(req as any, res as any, next);

        expect(next).toHaveBeenCalled();
        const error = (next as any).mock.calls[0][0];
        expect(error).toBeInstanceOf(Error);
        expect(error.statusCode).toBe(403);
        expect(error.message).toContain('own resources or admin');
      });

      it('should work with id parameter', () => {
        const user = testUsers.freeUser;
        const req = mockRequest({
          user,
          params: { id: user.id.toString() },
        });
        const res = mockResponse();
        const next = mockNext();

        requireSelfOrAdmin(req as any, res as any, next);

        expect(next).toHaveBeenCalledWith();
      });

      it('should return error for invalid user ID', () => {
        const user = testUsers.freeUser;
        const req = mockRequest({
          user,
          params: { userId: 'invalid' },
        });
        const res = mockResponse();
        const next = mockNext();

        requireSelfOrAdmin(req as any, res as any, next);

        expect(next).toHaveBeenCalled();
        const error = (next as any).mock.calls[0][0];
        expect(error.statusCode).toBe(400);
      });
    });
  });

  describe('Cross-User Access Prevention', () => {
    it('should prevent user from reading another user data', () => {
      const user1 = testUsers.freeUser;
      const user2 = testUsers.proUser;
      const req = mockRequest({
        user: user1,
        params: { userId: user2.id.toString() },
      });
      const res = mockResponse();
      const next = mockNext();

      const middleware = validateResourceOwnership('userId', 'read');
      middleware(req as any, res as any, next);

      expect(next).toHaveBeenCalled();
      const error = (next as any).mock.calls[0][0];
      expect(error).toBeInstanceOf(Error);
      expect(error.statusCode).toBe(403);
    });

    it('should prevent user from modifying another user data', () => {
      const user1 = testUsers.freeUser;
      const user2 = testUsers.proUser;
      const req = mockRequest({
        user: user1,
        params: { userId: user2.id.toString() },
      });
      const res = mockResponse();
      const next = mockNext();

      const middleware = validateResourceOwnership('userId', 'write');
      middleware(req as any, res as any, next);

      expect(next).toHaveBeenCalled();
      const error = (next as any).mock.calls[0][0];
      expect(error.statusCode).toBe(403);
    });

    it('should prevent user from deleting another user data', () => {
      const user1 = testUsers.freeUser;
      const user2 = testUsers.proUser;
      const req = mockRequest({
        user: user1,
        params: { userId: user2.id.toString() },
      });
      const res = mockResponse();
      const next = mockNext();

      const middleware = validateResourceOwnership('userId', 'delete');
      middleware(req as any, res as any, next);

      expect(next).toHaveBeenCalled();
      const error = (next as any).mock.calls[0][0];
      expect(error.statusCode).toBe(403);
    });

    it('should prevent non-admin from accessing admin-only resources', () => {
      const user = testUsers.freeUser;
      const req = mockRequest({ user });
      const res = mockResponse();
      const next = mockNext();

      const middleware = requirePermission(Permission.MANAGE_USERS);
      middleware(req as any, res as any, next);

      expect(next).toHaveBeenCalled();
      const error = (next as any).mock.calls[0][0];
      expect(error.statusCode).toBe(403);
    });

    it('should prevent admin from accessing super-admin-only resources', () => {
      const user = testUsers.adminUser;
      const req = mockRequest({ user });
      const res = mockResponse();
      const next = mockNext();

      const middleware = requirePermission(Permission.MANAGE_SYSTEM);
      middleware(req as any, res as any, next);

      expect(next).toHaveBeenCalled();
      const error = (next as any).mock.calls[0][0];
      expect(error.statusCode).toBe(403);
    });
  });

  describe('Permission Denial Scenarios', () => {
    it('should deny unauthenticated access to protected resources', () => {
      const req = mockRequest({ user: undefined });
      const res = mockResponse();
      const next = mockNext();

      const middleware = requirePermission(Permission.READ_OWN_DATA);
      middleware(req as any, res as any, next);

      expect(next).toHaveBeenCalled();
      const error = (next as any).mock.calls[0][0];
      expect(error.statusCode).toBe(401);
      expect(error.code).toBe('AUTH_REQUIRED');
    });

    it('should deny access when user lacks specific permission', () => {
      const user = testUsers.freeUser;
      const req = mockRequest({ user });
      const res = mockResponse();
      const next = mockNext();

      const middleware = requirePermission(Permission.VIEW_SECURITY_LOGS);
      middleware(req as any, res as any, next);

      expect(next).toHaveBeenCalled();
      const error = (next as any).mock.calls[0][0];
      expect(error.statusCode).toBe(403);
      expect(error.code).toBe('PERMISSION_DENIED');
    });

    it('should deny access when user lacks all required permissions', () => {
      const user = testUsers.freeUser;
      const req = mockRequest({ user });
      const res = mockResponse();
      const next = mockNext();

      const middleware = requireAnyPermission([
        Permission.MANAGE_USERS,
        Permission.MANAGE_SYSTEM,
        Permission.VIEW_SECURITY_LOGS,
      ]);
      middleware(req as any, res as any, next);

      expect(next).toHaveBeenCalled();
      const error = (next as any).mock.calls[0][0];
      expect(error.statusCode).toBe(403);
    });

    it('should deny access when role is insufficient', () => {
      const user = testUsers.freeUser;
      const req = mockRequest({ user });
      const res = mockResponse();
      const next = mockNext();

      const middleware = requireRole(UserRole.SUPER_ADMIN);
      middleware(req as any, res as any, next);

      expect(next).toHaveBeenCalled();
      const error = (next as any).mock.calls[0][0];
      expect(error.statusCode).toBe(403);
      expect(error.code).toBe('INSUFFICIENT_ROLE');
    });

    it('should deny cross-user resource access', () => {
      const user = testUsers.freeUser;
      const req = mockRequest({
        user,
        params: { userId: '999' },
      });
      const res = mockResponse();
      const next = mockNext();

      requireSelfOrAdmin(req as any, res as any, next);

      expect(next).toHaveBeenCalled();
      const error = (next as any).mock.calls[0][0];
      expect(error.statusCode).toBe(403);
      expect(error.code).toBe('SELF_OR_ADMIN_REQUIRED');
    });
  });

  describe('logAuthorizationEvent', () => {
    it('should log authorization event for authenticated user', () => {
      const user = testUsers.freeUser;
      const req = mockRequest({
        user,
        originalUrl: '/api/test',
      });
      req.userRole = UserRole.USER;
      const res = mockResponse();
      const next = mockNext();
      const consoleSpy = vi.spyOn(console, 'log');

      const middleware = logAuthorizationEvent('test_action');
      middleware(req as any, res as any, next);

      expect(consoleSpy).toHaveBeenCalled();
      expect(next).toHaveBeenCalledWith();
      consoleSpy.mockRestore();
    });

    it('should continue without logging for unauthenticated user', () => {
      const req = mockRequest({ user: undefined });
      const res = mockResponse();
      const next = mockNext();

      const middleware = logAuthorizationEvent('test_action');
      middleware(req as any, res as any, next);

      expect(next).toHaveBeenCalledWith();
    });

    it('should continue even if logging fails', () => {
      const user = testUsers.freeUser;
      const req = mockRequest({ user });
      const res = mockResponse();
      const next = mockNext();
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {
        throw new Error('Logging failed');
      });

      const middleware = logAuthorizationEvent('test_action');
      middleware(req as any, res as any, next);

      expect(next).toHaveBeenCalledWith();
      consoleSpy.mockRestore();
    });
  });
});
