import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import crypto from 'crypto';

/**
 * Error Handler Middleware
 * 
 * Provides centralized error handling with security-focused error sanitization,
 * standardized error responses, and security event logging.
 * 
 * @module errorHandler
 */

/**
 * Error types for classification
 * Used to categorize errors for appropriate handling and logging
 */
export enum ErrorType {
  AUTHENTICATION = 'AUTHENTICATION',
  AUTHORIZATION = 'AUTHORIZATION',
  VALIDATION = 'VALIDATION',
  RATE_LIMIT = 'RATE_LIMIT',
  SYSTEM = 'SYSTEM',
  NOT_FOUND = 'NOT_FOUND',
  CONFLICT = 'CONFLICT'
}

/**
 * Security event types for logging
 * Used to categorize security-related events for monitoring and auditing
 */
export enum SecurityEventType {
  AUTH_FAILURE = 'AUTH_FAILURE',
  AUTHORIZATION_FAILURE = 'AUTHORIZATION_FAILURE',
  SQL_INJECTION_ATTEMPT = 'SQL_INJECTION_ATTEMPT',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  SYSTEM_ERROR = 'SYSTEM_ERROR'
}

/**
 * Standard error response interface
 * Defines the structure of all error responses sent to clients
 */
export interface ErrorResponse {
  success: false;
  error: string;
  message: string;
  code: string;
  timestamp: string;
  requestId: string;
  statusCode?: number;
}

/**
 * Security event interface for logging
 * Defines the structure of security events for audit trails
 */
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

/**
 * Custom error class for application errors
 * 
 * Extends the standard Error class with additional properties for error classification,
 * HTTP status codes, and operational error identification.
 * 
 * @example
 * ```typescript
 * throw new AppError(
 *   'User not found',
 *   ErrorType.NOT_FOUND,
 *   404,
 *   'USER_NOT_FOUND'
 * );
 * ```
 */
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
   * Create an authentication error (401)
   * 
   * @param message - Error message
   * @param code - Error code for client identification
   * @returns AppError instance with 401 status
   */
  static createAuthenticationError(message = 'Authentication failed', code = 'AUTH_FAILED'): AppError {
    return new AppError(message, ErrorType.AUTHENTICATION, 401, code);
  }

  /**
   * Create an authorization error (403)
   * 
   * @param message - Error message
   * @param code - Error code for client identification
   * @returns AppError instance with 403 status
   */
  static createAuthorizationError(message = 'Access denied', code = 'AUTHZ_DENIED'): AppError {
    return new AppError(message, ErrorType.AUTHORIZATION, 403, code);
  }

  /**
   * Create a forbidden error (403)
   * 
   * @param message - Error message
   * @param code - Error code for client identification
   * @returns AppError instance with 403 status
   */
  static createForbiddenError(message = 'Forbidden', code = 'FORBIDDEN'): AppError {
    return new AppError(message, ErrorType.AUTHORIZATION, 403, code);
  }

  /**
   * Create a validation error (400)
   * 
   * @param message - Error message
   * @param code - Error code for client identification
   * @param details - Additional validation error details
   * @returns AppError instance with 400 status
   */
  static createValidationError(message = 'Invalid input data', code = 'VAL_INVALID', details?: Record<string, any>): AppError {
    return new AppError(message, ErrorType.VALIDATION, 400, code, true, details);
  }

  /**
   * Create a not found error (404)
   * 
   * @param message - Error message
   * @param code - Error code for client identification
   * @returns AppError instance with 404 status
   */
  static createNotFoundError(message = 'Resource not found', code = 'NOT_FOUND'): AppError {
    return new AppError(message, ErrorType.NOT_FOUND, 404, code);
  }

  /**
   * Create a conflict error (409)
   * 
   * @param message - Error message
   * @param code - Error code for client identification
   * @returns AppError instance with 409 status
   */
  static createConflictError(message = 'Resource conflict', code = 'CONFLICT'): AppError {
    return new AppError(message, ErrorType.CONFLICT, 409, code);
  }

  /**
   * Create a rate limit error (429)
   * 
   * @param message - Error message
   * @param code - Error code for client identification
   * @param details - Additional rate limit details (e.g., retryAfter)
   * @returns AppError instance with 429 status
   */
  static createRateLimitError(message = 'Too many requests', code = 'RATE_EXCEEDED', details?: Record<string, any>): AppError {
    return new AppError(message, ErrorType.RATE_LIMIT, 429, code, true, details);
  }

  /**
   * Create a system error (500)
   * 
   * @param message - Error message
   * @param code - Error code for client identification
   * @returns AppError instance with 500 status
   */
  static createSystemError(message = 'Internal server error', code = 'SYS_ERROR'): AppError {
    return new AppError(message, ErrorType.SYSTEM, 500, code);
  }
}

/**
 * Secure error handler class
 * 
 * Handles error sanitization, logging, and response generation with security best practices.
 * Prevents sensitive information leakage in error messages.
 */
class SecureErrorHandler {
  private securityLogger: SecurityEvent[] = [];

  /**
   * Sanitize error message to remove sensitive information
   * 
   * Replaces sensitive patterns and known sensitive messages with generic alternatives
   * to prevent information disclosure.
   * 
   * @param message - Original error message
   * @returns Sanitized error message safe for client consumption
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
   * 
   * Creates a random hex string for correlating errors across logs and responses.
   * 
   * @returns 16-character hex string
   */
  private generateRequestId(): string {
    return crypto.randomBytes(8).toString('hex');
  }

  /**
   * Format Zod validation errors into user-friendly messages
   * 
   * Converts Zod error objects into structured field-level error messages
   * that can be displayed to users.
   * 
   * @param error - Zod validation error
   * @returns Formatted validation error with field-specific messages
   */
  private formatValidationErrors(error: z.ZodError): {
    message: string;
    fields: Record<string, string>;
  } {
    const fields: Record<string, string> = {};
    
    error.errors.forEach((err) => {
      const path = err.path.join('.');
      const message = this.getUserFriendlyValidationMessage(err);
      fields[path] = message;
    });

    const fieldCount = Object.keys(fields).length;
    const message = fieldCount === 1
      ? 'Please correct the highlighted field'
      : `Please correct ${fieldCount} fields`;

    return { message, fields };
  }

  /**
   * Convert Zod error to user-friendly message
   * 
   * @param error - Individual Zod error
   * @returns User-friendly error message
   */
  private getUserFriendlyValidationMessage(error: z.ZodIssue): string {
    const fieldName = error.path[error.path.length - 1] || 'field';
    
    switch (error.code) {
      case 'invalid_type':
        return `${fieldName} must be a valid ${error.expected}`;
      
      case 'too_small':
        if (error.type === 'string') {
          return `${fieldName} must be at least ${error.minimum} characters`;
        }
        if (error.type === 'number') {
          return `${fieldName} must be at least ${error.minimum}`;
        }
        if (error.type === 'array') {
          return `${fieldName} must contain at least ${error.minimum} items`;
        }
        return error.message;
      
      case 'too_big':
        if (error.type === 'string') {
          return `${fieldName} must be at most ${error.maximum} characters`;
        }
        if (error.type === 'number') {
          return `${fieldName} must be at most ${error.maximum}`;
        }
        if (error.type === 'array') {
          return `${fieldName} must contain at most ${error.maximum} items`;
        }
        return error.message;
      
      case 'invalid_string':
        if (error.validation === 'email') {
          return `${fieldName} must be a valid email address`;
        }
        if (error.validation === 'url') {
          return `${fieldName} must be a valid URL`;
        }
        return `${fieldName} format is invalid`;
      
      case 'invalid_enum_value':
        return `${fieldName} must be one of: ${error.options.join(', ')}`;
      
      default:
        return error.message || `${fieldName} is invalid`;
    }
  }

  /**
   * Detect if error is network-related
   * 
   * @param error - Error to check
   * @returns True if error is network-related
   */
  private isNetworkError(error: Error): boolean {
    // Only check for actual network error codes, not generic keywords
    const networkErrorCodes = [
      'ECONNREFUSED',
      'ENOTFOUND',
      'ETIMEDOUT',
      'ECONNRESET',
      'ENETUNREACH',
      'EHOSTUNREACH'
    ];

    // Check if error message or code contains actual network error codes
    const errorString = `${error.message} ${error.name} ${(error as any).code || ''}`.toUpperCase();
    
    return networkErrorCodes.some(code => errorString.includes(code));
  }

  /**
   * Log security event for monitoring and auditing
   * 
   * Records security-related events for analysis and compliance.
   * In production, this should integrate with a proper logging service.
   * 
   * @param event - Security event to log
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
   * 
   * Generates a consistent error response structure with sanitized messages.
   * 
   * @param error - Error object to convert to response
   * @param requestId - Unique request identifier for tracking
   * @param statusCode - Optional HTTP status code override
   * @returns Standardized error response object
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
   * 
   * Main error handling method that processes errors, logs security events,
   * and sends sanitized responses to clients.
   * 
   * @param error - Error to handle
   * @param req - Express request object
   * @param res - Express response object
   * @param next - Express next function
   */
  public handleError(
    error: Error | AppError,
    req: Request,
    res: Response,
    next: NextFunction
  ): void {
    const requestId = this.generateRequestId();
    const isAppError = error instanceof AppError;

    // Detect network errors
    const isNetworkErr = this.isNetworkError(error);
    if (isNetworkErr && !isAppError) {
      const networkError = new AppError(
        'Network connection error. Please check your connection and try again.',
        ErrorType.SYSTEM,
        503,
        'SYS_NETWORK_ERROR'
      );
      const errorResponse = this.createErrorResponse(networkError, requestId);
      res.status(503).json(errorResponse);
      return;
    }

    // Log detailed error information internally
    console.error(`[${requestId}] Error in ${req.method} ${req.path}:`, {
      message: error.message,
      stack: error.stack,
      type: isAppError ? error.type : 'UNKNOWN',
      userId: (req as any).user?.id,
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.headers['user-agent'],
      isNetworkError: isNetworkErr
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
        ip: req.ip ?? req.connection.remoteAddress ?? 'unknown',
        userAgent: req.headers['user-agent'] ?? 'unknown',
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

    // Handle Zod validation errors with formatted messages
    if (error instanceof z.ZodError) {
      const formattedErrors = this.formatValidationErrors(error);
      const validationError = new AppError(
        formattedErrors.message,
        ErrorType.VALIDATION,
        400,
        'VAL_INVALID_INPUT',
        true,
        { 
          validationErrors: error.errors,
          fields: formattedErrors.fields
        }
      );
      
      const errorResponse = this.createErrorResponse(validationError, requestId);
      res.status(400).json({
        ...errorResponse,
        fields: formattedErrors.fields
      });
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
   * 
   * Returns a copy of all logged security events.
   * Useful for testing and monitoring purposes.
   * 
   * @returns Array of security events
   */
  public getSecurityEvents(): SecurityEvent[] {
    return [...this.securityLogger];
  }

  /**
   * Clear security events (for testing)
   * 
   * Removes all logged security events from memory.
   * Should only be used in testing environments.
   */
  public clearSecurityEvents(): void {
    this.securityLogger = [];
  }
}

/**
 * Singleton instance of the secure error handler
 */
export const secureErrorHandler = new SecureErrorHandler();

/**
 * Express error handling middleware
 * 
 * Catches all errors thrown in the application and processes them through
 * the secure error handler. Should be registered after all other middleware.
 * 
 * @param error - Error object
 * @param req - Express request object
 * @param res - Express response object
 * @param next - Express next function
 * 
 * @example
 * ```typescript
 * app.use(errorHandlerMiddleware);
 * ```
 */
export const errorHandlerMiddleware = (
  error: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  secureErrorHandler.handleError(error, req, res, next);
};

/**
 * Async error wrapper for route handlers
 * 
 * Wraps async route handlers to automatically catch and forward errors to the error handler.
 * Eliminates the need for try-catch blocks in every async route.
 * 
 * @param fn - Async route handler function
 * @returns Express middleware function
 * 
 * @example
 * ```typescript
 * app.get('/api/users', asyncHandler(async (req, res) => {
 *   const users = await getUsersFromDB();
 *   res.json(users);
 * }));
 * ```
 */
export const asyncHandler = (fn: (req: Request, res: Response, next?: NextFunction) => Promise<void>) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Helper function to send standardized success responses
 * 
 * Creates a consistent success response structure across the application.
 * 
 * @param res - Express response object
 * @param data - Response data
 * @param message - Success message
 * @param statusCode - HTTP status code (default: 200)
 * 
 * @example
 * ```typescript
 * sendSuccess(res, { user }, 'User created successfully', 201);
 * ```
 */
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

/**
 * Helper function to send standardized error responses
 * 
 * Manually sends an error response without going through the error handler middleware.
 * Useful for early returns in middleware.
 * 
 * @param res - Express response object
 * @param error - Error object
 * @param requestId - Optional request ID for tracking
 * 
 * @example
 * ```typescript
 * if (!user) {
 *   return sendError(res, AppError.createNotFoundError('User not found'));
 * }
 * ```
 */
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