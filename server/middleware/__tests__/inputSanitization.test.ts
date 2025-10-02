import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { 
  sanitizeInput, 
  validateAuthInput, 
  validateApiInput 
} from '../inputSanitization';

// Mock Express request/response objects
const mockRequest = (body: any = {}, query: any = {}, params: any = {}) => ({
  body,
  query,
  params,
  ip: '127.0.0.1',
  headers: { 'user-agent': 'test-agent' },
  url: '/test',
  method: 'POST',
  path: '/test'
}) as Request;

const mockResponse = () => {
  const res = {} as Response;
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
};

const mockNext = vi.fn() as NextFunction;

describe('Input Sanitization Middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('sanitizeInput', () => {
    it('should sanitize XSS attempts in request body', () => {
      const req = mockRequest({
        name: '<script>alert("xss")</script>John',
        description: 'Hello <img src="x" onerror="alert(1)"> world'
      });
      const res = mockResponse();

      sanitizeInput(req, res, mockNext);

      expect(req.body.name).toBe('John');
      expect(req.body.description).toBe('Hello  world');
      expect(mockNext).toHaveBeenCalled();
    });

    it('should detect and block SQL injection attempts', () => {
      const req = mockRequest({
        email: "test@example.com'; DROP TABLE users; --",
        query: "SELECT * FROM users WHERE id = 1"
      });
      const res = mockResponse();

      sanitizeInput(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Invalid input',
        message: 'Request contains potentially malicious content',
        code: 'INVALID_INPUT'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should detect NoSQL injection attempts', () => {
      const req = mockRequest({
        filter: '{"$where": "this.username == \\"admin\\""}',
        search: '{"$ne": null}'
      });
      const res = mockResponse();

      sanitizeInput(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Invalid input',
        message: 'Request contains potentially malicious content',
        code: 'INVALID_INPUT'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should sanitize query parameters', () => {
      const req = mockRequest({}, {
        search: '<script>alert("xss")</script>test query',
        limit: '10'
      });
      const res = mockResponse();

      sanitizeInput(req, res, mockNext);

      expect(req.query.search).toBe('test query');
      expect(req.query.limit).toBe('10');
      expect(mockNext).toHaveBeenCalled();
    });

    it('should sanitize URL parameters', () => {
      const req = mockRequest({}, {}, {
        id: '<script>alert("xss")</script>123',
        name: 'test<img src="x" onerror="alert(1)">'
      });
      const res = mockResponse();

      sanitizeInput(req, res, mockNext);

      expect(req.params.id).toBe('123');
      expect(req.params.name).toBe('test');
      expect(mockNext).toHaveBeenCalled();
    });

    it('should handle nested objects', () => {
      const req = mockRequest({
        user: {
          name: '<script>alert("xss")</script>John',
          profile: {
            bio: 'Hello <img src="x" onerror="alert(1)"> world'
          }
        },
        tags: ['<script>alert("xss")</script>tag1', 'tag2']
      });
      const res = mockResponse();

      sanitizeInput(req, res, mockNext);

      expect(req.body.user.name).toBe('John');
      expect(req.body.user.profile.bio).toBe('Hello  world');
      expect(req.body.tags[0]).toBe('tag1');
      expect(req.body.tags[1]).toBe('tag2');
      expect(mockNext).toHaveBeenCalled();
    });

    it('should allow clean input to pass through', () => {
      const req = mockRequest({
        name: 'John Doe',
        email: 'john@example.com',
        description: 'A normal description with no malicious content'
      });
      const res = mockResponse();

      sanitizeInput(req, res, mockNext);

      expect(req.body.name).toBe('John Doe');
      expect(req.body.email).toBe('john@example.com');
      expect(req.body.description).toBe('A normal description with no malicious content');
      expect(mockNext).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });
  });

  describe('validateAuthInput', () => {
    it('should validate email format for login', () => {
      const req = mockRequest({
        email: 'invalid-email',
        password: 'password123'
      });
      req.path = '/login';
      const res = mockResponse();

      validateAuthInput(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Validation error',
        message: 'Invalid email format',
        code: 'INVALID_EMAIL'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should validate password length', () => {
      const req = mockRequest({
        email: 'test@example.com',
        password: '123'
      });
      req.path = '/register';
      const res = mockResponse();

      validateAuthInput(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Validation error',
        message: 'Password must be 6-128 characters long',
        code: 'INVALID_PASSWORD'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should validate name format', () => {
      const req = mockRequest({
        email: 'test@example.com',
        password: 'password123',
        name: 'John123<script>'
      });
      req.path = '/register';
      const res = mockResponse();

      validateAuthInput(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Validation error',
        message: 'Name contains invalid characters',
        code: 'INVALID_NAME'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should allow valid auth input', () => {
      const req = mockRequest({
        email: 'test@example.com',
        password: 'password123',
        name: 'John Doe'
      });
      req.path = '/register';
      const res = mockResponse();

      validateAuthInput(req, res, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });
  });

  describe('validateApiInput', () => {
    it('should validate ID parameters', () => {
      const req = mockRequest({}, {}, { id: 'invalid-id' });
      const res = mockResponse();

      validateApiInput(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Validation error',
        message: 'Invalid ID parameter',
        code: 'INVALID_ID'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should validate search query length', () => {
      const req = mockRequest({
        query: 'a'.repeat(2001) // Too long
      });
      req.path = '/search';
      const res = mockResponse();

      validateApiInput(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Validation error',
        message: 'Search query too long or invalid',
        code: 'INVALID_QUERY'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should validate pagination parameters', () => {
      const req = mockRequest({}, { limit: '101', offset: '-1' });
      const res = mockResponse();

      validateApiInput(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Validation error',
        message: 'Limit must be between 1 and 100',
        code: 'INVALID_LIMIT'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should allow valid API input', () => {
      const req = mockRequest(
        { query: 'valid search query' },
        { limit: '10', offset: '0' },
        { id: '123' }
      );
      req.path = '/search';
      const res = mockResponse();

      validateApiInput(req, res, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });
  });

  describe('SQL Injection Detection', () => {
    const sqlInjectionAttempts = [
      "'; DROP TABLE users; --",
      "' OR '1'='1",
      "' UNION SELECT * FROM users --",
      "'; INSERT INTO users VALUES ('hacker', 'password'); --",
      "' OR 1=1 --",
      "admin'--",
      "admin' /*",
      "' OR 'x'='x",
      "'; WAITFOR DELAY '00:00:10' --",
      "' EXEC xp_cmdshell('dir') --"
    ];

    sqlInjectionAttempts.forEach((injection, index) => {
      it(`should detect SQL injection attempt ${index + 1}: ${injection}`, () => {
        const req = mockRequest({
          email: `test@example.com${injection}`,
          search: injection
        });
        const res = mockResponse();

        sanitizeInput(req, res, mockNext);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({
          error: 'Invalid input',
          message: 'Request contains potentially malicious content',
          code: 'INVALID_INPUT'
        });
        expect(mockNext).not.toHaveBeenCalled();
      });
    });
  });

  describe('NoSQL Injection Detection', () => {
    const noSqlInjectionAttempts = [
      '{"$where": "this.username == \'admin\'"}',
      '{"$ne": null}',
      '{"$gt": ""}',
      '{"$regex": ".*"}',
      '{"$or": [{"username": "admin"}, {"username": "root"}]}',
      'javascript:alert(1)',
      'eval(String.fromCharCode(97,108,101,114,116,40,49,41))',
      'function(){return true}'
    ];

    noSqlInjectionAttempts.forEach((injection, index) => {
      it(`should detect NoSQL injection attempt ${index + 1}: ${injection}`, () => {
        const req = mockRequest({
          filter: injection,
          query: injection
        });
        const res = mockResponse();

        sanitizeInput(req, res, mockNext);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({
          error: 'Invalid input',
          message: 'Request contains potentially malicious content',
          code: 'INVALID_INPUT'
        });
        expect(mockNext).not.toHaveBeenCalled();
      });
    });
  });
});