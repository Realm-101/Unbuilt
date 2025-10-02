import { User } from '@shared/schema';
import { AppError } from '../middleware/errorHandler';

// Define user roles and their hierarchy
export enum UserRole {
  USER = 'user',
  ADMIN = 'admin',
  SUPER_ADMIN = 'super_admin'
}

// Define permissions for different operations
export enum Permission {
  // User data permissions
  READ_OWN_DATA = 'read_own_data',
  WRITE_OWN_DATA = 'write_own_data',
  DELETE_OWN_DATA = 'delete_own_data',
  
  // Other users' data permissions
  READ_USER_DATA = 'read_user_data',
  WRITE_USER_DATA = 'write_user_data',
  DELETE_USER_DATA = 'delete_user_data',
  
  // Administrative permissions
  MANAGE_USERS = 'manage_users',
  VIEW_ANALYTICS = 'view_analytics',
  MANAGE_SYSTEM = 'manage_system',
  
  // Security permissions
  VIEW_SECURITY_LOGS = 'view_security_logs',
  MANAGE_SECURITY = 'manage_security',
  
  // Team permissions
  CREATE_TEAM = 'create_team',
  MANAGE_TEAM = 'manage_team',
  INVITE_MEMBERS = 'invite_members',
  
  // Idea permissions
  CREATE_IDEA = 'create_idea',
  SHARE_IDEA = 'share_idea',
  COMMENT_IDEA = 'comment_idea'
}

// Define base permissions for each role
const USER_PERMISSIONS: Permission[] = [
  Permission.READ_OWN_DATA,
  Permission.WRITE_OWN_DATA,
  Permission.DELETE_OWN_DATA,
  Permission.CREATE_TEAM,
  Permission.CREATE_IDEA,
  Permission.SHARE_IDEA,
  Permission.COMMENT_IDEA
];

const ADMIN_PERMISSIONS: Permission[] = [
  ...USER_PERMISSIONS,
  Permission.READ_USER_DATA,
  Permission.MANAGE_USERS,
  Permission.VIEW_ANALYTICS,
  Permission.VIEW_SECURITY_LOGS,
  Permission.MANAGE_TEAM,
  Permission.INVITE_MEMBERS
];

const SUPER_ADMIN_PERMISSIONS: Permission[] = [
  ...ADMIN_PERMISSIONS,
  Permission.WRITE_USER_DATA,
  Permission.DELETE_USER_DATA,
  Permission.MANAGE_SYSTEM,
  Permission.MANAGE_SECURITY
];

// Role-permission mapping
const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  [UserRole.USER]: USER_PERMISSIONS,
  [UserRole.ADMIN]: ADMIN_PERMISSIONS,
  [UserRole.SUPER_ADMIN]: SUPER_ADMIN_PERMISSIONS
};

export interface AuthorizedUser extends User {
  role: UserRole;
}

export class AuthorizationService {
  /**
   * Get user role from user data
   */
  static getUserRole(user: User): UserRole {
    // For now, determine role based on email patterns or user properties
    // In a real system, this would come from a roles table or user property
    if (user.email.includes('superadmin@') || user.email.includes('root@')) {
      return UserRole.SUPER_ADMIN;
    }
    if (user.email.includes('admin@') || user.email.includes('support@')) {
      return UserRole.ADMIN;
    }
    return UserRole.USER;
  }

  /**
   * Check if user has a specific permission
   */
  static hasPermission(user: User, permission: Permission): boolean {
    const role = this.getUserRole(user);
    const rolePermissions = ROLE_PERMISSIONS[role] || [];
    return rolePermissions.includes(permission);
  }

  /**
   * Check if user has any of the specified permissions
   */
  static hasAnyPermission(user: User, permissions: Permission[]): boolean {
    return permissions.some(permission => this.hasPermission(user, permission));
  }

  /**
   * Check if user has all of the specified permissions
   */
  static hasAllPermissions(user: User, permissions: Permission[]): boolean {
    return permissions.every(permission => this.hasPermission(user, permission));
  }

  /**
   * Check if user can access another user's resource
   */
  static canAccessUserResource(currentUser: User, targetUserId: number): boolean {
    // Users can always access their own resources
    if (currentUser.id === targetUserId) {
      return true;
    }

    // Admins can access other users' resources
    return this.hasPermission(currentUser, Permission.READ_USER_DATA);
  }

  /**
   * Check if user can modify another user's resource
   */
  static canModifyUserResource(currentUser: User, targetUserId: number): boolean {
    // Users can always modify their own resources
    if (currentUser.id === targetUserId) {
      return true;
    }

    // Only super admins can modify other users' resources
    return this.hasPermission(currentUser, Permission.WRITE_USER_DATA);
  }

  /**
   * Check if user can delete another user's resource
   */
  static canDeleteUserResource(currentUser: User, targetUserId: number): boolean {
    // Users can delete their own resources
    if (currentUser.id === targetUserId) {
      return true;
    }

    // Only super admins can delete other users' resources
    return this.hasPermission(currentUser, Permission.DELETE_USER_DATA);
  }

  /**
   * Check if user is admin or higher
   */
  static isAdmin(user: User): boolean {
    const role = this.getUserRole(user);
    return role === UserRole.ADMIN || role === UserRole.SUPER_ADMIN;
  }

  /**
   * Check if user is super admin
   */
  static isSuperAdmin(user: User): boolean {
    const role = this.getUserRole(user);
    return role === UserRole.SUPER_ADMIN;
  }

  /**
   * Get all permissions for a user
   */
  static getUserPermissions(user: User): Permission[] {
    const role = this.getUserRole(user);
    return ROLE_PERMISSIONS[role] || [];
  }

  /**
   * Validate resource ownership
   */
  static validateResourceOwnership(currentUser: User, resourceUserId: number, operation: 'read' | 'write' | 'delete' = 'read'): void {
    let canAccess = false;

    switch (operation) {
      case 'read':
        canAccess = this.canAccessUserResource(currentUser, resourceUserId);
        break;
      case 'write':
        canAccess = this.canModifyUserResource(currentUser, resourceUserId);
        break;
      case 'delete':
        canAccess = this.canDeleteUserResource(currentUser, resourceUserId);
        break;
    }

    if (!canAccess) {
      throw AppError.createForbiddenError(
        'Access denied: insufficient permissions for this resource',
        'RESOURCE_ACCESS_DENIED'
      );
    }
  }

  /**
   * Require specific permission
   */
  static requirePermission(user: User, permission: Permission): void {
    if (!this.hasPermission(user, permission)) {
      throw AppError.createForbiddenError(
        `Access denied: ${permission} permission required`,
        'PERMISSION_DENIED'
      );
    }
  }

  /**
   * Require any of the specified permissions
   */
  static requireAnyPermission(user: User, permissions: Permission[]): void {
    if (!this.hasAnyPermission(user, permissions)) {
      throw AppError.createForbiddenError(
        `Access denied: one of [${permissions.join(', ')}] permissions required`,
        'PERMISSION_DENIED'
      );
    }
  }

  /**
   * Require admin role or higher
   */
  static requireAdmin(user: User): void {
    if (!this.isAdmin(user)) {
      throw AppError.createForbiddenError(
        'Access denied: administrator privileges required',
        'ADMIN_REQUIRED'
      );
    }
  }

  /**
   * Require super admin role
   */
  static requireSuperAdmin(user: User): void {
    if (!this.isSuperAdmin(user)) {
      throw AppError.createForbiddenError(
        'Access denied: super administrator privileges required',
        'SUPER_ADMIN_REQUIRED'
      );
    }
  }
}