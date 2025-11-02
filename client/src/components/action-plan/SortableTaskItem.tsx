import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { TaskItem } from './TaskItem';
import type { PlanTask } from '@/types/action-plan';

interface SortableTaskItemProps {
  task: PlanTask;
  isBlocked?: boolean;
  prerequisiteTasks?: PlanTask[];
  dependentTasks?: PlanTask[];
  isNewlyAvailable?: boolean;
  isRecentlyUpdated?: boolean;
  isSelected?: boolean;
  onEdit?: (task: PlanTask) => void;
  onDelete?: (taskId: number) => void;
}

/**
 * SortableTaskItem Component
 * 
 * Wraps TaskItem with drag-and-drop sortable functionality using @dnd-kit
 * Provides smooth animations and visual feedback during drag operations
 * 
 * Requirements: 2.6
 */
export function SortableTaskItem({
  task,
  isBlocked,
  prerequisiteTasks,
  dependentTasks,
  isNewlyAvailable,
  isRecentlyUpdated,
  isSelected,
  onEdit,
  onDelete,
}: SortableTaskItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 1000 : 'auto',
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <TaskItem
        task={task}
        isBlocked={isBlocked}
        prerequisiteTasks={prerequisiteTasks}
        dependentTasks={dependentTasks}
        isNewlyAvailable={isNewlyAvailable}
        isRecentlyUpdated={isRecentlyUpdated}
        isSelected={isSelected}
        isDraggable={true}
        onEdit={onEdit}
        onDelete={onDelete}
        dragHandleProps={listeners}
      />
    </div>
  );
}
