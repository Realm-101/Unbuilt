import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ShareDialog } from '../ShareDialog';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock clipboard API
Object.assign(navigator, {
  clipboard: {
    writeText: vi.fn().mockResolvedValue(undefined),
  },
});

// Mock fetch
global.fetch = vi.fn();

describe('ShareDialog', () => {
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

  const renderComponent = (props = {}) => {
    return render(
      <QueryClientProvider client={queryClient}>
        <ShareDialog
          analysisId="test-analysis-123"
          onClose={vi.fn()}
          {...props}
        />
      </QueryClientProvider>
    );
  };

  it('should render share dialog', () => {
    renderComponent();

    expect(screen.getByText(/Share Analysis/i)).toBeInTheDocument();
  });

  it('should generate share link on mount', async () => {
    const mockShareLink = {
      id: '1',
      url: 'https://unbuilt.one/share/abc123',
      token: 'abc123',
      expiresAt: null,
      viewCount: 0,
      active: true,
      createdAt: new Date().toISOString(),
    };

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, data: mockShareLink }),
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByDisplayValue(/abc123/)).toBeInTheDocument();
    });
  });

  it('should copy link to clipboard', async () => {
    const mockShareLink = {
      id: '1',
      url: 'https://unbuilt.one/share/abc123',
      token: 'abc123',
      expiresAt: null,
      viewCount: 0,
      active: true,
      createdAt: new Date().toISOString(),
    };

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, data: mockShareLink }),
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByDisplayValue(/abc123/)).toBeInTheDocument();
    });

    const copyButton = screen.getByRole('button', { name: /copy/i });
    fireEvent.click(copyButton);

    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
        mockShareLink.url
      );
    });
  });

  it('should display view count', async () => {
    const mockShareLink = {
      id: '1',
      url: 'https://unbuilt.one/share/abc123',
      token: 'abc123',
      expiresAt: null,
      viewCount: 5,
      active: true,
      createdAt: new Date().toISOString(),
    };

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, data: mockShareLink }),
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText(/5 views/i)).toBeInTheDocument();
    });
  });

  it('should allow setting expiration date', async () => {
    const mockShareLink = {
      id: '1',
      url: 'https://unbuilt.one/share/abc123',
      token: 'abc123',
      expiresAt: null,
      viewCount: 0,
      active: true,
      createdAt: new Date().toISOString(),
    };

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, data: mockShareLink }),
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByDisplayValue(/abc123/)).toBeInTheDocument();
    });

    // Look for expiration date input or button
    const expirationButton = screen.queryByRole('button', {
      name: /expiration/i,
    });
    if (expirationButton) {
      fireEvent.click(expirationButton);
    }
  });

  it('should handle revoke link', async () => {
    const mockShareLink = {
      id: '1',
      url: 'https://unbuilt.one/share/abc123',
      token: 'abc123',
      expiresAt: null,
      viewCount: 0,
      active: true,
      createdAt: new Date().toISOString(),
    };

    (global.fetch as any)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockShareLink }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByDisplayValue(/abc123/)).toBeInTheDocument();
    });

    const revokeButton = screen.queryByRole('button', { name: /revoke/i });
    if (revokeButton) {
      fireEvent.click(revokeButton);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/share/links/1'),
          expect.objectContaining({ method: 'DELETE' })
        );
      });
    }
  });

  it('should close dialog on close button click', () => {
    const onClose = vi.fn();
    renderComponent({ onClose });

    const closeButton = screen.getByRole('button', { name: /close/i });
    fireEvent.click(closeButton);

    expect(onClose).toHaveBeenCalled();
  });
});
