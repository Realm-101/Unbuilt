import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import DOMPurify from 'isomorphic-dompurify';

/**
 * Input sanitization middleware to prevent XSS and injection attacks
 */

// Common validation schemas
const emailSchema = z.string().email().max(255);
const nameSchema = z.string().min(1).max(100).regex(/^[a-zA-Z\s\-'\.]+$/);
const passwordSchema = z.string().min(6).max(128);
const textSchema = z.string().max(2000);
const idSchema = z.coerce.number().int().positive();

// Sanitize string input to prevent XSS
function sanitizeString(input: string): string {
  if (typeof input !== 'string') return '';
  
  // Remove null bytes and control characters
  let sanitized = input.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
  
  // Use DOMPurify to remove HTML/script tags
  sanitized = DOMPurify.sanitize(sanitized, { 
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
    KEEP_CONTENT: true
  });
  
  // Trim whitespace
  sanitized = sanitized.trim();
  
  return sanitized;
}

// Recursively sanitize object properties
function sanitizeObject(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  
  if (typeof obj === 'string') {
    return sanitizeString(obj);
  }
  
  if (typeof obj === 'number' || typeof obj === 'boolean') {
    return obj;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item));
  }
  
  if (typeof obj === 'object') {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(obj)) {
      // Sanitize the key as well
      const sanitizedKey = sanitizeString(key);
      if (sanitizedKey) {
        sanitized[sanitizedKey] = sanitizeObject(value);
      }
    }
    return sanitized;
  }
  
  return obj;
}

// Validate common SQL injection patterns
function containsSQLInjection(input: string): boolean {
  const sqlPatterns = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT)\b)/i,
    /(\b(OR|AND)\s+\d+\s*=\s*\d+)/i,
    /('|(\\')|(;)|(--)|(\|)|(\*)|(%)|(<)|(>)|(\^)|(\[)|(\])|(\{)|(\}))/,
    /(\b(WAITFOR|DELAY|SLEEP)\b)/i,
    /(\b(XP_|SP_)\w+)/i,
    /(\b(INFORMATION_SCHEMA|SYSOBJECTS|SYSCOLUMNS)\b)/i
  ];
  
  return sqlPatterns.some(pattern => pattern.test(input));
}

// Validate NoSQL injection patterns
function containsNoSQLInjection(input: string): boolean {
  const noSqlPatterns = [
    /\$where/i,
    /\$ne/i,
    /\$gt/i,
    /\$lt/i,
    /\$regex/i,
    /\$or/i,
    /\$and/i,
    /\$in/i,
    /\$nin/i,
    /javascript:/i,
    /eval\(/i,
    /function\s*\(/i
  ];
  
  return noSqlPatterns.some(pattern => pattern.test(input));
}

// Check for injection attempts
function validateForInjection(obj: any, path: string = ''): string[] {
  const errors: string[] = [];
  
  if (typeof obj === 'string') {
    if (containsSQLInjection(obj)) {
      errors.push(`Potential SQL injection detected in ${path || 'input'}`);
    }
    if (containsNoSQLInjection(obj)) {
      errors.push(`Potential NoSQL injection detected in ${path || 'input'}`);
    }
  } else if (Array.isArray(obj)) {
    obj.forEach((item, index) => {
      errors.push(...validateForInjection(item, `${path}[${index}]`));
    });
  } else if (typeof obj === 'object' && obj !== null) {
    Object.entries(obj).forEach(([key, value]) => {
      const currentPath = path ? `${path}.${key}` : key;
      errors.push(...validateForInjection(value, currentPath));
    });
  }
  
  return errors;
}

/**
 * General input sanitization middleware
 */
export function sanitizeInput(req: Request, res: Response, next: NextFunction) {
  try {
    // Sanitize request body
    if (req.body && typeof req.body === 'object') {
      req.body = sanitizeObject(req.body);
    }
    
    // Sanitize query parameters
    if (req.query && typeof req.query === 'object') {
      req.query = sanitizeObject(req.query);
    }
    
    // Sanitize URL parameters
    if (req.params && typeof req.params === 'object') {
      req.params = sanitizeObject(req.params);
    }
    
    // Check for injection attempts
    const injectionErrors: string[] = [];
    
    if (req.body) {
      injectionErrors.push(...validateForInjection(req.body, 'body'));
    }
    if (req.query) {
      injectionErrors.push(...validateForInjection(req.query, 'query'));
    }
    if (req.params) {
      injectionErrors.push(...validateForInjection(req.params, 'params'));
    }
    
    if (injectionErrors.length > 0) {
      console.warn('Injection attempt detected:', {
        ip: req.ip,
        userAgent: req.headers['user-agent'],
        url: req.url,
        method: req.method,
        errors: injectionErrors,
        body: req.body,
        query: req.query,
        params: req.params
      });
      
      return res.status(400).json({
        error: 'Invalid input',
        message: 'Request contains potentially malicious content',
        code: 'INVALID_INPUT'
      });
    }
    
    next();
  } catch (error) {
    console.error('Input sanitization error:', error);
    res.status(500).json({
      error: 'Input validation failed',
      message: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
}

/**
 * Authentication-specific input validation middleware
 */
export function validateAuthInput(req: Request, res: Response, next: NextFunction) {
  try {
    const { body } = req;
    
    // Validate login/register inputs
    if (req.path.includes('/login') || req.path.includes('/register')) {
      if (body.email) {
        try {
          emailSchema.parse(body.email);
        } catch {
          return res.status(400).json({
            error: 'Validation error',
            message: 'Invalid email format',
            code: 'INVALID_EMAIL'
          });
        }
      }
      
      if (body.password) {
        try {
          passwordSchema.parse(body.password);
        } catch {
          return res.status(400).json({
            error: 'Validation error',
            message: 'Password must be 6-128 characters long',
            code: 'INVALID_PASSWORD'
          });
        }
      }
      
      if (body.name) {
        try {
          nameSchema.parse(body.name);
        } catch {
          return res.status(400).json({
            error: 'Validation error',
            message: 'Name contains invalid characters',
            code: 'INVALID_NAME'
          });
        }
      }
    }
    
    next();
  } catch (error) {
    console.error('Auth input validation error:', error);
    res.status(500).json({
      error: 'Validation failed',
      message: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
}

/**
 * API-specific input validation middleware
 */
export function validateApiInput(req: Request, res: Response, next: NextFunction) {
  try {
    const { body, params, query } = req;
    
    // Validate ID parameters
    if (params.id) {
      try {
        idSchema.parse(params.id);
      } catch {
        return res.status(400).json({
          error: 'Validation error',
          message: 'Invalid ID parameter',
          code: 'INVALID_ID'
        });
      }
    }
    
    // Validate search queries
    if (req.path.includes('/search') && body.query) {
      try {
        textSchema.parse(body.query);
      } catch {
        return res.status(400).json({
          error: 'Validation error',
          message: 'Search query too long or invalid',
          code: 'INVALID_QUERY'
        });
      }
    }
    
    // Validate pagination parameters
    if (query.limit) {
      const limit = parseInt(query.limit as string);
      if (isNaN(limit) || limit < 1 || limit > 100) {
        return res.status(400).json({
          error: 'Validation error',
          message: 'Limit must be between 1 and 100',
          code: 'INVALID_LIMIT'
        });
      }
    }
    
    if (query.offset) {
      const offset = parseInt(query.offset as string);
      if (isNaN(offset) || offset < 0) {
        return res.status(400).json({
          error: 'Validation error',
          message: 'Offset must be a non-negative number',
          code: 'INVALID_OFFSET'
        });
      }
    }
    
    next();
  } catch (error) {
    console.error('API input validation error:', error);
    res.status(500).json({
      error: 'Validation failed',
      message: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
}

export { emailSchema, nameSchema, passwordSchema, textSchema, idSchema };