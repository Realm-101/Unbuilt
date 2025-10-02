import type { Request, Response, NextFunction } from 'express';
import { jwtService, type JWTPayload } from '../jwt';
import { authService } from '../auth';

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: number;
        email: string;
        role: string;
        jti: string;
      };
      token?: string;
    }
  }
}

export interface AuthenticatedRequest extends Request {
  user: {
    id: number;
    email: string;
    role: string;
    jti: string;
  };
  token: string;
}

/**
 * JWT Authentication middleware
 * Validates JWT tokens and attaches user information to request
 */
export const jwtAuth = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const token = jwtService.extractTokenFromHeader(authHeader);

    if (!token) {
      res.status(401).json({
        error: 'Authentication required',
        message: 'No token provided',
        code: 'NO_TOKEN'
      });
      return;
    }

    const payload = await jwtService.validateToken(token, 'access');
    if (!payload) {
      res.status(401).json({
        error: 'Authentication failed',
        message: 'Invalid or expired token',
        code: 'INVALID_TOKEN'
      });
      return;
    }

    // Verify user still exists and is active
    const user = await authService.getUserById(parseInt(payload.sub));
    if (!user || !user.isActive) {
      res.status(401).json({
        error: 'Authentication failed',
        message: 'User account not found or inactive',
        code: 'USER_INACTIVE'
      });
      return;
    }

    // Attach user info to request
    req.user = {
      id: parseInt(payload.sub),
      email: payload.email,
      role: payload.role,
      jti: payload.jti
    };
    req.token = token;

    next();
  } catch (error) {
    console.error('JWT Auth middleware error:', error);
    res.status(500).json({
      error: 'Authentication error',
      message: 'Internal server error during authentication',
      code: 'AUTH_ERROR'
    });
  }
};

/**
 * Optional JWT Authentication middleware
 * Attaches user information if token is valid, but doesn't require authentication
 */
export const optionalJwtAuth = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const token = jwtService.extractTokenFromHeader(authHeader);

    if (token) {
      const payload = await jwtService.validateToken(token, 'access');
      if (payload) {
        const user = await authService.getUserById(parseInt(payload.sub));
        if (user && user.isActive) {
          req.user = {
            id: parseInt(payload.sub),
            email: payload.email,
            role: payload.role,
            jti: payload.jti
          };
          req.token = token;
        }
      }
    }

    next();
  } catch (error) {
    console.error('Optional JWT Auth middleware error:', error);
    // Don't fail the request for optional auth
    next();
  }
};

/**
 * Role-based authorization middleware
 * Requires specific roles to access the route
 */
export const requireRole = (roles: string | string[]) => {
  const allowedRoles = Array.isArray(roles) ? roles : [roles];
  
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        error: 'Authentication required',
        message: 'User not authenticated',
        code: 'NOT_AUTHENTICATED'
      });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        error: 'Access denied',
        message: 'Insufficient permissions',
        code: 'INSUFFICIENT_PERMISSIONS'
      });
      return;
    }

    next();
  };
};

/**
 * Resource ownership middleware
 * Ensures user can only access their own resources
 */
export const requireOwnership = (userIdParam: string = 'userId') => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        error: 'Authentication required',
        message: 'User not authenticated',
        code: 'NOT_AUTHENTICATED'
      });
      return;
    }

    const resourceUserId = req.params[userIdParam] || req.body[userIdParam] || req.query[userIdParam];
    
    if (!resourceUserId) {
      res.status(400).json({
        error: 'Bad request',
        message: 'User ID parameter missing',
        code: 'MISSING_USER_ID'
      });
      return;
    }

    if (parseInt(resourceUserId) !== req.user.id) {
      res.status(403).json({
        error: 'Access denied',
        message: 'Cannot access another user\'s resources',
        code: 'RESOURCE_ACCESS_DENIED'
      });
      return;
    }

    next();
  };
};

/**
 * Admin or owner middleware
 * Allows access if user is admin or owns the resource
 */
export const requireAdminOrOwnership = (userIdParam: string = 'userId') => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        error: 'Authentication required',
        message: 'User not authenticated',
        code: 'NOT_AUTHENTICATED'
      });
      return;
    }

    // Allow if user is admin
    if (req.user.role === 'admin' || req.user.role === 'enterprise') {
      next();
      return;
    }

    // Otherwise check ownership
    const resourceUserId = req.params[userIdParam] || req.body[userIdParam] || req.query[userIdParam];
    
    if (!resourceUserId) {
      res.status(400).json({
        error: 'Bad request',
        message: 'User ID parameter missing',
        code: 'MISSING_USER_ID'
      });
      return;
    }

    if (parseInt(resourceUserId) !== req.user.id) {
      res.status(403).json({
        error: 'Access denied',
        message: 'Admin privileges or resource ownership required',
        code: 'ADMIN_OR_OWNER_REQUIRED'
      });
      return;
    }

    next();
  };
};

/**
 * Rate limiting middleware for authentication endpoints
 */
export const authRateLimit = (maxAttempts: number = 5, windowMs: number = 15 * 60 * 1000) => {
  const attempts = new Map<string, { count: number; resetTime: number }>();

  return (req: Request, res: Response, next: NextFunction): void => {
    const clientId = req.ip || req.connection.remoteAddress || 'unknown';
    const now = Date.now();
    
    const clientAttempts = attempts.get(clientId);
    
    if (!clientAttempts || now > clientAttempts.resetTime) {
      // Reset or initialize attempts
      attempts.set(clientId, { count: 1, resetTime: now + windowMs });
      next();
      return;
    }

    if (clientAttempts.count >= maxAttempts) {
      res.status(429).json({
        error: 'Too many requests',
        message: 'Rate limit exceeded. Please try again later.',
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfter: Math.ceil((clientAttempts.resetTime - now) / 1000)
      });
      return;
    }

    clientAttempts.count++;
    next();
  };
};