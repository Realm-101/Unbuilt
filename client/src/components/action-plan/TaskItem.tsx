import React, { useState } from 'react';
import { 
  CheckCircle2, 
  Circle, 
  Clock, 
  Edit2, 
  Trash2, 
  Lock, 
  GripVertical,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Unlock,
  ArrowRight
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUpdateTaskStatus, useIncompletePrerequisites } from '@/hooks/useActionPlan';
import { useTouchFriendly } from '@/hooks/useTouchFriendly';
import { useSwipeGesture } from '@/hooks/useSwipeGesture';
import type { PlanTask, TaskStatus } from '@/types/action-plan';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { DependencyWarningDialog } from './DependencyWarningDialog';

interface TaskItemProps {
  task: PlanTask;
  isBlocked?: boolean;
  prerequisiteTasks?: PlanTask[];
  dependentTasks?: PlanTask[];
  isNewlyAvailable?: boolean;
  isRecentlyUpdated?: boolean;
  isSelected?: boolean;
  onEdit?: (task: PlanTask) => void;
  onDelete?: (taskId: number) => void;
  isDraggable?: boolean;
  dragHandleProps?: any; // Props from useSortable for drag handle
}

/**
 * TaskItem Component
 * 
 * Individual task display with:
 * - Checkbox for status toggle
 * - Task detail view on click (description, estimated time, resources)
 * - Optimistic updates for status changes
 * - Edit and delete action buttons
 * - Dependency indicators (locked icon if blocked)
 * - Drag handle for reordering
 * 
 * Requirements: 1.3, 1.4, 1.5, 2.6
 */
export function TaskItem({ 
  task, 
  isBlocked = false,
  prerequisiteTasks = [],
  dependentTasks = [],
  isNewlyAvailable = false,
  isRecentlyUpdated = false,
  isSelected = false,
  onEdit,
  onDelete,
  isDraggable = false,
  dragHandleProps
}: TaskItemProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showDependencyWarning, setShowDependencyWarning] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<TaskStatus | null>(null);
  const [showSwipeActions, setShowSwipeActions] = useState(false);
  const updateTaskStatus = useUpdateTaskStatus();
  const { toast } = useToast();
  const { isMobile, isSmallScreen, isTouchDevice } = useTouchFriendly();
  
  // Fetch incomplete prerequisites when task status might change to completed
  const { data: incompletePrerequisites = [] } = useIncompletePrerequisites(
    task.status !== 'completed' ? task.id : null
  );
  
  // Swipe gesture for mobile actions
  const { elementRef: swipeRef } = useSwipeGesture<HTMLDivElement>({
    onSwipeLeft: () => {
      if (isTouchDevice && onEdit && onDelete) {
        setShowSwipeActions(true);
        setTimeout(() => setShowSwipeActions(false), 3000);
      }
    },
    onSwipeRight: () => {
      if (isTouchDevice) {
        setShowSwipeActions(false);
      }
    },
    enabled: isTouchDevice && !isExpanded,
  });
  
  // Determine task status icon and color
  const getStatusIcon = () => {
    if (isBlocked) {
      return <Lock className="w-5 h-5 text-gray-500" aria-label="Task blocked by dependencies" />;
    }
    
    switch (task.status) {
      case 'completed':
        return <CheckCircle2 className="w-5 h-5 text-green-500" aria-label="Task completed" />;
      case 'in_progress':
        return <Clock className="w-5 h-5 text-orange-500" aria-label="Task in progress" />;
      case 'skipped':
        return <Circle className="w-5 h-5 text-gray-500 opacity-50" aria-label="Task skipped" />;
      default:
        return <Circle className="w-5 h-5 text-gray-400" aria-label="Task not started" />;
    }
  };
  
  // Handle status toggle
  const handleStatusToggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    // Prevent toggling if blocked
    if (isBlocked) {
      toast({
        title: 'Task Blocked',
        description: 'Complete prerequisite tasks first',
        variant: 'destructive',
      });
      return;
    }
    
    // Determine next status
    let nextStatus: TaskStatus;
    if (task.status === 'completed') {
      nextStatus = 'not_started';
    } else if (task.status === 'not_started') {
      nextStatus = 'in_progress';
    } else if (task.status === 'in_progress') {
      nextStatus = 'completed';
    } else {
      nextStatus = 'not_started';
    }
    
    // Check for incomplete prerequisites when trying to complete
    // Requirements: 5.5 - Show warning when user tries to complete task with incomplete prerequisites
    if (nextStatus === 'completed' && incompletePrerequisites.length > 0) {
      setPendingStatus(nextStatus);
      setShowDependencyWarning(true);
      return;
    }
    
    // Proceed with status update
    await performStatusUpdate(nextStatus, false);
  };
  
  // Perform the actual status update
  const performStatusUpdate = async (nextStatus: TaskStatus, override: boolean) => {
    try {
      await updateTaskStatus.mutateAsync({
        id: task.id,
        status: nextStatus,
        overridePrerequisites: override,
      });
      
      // Show success feedback with animations
      if (nextStatus === 'completed') {
        if (override) {
          toast({
            title: '✨ Task Completed (Override)',
            description: 'Task marked complete despite incomplete prerequisites',
            duration: 3000,
          });
        } else {
          toast({
            title: '✨ Task Completed!',
            description: 'Great progress on your action plan',
            duration: 3000,
          });
        }
      } else if (nextStatus === 'in_progress') {
        toast({
          title: '🚀 Task Started',
          description: 'Keep up the momentum!',
          duration: 2000,
        });
      }
    } catch (error) {
      toast({
        title: 'Update Failed',
        description: 'Could not update task status. Please try again.',
        variant: 'destructive',
      });
    }
  };
  
  // Handle dependency warning confirmation
  // Requirements: 5.5 - Allow override option with confirmation
  const handleDependencyWarningConfirm = async () => {
    setShowDependencyWarning(false);
    if (pendingStatus) {
      await performStatusUpdate(pendingStatus, true);
      setPendingStatus(null);
    }
  };
  
  // Handle dependency warning cancel
  const handleDependencyWarningCancel = () => {
    setShowDependencyWarning(false);
    setPendingStatus(null);
  };
  
  // Handle edit action
  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onEdit) {
      onEdit(task);
    }
  };
  
  // Handle delete action
  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onDelete) {
      onDelete(task.id);
    }
  };
  
  // Toggle expanded state
  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };
  
  // Parse resources if they're stored as JSON
  const resources = Array.isArray(task.resources) 
    ? task.resources 
    : [];
  
  return (
    <>
      {/* Dependency Warning Dialog */}
      <DependencyWarningDialog
        open={showDependencyWarning}
        onOpenChange={handleDependencyWarningCancel}
        onConfirm={handleDependencyWarningConfirm}
        task={task}
        incompletePrerequisites={incompletePrerequisites}
      />
      
      <div
        ref={swipeRef}
        className={cn(
          "group relative rounded-lg border transition-all duration-300",
          isSelected && "ring-2 ring-purple-500 border-purple-500",
          isRecentlyUpdated
            ? "border-blue-500/50 bg-blue-500/10 shadow-lg shadow-blue-500/20 ring-2 ring-blue-500/30 animate-pulse"
            : task.status === 'completed' 
            ? "border-green-500/30 bg-green-500/5 animate-in fade-in slide-in-from-left-2"
            : task.status === 'in_progress'
            ? "border-orange-500/30 bg-orange-500/5 animate-in fade-in slide-in-from-left-2"
            : task.status === 'skipped'
            ? "border-gray-500/20 bg-gray-500/5 opacity-60"
            : isNewlyAvailable
            ? "border-emerald-500/50 bg-emerald-500/10 shadow-lg shadow-emerald-500/20 animate-pulse"
            : "border-gray-700 bg-gray-900/50",
          "hover:border-purple-500/50 hover:bg-gray-900/70",
          !isTouchDevice && "hover:scale-[1.01]",
          isBlocked && "opacity-70 border-yellow-500/30",
          isTouchDevice && "active:scale-[0.99]"
        )}
        data-testid={`task-item-${task.id}`}
      >
      <div className={cn(
        "flex items-start space-x-3",
        isSmallScreen ? "p-3" : "p-4"
      )}>
        {/* Drag Handle */}
        {isDraggable && (
          <button
            {...dragHandleProps}
            className={cn(
              "flex-shrink-0 cursor-grab active:cursor-grabbing",
              "text-gray-500 hover:text-purple-400",
              "opacity-0 group-hover:opacity-100 transition-opacity",
              "focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 rounded"
            )}
            aria-label="Drag to reorder task"
            data-testid={`task-drag-handle-${task.id}`}
          >
            <GripVertical className="w-5 h-5" />
          </button>
        )}
        
        {/* Status Checkbox/Icon - Larger touch target on mobile */}
        <button
          onClick={handleStatusToggle}
          disabled={isBlocked}
          className={cn(
            "flex-shrink-0 transition-transform",
            !isTouchDevice && "hover:scale-110",
            isTouchDevice && "active:scale-95",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 rounded",
            isBlocked && "cursor-not-allowed",
            isTouchDevice && "p-2 -m-2" // Larger touch target
          )}
          aria-label={
            isBlocked 
              ? "Task blocked by dependencies" 
              : `Toggle task status (currently ${task.status})`
          }
          data-testid={`task-status-toggle-${task.id}`}
        >
          {getStatusIcon()}
        </button>
        
        {/* Task Content */}
        <div className="flex-1 min-w-0">
          {/* Task Title and Actions */}
          <div className="flex items-start justify-between space-x-2">
            <button
              onClick={toggleExpanded}
              className={cn(
                "flex-1 text-left group/title",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 rounded"
              )}
              data-testid={`task-title-${task.id}`}
            >
              <h4
                className={cn(
                  "font-medium transition-colors",
                  isSmallScreen ? "text-xs" : "text-sm",
                  task.status === 'completed' 
                    ? "text-green-400 line-through"
                    : task.status === 'skipped'
                    ? "text-gray-500 line-through"
                    : "text-white group-hover/title:text-purple-400"
                )}
              >
                {task.title}
                {task.isCustom && (
                  <span className={cn(
                    "ml-2 text-purple-400",
                    isSmallScreen ? "text-[10px]" : "text-xs"
                  )}>(Custom)</span>
                )}
                {isTouchDevice && showSwipeActions && (
                  <span className="ml-2 text-xs text-blue-400 animate-pulse">
                    ← Swipe for actions
                  </span>
                )}
              </h4>
              
              {/* Quick Info */}
              <div className="flex items-center space-x-3 mt-1 text-xs text-gray-400">
                {task.estimatedTime && (
                  <span className="flex items-center space-x-1">
                    <Clock className="w-3 h-3" />
                    <span>{task.estimatedTime}</span>
                  </span>
                )}
                
                {isBlocked && (
                  <span className="flex items-center space-x-1 text-yellow-500">
                    <Lock className="w-3 h-3" />
                    <span>Blocked by {prerequisiteTasks.length} task{prerequisiteTasks.length !== 1 ? 's' : ''}</span>
                  </span>
                )}
                
                {isNewlyAvailable && !isBlocked && task.status === 'not_started' && (
                  <span className="flex items-center space-x-1 text-emerald-400 font-medium">
                    <Unlock className="w-3 h-3" />
                    <span>Ready to start!</span>
                  </span>
                )}
                
                {resources.length > 0 && (
                  <span>{resources.length} resource{resources.length !== 1 ? 's' : ''}</span>
                )}
                
                {dependentTasks.length > 0 && (
                  <span className="flex items-center space-x-1 text-blue-400">
                    <ArrowRight className="w-3 h-3" />
                    <span>{dependentTasks.length} dependent{dependentTasks.length !== 1 ? 's' : ''}</span>
                  </span>
                )}
                
                {isExpanded ? (
                  <ChevronUp className="w-3 h-3" />
                ) : (
                  <ChevronDown className="w-3 h-3" />
                )}
              </div>
            </button>
            
            {/* Action Buttons - Always visible on mobile/touch, hover on desktop */}
            <div className={cn(
              "flex items-center space-x-1 transition-opacity",
              isTouchDevice || showSwipeActions ? "opacity-100" : "opacity-0 group-hover:opacity-100"
            )}>
              {onEdit && (
                <Button
                  variant="ghost"
                  size={isTouchDevice ? "default" : "sm"}
                  onClick={handleEdit}
                  className={cn(
                    "text-gray-400 hover:text-purple-400 hover:bg-purple-500/10",
                    isTouchDevice ? "h-10 w-10 p-0" : "h-8 w-8 p-0"
                  )}
                  aria-label="Edit task"
                  data-testid={`task-edit-${task.id}`}
                >
                  <Edit2 className={cn(isTouchDevice ? "w-5 h-5" : "w-4 h-4")} />
                </Button>
              )}
              
              {onDelete && (
                <Button
                  variant="ghost"
                  size={isTouchDevice ? "default" : "sm"}
                  onClick={handleDelete}
                  className={cn(
                    "text-gray-400 hover:text-red-400 hover:bg-red-500/10",
                    isTouchDevice ? "h-10 w-10 p-0" : "h-8 w-8 p-0"
                  )}
                  aria-label="Delete task"
                  data-testid={`task-delete-${task.id}`}
                >
                  <Trash2 className={cn(isTouchDevice ? "w-5 h-5" : "w-4 h-4")} />
                </Button>
              )}
            </div>
          </div>
          
          {/* Expanded Details */}
          {isExpanded && (
            <div 
              className="mt-3 space-y-3 animate-in fade-in slide-in-from-top-2 duration-200"
              data-testid={`task-details-${task.id}`}
            >
              {/* Description */}
              {task.description && (
                <div>
                  <p className="text-sm text-gray-300 leading-relaxed">
                    {task.description}
                  </p>
                </div>
              )}
              
              {/* Prerequisites */}
              {prerequisiteTasks.length > 0 && (
                <div className="flex items-start space-x-2 p-3 rounded-lg bg-yellow-500/5 border border-yellow-500/20">
                  <Lock className="w-4 h-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-xs font-medium text-yellow-500 mb-2">
                      Prerequisites ({prerequisiteTasks.length}):
                    </p>
                    <div className="space-y-2">
                      {prerequisiteTasks.map((prereqTask) => (
                        <div 
                          key={prereqTask.id}
                          className="flex items-start space-x-2 text-xs"
                        >
                          {prereqTask.status === 'completed' ? (
                            <CheckCircle2 className="w-3 h-3 text-green-500 mt-0.5 flex-shrink-0" />
                          ) : (
                            <Circle className="w-3 h-3 text-gray-500 mt-0.5 flex-shrink-0" />
                          )}
                          <div className="flex-1">
                            <p className={cn(
                              "font-medium",
                              prereqTask.status === 'completed' 
                                ? "text-green-400 line-through" 
                                : "text-gray-300"
                            )}>
                              {prereqTask.title}
                            </p>
                            {prereqTask.status !== 'completed' && (
                              <p className="text-gray-500 mt-0.5">
                                Must be completed first
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
              
              {/* Dependents */}
              {dependentTasks.length > 0 && (
                <div className="flex items-start space-x-2 p-3 rounded-lg bg-blue-500/5 border border-blue-500/20">
                  <ArrowRight className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-xs font-medium text-blue-500 mb-2">
                      Blocks {dependentTasks.length} task{dependentTasks.length !== 1 ? 's' : ''}:
                    </p>
                    <div className="space-y-2">
                      {dependentTasks.map((depTask) => (
                        <div 
                          key={depTask.id}
                          className="flex items-start space-x-2 text-xs"
                        >
                          <Lock className="w-3 h-3 text-gray-500 mt-0.5 flex-shrink-0" />
                          <div className="flex-1">
                            <p className="text-gray-300 font-medium">
                              {depTask.title}
                            </p>
                            <p className="text-gray-500 mt-0.5">
                              Waiting for this task
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
              
              {/* Resources */}
              {resources.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-gray-400 mb-2">
                    Resources:
                  </p>
                  <div className="space-y-1">
                    {resources.map((resource: string, idx: number) => (
                      <a
                        key={idx}
                        href={resource}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={cn(
                          "flex items-center space-x-2 text-xs text-purple-400",
                          "hover:text-purple-300 transition-colors",
                          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 rounded"
                        )}
                      >
                        <ExternalLink className="w-3 h-3" />
                        <span className="truncate">{resource}</span>
                      </a>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Metadata */}
              <div className="flex items-center space-x-4 text-xs text-gray-500 pt-2 border-t border-gray-800">
                {task.completedAt && (
                  <span>
                    Completed: {new Date(task.completedAt).toLocaleDateString()}
                  </span>
                )}
                {task.updatedAt && (
                  <span>
                    Updated: {new Date(task.updatedAt).toLocaleDateString()}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
    </>
  );
}
