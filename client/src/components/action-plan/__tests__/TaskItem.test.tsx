import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TaskItem } from '../TaskItem';
import type { PlanTask } from '@/types/action-plan';

// Mock the toast hook
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

// Mock the useUpdateTaskStatus hook
const mockMutateAsync = vi.fn();
vi.mock('@/hooks/useActionPlan', () => ({
  useUpdateTaskStatus: () => ({
    mutateAsync: mockMutateAsync,
  }),
}));

describe('TaskItem', () => {
  let queryClient: QueryClient;
  
  const mockTask: PlanTask = {
    id: 1,
    phaseId: 1,
    planId: 1,
    title: 'Test Task',
    description: 'Test task description',
    estimatedTime: '2 hours',
    resources: ['https://example.com/resource1'],
    order: 1,
    status: 'not_started',
    isCustom: false,
    assigneeId: null,
    completedAt: null,
    completedBy: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  
  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    mockMutateAsync.mockClear();
  });
  
  const renderTaskItem = (props: Partial<React.ComponentProps<typeof TaskItem>> = {}) => {
    return render(
      <QueryClientProvider client={queryClient}>
        <TaskItem task={mockTask} {...props} />
      </QueryClientProvider>
    );
  };
  
  describe('Rendering', () => {
    it('should render task title', () => {
      renderTaskItem();
      expect(screen.getByText('Test Task')).toBeInTheDocument();
    });
    
    it('should render estimated time', () => {
      renderTaskItem();
      expect(screen.getByText('2 hours')).toBeInTheDocument();
    });
    
    it('should show custom badge for custom tasks', () => {
      renderTaskItem({ task: { ...mockTask, isCustom: true } });
      expect(screen.getByText('(Custom)')).toBeInTheDocument();
    });
    
    it('should show blocked indicator when isBlocked is true', () => {
      renderTaskItem({ isBlocked: true });
      expect(screen.getByText('Blocked')).toBeInTheDocument();
    });
    
    it('should show resource count', () => {
      renderTaskItem();
      expect(screen.getByText('1 resource')).toBeInTheDocument();
    });
    
    it('should show correct resource count for multiple resources', () => {
      renderTaskItem({
        task: {
          ...mockTask,
          resources: ['https://example.com/1', 'https://example.com/2'],
        },
      });
      expect(screen.getByText('2 resources')).toBeInTheDocument();
    });
  });
  
  describe('Status Icons', () => {
    it('should show not started icon for not_started status', () => {
      renderTaskItem();
      const statusButton = screen.getByTestId('task-status-toggle-1');
      expect(statusButton).toHaveAttribute('aria-label', expect.stringContaining('not_started'));
    });
    
    it('should show in progress icon for in_progress status', () => {
      renderTaskItem({ task: { ...mockTask, status: 'in_progress' } });
      const statusButton = screen.getByTestId('task-status-toggle-1');
      expect(statusButton).toHaveAttribute('aria-label', expect.stringContaining('in_progress'));
    });
    
    it('should show completed icon for completed status', () => {
      renderTaskItem({ task: { ...mockTask, status: 'completed' } });
      const statusButton = screen.getByTestId('task-status-toggle-1');
      expect(statusButton).toHaveAttribute('aria-label', expect.stringContaining('completed'));
    });
    
    it('should show lock icon when blocked', () => {
      renderTaskItem({ isBlocked: true });
      const statusButton = screen.getByTestId('task-status-toggle-1');
      expect(statusButton).toHaveAttribute('aria-label', 'Task blocked by dependencies');
    });
  });
  
  describe('Status Toggle', () => {
    it('should toggle from not_started to in_progress', async () => {
      mockMutateAsync.mockResolvedValueOnce({});
      renderTaskItem();
      
      const statusButton = screen.getByTestId('task-status-toggle-1');
      fireEvent.click(statusButton);
      
      await waitFor(() => {
        expect(mockMutateAsync).toHaveBeenCalledWith({
          id: 1,
          status: 'in_progress',
        });
      });
    });
    
    it('should toggle from in_progress to completed', async () => {
      mockMutateAsync.mockResolvedValueOnce({});
      renderTaskItem({ task: { ...mockTask, status: 'in_progress' } });
      
      const statusButton = screen.getByTestId('task-status-toggle-1');
      fireEvent.click(statusButton);
      
      await waitFor(() => {
        expect(mockMutateAsync).toHaveBeenCalledWith({
          id: 1,
          status: 'completed',
        });
      });
    });
    
    it('should toggle from completed to not_started', async () => {
      mockMutateAsync.mockResolvedValueOnce({});
      renderTaskItem({ task: { ...mockTask, status: 'completed' } });
      
      const statusButton = screen.getByTestId('task-status-toggle-1');
      fireEvent.click(statusButton);
      
      await waitFor(() => {
        expect(mockMutateAsync).toHaveBeenCalledWith({
          id: 1,
          status: 'not_started',
        });
      });
    });
    
    it('should not toggle when blocked', async () => {
      renderTaskItem({ isBlocked: true });
      
      const statusButton = screen.getByTestId('task-status-toggle-1');
      fireEvent.click(statusButton);
      
      await waitFor(() => {
        expect(mockMutateAsync).not.toHaveBeenCalled();
      });
    });
  });
  
  describe('Expand/Collapse', () => {
    it('should not show details initially', () => {
      renderTaskItem();
      expect(screen.queryByTestId('task-details-1')).not.toBeInTheDocument();
    });
    
    it('should show details when title is clicked', () => {
      renderTaskItem();
      
      const titleButton = screen.getByTestId('task-title-1');
      fireEvent.click(titleButton);
      
      expect(screen.getByTestId('task-details-1')).toBeInTheDocument();
    });
    
    it('should show description in expanded view', () => {
      renderTaskItem();
      
      const titleButton = screen.getByTestId('task-title-1');
      fireEvent.click(titleButton);
      
      expect(screen.getByText('Test task description')).toBeInTheDocument();
    });
    
    it('should show resources in expanded view', () => {
      renderTaskItem();
      
      const titleButton = screen.getByTestId('task-title-1');
      fireEvent.click(titleButton);
      
      expect(screen.getByText('Resources:')).toBeInTheDocument();
      const resourceLink = screen.getByRole('link', { name: /example.com/ });
      expect(resourceLink).toHaveAttribute('href', 'https://example.com/resource1');
    });
    
    it('should show dependencies in expanded view', () => {
      renderTaskItem({ dependencies: ['Complete Task A', 'Complete Task B'] });
      
      const titleButton = screen.getByTestId('task-title-1');
      fireEvent.click(titleButton);
      
      expect(screen.getByText('Prerequisites:')).toBeInTheDocument();
      expect(screen.getByText('• Complete Task A')).toBeInTheDocument();
      expect(screen.getByText('• Complete Task B')).toBeInTheDocument();
    });
    
    it('should hide details when title is clicked again', () => {
      renderTaskItem();
      
      const titleButton = screen.getByTestId('task-title-1');
      fireEvent.click(titleButton);
      expect(screen.getByTestId('task-details-1')).toBeInTheDocument();
      
      fireEvent.click(titleButton);
      expect(screen.queryByTestId('task-details-1')).not.toBeInTheDocument();
    });
  });
  
  describe('Action Buttons', () => {
    it('should call onEdit when edit button is clicked', () => {
      const onEdit = vi.fn();
      renderTaskItem({ onEdit });
      
      const editButton = screen.getByTestId('task-edit-1');
      fireEvent.click(editButton);
      
      expect(onEdit).toHaveBeenCalledWith(mockTask);
    });
    
    it('should call onDelete when delete button is clicked', () => {
      const onDelete = vi.fn();
      renderTaskItem({ onDelete });
      
      const deleteButton = screen.getByTestId('task-delete-1');
      fireEvent.click(deleteButton);
      
      expect(onDelete).toHaveBeenCalledWith(1);
    });
    
    it('should not show edit button when onEdit is not provided', () => {
      renderTaskItem();
      expect(screen.queryByTestId('task-edit-1')).not.toBeInTheDocument();
    });
    
    it('should not show delete button when onDelete is not provided', () => {
      renderTaskItem();
      expect(screen.queryByTestId('task-delete-1')).not.toBeInTheDocument();
    });
  });
  
  describe('Drag Handle', () => {
    it('should show drag handle when isDraggable is true', () => {
      renderTaskItem({ isDraggable: true });
      expect(screen.getByTestId('task-drag-handle-1')).toBeInTheDocument();
    });
    
    it('should not show drag handle when isDraggable is false', () => {
      renderTaskItem({ isDraggable: false });
      expect(screen.queryByTestId('task-drag-handle-1')).not.toBeInTheDocument();
    });
  });
  
  describe('Styling', () => {
    it('should apply completed styling for completed tasks', () => {
      renderTaskItem({ task: { ...mockTask, status: 'completed' } });
      const taskItem = screen.getByTestId('task-item-1');
      expect(taskItem).toHaveClass('border-green-500/30');
    });
    
    it('should apply in-progress styling for in-progress tasks', () => {
      renderTaskItem({ task: { ...mockTask, status: 'in_progress' } });
      const taskItem = screen.getByTestId('task-item-1');
      expect(taskItem).toHaveClass('border-orange-500/30');
    });
    
    it('should apply skipped styling for skipped tasks', () => {
      renderTaskItem({ task: { ...mockTask, status: 'skipped' } });
      const taskItem = screen.getByTestId('task-item-1');
      expect(taskItem).toHaveClass('border-gray-500/20');
    });
    
    it('should apply blocked styling when isBlocked is true', () => {
      renderTaskItem({ isBlocked: true });
      const taskItem = screen.getByTestId('task-item-1');
      expect(taskItem).toHaveClass('opacity-70');
    });
  });
  
  describe('Accessibility', () => {
    it('should have proper ARIA labels for status button', () => {
      renderTaskItem();
      const statusButton = screen.getByTestId('task-status-toggle-1');
      expect(statusButton).toHaveAttribute('aria-label');
    });
    
    it('should have proper ARIA label for drag handle', () => {
      renderTaskItem({ isDraggable: true });
      const dragHandle = screen.getByTestId('task-drag-handle-1');
      expect(dragHandle).toHaveAttribute('aria-label', 'Drag to reorder task');
    });
    
    it('should have proper ARIA label for edit button', () => {
      renderTaskItem({ onEdit: vi.fn() });
      const editButton = screen.getByTestId('task-edit-1');
      expect(editButton).toHaveAttribute('aria-label', 'Edit task');
    });
    
    it('should have proper ARIA label for delete button', () => {
      renderTaskItem({ onDelete: vi.fn() });
      const deleteButton = screen.getByTestId('task-delete-1');
      expect(deleteButton).toHaveAttribute('aria-label', 'Delete task');
    });
  });
});
