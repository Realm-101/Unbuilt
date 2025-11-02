import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TaskEditor } from '../TaskEditor';
import type { PlanTask } from '@/types/action-plan';

// Mock task data
const mockTask: PlanTask = {
  id: 1,
  phaseId: 1,
  planId: 1,
  title: 'Test Task',
  description: 'Test description',
  estimatedTime: '2 hours',
  resources: ['https://example.com', 'https://test.com'],
  order: 1,
  status: 'not_started',
  isCustom: false,
  assigneeId: null,
  completedAt: null,
  completedBy: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

describe('TaskEditor', () => {
  const mockOnSave = vi.fn();
  const mockOnOpenChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Dialog Rendering', () => {
    it('should render dialog when open', () => {
      render(
        <TaskEditor
          phaseId={1}
          planId={1}
          open={true}
          onOpenChange={mockOnOpenChange}
          onSave={mockOnSave}
        />
      );

      expect(screen.getByTestId('task-editor-dialog')).toBeInTheDocument();
      expect(screen.getByTestId('task-editor-title')).toHaveTextContent('Create New Task');
    });

    it('should not render dialog when closed', () => {
      render(
        <TaskEditor
          phaseId={1}
          planId={1}
          open={false}
          onOpenChange={mockOnOpenChange}
          onSave={mockOnSave}
        />
      );

      expect(screen.queryByTestId('task-editor-dialog')).not.toBeInTheDocument();
    });

    it('should show edit mode title when editing existing task', () => {
      render(
        <TaskEditor
          task={mockTask}
          phaseId={1}
          planId={1}
          open={true}
          onOpenChange={mockOnOpenChange}
          onSave={mockOnSave}
        />
      );

      expect(screen.getByTestId('task-editor-title')).toHaveTextContent('Edit Task');
    });
  });

  describe('Form Fields', () => {
    it('should render all form fields', () => {
      render(
        <TaskEditor
          phaseId={1}
          planId={1}
          open={true}
          onOpenChange={mockOnOpenChange}
          onSave={mockOnSave}
        />
      );

      expect(screen.getByTestId('task-title-input')).toBeInTheDocument();
      expect(screen.getByTestId('task-description-input')).toBeInTheDocument();
      expect(screen.getByTestId('task-estimated-time-input')).toBeInTheDocument();
      expect(screen.getByTestId('task-resources-input')).toBeInTheDocument();
    });

    it('should populate fields with task data when editing', () => {
      render(
        <TaskEditor
          task={mockTask}
          phaseId={1}
          planId={1}
          open={true}
          onOpenChange={mockOnOpenChange}
          onSave={mockOnSave}
        />
      );

      expect(screen.getByTestId('task-title-input')).toHaveValue('Test Task');
      expect(screen.getByTestId('task-description-input')).toHaveValue('Test description');
      expect(screen.getByTestId('task-estimated-time-input')).toHaveValue('2 hours');
      expect(screen.getByTestId('task-resources-input')).toHaveValue(
        'https://example.com\nhttps://test.com'
      );
    });

    it('should have empty fields when creating new task', () => {
      render(
        <TaskEditor
          phaseId={1}
          planId={1}
          open={true}
          onOpenChange={mockOnOpenChange}
          onSave={mockOnSave}
        />
      );

      expect(screen.getByTestId('task-title-input')).toHaveValue('');
      expect(screen.getByTestId('task-description-input')).toHaveValue('');
      expect(screen.getByTestId('task-estimated-time-input')).toHaveValue('');
      expect(screen.getByTestId('task-resources-input')).toHaveValue('');
    });
  });

  describe('Form Validation', () => {
    it('should show error when title is empty', async () => {
      const user = userEvent.setup();
      
      render(
        <TaskEditor
          phaseId={1}
          planId={1}
          open={true}
          onOpenChange={mockOnOpenChange}
          onSave={mockOnSave}
        />
      );

      const saveButton = screen.getByTestId('task-editor-save');
      await user.click(saveButton);

      await waitFor(() => {
        expect(screen.getByTestId('task-title-error')).toHaveTextContent('Title is required');
      });

      expect(mockOnSave).not.toHaveBeenCalled();
    });

    it('should show error when title exceeds 200 characters', async () => {
      const user = userEvent.setup();
      
      render(
        <TaskEditor
          phaseId={1}
          planId={1}
          open={true}
          onOpenChange={mockOnOpenChange}
          onSave={mockOnSave}
        />
      );

      const titleInput = screen.getByTestId('task-title-input');
      const longTitle = 'a'.repeat(201);
      
      await user.clear(titleInput);
      await user.type(titleInput, longTitle);

      const saveButton = screen.getByTestId('task-editor-save');
      await user.click(saveButton);

      await waitFor(() => {
        expect(screen.getByTestId('task-title-error')).toHaveTextContent(
          'Title must be 200 characters or less'
        );
      });

      expect(mockOnSave).not.toHaveBeenCalled();
    });
  });

  describe('Task Creation', () => {
    it('should call onSave with correct data and order when creating new task', async () => {
      const user = userEvent.setup();
      mockOnSave.mockResolvedValue(undefined);
      
      render(
        <TaskEditor
          phaseId={1}
          planId={1}
          currentTaskCount={3}
          open={true}
          onOpenChange={mockOnOpenChange}
          onSave={mockOnSave}
        />
      );

      await user.click(screen.getByTestId('task-title-input'));
      await user.paste('New Task');
      await user.click(screen.getByTestId('task-description-input'));
      await user.paste('Task description');

      const saveButton = screen.getByTestId('task-editor-save');
      await user.click(saveButton);

      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalledWith({
          phaseId: 1,
          title: 'New Task',
          description: 'Task description',
          estimatedTime: '',
          resources: [],
          order: 3,
        });
      });

      expect(mockOnOpenChange).toHaveBeenCalledWith(false);
    });

    it('should use order 0 when currentTaskCount is not provided', async () => {
      const user = userEvent.setup();
      mockOnSave.mockResolvedValue(undefined);
      
      render(
        <TaskEditor
          phaseId={1}
          planId={1}
          open={true}
          onOpenChange={mockOnOpenChange}
          onSave={mockOnSave}
        />
      );

      await user.click(screen.getByTestId('task-title-input'));
      await user.paste('First Task');

      const saveButton = screen.getByTestId('task-editor-save');
      await user.click(saveButton);

      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalledWith(
          expect.objectContaining({
            order: 0,
          })
        );
      });
    });
  });

  describe('Cancel Action', () => {
    it('should close dialog when cancel button is clicked', async () => {
      const user = userEvent.setup();
      
      render(
        <TaskEditor
          phaseId={1}
          planId={1}
          open={true}
          onOpenChange={mockOnOpenChange}
          onSave={mockOnSave}
        />
      );

      const cancelButton = screen.getByTestId('task-editor-cancel');
      await user.click(cancelButton);

      expect(mockOnOpenChange).toHaveBeenCalledWith(false);
      expect(mockOnSave).not.toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(
        <TaskEditor
          phaseId={1}
          planId={1}
          open={true}
          onOpenChange={mockOnOpenChange}
          onSave={mockOnSave}
        />
      );

      expect(screen.getByTestId('task-editor-title')).toBeInTheDocument();
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('should mark required fields', () => {
      render(
        <TaskEditor
          phaseId={1}
          planId={1}
          open={true}
          onOpenChange={mockOnOpenChange}
          onSave={mockOnSave}
        />
      );

      const titleLabel = screen.getByText(/Title/);
      expect(titleLabel).toBeInTheDocument();
      expect(titleLabel.textContent).toContain('*');
    });
  });

  describe('Auto-save Functionality', () => {
    it('should show auto-save status indicator when editing task', () => {
      render(
        <TaskEditor
          task={mockTask}
          phaseId={1}
          planId={1}
          open={true}
          onOpenChange={mockOnOpenChange}
          onSave={mockOnSave}
        />
      );

      expect(screen.getByTestId('auto-save-status')).toBeInTheDocument();
    });

    it('should not show auto-save status indicator when creating new task', () => {
      render(
        <TaskEditor
          phaseId={1}
          planId={1}
          open={true}
          onOpenChange={mockOnOpenChange}
          onSave={mockOnSave}
        />
      );

      expect(screen.queryByTestId('auto-save-status')).not.toBeInTheDocument();
    });

    it('should show "Saving..." indicator during auto-save', async () => {
      const user = userEvent.setup();
      mockOnSave.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 1000)));
      
      render(
        <TaskEditor
          task={mockTask}
          phaseId={1}
          planId={1}
          open={true}
          onOpenChange={mockOnOpenChange}
          onSave={mockOnSave}
        />
      );

      // Wait for auto-save to be enabled
      await new Promise(resolve => setTimeout(resolve, 150));

      // Make a change to trigger auto-save
      const titleInput = screen.getByTestId('task-title-input');
      await user.clear(titleInput);
      await user.type(titleInput, 'Updated Task Title');

      // Wait for debounce delay
      await new Promise(resolve => setTimeout(resolve, 600));

      // Should show saving indicator
      await waitFor(() => {
        expect(screen.getByText('Saving...')).toBeInTheDocument();
      }, { timeout: 2000 });
    });

    it('should show "All changes saved" after successful auto-save', async () => {
      const user = userEvent.setup();
      mockOnSave.mockResolvedValue(undefined);
      
      render(
        <TaskEditor
          task={mockTask}
          phaseId={1}
          planId={1}
          open={true}
          onOpenChange={mockOnOpenChange}
          onSave={mockOnSave}
        />
      );

      // Wait for auto-save to be enabled
      await new Promise(resolve => setTimeout(resolve, 150));

      // Make a change to trigger auto-save
      const titleInput = screen.getByTestId('task-title-input');
      await user.clear(titleInput);
      await user.type(titleInput, 'Updated Task');

      // Wait for debounce and save
      await new Promise(resolve => setTimeout(resolve, 800));

      // Should show saved confirmation
      await waitFor(() => {
        expect(screen.getByText('All changes saved')).toBeInTheDocument();
      }, { timeout: 2000 });
    });

    it('should update dialog description to mention automatic saving', () => {
      render(
        <TaskEditor
          task={mockTask}
          phaseId={1}
          planId={1}
          open={true}
          onOpenChange={mockOnOpenChange}
          onSave={mockOnSave}
        />
      );

      expect(screen.getByText(/Your changes will be saved automatically/)).toBeInTheDocument();
    });
  });

  describe('Dependency Selection', () => {
    const mockPlan = {
      id: 1,
      searchId: 1,
      userId: 1,
      templateId: null,
      title: 'Test Plan',
      description: 'Test Description',
      status: 'active' as const,
      originalPlan: {},
      customizations: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      completedAt: null,
      phases: [
        {
          id: 1,
          planId: 1,
          name: 'Phase 1',
          description: 'Test Phase',
          order: 1,
          estimatedDuration: '1 week',
          isCustom: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          tasks: [
            {
              id: 2,
              phaseId: 1,
              planId: 1,
              title: 'Prerequisite Task',
              description: 'Must be done first',
              estimatedTime: '1 hour',
              resources: [],
              order: 0,
              status: 'not_started' as const,
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
              title: 'Another Task',
              description: 'Another task',
              estimatedTime: '2 hours',
              resources: [],
              order: 1,
              status: 'not_started' as const,
              isCustom: false,
              assigneeId: null,
              completedAt: null,
              completedBy: null,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
          ],
        },
      ],
    };

    it('should render dependency selection field', () => {
      render(
        <TaskEditor
          phaseId={1}
          planId={1}
          open={true}
          onOpenChange={mockOnOpenChange}
          onSave={mockOnSave}
          plan={mockPlan}
        />
      );

      expect(screen.getByTestId('task-dependencies-trigger')).toBeInTheDocument();
      expect(screen.getByText('Select prerequisite tasks...')).toBeInTheDocument();
    });

    it('should show available tasks when dependency popover is opened', async () => {
      const user = userEvent.setup();
      
      render(
        <TaskEditor
          phaseId={1}
          planId={1}
          open={true}
          onOpenChange={mockOnOpenChange}
          onSave={mockOnSave}
          plan={mockPlan}
        />
      );

      const trigger = screen.getByTestId('task-dependencies-trigger');
      await user.click(trigger);

      await waitFor(() => {
        expect(screen.getByText('Prerequisite Task')).toBeInTheDocument();
        expect(screen.getByText('Another Task')).toBeInTheDocument();
      });
    });

    it('should exclude current task from dependency options when editing', async () => {
      const user = userEvent.setup();
      
      render(
        <TaskEditor
          task={mockTask}
          phaseId={1}
          planId={1}
          open={true}
          onOpenChange={mockOnOpenChange}
          onSave={mockOnSave}
          plan={mockPlan}
        />
      );

      const trigger = screen.getByTestId('task-dependencies-trigger');
      await user.click(trigger);

      await waitFor(() => {
        // Should show other tasks
        expect(screen.getByText('Prerequisite Task')).toBeInTheDocument();
        // Should not show the current task being edited
        expect(screen.queryByText('Test Task')).not.toBeInTheDocument();
      });
    });

    it('should display selected dependencies as badges', async () => {
      const user = userEvent.setup();
      
      render(
        <TaskEditor
          phaseId={1}
          planId={1}
          open={true}
          onOpenChange={mockOnOpenChange}
          onSave={mockOnSave}
          plan={mockPlan}
        />
      );

      // Open popover
      const trigger = screen.getByTestId('task-dependencies-trigger');
      await user.click(trigger);

      // Select a dependency
      await waitFor(() => {
        expect(screen.getByText('Prerequisite Task')).toBeInTheDocument();
      });
      
      const option = screen.getByTestId('dependency-option-2');
      await user.click(option);

      // Should show badge
      await waitFor(() => {
        expect(screen.getByTestId('dependency-badge-2')).toBeInTheDocument();
        expect(screen.getByTestId('selected-dependencies')).toBeInTheDocument();
      });
    });

    it('should allow removing dependencies', async () => {
      const user = userEvent.setup();
      
      render(
        <TaskEditor
          phaseId={1}
          planId={1}
          open={true}
          onOpenChange={mockOnOpenChange}
          onSave={mockOnSave}
          plan={mockPlan}
        />
      );

      // Open popover and select a dependency
      const trigger = screen.getByTestId('task-dependencies-trigger');
      await user.click(trigger);

      await waitFor(() => {
        expect(screen.getByText('Prerequisite Task')).toBeInTheDocument();
      });
      
      const option = screen.getByTestId('dependency-option-2');
      await user.click(option);

      // Wait for badge to appear
      await waitFor(() => {
        expect(screen.getByTestId('dependency-badge-2')).toBeInTheDocument();
      });

      // Remove the dependency
      const removeButton = screen.getByTestId('remove-dependency-2');
      await user.click(removeButton);

      // Badge should be removed
      await waitFor(() => {
        expect(screen.queryByTestId('dependency-badge-2')).not.toBeInTheDocument();
      });
    });

    it('should update trigger text when dependencies are selected', async () => {
      const user = userEvent.setup();
      
      render(
        <TaskEditor
          phaseId={1}
          planId={1}
          open={true}
          onOpenChange={mockOnOpenChange}
          onSave={mockOnSave}
          plan={mockPlan}
        />
      );

      // Initially shows placeholder
      expect(screen.getByText('Select prerequisite tasks...')).toBeInTheDocument();

      // Open popover and select a dependency
      const trigger = screen.getByTestId('task-dependencies-trigger');
      await user.click(trigger);

      await waitFor(() => {
        expect(screen.getByText('Prerequisite Task')).toBeInTheDocument();
      });
      
      const option = screen.getByTestId('dependency-option-2');
      await user.click(option);

      // Should update to show count
      await waitFor(() => {
        expect(screen.getByText('1 prerequisite selected')).toBeInTheDocument();
      });
    });
  });

});
