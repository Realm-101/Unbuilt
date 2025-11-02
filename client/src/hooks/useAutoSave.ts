import { useEffect, useRef, useState, useCallback } from 'react';
import { useDebounce } from './useDebounce';

export type AutoSaveStatus = 'idle' | 'saving' | 'saved' | 'error';

interface UseAutoSaveOptions<T> {
  /** The data to auto-save */
  data: T;
  /** Function to save the data */
  onSave: (data: T) => Promise<void>;
  /** Debounce delay in milliseconds (default: 500ms) */
  delay?: number;
  /** Whether auto-save is enabled */
  enabled?: boolean;
  /** Maximum number of retry attempts on error (default: 3) */
  maxRetries?: number;
  /** Delay between retries in milliseconds (default: 1000ms) */
  retryDelay?: number;
  /** Callback when save succeeds */
  onSuccess?: () => void;
  /** Callback when save fails after all retries */
  onError?: (error: Error) => void;
}

interface UseAutoSaveReturn {
  /** Current save status */
  status: AutoSaveStatus;
  /** Whether currently saving */
  isSaving: boolean;
  /** Whether save was successful */
  isSaved: boolean;
  /** Whether save failed */
  isError: boolean;
  /** Error message if save failed */
  error: Error | null;
  /** Manually trigger a save */
  save: () => Promise<void>;
  /** Reset the status */
  reset: () => void;
}

/**
 * useAutoSave Hook
 * 
 * Automatically saves data after a debounce delay with retry logic.
 * Shows status indicators for saving, saved, and error states.
 * 
 * Requirements: Non-functional (Usability) - Task 43
 * 
 * @example
 * ```tsx
 * const { status, isSaving, isSaved } = useAutoSave({
 *   data: formData,
 *   onSave: async (data) => {
 *     await api.updateTask(data);
 *   },
 *   delay: 500,
 *   enabled: isDirty,
 * });
 * ```
 */
export function useAutoSave<T>({
  data,
  onSave,
  delay = 500,
  enabled = true,
  maxRetries = 3,
  retryDelay = 1000,
  onSuccess,
  onError,
}: UseAutoSaveOptions<T>): UseAutoSaveReturn {
  const [status, setStatus] = useState<AutoSaveStatus>('idle');
  const [error, setError] = useState<Error | null>(null);
  const retryCountRef = useRef(0);
  const isInitialMount = useRef(true);
  const lastSavedData = useRef<T | null>(null);
  
  // Debounce the data to avoid excessive saves
  const debouncedData = useDebounce(data, delay);
  
  // Save function with retry logic
  const save = useCallback(async () => {
    if (!enabled) return;
    
    setStatus('saving');
    setError(null);
    
    try {
      await onSave(debouncedData);
      
      // Save successful
      setStatus('saved');
      retryCountRef.current = 0;
      lastSavedData.current = debouncedData;
      
      if (onSuccess) {
        onSuccess();
      }
      
      // Reset to idle after 2 seconds
      setTimeout(() => {
        setStatus('idle');
      }, 2000);
    } catch (err) {
      const saveError = err instanceof Error ? err : new Error('Save failed');
      
      // Retry logic
      if (retryCountRef.current < maxRetries) {
        retryCountRef.current++;
        
        // Wait before retrying
        setTimeout(() => {
          save();
        }, retryDelay);
      } else {
        // Max retries reached
        setStatus('error');
        setError(saveError);
        retryCountRef.current = 0;
        
        if (onError) {
          onError(saveError);
        }
      }
    }
  }, [debouncedData, enabled, onSave, maxRetries, retryDelay, onSuccess, onError]);
  
  // Auto-save when debounced data changes
  useEffect(() => {
    // Skip on initial mount
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    
    // Skip if not enabled
    if (!enabled) {
      return;
    }
    
    // Skip if data hasn't changed
    if (lastSavedData.current === debouncedData) {
      return;
    }
    
    // Trigger save
    save();
  }, [debouncedData, enabled, save]);
  
  // Reset function
  const reset = useCallback(() => {
    setStatus('idle');
    setError(null);
    retryCountRef.current = 0;
  }, []);
  
  return {
    status,
    isSaving: status === 'saving',
    isSaved: status === 'saved',
    isError: status === 'error',
    error,
    save,
    reset,
  };
}
