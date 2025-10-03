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
 * 
 * When logging API requests for security monitoring, we need to be careful not to
 * log sensitive data that could be exploited if logs are compromised.
 * 
 * This function:
 * 1. Creates a shallow copy of the request body
 * 2. Replaces sensitive field values with '[REDACTED]'
 * 3. Preserves the structure so we can see what fields were sent
 * 
 * Why shallow copy?
 * - Prevents modifying the original request object
 * - Efficient for most use cases
 * - Deep copy would be overkill for typical request bodies
 * 
 * Security consideration:
 * - Even with sanitization, be careful with log storage and access
 * - Logs should be encrypted at rest and in transit
 * - Access to logs should be restricted to authorized personnel
 */
function sanitizeRequestBody(body: any): any {
  // Handle non-object bodies (primitives, null, undefined)
  if (!body || typeof body !== 'object') {
    return body;
  }

  // List of field names that commonly contain sensitive data
  // This is a defense-in-depth measure - we should also avoid logging auth endpoints entirely
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

  // Create shallow copy to avoid modifying original request
  const sanitized = { ...body };
  
  // Replace sensitive field values with redaction marker
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
 * 
 * Determines whether an error should be logged as a security event.
 * This helps security teams focus on actual security issues rather than
 * general application errors.
 * 
 * Classification strategy:
 * 1. Error type/name: Check if error class indicates security issue
 * 2. Error code: Check application-specific security error codes
 * 3. HTTP status: 401 (Unauthorized) and 403 (Forbidden) are security-related
 * 
 * Why this matters:
 * - Security logs should be actionable and not cluttered with noise
 * - Helps identify attack patterns (multiple auth failures, etc.)
 * - Enables automated alerting on security events
 * - Supports compliance requirements (audit trails)
 */
function isSecurityError(error: any): boolean {
  // Error types that indicate security issues
  // These are typically thrown by authentication/authorization middleware
  const securityErrorTypes = [
    'UnauthorizedError',
    'ForbiddenError',
    'AuthenticationError',
    'ValidationError',
    'RateLimitError'
  ];

  // Application-specific error codes for security events
  // These are custom codes we define in our error handling
  const securityErrorCodes = [
    'INVALID_TOKEN',
    'EXPIRED_TOKEN',
    'INSUFFICIENT_PERMISSIONS',
    'RATE_LIMIT_EXCEEDED',
    'INVALID_CREDENTIALS',
    'ACCOUNT_LOCKED',
    'SUSPICIOUS_ACTIVITY'
  ];

  // Check all three classification methods
  return securityErrorTypes.includes(error.name) ||  // Check error type
         securityErrorCodes.includes(error.code) ||  // Check error code
         error.statusCode === 401 ||                 // HTTP Unauthorized
         error.statusCode === 403;                   // HTTP Forbidden
}