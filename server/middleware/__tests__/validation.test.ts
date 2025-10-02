import { Request, Response, NextFunction } from 'express';
import { 
  validateApiInput,
  validateLogin,
  validateRegister,
  validateSearch,
  validateIdParam,
  createRateLimit,
  sanitizeInput
} from '../validation';
import { AppError } from '../errorHandler';

// Mock dependencies
jest.mock('isomorphic-dompurify', () => ({
  sanitize: jest.fn((input) => input)
}));

describe('Validation Middleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockReq = {
      body: {},
      params: {},
      query: {},
      ip: '127.0.0.1',
      path: '/test',
      headers: {}
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
    mockNext = jest.fn();
  });

  describe('validateApiInput', () => {
    it('should pass valid input through', () => {
      mockReq.body = { name: 'John Doe', email: 'john@example.com' };
      
      validateApiInput(mockReq as Request, mockRes as Response, mockNext);
      
      expect(mockNext).toHaveBeenCalledWith();
      expect(mockNext).not.toHaveBeenCalledWith(expect.any(AppError));
    });

    it('should sanitize input strings', () => {
      mockReq.body = { 
        name: '  John Doe  ',
        description: 'Test\x00\x08description'
      };
      
      validateApiInput(mockReq as Request, mockRes as Response, mockNext);
      
      expect(mockReq.body.name).toBe('John Doe');
      expect(mockReq.body.description).toBe('Testdescription');
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should detect SQL injection attempts', () => {
      mockReq.body = { 
        query: "'; DROP TABLE users; --"
      };
      
      validateApiInput(mockReq as Request, mockRes as Response, mockNext);
      
      expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
      const error = (mockNext as jest.Mock).mock.calls[0][0];
      expect(error.message).toBe('Invalid input detected');
    });

    it('should detect NoSQL injection attempts', () => {
      mockReq.body = { 
        filter: { $where: 'function() { return true; }' }
      };
      
      validateApiInput(mockReq as Request, mockRes as Response, mockNext);
      
      expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
    });

    it('should handle nested objects', () => {
      mockReq.body = {
        user: {
          name: '  John  ',
          preferences: {
            theme: '  dark  '
          }
        }
      };
      
      validateApiInput(mockReq as Request, mockRes as Response, mockNext);
      
      expect(mockReq.body.user.name).toBe('John');
      expect(mockReq.body.user.preferences.theme).toBe('dark');
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should handle arrays', () => {
      mockReq.body = {
        tags: ['  tag1  ', '  tag2  ']
      };
      
      validateApiInput(mockReq as Request, mockRes as Response, mockNext);
      
      expect(mockReq.body.tags).toEqual(['tag1', 'tag2']);
      expect(mockNext).toHaveBeenCalledWith();
    });
  });

  describe('validateLogin', () => {
    it('should validate correct login data', () => {
      mockReq.body = {
        email: 'test@example.com',
        password: 'password123'
      };
      
      validateLogin(mockReq as Request, mockRes as Response, mockNext);
      
      expect(mockNext).toHaveBeenCalledWith();
      expect(mockReq.body.email).toBe('test@example.com');
    });

    it('should reject invalid email', () => {
      mockReq.body = {
        email: 'invalid-email',
        password: 'password123'
      };
      
      validateLogin(mockReq as Request, mockRes as Response, mockNext);
      
      expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
    });

    it('should reject short password', () => {
      mockReq.body = {
        email: 'test@example.com',
        password: '123'
      };
      
      validateLogin(mockReq as Request, mockRes as Response, mockNext);
      
      expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
    });

    it('should sanitize input', () => {
      mockReq.body = {
        email: '  test@example.com  ',
        password: '  password123  '
      };
      
      validateLogin(mockReq as Request, mockRes as Response, mockNext);
      
      expect(mockReq.body.email).toBe('test@example.com');
      expect(mockReq.body.password).toBe('password123');
    });
  });

  describe('validateRegister', () => {
    it('should validate correct registration data', () => {
      mockReq.body = {
        email: 'test@example.com',
        password: 'password123',
        confirmPassword: 'password123',
        name: 'John Doe'
      };
      
      validateRegister(mockReq as Request, mockRes as Response, mockNext);
      
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should reject mismatched passwords', () => {
      mockReq.body = {
        email: 'test@example.com',
        password: 'password123',
        confirmPassword: 'different',
        name: 'John Doe'
      };
      
      validateRegister(mockReq as Request, mockRes as Response, mockNext);
      
      expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
    });

    it('should reject invalid name', () => {
      mockReq.body = {
        email: 'test@example.com',
        password: 'password123',
        confirmPassword: 'password123',
        name: 'A'
      };
      
      validateRegister(mockReq as Request, mockRes as Response, mockNext);
      
      expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
    });
  });

  describe('validateSearch', () => {
    it('should validate search query', () => {
      mockReq.body = {
        query: 'sustainable packaging solutions',
        filters: {
          categories: ['tech', 'sustainability'],
          sortBy: 'innovation'
        }
      };
      
      validateSearch(mockReq as Request, mockRes as Response, mockNext);
      
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should reject empty query', () => {
      mockReq.body = {
        query: ''
      };
      
      validateSearch(mockReq as Request, mockRes as Response, mockNext);
      
      expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
    });

    it('should reject query that is too long', () => {
      mockReq.body = {
        query: 'a'.repeat(2001)
      };
      
      validateSearch(mockReq as Request, mockRes as Response, mockNext);
      
      expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
    });

    it('should validate filters', () => {
      mockReq.body = {
        query: 'test query',
        filters: {
          innovationScore: [50, 90],
          sortBy: 'marketSize',
          sortOrder: 'desc'
        }
      };
      
      validateSearch(mockReq as Request, mockRes as Response, mockNext);
      
      expect(mockNext).toHaveBeenCalledWith();
    });
  });

  describe('validateIdParam', () => {
    it('should validate numeric ID', () => {
      mockReq.params = { id: '123' };
      
      validateIdParam(mockReq as Request, mockRes as Response, mockNext);
      
      expect(mockNext).toHaveBeenCalledWith();
      expect(mockReq.params.id).toBe(123);
    });

    it('should reject non-numeric ID', () => {
      mockReq.params = { id: 'abc' };
      
      validateIdParam(mockReq as Request, mockRes as Response, mockNext);
      
      expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
    });

    it('should reject negative ID', () => {
      mockReq.params = { id: '-1' };
      
      validateIdParam(mockReq as Request, mockRes as Response, mockNext);
      
      expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
    });
  });

  describe('createRateLimit', () => {
    it('should allow requests within limit', () => {
      const rateLimit = createRateLimit(5, 60000);
      
      rateLimit(mockReq as Request, mockRes as Response, mockNext);
      
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should block requests exceeding limit', () => {
      const rateLimit = createRateLimit(1, 60000);
      
      // First request should pass
      rateLimit(mockReq as Request, mockRes as Response, mockNext);
      expect(mockNext).toHaveBeenCalledWith();
      
      // Second request should be blocked
      mockNext.mockClear();
      rateLimit(mockReq as Request, mockRes as Response, mockNext);
      expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
    });

    it('should reset after window expires', (done) => {
      const rateLimit = createRateLimit(1, 100); // 100ms window
      
      // First request
      rateLimit(mockReq as Request, mockRes as Response, mockNext);
      expect(mockNext).toHaveBeenCalledWith();
      
      // Second request should be blocked
      mockNext.mockClear();
      rateLimit(mockReq as Request, mockRes as Response, mockNext);
      expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
      
      // After window expires, should allow again
      setTimeout(() => {
        mockNext.mockClear();
        rateLimit(mockReq as Request, mockRes as Response, mockNext);
        expect(mockNext).toHaveBeenCalledWith();
        done();
      }, 150);
    });
  });

  describe('sanitizeInput', () => {
    it('should sanitize strings', () => {
      const input = '  Hello World  ';
      const result = sanitizeInput(input);
      expect(result).toBe('Hello World');
    });

    it('should handle objects', () => {
      const input = {
        name: '  John  ',
        age: 30,
        active: true
      };
      const result = sanitizeInput(input);
      expect(result).toEqual({
        name: 'John',
        age: 30,
        active: true
      });
    });

    it('should handle arrays', () => {
      const input = ['  item1  ', '  item2  '];
      const result = sanitizeInput(input);
      expect(result).toEqual(['item1', 'item2']);
    });

    it('should handle nested structures', () => {
      const input = {
        user: {
          name: '  John  ',
          tags: ['  tag1  ', '  tag2  ']
        }
      };
      const result = sanitizeInput(input);
      expect(result).toEqual({
        user: {
          name: 'John',
          tags: ['tag1', 'tag2']
        }
      });
    });

    it('should preserve non-string values', () => {
      const input = {
        name: 'John',
        age: 30,
        active: true,
        data: null,
        undefined: undefined
      };
      const result = sanitizeInput(input);
      expect(result).toEqual({
        name: 'John',
        age: 30,
        active: true,
        data: null,
        undefined: undefined
      });
    });
  });
});