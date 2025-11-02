import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BookmarkButton } from '../BookmarkButton';

// Mock hooks
vi.mock('@/hooks/useTouchFriendly', () => ({
  useTouchFriendly: () => ({ isTouchDevice: false }),
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

describe('BookmarkButton', () => {
  const mockOnToggle = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockOnToggle.mockResolvedValue(undefined);
  });

  it('renders bookmark button', () => {
    render(
      <BookmarkButton
        resourceId={1}
        isBookmarked={false}
        onToggle={mockOnToggle}
      />
    );

    const button = screen.getByRole('button', { name: /add to bookmarks/i });
    expect(button).toBeInTheDocument();
  });

  it('shows filled icon when bookmarked', () => {
    render(
      <BookmarkButton
        resourceId={1}
        isBookmarked={true}
        onToggle={mockOnToggle}
      />
    );

    const button = screen.getByRole('button', { name: /remove from bookmarks/i });
    expect(button).toBeInTheDocument();
    expect(button).toHaveAttribute('aria-pressed', 'true');
  });

  it('shows outline icon when not bookmarked', () => {
    render(
      <BookmarkButton
        resourceId={1}
        isBookmarked={false}
        onToggle={mockOnToggle}
      />
    );

    const button = screen.getByRole('button', { name: /add to bookmarks/i });
    expect(button).toHaveAttribute('aria-pressed', 'false');
  });

  it('calls onToggle when clicked', async () => {
    render(
      <BookmarkButton
        resourceId={1}
        isBookmarked={false}
        onToggle={mockOnToggle}
      />
    );

    const button = screen.getByRole('button', { name: /add to bookmarks/i });
    fireEvent.click(button);

    await waitFor(() => {
      expect(mockOnToggle).toHaveBeenCalledWith(1, true);
    });
  });

  it('performs optimistic update', async () => {
    const { rerender } = render(
      <BookmarkButton
        resourceId={1}
        isBookmarked={false}
        onToggle={mockOnToggle}
      />
    );

    const button = screen.getByRole('button', { name: /add to bookmarks/i });
    fireEvent.click(button);

    // Button should immediately show bookmarked state
    await waitFor(() => {
      expect(button).toHaveAttribute('aria-pressed', 'true');
    });
  });

  it('shows bookmark count when showCount is true', () => {
    render(
      <BookmarkButton
        resourceId={1}
        isBookmarked={false}
        bookmarkCount={5}
        showCount={true}
        onToggle={mockOnToggle}
      />
    );

    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('updates count optimistically when toggled', async () => {
    render(
      <BookmarkButton
        resourceId={1}
        isBookmarked={false}
        bookmarkCount={5}
        showCount={true}
        onToggle={mockOnToggle}
      />
    );

    const button = screen.getByRole('button');
    fireEvent.click(button);

    // Count should increase to 6
    await waitFor(() => {
      expect(screen.getByText('6')).toBeInTheDocument();
    });
  });

  it('decreases count when unbookmarking', async () => {
    render(
      <BookmarkButton
        resourceId={1}
        isBookmarked={true}
        bookmarkCount={5}
        showCount={true}
        onToggle={mockOnToggle}
      />
    );

    const button = screen.getByRole('button');
    fireEvent.click(button);

    // Count should decrease to 4
    await waitFor(() => {
      expect(screen.getByText('4')).toBeInTheDocument();
    });
  });

  it('reverts optimistic update on error', async () => {
    const mockOnToggleError = vi.fn().mockRejectedValue(new Error('Network error'));

    render(
      <BookmarkButton
        resourceId={1}
        isBookmarked={false}
        bookmarkCount={5}
        showCount={true}
        onToggle={mockOnToggleError}
      />
    );

    const button = screen.getByRole('button');
    fireEvent.click(button);

    // Should revert to original state after error
    await waitFor(() => {
      expect(screen.getByText('5')).toBeInTheDocument();
      expect(button).toHaveAttribute('aria-pressed', 'false');
    });
  });

  it('disables button when disabled prop is true', () => {
    render(
      <BookmarkButton
        resourceId={1}
        isBookmarked={false}
        onToggle={mockOnToggle}
        disabled={true}
      />
    );

    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
  });

  it('prevents multiple clicks while loading', async () => {
    let resolveToggle: () => void;
    const slowToggle = vi.fn(() => new Promise<void>((resolve) => {
      resolveToggle = resolve;
    }));

    render(
      <BookmarkButton
        resourceId={1}
        isBookmarked={false}
        onToggle={slowToggle}
      />
    );

    const button = screen.getByRole('button');
    
    // Click multiple times rapidly
    fireEvent.click(button);
    fireEvent.click(button);
    fireEvent.click(button);

    // Should only call once
    expect(slowToggle).toHaveBeenCalledTimes(1);

    // Resolve the promise
    resolveToggle!();
    await waitFor(() => {
      expect(button).not.toHaveClass('opacity-50');
    });
  });

  it('stops event propagation when clicked', () => {
    const parentClick = vi.fn();
    
    render(
      <div onClick={parentClick}>
        <BookmarkButton
          resourceId={1}
          isBookmarked={false}
          onToggle={mockOnToggle}
        />
      </div>
    );

    const button = screen.getByRole('button');
    fireEvent.click(button);

    // Parent click should not be called
    expect(parentClick).not.toHaveBeenCalled();
  });

  it('applies correct size classes', () => {
    const { rerender } = render(
      <BookmarkButton
        resourceId={1}
        isBookmarked={false}
        onToggle={mockOnToggle}
        size="sm"
      />
    );

    let button = screen.getByRole('button');
    expect(button).toHaveClass('h-7', 'w-7');

    rerender(
      <BookmarkButton
        resourceId={1}
        isBookmarked={false}
        onToggle={mockOnToggle}
        size="lg"
      />
    );

    button = screen.getByRole('button');
    expect(button).toHaveClass('h-10', 'w-10');
  });

  it('does not show count when count is 0', () => {
    render(
      <BookmarkButton
        resourceId={1}
        isBookmarked={false}
        bookmarkCount={0}
        showCount={true}
        onToggle={mockOnToggle}
      />
    );

    // Count should not be displayed
    expect(screen.queryByText('0')).not.toBeInTheDocument();
  });
});
