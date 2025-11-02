/**
 * Feature Flag Middleware
 * 
 * Middleware for checking feature flags before allowing access to routes
 */

import { Request, Response, NextFunction } from 'express';
import { featureFlagService } from '../services/featureFlagService';
import { logger } from '../config/logger';

/**
 * Middleware to require a feature flag to be enabled
 */
export function requireFeature(featureName: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id;
      const userTier = req.user?.plan;

      const check = await featureFlagService.isFeatureEnabled(
        featureName,
        userId,
        userTier
      );

      if (!check.enabled) {
        logger.warn('Feature access denied', {
          featureName,
          userId,
          userTier,
          reason: check.reason
        });

        return res.status(403).json({
          success: false,
          error: 'Feature not available',
          message: `This feature is not currently available. ${check.reason}`,
          featureName
        });
      }

      // Feature is enabled, continue
      next();
    } catch (error) {
      logger.error('Error checking feature flag', { featureName, error });
      
      // Fail open in case of errors (allow access)
      // Change to fail closed (deny access) if preferred
      next();
    }
  };
}

/**
 * Middleware to add feature flags to request object
 */
export async function addFeatureFlags(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const userId = req.user?.id;
    const userTier = req.user?.plan;

    if (userId) {
      const features = await featureFlagService.getUserFeatures(userId, userTier);
      (req as any).features = features;
    }

    next();
  } catch (error) {
    logger.error('Error adding feature flags to request', { error });
    next();
  }
}

/**
 * Helper to check if a feature is enabled in route handlers
 */
export async function isFeatureEnabled(
  req: Request,
  featureName: string
): Promise<boolean> {
  const userId = req.user?.id;
  const userTier = req.user?.plan;

  const check = await featureFlagService.isFeatureEnabled(
    featureName,
    userId,
    userTier
  );

  return check.enabled;
}
