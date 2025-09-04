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