import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { 
  validateQueryResults, 
  validateUserData, 
  validateSearchData,
  sanitizeObject,
  validateResourceOwnership
} from '../queryValidation';

// Mock Express request/response objects
const mockRequest = (user: any = null, params: any = {}) => ({
  user,
  params,
  ip: '127.0.0.1',
  headers: { 'user-agent': 'test-agent' }
}) as Request;

const mockResponse = () => {
  const res = {} as Response;
  const jsonSpy = vi.fn();
  res.json = jsonSpy;
  return { res, jsonSpy };
};

const mockNext = vi.fn() as NextFunction;

describe('Query Validation Middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('sanitizeObject', () => {
    it('should remove sensitive fields', () => {
      const data = {
        id: 1,
        email: 'test@example.com',
        password: 'secret123',
        passwordHash: 'hashed',
        salt: 'salt123',
        stripeCustomerId: 'cus_123',
        name: 'John Doe'
      };

      const sanitized = sanitizeObject(data, '1', true);

      expect(sanitized).toEqual({
        id: 1,
        email: 'test@example.com',
        name: 'John Doe'
      });
      expect(sanitized.password).toBeUndefined();
      expect(sanitized.passwordHash).toBeUndefined();
      expect(sanitized.salt).toBeUndefined();
      expect(sanitized.stripeCustomerId).toBeUndefined();
    });

    it('should remove owner-only fields for non-owners', () => {
      const data = {
        id: 1,
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        preferences: { theme: 'dark' },
        searchCount: 5,
        name: 'John Doe'
      };

      const sanitized = sanitizeObject(data, '2', false); // Different user

      expect(sanitized).toEqual({
        id: 1,
        name: 'John Doe'
      });
      expect(sanitized.email).toBeUndefined();
      expect(sanitized.firstName).toBeUndefined();
      expect(sanitized.preferences).toBeUndefined();
    });

    it('should keep owner-only fields for owners', () => {
      const data = {
        id: 1,
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        preferences: { theme: 'dark' },
        searchCount: 5,
        name: 'John Doe'
      };

      const sanitized = sanitizeObject(data, '1', true); // Same user

      expect(sanitized).toEqual({
        id: 1,
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        preferences: { theme: 'dark' },
        searchCount: 5,
        name: 'John Doe'
      });
    });

    it('should handle arrays', () => {
      const data = [
        { id: 1, password: 'secret', name: 'John' },
        { id: 2, password: 'secret2', name: 'Jane' }
      ];

      const sanitized = sanitizeObject(data, '1', false);

      expect(sanitized).toEqual([
        { id: 1, name: 'John' },
        { id: 2, name: 'Jane' }
      ]);
    });

    it('should handle nested objects', () => {
      const data = {
        user: {
          id: 1,
          password: 'secret',
          name: 'John',
          profile: {
            email: 'test@example.com',
            preferences: { theme: 'dark' }
          }
        }
      };

      const sanitized = sanitizeObject(data, '2', false);

      expect(sanitized).toEqual({
        user: {
          id: 1,
          name: 'John',
          profile: {}
        }
      });
    });
  });

  describe('validateResourceOwnership', () => {
    it('should validate ownership by userId', () => {
      const resource = { id: 1, userId: 123, title: 'Test' };
      expect(validateResourceOwnership(resource, '123')).toBe(true);
      expect(validateResourceOwnership(resource, '456')).toBe(false);
    });

    it('should validate ownership by user.id', () => {
      const resource = { id: 1, user: { id: 123 }, title: 'Test' };
      expect(validateResourceOwnership(resource, '123')).toBe(true);
      expect(validateResourceOwnership(resource, '456')).toBe(false);
    });

    it('should validate ownership by ownerId', () => {
      const resource = { id: 1, ownerId: 123, title: 'Test' };
      expect(validateResourceOwnership(resource, '123')).toBe(true);
      expect(validateResourceOwnership(resource, '456')).toBe(false);
    });

    it('should validate ownership by createdBy', () => {
      const resource = { id: 1, createdBy: 123, title: 'Test' };
      expect(validateResourceOwnership(resource, '123')).toBe(true);
      expect(validateResourceOwnership(resource, '456')).toBe(false);
    });

    it('should return false for resources without ownership fields', () => {
      const resource = { id: 1, title: 'Test' };
      expect(validateResourceOwnership(resource, '123')).toBe(false);
    });
  });

  describe('validateQueryResults', () => {
    it('should sanitize response data', () => {
      const req = mockRequest({ id: 1 });
      const { res, jsonSpy } = mockResponse();
      
      validateQueryResults(req, res, mockNext);
      
      const responseData = {
        id: 1,
        userId: 1, // Add ownership field
        password: 'secret',
        name: 'John',
        email: 'test@example.com'
      };
      
      // Simulate calling res.json
      res.json(responseData);
      
      expect(jsonSpy).toHaveBeenCalledWith({
        id: 1,
        userId: 1,
        name: 'John',
        email: 'test@example.com'
      });
    });

    it('should handle data wrapper responses', () => {
      const req = mockRequest({ id: 1 });
      const { res, jsonSpy } = mockResponse();
      
      validateQueryResults(req, res, mockNext);
      
      const responseData = {
        success: true,
        data: {
          id: 1,
          password: 'secret',
          name: 'John'
        }
      };
      
      res.json(responseData);
      
      expect(jsonSpy).toHaveBeenCalledWith({
        success: true,
        data: {
          id: 1,
          name: 'John'
        }
      });
    });

    it('should filter array responses by ownership', () => {
      const req = mockRequest({ id: 1 });
      const { res, jsonSpy } = mockResponse();
      
      validateQueryResults(req, res, mockNext);
      
      const responseData = [
        { id: 1, userId: 1, title: 'My Item', password: 'secret' },
        { id: 2, userId: 2, title: 'Other Item', password: 'secret' },
        { id: 3, userId: 1, title: 'My Other Item', password: 'secret' }
      ];
      
      res.json(responseData);
      
      expect(jsonSpy).toHaveBeenCalledWith([
        { id: 1, userId: 1, title: 'My Item' },
        { id: 3, userId: 1, title: 'My Other Item' }
      ]);
    });

    it('should deny access to resources user does not own', () => {
      const req = mockRequest({ id: 1 });
      const { res, jsonSpy } = mockResponse();
      
      validateQueryResults(req, res, mockNext);
      
      const responseData = {
        id: 1,
        userId: 2, // Different user
        title: 'Other User Item'
      };
      
      res.json(responseData);
      
      expect(jsonSpy).toHaveBeenCalledWith({
        error: 'Access denied',
        message: 'You do not have permission to access this resource',
        code: 'ACCESS_DENIED'
      });
    });
  });

  describe('validateUserData', () => {
    it('should allow access to own user data', () => {
      const req = mockRequest({ id: 1 }, { id: '1' });
      const { res, jsonSpy } = mockResponse();
      
      validateUserData(req, res, mockNext);
      
      const responseData = {
        id: 1,
        email: 'test@example.com',
        password: 'secret',
        name: 'John'
      };
      
      res.json(responseData);
      
      expect(jsonSpy).toHaveBeenCalledWith({
        id: 1,
        email: 'test@example.com',
        name: 'John'
      });
    });

    it('should deny access to other user data', () => {
      const req = mockRequest({ id: 1 }, { id: '2' });
      const { res, jsonSpy } = mockResponse();
      
      validateUserData(req, res, mockNext);
      
      const responseData = {
        id: 2,
        email: 'other@example.com',
        name: 'Jane'
      };
      
      res.json(responseData);
      
      expect(jsonSpy).toHaveBeenCalledWith({
        error: 'Access denied',
        message: 'You can only access your own user data',
        code: 'ACCESS_DENIED'
      });
    });
  });

  describe('validateSearchData', () => {
    it('should validate search ownership', () => {
      const req = mockRequest({ id: 1 });
      const { res, jsonSpy } = mockResponse();
      
      validateSearchData(req, res, mockNext);
      
      const responseData = {
        search: { id: 1, userId: 1, query: 'test' },
        results: [
          { id: 1, title: 'Result 1', password: 'secret' },
          { id: 2, title: 'Result 2', password: 'secret' }
        ]
      };
      
      res.json(responseData);
      
      expect(jsonSpy).toHaveBeenCalledWith({
        search: { id: 1, userId: 1, query: 'test' },
        results: [
          { id: 1, title: 'Result 1' },
          { id: 2, title: 'Result 2' }
        ]
      });
    });

    it('should deny access to other user searches', () => {
      const req = mockRequest({ id: 1 });
      const { res, jsonSpy } = mockResponse();
      
      validateSearchData(req, res, mockNext);
      
      const responseData = {
        search: { id: 1, userId: 2, query: 'test' }, // Different user
        results: []
      };
      
      res.json(responseData);
      
      expect(jsonSpy).toHaveBeenCalledWith({
        error: 'Access denied',
        message: 'You can only access your own searches',
        code: 'ACCESS_DENIED'
      });
    });

    it('should filter array of searches by ownership', () => {
      const req = mockRequest({ id: 1 });
      const { res, jsonSpy } = mockResponse();
      
      validateSearchData(req, res, mockNext);
      
      const responseData = [
        { id: 1, userId: 1, query: 'My search', password: 'secret' },
        { id: 2, userId: 2, query: 'Other search', password: 'secret' },
        { id: 3, userId: 1, query: 'My other search', password: 'secret' }
      ];
      
      res.json(responseData);
      
      expect(jsonSpy).toHaveBeenCalledWith([
        { id: 1, userId: 1, query: 'My search' },
        { id: 3, userId: 1, query: 'My other search' }
      ]);
    });

    it('should deny access to single resource not owned by user', () => {
      const req = mockRequest({ id: 1 });
      const { res, jsonSpy } = mockResponse();
      
      validateSearchData(req, res, mockNext);
      
      const responseData = {
        id: 1,
        userId: 2, // Different user
        query: 'Other user search'
      };
      
      res.json(responseData);
      
      expect(jsonSpy).toHaveBeenCalledWith({
        error: 'Access denied',
        message: 'You can only access your own resources',
        code: 'ACCESS_DENIED'
      });
    });
  });
});