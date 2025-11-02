import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ResourceCard } from '../ResourceCard';
import type { Resource, ResourceCategory, ResourceTag } from '@shared/schema';

// Mock hooks
vi.mock('@/hooks/useTouchFriendly', () => ({
  useTouchFriendly: () => ({ isTouchDevice: false }),
}));

vi.mock('@/hooks/useResourceTracking', () => ({
  useResourceTracking: () => ({
    trackExternalLink: vi.fn(),
    trackDownload: vi.fn(),
  }),
}));

// Mock window.open
const mockWindowOpen = vi.fn();
window.open = mockWindowOpen;

describe('ResourceCard', () => {
  const mockCategory: ResourceCategory = {
    id: 1,
    name: 'Funding',
    slug: 'funding',
    description: 'Funding resources',
    icon: 'dollar-sign',
    displayOrder: 1,
    parentId: null,
    createdAt: new Date(),
  };

  const mockTags: ResourceTag[] = [
    { id: 1, name: 'startup', slug: 'startup', usageCount: 10 },
    { id: 2, name: 'pitch', slug: 'pitch', usageCount: 5 },
  ];

  const mockResource: Resource & { category?: ResourceCategory; tags?: ResourceTag[] } = {
    id: 1,
    title: 'Test Resource',
    description: 'This is a test resource description',
    url: 'https://example.com/resource',
    resourceType: 'tool',
    categoryId: 1,
    phaseRelevance: ['research', 'validation'],
    ideaTypes: ['software'],
    difficultyLevel: 'beginner',
    estimatedTimeMinutes: 30,
    isPremium: false,
    isActive: true,
    averageRating: 450, // 4.5 stars (stored as integer 0-500)
    ratingCount: 10,
    viewCount: 100,
    bookmarkCount: 5,
    metadata: {},
    createdBy: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
    category: mockCategory,
    tags: mockTags,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders resource card with basic information', () => {
    render(<ResourceCard resource={mockResource} />);

    expect(screen.getByText('Test Resource')).toBeInTheDocument();
    expect(screen.getByText('This is a test resource description')).toBeInTheDocument();
    expect(screen.getByText('Tool')).toBeInTheDocument();
    expect(screen.getByText('Funding')).toBeInTheDocument();
  });

  it('displays rating stars correctly', () => {
    render(<ResourceCard resource={mockResource} />);

    // Should show 4.5 rating
    expect(screen.getByText('4.5')).toBeInTheDocument();
    expect(screen.getByText('(10)')).toBeInTheDocument();
  });

  it('displays phase badges', () => {
    render(<ResourceCard resource={mockResource} />);

    expect(screen.getByText('research')).toBeInTheDocument();
    expect(screen.getByText('validation')).toBeInTheDocument();
  });

  it('displays view count and estimated time', () => {
    render(<ResourceCard resource={mockResource} />);

    expect(screen.getByText('100')).toBeInTheDocument();
    expect(screen.getByText('30m')).toBeInTheDocument();
  });

  it('shows premium badge for premium resources', () => {
    const premiumResource = { ...mockResource, isPremium: true };
    render(<ResourceCard resource={premiumResource} />);

    expect(screen.getByText('Pro')).toBeInTheDocument();
  });

  it('opens external link when View Resource button is clicked', async () => {
    render(<ResourceCard resource={mockResource} />);

    const viewButton = screen.getByRole('button', { name: /view resource/i });
    fireEvent.click(viewButton);

    await waitFor(() => {
      expect(mockWindowOpen).toHaveBeenCalledWith(
        'https://example.com/resource',
        '_blank',
        'noopener,noreferrer'
      );
    });
  });

  it('calls onView callback when provided', async () => {
    const onView = vi.fn();
    render(<ResourceCard resource={mockResource} onView={onView} />);

    const viewButton = screen.getByRole('button', { name: /view resource/i });
    fireEvent.click(viewButton);

    await waitFor(() => {
      expect(onView).toHaveBeenCalledWith(1);
    });
  });

  it('shows bookmark button when onBookmark is provided', () => {
    const onBookmark = vi.fn();
    render(<ResourceCard resource={mockResource} onBookmark={onBookmark} />);

    const bookmarkButton = screen.getByRole('button', { name: /add to bookmarks/i });
    expect(bookmarkButton).toBeInTheDocument();
  });

  it('shows Generate button for template resources', () => {
    const templateResource = { ...mockResource, resourceType: 'template' };
    render(<ResourceCard resource={templateResource} />);

    expect(screen.getByRole('button', { name: /generate/i })).toBeInTheDocument();
  });

  it('does not show Generate button for non-template resources', () => {
    render(<ResourceCard resource={mockResource} />);

    expect(screen.queryByRole('button', { name: /generate/i })).not.toBeInTheDocument();
  });

  it('applies hover effects on mouse enter', () => {
    const { container } = render(<ResourceCard resource={mockResource} />);

    const card = container.querySelector('[role="article"]');
    expect(card).toHaveClass('group');
  });

  it('handles resources with no ratings', () => {
    const noRatingResource = { ...mockResource, ratingCount: 0, averageRating: 0 };
    render(<ResourceCard resource={noRatingResource} />);

    // Rating section should not be displayed
    expect(screen.queryByText('0.0')).not.toBeInTheDocument();
  });

  it('limits phase badges to 3 and shows +N for additional phases', () => {
    const manyPhasesResource = {
      ...mockResource,
      phaseRelevance: ['research', 'validation', 'development', 'launch'],
    };
    render(<ResourceCard resource={manyPhasesResource} />);

    expect(screen.getByText('research')).toBeInTheDocument();
    expect(screen.getByText('validation')).toBeInTheDocument();
    expect(screen.getByText('development')).toBeInTheDocument();
    expect(screen.getByText('+1')).toBeInTheDocument();
  });

  it('has proper accessibility attributes', () => {
    render(<ResourceCard resource={mockResource} />);

    const card = screen.getByRole('article');
    expect(card).toHaveAttribute('aria-label', 'Resource: Test Resource');
  });
});
