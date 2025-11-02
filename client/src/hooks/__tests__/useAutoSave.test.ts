import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useAutoSave } from '../useAutoSave';

describe('useAutoSave', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should initialize with idle status', () => {
    const mockSave = vi.fn().mockResolvedValue(undefined);
    
    const { result } = renderHook(() =>
      useAutoSave({
        data: { test: 'value' },
        onSave: mockSave,
        enabled: false, // Disabled to prevent auto-save on mount
      })
    );

    expect(result.current.status).toBe('idle');
    expect(result.current.isSaving).toBe(false);
    expect(result.current.isSaved).toBe(false);
    expect(result.current.isError).toBe(false);
    expect(result.current.error).toBe(null);
  });

  it('should auto-save after debounce delay when data changes', async () => {
    const mockSave = vi.fn().mockResolvedValue(undefined);
    
    const { result, rerender } = renderHook(
      ({ data }) =>
        useAutoSave({
          data,
          onSave: mockSave,
          delay: 500,
          enabled: true,
        }),
      {
        initialProps: { data: { test: 'initial' } },
      }
    );

    // Change data
    rerender({ data: { test: 'updated' } });

    // Should not save immediately
    expect(mockSave).not.toHaveBeenCalled();

    // Fast-forward past debounce delay
    vi.advanceTimersByTime(600);

    // Should trigger save
    await waitFor(() => {
      expect(mockSave).toHaveBeenCalledWith({ test: 'updated' });
    });
  });

  it('should show saving status during save', async () => {
    const mockSave = vi.fn().mockImplementation(
      () => new Promise(resolve => setTimeout(resolve, 1000))
    );
    
    const { result, rerender } = renderHook(
      ({ data }) =>
        useAutoSave({
          data,
          onSave: mockSave,
          delay: 500,
          enabled: true,
        }),
      {
        initialProps: { data: { test: 'initial' } },
      }
    );

    // Change data
    rerender({ data: { test: 'updated' } });

    // Fast-forward past debounce delay
    vi.advanceTimersByTime(600);

    // Should show saving status
    await waitFor(() => {
      expect(result.current.isSaving).toBe(true);
      expect(result.current.status).toBe('saving');
    });
  });

  it('should show saved status after successful save', async () => {
    const mockSave = vi.fn().mockResolvedValue(undefined);
    
    const { result, rerender } = renderHook(
      ({ data }) =>
        useAutoSave({
          data,
          onSave: mockSave,
          delay: 500,
          enabled: true,
        }),
      {
        initialProps: { data: { test: 'initial' } },
      }
    );

    // Change data
    rerender({ data: { test: 'updated' } });

    // Fast-forward past debounce delay
    vi.advanceTimersByTime(600);

    // Wait for save to complete
    await waitFor(() => {
      expect(result.current.isSaved).toBe(true);
      expect(result.current.status).toBe('saved');
    });
  });

  it('should reset to idle after 2 seconds of saved status', async () => {
    const mockSave = vi.fn().mockResolvedValue(undefined);
    
    const { result, rerender } = renderHook(
      ({ data }) =>
        useAutoSave({
          data,
          onSave: mockSave,
          delay: 500,
          enabled: true,
        }),
      {
        initialProps: { data: { test: 'initial' } },
      }
    );

    // Change data
    rerender({ data: { test: 'updated' } });

    // Fast-forward past debounce delay
    vi.advanceTimersByTime(600);

    // Wait for save to complete
    await waitFor(() => {
      expect(result.current.status).toBe('saved');
    });

    // Fast-forward 2 seconds
    vi.advanceTimersByTime(2000);

    // Should reset to idle
    await waitFor(() => {
      expect(result.current.status).toBe('idle');
    });
  });

  it('should retry on error up to maxRetries', async () => {
    let callCount = 0;
    const mockSave = vi.fn().mockImplementation(() => {
      callCount++;
      if (callCount < 3) {
        return Promise.reject(new Error('Save failed'));
      }
      return Promise.resolve();
    });
    
    const { result, rerender } = renderHook(
      ({ data }) =>
        useAutoSave({
          data,
          onSave: mockSave,
          delay: 500,
          enabled: true,
          maxRetries: 3,
          retryDelay: 1000,
        }),
      {
        initialProps: { data: { test: 'initial' } },
      }
    );

    // Change data
    rerender({ data: { test: 'updated' } });

    // Fast-forward past debounce delay
    vi.advanceTimersByTime(600);

    // Wait for first attempt
    await waitFor(() => {
      expect(mockSave).toHaveBeenCalledTimes(1);
    });

    // Fast-forward retry delay
    vi.advanceTimersByTime(1100);

    // Should retry
    await waitFor(() => {
      expect(mockSave).toHaveBeenCalledTimes(2);
    });

    // Fast-forward retry delay again
    vi.advanceTimersByTime(1100);

    // Should succeed on third attempt
    await waitFor(() => {
      expect(mockSave).toHaveBeenCalledTimes(3);
      expect(result.current.status).toBe('saved');
    });
  });

  it('should show error status after max retries', async () => {
    const mockSave = vi.fn().mockRejectedValue(new Error('Save failed'));
    const mockOnError = vi.fn();
    
    const { result, rerender } = renderHook(
      ({ data }) =>
        useAutoSave({
          data,
          onSave: mockSave,
          delay: 500,
          enabled: true,
          maxRetries: 2,
          retryDelay: 1000,
          onError: mockOnError,
        }),
      {
        initialProps: { data: { test: 'initial' } },
      }
    );

    // Change data
    rerender({ data: { test: 'updated' } });

    // Fast-forward past debounce delay
    vi.advanceTimersByTime(600);

    // Wait for first attempt
    await waitFor(() => {
      expect(mockSave).toHaveBeenCalledTimes(1);
    });

    // Fast-forward retry delays
    vi.advanceTimersByTime(1100);
    await waitFor(() => {
      expect(mockSave).toHaveBeenCalledTimes(2);
    });

    vi.advanceTimersByTime(1100);
    await waitFor(() => {
      expect(mockSave).toHaveBeenCalledTimes(3);
    });

    // Should show error status
    await waitFor(() => {
      expect(result.current.isError).toBe(true);
      expect(result.current.status).toBe('error');
      expect(result.current.error).toBeInstanceOf(Error);
      expect(mockOnError).toHaveBeenCalled();
    });
  });

  it('should not auto-save when disabled', async () => {
    const mockSave = vi.fn().mockResolvedValue(undefined);
    
    const { rerender } = renderHook(
      ({ data }) =>
        useAutoSave({
          data,
          onSave: mockSave,
          delay: 500,
          enabled: false,
        }),
      {
        initialProps: { data: { test: 'initial' } },
      }
    );

    // Change data
    rerender({ data: { test: 'updated' } });

    // Fast-forward past debounce delay
    vi.advanceTimersByTime(600);

    // Should not save
    expect(mockSave).not.toHaveBeenCalled();
  });

  it('should call onSuccess callback after successful save', async () => {
    const mockSave = vi.fn().mockResolvedValue(undefined);
    const mockOnSuccess = vi.fn();
    
    const { rerender } = renderHook(
      ({ data }) =>
        useAutoSave({
          data,
          onSave: mockSave,
          delay: 500,
          enabled: true,
          onSuccess: mockOnSuccess,
        }),
      {
        initialProps: { data: { test: 'initial' } },
      }
    );

    // Change data
    rerender({ data: { test: 'updated' } });

    // Fast-forward past debounce delay
    vi.advanceTimersByTime(600);

    // Wait for save to complete
    await waitFor(() => {
      expect(mockOnSuccess).toHaveBeenCalled();
    });
  });

  it('should allow manual save trigger', async () => {
    const mockSave = vi.fn().mockResolvedValue(undefined);
    
    const { result } = renderHook(() =>
      useAutoSave({
        data: { test: 'value' },
        onSave: mockSave,
        enabled: false, // Disabled auto-save
      })
    );

    // Manually trigger save
    await result.current.save();

    // Should save
    expect(mockSave).toHaveBeenCalledWith({ test: 'value' });
  });

  it('should reset status when reset is called', async () => {
    const mockSave = vi.fn().mockRejectedValue(new Error('Save failed'));
    
    const { result, rerender } = renderHook(
      ({ data }) =>
        useAutoSave({
          data,
          onSave: mockSave,
          delay: 500,
          enabled: true,
          maxRetries: 0,
        }),
      {
        initialProps: { data: { test: 'initial' } },
      }
    );

    // Change data to trigger error
    rerender({ data: { test: 'updated' } });
    vi.advanceTimersByTime(600);

    // Wait for error
    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    // Reset
    result.current.reset();

    // Should be back to idle
    expect(result.current.status).toBe('idle');
    expect(result.current.error).toBe(null);
  });

  it('should not save on initial mount', async () => {
    const mockSave = vi.fn().mockResolvedValue(undefined);
    
    renderHook(() =>
      useAutoSave({
        data: { test: 'initial' },
        onSave: mockSave,
        delay: 500,
        enabled: true,
      })
    );

    // Fast-forward past debounce delay
    vi.advanceTimersByTime(600);

    // Should not save on initial mount
    expect(mockSave).not.toHaveBeenCalled();
  });

  it('should not save if data has not changed', async () => {
    const mockSave = vi.fn().mockResolvedValue(undefined);
    
    const { rerender } = renderHook(
      ({ data }) =>
        useAutoSave({
          data,
          onSave: mockSave,
          delay: 500,
          enabled: true,
        }),
      {
        initialProps: { data: { test: 'value' } },
      }
    );

    // Change data
    rerender({ data: { test: 'updated' } });
    vi.advanceTimersByTime(600);

    // Wait for save
    await waitFor(() => {
      expect(mockSave).toHaveBeenCalledTimes(1);
    });

    // Rerender with same data
    rerender({ data: { test: 'updated' } });
    vi.advanceTimersByTime(600);

    // Should not save again
    expect(mockSave).toHaveBeenCalledTimes(1);
  });
});
