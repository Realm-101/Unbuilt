import type { Request, Response, NextFunction } from 'express';
import { storage } from '../storage';
import { AuthorizationService } from '../services/authorizationService';
import { AppError } from './errorHandler';

// Extend Express Request type to include loaded resource
declare global {
  namespace Express {
    interface Request {
      resource?: any;
      resourceOwner?: number;
    }
  }
}

/**
 * Middleware to load and validate search ownership
 */
export const validateSearchOwnership = (operation: 'read' | 'write' | 'delete' = 'read') => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      return next(AppError.createAuthenticationError('Authentication required', 'AUTH_REQUIRED'));
    }

    const searchId = parseInt(req.params.id || req.params.searchId || '0');
    
    if (isNaN(searchId)) {
      return next(AppError.createValidationError('Invalid search ID', 'INVALID_SEARCH_ID'));
    }

    try {
      // Get all user searches to verify ownership
      const userSearches = await storage.getSearches(req.user.id.toString());
      const search = userSearches.find(s => s.id === searchId);

      if (!search) {
        return next(AppError.createNotFoundError('Search not found or access denied', 'SEARCH_NOT_FOUND'));
      }

      // Validate ownership
      AuthorizationService.validateResourceOwnership(req.user, search.userId || 0, operation);

      // Attach search to request for use in route handler
      req.resource = search;
      req.resourceOwner = search.userId;

      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Middleware to load and validate idea ownership
 */
export const validateIdeaOwnership = (operation: 'read' | 'write' | 'delete' = 'read') => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      return next(AppError.createAuthenticationError('Authentication required', 'AUTH_REQUIRED'));
    }

    const ideaId = parseInt(req.params.id || req.params.ideaId || '0');
    
    if (isNaN(ideaId)) {
      return next(AppError.createValidationError('Invalid idea ID', 'INVALID_IDEA_ID'));
    }

    try {
      const idea = await storage.getIdea(ideaId, req.user.id);

      if (!idea) {
        return next(AppError.createNotFoundError('Idea not found or access denied', 'IDEA_NOT_FOUND'));
      }

      // Validate ownership
      AuthorizationService.validateResourceOwnership(req.user, idea.userId, operation);

      // Attach idea to request for use in route handler
      req.resource = idea;
      req.resourceOwner = idea.userId;

      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Middleware to validate user profile access
 */
export const validateUserProfileAccess = (operation: 'read' | 'write' | 'delete' = 'read') => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      return next(AppError.createAuthenticationError('Authentication required', 'AUTH_REQUIRED'));
    }

    const targetUserId = parseInt(req.params.userId || req.params.id || '0');
    
    if (isNaN(targetUserId)) {
      return next(AppError.createValidationError('Invalid user ID', 'INVALID_USER_ID'));
    }

    try {
      // Validate access to user profile
      AuthorizationService.validateResourceOwnership(req.user, targetUserId, operation);

      // Attach target user ID to request
      req.resourceOwner = targetUserId;

      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Middleware to validate session ownership
 */
export const validateSessionOwnership = (operation: 'read' | 'write' | 'delete' = 'read') => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      return next(AppError.createAuthenticationError('Authentication required', 'AUTH_REQUIRED'));
    }

    const sessionId = req.params.sessionId || req.body.sessionId;
    
    if (!sessionId) {
      return next(AppError.createValidationError('Session ID required', 'MISSING_SESSION_ID'));
    }

    try {
      // Import session manager
      const { sessionManager } = await import('../services/sessionManager');
      
      const session = await sessionManager.getSessionById(sessionId);

      if (!session) {
        return next(AppError.createNotFoundError('Session not found', 'SESSION_NOT_FOUND'));
      }

      // Validate ownership
      AuthorizationService.validateResourceOwnership(req.user, session.userId, operation);

      // Attach session to request
      req.resource = session;
      req.resourceOwner = session.userId;

      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Generic middleware to validate resource ownership based on a custom loader function
 */
export const validateResourceOwnership = <T extends { userId: number }>(
  resourceLoader: (id: string | number, userId?: number) => Promise<T | null>,
  idParam: string = 'id',
  operation: 'read' | 'write' | 'delete' = 'read'
) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      return next(AppError.createAuthenticationError('Authentication required', 'AUTH_REQUIRED'));
    }

    const resourceId = req.params[idParam] || req.body[idParam];
    
    if (!resourceId) {
      return next(AppError.createValidationError(`${idParam} is required`, 'MISSING_RESOURCE_ID'));
    }

    try {
      const resource = await resourceLoader(resourceId, req.user.id);

      if (!resource) {
        return next(AppError.createNotFoundError('Resource not found or access denied', 'RESOURCE_NOT_FOUND'));
      }

      // Validate ownership
      AuthorizationService.validateResourceOwnership(req.user, resource.userId, operation);

      // Attach resource to request
      req.resource = resource;
      req.resourceOwner = resource.userId;

      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Middleware to ensure users can only access their own data in list endpoints
 */
export const enforceUserDataScope = (req: Request, res: Response, next: NextFunction): void => {
  if (!req.user) {
    return next(AppError.createAuthenticationError('Authentication required', 'AUTH_REQUIRED'));
  }

  // Add user ID filter to query parameters to ensure data scoping
  req.query.userId = req.user.id.toString();

  // Admins can override this by explicitly setting a different userId
  if (AuthorizationService.isAdmin(req.user) && req.query.targetUserId) {
    req.query.userId = req.query.targetUserId as string;
    delete req.query.targetUserId;
  }

  next();
};

/**
 * Middleware to validate bulk operations only affect user's own resources
 */
export const validateBulkOwnership = (userIdField: string = 'userId') => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(AppError.createAuthenticationError('Authentication required', 'AUTH_REQUIRED'));
    }

    const items = req.body.items || req.body;
    
    if (!Array.isArray(items)) {
      return next(AppError.createValidationError('Items array required for bulk operation', 'INVALID_BULK_DATA'));
    }

    // Check that all items belong to the current user (unless admin)
    const isAdmin = AuthorizationService.isAdmin(req.user);
    
    for (const item of items) {
      if (item[userIdField] && item[userIdField] !== req.user.id && !isAdmin) {
        return next(AppError.createForbiddenError(
          'Cannot perform bulk operation on resources owned by other users',
          'BULK_OWNERSHIP_VIOLATION'
        ));
      }
      
      // Set userId for items that don't have it
      if (!item[userIdField]) {
        item[userIdField] = req.user.id;
      }
    }

    next();
  };
};