/**
 * Authorization Service Tests
 * 
 * Tests for the AuthorizationService class including role determination,
 * permission checking, and resource access validation.
 * 
 * Requirements: 4.3, 4.7
 */

import { describe, it, expect } from 'vitest';
import { AuthorizationService, Permission, UserRole } from '../../services/authorizationService';
import { testUsers, generateTestUser } from '../fixtures/users';
import { AppError } from '../../middleware/errorHandler';

describe('AuthorizationService', () => {
  describe('getUserRole', () => {
    it('should identify super admin by email pattern', () => {
      const user = generateTestUser({ email: 'superadmin@example.com' });
      const role = AuthorizationService.getUserRole(user);
      expect(role).toBe(UserRole.SUPER_ADMIN);
    });

    it('should identify super admin by root email', () => {
      const user = generateTestUser({ email: 'root@example.com' });
      const role = AuthorizationService.getUserRole(user);
      expect(role).toBe(UserRole.SUPER_ADMIN);
    });

    it('should identify admin by email pattern', () => {
      const user = testUsers.adminUser;
      const role = AuthorizationService.getUserRole(user);
      expect(role).toBe(UserRole.ADMIN);
    });

    it('should identify admin by support email', () => {
      const user = generateTestUser({ email: 'support@example.com' });
      const role = AuthorizationService.getUserRole(user);
      expect(role).toBe(UserRole.ADMIN);
    });

    it('should default to user role for regular users', () => {
      const user = testUsers.freeUser;
      const role = AuthorizationService.getUserRole(user);
      expect(role).toBe(UserRole.USER);
    });
  });

  describe('hasPermission', () => {
    it('should return true for user with permission', () => {
      const user = testUsers.freeUser;
      const hasPermission = AuthorizationService.hasPermission(user, Permission.READ_OWN_DATA);
      expect(hasPermission).toBe(true);
    });

    it('should return false for user without permission', () => {
      const user = testUsers.freeUser;
      const hasPermission = AuthorizationService.hasPermission(user, Permission.MANAGE_USERS);
      expect(hasPermission).toBe(false);
    });

    it('should return true for admin with admin permission', () => {
      const user = testUsers.adminUser;
      const hasPermission = AuthorizationService.hasPermission(user, Permission.MANAGE_USERS);
      expect(hasPermission).toBe(true);
    });

    it('should return true for super admin with super admin permission', () => {
      const user = generateTestUser({ email: 'superadmin@example.com' });
      const hasPermission = AuthorizationService.hasPermission(user, Permission.MANAGE_SYSTEM);
      expect(hasPermission).toBe(true);
    });

    it('should return false for admin with super admin permission', () => {
      const user = testUsers.adminUser;
      const hasPermission = AuthorizationService.hasPermission(user, Permission.MANAGE_SYSTEM);
      expect(hasPermission).toBe(false);
    });
  });

  describe('hasAnyPermission', () => {
    it('should return true if user has any of the permissions', () => {
      const user = testUsers.freeUser;
      const hasAny = AuthorizationService.hasAnyPermission(user, [
        Permission.MANAGE_USERS,
        Permission.READ_OWN_DATA,
      ]);
      expect(hasAny).toBe(true);
    });

    it('should return false if user has none of the permissions', () => {
      const user = testUsers.freeUser;
      const hasAny = AuthorizationService.hasAnyPermission(user, [
        Permission.MANAGE_USERS,
        Permission.MANAGE_SYSTEM,
      ]);
      expect(hasAny).toBe(false);
    });

    it('should return true if user has all permissions', () => {
      const user = testUsers.freeUser;
      const hasAny = AuthorizationService.hasAnyPermission(user, [
        Permission.READ_OWN_DATA,
        Permission.WRITE_OWN_DATA,
      ]);
      expect(hasAny).toBe(true);
    });
  });

  describe('hasAllPermissions', () => {
    it('should return true if user has all permissions', () => {
      const user = testUsers.freeUser;
      const hasAll = AuthorizationService.hasAllPermissions(user, [
        Permission.READ_OWN_DATA,
        Permission.WRITE_OWN_DATA,
      ]);
      expect(hasAll).toBe(true);
    });

    it('should return false if user is missing any permission', () => {
      const user = testUsers.freeUser;
      const hasAll = AuthorizationService.hasAllPermissions(user, [
        Permission.READ_OWN_DATA,
        Permission.MANAGE_USERS,
      ]);
      expect(hasAll).toBe(false);
    });

    it('should return false if user has none of the permissions', () => {
      const user = testUsers.freeUser;
      const hasAll = AuthorizationService.hasAllPermissions(user, [
        Permission.MANAGE_USERS,
        Permission.MANAGE_SYSTEM,
      ]);
      expect(hasAll).toBe(false);
    });
  });

  describe('canAccessUserResource', () => {
    it('should allow user to access own resource', () => {
      const user = testUsers.freeUser;
      const canAccess = AuthorizationService.canAccessUserResource(user, user.id);
      expect(canAccess).toBe(true);
    });

    it('should deny regular user from accessing other user resource', () => {
      const user = testUsers.freeUser;
      const canAccess = AuthorizationService.canAccessUserResource(user, 999);
      expect(canAccess).toBe(false);
    });

    it('should allow admin to access other user resource', () => {
      const user = testUsers.adminUser;
      const canAccess = AuthorizationService.canAccessUserResource(user, 999);
      expect(canAccess).toBe(true);
    });

    it('should allow super admin to access other user resource', () => {
      const user = generateTestUser({ email: 'superadmin@example.com' });
      const canAccess = AuthorizationService.canAccessUserResource(user, 999);
      expect(canAccess).toBe(true);
    });
  });

  describe('canModifyUserResource', () => {
    it('should allow user to modify own resource', () => {
      const user = testUsers.freeUser;
      const canModify = AuthorizationService.canModifyUserResource(user, user.id);
      expect(canModify).toBe(true);
    });

    it('should deny regular user from modifying other user resource', () => {
      const user = testUsers.freeUser;
      const canModify = AuthorizationService.canModifyUserResource(user, 999);
      expect(canModify).toBe(false);
    });

    it('should deny admin from modifying other user resource', () => {
      const user = testUsers.adminUser;
      const canModify = AuthorizationService.canModifyUserResource(user, 999);
      expect(canModify).toBe(false);
    });

    it('should allow super admin to modify other user resource', () => {
      const user = generateTestUser({ email: 'superadmin@example.com' });
      const canModify = AuthorizationService.canModifyUserResource(user, 999);
      expect(canModify).toBe(true);
    });
  });

  describe('canDeleteUserResource', () => {
    it('should allow user to delete own resource', () => {
      const user = testUsers.freeUser;
      const canDelete = AuthorizationService.canDeleteUserResource(user, user.id);
      expect(canDelete).toBe(true);
    });

    it('should deny regular user from deleting other user resource', () => {
      const user = testUsers.freeUser;
      const canDelete = AuthorizationService.canDeleteUserResource(user, 999);
      expect(canDelete).toBe(false);
    });

    it('should deny admin from deleting other user resource', () => {
      const user = testUsers.adminUser;
      const canDelete = AuthorizationService.canDeleteUserResource(user, 999);
      expect(canDelete).toBe(false);
    });

    it('should allow super admin to delete other user resource', () => {
      const user = generateTestUser({ email: 'superadmin@example.com' });
      const canDelete = AuthorizationService.canDeleteUserResource(user, 999);
      expect(canDelete).toBe(true);
    });
  });

  describe('isAdmin', () => {
    it('should return false for regular user', () => {
      const user = testUsers.freeUser;
      const isAdmin = AuthorizationService.isAdmin(user);
      expect(isAdmin).toBe(false);
    });

    it('should return true for admin user', () => {
      const user = testUsers.adminUser;
      const isAdmin = AuthorizationService.isAdmin(user);
      expect(isAdmin).toBe(true);
    });

    it('should return true for super admin user', () => {
      const user = generateTestUser({ email: 'superadmin@example.com' });
      const isAdmin = AuthorizationService.isAdmin(user);
      expect(isAdmin).toBe(true);
    });
  });

  describe('isSuperAdmin', () => {
    it('should return false for regular user', () => {
      const user = testUsers.freeUser;
      const isSuperAdmin = AuthorizationService.isSuperAdmin(user);
      expect(isSuperAdmin).toBe(false);
    });

    it('should return false for admin user', () => {
      const user = testUsers.adminUser;
      const isSuperAdmin = AuthorizationService.isSuperAdmin(user);
      expect(isSuperAdmin).toBe(false);
    });

    it('should return true for super admin user', () => {
      const user = generateTestUser({ email: 'superadmin@example.com' });
      const isSuperAdmin = AuthorizationService.isSuperAdmin(user);
      expect(isSuperAdmin).toBe(true);
    });
  });

  describe('getUserPermissions', () => {
    it('should return user permissions for regular user', () => {
      const user = testUsers.freeUser;
      const permissions = AuthorizationService.getUserPermissions(user);
      expect(Array.isArray(permissions)).toBe(true);
      expect(permissions).toContain(Permission.READ_OWN_DATA);
      expect(permissions).toContain(Permission.WRITE_OWN_DATA);
      expect(permissions).toContain(Permission.CREATE_IDEA);
      expect(permissions).not.toContain(Permission.MANAGE_USERS);
    });

    it('should return admin permissions for admin user', () => {
      const user = testUsers.adminUser;
      const permissions = AuthorizationService.getUserPermissions(user);
      expect(permissions).toContain(Permission.READ_OWN_DATA);
      expect(permissions).toContain(Permission.MANAGE_USERS);
      expect(permissions).toContain(Permission.VIEW_ANALYTICS);
      expect(permissions).not.toContain(Permission.MANAGE_SYSTEM);
    });

    it('should return super admin permissions for super admin user', () => {
      const user = generateTestUser({ email: 'superadmin@example.com' });
      const permissions = AuthorizationService.getUserPermissions(user);
      expect(permissions).toContain(Permission.READ_OWN_DATA);
      expect(permissions).toContain(Permission.MANAGE_USERS);
      expect(permissions).toContain(Permission.MANAGE_SYSTEM);
      expect(permissions).toContain(Permission.MANAGE_SECURITY);
    });
  });

  describe('validateResourceOwnership', () => {
    it('should not throw for user accessing own resource', () => {
      const user = testUsers.freeUser;
      expect(() => {
        AuthorizationService.validateResourceOwnership(user, user.id, 'read');
      }).not.toThrow();
    });

    it('should throw for user accessing other user resource', () => {
      const user = testUsers.freeUser;
      expect(() => {
        AuthorizationService.validateResourceOwnership(user, 999, 'read');
      }).toThrow(AppError);
    });

    it('should not throw for admin reading other user resource', () => {
      const user = testUsers.adminUser;
      expect(() => {
        AuthorizationService.validateResourceOwnership(user, 999, 'read');
      }).not.toThrow();
    });

    it('should throw for admin writing to other user resource', () => {
      const user = testUsers.adminUser;
      expect(() => {
        AuthorizationService.validateResourceOwnership(user, 999, 'write');
      }).toThrow(AppError);
    });

    it('should not throw for super admin writing to other user resource', () => {
      const user = generateTestUser({ email: 'superadmin@example.com' });
      expect(() => {
        AuthorizationService.validateResourceOwnership(user, 999, 'write');
      }).not.toThrow();
    });

    it('should throw for admin deleting other user resource', () => {
      const user = testUsers.adminUser;
      expect(() => {
        AuthorizationService.validateResourceOwnership(user, 999, 'delete');
      }).toThrow(AppError);
    });

    it('should not throw for super admin deleting other user resource', () => {
      const user = generateTestUser({ email: 'superadmin@example.com' });
      expect(() => {
        AuthorizationService.validateResourceOwnership(user, 999, 'delete');
      }).not.toThrow();
    });

    it('should throw error with correct status code', () => {
      const user = testUsers.freeUser;
      try {
        AuthorizationService.validateResourceOwnership(user, 999, 'read');
        expect.fail('Should have thrown error');
      } catch (error: any) {
        expect(error).toBeInstanceOf(AppError);
        expect(error.statusCode).toBe(403);
        expect(error.code).toBe('RESOURCE_ACCESS_DENIED');
      }
    });
  });

  describe('requirePermission', () => {
    it('should not throw for user with permission', () => {
      const user = testUsers.freeUser;
      expect(() => {
        AuthorizationService.requirePermission(user, Permission.READ_OWN_DATA);
      }).not.toThrow();
    });

    it('should throw for user without permission', () => {
      const user = testUsers.freeUser;
      expect(() => {
        AuthorizationService.requirePermission(user, Permission.MANAGE_USERS);
      }).toThrow(AppError);
    });

    it('should throw error with correct status code', () => {
      const user = testUsers.freeUser;
      try {
        AuthorizationService.requirePermission(user, Permission.MANAGE_USERS);
        expect.fail('Should have thrown error');
      } catch (error: any) {
        expect(error).toBeInstanceOf(AppError);
        expect(error.statusCode).toBe(403);
        expect(error.code).toBe('PERMISSION_DENIED');
        expect(error.message).toContain('manage_users');
      }
    });
  });

  describe('requireAnyPermission', () => {
    it('should not throw if user has any of the permissions', () => {
      const user = testUsers.freeUser;
      expect(() => {
        AuthorizationService.requireAnyPermission(user, [
          Permission.MANAGE_USERS,
          Permission.READ_OWN_DATA,
        ]);
      }).not.toThrow();
    });

    it('should throw if user has none of the permissions', () => {
      const user = testUsers.freeUser;
      expect(() => {
        AuthorizationService.requireAnyPermission(user, [
          Permission.MANAGE_USERS,
          Permission.MANAGE_SYSTEM,
        ]);
      }).toThrow(AppError);
    });

    it('should throw error with correct status code', () => {
      const user = testUsers.freeUser;
      try {
        AuthorizationService.requireAnyPermission(user, [
          Permission.MANAGE_USERS,
          Permission.MANAGE_SYSTEM,
        ]);
        expect.fail('Should have thrown error');
      } catch (error: any) {
        expect(error).toBeInstanceOf(AppError);
        expect(error.statusCode).toBe(403);
        expect(error.code).toBe('PERMISSION_DENIED');
      }
    });
  });

  describe('requireAdmin', () => {
    it('should not throw for admin user', () => {
      const user = testUsers.adminUser;
      expect(() => {
        AuthorizationService.requireAdmin(user);
      }).not.toThrow();
    });

    it('should not throw for super admin user', () => {
      const user = generateTestUser({ email: 'superadmin@example.com' });
      expect(() => {
        AuthorizationService.requireAdmin(user);
      }).not.toThrow();
    });

    it('should throw for regular user', () => {
      const user = testUsers.freeUser;
      expect(() => {
        AuthorizationService.requireAdmin(user);
      }).toThrow(AppError);
    });

    it('should throw error with correct status code', () => {
      const user = testUsers.freeUser;
      try {
        AuthorizationService.requireAdmin(user);
        expect.fail('Should have thrown error');
      } catch (error: any) {
        expect(error).toBeInstanceOf(AppError);
        expect(error.statusCode).toBe(403);
        expect(error.code).toBe('ADMIN_REQUIRED');
        expect(error.message).toContain('administrator privileges');
      }
    });
  });

  describe('requireSuperAdmin', () => {
    it('should not throw for super admin user', () => {
      const user = generateTestUser({ email: 'superadmin@example.com' });
      expect(() => {
        AuthorizationService.requireSuperAdmin(user);
      }).not.toThrow();
    });

    it('should throw for admin user', () => {
      const user = testUsers.adminUser;
      expect(() => {
        AuthorizationService.requireSuperAdmin(user);
      }).toThrow(AppError);
    });

    it('should throw for regular user', () => {
      const user = testUsers.freeUser;
      expect(() => {
        AuthorizationService.requireSuperAdmin(user);
      }).toThrow(AppError);
    });

    it('should throw error with correct status code', () => {
      const user = testUsers.freeUser;
      try {
        AuthorizationService.requireSuperAdmin(user);
        expect.fail('Should have thrown error');
      } catch (error: any) {
        expect(error).toBeInstanceOf(AppError);
        expect(error.statusCode).toBe(403);
        expect(error.code).toBe('SUPER_ADMIN_REQUIRED');
        expect(error.message).toContain('super administrator');
      }
    });
  });

  describe('Permission Hierarchy', () => {
    it('should grant super admin all admin permissions', () => {
      const user = generateTestUser({ email: 'superadmin@example.com' });
      const adminPermissions = [
        Permission.MANAGE_USERS,
        Permission.VIEW_ANALYTICS,
        Permission.VIEW_SECURITY_LOGS,
      ];
      
      adminPermissions.forEach(permission => {
        expect(AuthorizationService.hasPermission(user, permission)).toBe(true);
      });
    });

    it('should grant admin all user permissions', () => {
      const user = testUsers.adminUser;
      const userPermissions = [
        Permission.READ_OWN_DATA,
        Permission.WRITE_OWN_DATA,
        Permission.CREATE_IDEA,
      ];
      
      userPermissions.forEach(permission => {
        expect(AuthorizationService.hasPermission(user, permission)).toBe(true);
      });
    });

    it('should not grant user admin permissions', () => {
      const user = testUsers.freeUser;
      const adminPermissions = [
        Permission.MANAGE_USERS,
        Permission.VIEW_SECURITY_LOGS,
        Permission.MANAGE_SYSTEM,
      ];
      
      adminPermissions.forEach(permission => {
        expect(AuthorizationService.hasPermission(user, permission)).toBe(false);
      });
    });

    it('should not grant admin super admin permissions', () => {
      const user = testUsers.adminUser;
      const superAdminPermissions = [
        Permission.MANAGE_SYSTEM,
        Permission.MANAGE_SECURITY,
        Permission.WRITE_USER_DATA,
        Permission.DELETE_USER_DATA,
      ];
      
      superAdminPermissions.forEach(permission => {
        expect(AuthorizationService.hasPermission(user, permission)).toBe(false);
      });
    });
  });
});
