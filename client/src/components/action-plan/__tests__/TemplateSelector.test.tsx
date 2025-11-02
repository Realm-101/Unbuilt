import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TemplateSelector } from '../TemplateSelector';
import type { PlanTemplate } from '@shared/schema';

// Mock fetch
global.fetch = vi.fn();

const mockTemplates: PlanTemplate[] = [
  {
    id: 1,
    name: 'Software Startup',
    description: 'Optimized for SaaS and software products',
    category: 'software',
    icon: 'code',
    isDefault: true,
    isActive: true,
    phases: [
      {
        name: 'Research & Validation',
        description: 'Validate market need',
        order: 1,
        estimatedDuration: '3-4 weeks',
        tasks: [
          {
            title: 'Conduct user interviews',
            description: 'Interview potential users',
            estimatedTime: '2 weeks',
            resources: [],
            order: 1,
          },
          {
            title: 'Analyze competitors',
            description: 'Research existing solutions',
            estimatedTime: '1 week',
            resources: [],
            order: 2,
          },
        ],
      },
      {
        name: 'MVP Development',
        description: 'Build minimum viable product',
        order: 2,
        estimatedDuration: '8-12 weeks',
        tasks: [
          {
            title: 'Set up development environment',
            description: 'Configure tools',
            estimatedTime: '3 days',
            resources: [],
            order: 1,
          },
        ],
      },
    ],
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
  },
  {
    id: 2,
    name: 'Physical Product',
    description: 'For hardware and physical goods',
    category: 'physical',
    icon: 'package',
    isDefault: false,
    isActive: true,
    phases: [
      {
        name: 'Product Design',
        description: 'Design the product',
        order: 1,
        estimatedDuration: '4-6 weeks',
        tasks: [
          {
            title: 'Create prototypes',
            description: 'Build initial prototypes',
            estimatedTime: '2 weeks',
            resources: [],
            order: 1,
          },
        ],
      },
    ],
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
  },
  {
    id: 3,
    name: 'Service Business',
    description: 'For service-based businesses',
    category: 'service',
    icon: 'briefcase',
    isDefault: false,
    isActive: true,
    phases: [
      {
        name: 'Service Definition',
        description: 'Define your service offering',
        order: 1,
        estimatedDuration: '2-3 weeks',
        tasks: [
          {
            title: 'Define service packages',
            description: 'Create service tiers',
            estimatedTime: '1 week',
            resources: [],
            order: 1,
          },
        ],
      },
    ],
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
  },
];

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
  
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}

describe('TemplateSelector', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: mockTemplates }),
    });
  });

  it('should render loading state initially', () => {
    const onSelect = vi.fn();
    render(<TemplateSelector onSelect={onSelect} />, { wrapper: createWrapper() });
    
    expect(screen.getByText('Loading templates...')).toBeInTheDocument();
  });

  it('should display all templates after loading', async () => {
    const onSelect = vi.fn();
    render(<TemplateSelector onSelect={onSelect} />, { wrapper: createWrapper() });
    
    await waitFor(() => {
      expect(screen.getByText('Software Startup')).toBeInTheDocument();
    });
    
    expect(screen.getByText('Physical Product')).toBeInTheDocument();
    expect(screen.getByText('Service Business')).toBeInTheDocument();
  });

  it('should show default badge for default template', async () => {
    const onSelect = vi.fn();
    render(<TemplateSelector onSelect={onSelect} />, { wrapper: createWrapper() });
    
    await waitFor(() => {
      expect(screen.getByText('Default')).toBeInTheDocument();
    });
  });

  it('should display template descriptions', async () => {
    const onSelect = vi.fn();
    render(<TemplateSelector onSelect={onSelect} />, { wrapper: createWrapper() });
    
    await waitFor(() => {
      expect(screen.getByText('Optimized for SaaS and software products')).toBeInTheDocument();
    });
    
    expect(screen.getByText('For hardware and physical goods')).toBeInTheDocument();
    expect(screen.getByText('For service-based businesses')).toBeInTheDocument();
  });

  it('should display phase information', async () => {
    const onSelect = vi.fn();
    render(<TemplateSelector onSelect={onSelect} />, { wrapper: createWrapper() });
    
    await waitFor(() => {
      expect(screen.getByText('Research & Validation')).toBeInTheDocument();
    });
    
    expect(screen.getByText('2 tasks • 3-4 weeks')).toBeInTheDocument();
  });

  it('should display sample tasks', async () => {
    const onSelect = vi.fn();
    render(<TemplateSelector onSelect={onSelect} />, { wrapper: createWrapper() });
    
    await waitFor(() => {
      expect(screen.getByText('Conduct user interviews')).toBeInTheDocument();
    });
    
    expect(screen.getByText('Analyze competitors')).toBeInTheDocument();
  });

  it('should allow selecting a template', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<TemplateSelector onSelect={onSelect} />, { wrapper: createWrapper() });
    
    await waitFor(() => {
      expect(screen.getByText('Software Startup')).toBeInTheDocument();
    });
    
    // Click on a template card
    const templateCard = screen.getByText('Software Startup').closest('.flame-card');
    await user.click(templateCard!);
    
    // Should show selected state
    await waitFor(() => {
      expect(screen.getByText('Selected:')).toBeInTheDocument();
      expect(screen.getByText('Software Startup', { selector: 'span' })).toBeInTheDocument();
    });
  });

  it('should call onSelect when confirm button is clicked', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<TemplateSelector onSelect={onSelect} />, { wrapper: createWrapper() });
    
    await waitFor(() => {
      expect(screen.getByText('Software Startup')).toBeInTheDocument();
    });
    
    // Select a template
    const templateCard = screen.getByText('Physical Product').closest('.flame-card');
    await user.click(templateCard!);
    
    // Click confirm button
    const confirmButton = screen.getByRole('button', { name: /use template/i });
    await user.click(confirmButton);
    
    expect(onSelect).toHaveBeenCalledWith(2);
  });

  it('should disable confirm button when no template is selected', async () => {
    const onSelect = vi.fn();
    render(<TemplateSelector onSelect={onSelect} />, { wrapper: createWrapper() });
    
    await waitFor(() => {
      expect(screen.getByText('Software Startup')).toBeInTheDocument();
    });
    
    const confirmButton = screen.getByRole('button', { name: /use template/i });
    expect(confirmButton).toBeDisabled();
  });

  it('should show category filters when multiple categories exist', async () => {
    const onSelect = vi.fn();
    render(<TemplateSelector onSelect={onSelect} />, { wrapper: createWrapper() });
    
    await waitFor(() => {
      expect(screen.getByText('All Templates')).toBeInTheDocument();
    });
    
    expect(screen.getByText('software')).toBeInTheDocument();
    expect(screen.getByText('physical')).toBeInTheDocument();
    expect(screen.getByText('service')).toBeInTheDocument();
  });

  it('should filter templates by category', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    
    // Mock fetch to return filtered results
    (global.fetch as any).mockImplementation((url: string) => {
      if (url.includes('category=software')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ 
            success: true, 
            data: mockTemplates.filter(t => t.category === 'software') 
          }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({ success: true, data: mockTemplates }),
      });
    });
    
    render(<TemplateSelector onSelect={onSelect} />, { wrapper: createWrapper() });
    
    await waitFor(() => {
      expect(screen.getByText('Software Startup')).toBeInTheDocument();
    });
    
    // Click on software category
    const softwareTab = screen.getByText('software');
    await user.click(softwareTab);
    
    // Should fetch filtered templates
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('category=software'),
        expect.any(Object)
      );
    });
  });

  it('should show cancel button when onCancel is provided', async () => {
    const onSelect = vi.fn();
    const onCancel = vi.fn();
    render(
      <TemplateSelector onSelect={onSelect} onCancel={onCancel} />,
      { wrapper: createWrapper() }
    );
    
    await waitFor(() => {
      expect(screen.getByText('Software Startup')).toBeInTheDocument();
    });
    
    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    expect(cancelButton).toBeInTheDocument();
  });

  it('should call onCancel when cancel button is clicked', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    const onCancel = vi.fn();
    render(
      <TemplateSelector onSelect={onSelect} onCancel={onCancel} />,
      { wrapper: createWrapper() }
    );
    
    await waitFor(() => {
      expect(screen.getByText('Software Startup')).toBeInTheDocument();
    });
    
    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    await user.click(cancelButton);
    
    expect(onCancel).toHaveBeenCalled();
  });

  it('should pre-select current template if provided', async () => {
    const onSelect = vi.fn();
    render(
      <TemplateSelector onSelect={onSelect} currentTemplateId={2} />,
      { wrapper: createWrapper() }
    );
    
    await waitFor(() => {
      expect(screen.getByText('Selected:')).toBeInTheDocument();
    });
    
    expect(screen.getByText('Physical Product', { selector: 'span' })).toBeInTheDocument();
  });

  it('should handle fetch error gracefully', async () => {
    (global.fetch as any).mockRejectedValue(new Error('Network error'));
    
    const onSelect = vi.fn();
    render(<TemplateSelector onSelect={onSelect} />, { wrapper: createWrapper() });
    
    await waitFor(() => {
      expect(screen.getByText(/failed to load templates/i)).toBeInTheDocument();
    });
  });

  it('should handle empty templates list', async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: [] }),
    });
    
    const onSelect = vi.fn();
    render(<TemplateSelector onSelect={onSelect} />, { wrapper: createWrapper() });
    
    await waitFor(() => {
      expect(screen.getByText(/no templates available/i)).toBeInTheDocument();
    });
  });

  it('should show visual feedback for selected template', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<TemplateSelector onSelect={onSelect} />, { wrapper: createWrapper() });
    
    await waitFor(() => {
      expect(screen.getByText('Software Startup')).toBeInTheDocument();
    });
    
    const templateCard = screen.getByText('Service Business').closest('.flame-card');
    await user.click(templateCard!);
    
    // Should have selected styling
    await waitFor(() => {
      expect(templateCard).toHaveClass('ring-2', 'ring-purple-500');
    });
  });
});
