import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useResourceTracking } from '../useResourceTracking';
import React from 'react';

// Mock fetch
global.fetch = vi.fn();

describe('useResourceTracking', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    vi.clearAllMocks();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);

  it('should track external link click', async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true }),
    } as Response);

    const { result } = renderHook(() => useResourceTracking(), { wrapper });

    result.current.trackExternalLink(123, { analysisId: 456, stepId: 'step-1' });

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/resources/123/access',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            analysisId: 456,
            stepId: 'step-1',
            accessType: 'external_link',
          }),
        })
      );
    });
  });

  it('should track download', async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true }),
    } as Response);

    const { result } = renderHook(() => useResourceTracking(), { wrapper });

    result.current.trackDownload(789);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/resources/789/access',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            analysisId: undefined,
            stepId: undefined,
            accessType: 'download',
          }),
        })
      );
    });
  });

  it('should track view', async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true }),
    } as Response);

    const { result } = renderHook(() => useResourceTracking(), { wrapper });

    result.current.trackView(999, { analysisId: 111 });

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/resources/999/access',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            analysisId: 111,
            stepId: undefined,
            accessType: 'view',
          }),
        })
      );
    });
  });

  it('should handle tracking errors gracefully', async () => {
    const mockFetch = vi.mocked(fetch);
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHook(() => useResourceTracking(), { wrapper });

    result.current.trackExternalLink(123);

    await waitFor(() => {
      expect(consoleError).toHaveBeenCalledWith(
        'Failed to track resource access:',
        expect.any(Error)
      );
    });

    consoleError.mockRestore();
  });

  it('should provide isTracking state', () => {
    const { result } = renderHook(() => useResourceTracking(), { wrapper });

    expect(result.current.isTracking).toBe(false);
  });
});
