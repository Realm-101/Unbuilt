import { Request, Response, NextFunction } from 'express';
import { analyticsService } from '../services/analytics';

/**
 * Middleware to track API requests and user actions
 * Requirements: 6.1, 6.2, 6.3
 */

/**
 * Track page views for GET requests to page routes
 */
export function trackPageView(req: Request, res: Response, next: NextFunction) {
  // Only track GET requests to avoid duplicate tracking
  if (req.method === 'GET') {
    const userId = req.user?.id;
    const page = req.path;
    const referrer = req.get('referer');

    // Track asynchronously without blocking the request
    analyticsService.trackPageView(userId, page, referrer).catch((error) => {
      console.error('Failed to track page view:', error);
    });
  }

  next();
}

/**
 * Track API requests (for monitoring and analytics)
 */
export function trackApiRequest(req: Request, res: Response, next: NextFunction) {
  const userId = req.user?.id;
  const endpoint = req.path;
  const method = req.method;

  // Track asynchronously
  analyticsService.trackEvent({
    eventType: 'api_request',
    userId,
    metadata: {
      endpoint,
      method,
      statusCode: res.statusCode,
    },
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
  }).catch((error) => {
    console.error('Failed to track API request:', error);
  });

  next();
}

/**
 * Middleware to track search queries
 * Should be called after search is performed
 */
export function trackSearchMiddleware(req: Request, res: Response, next: NextFunction) {
  // Store original json method
  const originalJson = res.json.bind(res);

  // Override json method to track after response
  res.json = function (data: any) {
    // Track search if this is a search endpoint
    if (req.path.includes('/search') && req.method === 'POST' && data.results) {
      const userId = req.user?.id;
      const query = req.body.query;
      const resultsCount = data.results?.length || 0;

      analyticsService.trackSearch(userId, query, resultsCount).catch((error) => {
        console.error('Failed to track search:', error);
      });
    }

    // Call original json method
    return originalJson(data);
  };

  next();
}

/**
 * Middleware to track export generation
 * Should be called on export endpoints
 */
export function trackExportMiddleware(req: Request, res: Response, next: NextFunction) {
  // Store original send method
  const originalSend = res.send.bind(res);

  // Override send method to track after response
  res.send = function (data: any) {
    // Track export if this is an export endpoint and successful
    if (req.path.includes('/export') && res.statusCode === 200) {
      const userId = req.user?.id;
      const format = req.body.format || req.query.format || 'unknown';
      const searchId = req.body.searchId || req.query.searchId;

      analyticsService.trackExport(userId, format as string, Number(searchId)).catch((error) => {
        console.error('Failed to track export:', error);
      });
    }

    // Call original send method
    return originalSend(data);
  };

  next();
}

/**
 * Track feature usage
 */
export function trackFeature(feature: string, action: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    const userId = req.user?.id;

    analyticsService.trackFeatureUsage(userId, feature, action).catch((error) => {
      console.error('Failed to track feature usage:', error);
    });

    next();
  };
}

/**
 * Track user signup (to be called in auth routes)
 */
export async function trackSignupEvent(userId: number, provider: string): Promise<void> {
  try {
    await analyticsService.trackSignup(userId, provider);
  } catch (error) {
    console.error('Failed to track signup:', error);
  }
}

/**
 * Track subscription events (to be called in Stripe webhook handler)
 */
export async function trackSubscriptionEvent(
  userId: number,
  action: string,
  tier: string
): Promise<void> {
  try {
    await analyticsService.trackSubscription(userId, action, tier);
  } catch (error) {
    console.error('Failed to track subscription:', error);
  }
}
