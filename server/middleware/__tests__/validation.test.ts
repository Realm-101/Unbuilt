/**
 * Unit Tests for Validation Middleware
 * Tests input validation, sanitization, SQL injection prevention, XSS prevention,
 * data type validation, and size limits
 * 
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.6
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import {
  validateApiInput,
  sanitizeInput,
  validateLogin,
  validateRegister,
  validateSearch,
  createRateLimit,
} from '../validation';
import { AppError } from '../errorHandler';
import {
  createMockRequest,
  createMockResponse,
  createMockNext,
  TEST_PATTERNS,
} from '../../__tests__/imports';

describe('Validation Middleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockReq = createMockRequest();
    mockRes = createMockResponse();
    mockNext = createMockNext();
  });

  describe('SQL Injection Prevention', () => {
    it('should detect SQL injection in body', () => {
      mockReq.body = { query: TEST_PATTERNS.SQL_INJECTION };
      
      validateApiInput(mockReq as Request, mockRes as Response, mockNext);
      
      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Invalid input detected',
          code: 'MALICIOUS_INPUT_DETECTED',
        })
      );
    });

    it('should detect SQL injection with SELECT statement', () => {
      mockReq.body = { input: 'SELECT * FROM users' };
      
      validateApiInput(mockReq as Request, mockRes as Response, mockNext);
      
      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 'MALICIOUS_INPUT_DETECTED',
        })
      );
    });

    it('should detect SQL injection with UNION statement', () => {
      mockReq.body = { input: 'UNION SELECT password FROM users' };
      
      validateApiInput(mockReq as Request, mockRes as Response, mockNext);
      
      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 'MALICIOUS_INPUT_DETECTED',
        })
      );
    });

    it('should detect SQL injection with OR 1=1', () => {
      mockReq.body = { input: "admin' OR 1=1 --" };
      
      validateApiInput(mockReq as Request, mockRes as Response, mockNext);
      
      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 'MALICIOUS_INPUT_DETECTED',
        })
      );
    });

    it('should detect SQL injection in nested objects', () => {
      mockReq.body = {
        user: {
          name: 'John',
          filter: "'; DROP TABLE users; --",
        },
      };
      
      validateApiInput(mockReq as Request, mockRes as Response, mockNext);
      
      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 'MALICIOUS_INPUT_DETECTED',
        })
      );
    });

    it('should detect SQL injection in arrays', () => {
      mockReq.body = {
        filters: ['valid', "'; DELETE FROM users; --"],
      };
      
      validateApiInput(mockReq as Request, mockRes as Response, mockNext);
      
      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 'MALICIOUS_INPUT_DETECTED',
        })
      );
    });

    it('should detect SQL injection with WAITFOR DELAY', () => {
      mockReq.body = { input: "'; WAITFOR DELAY '00:00:05' --" };
      
      validateApiInput(mockReq as Request, mockRes as Response, mockNext);
      
      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 'MALICIOUS_INPUT_DETECTED',
        })
      );
    });

    it('should allow legitimate SQL-like text', () => {
      mockReq.body = {
        description: 'This product is great for selecting the best options',
      };
      
      validateApiInput(mockReq as Request, mockRes as Response, mockNext);
      
      // Should not be called with error
      expect(mockNext).toHaveBeenCalledWith();
    });
  });

  describe('XSS Prevention', () => {
    it('should sanitize script tags', () => {
      const input = TEST_PATTERNS.XSS_SCRIPT;
      const sanitized = sanitizeInput(input);
      
      expect(sanitized).not.toContain('<script>');
      expect(sanitized).not.toContain('</script>');
    });

    it('should sanitize img tags with onerror', () => {
      const input = TEST_PATTERNS.XSS_IMG;
      const sanitized = sanitizeInput(input);
      
      expect(sanitized).not.toContain('<img');
      expect(sanitized).not.toContain('onerror');
    });

    it('should sanitize event handlers', () => {
      const input = '<div onclick="alert(\'xss\')">Click me</div>';
      const sanitized = sanitizeInput(input);
      
      expect(sanitized).not.toContain('onclick');
      expect(sanitized).not.toContain('alert');
    });

    it('should sanitize iframe tags', () => {
      const input = '<iframe src="javascript:alert(\'xss\')"></iframe>';
      const sanitized = sanitizeInput(input);
      
      expect(sanitized).not.toContain('<iframe');
      expect(sanitized).not.toContain('javascript:');
    });

    it('should sanitize nested XSS attempts', () => {
      const input = '<div><script>alert("xss")</script></div>';
      const sanitized = sanitizeInput(input);
      
      expect(sanitized).not.toContain('<script>');
      expect(sanitized).not.toContain('alert');
    });

    it('should sanitize encoded XSS attempts', () => {
      const input = '&lt;script&gt;alert("xss")&lt;/script&gt;';
      const sanitized = sanitizeInput(input);
      
      // HTML entities are preserved as-is, which is safe
      expect(sanitized).toContain('&lt;');
      expect(sanitized).toContain('&gt;');
    });

    it('should preserve safe text content', () => {
      const input = 'This is safe text with <b>bold</b> formatting';
      const sanitized = sanitizeInput(input);
      
      expect(sanitized).toContain('This is safe text');
      expect(sanitized).not.toContain('<b>');
    });

    it('should sanitize objects with XSS', () => {
      const input = {
        name: 'John',
        bio: '<script>alert("xss")</script>',
      };
      const sanitized = sanitizeInput(input);
      
      expect(sanitized.name).toBe('John');
      expect(sanitized.bio).not.toContain('<script>');
    });

    it('should sanitize arrays with XSS', () => {
      const input = ['safe', '<script>alert("xss")</script>'];
      const sanitized = sanitizeInput(input);
      
      expect(sanitized[0]).toBe('safe');
      expect(sanitized[1]).not.toContain('<script>');
    });
  });

  describe('Data Type Validation', () => {
    it('should validate email format in login', () => {
      mockReq.body = {
        email: 'invalid-email',
        password: 'password123',
      };
      
      validateLogin(mockReq as Request, mockRes as Response, mockNext);
      
      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 'VALIDATION_ERROR',
        })
      );
    });

    it('should validate password length in login', () => {
      mockReq.body = {
        email: 'test@example.com',
        password: '123',
      };
      
      validateLogin(mockReq as Request, mockRes as Response, mockNext);
      
      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 'VALIDATION_ERROR',
        })
      );
    });

    it('should validate required fields in registration', () => {
      mockReq.body = {
        email: 'test@example.com',
        // Missing password
      };
      
      validateRegister(mockReq as Request, mockRes as Response, mockNext);
      
      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 'VALIDATION_ERROR',
        })
      );
    });

    it('should validate search query length', () => {
      mockReq.body = {
        query: '', // Empty query
      };
      
      validateSearch(mockReq as Request, mockRes as Response, mockNext);
      
      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 'VALIDATION_ERROR',
        })
      );
    });

    it('should validate enum values', () => {
      mockReq.body = {
        query: 'test query',
        filters: {
          sortBy: 'invalid_sort', // Invalid enum value
        },
      };
      
      validateSearch(mockReq as Request, mockRes as Response, mockNext);
      
      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 'VALIDATION_ERROR',
        })
      );
    });

    it('should validate number ranges', () => {
      mockReq.body = {
        query: 'test query',
        filters: {
          innovationScore: [0, 150], // Out of range
        },
      };
      
      validateSearch(mockReq as Request, mockRes as Response, mockNext);
      
      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 'VALIDATION_ERROR',
        })
      );
    });

    it('should accept valid data types', () => {
      mockReq.body = {
        email: 'test@example.com',
        password: 'ValidPassword123!',
      };
      
      validateLogin(mockReq as Request, mockRes as Response, mockNext);
      
      expect(mockNext).toHaveBeenCalledWith();
    });
  });

  describe('Size Limit Validation', () => {
    it('should reject query that exceeds max length', () => {
      mockReq.body = {
        query: 'a'.repeat(2001), // Exceeds 2000 char limit
      };
      
      validateSearch(mockReq as Request, mockRes as Response, mockNext);
      
      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 'VALIDATION_ERROR',
        })
      );
    });

    it('should accept input within size limits', () => {
      mockReq.body = {
        query: 'a'.repeat(100), // Within 2000 char limit
      };
      
      validateSearch(mockReq as Request, mockRes as Response, mockNext);
      
      expect(mockNext).toHaveBeenCalledWith();
    });
  });

  describe('Input Sanitization', () => {
    it('should remove null bytes', () => {
      const input = 'test\x00string';
      const sanitized = sanitizeInput(input);
      
      expect(sanitized).toBe('teststring');
      expect(sanitized).not.toContain('\x00');
    });

    it('should remove control characters', () => {
      const input = 'test\x01\x02\x03string';
      const sanitized = sanitizeInput(input);
      
      expect(sanitized).toBe('teststring');
    });

    it('should trim whitespace', () => {
      const input = '  test string  ';
      const sanitized = sanitizeInput(input);
      
      expect(sanitized).toBe('test string');
    });

    it('should sanitize nested objects', () => {
      const input = {
        user: {
          name: '  John  ',
          bio: 'Test\x00bio',
        },
      };
      const sanitized = sanitizeInput(input);
      
      expect(sanitized.user.name).toBe('John');
      expect(sanitized.user.bio).toBe('Testbio');
    });

    it('should sanitize arrays', () => {
      const input = ['  item1  ', 'item2\x00', '  item3  '];
      const sanitized = sanitizeInput(input);
      
      expect(sanitized).toEqual(['item1', 'item2', 'item3']);
    });

    it('should preserve non-string values', () => {
      const input = {
        name: 'John',
        age: 30,
        active: true,
        data: null,
      };
      const sanitized = sanitizeInput(input);
      
      expect(sanitized.age).toBe(30);
      expect(sanitized.active).toBe(true);
      expect(sanitized.data).toBe(null);
    });
  });

  describe('NoSQL Injection Prevention', () => {
    it('should detect $where injection', () => {
      mockReq.body = {
        filter: { $where: 'function() { return true; }' },
      };
      
      validateApiInput(mockReq as Request, mockRes as Response, mockNext);
      
      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 'MALICIOUS_INPUT_DETECTED',
        })
      );
    });

    it('should detect $ne injection', () => {
      mockReq.body = {
        filter: '$ne',
      };
      
      validateApiInput(mockReq as Request, mockRes as Response, mockNext);
      
      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 'MALICIOUS_INPUT_DETECTED',
        })
      );
    });

    it('should detect $regex injection', () => {
      mockReq.body = {
        filter: { username: { $regex: '.*' } },
      };
      
      validateApiInput(mockReq as Request, mockRes as Response, mockNext);
      
      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 'MALICIOUS_INPUT_DETECTED',
        })
      );
    });

    it('should detect javascript: protocol', () => {
      mockReq.body = {
        url: 'javascript:alert("xss")',
      };
      
      validateApiInput(mockReq as Request, mockRes as Response, mockNext);
      
      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 'MALICIOUS_INPUT_DETECTED',
        })
      );
    });

    it('should detect eval() injection', () => {
      mockReq.body = {
        code: 'eval(maliciousCode)',
      };
      
      validateApiInput(mockReq as Request, mockRes as Response, mockNext);
      
      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 'MALICIOUS_INPUT_DETECTED',
        })
      );
    });
  });

  describe('Export Endpoint Bypass', () => {
    it('should skip validation for export endpoints', () => {
      mockReq.path = '/api/export/pdf';
      mockReq.body = {
        data: 'Some data with special chars: <>&"',
      };
      
      validateApiInput(mockReq as Request, mockRes as Response, mockNext);
      
      // Should call next without error
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should skip validation for email-report endpoints', () => {
      mockReq.path = '/api/email-report';
      mockReq.body = {
        content: 'Report with special formatting',
      };
      
      validateApiInput(mockReq as Request, mockRes as Response, mockNext);
      
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should apply validation to non-export endpoints', () => {
      mockReq.path = '/api/search';
      mockReq.body = {
        query: TEST_PATTERNS.SQL_INJECTION,
      };
      
      validateApiInput(mockReq as Request, mockRes as Response, mockNext);
      
      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 'MALICIOUS_INPUT_DETECTED',
        })
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle validation errors gracefully', () => {
      mockReq.body = {
        email: 'invalid',
        password: '123',
      };
      
      validateLogin(mockReq as Request, mockRes as Response, mockNext);
      
      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 'VALIDATION_ERROR',
          message: 'Validation failed',
        })
      );
    });

    it('should provide detailed error information', () => {
      mockReq.body = {
        email: 'invalid',
        password: '123',
      };
      
      validateLogin(mockReq as Request, mockRes as Response, mockNext);
      
      const error = (mockNext as any).mock.calls[0][0];
      expect(error).toHaveProperty('code');
      expect(error).toHaveProperty('message');
    });

    it('should handle malformed input gracefully', () => {
      mockReq.body = null;
      
      validateApiInput(mockReq as Request, mockRes as Response, mockNext);
      
      // Should not throw, should call next
      expect(mockNext).toHaveBeenCalled();
    });

    it('should handle undefined input gracefully', () => {
      mockReq.body = undefined;
      
      validateApiInput(mockReq as Request, mockRes as Response, mockNext);
      
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('Query Parameter Validation', () => {
    it('should sanitize query parameters', () => {
      mockReq.query = {
        search: '  test query  ',
        filter: 'value\x00',
      };
      
      validateApiInput(mockReq as Request, mockRes as Response, mockNext);
      
      expect(mockReq.query.search).toBe('test query');
      expect(mockReq.query.filter).toBe('value');
    });

    it('should detect injection in query parameters', () => {
      mockReq.query = {
        id: "1 OR 1=1",
      };
      
      validateApiInput(mockReq as Request, mockRes as Response, mockNext);
      
      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 'MALICIOUS_INPUT_DETECTED',
        })
      );
    });
  });

  describe('URL Parameter Validation', () => {
    it('should sanitize URL parameters', () => {
      mockReq.params = {
        id: '  123  ',
        name: 'test\x00name',
      };
      
      validateApiInput(mockReq as Request, mockRes as Response, mockNext);
      
      expect(mockReq.params.id).toBe('123');
      expect(mockReq.params.name).toBe('testname');
    });

    it('should detect injection in URL parameters', () => {
      mockReq.params = {
        id: "'; DROP TABLE users; --",
      };
      
      validateApiInput(mockReq as Request, mockRes as Response, mockNext);
      
      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 'MALICIOUS_INPUT_DETECTED',
        })
      );
    });
  });

  describe('Combined Validation', () => {
    it('should apply all validations together', () => {
      mockReq.body = {
        email: '  test@example.com  ',
        password: '  password123  ',
        bio: '<script>alert("xss")</script>',
      };
      
      validateApiInput(mockReq as Request, mockRes as Response, mockNext);
      
      expect(mockReq.body.email).toBe('test@example.com');
      expect(mockReq.body.password).toBe('password123');
      expect(mockReq.body.bio).not.toContain('<script>');
    });

    it('should validate and sanitize nested structures', () => {
      mockReq.body = {
        user: {
          profile: {
            name: '  John  ',
            bio: 'Test\x00bio',
          },
        },
      };
      
      validateApiInput(mockReq as Request, mockRes as Response, mockNext);
      
      expect(mockReq.body.user.profile.name).toBe('John');
      expect(mockReq.body.user.profile.bio).toBe('Testbio');
    });
  });
});
