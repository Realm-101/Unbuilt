import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PhaseAccordion } from '../PhaseAccordion';
import { useActionPlanStore } from '@/stores/actionPlanStore';
import type { PlanPhaseWithTasks } from '@/types/action-plan';

// Mock the store
vi.mock('@/stores/actionPlanStore', () => ({
  useActionPlanStore: vi.fn(),
}));

// Mock the toast hook
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

// Mock the action plan hooks
vi.mock('@/hooks/useActionPlan', () => ({
  useUpdateTaskStatus: () => ({
    mutateAsync: vi.fn(),
  }),
  useDeleteTask: () => ({
    mutateAsync: vi.fn(),
  }),
  useReorderTasks: () => ({
    mutate: vi.fn(),
  }),
  useCreateTask: () => ({
    mutateAsync: vi.fn(),
  }),
  useUpdateTask: () => ({
    mutateAsync: vi.fn(),
  }),
}));

describe('PhaseAccordion', () => {
  const mockTogglePhase = vi.fn();
  let queryClient: QueryClient;
  
  const renderWithProviders = (ui: React.ReactElement) => {
    return render(
      <QueryClientProvider client={queryClient}>
        {ui}
      </QueryClientProvider>
    );
  };
  
  const mockPhase: PlanPhaseWithTasks = {
    id: 1,
    planId: 1,
    name: 'Research & Validation',
    description: 'Validate market need and technical feasibility',
    order: 1,
    estimatedDuration: '2 weeks',
    isCustom: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    tasks: [
      {
        id: 1,
        phaseId: 1,
        planId: 1,
        title: 'Conduct user interviews',
        description: 'Interview 20-30 potential users',
        estimatedTime: '2 weeks',
        resources: [],
        order: 1,
        status: 'completed',
        isCustom: false,
        assigneeId: null,
        completedAt: new Date().toISOString(),
        completedBy: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 2,
        phaseId: 1,
        planId: 1,
        title: 'Create technical architecture',
        description: 'Design system architecture',
        estimatedTime: '1 week',
        resources: [],
        order: 2,
        status: 'in_progress',
        isCustom: false,
        assigneeId: null,
        completedAt: null,
        completedBy: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 3,
        phaseId: 1,
        planId: 1,
        title: 'Build MVP prototype',
        description: 'Create initial prototype',
        estimatedTime: '3 weeks',
        resources: [],
        order: 3,
        status: 'not_started',
        isCustom: false,
        assigneeId: null,
        completedAt: null,
        completedBy: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ],
  };
  
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Create fresh QueryClient for each test
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    
    (useActionPlanStore as any).mockReturnValue({
      expandedPhases: new Set<number>(),
      togglePhase: mockTogglePhase,
    });
  });
  
  it('should render phase name and description when expanded', () => {
    (useActionPlanStore as any).mockReturnValue({
      expandedPhases: new Set([1]),
      togglePhase: mockTogglePhase,
    });
    
    renderWithProviders(<PhaseAccordion phase={mockPhase} planId={1} />);
    
    expect(screen.getByText('Research & Validation')).toBeInTheDocument();
    expect(screen.getByText('Validate market need and technical feasibility')).toBeInTheDocument();
  });
  
  it('should show progress indicator when collapsed', () => {
    renderWithProviders(<PhaseAccordion phase={mockPhase} planId={1} />);
    
    expect(screen.getByText('1 of 3 tasks completed')).toBeInTheDocument();
    expect(screen.getByText('33%')).toBeInTheDocument();
  });
  
  it('should toggle expansion when clicked', () => {
    renderWithProviders(<PhaseAccordion phase={mockPhase} planId={1} />);
    
    const trigger = screen.getByTestId('phase-accordion-trigger-1');
    fireEvent.click(trigger);
    
    expect(mockTogglePhase).toHaveBeenCalledWith(1);
  });
  
  it('should toggle expansion when Enter key is pressed', () => {
    renderWithProviders(<PhaseAccordion phase={mockPhase} planId={1} />);
    
    const trigger = screen.getByTestId('phase-accordion-trigger-1');
    fireEvent.keyDown(trigger, { key: 'Enter' });
    
    expect(mockTogglePhase).toHaveBeenCalledWith(1);
  });
  
  it('should toggle expansion when Space key is pressed', () => {
    renderWithProviders(<PhaseAccordion phase={mockPhase} planId={1} />);
    
    const trigger = screen.getByTestId('phase-accordion-trigger-1');
    fireEvent.keyDown(trigger, { key: ' ' });
    
    expect(mockTogglePhase).toHaveBeenCalledWith(1);
  });
  
  it('should show completed icon when all tasks are completed', () => {
    const completedPhase = {
      ...mockPhase,
      tasks: mockPhase.tasks.map(t => ({ ...t, status: 'completed' as const })),
    };
    
    renderWithProviders(<PhaseAccordion phase={completedPhase} planId={1} />);
    
    // Check for green checkmark icon
    const icon = screen.getByTestId('phase-accordion-trigger-1').querySelector('.text-green-500');
    expect(icon).toBeInTheDocument();
  });
  
  it('should show in-progress icon when some tasks are completed', () => {
    renderWithProviders(<PhaseAccordion phase={mockPhase} planId={1} />);
    
    // Check for orange clock icon
    const icon = screen.getByTestId('phase-accordion-trigger-1').querySelector('.text-orange-500');
    expect(icon).toBeInTheDocument();
  });
  
  it('should show not-started icon when no tasks are completed', () => {
    const notStartedPhase = {
      ...mockPhase,
      tasks: mockPhase.tasks.map(t => ({ ...t, status: 'not_started' as const })),
    };
    
    renderWithProviders(<PhaseAccordion phase={notStartedPhase} planId={1} />);
    
    // Check for gray circle icon
    const icon = screen.getByTestId('phase-accordion-trigger-1').querySelector('.text-gray-500');
    expect(icon).toBeInTheDocument();
  });
  
  it('should display estimated duration when expanded', () => {
    (useActionPlanStore as any).mockReturnValue({
      expandedPhases: new Set([1]),
      togglePhase: mockTogglePhase,
    });
    
    renderWithProviders(<PhaseAccordion phase={mockPhase} planId={1} />);
    
    expect(screen.getByText(/Estimated duration: 2 weeks/)).toBeInTheDocument();
  });
  
  it('should show correct progress percentage', () => {
    renderWithProviders(<PhaseAccordion phase={mockPhase} planId={1} />);
    
    // 1 of 3 tasks completed = 33%
    const progressBar = screen.getByRole('progressbar');
    expect(progressBar).toHaveAttribute('aria-valuenow', '33');
  });
  
  it('should handle phase with no tasks', () => {
    const emptyPhase = {
      ...mockPhase,
      tasks: [],
    };
    
    (useActionPlanStore as any).mockReturnValue({
      expandedPhases: new Set([1]),
      togglePhase: mockTogglePhase,
    });
    
    renderWithProviders(<PhaseAccordion phase={emptyPhase} planId={1} />);
    
    expect(screen.getByText('No tasks in this phase yet')).toBeInTheDocument();
  });
  
  it('should have proper ARIA attributes', () => {
    renderWithProviders(<PhaseAccordion phase={mockPhase} planId={1} />);
    
    const trigger = screen.getByTestId('phase-accordion-trigger-1');
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(trigger).toHaveAttribute('aria-controls', 'phase-content-1');
    
    const content = screen.getByTestId('phase-content-1');
    expect(content).toHaveAttribute('id', 'phase-content-1');
  });
  
  it('should update ARIA expanded state when toggled', () => {
    const { rerender } = renderWithProviders(<PhaseAccordion phase={mockPhase} planId={1} />);
    
    const trigger = screen.getByTestId('phase-accordion-trigger-1');
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    
    // Simulate expansion
    (useActionPlanStore as any).mockReturnValue({
      expandedPhases: new Set([1]),
      togglePhase: mockTogglePhase,
    });
    
    rerender(
      <QueryClientProvider client={queryClient}>
        <PhaseAccordion phase={mockPhase} planId={1} />
      </QueryClientProvider>
    );
    
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
  });

  describe('Task Creation', () => {
    let queryClient: QueryClient;
    const mockTogglePhase = vi.fn();
    
    const renderWithProviders = (ui: React.ReactElement) => {
      return render(
        <QueryClientProvider client={queryClient}>
          {ui}
        </QueryClientProvider>
      );
    };
    
    beforeEach(() => {
      queryClient = new QueryClient({
        defaultOptions: {
          queries: { retry: false },
          mutations: { retry: false },
        },
      });
    });
    it('should render Add Task button when phase is expanded', async () => {
      (useActionPlanStore as any).mockReturnValue({
        expandedPhases: new Set([1]),
        togglePhase: mockTogglePhase,
      });

      renderWithProviders(
        <PhaseAccordion phase={mockPhase} planId={1} />
      );

      // Wait for content to be visible
      await waitFor(() => {
        expect(screen.getByTestId('add-task-button-1')).toBeInTheDocument();
      });
    });

    it('should not render Add Task button when phase is collapsed', () => {
      (useActionPlanStore as any).mockReturnValue({
        expandedPhases: new Set(),
        togglePhase: mockTogglePhase,
      });

      renderWithProviders(
        <PhaseAccordion phase={mockPhase} planId={1} />
      );

      expect(screen.queryByTestId('add-task-button-1')).not.toBeInTheDocument();
    });

    it('should open TaskEditor when Add Task button is clicked', async () => {
      (useActionPlanStore as any).mockReturnValue({
        expandedPhases: new Set([1]),
        togglePhase: mockTogglePhase,
      });

      renderWithProviders(
        <PhaseAccordion phase={mockPhase} planId={1} />
      );

      const addButton = await screen.findByTestId('add-task-button-1');
      fireEvent.click(addButton);

      // TaskEditor dialog should be visible
      await waitFor(() => {
        expect(screen.getByTestId('task-editor-dialog')).toBeInTheDocument();
      });
    });
  });
});
