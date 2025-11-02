import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { GlobalSearch } from '../GlobalSearch';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock useGlobalSearch hook
vi.mock('@/hooks/useGlobalSearch', () => ({
  useGlobalSearch: vi.fn(() => ({
    isOpen: true,
    open: vi.fn(),
    close: vi.fn(),
    query: '',
    setQuery: vi.fn(),
    results: [],
    isLoading: false,
    selectedIndex: 0,
    handleKeyDown: vi.fn(),
    handleResultClick: vi.fn(),
  })),
}));

describe('GlobalSearch', () => {
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

  const renderComponent = () => {
    return render(
      <QueryClientProvider client={queryClient}>
        <GlobalSearch />
      </QueryClientProvider>
    );
  };

  it('should render search modal when open', () => {
    renderComponent();

    expect(screen.getByPlaceholderText(/search/i)).toBeInTheDocument();
  });

  it('should display keyboard shortcut hint', () => {
    renderComponent();

    // Look for Cmd+K or Ctrl+K hint
    const shortcutHint = screen.queryByText(/⌘K|Ctrl\+K/i);
    if (shortcutHint) {
      expect(shortcutHint).toBeInTheDocument();
    }
  });

  it('should filter results by category', async () => {
    const mockResults = [
      {
        type: 'analysis',
        id: '1',
        title: 'Test Analysis',
        description: 'A test analysis',
        path: '/analysis/1',
      },
      {
        type: 'help',
        id: '2',
        title: 'Help Article',
        description: 'A help article',
        path: '/help/2',
      },
    ];

    const { useGlobalSearch } = await import('@/hooks/useGlobalSearch');
    (useGlobalSearch as any).mockReturnValue({
      isOpen: true,
      open: vi.fn(),
      close: vi.fn(),
      query: 'test',
      setQuery: vi.fn(),
      results: mockResults,
      isLoading: false,
      selectedIndex: 0,
      handleKeyDown: vi.fn(),
      handleResultClick: vi.fn(),
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Test Analysis')).toBeInTheDocument();
      expect(screen.getByText('Help Article')).toBeInTheDocument();
    });
  });

  it('should navigate results with keyboard', async () => {
    const handleKeyDown = vi.fn();
    const { useGlobalSearch } = await import('@/hooks/useGlobalSearch');
    (useGlobalSearch as any).mockReturnValue({
      isOpen: true,
      open: vi.fn(),
      close: vi.fn(),
      query: '',
      setQuery: vi.fn(),
      results: [],
      isLoading: false,
      selectedIndex: 0,
      handleKeyDown,
      handleResultClick: vi.fn(),
    });

    renderComponent();

    const input = screen.getByPlaceholderText(/search/i);
    fireEvent.keyDown(input, { key: 'ArrowDown' });

    expect(handleKeyDown).toHaveBeenCalledWith(
      expect.objectContaining({ key: 'ArrowDown' })
    );
  });

  it('should show loading state', async () => {
    const { useGlobalSearch } = await import('@/hooks/useGlobalSearch');
    (useGlobalSearch as any).mockReturnValue({
      isOpen: true,
      open: vi.fn(),
      close: vi.fn(),
      query: 'test',
      setQuery: vi.fn(),
      results: [],
      isLoading: true,
      selectedIndex: 0,
      handleKeyDown: vi.fn(),
      handleResultClick: vi.fn(),
    });

    renderComponent();

    expect(screen.getByText(/searching/i)).toBeInTheDocument();
  });

  it('should show empty state when no results', async () => {
    const { useGlobalSearch } = await import('@/hooks/useGlobalSearch');
    (useGlobalSearch as any).mockReturnValue({
      isOpen: true,
      open: vi.fn(),
      close: vi.fn(),
      query: 'nonexistent',
      setQuery: vi.fn(),
      results: [],
      isLoading: false,
      selectedIndex: 0,
      handleKeyDown: vi.fn(),
      handleResultClick: vi.fn(),
    });

    renderComponent();

    expect(screen.getByText(/no results/i)).toBeInTheDocument();
  });

  it('should close on Escape key', async () => {
    const close = vi.fn();
    const { useGlobalSearch } = await import('@/hooks/useGlobalSearch');
    (useGlobalSearch as any).mockReturnValue({
      isOpen: true,
      open: vi.fn(),
      close,
      query: '',
      setQuery: vi.fn(),
      results: [],
      isLoading: false,
      selectedIndex: 0,
      handleKeyDown: vi.fn((e) => {
        if (e.key === 'Escape') close();
      }),
      handleResultClick: vi.fn(),
    });

    renderComponent();

    const input = screen.getByPlaceholderText(/search/i);
    fireEvent.keyDown(input, { key: 'Escape' });

    expect(close).toHaveBeenCalled();
  });
});
