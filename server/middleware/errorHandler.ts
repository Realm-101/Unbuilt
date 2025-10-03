import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import crypto from 'crypto';

// Error types for classification
export enum ErrorType {
  AUTHENTICATION = 'AUTHENTICATION',
  AUTHORIZATION = 'AUTHORIZATION',
  VALIDATION = 'VALIDATION',
  RATE_LIMIT = 'RATE_LIMIT',
  SYSTEM = 'SYSTEM',
  NOT_FOUND = 'NOT_FOUND',
  CONFLICT = 'CONFLICT'
}

// Security event types for logging
export enum SecurityEventType {
  AUTH_FAILURE = 'AUTH_FAILURE',
  AUTHORIZATION_FAILURE = 'AUTHORIZATION_FAILURE',
  SQL_INJECTION_ATTEMPT = 'SQL_INJECTION_ATTEMPT',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  SYSTEM_ERROR = 'SYSTEM_ERROR'
}

// Standard error response interface
export interface ErrorResponse {
  success: false;
  error: string;
  message: string;
  code: string;
  timestamp: string;
  requestId: string;
  statusCode?: number;
}

// Security event interface for logging
export interface SecurityEvent {
  type: SecurityEventType;
  userId?: string;
  ip: string;
  userAgent: string;
  endpoint: string;
  method: string;
  details: Record<string, any>;
  timestamp: Date;
  requestId: string;
}



// Sensitive patterns that should never be exposed in error messages
const SENSITIVE_PATTERNS = [
  /password/i,
  /secret/i,
  /key/i,
  /token/i,
  /hash/i,
  /salt/i,
  /connection string/i,
  /database/i,
  /credential/i,
  /auth/i,
  /session/i
];

// Generic error messages for security-sensitive failures
const GENERIC_MESSAGES: Record<string, string> = {
  'Invalid credentials': 'Authentication failed',
  'Password incorrect': 'Authentication failed',
  'Account locked': 'Account temporarily unavailable',
  'Token expired': 'Session expired, please login again',
  'Invalid token': 'Authentication required',
  'Access denied': 'Insufficient permissions',
  'Unauthorized': 'Authentication required',
  'Forbidden': 'Access denied'
};

// Error code mappings
const ERROR_CODE_MAP: Record<ErrorType, { prefix: string; defaultMessage: string }> = {
  [ErrorType.AUTHENTICATION]: { prefix: 'AUTH', defaultMessage: 'Authentication failed' },
  [ErrorType.AUTHORIZATION]: { prefix: 'AUTHZ', defaultMessage: 'Access denied' },
  [ErrorType.VALIDATION]: { prefix: 'VAL', defaultMessage: 'Invalid input data' },
  [ErrorType.RATE_LIMIT]: { prefix: 'RATE', defaultMessage: 'Too many requests' },
  [ErrorType.SYSTEM]: { prefix: 'SYS', defaultMessage: 'Internal server error' },
  [ErrorType.NOT_FOUND]: { prefix: 'NOT_FOUND', defaultMessage: 'Resource not found' },
  [ErrorType.CONFLICT]: { prefix: 'CONFLICT', defaultMessage: 'Resource conflict' }
};

// Custom error class for application errors
export class AppError extends Error {
  public readonly type: ErrorType;
  public readonly statusCode: number;
  public readonly code: string;
  public readonly isOperational: boolean;
  public readonly details?: Record<string, any>;

  constructor(
    message: string,
    type: ErrorType,
    statusCode: number,
    code: string,
    isOperational = true,
    details?: Record<string, any>
  ) {
    super(message);
    this.type = type;
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = isOperational;
    this.details = details;

    Error.captureStackTrace(this, this.constructor);
  }

  /**
   * Create specific error types for common scenarios
   */
  static createAuthenticationError(message = 'Authentication failed', code = 'AUTH_FAILED'): AppError {
    return new AppError(message, ErrorType.AUTHENTICATION, 401, code);
  }

  static createAuthorizationError(message = 'Access denied', code = 'AUTHZ_DENIED'): AppError {
    return new AppError(message, ErrorType.AUTHORIZATION, 403, code);
  }

  static createForbiddenError(message = 'Forbidden', code = 'FORBIDDEN'): AppError {
    return new AppError(message, ErrorType.AUTHORIZATION, 403, code);
  }

  static createValidationError(message = 'Invalid input data', code = 'VAL_INVALID', details?: Record<string, any>): AppError {
    return new AppError(message, ErrorType.VALIDATION, 400, code, true, details);
  }

  static createNotFoundError(message = 'Resource not found', code = 'NOT_FOUND'): AppError {
    return new AppError(message, ErrorType.NOT_FOUND, 404, code);
  }

  static createConflictError(message = 'Resource conflict', code = 'CONFLICT'): AppError {
    return new AppError(message, ErrorType.CONFLICT, 409, code);
  }

  static createRateLimitError(message = 'Too many requests', code = 'RATE_EXCEEDED', details?: Record<string, any>): AppError {
    return new AppError(message, ErrorType.RATE_LIMIT, 429, code, true, details);
  }

  static createSystemError(message = 'Internal server error', code = 'SYS_ERROR'): AppError {
    return new AppError(message, ErrorType.SYSTEM, 500, code);
  }
}

class SecureErrorHandler {
  private securityLogger: SecurityEvent[] = [];

  /**
   * Sanitize error message to remove sensitive information
   */
  private sanitizeErrorMessage(message: string): string {
    let sanitized = message;

    // First, replace known sensitive messages with generic ones
    for (const [sensitive, generic] of Object.entries(GENERIC_MESSAGES)) {
      if (sanitized.toLowerCase().includes(sensitive.toLowerCase())) {
        return generic;
      }
    }

    // Then check for sensitive patterns and replace with generic messages
    for (const pattern of SENSITIVE_PATTERNS) {
      if (pattern.test(sanitized)) {
        return 'Internal server error';
      }
    }

    return sanitized;
  }

  /**
   * Generate a unique request ID for tracking
   */
  private generateRequestId(): string {
    return crypto.randomBytes(8).toString('hex');
  }

  /**
   * Log security event for monitoring and auditing
   */
  private logSecurityEvent(event: SecurityEvent): void {
    // In production, this would write to a secure logging system
    console.error('SECURITY_EVENT:', JSON.stringify({
      ...event,
      timestamp: event.timestamp.toISOString()
    }));

    // Store in memory for now (in production, use proper logging service)
    this.securityLogger.push(event);
  }

  /**
   * Create standardized error response
   */
  private createErrorResponse(
    error: Error | AppError,
    requestId: string,
    statusCode?: number
  ): ErrorResponse {
    const isAppError = error instanceof AppError;
    const errorType = isAppError ? error.type : ErrorType.SYSTEM;
    const code = isAppError ? error.code : `${ERROR_CODE_MAP[ErrorType.SYSTEM].prefix}_UNKNOWN`;
    
    const sanitizedMessage = this.sanitizeErrorMessage(error.message);
    const finalStatusCode = statusCode || (isAppError ? error.statusCode : 500);

    return {
      success: false,
      error: ERROR_CODE_MAP[errorType].defaultMessage,
      message: sanitizedMessage,
      code,
      timestamp: new Date().toISOString(),
      requestId,
      statusCode: finalStatusCode
    };
  }

  /**
   * Handle different types of errors and create appropriate responses
   */
  public handleError(
    error: Error | AppError,
    req: Request,
    res: Response,
    next: NextFunction
  ): void {
    const requestId = this.generateRequestId();
    const isAppError = error instanceof AppError;

    // Log detailed error information internally
    console.error(`[${requestId}] Error in ${req.method} ${req.path}:`, {
      message: error.message,
      stack: error.stack,
      type: isAppError ? error.type : 'UNKNOWN',
      userId: (req as any).user?.id,
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.headers['user-agent']
    });

    // Determine security event type and log if necessary
    let securityEventType: SecurityEventType | null = null;
    
    if (isAppError) {
      switch (error.type) {
        case ErrorType.AUTHENTICATION:
          securityEventType = SecurityEventType.AUTH_FAILURE;
          break;
        case ErrorType.AUTHORIZATION:
          securityEventType = SecurityEventType.AUTHORIZATION_FAILURE;
          break;
        case ErrorType.VALIDATION:
          securityEventType = SecurityEventType.VALIDATION_ERROR;
          break;
        case ErrorType.RATE_LIMIT:
          securityEventType = SecurityEventType.RATE_LIMIT_EXCEEDED;
          break;
        case ErrorType.SYSTEM:
          securityEventType = SecurityEventType.SYSTEM_ERROR;
          break;
      }
    } else {
      securityEventType = SecurityEventType.SYSTEM_ERROR;
    }

    // Log security event if applicable
    if (securityEventType) {
      this.logSecurityEvent({
        type: securityEventType,
        userId: (req as any).user?.id?.toString(),
        ip: req.ip || req.connection.remoteAddress || 'unknown',
        userAgent: req.headers['user-agent'] || 'unknown',
        endpoint: req.path,
        method: req.method,
        details: {
          originalMessage: error.message,
          errorType: isAppError ? error.type : 'UNKNOWN',
          ...(isAppError && error.details ? error.details : {})
        },
        timestamp: new Date(),
        requestId
      });
    }

    // Handle Zod validation errors
    if (error instanceof z.ZodError) {
      const validationError = new AppError(
        'Invalid input data',
        ErrorType.VALIDATION,
        400,
        'VAL_INVALID_INPUT',
        true,
        { validationErrors: error.errors }
      );
      
      const errorResponse = this.createErrorResponse(validationError, requestId);
      res.status(400).json(errorResponse);
      return;
    }

    // Create sanitized error response
    const errorResponse = this.createErrorResponse(error, requestId);
    const statusCode = errorResponse.statusCode || 500;

    res.status(statusCode).json(errorResponse);
    return;
  }

  /**
   * Get security events (for monitoring/debugging)
   */
  public getSecurityEvents(): SecurityEvent[] {
    return [...this.securityLogger];
  }

  /**
   * Clear security events (for testing)
   */
  public clearSecurityEvents(): void {
    this.securityLogger = [];
  }
}

// Create singleton instance
export const secureErrorHandler = new SecureErrorHandler();

// Express error handling middleware
export const errorHandlerMiddleware = (
  error: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  secureErrorHandler.handleError(error, req, res, next);
};

// Async error wrapper for route handlers
export const asyncHandler = (fn: (req: Request, res: Response, next?: NextFunction) => Promise<void>) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// Helper function to send standardized success responses
export const sendSuccess = (
  res: Response,
  data: any,
  message = 'Success',
  statusCode = 200
): void => {
  res.status(statusCode).json({
    success: true,
    message,
    data,
    timestamp: new Date().toISOString()
  });
};

// Helper function to send standardized error responses
export const sendError = (
  res: Response,
  error: AppError | Error,
  requestId?: string
): void => {
  const id = requestId || crypto.randomBytes(8).toString('hex');
  const errorResponse = secureErrorHandler['createErrorResponse'](error, id);
  res.status(errorResponse.statusCode || 500).json(errorResponse);
};

// Export types and classes (already exported above)