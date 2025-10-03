import { Request, Response, NextFunction } from 'express';
import { authService } from '../auth';
import type { User } from '@shared/schema';

declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

/**
 * Authentication middleware that requires a valid session
 * 
 * Validates the session cookie and attaches the authenticated user to the request object.
 * Returns 401 if no session is found or if the session is invalid.
 * 
 * @param req - Express request object
 * @param res - Express response object
 * @param next - Express next function
 * 
 * @example
 * ```typescript
 * app.get('/api/protected', requireAuth, (req, res) => {
 *   res.json({ user: req.user });
 * });
 * ```
 */
export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const sessionId = req.cookies.sessionId;
  
  if (!sessionId) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  const user = await authService.getSessionUser(sessionId);
  
  if (!user) {
    return res.status(401).json({ error: 'Invalid session' });
  }
  
  req.user = user;
  next();
}

/**
 * Optional authentication middleware
 * 
 * Attempts to authenticate the user via session cookie but doesn't fail if no session exists.
 * Useful for endpoints that provide different functionality for authenticated vs anonymous users.
 * 
 * @param req - Express request object
 * @param res - Express response object
 * @param next - Express next function
 * 
 * @example
 * ```typescript
 * app.get('/api/public', optionalAuth, (req, res) => {
 *   if (req.user) {
 *     res.json({ message: 'Welcome back!', user: req.user });
 *   } else {
 *     res.json({ message: 'Welcome guest!' });
 *   }
 * });
 * ```
 */
export async function optionalAuth(req: Request, res: Response, next: NextFunction) {
  const sessionId = req.cookies.sessionId;
  
  if (sessionId) {
    const user = await authService.getSessionUser(sessionId);
    if (user) {
      req.user = user;
    }
  }
  
  next();
}

/**
 * Plan-based authorization middleware factory
 * 
 * Creates middleware that requires the user to have a specific subscription plan level.
 * Supports hierarchical plan checking (enterprise includes pro features).
 * 
 * @param planLevel - Required plan level ('pro' or 'enterprise')
 * @returns Express middleware function
 * 
 * @example
 * ```typescript
 * // Require pro or enterprise plan
 * app.get('/api/pro-feature', requireAuth, requirePlan('pro'), handler);
 * 
 * // Require enterprise plan only
 * app.get('/api/enterprise-feature', requireAuth, requirePlan('enterprise'), handler);
 * ```
 */
export async function requirePlan(planLevel: 'pro' | 'enterprise') {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    const userPlan = req.user.plan;
    
    if (planLevel === 'pro' && (userPlan === 'pro' || userPlan === 'enterprise')) {
      return next();
    }
    
    if (planLevel === 'enterprise' && userPlan === 'enterprise') {
      return next();
    }
    
    return res.status(403).json({ error: 'Upgrade required' });
  };
}