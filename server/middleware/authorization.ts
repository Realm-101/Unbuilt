import type { Request, Response, NextFunction } from 'express';
import { AuthorizationService, Permission, UserRole } from '../services/authorizationService';
import { AppError } from './errorHandler';

/**
 * Middleware to add user role and permissions to request
 */
export const addUserAuthorization = (req: Request, res: Response, next: NextFunction): void => {
  if (req.user) {
    req.userRole = AuthorizationService.getUserRole(req.user);
    req.userPermissions = AuthorizationService.getUserPermissions(req.user);
  }
  next();
};

/**
 * Middleware to require specific permission
 */
export const requirePermission = (permission: Permission) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(AppError.createAuthenticationError('Authentication required', 'AUTH_REQUIRED'));
    }

    try {
      AuthorizationService.requirePermission(req.user, permission);
      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Middleware to require any of the specified permissions
 */
export const requireAnyPermission = (permissions: Permission[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(AppError.createAuthenticationError('Authentication required', 'AUTH_REQUIRED'));
    }

    try {
      AuthorizationService.requireAnyPermission(req.user, permissions);
      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Middleware to require admin role or higher
 */
export const requireAdmin = (req: Request, res: Response, next: NextFunction): void => {
  if (!req.user) {
    return next(AppError.createAuthenticationError('Authentication required', 'AUTH_REQUIRED'));
  }

  try {
    AuthorizationService.requireAdmin(req.user);
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Middleware to require super admin role
 */
export const requireSuperAdmin = (req: Request, res: Response, next: NextFunction): void => {
  if (!req.user) {
    return next(AppError.createAuthenticationError('Authentication required', 'AUTH_REQUIRED'));
  }

  try {
    AuthorizationService.requireSuperAdmin(req.user);
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Middleware to validate resource ownership
 * Checks if user can access a resource based on user ID parameter
 */
export const validateResourceOwnership = (
  userIdParam: string = 'userId',
  operation: 'read' | 'write' | 'delete' = 'read'
) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(AppError.createAuthenticationError('Authentication required', 'AUTH_REQUIRED'));
    }

    // Get target user ID from request parameters, body, or query
    let targetUserId: number;
    
    if (req.params[userIdParam]) {
      targetUserId = parseInt(req.params[userIdParam]);
    } else if (req.body[userIdParam]) {
      targetUserId = parseInt(req.body[userIdParam]);
    } else if (req.query[userIdParam]) {
      targetUserId = parseInt(req.query[userIdParam] as string);
    } else {
      return next(AppError.createValidationError(
        `User ID parameter '${userIdParam}' not found`,
        'MISSING_USER_ID'
      ));
    }

    if (isNaN(targetUserId)) {
      return next(AppError.createValidationError(
        'Invalid user ID format',
        'INVALID_USER_ID'
      ));
    }

    try {
      AuthorizationService.validateResourceOwnership(req.user, targetUserId, operation);
      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Middleware to validate ownership of a resource by checking its userId field
 * This is for resources that have a userId field indicating ownership
 */
export const validateOwnResource = (operation: 'read' | 'write' | 'delete' = 'read') => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      return next(AppError.createAuthenticationError('Authentication required', 'AUTH_REQUIRED'));
    }

    // This middleware should be used after the resource is fetched
    // The resource should be attached to req.resource by a previous middleware
    const resource = (req as any).resource;
    
    if (!resource) {
      return next(AppError.createValidationError(
        'Resource not found or not loaded',
        'RESOURCE_NOT_LOADED'
      ));
    }

    if (!resource.userId) {
      return next(AppError.createValidationError(
        'Resource does not have ownership information',
        'NO_OWNERSHIP_INFO'
      ));
    }

    try {
      AuthorizationService.validateResourceOwnership(req.user, resource.userId, operation);
      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Middleware to check if user can access their own data or is admin
 */
export const requireSelfOrAdmin = (req: Request, res: Response, next: NextFunction): void => {
  if (!req.user) {
    return next(AppError.createAuthenticationError('Authentication required', 'AUTH_REQUIRED'));
  }

  const targetUserId = parseInt(req.params.userId || req.params.id || '0');
  
  if (isNaN(targetUserId)) {
    return next(AppError.createValidationError('Invalid user ID', 'INVALID_USER_ID'));
  }

  // Allow if accessing own data or if user is admin
  if (req.user.id === targetUserId || AuthorizationService.isAdmin(req.user)) {
    return next();
  }

  next(AppError.createForbiddenError(
    'Access denied: can only access own resources or admin privileges required',
    'SELF_OR_ADMIN_REQUIRED'
  ));
};

/**
 * Middleware to log authorization events for security monitoring
 */
export const logAuthorizationEvent = (action: string) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (req.user) {
      console.log(`🔐 Authorization: User ${req.user.id} (${req.userRole || 'unknown'}) attempting ${action}`);
      
      // Could integrate with security event handler here
      // securityEventHandler.logAuthorizationEvent({
      //   userId: req.user.id,
      //   action,
      //   resource: req.originalUrl,
      //   timestamp: new Date(),
      //   success: true // Will be updated by error handler if needed
      // });
    }
    next();
  };
};

/**
 * Middleware factory for role-based access control
 */
export const requireRole = (requiredRole: UserRole) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(AppError.createAuthenticationError('Authentication required', 'AUTH_REQUIRED'));
    }

    const userRole = AuthorizationService.getUserRole(req.user);
    
    // Check role hierarchy
    const roleHierarchy = {
      [UserRole.USER]: 0,
      [UserRole.ADMIN]: 1,
      [UserRole.SUPER_ADMIN]: 2
    };

    if (roleHierarchy[userRole] < roleHierarchy[requiredRole]) {
      return next(AppError.createForbiddenError(
        `Access denied: ${requiredRole} role or higher required`,
        'INSUFFICIENT_ROLE'
      ));
    }

    next();
  };
};

/**
 * Middleware to check team membership and permissions
 */
export const requireTeamAccess = (permission: 'read' | 'write' | 'admin' = 'read') => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      return next(AppError.createAuthenticationError('Authentication required', 'AUTH_REQUIRED'));
    }

    const teamId = parseInt(req.params.teamId || req.body.teamId || '0');
    
    if (isNaN(teamId)) {
      return next(AppError.createValidationError('Invalid team ID', 'INVALID_TEAM_ID'));
    }

    // Super admins can access any team
    if (AuthorizationService.isSuperAdmin(req.user)) {
      return next();
    }

    // TODO: Implement team membership checking
    // This would require querying the teamMembers table
    // For now, we'll implement basic logic

    try {
      // This is a placeholder - in a real implementation, you'd check the database
      // const teamMember = await getTeamMember(teamId, req.user.id);
      // if (!teamMember) {
      //   throw AppError.createForbiddenError('Not a member of this team', 'NOT_TEAM_MEMBER');
      // }
      
      // Check permission level
      // const hasPermission = checkTeamPermission(teamMember.role, permission);
      // if (!hasPermission) {
      //   throw AppError.createForbiddenError('Insufficient team permissions', 'INSUFFICIENT_TEAM_PERMISSION');
      // }

      next();
    } catch (error) {
      next(error);
    }
  };
};