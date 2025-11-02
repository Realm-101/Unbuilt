import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ResourceRating } from '../ResourceRating';

// Mock hooks
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

// Mock fetch
global.fetch = vi.fn();

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

describe('ResourceRating', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders average rating display', () => {
    render(
      <ResourceRating
        resourceId={1}
        averageRating={4.5}
        ratingCount={10}
      />,
      { wrapper: createWrapper() }
    );

    expect(screen.getByText('4.5 (10 ratings)')).toBeInTheDocument();
  });

  it('shows singular "rating" for count of 1', () => {
    render(
      <ResourceRating
        resourceId={1}
        averageRating={5.0}
        ratingCount={1}
      />,
      { wrapper: createWrapper() }
    );

    expect(screen.getByText('5.0 (1 rating)')).toBeInTheDocument();
  });

  it('renders interactive star rating input', () => {
    render(
      <ResourceRating
        resourceId={1}
        averageRating={4.0}
        ratingCount={5}
      />,
      { wrapper: createWrapper() }
    );

    expect(screen.getByText('Rate this resource')).toBeInTheDocument();
    
    // Should have 5 clickable stars
    const stars = screen.getAllByRole('button').filter(btn => 
      btn.querySelector('svg')
    );
    expect(stars).toHaveLength(5);
  });

  it('highlights stars on hover', () => {
    render(
      <ResourceRating
        resourceId={1}
        averageRating={4.0}
        ratingCount={5}
      />,
      { wrapper: createWrapper() }
    );

    const stars = screen.getAllByRole('button').filter(btn => 
      btn.querySelector('svg')
    );
    
    // Hover over third star
    fireEvent.mouseEnter(stars[2]);
    
    // First 3 stars should be highlighted
    const starIcons = stars.slice(0, 3).map(star => star.querySelector('svg'));
    starIcons.forEach(icon => {
      expect(icon).toHaveClass('fill-yellow-400', 'text-yellow-400');
    });
  });

  it('selects rating on star click', async () => {
    render(
      <ResourceRating
        resourceId={1}
        averageRating={4.0}
        ratingCount={5}
      />,
      { wrapper: createWrapper() }
    );

    const stars = screen.getAllByRole('button').filter(btn => 
      btn.querySelector('svg')
    );
    
    // Click fourth star
    fireEvent.click(stars[3]);
    
    await waitFor(() => {
      expect(screen.getByText('4 stars')).toBeInTheDocument();
    });
  });

  it('shows review textarea', () => {
    render(
      <ResourceRating
        resourceId={1}
        averageRating={4.0}
        ratingCount={5}
      />,
      { wrapper: createWrapper() }
    );

    expect(screen.getByLabelText('Review (optional)')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Share your experience with this resource...')).toBeInTheDocument();
  });

  it('shows character count for review', () => {
    render(
      <ResourceRating
        resourceId={1}
        averageRating={4.0}
        ratingCount={5}
      />,
      { wrapper: createWrapper() }
    );

    const textarea = screen.getByLabelText('Review (optional)');
    fireEvent.change(textarea, { target: { value: 'Great resource!' } });

    expect(screen.getByText('15/2000 characters')).toBeInTheDocument();
  });

  it('submits rating without review', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true }),
    });

    render(
      <ResourceRating
        resourceId={1}
        averageRating={4.0}
        ratingCount={5}
      />,
      { wrapper: createWrapper() }
    );

    // Select 5 stars
    const stars = screen.getAllByRole('button').filter(btn => 
      btn.querySelector('svg')
    );
    fireEvent.click(stars[4]);

    // Submit
    const submitButton = screen.getByRole('button', { name: /submit rating/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/resources/1/ratings',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ rating: 5 }),
        })
      );
    });
  });

  it('submits rating with review', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true }),
    });

    render(
      <ResourceRating
        resourceId={1}
        averageRating={4.0}
        ratingCount={5}
      />,
      { wrapper: createWrapper() }
    );

    // Select 4 stars
    const stars = screen.getAllByRole('button').filter(btn => 
      btn.querySelector('svg')
    );
    fireEvent.click(stars[3]);

    // Add review
    const textarea = screen.getByLabelText('Review (optional)');
    fireEvent.change(textarea, { target: { value: 'Very helpful resource!' } });

    // Submit
    const submitButton = screen.getByRole('button', { name: /submit rating/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/resources/1/ratings',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ 
            rating: 4,
            review: 'Very helpful resource!'
          }),
        })
      );
    });
  });

  it('shows error when submitting without rating', () => {
    render(
      <ResourceRating
        resourceId={1}
        averageRating={4.0}
        ratingCount={5}
      />,
      { wrapper: createWrapper() }
    );

    const submitButton = screen.getByRole('button', { name: /submit rating/i });
    fireEvent.click(submitButton);

    // Should not call fetch
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('displays existing user rating', () => {
    render(
      <ResourceRating
        resourceId={1}
        currentUserRating={{
          id: 1,
          rating: 4,
          review: 'Great resource!',
        }}
        averageRating={4.0}
        ratingCount={5}
      />,
      { wrapper: createWrapper() }
    );

    expect(screen.getByText('Your Rating')).toBeInTheDocument();
    expect(screen.getByText('4 stars')).toBeInTheDocument();
    expect(screen.getByText('Great resource!')).toBeInTheDocument();
  });

  it('allows editing existing rating', async () => {
    render(
      <ResourceRating
        resourceId={1}
        currentUserRating={{
          id: 1,
          rating: 4,
          review: 'Great resource!',
        }}
        averageRating={4.0}
        ratingCount={5}
      />,
      { wrapper: createWrapper() }
    );

    const editButton = screen.getByRole('button', { name: /edit/i });
    fireEvent.click(editButton);

    // Should show editable form
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /update rating/i })).toBeInTheDocument();
    });
  });

  it('updates existing rating', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true }),
    });

    render(
      <ResourceRating
        resourceId={1}
        currentUserRating={{
          id: 1,
          rating: 4,
          review: 'Great resource!',
        }}
        averageRating={4.0}
        ratingCount={5}
      />,
      { wrapper: createWrapper() }
    );

    // Edit
    const editButton = screen.getByRole('button', { name: /edit/i });
    fireEvent.click(editButton);

    // Change rating to 5 stars
    const stars = screen.getAllByRole('button').filter(btn => 
      btn.querySelector('svg')
    );
    fireEvent.click(stars[4]);

    // Update
    const updateButton = screen.getByRole('button', { name: /update rating/i });
    fireEvent.click(updateButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/resources/ratings/1',
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify({ rating: 5 }),
        })
      );
    });
  });

  it('cancels editing', async () => {
    render(
      <ResourceRating
        resourceId={1}
        currentUserRating={{
          id: 1,
          rating: 4,
          review: 'Great resource!',
        }}
        averageRating={4.0}
        ratingCount={5}
      />,
      { wrapper: createWrapper() }
    );

    // Edit
    const editButton = screen.getByRole('button', { name: /edit/i });
    fireEvent.click(editButton);

    // Cancel
    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    fireEvent.click(cancelButton);

    // Should return to display mode
    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /update rating/i })).not.toBeInTheDocument();
      expect(screen.getByText('4 stars')).toBeInTheDocument();
    });
  });

  it('disables submit button while submitting', async () => {
    (global.fetch as any).mockImplementation(() => 
      new Promise(resolve => setTimeout(() => resolve({
        ok: true,
        json: async () => ({ success: true }),
      }), 100))
    );

    render(
      <ResourceRating
        resourceId={1}
        averageRating={4.0}
        ratingCount={5}
      />,
      { wrapper: createWrapper() }
    );

    // Select rating
    const stars = screen.getAllByRole('button').filter(btn => 
      btn.querySelector('svg')
    );
    fireEvent.click(stars[4]);

    // Submit
    const submitButton = screen.getByRole('button', { name: /submit rating/i });
    fireEvent.click(submitButton);

    // Wait for button to show submitting state
    await waitFor(() => {
      expect(submitButton).toHaveTextContent('Submitting...');
    }, { timeout: 100 });
  });

  it('calls onRatingSubmit callback after successful submission', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true }),
    });

    const onRatingSubmit = vi.fn();

    render(
      <ResourceRating
        resourceId={1}
        averageRating={4.0}
        ratingCount={5}
        onRatingSubmit={onRatingSubmit}
      />,
      { wrapper: createWrapper() }
    );

    // Select and submit
    const stars = screen.getAllByRole('button').filter(btn => 
      btn.querySelector('svg')
    );
    fireEvent.click(stars[4]);

    const submitButton = screen.getByRole('button', { name: /submit rating/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(onRatingSubmit).toHaveBeenCalled();
    });
  });
});
