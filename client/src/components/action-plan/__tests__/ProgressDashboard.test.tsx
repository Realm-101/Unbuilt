import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ProgressDashboard } from '../ProgressDashboard';
import type { ProgressMetrics, PlanPhaseWithTasks } from '@/types/action-plan';
import type { ProgressSnapshot } from '@shared/schema';

describe('ProgressDashboard', () => {
  const mockProgress: ProgressMetrics = {
    totalTasks: 20,
    completedTasks: 12,
    inProgressTasks: 3,
    notStartedTasks: 5,
    skippedTasks: 0,
    completionPercentage: 60,
    currentPhase: 'Development',
    estimatedCompletion: '2025-12-31T00:00:00.000Z',
    velocity: 2.5,
    averageTaskTime: 4,
  };

  const mockPhases: PlanPhaseWithTasks[] = [
    {
      id: 1,
      planId: 1,
      name: 'Planning',
      description: 'Initial planning phase',
      order: 1,
      estimatedDuration: '2 weeks',
      isCustom: false,
      createdAt: '2025-01-01T00:00:00.000Z',
      updatedAt: '2025-01-01T00:00:00.000Z',
      tasks: [
        {
          id: 1,
          phaseId: 1,
          planId: 1,
          title: 'Task 1',
          description: 'Description 1',
          estimatedTime: '2 hours',
          resources: [],
          order: 1,
          status: 'completed',
          isCustom: false,
          assigneeId: null,
          completedAt: '2025-01-05T00:00:00.000Z',
          completedBy: null,
          createdAt: '2025-01-01T00:00:00.000Z',
          updatedAt: '2025-01-05T00:00:00.000Z',
        },
        {
          id: 2,
          phaseId: 1,
          planId: 1,
          title: 'Task 2',
          description: 'Description 2',
          estimatedTime: '3 hours',
          resources: [],
          order: 2,
          status: 'completed',
          isCustom: false,
          assigneeId: null,
          completedAt: '2025-01-06T00:00:00.000Z',
          completedBy: null,
          createdAt: '2025-01-01T00:00:00.000Z',
          updatedAt: '2025-01-06T00:00:00.000Z',
        },
      ],
    },
    {
      id: 2,
      planId: 1,
      name: 'Development',
      description: 'Development phase',
      order: 2,
      estimatedDuration: '4 weeks',
      isCustom: false,
      createdAt: '2025-01-01T00:00:00.000Z',
      updatedAt: '2025-01-01T00:00:00.000Z',
      tasks: [
        {
          id: 3,
          phaseId: 2,
          planId: 1,
          title: 'Task 3',
          description: 'Description 3',
          estimatedTime: '5 hours',
          resources: [],
          order: 1,
          status: 'in_progress',
          isCustom: false,
          assigneeId: null,
          completedAt: null,
          completedBy: null,
          createdAt: '2025-01-07T00:00:00.000Z',
          updatedAt: '2025-01-07T00:00:00.000Z',
        },
      ],
    },
  ];

  const mockProgressHistory: ProgressSnapshot[] = [
    {
      id: 1,
      planId: 1,
      totalTasks: 20,
      completedTasks: 5,
      inProgressTasks: 2,
      skippedTasks: 0,
      completionPercentage: 25,
      averageTaskTime: 3,
      velocity: 2,
      timestamp: '2025-01-10T00:00:00.000Z',
    },
    {
      id: 2,
      planId: 1,
      totalTasks: 20,
      completedTasks: 10,
      inProgressTasks: 3,
      skippedTasks: 0,
      completionPercentage: 50,
      averageTaskTime: 4,
      velocity: 2,
      timestamp: '2025-01-20T00:00:00.000Z',
    },
    {
      id: 3,
      planId: 1,
      totalTasks: 20,
      completedTasks: 12,
      inProgressTasks: 3,
      skippedTasks: 0,
      completionPercentage: 60,
      averageTaskTime: 4,
      velocity: 3,
      timestamp: '2025-01-25T00:00:00.000Z',
    },
  ];

  it('should render key metrics cards', () => {
    render(
      <ProgressDashboard
        progress={mockProgress}
        phases={mockPhases}
        progressHistory={mockProgressHistory}
      />
    );

    // Check for metric cards
    expect(screen.getByText('Total Tasks')).toBeInTheDocument();
    expect(screen.getByText('20')).toBeInTheDocument();
    expect(screen.getByText('12 completed')).toBeInTheDocument();

    expect(screen.getByText('Completion')).toBeInTheDocument();
    expect(screen.getByText('60%')).toBeInTheDocument();

    expect(screen.getByText('Velocity')).toBeInTheDocument();
    expect(screen.getByText('2.5')).toBeInTheDocument();
    expect(screen.getByText('tasks per week')).toBeInTheDocument();

    expect(screen.getByText('Avg. Time')).toBeInTheDocument();
    expect(screen.getByText('4h')).toBeInTheDocument();
    expect(screen.getByText('per task')).toBeInTheDocument();
  });

  it('should display phase progress breakdown', () => {
    render(
      <ProgressDashboard
        progress={mockProgress}
        phases={mockPhases}
        progressHistory={mockProgressHistory}
      />
    );

    // Check for phase names (using getAllByText since they appear multiple times)
    expect(screen.getAllByText('Planning').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Development').length).toBeGreaterThan(0);

    // Check for phase progress
    expect(screen.getByText('2 of 2 tasks completed')).toBeInTheDocument();
    expect(screen.getByText('0 of 1 tasks completed')).toBeInTheDocument();
  });

  it('should display current phase', () => {
    render(
      <ProgressDashboard
        progress={mockProgress}
        phases={mockPhases}
        progressHistory={mockProgressHistory}
      />
    );

    expect(screen.getByText('Current Phase')).toBeInTheDocument();
    // Development appears multiple times (in phase list and current phase card)
    expect(screen.getAllByText('Development').length).toBeGreaterThan(0);
  });

  it('should display estimated completion date', () => {
    render(
      <ProgressDashboard
        progress={mockProgress}
        phases={mockPhases}
        progressHistory={mockProgressHistory}
      />
    );

    expect(screen.getByText('Estimated Completion')).toBeInTheDocument();
    expect(screen.getByText('December 31, 2025')).toBeInTheDocument();
    expect(screen.getByText('Based on current velocity')).toBeInTheDocument();
  });

  it('should display recent completions timeline', () => {
    render(
      <ProgressDashboard
        progress={mockProgress}
        phases={mockPhases}
        progressHistory={mockProgressHistory}
      />
    );

    expect(screen.getByText('Recent Completions')).toBeInTheDocument();
    expect(screen.getByText('Task 1')).toBeInTheDocument();
    expect(screen.getByText('Task 2')).toBeInTheDocument();
  });

  it('should handle empty progress history', () => {
    render(
      <ProgressDashboard
        progress={mockProgress}
        phases={mockPhases}
        progressHistory={[]}
      />
    );

    // Should still render metrics
    expect(screen.getByText('Total Tasks')).toBeInTheDocument();
    expect(screen.getByText('20')).toBeInTheDocument();
  });

  it('should handle no completed tasks', () => {
    const progressWithNoCompletions: ProgressMetrics = {
      ...mockProgress,
      completedTasks: 0,
      completionPercentage: 0,
    };

    const phasesWithNoCompletions: PlanPhaseWithTasks[] = [
      {
        ...mockPhases[0],
        tasks: mockPhases[0].tasks.map((task) => ({
          ...task,
          status: 'not_started' as const,
          completedAt: null,
        })),
      },
    ];

    render(
      <ProgressDashboard
        progress={progressWithNoCompletions}
        phases={phasesWithNoCompletions}
        progressHistory={[]}
      />
    );

    expect(
      screen.getByText(
        'No completed tasks yet. Start checking off tasks to see your progress!'
      )
    ).toBeInTheDocument();
  });

  it('should display "Not started" when no current phase', () => {
    const progressWithNoPhase: ProgressMetrics = {
      ...mockProgress,
      currentPhase: null,
    };

    render(
      <ProgressDashboard
        progress={progressWithNoPhase}
        phases={mockPhases}
        progressHistory={mockProgressHistory}
      />
    );

    expect(screen.getByText('Not started')).toBeInTheDocument();
  });

  it('should display "Not available" when no estimated completion', () => {
    const progressWithNoEstimate: ProgressMetrics = {
      ...mockProgress,
      estimatedCompletion: null,
    };

    render(
      <ProgressDashboard
        progress={progressWithNoEstimate}
        phases={mockPhases}
        progressHistory={mockProgressHistory}
      />
    );

    expect(screen.getByText('Not available')).toBeInTheDocument();
  });

  it('should render progress chart section when history is available', () => {
    render(
      <ProgressDashboard
        progress={mockProgress}
        phases={mockPhases}
        progressHistory={mockProgressHistory}
      />
    );

    expect(screen.getByText('Progress Over Time')).toBeInTheDocument();
  });

  it('should render phase progress section', () => {
    render(
      <ProgressDashboard
        progress={mockProgress}
        phases={mockPhases}
        progressHistory={mockProgressHistory}
      />
    );

    expect(screen.getByText('Phase Progress')).toBeInTheDocument();
  });
});
