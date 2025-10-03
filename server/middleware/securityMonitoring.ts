import { Request, Response, NextFunction } from 'express';
import { securityLogger } from '../services/securityLogger';
import { v4 as uuidv4 } from 'uuid';

/**
 * Middleware to add security context to requests
 */
export function addSecurityContext(req: Request, res: Response, next: NextFunction): void {
  try {
    // Generate unique request ID for correlation
    req.requestId = uuidv4();

    // Extract security-relevant information
    const ipAddress = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() 
      ?? req.headers['x-real-ip'] as string
      ?? req.connection.remoteAddress 
      ?? req.socket.remoteAddress 
      ?? 'unknown';

    const userAgent = req.headers['user-agent'] ?? 'unknown';

    req.securityContext = {
      ipAddress,
      userAgent,
      userId: req.user?.id,
      userEmail: req.user?.email,
      sessionId: (req.user as any)?.jti // JWT ID serves as session ID
    };

    next();
  } catch (error) {
    console.error('Error adding security context:', error);
    // Continue processing even if security context fails
    next();
  }
}

/**
 * Middleware to log API access for security monitoring
 */
export function logApiAccess(req: Request, res: Response, next: NextFunction): void {
  try {
    const startTime = Date.now();

    // Override res.end to capture response details
    const originalEnd = res.end.bind(res);
    res.end = ((...args: any[]) => {
      try {
        const duration = Date.now() - startTime;
        
        // Log the API access
        securityLogger.logApiAccess(
          req.method,
          req.path,
          res.statusCode,
          {
            userId: req.securityContext?.userId,
            userEmail: req.securityContext?.userEmail,
            ipAddress: req.securityContext?.ipAddress,
            userAgent: req.securityContext?.userAgent,
            sessionId: req.securityContext?.sessionId,
            requestId: req.requestId,
            metadata: {
              duration,
              contentLength: res.get('content-length'),
              referer: req.headers.referer,
              query: Object.keys(req.query).length > 0 ? req.query : undefined,
              body: shouldLogRequestBody(req) ? sanitizeRequestBody(req.body) : undefined
            }
          }
        ).catch(error => {
          console.error('Failed to log API access:', error);
        });
      } catch (error) {
        console.error('Error in logApiAccess response handler:', error);
      }

      // Call original end method with all arguments
      return originalEnd(...args);
    }) as typeof res.end;

    next();
  } catch (error) {
    console.error('Error setting up API access logging:', error);
    // Continue processing even if logging setup fails
    next();
  }
}

/**
 * Middleware to log authentication events
 */
export function logAuthenticationEvent(
  eventType: 'AUTH_SUCCESS' | 'AUTH_FAILURE',
  userEmail?: string,
  errorMessage?: string
) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      securityLogger.logAuthenticationEvent(
        eventType,
        userEmail || req.body?.email || 'unknown',
        {
          ipAddress: req.securityContext?.ipAddress,
          userAgent: req.securityContext?.userAgent,
          requestId: req.requestId,
          metadata: {
            endpoint: req.path,
            method: req.method
          }
        },
        errorMessage
      ).catch(error => {
        console.error('Failed to log authentication event:', error);
      });

      next();
    } catch (error) {
      console.error('Error in logAuthenticationEvent middleware:', error);
      // Continue processing even if logging fails
      next();
    }
  };
}

/**
 * Middleware to log data access events
 */
export function logDataAccess(
  resource: string,
  action: 'read' | 'create' | 'update' | 'delete'
) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const resourceId = req.params.id || req.params.userId || req.body?.id?.toString();
      
      securityLogger.logDataAccess(
        resource,
        resourceId || 'unknown',
        action,
        {
          userId: req.securityContext?.userId,
          userEmail: req.securityContext?.userEmail,
          ipAddress: req.securityContext?.ipAddress,
          userAgent: req.securityContext?.userAgent,
          sessionId: req.securityContext?.sessionId,
          requestId: req.requestId,
          resource: req.path,
          metadata: {
            method: req.method,
            query: req.query
          }
        }
      ).catch(error => {
        console.error('Failed to log data access:', error);
      });

      next();
    } catch (error) {
      console.error('Error in logDataAccess middleware:', error);
      // Continue processing even if logging fails
      next();
    }
  };
}

/**
 * Middleware to log suspicious activity
 */
export function logSuspiciousActivity(description: string, metadata?: Record<string, any>) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      securityLogger.logSuspiciousActivity(
        description,
        {
          userId: req.securityContext?.userId,
          userEmail: req.securityContext?.userEmail,
          ipAddress: req.securityContext?.ipAddress,
          userAgent: req.securityContext?.userAgent,
          sessionId: req.securityContext?.sessionId,
          requestId: req.requestId,
          resource: req.path,
          metadata: {
            method: req.method,
            query: req.query,
            ...metadata
          }
        },
        metadata
      ).catch(error => {
        console.error('Failed to log suspicious activity:', error);
      });

      next();
    } catch (error) {
      console.error('Error in logSuspiciousActivity middleware:', error);
      // Continue processing even if logging fails
      next();
    }
  };
}

/**
 * Middleware to log rate limiting events
 */
export function logRateLimitExceeded(req: Request, res: Response, next: NextFunction): void {
  try {
    securityLogger.logSecurityEvent(
      'RATE_LIMIT_EXCEEDED',
      'rate_limit_exceeded',
      false,
      {
        userId: req.securityContext?.userId,
        userEmail: req.securityContext?.userEmail,
        ipAddress: req.securityContext?.ipAddress,
        userAgent: req.securityContext?.userAgent,
        sessionId: req.securityContext?.sessionId,
        requestId: req.requestId,
        resource: req.path,
        metadata: {
          method: req.method,
          endpoint: req.path
        }
      },
      'Rate limit exceeded'
    ).catch(error => {
      console.error('Failed to log rate limit event:', error);
    });

    next();
  } catch (error) {
    console.error('Error in logRateLimitExceeded middleware:', error);
    // Continue processing even if logging fails
    next();
  }
}

/**
 * Determine if request body should be logged (avoid logging sensitive data)
 */
function shouldLogRequestBody(req: Request): boolean {
  // Don't log bodies for authentication endpoints or other sensitive operations
  const sensitiveEndpoints = [
    '/api/auth/login',
    '/api/auth/register',
    '/api/auth/reset-password',
    '/api/security/change-password'
  ];

  return !sensitiveEndpoints.some(endpoint => req.path.includes(endpoint));
}

/**
 * Sanitize request body to remove sensitive information
 */
function sanitizeRequestBody(body: any): any {
  if (!body || typeof body !== 'object') {
    return body;
  }

  const sensitiveFields = [
    'password',
    'currentPassword',
    'newPassword',
    'confirmPassword',
    'token',
    'secret',
    'key',
    'hash',
    'salt'
  ];

  const sanitized = { ...body };
  
  for (const field of sensitiveFields) {
    if (sanitized[field]) {
      sanitized[field] = '[REDACTED]';
    }
  }

  return sanitized;
}

/**
 * Express error handler that logs security-related errors
 */
export function securityErrorHandler(
  error: any,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Log security-related errors
  if (isSecurityError(error)) {
    securityLogger.logSecurityEvent(
      'SECURITY_VIOLATION',
      'security_error',
      false,
      {
        userId: req.securityContext?.userId,
        userEmail: req.securityContext?.userEmail,
        ipAddress: req.securityContext?.ipAddress,
        userAgent: req.securityContext?.userAgent,
        sessionId: req.securityContext?.sessionId,
        requestId: req.requestId,
        resource: req.path,
        metadata: {
          errorType: error.name,
          errorCode: error.code,
          method: req.method
        }
      },
      error.message
    ).catch(logError => {
      console.error('Failed to log security error:', logError);
    });
  }

  next(error);
}

/**
 * Check if an error is security-related
 */
function isSecurityError(error: any): boolean {
  const securityErrorTypes = [
    'UnauthorizedError',
    'ForbiddenError',
    'AuthenticationError',
    'ValidationError',
    'RateLimitError'
  ];

  const securityErrorCodes = [
    'INVALID_TOKEN',
    'EXPIRED_TOKEN',
    'INSUFFICIENT_PERMISSIONS',
    'RATE_LIMIT_EXCEEDED',
    'INVALID_CREDENTIALS',
    'ACCOUNT_LOCKED',
    'SUSPICIOUS_ACTIVITY'
  ];

  return securityErrorTypes.includes(error.name) || 
         securityErrorCodes.includes(error.code) ||
         error.statusCode === 401 ||
         error.statusCode === 403;
}