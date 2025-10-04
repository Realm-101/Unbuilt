import { describe, it, expect, beforeEach } from 'vitest';
import { AuthorizationService, Permission, UserRole } from '../authorizationService';
import { User } from '@shared/schema';

describe('AuthorizationService', () => {
  const mockUser: User = {
    id: 1,
    email: 'user@example.com',
    name: 'Test User',
    plan: 'free',
    searchCount: 0,
    lastResetDate: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    stripeCustomerId: null,
    stripeSubscriptionId: null,
    subscriptionStatus: 'inactive',
    trialUsed: false,
    trialExpiration: null,
    preferences: {},
    isActive: true,
    avatar: null,
    provider: 'local',
    providerId: null,
    firstName: null,
    lastName: null,
    profileImageUrl: null,
    failedLoginAttempts: 0,
    lastFailedLogin: null,
    accountLocked: false,
    lockoutExpires: null,
    password: null
  };

  const mockAdmin: User = {
    ...mockUser,
    id: 2,
    email: 'admin@example.com'
  };

  const mockSuperAdmin: User = {
    ...mockUser,
    id: 3,
    email: 'superadmin@example.com'
  };

  describe('getUserRole', () => {
    it('should return USER role for regular users', () => {
      const role = AuthorizationService.getUserRole(mockUser);
      expect(role).toBe(UserRole.USER);
    });

    it('should return ADMIN role for admin users', () => {
      const role = AuthorizationService.getUserRole(mockAdmin);
      expect(role).toBe(UserRole.ADMIN);
    });

    it('should return SUPER_ADMIN role for super admin users', () => {
      const role = AuthorizationService.getUserRole(mockSuperAdmin);
      expect(role).toBe(UserRole.SUPER_ADMIN);
    });
  });

  describe('hasPermission', () => {
    it('should allow users to read their own data', () => {
      const hasPermission = AuthorizationService.hasPermission(mockUser, Permission.READ_OWN_DATA);
      expect(hasPermission).toBe(true);
    });

    it('should not allow users to read other users data', () => {
      const hasPermission = AuthorizationService.hasPermission(mockUser, Permission.READ_USER_DATA);
      expect(hasPermission).toBe(false);
    });

    it('should allow admins to read user data', () => {
      const hasPermission = AuthorizationService.hasPermission(mockAdmin, Permission.READ_USER_DATA);
      expect(hasPermission).toBe(true);
    });

    it('should allow super admins to manage system', () => {
      const hasPermission = AuthorizationService.hasPermission(mockSuperAdmin, Permission.MANAGE_SYSTEM);
      expect(hasPermission).toBe(true);
    });
  });

  describe('canAccessUserResource', () => {
    it('should allow users to access their own resources', () => {
      const canAccess = AuthorizationService.canAccessUserResource(mockUser, mockUser.id);
      expect(canAccess).toBe(true);
    });

    it('should not allow users to access other users resources', () => {
      const canAccess = AuthorizationService.canAccessUserResource(mockUser, 999);
      expect(canAccess).toBe(false);
    });

    it('should allow admins to access other users resources', () => {
      const canAccess = AuthorizationService.canAccessUserResource(mockAdmin, mockUser.id);
      expect(canAccess).toBe(true);
    });
  });

  describe('canModifyUserResource', () => {
    it('should allow users to modify their own resources', () => {
      const canModify = AuthorizationService.canModifyUserResource(mockUser, mockUser.id);
      expect(canModify).toBe(true);
    });

    it('should not allow regular users to modify other users resources', () => {
      const canModify = AuthorizationService.canModifyUserResource(mockUser, 999);
      expect(canModify).toBe(false);
    });

    it('should not allow admins to modify other users resources', () => {
      const canModify = AuthorizationService.canModifyUserResource(mockAdmin, mockUser.id);
      expect(canModify).toBe(false);
    });

    it('should allow super admins to modify other users resources', () => {
      const canModify = AuthorizationService.canModifyUserResource(mockSuperAdmin, mockUser.id);
      expect(canModify).toBe(true);
    });
  });

  describe('validateResourceOwnership', () => {
    it('should not throw for valid resource access', () => {
      expect(() => {
        AuthorizationService.validateResourceOwnership(mockUser, mockUser.id, 'read');
      }).not.toThrow();
    });

    it('should throw for invalid resource access', () => {
      expect(() => {
        AuthorizationService.validateResourceOwnership(mockUser, 999, 'read');
      }).toThrow();
    });

    it('should allow admin to read other users resources', () => {
      expect(() => {
        AuthorizationService.validateResourceOwnership(mockAdmin, mockUser.id, 'read');
      }).not.toThrow();
    });
  });

  describe('requirePermission', () => {
    it('should not throw for valid permissions', () => {
      expect(() => {
        AuthorizationService.requirePermission(mockUser, Permission.READ_OWN_DATA);
      }).not.toThrow();
    });

    it('should throw for invalid permissions', () => {
      expect(() => {
        AuthorizationService.requirePermission(mockUser, Permission.MANAGE_SYSTEM);
      }).toThrow();
    });
  });

  describe('role checks', () => {
    it('should correctly identify admin users', () => {
      expect(AuthorizationService.isAdmin(mockUser)).toBe(false);
      expect(AuthorizationService.isAdmin(mockAdmin)).toBe(true);
      expect(AuthorizationService.isAdmin(mockSuperAdmin)).toBe(true);
    });

    it('should correctly identify super admin users', () => {
      expect(AuthorizationService.isSuperAdmin(mockUser)).toBe(false);
      expect(AuthorizationService.isSuperAdmin(mockAdmin)).toBe(false);
      expect(AuthorizationService.isSuperAdmin(mockSuperAdmin)).toBe(true);
    });
  });
});