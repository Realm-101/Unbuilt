import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DeleteTaskDialog } from '../DeleteTaskDialog';
import type { PlanTask } from '@/types/action-plan';

describe('DeleteTaskDialog', () => {
  const mockTask: PlanTask = {
    id: 1,
    phaseId: 1,
    planId: 1,
    title: 'Test Task',
    description: 'Test description',
    estimatedTime: '2 hours',
    resources: [],
    order: 0,
    status: 'not_started',
    isCustom: false,
    assigneeId: null,
    completedAt: null,
    completedBy: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  it('should render dialog when open', () => {
    render(
      <DeleteTaskDialog
        task={mockTask}
        open={true}
        onOpenChange={vi.fn()}
        onConfirm={vi.fn()}
      />
    );

    expect(screen.getByText('Delete Task?')).toBeInTheDocument();
    expect(screen.getByText(/Test Task/)).toBeInTheDocument();
  });

  it('should not render when closed', () => {
    render(
      <DeleteTaskDialog
        task={mockTask}
        open={false}
        onOpenChange={vi.fn()}
        onConfirm={vi.fn()}
      />
    );

    expect(screen.queryByText('Delete Task?')).not.toBeInTheDocument();
  });

  it('should call onConfirm when delete button is clicked', () => {
    const onConfirm = vi.fn();
    const onOpenChange = vi.fn();

    render(
      <DeleteTaskDialog
        task={mockTask}
        open={true}
        onOpenChange={onOpenChange}
        onConfirm={onConfirm}
      />
    );

    const deleteButton = screen.getByRole('button', { name: /delete task/i });
    fireEvent.click(deleteButton);

    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('should call onOpenChange when cancel button is clicked', () => {
    const onOpenChange = vi.fn();

    render(
      <DeleteTaskDialog
        task={mockTask}
        open={true}
        onOpenChange={onOpenChange}
        onConfirm={vi.fn()}
      />
    );

    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    fireEvent.click(cancelButton);

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('should show skip button when onSkip is provided', () => {
    render(
      <DeleteTaskDialog
        task={mockTask}
        open={true}
        onOpenChange={vi.fn()}
        onConfirm={vi.fn()}
        onSkip={vi.fn()}
      />
    );

    expect(screen.getByRole('button', { name: /skip instead/i })).toBeInTheDocument();
  });

  it('should not show skip button when onSkip is not provided', () => {
    render(
      <DeleteTaskDialog
        task={mockTask}
        open={true}
        onOpenChange={vi.fn()}
        onConfirm={vi.fn()}
      />
    );

    expect(screen.queryByRole('button', { name: /skip instead/i })).not.toBeInTheDocument();
  });

  it('should call onSkip when skip button is clicked', () => {
    const onSkip = vi.fn();
    const onOpenChange = vi.fn();

    render(
      <DeleteTaskDialog
        task={mockTask}
        open={true}
        onOpenChange={onOpenChange}
        onConfirm={vi.fn()}
        onSkip={onSkip}
      />
    );

    const skipButton = screen.getByRole('button', { name: /skip instead/i });
    fireEvent.click(skipButton);

    expect(onSkip).toHaveBeenCalledTimes(1);
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('should show tip for AI-generated tasks', () => {
    render(
      <DeleteTaskDialog
        task={{ ...mockTask, isCustom: false }}
        open={true}
        onOpenChange={vi.fn()}
        onConfirm={vi.fn()}
        onSkip={vi.fn()}
      />
    );

    expect(screen.getByText(/This is an AI-generated task/)).toBeInTheDocument();
    expect(screen.getByText(/Consider marking it as "Skipped"/)).toBeInTheDocument();
  });

  it('should not show tip for custom tasks', () => {
    render(
      <DeleteTaskDialog
        task={{ ...mockTask, isCustom: true }}
        open={true}
        onOpenChange={vi.fn()}
        onConfirm={vi.fn()}
        onSkip={vi.fn()}
      />
    );

    expect(screen.queryByText(/This is an AI-generated task/)).not.toBeInTheDocument();
  });

  it('should display task title in warning message', () => {
    const customTask = { ...mockTask, title: 'Custom Task Name' };

    render(
      <DeleteTaskDialog
        task={customTask}
        open={true}
        onOpenChange={vi.fn()}
        onConfirm={vi.fn()}
      />
    );

    expect(screen.getByText(/Custom Task Name/)).toBeInTheDocument();
  });

  it('should return null when task is null', () => {
    const { container } = render(
      <DeleteTaskDialog
        task={null}
        open={true}
        onOpenChange={vi.fn()}
        onConfirm={vi.fn()}
      />
    );

    expect(container.firstChild).toBeNull();
  });
});
