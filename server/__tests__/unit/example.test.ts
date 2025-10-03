/**
 * Example Unit Test
 * 
 * This is a simple example to demonstrate the test infrastructure is working.
 * Delete this file once you have real tests.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { testUtils } from '../setup';

describe('Test Infrastructure', () => {
  describe('Setup Utilities', () => {
    it('should generate random email', () => {
      const email = testUtils.randomEmail();
      expect(email).toMatch(/^test-\d+-[a-z0-9]+@example\.com$/);
    });
    
    it('should generate random password', () => {
      const password = testUtils.randomPassword();
      expect(password).toMatch(/^Test[a-z0-9]+!@#$/);
    });
    
    it('should create mock request', () => {
      const req = testUtils.mockRequest({ body: { test: 'data' } });
      expect(req.body).toEqual({ test: 'data' });
    });
    
    it('should create mock response', () => {
      const res = testUtils.mockResponse();
      expect(res.status).toBeDefined();
      expect(res.json).toBeDefined();
    });
    
    it('should create mock next function', () => {
      const next = testUtils.mockNext();
      expect(next).toBeDefined();
      expect(typeof next).toBe('function');
    });
  });
  
  describe('Test Isolation', () => {
    let counter = 0;
    
    beforeEach(() => {
      counter = 0;
    });
    
    it('should start with counter at 0 (test 1)', () => {
      expect(counter).toBe(0);
      counter++;
    });
    
    it('should start with counter at 0 (test 2)', () => {
      expect(counter).toBe(0);
      counter++;
    });
  });
  
  describe('Async Operations', () => {
    it('should handle async operations', async () => {
      const result = await Promise.resolve('success');
      expect(result).toBe('success');
    });
    
    it('should handle async errors', async () => {
      await expect(Promise.reject(new Error('test error'))).rejects.toThrow('test error');
    });
  });
});
