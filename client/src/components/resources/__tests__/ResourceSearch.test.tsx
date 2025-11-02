import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ResourceSearch } from '../ResourceSearch';

// Mock debounce hook
vi.mock('@/hooks/useDebounce', () => ({
  useDebounce: (value: string) => value,
}));

// Mock fetch
global.fetch = vi.fn();

describe('ResourceSearch', () => {
  const mockOnSearch = vi.fn();
  const mockOnClear = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders search input', () => {
    render(<ResourceSearch onSearch={mockOnSearch} />);

    expect(screen.getByPlaceholderText('Search resources...')).toBeInTheDocument();
    expect(screen.getByLabelText('Search resources')).toBeInTheDocument();
  });

  it('renders with custom placeholder', () => {
    render(
      <ResourceSearch 
        onSearch={mockOnSearch} 
        placeholder="Find tools..."
      />
    );

    expect(screen.getByPlaceholderText('Find tools...')).toBeInTheDocument();
  });

  it('updates input value on change', () => {
    render(<ResourceSearch onSearch={mockOnSearch} />);

    const input = screen.getByLabelText('Search resources');
    fireEvent.change(input, { target: { value: 'test query' } });

    expect(input).toHaveValue('test query');
  });

  it('shows clear button when input has value', () => {
    render(<ResourceSearch onSearch={mockOnSearch} />);

    const input = screen.getByLabelText('Search resources');
    fireEvent.change(input, { target: { value: 'test' } });

    expect(screen.getByLabelText('Clear search')).toBeInTheDocument();
  });

  it('clears input when clear button is clicked', () => {
    render(<ResourceSearch onSearch={mockOnSearch} onClear={mockOnClear} />);

    const input = screen.getByLabelText('Search resources');
    fireEvent.change(input, { target: { value: 'test' } });

    const clearButton = screen.getByLabelText('Clear search');
    fireEvent.click(clearButton);

    expect(input).toHaveValue('');
    expect(mockOnClear).toHaveBeenCalled();
  });

  it('calls onSearch when search button is clicked', () => {
    render(<ResourceSearch onSearch={mockOnSearch} />);

    const input = screen.getByLabelText('Search resources');
    fireEvent.change(input, { target: { value: 'test query' } });

    const searchButton = screen.getByRole('button', { name: 'Search' });
    fireEvent.click(searchButton);

    expect(mockOnSearch).toHaveBeenCalledWith('test query');
  });

  it('calls onSearch when Enter key is pressed', () => {
    render(<ResourceSearch onSearch={mockOnSearch} />);

    const input = screen.getByLabelText('Search resources');
    fireEvent.change(input, { target: { value: 'test query' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(mockOnSearch).toHaveBeenCalledWith('test query');
  });

  it('trims whitespace from search query', () => {
    render(<ResourceSearch onSearch={mockOnSearch} />);

    const input = screen.getByLabelText('Search resources');
    fireEvent.change(input, { target: { value: '  test query  ' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(mockOnSearch).toHaveBeenCalledWith('test query');
  });

  it('does not search with empty query', () => {
    render(<ResourceSearch onSearch={mockOnSearch} />);

    const input = screen.getByLabelText('Search resources');
    fireEvent.change(input, { target: { value: '   ' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(mockOnSearch).not.toHaveBeenCalled();
  });

  it('fetches suggestions when typing', async () => {
    const mockSuggestions = {
      success: true,
      data: {
        resources: [
          {
            id: 1,
            title: 'Test Resource',
            description: 'A test resource',
            category: { name: 'Funding' },
            resourceType: 'tool',
          },
        ],
      },
    };

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockSuggestions,
    });

    render(<ResourceSearch onSearch={mockOnSearch} showSuggestions={true} />);

    const input = screen.getByLabelText('Search resources');
    fireEvent.change(input, { target: { value: 'test' } });

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/resources/search?q=test'),
        expect.any(Object)
      );
    });
  });

  it('displays suggestions dropdown', async () => {
    const mockSuggestions = {
      success: true,
      data: {
        resources: [
          {
            id: 1,
            title: 'Test Resource',
            description: 'A test resource',
            category: { name: 'Funding' },
            resourceType: 'tool',
          },
        ],
      },
    };

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockSuggestions,
    });

    render(<ResourceSearch onSearch={mockOnSearch} showSuggestions={true} />);

    const input = screen.getByLabelText('Search resources');
    fireEvent.change(input, { target: { value: 'test' } });

    await waitFor(() => {
      expect(screen.getByText('Test Resource')).toBeInTheDocument();
      expect(screen.getByText('A test resource')).toBeInTheDocument();
    });
  });

  it('selects suggestion on click', async () => {
    const mockSuggestions = {
      success: true,
      data: {
        resources: [
          {
            id: 1,
            title: 'Test Resource',
            description: 'A test resource',
            category: { name: 'Funding' },
            resourceType: 'tool',
          },
        ],
      },
    };

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockSuggestions,
    });

    render(<ResourceSearch onSearch={mockOnSearch} showSuggestions={true} />);

    const input = screen.getByLabelText('Search resources');
    fireEvent.change(input, { target: { value: 'test' } });

    await waitFor(() => {
      expect(screen.getByText('Test Resource')).toBeInTheDocument();
    });

    const suggestion = screen.getByText('Test Resource');
    fireEvent.click(suggestion);

    expect(mockOnSearch).toHaveBeenCalledWith('Test Resource');
  });

  it('navigates suggestions with arrow keys', async () => {
    const mockSuggestions = {
      success: true,
      data: {
        resources: [
          {
            id: 1,
            title: 'Resource 1',
            description: 'First resource',
            category: { name: 'Funding' },
            resourceType: 'tool',
          },
          {
            id: 2,
            title: 'Resource 2',
            description: 'Second resource',
            category: { name: 'Marketing' },
            resourceType: 'guide',
          },
        ],
      },
    };

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockSuggestions,
    });

    render(<ResourceSearch onSearch={mockOnSearch} showSuggestions={true} />);

    const input = screen.getByLabelText('Search resources');
    fireEvent.change(input, { target: { value: 'test' } });

    await waitFor(() => {
      expect(screen.getByText('Resource 1')).toBeInTheDocument();
    });

    // Arrow down to select first suggestion
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    
    const firstSuggestion = screen.getByText('Resource 1').closest('button');
    expect(firstSuggestion).toHaveAttribute('aria-selected', 'true');

    // Arrow down to select second suggestion
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    
    const secondSuggestion = screen.getByText('Resource 2').closest('button');
    expect(secondSuggestion).toHaveAttribute('aria-selected', 'true');
  });

  it('selects highlighted suggestion with Enter key', async () => {
    const mockSuggestions = {
      success: true,
      data: {
        resources: [
          {
            id: 1,
            title: 'Resource 1',
            description: 'First resource',
            category: { name: 'Funding' },
            resourceType: 'tool',
          },
        ],
      },
    };

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockSuggestions,
    });

    render(<ResourceSearch onSearch={mockOnSearch} showSuggestions={true} />);

    const input = screen.getByLabelText('Search resources');
    fireEvent.change(input, { target: { value: 'test' } });

    await waitFor(() => {
      expect(screen.getByText('Resource 1')).toBeInTheDocument();
    });

    // Arrow down to select suggestion
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    
    // Press Enter
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(mockOnSearch).toHaveBeenCalledWith('Resource 1');
  });

  it('closes suggestions on Escape key', async () => {
    const mockSuggestions = {
      success: true,
      data: {
        resources: [
          {
            id: 1,
            title: 'Test Resource',
            description: 'A test resource',
            category: { name: 'Funding' },
            resourceType: 'tool',
          },
        ],
      },
    };

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockSuggestions,
    });

    render(<ResourceSearch onSearch={mockOnSearch} showSuggestions={true} />);

    const input = screen.getByLabelText('Search resources');
    fireEvent.change(input, { target: { value: 'test' } });

    await waitFor(() => {
      expect(screen.getByText('Test Resource')).toBeInTheDocument();
    });

    fireEvent.keyDown(input, { key: 'Escape' });

    await waitFor(() => {
      expect(screen.queryByText('Test Resource')).not.toBeInTheDocument();
    });
  });

  it('shows loading indicator while fetching suggestions', async () => {
    (global.fetch as any).mockImplementation(() => 
      new Promise(resolve => setTimeout(() => resolve({
        ok: true,
        json: async () => ({ success: true, data: { resources: [] } }),
      }), 100))
    );

    render(<ResourceSearch onSearch={mockOnSearch} showSuggestions={true} />);

    const input = screen.getByLabelText('Search resources');
    fireEvent.change(input, { target: { value: 'test' } });

    // Should show loading indicator
    await waitFor(() => {
      const loader = document.querySelector('.animate-spin');
      expect(loader).toBeInTheDocument();
    });
  });

  it('shows no results message when no suggestions found', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, data: { resources: [] } }),
    });

    render(<ResourceSearch onSearch={mockOnSearch} showSuggestions={true} />);

    const input = screen.getByLabelText('Search resources');
    fireEvent.change(input, { target: { value: 'nonexistent' } });

    await waitFor(() => {
      expect(screen.getByText(/no resources found/i)).toBeInTheDocument();
    });
  });

  it('does not fetch suggestions for queries shorter than 2 characters', () => {
    render(<ResourceSearch onSearch={mockOnSearch} showSuggestions={true} />);

    const input = screen.getByLabelText('Search resources');
    fireEvent.change(input, { target: { value: 'a' } });

    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('sets initial value from prop', () => {
    render(
      <ResourceSearch 
        onSearch={mockOnSearch} 
        initialValue="initial query"
      />
    );

    const input = screen.getByLabelText('Search resources');
    expect(input).toHaveValue('initial query');
  });

  it('disables search button when input is empty', () => {
    render(<ResourceSearch onSearch={mockOnSearch} />);

    const searchButton = screen.getByRole('button', { name: /search/i });
    expect(searchButton).toBeDisabled();
  });
});
