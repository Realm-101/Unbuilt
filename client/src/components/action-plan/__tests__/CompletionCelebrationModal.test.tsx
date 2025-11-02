import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CompletionCelebrationModal } from '../CompletionCelebrationModal';
import type { ActionPlanWithDetails, ProgressMetrics } from '@/types/action-plan';

describe('CompletionCelebrationModal', () => {
  const mockPlan: ActionPlanWithDetails = {
    id: 1,
    searchId: 1,
    userId: 1,
    templateId: null,
    title: 'Test Action Plan',
    description: 'Test description',
    status: 'completed',
    originalPlan: {},
    customizations: {},
    createdAt: new Date('2024-01-01').toISOString(),
    updatedAt: new Date('2024-01-15').toISOString(),
    completedAt: new Date('2024-01-15').toISOString(),
    phases: [
      {
        id: 1,
        planId: 1,
        name: 'Phase 1',
        description: 'First phase',
        order: 0,
        estimatedDuration: '1 week',
        isCustom: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        tasks: [],
      },
    ],
  };

  const mockProgress: ProgressMetrics = {
    totalTasks: 10,
    completedTasks: 10,
    inProgressTasks: 0,
    skippedTasks: 0,
    completionPercentage: 100,
    currentPhase: 'Phase 1',
    estimatedCompletion: null,
    velocity: 2.5,
    averageTaskTime: 4,
  };

  const mockOnOpenChange = vi.fn();
  const mockOnArchive = vi.fn();
  const mockOnStartNew = vi.fn();

  it('renders celebration modal when open', () => {
    render(
      <CompletionCelebrationModal
        open={true}
        onOpenChange={mockOnOpenChange}
        plan={mockPlan}
        progress={mockProgress}
        onArchive={mockOnArchive}
        onStartNew={mockOnStartNew}
      />
    );

    expect(screen.getByText(/Action Plan Complete!/i)).toBeInTheDocument();
    expect(screen.getByText(/Congratulations!/i)).toBeInTheDocument();
  });

  it('displays completion summary with metrics', () => {
    render(
      <CompletionCelebrationModal
        open={true}
        onOpenChange={mockOnOpenChange}
        plan={mockPlan}
        progress={mockProgress}
        onArchive={mockOnArchive}
        onStartNew={mockOnStartNew}
      />
    );

    expect(screen.getByText('Completion Summary')).toBeInTheDocument();
    expect(screen.getByText('14 days')).toBeInTheDocument(); // Total time
    expect(screen.getByText('10')).toBeInTheDocument(); // Tasks completed
    expect(screen.getByText('4h')).toBeInTheDocument(); // Average task time
    expect(screen.getByText('2.5 tasks/week')).toBeInTheDocument(); // Velocity
  });

  it('displays achievements list', () => {
    render(
      <CompletionCelebrationModal
        open={true}
        onOpenChange={mockOnOpenChange}
        plan={mockPlan}
        progress={mockProgress}
        onArchive={mockOnArchive}
        onStartNew={mockOnStartNew}
      />
    );

    expect(screen.getByText('Achievements')).toBeInTheDocument();
    expect(screen.getByText(/Completed 10 tasks/i)).toBeInTheDocument();
    expect(screen.getByText(/Finished 1 phases/i)).toBeInTheDocument();
  });

  it('displays plan details', () => {
    render(
      <CompletionCelebrationModal
        open={true}
        onOpenChange={mockOnOpenChange}
        plan={mockPlan}
        progress={mockProgress}
        onArchive={mockOnArchive}
        onStartNew={mockOnStartNew}
      />
    );

    expect(screen.getByText('Test Action Plan')).toBeInTheDocument();
    expect(screen.getByText('Test description')).toBeInTheDocument();
  });

  it('calls onArchive when archive button is clicked', () => {
    render(
      <CompletionCelebrationModal
        open={true}
        onOpenChange={mockOnOpenChange}
        plan={mockPlan}
        progress={mockProgress}
        onArchive={mockOnArchive}
        onStartNew={mockOnStartNew}
      />
    );

    const archiveButton = screen.getByRole('button', { name: /Archive Plan/i });
    fireEvent.click(archiveButton);

    expect(mockOnArchive).toHaveBeenCalledTimes(1);
  });

  it('calls onStartNew when start new plan button is clicked', () => {
    render(
      <CompletionCelebrationModal
        open={true}
        onOpenChange={mockOnOpenChange}
        plan={mockPlan}
        progress={mockProgress}
        onArchive={mockOnArchive}
        onStartNew={mockOnStartNew}
      />
    );

    const startNewButton = screen.getByRole('button', { name: /Start New Plan/i });
    fireEvent.click(startNewButton);

    expect(mockOnStartNew).toHaveBeenCalledTimes(1);
  });

  it('calls onOpenChange when close button is clicked', () => {
    render(
      <CompletionCelebrationModal
        open={true}
        onOpenChange={mockOnOpenChange}
        plan={mockPlan}
        progress={mockProgress}
        onArchive={mockOnArchive}
        onStartNew={mockOnStartNew}
      />
    );

    const closeButtons = screen.getAllByRole('button', { name: /Close/i });
    // Click the footer close button (last one)
    fireEvent.click(closeButtons[closeButtons.length - 1]);

    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
  });

  it('handles plan without description', () => {
    const planWithoutDescription = {
      ...mockPlan,
      description: null,
    };

    render(
      <CompletionCelebrationModal
        open={true}
        onOpenChange={mockOnOpenChange}
        plan={planWithoutDescription}
        progress={mockProgress}
        onArchive={mockOnArchive}
        onStartNew={mockOnStartNew}
      />
    );

    expect(screen.getByText('Test Action Plan')).toBeInTheDocument();
    expect(screen.queryByText('Test description')).not.toBeInTheDocument();
  });

  it('handles progress without velocity', () => {
    const progressWithoutVelocity = {
      ...mockProgress,
      velocity: undefined,
    };

    render(
      <CompletionCelebrationModal
        open={true}
        onOpenChange={mockOnOpenChange}
        plan={mockPlan}
        progress={progressWithoutVelocity}
        onArchive={mockOnArchive}
        onStartNew={mockOnStartNew}
      />
    );

    expect(screen.queryByText(/tasks\/week/i)).not.toBeInTheDocument();
  });

  it('handles progress without average task time', () => {
    const progressWithoutAvgTime = {
      ...mockProgress,
      averageTaskTime: undefined,
    };

    render(
      <CompletionCelebrationModal
        open={true}
        onOpenChange={mockOnOpenChange}
        plan={mockPlan}
        progress={progressWithoutAvgTime}
        onArchive={mockOnArchive}
        onStartNew={mockOnStartNew}
      />
    );

    expect(screen.queryByText(/4h/i)).not.toBeInTheDocument();
  });

  it('calculates total time correctly', () => {
    const planWithDifferentDates = {
      ...mockPlan,
      createdAt: new Date('2024-01-01').toISOString(),
      completedAt: new Date('2024-01-31').toISOString(),
    };

    render(
      <CompletionCelebrationModal
        open={true}
        onOpenChange={mockOnOpenChange}
        plan={planWithDifferentDates}
        progress={mockProgress}
        onArchive={mockOnArchive}
        onStartNew={mockOnStartNew}
      />
    );

    expect(screen.getByText('30 days')).toBeInTheDocument();
  });

  it('displays singular "day" for 1 day duration', () => {
    const planWithOneDay = {
      ...mockPlan,
      createdAt: new Date('2024-01-01T00:00:00').toISOString(),
      completedAt: new Date('2024-01-01T23:59:59').toISOString(),
    };

    render(
      <CompletionCelebrationModal
        open={true}
        onOpenChange={mockOnOpenChange}
        plan={planWithOneDay}
        progress={mockProgress}
        onArchive={mockOnArchive}
        onStartNew={mockOnStartNew}
      />
    );

    expect(screen.getByText('1 day')).toBeInTheDocument();
  });
});
