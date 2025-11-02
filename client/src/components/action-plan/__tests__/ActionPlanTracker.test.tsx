import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ActionPlanTracker } from '../ActionPlanTracker';
import { useProgressTrackingStore } from '@/stores/progressTrackingStore';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock the progress tracking store
vi.mock('@/stores/progressTrackingStore', () => ({
  useProgressTrackingStore: vi.fn(),
}));

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

const mockPhases = [
  {
    id: 'phase1',
    name: 'Discovery',
    description: 'Research and validation',
    steps: [
      {
        id: 'step1',
        title: 'Market Research',
        description: 'Conduct market analysis',
        estimatedTime: '2 weeks',
      },
      {
        id: 'step2',
        title: 'User Interviews',
        description: 'Interview potential users',
        estimatedTime: '1 week',
      },
    ],
    order: 1,
  },
  {
    id: 'phase2',
    name: 'Planning',
    description: 'Strategic planning',
    steps: [
      {
        id: 'step3',
        title: 'Create Roadmap',
        description: 'Define project roadmap',
        estimatedTime: '1 week',
      },
    ],
    order: 2,
  },
];

const mockProgress = {
  completedSteps: ['step1'],
  phaseCompletion: {
    phase1: 50,
    phase2: 0,
  },
  overallCompletion: 25,
  lastUpdated: new Date(),
};

describe('ActionPlanTracker', () => {
  let queryClient: QueryClient;
  const mockToggleStep = vi.fn();
  const mockMarkStepComplete = vi.fn();

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    (useProgressTrackingStore as any).mockReturnValue({
      completedSteps: mockProgress.completedSteps,
      toggleStep: mockToggleStep,
      markStepComplete: mockMarkStepComplete,
    });
  });

  const renderComponent = (props = {}) => {
    return render(
      <QueryClientProvider client={queryClient}>
        <ActionPlanTracker
          analysisId="test-analysis"
          phases={mockPhases}
          progress={mockProgress}
          onStepComplete={vi.fn()}
          {...props}
        />
      </QueryClientProvider>
    );
  };

  it('should render all phases', () => {
    renderComponent();

    expect(screen.getByText('Discovery')).toBeInTheDocument();
    expect(screen.getByText('Planning')).toBeInTheDocument();
  });

  it('should display overall progress', () => {
    renderComponent();

    expect(screen.getByText(/25%/)).toBeInTheDocument();
  });

  it('should show completed steps with checkboxes checked', () => {
    renderComponent();

    const checkboxes = screen.getAllByRole('checkbox');
    const marketResearchCheckbox = checkboxes.find(
      (cb) => cb.getAttribute('aria-label')?.includes('Market Research')
    );

    expect(marketResearchCheckbox).toBeChecked();
  });

  it('should toggle step completion on checkbox click', async () => {
    const onStepComplete = vi.fn();
    renderComponent({ onStepComplete });

    const checkboxes = screen.getAllByRole('checkbox');
    const userInterviewsCheckbox = checkboxes.find(
      (cb) => cb.getAttribute('aria-label')?.includes('User Interviews')
    );

    if (userInterviewsCheckbox) {
      fireEvent.click(userInterviewsCheckbox);

      await waitFor(() => {
        expect(onStepComplete).toHaveBeenCalledWith('phase1', 'step2', true);
      });
    }
  });

  it('should expand phase details on click', async () => {
    renderComponent();

    const discoveryButton = screen.getByText('Discovery').closest('button');
    if (discoveryButton) {
      fireEvent.click(discoveryButton);

      await waitFor(() => {
        expect(screen.getByText('Market Research')).toBeVisible();
      });
    }
  });

  it('should display phase completion percentage', () => {
    renderComponent();

    expect(screen.getByText(/50%/)).toBeInTheDocument();
  });

  it('should show estimated time for steps', () => {
    renderComponent();

    const discoveryButton = screen.getByText('Discovery').closest('button');
    if (discoveryButton) {
      fireEvent.click(discoveryButton);
    }

    expect(screen.getByText(/2 weeks/)).toBeInTheDocument();
  });
});
