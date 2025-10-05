import { useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';

/**
 * Error types for classification
 */
export enum ErrorType {
  NETWORK = 'NETWORK',
  AUTHENTICATION = 'AUTHENTICATION',
  AUTHORIZATION = 'AUTHORIZATION',
  VALIDATION = 'VALIDATION',
  NOT_FOUND = 'NOT_FOUND',
  SERVER = 'SERVER',
  UNKNOWN = 'UNKNOWN',
}

/**
 * Retry configuration
 */
interface RetryConfig {
  maxRetries?: number;
  initialDelay?: number;
  maxDelay?: number;
  backoffMultiplier?: number;
}

/**
 * Error handler options
 */
interface ErrorHandlerOptions {
  showToast?: boolean;
  logError?: boolean;
  retry?: boolean;
  retryConfig?: RetryConfig;
}

/**
 * Error details
 */
interface ErrorDetails {
  type: ErrorType;
  message: string;
  originalError: Error;
  timestamp: Date;
  retryCount?: number;
}

/**
 * Default retry configuration
 */
const DEFAULT_RETRY_CONFIG: Required<RetryConfig> = {
  maxRetries: 3,
  initialDelay: 1000, // 1 second
  maxDelay: 10000, // 10 seconds
  backoffMultiplier: 2,
};

/**
 * useErrorHandler Hook
 * 
 * Provides comprehensive error handling with user-friendly messages,
 * retry logic with exponential backoff, and toast notifications.
 * 
 * @example
 * ```tsx
 * const { handleError, retry, isRetrying } = useErrorHandler();
 * 
 * try {
 *   await fetchData();
 * } catch (error) {
 *   handleError(error, { retry: true });
 * }
 * ```
 */
export function useErrorHandler() {
  const { toast } = useToast();
  const [isRetrying, setIsRetrying] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [lastError, setLastError] = useState<ErrorDetails | null>(null);

  /**
   * Classify error type based on error properties
   */
  const classifyError = useCallback((error: any): ErrorType => {
    // Network errors
    if (
      error.message?.includes('network') ||
      error.message?.includes('fetch') ||
      error.name === 'NetworkError' ||
      !navigator.onLine
    ) {
      return ErrorType.NETWORK;
    }

    // Authentication errors
    if (
      error.status === 401 ||
      error.message?.includes('unauthorized') ||
      error.message?.includes('authentication')
    ) {
      return ErrorType.AUTHENTICATION;
    }

    // Authorization errors
    if (
      error.status === 403 ||
      error.message?.includes('forbidden') ||
      error.message?.includes('permission')
    ) {
      return ErrorType.AUTHORIZATION;
    }

    // Validation errors
    if (
      error.status === 400 ||
      error.message?.includes('validation') ||
      error.message?.includes('invalid')
    ) {
      return ErrorType.VALIDATION;
    }

    // Not found errors
    if (error.status === 404 || error.message?.includes('not found')) {
      return ErrorType.NOT_FOUND;
    }

    // Server errors
    if (error.status >= 500 || error.message?.includes('server error')) {
      return ErrorType.SERVER;
    }

    return ErrorType.UNKNOWN;
  }, []);

  /**
   * Get user-friendly error message based on error type
   */
  const getUserFriendlyMessage = useCallback((type: ErrorType, originalMessage?: string): string => {
    switch (type) {
      case ErrorType.NETWORK:
        return 'Unable to connect. Please check your internet connection and try again.';
      
      case ErrorType.AUTHENTICATION:
        return 'Your session has expired. Please log in again.';
      
      case ErrorType.AUTHORIZATION:
        return 'You don\'t have permission to perform this action.';
      
      case ErrorType.VALIDATION:
        return originalMessage || 'Please check your input and try again.';
      
      case ErrorType.NOT_FOUND:
        return 'The requested resource could not be found.';
      
      case ErrorType.SERVER:
        return 'Server error. Please try again later.';
      
      case ErrorType.UNKNOWN:
      default:
        return 'Something went wrong. Please try again.';
    }
  }, []);

  /**
   * Calculate delay for exponential backoff
   */
  const calculateDelay = useCallback((
    attempt: number,
    config: Required<RetryConfig>
  ): number => {
    const delay = Math.min(
      config.initialDelay * Math.pow(config.backoffMultiplier, attempt),
      config.maxDelay
    );
    // Add jitter to prevent thundering herd
    return delay + Math.random() * 1000;
  }, []);

  /**
   * Sleep utility for retry delays
   */
  const sleep = (ms: number): Promise<void> => {
    return new Promise(resolve => setTimeout(resolve, ms));
  };

  /**
   * Retry a function with exponential backoff
   */
  const retry = useCallback(async <T>(
    fn: () => Promise<T>,
    config: RetryConfig = {}
  ): Promise<T> => {
    const retryConfig = { ...DEFAULT_RETRY_CONFIG, ...config };
    let lastError: Error;

    setIsRetrying(true);

    for (let attempt = 0; attempt <= retryConfig.maxRetries; attempt++) {
      try {
        setRetryCount(attempt);
        const result = await fn();
        setIsRetrying(false);
        setRetryCount(0);
        return result;
      } catch (error) {
        lastError = error as Error;

        // Don't retry on authentication or authorization errors
        const errorType = classifyError(error);
        if (
          errorType === ErrorType.AUTHENTICATION ||
          errorType === ErrorType.AUTHORIZATION
        ) {
          setIsRetrying(false);
          setRetryCount(0);
          throw error;
        }

        // If we've exhausted retries, throw the error
        if (attempt === retryConfig.maxRetries) {
          setIsRetrying(false);
          setRetryCount(0);
          throw error;
        }

        // Wait before retrying
        const delay = calculateDelay(attempt, retryConfig);
        await sleep(delay);
      }
    }

    setIsRetrying(false);
    setRetryCount(0);
    throw lastError!;
  }, [classifyError, calculateDelay]);

  /**
   * Handle error with optional retry and toast notification
   */
  const handleError = useCallback((
    error: any,
    options: ErrorHandlerOptions = {}
  ): ErrorDetails => {
    const {
      showToast = true,
      logError = true,
      retry: shouldRetry = false,
      retryConfig = {},
    } = options;

    // Classify the error
    const errorType = classifyError(error);
    const userMessage = getUserFriendlyMessage(errorType, error.message);

    // Create error details
    const errorDetails: ErrorDetails = {
      type: errorType,
      message: userMessage,
      originalError: error,
      timestamp: new Date(),
      retryCount,
    };

    // Log error if enabled
    if (logError) {
      console.error('Error handled:', {
        type: errorType,
        message: error.message,
        stack: error.stack,
        timestamp: errorDetails.timestamp,
      });
    }

    // Show toast notification if enabled
    if (showToast) {
      toast({
        title: 'Error',
        description: userMessage,
        variant: 'destructive',
      });
    }

    // Store last error
    setLastError(errorDetails);

    // Handle authentication errors by redirecting to login
    if (errorType === ErrorType.AUTHENTICATION) {
      setTimeout(() => {
        window.location.href = '/auth/login';
      }, 2000);
    }

    return errorDetails;
  }, [classifyError, getUserFriendlyMessage, retryCount, toast]);

  /**
   * Clear last error
   */
  const clearError = useCallback(() => {
    setLastError(null);
    setRetryCount(0);
  }, []);

  /**
   * Check if online
   */
  const isOnline = navigator.onLine;

  return {
    handleError,
    retry,
    isRetrying,
    retryCount,
    lastError,
    clearError,
    isOnline,
  };
}

/**
 * Async error wrapper for use with React Query or other async operations
 * 
 * @example
 * ```tsx
 * const { handleError } = useErrorHandler();
 * 
 * const query = useQuery({
 *   queryKey: ['data'],
 *   queryFn: withErrorHandler(fetchData, handleError),
 * });
 * ```
 */
export function withErrorHandler<T>(
  fn: () => Promise<T>,
  errorHandler: (error: any) => void
): () => Promise<T> {
  return async () => {
    try {
      return await fn();
    } catch (error) {
      errorHandler(error);
      throw error;
    }
  };
}
