import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import * as DOMPurify from 'isomorphic-dompurify';
import { 
  loginSchema, 
  registerSchema, 
  validateIdeaSchema,
  insertSearchSchema 
} from '../../shared/schema';
import { changePasswordSchema, passwordStrengthSchema } from '../../shared/auth-schema';
import { AppError } from './errorHandler';

/**
 * Comprehensive input validation middleware using Zod schemas
 * Provides validation, sanitization, and rate limiting for all API endpoints
 */

// Common validation schemas
const idParamSchema = z.object({
  id: z.string().regex(/^\d+$/, 'ID must be a positive integer').transform(Number)
});

const paginationSchema = z.object({
  limit: z.string().optional().transform(val => val ? Math.min(Math.max(parseInt(val), 1), 100) : 20),
  offset: z.string().optional().transform(val => val ? Math.max(parseInt(val), 0) : 0),
  page: z.string().optional().transform(val => val ? Math.max(parseInt(val), 1) : 1)
});

const searchQuerySchema = z.object({
  query: z.string().min(1).max(2000).trim(),
  filters: z.object({
    categories: z.array(z.string()).optional(),
    innovationScore: z.array(z.number().min(0).max(100)).length(2).optional(),
    marketSize: z.array(z.number().min(0).max(100)).length(2).optional(),
    feasibilityScore: z.array(z.number().min(0).max(100)).length(2).optional(),
    marketPotential: z.string().optional(),
    keywords: z.array(z.string()).optional(),
    sortBy: z.enum(['innovation', 'marketSize', 'feasibility', 'relevance']).optional(),
    sortOrder: z.enum(['asc', 'desc']).optional()
  }).optional()
});

const businessPlanSchema = z.object({
  title: z.string().min(1).max(200).trim(),
  description: z.string().min(10).max(2000).trim(),
  category: z.string().optional(),
  marketSize: z.string().optional()
});

const marketResearchSchema = z.object({
  query: z.string().min(1).max(500).trim()
});

const actionPlanSchema = z.object({
  idea: z.object({
    title: z.string().min(1).max(200),
    description: z.string().min(10).max(2000)
  }),
  validationScore: z.number().min(0).max(100).optional(),
  marketSize: z.string().optional()
});

const teamSchema = z.object({
  name: z.string().min(1).max(100).trim(),
  description: z.string().max(500).optional()
});

const commentSchema = z.object({
  content: z.string().min(1).max(1000).trim(),
  parentId: z.number().optional()
});

const subscriptionSchema = z.object({
  plan: z.enum(['pro', 'enterprise'])
});

// Rate limiting store
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

/**
 * Generic rate limiting middleware
 */
export function createRateLimit(maxRequests: number = 100, windowMs: number = 15 * 60 * 1000) {
  return (req: Request, res: Response, next: NextFunction) => {
    const key = `${req.ip}:${req.path}`;
    const now = Date.now();
    
    const record = rateLimitStore.get(key);
    
    if (!record || now > record.resetTime) {
      rateLimitStore.set(key, { count: 1, resetTime: now + windowMs });
      return next();
    }
    
    if (record.count >= maxRequests) {
      const retryAfter = Math.ceil((record.resetTime - now) / 1000);
      return next(AppError.createRateLimitError(
        'Too many requests. Please try again later.',
        'RATE_LIMIT_EXCEEDED'
      ));
    }
    
    record.count++;
    next();
  };
}

/**
 * Sanitize input to prevent XSS attacks
 */
function sanitizeInput(input: any): any {
  if (typeof input === 'string') {
    // Remove null bytes and control characters
    let sanitized = input.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
    
    // Use DOMPurify to remove HTML/script tags
    sanitized = DOMPurify.sanitize(sanitized, { 
      ALLOWED_TAGS: [],
      ALLOWED_ATTR: [],
      KEEP_CONTENT: true
    });
    
    return sanitized.trim();
  }
  
  if (Array.isArray(input)) {
    return input.map(sanitizeInput);
  }
  
  if (input && typeof input === 'object') {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(input)) {
      sanitized[key] = sanitizeInput(value);
    }
    return sanitized;
  }
  
  return input;
}

/**
 * Generic validation middleware factory
 */
function createValidator(schema: z.ZodSchema, source: 'body' | 'params' | 'query' = 'body') {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = req[source];
      
      // Sanitize input first
      const sanitizedData = sanitizeInput(data);
      
      // Validate with Zod schema
      const result = schema.safeParse(sanitizedData);
      
      if (!result.success) {
        const errors = result.error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code
        }));
        
        return next(AppError.createValidationError(
          'Validation failed',
          'VALIDATION_ERROR',
          errors
        ));
      }
      
      // Replace original data with validated and sanitized data
      req[source] = result.data;
      next();
    } catch (error) {
      console.error('Validation middleware error:', error);
      next(AppError.createSystemError('Validation system error', 'VALIDATION_SYSTEM_ERROR'));
    }
  };
}

// Specific validation middleware for different endpoints
export const validateLogin = createValidator(loginSchema);
export const validateRegister = createValidator(registerSchema);
export const validateChangePassword = createValidator(changePasswordSchema);
export const validatePasswordStrength = createValidator(passwordStrengthSchema);
export const validateIdParam = createValidator(idParamSchema, 'params');
export const validatePagination = createValidator(paginationSchema, 'query');
export const validateSearch = createValidator(searchQuerySchema);
export const validateBusinessPlan = createValidator(businessPlanSchema);
export const validateMarketResearch = createValidator(marketResearchSchema);
export const validateActionPlan = createValidator(actionPlanSchema);
export const validateIdea = createValidator(validateIdeaSchema);
export const validateTeam = createValidator(teamSchema);
export const validateComment = createValidator(commentSchema);
export const validateSubscription = createValidator(subscriptionSchema);

// Rate limiting middleware for different endpoint types
export const generalRateLimit = createRateLimit(100, 15 * 60 * 1000); // 100 requests per 15 minutes
export const authRateLimit = createRateLimit(5, 15 * 60 * 1000); // 5 requests per 15 minutes for auth
export const searchRateLimit = createRateLimit(20, 60 * 1000); // 20 searches per minute
export const aiRateLimit = createRateLimit(10, 60 * 1000); // 10 AI requests per minute

/**
 * Comprehensive input validation middleware for all API routes
 */
export function validateApiInput(req: Request, res: Response, next: NextFunction) {
  try {
    // Apply general sanitization to all inputs
    if (req.body && typeof req.body === 'object') {
      req.body = sanitizeInput(req.body);
    }
    
    if (req.query && typeof req.query === 'object') {
      req.query = sanitizeInput(req.query);
    }
    
    if (req.params && typeof req.params === 'object') {
      req.params = sanitizeInput(req.params);
    }
    
    // Check for common injection patterns
    const checkInjection = (obj: any, path: string = ''): string[] => {
      const errors: string[] = [];
      
      if (typeof obj === 'string') {
        // SQL injection patterns
        const sqlPatterns = [
          /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT)\b)/i,
          /(\b(OR|AND)\s+\d+\s*=\s*\d+)/i,
          /('|(\\')|(;)|(--)|(\|)|(\*)|(%)|(<)|(>)|(\^)|(\[)|(\])|(\{)|(\}))/,
          /(\b(WAITFOR|DELAY|SLEEP)\b)/i
        ];
        
        // NoSQL injection patterns
        const noSqlPatterns = [
          /\$where/i,
          /\$ne/i,
          /\$gt/i,
          /\$lt/i,
          /\$regex/i,
          /\$or/i,
          /\$and/i,
          /javascript:/i,
          /eval\(/i
        ];
        
        if (sqlPatterns.some(pattern => pattern.test(obj))) {
          errors.push(`Potential SQL injection in ${path || 'input'}`);
        }
        
        if (noSqlPatterns.some(pattern => pattern.test(obj))) {
          errors.push(`Potential NoSQL injection in ${path || 'input'}`);
        }
      } else if (Array.isArray(obj)) {
        obj.forEach((item, index) => {
          errors.push(...checkInjection(item, `${path}[${index}]`));
        });
      } else if (typeof obj === 'object' && obj !== null) {
        Object.entries(obj).forEach(([key, value]) => {
          const currentPath = path ? `${path}.${key}` : key;
          errors.push(...checkInjection(value, currentPath));
        });
      }
      
      return errors;
    };
    
    const injectionErrors: string[] = [];
    
    if (req.body) {
      injectionErrors.push(...checkInjection(req.body, 'body'));
    }
    if (req.query) {
      injectionErrors.push(...checkInjection(req.query, 'query'));
    }
    if (req.params) {
      injectionErrors.push(...checkInjection(req.params, 'params'));
    }
    
    if (injectionErrors.length > 0) {
      console.warn('Injection attempt detected:', {
        ip: req.ip,
        userAgent: req.headers['user-agent'],
        url: req.url,
        method: req.method,
        errors: injectionErrors
      });
      
      return next(AppError.createValidationError(
        'Invalid input detected',
        'MALICIOUS_INPUT_DETECTED'
      ));
    }
    
    next();
  } catch (error) {
    console.error('API input validation error:', error);
    next(AppError.createSystemError('Input validation system error', 'INPUT_VALIDATION_ERROR'));
  }
}

export { sanitizeInput };