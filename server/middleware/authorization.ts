import type { Request, Response, NextFunction } from 'express';
import { AuthorizationService, Permission, UserRole } from '../services/authorizationService';
import { AppError } from './errorHandler';

/**
 * Middleware to add user role and permissions to request
 * 
 * Enriches the request object with user role and permissions based on the authenticated user.
 * This middleware should be used after authentication middleware to provide authorization context.
 * 
 * @param req - Express request object (must have req.user populated)
 * @param res - Express response object
 * @param next - Express next function
 * 
 * @example
 * ```typescript
 * app.use(jwtAuth);
 * app.use(addUserAuthorization);
 * ```
 */
export const addUserAuthorization = (req: Request, res: Response, next: NextFunction): void => {
  try {
    if (req.user) {
      req.userRole = AuthorizationService.getUserRole(req.user);
      req.userPermissions = AuthorizationService.getUserPermissions(req.user);
    }
    next();
  } catch (error) {
    console.error('Error adding user authorization:', error);
    // Continue without authorization info rather than blocking the request
    next();
  }
};

/**
 * Middleware factory to require specific permission
 * 
 * Creates middleware that checks if the authenticated user has the specified permission.
 * Returns 403 Forbidden if the user lacks the required permission.
 * 
 * @param permission - The permission required to access the route
 * @returns Express middleware function
 * 
 * @example
 * ```typescript
 * app.delete('/api/users/:id', 
 *   jwtAuth, 
 *   requirePermission('users:delete'), 
 *   deleteUserHandler
 * );
 * ```
 */
export const requirePermission = (permission: Permission) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      if (!req.user) {
        return next(AppError.createAuthenticationError('Authentication required', 'AUTH_REQUIRED'));
      }

      AuthorizationService.requirePermission(req.user, permission);
      next();
    } catch (error) {
      console.error('Error checking permission:', error);
      next(error);
    }
  };
};

/**
 * Middleware factory to require any of the specified permissions
 * 
 * Creates middleware that checks if the authenticated user has at least one of the specified permissions.
 * Useful for routes that can be accessed by users with different permission sets.
 * 
 * @param permissions - Array of permissions, user needs at least one
 * @returns Express middleware function
 * 
 * @example
 * ```typescript
 * app.get('/api/reports', 
 *   jwtAuth, 
 *   requireAnyPermission(['reports:read', 'reports:admin']), 
 *   getReportsHandler
 * );
 * ```
 */
export const requireAnyPermission = (permissions: Permission[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      if (!req.user) {
        return next(AppError.createAuthenticationError('Authentication required', 'AUTH_REQUIRED'));
      }

      AuthorizationService.requireAnyPermission(req.user, permissions);
      next();
    } catch (error) {
      console.error('Error checking any permission:', error);
      next(error);
    }
  };
};

/**
 * Middleware to require admin role or higher
 * 
 * Checks if the authenticated user has admin or super admin role.
 * Returns 403 Forbidden if the user is not an admin.
 * 
 * @param req - Express request object (must have req.user populated)
 * @param res - Express response object
 * @param next - Express next function
 * 
 * @example
 * ```typescript
 * app.get('/api/admin/users', jwtAuth, requireAdmin, getAllUsersHandler);
 * ```
 */
export const requireAdmin = (req: Request, res: Response, next: NextFunction): void => {
  try {
    if (!req.user) {
      return next(AppError.createAuthenticationError('Authentication required', 'AUTH_REQUIRED'));
    }

    AuthorizationService.requireAdmin(req.user);
    next();
  } catch (error) {
    console.error('Error checking admin permission:', error);
    next(error);
  }
};

/**
 * Middleware to require super admin role
 * 
 * Checks if the authenticated user has the super admin role (highest privilege level).
 * Returns 403 Forbidden if the user is not a super admin.
 * 
 * @param req - Express request object (must have req.user populated)
 * @param res - Express response object
 * @param next - Express next function
 * 
 * @example
 * ```typescript
 * app.post('/api/admin/system-config', jwtAuth, requireSuperAdmin, updateSystemConfigHandler);
 * ```
 */
export const requireSuperAdmin = (req: Request, res: Response, next: NextFunction): void => {
  try {
    if (!req.user) {
      return next(AppError.createAuthenticationError('Authentication required', 'AUTH_REQUIRED'));
    }

    AuthorizationService.requireSuperAdmin(req.user);
    next();
  } catch (error) {
    console.error('Error checking super admin permission:', error);
    next(error);
  }
};

/**
 * Middleware factory to validate resource ownership
 * 
 * Creates middleware that checks if the authenticated user owns a resource by comparing
 * the user ID from the request (params, body, or query) with the authenticated user's ID.
 * Admins can access any resource regardless of ownership.
 * 
 * @param userIdParam - Name of the parameter containing the user ID (default: 'userId')
 * @param operation - Type of operation being performed ('read', 'write', or 'delete')
 * @returns Express middleware function
 * 
 * @example
 * ```typescript
 * // Validate user can read their own profile
 * app.get('/api/users/:userId/profile', 
 *   jwtAuth, 
 *   validateResourceOwnership('userId', 'read'), 
 *   getProfileHandler
 * );
 * 
 * // Validate user can update their own data
 * app.put('/api/users/:userId', 
 *   jwtAuth, 
 *   validateResourceOwnership('userId', 'write'), 
 *   updateUserHandler
 * );
 * ```
 */
export const validateResourceOwnership = (
  userIdParam: string = 'userId',
  operation: 'read' | 'write' | 'delete' = 'read'
) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
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

      AuthorizationService.validateResourceOwnership(req.user, targetUserId, operation);
      next();
    } catch (error) {
      console.error('Error validating resource ownership:', error);
      next(error);
    }
  };
};

/**
 * Middleware factory to validate ownership of a resource by checking its userId field
 * 
 * Creates middleware that validates ownership of a resource that has already been loaded
 * and attached to req.resource. The resource must have a userId field.
 * This middleware should be used after a resource-loading middleware.
 * 
 * @param operation - Type of operation being performed ('read', 'write', or 'delete')
 * @returns Express middleware function
 * 
 * @example
 * ```typescript
 * app.delete('/api/searches/:id', 
 *   jwtAuth, 
 *   loadSearchMiddleware,  // Loads search and attaches to req.resource
 *   validateOwnResource('delete'), 
 *   deleteSearchHandler
 * );
 * ```
 */
export const validateOwnResource = (operation: 'read' | 'write' | 'delete' = 'read') => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
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

      AuthorizationService.validateResourceOwnership(req.user, resource.userId, operation);
      next();
    } catch (error) {
      console.error('Error validating own resource:', error);
      next(error);
    }
  };
};

/**
 * Middleware to check if user can access their own data or is admin
 * 
 * Allows access if the user is accessing their own data (matching user ID) or if they have admin privileges.
 * Commonly used for user profile and settings endpoints.
 * 
 * @param req - Express request object (must have req.user and userId in params)
 * @param res - Express response object
 * @param next - Express next function
 * 
 * @example
 * ```typescript
 * app.get('/api/users/:userId/settings', jwtAuth, requireSelfOrAdmin, getSettingsHandler);
 * ```
 */
export const requireSelfOrAdmin = (req: Request, res: Response, next: NextFunction): void => {
  try {
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
  } catch (error) {
    console.error('Error checking self or admin access:', error);
    next(error);
  }
};

/**
 * Middleware factory to log authorization events for security monitoring
 * 
 * Creates middleware that logs authorization attempts for auditing and security monitoring purposes.
 * Useful for tracking access to sensitive resources.
 * 
 * @param action - Description of the action being performed
 * @returns Express middleware function
 * 
 * @example
 * ```typescript
 * app.delete('/api/users/:id', 
 *   jwtAuth, 
 *   logAuthorizationEvent('delete_user'), 
 *   requireAdmin, 
 *   deleteUserHandler
 * );
 * ```
 */
export const logAuthorizationEvent = (action: string) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
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
    } catch (error) {
      console.error('Error logging authorization event:', error);
      // Continue processing even if logging fails
      next();
    }
  };
};

/**
 * Middleware factory for role-based access control
 * 
 * Creates middleware that requires a specific role or higher in the role hierarchy.
 * Role hierarchy: USER < ADMIN < SUPER_ADMIN
 * 
 * @param requiredRole - The minimum role required to access the route
 * @returns Express middleware function
 * 
 * @example
 * ```typescript
 * app.get('/api/admin/dashboard', 
 *   jwtAuth, 
 *   requireRole(UserRole.ADMIN), 
 *   getDashboardHandler
 * );
 * ```
 */
export const requireRole = (requiredRole: UserRole) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
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
    } catch (error) {
      console.error('Error checking role requirement:', error);
      next(error);
    }
  };
};

/**
 * Middleware factory to check team membership and permissions
 * 
 * Creates middleware that validates if the user has access to a team with the specified permission level.
 * Super admins bypass team membership checks.
 * 
 * @param permission - Required permission level ('read', 'write', or 'admin')
 * @returns Express middleware function
 * 
 * @example
 * ```typescript
 * app.get('/api/teams/:teamId/projects', 
 *   jwtAuth, 
 *   requireTeamAccess('read'), 
 *   getTeamProjectsHandler
 * );
 * 
 * app.post('/api/teams/:teamId/members', 
 *   jwtAuth, 
 *   requireTeamAccess('admin'), 
 *   addTeamMemberHandler
 * );
 * ```
 */
export const requireTeamAccess = (permission: 'read' | 'write' | 'admin' = 'read') => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
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
      console.error('Error checking team access:', error);
      next(error);
    }
  };
};