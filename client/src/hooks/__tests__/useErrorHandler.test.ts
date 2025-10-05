import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useErrorHandler, ErrorType } from '../useErrorHandler';

// Mock the toast hook
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

describe('useErrorHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Error Classification', () => {
    it('should classify network errors correctly', () => {
      const { result } = renderHook(() => useErrorHandler());
      
      const networkError = new Error('fetch failed');
      const details = result.current.handleError(networkError, { showToast: false });
      
      expect(details.type).toBe(ErrorType.NETWORK);
      expect(details.message).toContain('connect');
    });

    it('should classify authentication errors correctly', () => {
      const { result } = renderHook(() => useErrorHandler());
      
      const authError = { status: 401, message: 'Unauthorized' };
      const details = result.current.handleError(authError, { showToast: false });
      
      expect(details.type).toBe(ErrorType.AUTHENTICATION);
      expect(details.message).toContain('session');
    });

    it('should classify validation errors correctly', () => {
      const { result } = renderHook(() => useErrorHandler());
      
      const validationError = { status: 400, message: 'Invalid input' };
      const details = result.current.handleError(validationError, { showToast: false });
      
      expect(details.type).toBe(ErrorType.VALIDATION);
    });

    it('should classify not found errors correctly', () => {
      const { result } = renderHook(() => useErrorHandler());
      
      const notFoundError = { status: 404, message: 'Not found' };
      const details = result.current.handleError(notFoundError, { showToast: false });
      
      expect(details.type).toBe(ErrorType.NOT_FOUND);
    });

    it('should classify server errors correctly', () => {
      const { result } = renderHook(() => useErrorHandler());
      
      const serverError = { status: 500, message: 'Internal server error' };
      const details = result.current.handleError(serverError, { showToast: false });
      
      expect(details.type).toBe(ErrorType.SERVER);
    });
  });

  describe('User-Friendly Messages', () => {
    it('should provide user-friendly message for network errors', () => {
      const { result } = renderHook(() => useErrorHandler());
      
      const error = new Error('network error');
      const details = result.current.handleError(error, { showToast: false });
      
      expect(details.message).not.toContain('network error');
      expect(details.message).toContain('connect');
    });

    it('should provide user-friendly message for validation errors', () => {
      const { result } = renderHook(() => useErrorHandler());
      
      const error = { status: 400, message: 'validation failed' };
      const details = result.current.handleError(error, { showToast: false });
      
      expect(details.message).toContain('input');
    });
  });

  describe('Retry Logic', () => {
    it('should retry failed operations', async () => {
      const { result } = renderHook(() => useErrorHandler());
      
      const mockFn = vi.fn()
        .mockRejectedValueOnce(new Error('Temporary failure'))
        .mockResolvedValueOnce('Success');
      
      const data = await result.current.retry(mockFn, { 
        maxRetries: 3,
        initialDelay: 10 
      });
      
      expect(data).toBe('Success');
      expect(mockFn).toHaveBeenCalledTimes(2);
    });

    it('should respect maxRetries limit', async () => {
      const { result } = renderHook(() => useErrorHandler());
      
      const mockFn = vi.fn().mockRejectedValue(new Error('Always fails'));
      
      await expect(
        result.current.retry(mockFn, { 
          maxRetries: 2,
          initialDelay: 10 
        })
      ).rejects.toThrow('Always fails');
      
      expect(mockFn).toHaveBeenCalledTimes(3); // Initial + 2 retries
    });

    it('should not retry authentication errors', async () => {
      const { result } = renderHook(() => useErrorHandler());
      
      const authError = { status: 401, message: 'Unauthorized' };
      const mockFn = vi.fn().mockRejectedValue(authError);
      
      await expect(
        result.current.retry(mockFn, { maxRetries: 3 })
      ).rejects.toEqual(authError);
      
      expect(mockFn).toHaveBeenCalledTimes(1); // No retries
    });

    it('should update retry count during retries', async () => {
      const { result } = renderHook(() => useErrorHandler());
      
      const mockFn = vi.fn()
        .mockRejectedValueOnce(new Error('Fail 1'))
        .mockRejectedValueOnce(new Error('Fail 2'))
        .mockResolvedValueOnce('Success');
      
      const promise = result.current.retry(mockFn, { 
        maxRetries: 3,
        initialDelay: 10 
      });
      
      await waitFor(() => {
        expect(result.current.isRetrying).toBe(true);
      });
      
      await promise;
      
      expect(result.current.isRetrying).toBe(false);
      expect(result.current.retryCount).toBe(0);
    });
  });

  describe('Exponential Backoff', () => {
    it('should increase delay exponentially', async () => {
      const { result } = renderHook(() => useErrorHandler());
      
      const startTime = Date.now();
      const mockFn = vi.fn()
        .mockRejectedValueOnce(new Error('Fail 1'))
        .mockRejectedValueOnce(new Error('Fail 2'))
        .mockResolvedValueOnce('Success');
      
      await result.current.retry(mockFn, {
        maxRetries: 3,
        initialDelay: 100,
        backoffMultiplier: 2,
      });
      
      const duration = Date.now() - startTime;
      
      // Should take at least 100ms (first retry) + 200ms (second retry) = 300ms
      // Adding some buffer for execution time
      expect(duration).toBeGreaterThan(250);
    });

    it('should respect maxDelay', async () => {
      const { result } = renderHook(() => useErrorHandler());
      
      const startTime = Date.now();
      const mockFn = vi.fn()
        .mockRejectedValueOnce(new Error('Fail 1'))
        .mockRejectedValueOnce(new Error('Fail 2'))
        .mockResolvedValueOnce('Success');
      
      await result.current.retry(mockFn, {
        maxRetries: 3,
        initialDelay: 1000,
        maxDelay: 100, // Cap at 100ms
        backoffMultiplier: 2,
      });
      
      const duration = Date.now() - startTime;
      
      // Should not exceed maxDelay significantly
      expect(duration).toBeLessThan(500);
    });
  });

  describe('Error State Management', () => {
    it('should store last error', () => {
      const { result } = renderHook(() => useErrorHandler());
      
      const error = new Error('Test error');
      result.current.handleError(error, { showToast: false });
      
      expect(result.current.lastError).toBeDefined();
      expect(result.current.lastError?.originalError).toBe(error);
    });

    it('should clear error', () => {
      const { result } = renderHook(() => useErrorHandler());
      
      const error = new Error('Test error');
      result.current.handleError(error, { showToast: false });
      
      expect(result.current.lastError).toBeDefined();
      
      act(() => {
        result.current.clearError();
      });
      
      expect(result.current.lastError).toBeNull();
    });
  });

  describe('Online Detection', () => {
    it('should detect online status', () => {
      const { result } = renderHook(() => useErrorHandler());
      
      expect(result.current.isOnline).toBeDefined();
      expect(typeof result.current.isOnline).toBe('boolean');
    });
  });
});
