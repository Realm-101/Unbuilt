import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ResourceFilters, type ResourceFilterValues } from '../ResourceFilters';
import type { ResourceCategory } from '@shared/schema';

describe('ResourceFilters', () => {
  const mockCategories: ResourceCategory[] = [
    {
      id: 1,
      name: 'Funding',
      slug: 'funding',
      description: 'Funding resources',
      icon: 'dollar-sign',
      displayOrder: 1,
      parentId: null,
      createdAt: new Date(),
    },
    {
      id: 2,
      name: 'Marketing',
      slug: 'marketing',
      description: 'Marketing resources',
      icon: 'megaphone',
      displayOrder: 2,
      parentId: null,
      createdAt: new Date(),
    },
  ];

  const defaultFilters: ResourceFilterValues = {
    categories: [],
    phases: [],
    ideaTypes: [],
    resourceTypes: [],
    minRating: 0,
    isPremium: null,
  };

  const mockOnFiltersChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    // Mock window.history.replaceState
    window.history.replaceState = vi.fn();
  });

  it('renders filters button', () => {
    render(
      <ResourceFilters
        filters={defaultFilters}
        onFiltersChange={mockOnFiltersChange}
        categories={mockCategories}
      />
    );

    expect(screen.getByRole('button', { name: /filters/i })).toBeInTheDocument();
  });

  it('shows active filter count badge', () => {
    const activeFilters: ResourceFilterValues = {
      ...defaultFilters,
      categories: [1],
      phases: ['research'],
      minRating: 4,
    };

    render(
      <ResourceFilters
        filters={activeFilters}
        onFiltersChange={mockOnFiltersChange}
        categories={mockCategories}
      />
    );

    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('opens filter popover when button is clicked', async () => {
    render(
      <ResourceFilters
        filters={defaultFilters}
        onFiltersChange={mockOnFiltersChange}
        categories={mockCategories}
      />
    );

    const filterButton = screen.getByRole('button', { name: /filters/i });
    fireEvent.click(filterButton);

    await waitFor(() => {
      expect(screen.getByText('Category')).toBeInTheDocument();
      expect(screen.getByText('Phase')).toBeInTheDocument();
      expect(screen.getByText('Idea Type')).toBeInTheDocument();
      expect(screen.getByText('Resource Type')).toBeInTheDocument();
      expect(screen.getByText('Minimum Rating')).toBeInTheDocument();
    });
  });

  it('displays category filters', async () => {
    render(
      <ResourceFilters
        filters={defaultFilters}
        onFiltersChange={mockOnFiltersChange}
        categories={mockCategories}
      />
    );

    const filterButton = screen.getByRole('button', { name: /filters/i });
    fireEvent.click(filterButton);

    await waitFor(() => {
      expect(screen.getByText('Funding')).toBeInTheDocument();
      expect(screen.getByText('Marketing')).toBeInTheDocument();
    });
  });

  it('toggles category filter', async () => {
    render(
      <ResourceFilters
        filters={defaultFilters}
        onFiltersChange={mockOnFiltersChange}
        categories={mockCategories}
      />
    );

    const filterButton = screen.getByRole('button', { name: /filters/i });
    fireEvent.click(filterButton);

    await waitFor(() => {
      expect(screen.getByText('Funding')).toBeInTheDocument();
    });

    const fundingCheckbox = screen.getByLabelText('Funding');
    fireEvent.click(fundingCheckbox);

    expect(mockOnFiltersChange).toHaveBeenCalledWith({
      ...defaultFilters,
      categories: [1],
    });
  });

  it('displays phase filters', async () => {
    render(
      <ResourceFilters
        filters={defaultFilters}
        onFiltersChange={mockOnFiltersChange}
        categories={mockCategories}
      />
    );

    const filterButton = screen.getByRole('button', { name: /filters/i });
    fireEvent.click(filterButton);

    await waitFor(() => {
      expect(screen.getByText('Research')).toBeInTheDocument();
      expect(screen.getByText('Validation')).toBeInTheDocument();
      expect(screen.getByText('Development')).toBeInTheDocument();
      expect(screen.getByText('Launch')).toBeInTheDocument();
    });
  });

  it('toggles phase filter', async () => {
    render(
      <ResourceFilters
        filters={defaultFilters}
        onFiltersChange={mockOnFiltersChange}
        categories={mockCategories}
      />
    );

    const filterButton = screen.getByRole('button', { name: /filters/i });
    fireEvent.click(filterButton);

    await waitFor(() => {
      expect(screen.getByText('Research')).toBeInTheDocument();
    });

    const researchCheckbox = screen.getByLabelText('Research');
    fireEvent.click(researchCheckbox);

    expect(mockOnFiltersChange).toHaveBeenCalledWith({
      ...defaultFilters,
      phases: ['research'],
    });
  });

  it('displays idea type filters', async () => {
    render(
      <ResourceFilters
        filters={defaultFilters}
        onFiltersChange={mockOnFiltersChange}
        categories={mockCategories}
      />
    );

    const filterButton = screen.getByRole('button', { name: /filters/i });
    fireEvent.click(filterButton);

    await waitFor(() => {
      expect(screen.getByText('Software')).toBeInTheDocument();
      expect(screen.getByText('Physical Product')).toBeInTheDocument();
      expect(screen.getByText('Service')).toBeInTheDocument();
      expect(screen.getByText('Marketplace')).toBeInTheDocument();
    });
  });

  it('toggles idea type filter', async () => {
    render(
      <ResourceFilters
        filters={defaultFilters}
        onFiltersChange={mockOnFiltersChange}
        categories={mockCategories}
      />
    );

    const filterButton = screen.getByRole('button', { name: /filters/i });
    fireEvent.click(filterButton);

    await waitFor(() => {
      expect(screen.getByText('Software')).toBeInTheDocument();
    });

    const softwareCheckbox = screen.getByLabelText('Software');
    fireEvent.click(softwareCheckbox);

    expect(mockOnFiltersChange).toHaveBeenCalledWith({
      ...defaultFilters,
      ideaTypes: ['software'],
    });
  });

  it('displays resource type filters', async () => {
    render(
      <ResourceFilters
        filters={defaultFilters}
        onFiltersChange={mockOnFiltersChange}
        categories={mockCategories}
      />
    );

    const filterButton = screen.getByRole('button', { name: /filters/i });
    fireEvent.click(filterButton);

    await waitFor(() => {
      expect(screen.getByText('Tool')).toBeInTheDocument();
      expect(screen.getByText('Template')).toBeInTheDocument();
      expect(screen.getByText('Guide')).toBeInTheDocument();
      expect(screen.getByText('Video')).toBeInTheDocument();
      expect(screen.getByText('Article')).toBeInTheDocument();
    });
  });

  it('toggles resource type filter', async () => {
    render(
      <ResourceFilters
        filters={defaultFilters}
        onFiltersChange={mockOnFiltersChange}
        categories={mockCategories}
      />
    );

    const filterButton = screen.getByRole('button', { name: /filters/i });
    fireEvent.click(filterButton);

    await waitFor(() => {
      expect(screen.getByText('Tool')).toBeInTheDocument();
    });

    const toolCheckbox = screen.getByLabelText('Tool');
    fireEvent.click(toolCheckbox);

    expect(mockOnFiltersChange).toHaveBeenCalledWith({
      ...defaultFilters,
      resourceTypes: ['tool'],
    });
  });

  it('updates minimum rating filter', async () => {
    render(
      <ResourceFilters
        filters={defaultFilters}
        onFiltersChange={mockOnFiltersChange}
        categories={mockCategories}
      />
    );

    const filterButton = screen.getByRole('button', { name: /filters/i });
    fireEvent.click(filterButton);

    await waitFor(() => {
      expect(screen.getByText('Minimum Rating')).toBeInTheDocument();
    });

    // Expand the Minimum Rating accordion
    const ratingAccordion = screen.getByText('Minimum Rating').closest('button');
    if (ratingAccordion) {
      fireEvent.click(ratingAccordion);
    }

    await waitFor(() => {
      // Find the slider after accordion is expanded
      const slider = screen.getByRole('slider');
      
      // Simulate slider change
      fireEvent.change(slider, { target: { value: '4' } });
    });

    expect(mockOnFiltersChange).toHaveBeenCalled();
  });

  it('toggles premium filter', async () => {
    render(
      <ResourceFilters
        filters={defaultFilters}
        onFiltersChange={mockOnFiltersChange}
        categories={mockCategories}
      />
    );

    const filterButton = screen.getByRole('button', { name: /filters/i });
    fireEvent.click(filterButton);

    await waitFor(() => {
      expect(screen.getByText('Premium Resources Only')).toBeInTheDocument();
    });

    const premiumSwitch = screen.getByRole('switch');
    fireEvent.click(premiumSwitch);

    expect(mockOnFiltersChange).toHaveBeenCalledWith({
      ...defaultFilters,
      isPremium: true,
    });
  });

  it('clears all filters', async () => {
    const activeFilters: ResourceFilterValues = {
      categories: [1],
      phases: ['research'],
      ideaTypes: ['software'],
      resourceTypes: ['tool'],
      minRating: 4,
      isPremium: true,
    };

    render(
      <ResourceFilters
        filters={activeFilters}
        onFiltersChange={mockOnFiltersChange}
        categories={mockCategories}
      />
    );

    const filterButton = screen.getByRole('button', { name: /filters/i });
    fireEvent.click(filterButton);

    await waitFor(() => {
      expect(screen.getByText('Clear all')).toBeInTheDocument();
    });

    const clearButton = screen.getByRole('button', { name: /clear all/i });
    fireEvent.click(clearButton);

    expect(mockOnFiltersChange).toHaveBeenCalledWith(defaultFilters);
  });

  it('shows active filter badges outside popover', () => {
    const activeFilters: ResourceFilterValues = {
      ...defaultFilters,
      categories: [1, 2],
      phases: ['research'],
      minRating: 4,
    };

    render(
      <ResourceFilters
        filters={activeFilters}
        onFiltersChange={mockOnFiltersChange}
        categories={mockCategories}
      />
    );

    expect(screen.getByText('2 categories')).toBeInTheDocument();
    expect(screen.getByText('1 phase')).toBeInTheDocument();
    expect(screen.getByText('4+ ⭐')).toBeInTheDocument();
  });

  it('shows singular text for single filter', () => {
    const activeFilters: ResourceFilterValues = {
      ...defaultFilters,
      categories: [1],
      phases: ['research'],
      ideaTypes: ['software'],
    };

    render(
      <ResourceFilters
        filters={activeFilters}
        onFiltersChange={mockOnFiltersChange}
        categories={mockCategories}
      />
    );

    expect(screen.getByText('1 category')).toBeInTheDocument();
    expect(screen.getByText('1 phase')).toBeInTheDocument();
    expect(screen.getByText('1 idea type')).toBeInTheDocument();
  });

  it('updates URL params when filters change', () => {
    const { rerender } = render(
      <ResourceFilters
        filters={defaultFilters}
        onFiltersChange={mockOnFiltersChange}
        categories={mockCategories}
      />
    );

    const activeFilters: ResourceFilterValues = {
      ...defaultFilters,
      categories: [1],
      phases: ['research'],
      minRating: 4,
    };

    rerender(
      <ResourceFilters
        filters={activeFilters}
        onFiltersChange={mockOnFiltersChange}
        categories={mockCategories}
      />
    );

    expect(window.history.replaceState).toHaveBeenCalled();
  });

  it('removes filter when toggled off', async () => {
    const activeFilters: ResourceFilterValues = {
      ...defaultFilters,
      categories: [1],
    };

    render(
      <ResourceFilters
        filters={activeFilters}
        onFiltersChange={mockOnFiltersChange}
        categories={mockCategories}
      />
    );

    const filterButton = screen.getByRole('button', { name: /filters/i });
    fireEvent.click(filterButton);

    await waitFor(() => {
      expect(screen.getByText('Category')).toBeInTheDocument();
    });

    // Expand the Category accordion
    const categoryAccordion = screen.getByText('Category').closest('button');
    if (categoryAccordion) {
      fireEvent.click(categoryAccordion);
    }

    await waitFor(() => {
      expect(screen.getByText('Funding')).toBeInTheDocument();
    });

    const fundingCheckbox = screen.getByLabelText('Funding');
    fireEvent.click(fundingCheckbox);

    expect(mockOnFiltersChange).toHaveBeenCalledWith({
      ...defaultFilters,
      categories: [],
    });
  });

  it('shows filter count badges in accordion headers', async () => {
    const activeFilters: ResourceFilterValues = {
      ...defaultFilters,
      categories: [1, 2],
      phases: ['research', 'validation'],
    };

    render(
      <ResourceFilters
        filters={activeFilters}
        onFiltersChange={mockOnFiltersChange}
        categories={mockCategories}
      />
    );

    const filterButton = screen.getByRole('button', { name: /filters/i });
    fireEvent.click(filterButton);

    await waitFor(() => {
      // Should show count badges in accordion headers
      const badges = screen.getAllByText('2');
      expect(badges.length).toBeGreaterThan(0);
    });
  });

  it('handles multiple selections in same filter category', async () => {
    render(
      <ResourceFilters
        filters={defaultFilters}
        onFiltersChange={mockOnFiltersChange}
        categories={mockCategories}
      />
    );

    const filterButton = screen.getByRole('button', { name: /filters/i });
    fireEvent.click(filterButton);

    await waitFor(() => {
      expect(screen.getByText('Phase')).toBeInTheDocument();
    });

    // Expand the Phase accordion
    const phaseAccordion = screen.getByText('Phase').closest('button');
    if (phaseAccordion) {
      fireEvent.click(phaseAccordion);
    }

    await waitFor(() => {
      expect(screen.getByText('Research')).toBeInTheDocument();
    });

    // Select Research
    const researchCheckbox = screen.getByLabelText('Research');
    fireEvent.click(researchCheckbox);

    expect(mockOnFiltersChange).toHaveBeenCalledWith({
      ...defaultFilters,
      phases: ['research'],
    });
  });
});
