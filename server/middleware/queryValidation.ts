import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';

/**
 * Query result validation middleware to prevent data leakage
 */

// Define sensitive fields that should never be exposed to clients
const SENSITIVE_FIELDS = [
  'password',
  'passwordHash',
  'salt',
  'stripeCustomerId',
  'stripeSubscriptionId',
  'providerId',
  'sessionId',
  'refreshToken',
  'accessToken',
  'jti',
  'deviceInfo',
  'ipAddress',
  'internalNotes',
  'adminNotes'
];

// Define fields that should only be visible to the owner
const OWNER_ONLY_FIELDS = [
  'email',
  'firstName',
  'lastName',
  'profileImageUrl',
  'preferences',
  'searchCount',
  'lastResetDate',
  'trialUsed',
  'trialExpiration',
  'subscriptionStatus',
  'failedLoginAttempts',
  'lastFailedLogin',
  'accountLocked',
  'lockoutExpires'
];

/**
 * Remove sensitive fields from a single object
 */
function sanitizeObject(obj: any, userId?: string, isOwner: boolean = false): any {
  if (!obj || typeof obj !== 'object') return obj;
  
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item, userId, isOwner));
  }
  
  const sanitized: any = {};
  
  for (const [key, value] of Object.entries(obj)) {
    // Always remove sensitive fields
    if (SENSITIVE_FIELDS.includes(key)) {
      continue;
    }
    
    // Remove owner-only fields if not the owner
    if (!isOwner && OWNER_ONLY_FIELDS.includes(key)) {
      continue;
    }
    
    // Recursively sanitize nested objects
    if (value && typeof value === 'object') {
      sanitized[key] = sanitizeObject(value, userId, isOwner);
    } else {
      sanitized[key] = value;
    }
  }
  
  return sanitized;
}

/**
 * Validate that user can only access their own resources
 */
function validateResourceOwnership(resource: any, userId: string): boolean {
  if (!resource) return false;
  
  // Check if resource has userId field
  if (resource.userId !== undefined) {
    return resource.userId.toString() === userId.toString();
  }
  
  // Check if resource has user.id field
  if (resource.user?.id !== undefined) {
    return resource.user.id.toString() === userId.toString();
  }
  
  // Check if resource has ownerId field
  if (resource.ownerId !== undefined) {
    return resource.ownerId.toString() === userId.toString();
  }
  
  // Check if resource has createdBy field
  if (resource.createdBy !== undefined) {
    return resource.createdBy.toString() === userId.toString();
  }
  
  return false;
}

/**
 * Middleware to validate query results and prevent data leakage
 */
export function validateQueryResults(req: Request, res: Response, next: NextFunction) {
  const originalJson = res.json;
  const userId = (req as any).user?.id?.toString();
  
  res.json = function(data: any) {
    try {
      let sanitizedData = data;
      
      if (data && typeof data === 'object') {
        // Handle different response structures
        if (data.data) {
          // Response with data wrapper
          sanitizedData = {
            ...data,
            data: sanitizeObject(data.data, userId, true)
          };
        } else if (Array.isArray(data)) {
          // Array response - validate ownership for each item
          sanitizedData = data
            .filter(item => !userId || validateResourceOwnership(item, userId))
            .map(item => sanitizeObject(item, userId, validateResourceOwnership(item, userId)));
        } else {
          // Single object response
          const isOwner = !userId || validateResourceOwnership(data, userId);
          if (userId && !isOwner && (data.userId || data.user?.id || data.ownerId || data.createdBy)) {
            // User trying to access resource they don't own
            return originalJson.call(this, {
              error: 'Access denied',
              message: 'You do not have permission to access this resource',
              code: 'ACCESS_DENIED'
            });
          }
          sanitizedData = sanitizeObject(data, userId, isOwner);
        }
      }
      
      return originalJson.call(this, sanitizedData);
    } catch (error) {
      console.error('Query result validation error:', error);
      return originalJson.call(this, {
        error: 'Data validation failed',
        message: 'Internal server error',
        code: 'INTERNAL_ERROR'
      });
    }
  };
  
  next();
}

/**
 * Middleware specifically for user data endpoints
 */
export function validateUserData(req: Request, res: Response, next: NextFunction) {
  const originalJson = res.json;
  const currentUserId = (req as any).user?.id?.toString();
  const requestedUserId = req.params.id || req.params.userId;
  
  res.json = function(data: any) {
    try {
      // Check if user is trying to access another user's data
      if (requestedUserId && currentUserId !== requestedUserId.toString()) {
        return originalJson.call(this, {
          error: 'Access denied',
          message: 'You can only access your own user data',
          code: 'ACCESS_DENIED'
        });
      }
      
      // Sanitize user data
      const sanitizedData = sanitizeObject(data, currentUserId, true);
      return originalJson.call(this, sanitizedData);
    } catch (error) {
      console.error('User data validation error:', error);
      return originalJson.call(this, {
        error: 'Data validation failed',
        message: 'Internal server error',
        code: 'INTERNAL_ERROR'
      });
    }
  };
  
  next();
}

/**
 * Middleware for search and idea endpoints
 */
export function validateSearchData(req: Request, res: Response, next: NextFunction) {
  const originalJson = res.json;
  const userId = (req as any).user?.id?.toString();
  
  res.json = function(data: any) {
    try {
      let sanitizedData = data;
      
      if (data && typeof data === 'object') {
        if (data.search && data.results) {
          // Search response with results
          if (data.search.userId && data.search.userId.toString() !== userId) {
            return originalJson.call(this, {
              error: 'Access denied',
              message: 'You can only access your own searches',
              code: 'ACCESS_DENIED'
            });
          }
          
          sanitizedData = {
            search: sanitizeObject(data.search, userId, true),
            results: data.results.map((result: any) => sanitizeObject(result, userId, true))
          };
        } else if (Array.isArray(data)) {
          // Array of searches or ideas
          sanitizedData = data
            .filter(item => validateResourceOwnership(item, userId))
            .map(item => sanitizeObject(item, userId, true));
        } else {
          // Single search or idea
          if (!validateResourceOwnership(data, userId)) {
            return originalJson.call(this, {
              error: 'Access denied',
              message: 'You can only access your own resources',
              code: 'ACCESS_DENIED'
            });
          }
          sanitizedData = sanitizeObject(data, userId, true);
        }
      }
      
      return originalJson.call(this, sanitizedData);
    } catch (error) {
      console.error('Search data validation error:', error);
      return originalJson.call(this, {
        error: 'Data validation failed',
        message: 'Internal server error',
        code: 'INTERNAL_ERROR'
      });
    }
  };
  
  next();
}

/**
 * Middleware for admin endpoints (future use)
 */
export function validateAdminAccess(req: Request, res: Response, next: NextFunction) {
  const user = (req as any).user;
  
  if (!user || user.role !== 'admin') {
    return res.status(403).json({
      error: 'Access denied',
      message: 'Administrator access required',
      code: 'ADMIN_ACCESS_REQUIRED'
    });
  }
  
  next();
}

/**
 * Rate limiting validation for sensitive operations
 */
export function validateSensitiveOperation(maxAttempts: number = 5, windowMs: number = 15 * 60 * 1000) {
  const attempts = new Map<string, { count: number; resetTime: number }>();
  
  return (req: Request, res: Response, next: NextFunction) => {
    const key = req.ip + ':' + req.path;
    const now = Date.now();
    
    const userAttempts = attempts.get(key);
    
    if (!userAttempts || now > userAttempts.resetTime) {
      attempts.set(key, { count: 1, resetTime: now + windowMs });
      return next();
    }
    
    if (userAttempts.count >= maxAttempts) {
      console.warn('Rate limit exceeded for sensitive operation:', {
        ip: req.ip,
        path: req.path,
        userAgent: req.headers['user-agent'],
        attempts: userAttempts.count
      });
      
      return res.status(429).json({
        error: 'Rate limit exceeded',
        message: 'Too many attempts. Please try again later.',
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfter: Math.ceil((userAttempts.resetTime - now) / 1000)
      });
    }
    
    userAttempts.count++;
    next();
  };
}

export { SENSITIVE_FIELDS, OWNER_ONLY_FIELDS, sanitizeObject, validateResourceOwnership };