import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown, CheckCircle2, Circle, Clock, Sparkles, Plus } from 'lucide-react';
import { useActionPlanStore } from '@/stores/actionPlanStore';
import { useTouchFriendly } from '@/hooks/useTouchFriendly';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import type { PlanPhaseWithTasks, PlanTask } from '@/types/action-plan';
import { TaskItem } from './TaskItem';
import { TaskEditor } from './TaskEditor';
import { DeleteTaskDialog } from './DeleteTaskDialog';
import { useDeleteTask, useUpdateTaskStatus, useReorderTasks, usePlanDependencies } from '@/hooks/useActionPlan';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { SortableTaskItem } from './SortableTaskItem';

interface PhaseAccordionProps {
  phase: PlanPhaseWithTasks;
  planId: number;
  plan?: import('@/types/action-plan').ActionPlanWithDetails;
  recentUpdates?: Map<number, Date>;
}

/**
 * PhaseAccordion Component
 * 
 * Collapsible phase section with:
 * - Expand/collapse functionality
 * - Phase progress indicator when collapsed
 * - Smooth animations
 * - Keyboard navigation (Arrow keys, Enter)
 * - Neon Flame theme styling
 * 
 * Requirements: 1.1, 1.2
 */
export function PhaseAccordion({ phase, planId, plan, recentUpdates }: PhaseAccordionProps) {
  const { expandedPhases, togglePhase, selectedTaskId } = useActionPlanStore();
  const isExpanded = expandedPhases.has(phase.id);
  const contentRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const { toast } = useToast();
  const { isMobile, isSmallScreen, isTouchDevice } = useTouchFriendly();
  
  // Track previous completion state for celebration
  const [wasCompleted, setWasCompleted] = useState(false);
  
  // Task editor state
  const [isTaskEditorOpen, setIsTaskEditorOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<PlanTask | undefined>(undefined);
  
  // Task deletion state
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<PlanTask | null>(null);
  
  // Drag and drop state
  const [activeId, setActiveId] = useState<number | null>(null);
  const [localTasks, setLocalTasks] = useState<PlanTask[]>([]);
  
  // Track newly available tasks
  const [newlyAvailableTasks, setNewlyAvailableTasks] = useState<Set<number>>(new Set());
  const [previousBlockedTasks, setPreviousBlockedTasks] = useState<Set<number>>(new Set());
  
  // Mutations
  const deleteTask = useDeleteTask();
  const updateTaskStatus = useUpdateTaskStatus();
  const reorderTasks = useReorderTasks(planId);
  
  // Fetch dependencies for the plan
  const { data: dependencyMap } = usePlanDependencies(planId);
  
  // Initialize local tasks from phase
  useEffect(() => {
    setLocalTasks([...phase.tasks].sort((a, b) => a.order - b.order));
  }, [phase.tasks]);
  
  // Helper function to check if a task is blocked
  const isTaskBlocked = (taskId: number): boolean => {
    if (!dependencyMap || !plan) return false;
    
    const deps = dependencyMap.get(taskId);
    if (!deps || deps.prerequisites.length === 0) return false;
    
    // Get all tasks from all phases
    const allTasks = plan.phases.flatMap(p => p.tasks);
    
    // Check if any prerequisite is not completed
    return deps.prerequisites.some((prereqId: number) => {
      const prereqTask = allTasks.find((t: PlanTask) => t.id === prereqId);
      return prereqTask && prereqTask.status !== 'completed';
    });
  };
  
  // Helper function to get prerequisite tasks
  const getPrerequisiteTasks = (taskId: number): PlanTask[] => {
    if (!dependencyMap || !plan) return [];
    
    const deps = dependencyMap.get(taskId);
    if (!deps || deps.prerequisites.length === 0) return [];
    
    const allTasks: PlanTask[] = plan.phases.flatMap((p) => p.tasks);
    return deps.prerequisites
      .map((prereqId: number) => allTasks.find((t: PlanTask) => t.id === prereqId))
      .filter((t: PlanTask | undefined): t is PlanTask => t !== undefined);
  };
  
  // Helper function to get dependent tasks
  const getDependentTasks = (taskId: number): PlanTask[] => {
    if (!dependencyMap || !plan) return [];
    
    const deps = dependencyMap.get(taskId);
    if (!deps || deps.dependents.length === 0) return [];
    
    const allTasks: PlanTask[] = plan.phases.flatMap((p) => p.tasks);
    return deps.dependents
      .map((depId: number) => allTasks.find((t: PlanTask) => t.id === depId))
      .filter((t: PlanTask | undefined): t is PlanTask => t !== undefined);
  };
  
  // Track newly available tasks when prerequisites are completed
  useEffect(() => {
    if (!dependencyMap || !plan) return;
    
    const currentBlockedTasks = new Set<number>();
    
    // Check all tasks in this phase
    localTasks.forEach(task => {
      if (isTaskBlocked(task.id)) {
        currentBlockedTasks.add(task.id);
      }
    });
    
    // Find tasks that were blocked but are now available
    const newlyAvailable = new Set<number>();
    previousBlockedTasks.forEach(taskId => {
      if (!currentBlockedTasks.has(taskId)) {
        const task = localTasks.find(t => t.id === taskId);
        if (task && task.status === 'not_started') {
          newlyAvailable.add(taskId);
          
          // Show toast notification
          toast({
            title: '✨ Task Ready!',
            description: `"${task.title}" is now ready to start`,
            duration: 5000,
          });
        }
      }
    });
    
    setNewlyAvailableTasks(newlyAvailable);
    setPreviousBlockedTasks(currentBlockedTasks);
    
    // Clear newly available status after 10 seconds
    if (newlyAvailable.size > 0) {
      const timeout = setTimeout(() => {
        setNewlyAvailableTasks(new Set());
      }, 10000);
      
      return () => clearTimeout(timeout);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localTasks, dependencyMap, plan]);
  
  // Configure drag sensors - Add TouchSensor for mobile
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px movement required before drag starts
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 250, // 250ms delay for touch to distinguish from scrolling
        tolerance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );
  
  // Handle drag start
  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as number);
  };
  
  // Handle drag end
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    setActiveId(null);
    
    if (!over || active.id === over.id) {
      return;
    }
    
    const oldIndex = localTasks.findIndex((task) => task.id === active.id);
    const newIndex = localTasks.findIndex((task) => task.id === over.id);
    
    if (oldIndex === -1 || newIndex === -1) {
      return;
    }
    
    // Optimistically update local state
    const reorderedTasks = arrayMove(localTasks, oldIndex, newIndex);
    setLocalTasks(reorderedTasks);
    
    // Send reorder request to server
    const taskIds = reorderedTasks.map((task) => task.id);
    
    reorderTasks.mutate(
      { phaseId: phase.id, taskIds },
      {
        onError: () => {
          // Rollback on error
          setLocalTasks([...phase.tasks].sort((a, b) => a.order - b.order));
          
          toast({
            title: 'Reorder Failed',
            description: 'Could not reorder tasks. Please try again.',
            variant: 'destructive',
          });
        },
        onSuccess: () => {
          toast({
            title: 'Tasks Reordered',
            description: 'Task order updated successfully.',
            duration: 2000,
          });
        },
      }
    );
  };
  
  // Get the active task for drag overlay
  const activeTask = activeId ? localTasks.find((task) => task.id === activeId) : null;
  
  // Calculate phase progress
  const completedTasks = phase.tasks.filter(t => t.status === 'completed').length;
  const totalTasks = phase.tasks.length;
  const progressPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  const isPhaseComplete = completedTasks === totalTasks && totalTasks > 0;
  
  // Celebrate phase completion
  useEffect(() => {
    if (isPhaseComplete && !wasCompleted) {
      setWasCompleted(true);
      
      // Show celebration toast
      toast({
        title: '🎉 Phase Complete!',
        description: `Congratulations! You've completed "${phase.name}"`,
        duration: 5000,
      });
    } else if (!isPhaseComplete && wasCompleted) {
      setWasCompleted(false);
    }
  }, [isPhaseComplete, wasCompleted, phase.name, toast]);
  
  // Determine phase status icon
  const getPhaseIcon = () => {
    if (completedTasks === totalTasks && totalTasks > 0) {
      return <CheckCircle2 className="w-5 h-5 text-green-500" />;
    }
    if (completedTasks > 0) {
      return <Clock className="w-5 h-5 text-orange-500" />;
    }
    return <Circle className="w-5 h-5 text-gray-500" />;
  };
  
  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    switch (e.key) {
      case 'Enter':
      case ' ':
        e.preventDefault();
        togglePhase(phase.id);
        break;
      case 'ArrowDown':
        e.preventDefault();
        // Focus next phase accordion
        const nextElement = triggerRef.current?.parentElement?.nextElementSibling?.querySelector('button');
        if (nextElement instanceof HTMLElement) {
          nextElement.focus();
        }
        break;
      case 'ArrowUp':
        e.preventDefault();
        // Focus previous phase accordion
        const prevElement = triggerRef.current?.parentElement?.previousElementSibling?.querySelector('button');
        if (prevElement instanceof HTMLElement) {
          prevElement.focus();
        }
        break;
    }
  };
  
  // Smooth animation for content
  useEffect(() => {
    if (!contentRef.current) return;
    
    if (isExpanded) {
      const height = contentRef.current.scrollHeight;
      contentRef.current.style.height = `${height}px`;
      
      // Remove height after animation completes
      const timeout = setTimeout(() => {
        if (contentRef.current) {
          contentRef.current.style.height = 'auto';
        }
      }, 300);
      
      return () => clearTimeout(timeout);
    } else {
      // Set explicit height before collapsing
      const height = contentRef.current.scrollHeight;
      contentRef.current.style.height = `${height}px`;
      
      // Force reflow
      contentRef.current.offsetHeight;
      
      // Collapse
      contentRef.current.style.height = '0px';
    }
  }, [isExpanded]);
  
  return (
    <div className={cn(
      "flame-card overflow-hidden transition-all duration-300",
      isPhaseComplete && "ring-2 ring-green-500/50 shadow-lg shadow-green-500/20"
    )}>
      {/* Accordion Trigger */}
      <button
        ref={triggerRef}
        onClick={() => togglePhase(phase.id)}
        onKeyDown={handleKeyDown}
        className={cn(
          "w-full flex items-center justify-between",
          "transition-all duration-200",
          "hover:bg-white/5 focus-visible:bg-white/5",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500",
          "group",
          isPhaseComplete && "bg-green-500/5",
          isSmallScreen ? "px-4 py-3" : "px-6 py-4",
          isTouchDevice && "active:bg-white/10"
        )}
        aria-expanded={isExpanded}
        aria-controls={`phase-content-${phase.id}`}
        data-testid={`phase-accordion-trigger-${phase.id}`}
      >
        <div className="flex items-center space-x-4 flex-1 text-left">
          {/* Phase Icon */}
          <div className="flex-shrink-0 relative">
            {getPhaseIcon()}
            {isPhaseComplete && (
              <Sparkles className="w-3 h-3 text-yellow-400 absolute -top-1 -right-1 animate-pulse" />
            )}
          </div>
          
          {/* Phase Info */}
          <div className="flex-1 min-w-0">
            <h3 className={cn(
              "font-semibold mb-1 transition-colors",
              isSmallScreen ? "text-base" : "text-lg",
              isPhaseComplete ? "text-green-400" : "text-white"
            )}>
              {phase.name}
              {isPhaseComplete && (
                <span className="ml-2 text-sm">✨</span>
              )}
            </h3>
            
            {/* Progress Indicator (shown when collapsed) */}
            {!isExpanded && (
              <div className={cn(
                "flex items-center space-x-3",
                isSmallScreen && "flex-col items-start space-x-0 space-y-2"
              )}>
                <span className={cn(
                  "text-gray-400",
                  isSmallScreen ? "text-xs" : "text-sm"
                )}>
                  {completedTasks} of {totalTasks} tasks completed
                </span>
                
                {/* Progress Bar */}
                <div className={cn(
                  "flex-1",
                  isSmallScreen ? "w-full" : "max-w-xs"
                )}>
                  <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                    <div
                      className={cn(
                        "h-full transition-all duration-500 rounded-full",
                        progressPercentage === 100 
                          ? "bg-gradient-to-r from-green-500 to-emerald-500"
                          : progressPercentage > 0
                          ? "bg-gradient-to-r from-purple-500 to-pink-500"
                          : "bg-gray-700"
                      )}
                      style={{ width: `${progressPercentage}%` }}
                      role="progressbar"
                      aria-valuenow={progressPercentage}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-label={`Phase progress: ${progressPercentage}%`}
                    />
                  </div>
                </div>
                
                <span className={cn(
                  "font-semibold text-white",
                  isSmallScreen ? "text-xs" : "text-sm"
                )}>
                  {progressPercentage}%
                </span>
              </div>
            )}
            
            {/* Description (shown when expanded) */}
            {isExpanded && phase.description && (
              <p className="text-sm text-gray-400 mt-1">
                {phase.description}
              </p>
            )}
          </div>
        </div>
        
        {/* Chevron Icon */}
        <ChevronDown
          className={cn(
            "w-5 h-5 text-gray-400 transition-transform duration-300 flex-shrink-0 ml-4",
            "group-hover:text-purple-400",
            isExpanded && "rotate-180"
          )}
          aria-hidden="true"
        />
      </button>
      
      {/* Accordion Content */}
      <div
        ref={contentRef}
        id={`phase-content-${phase.id}`}
        className={cn(
          "overflow-hidden transition-all duration-300 ease-in-out",
          !isExpanded && "h-0"
        )}
        style={{ height: isExpanded ? 'auto' : '0px' }}
        data-testid={`phase-content-${phase.id}`}
      >
        <div className={cn(
          "pb-6 pt-2",
          isSmallScreen ? "px-4" : "px-6"
        )}>
          {/* Estimated Duration */}
          {phase.estimatedDuration && (
            <div className={cn(
              "mb-4 flex items-center space-x-2 text-gray-400",
              isSmallScreen ? "text-xs" : "text-sm"
            )}>
              <Clock className={cn(isSmallScreen ? "w-3 h-3" : "w-4 h-4")} />
              <span>Estimated duration: {phase.estimatedDuration}</span>
            </div>
          )}
          
          {/* Task List with Drag and Drop */}
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <div className="space-y-2">
              {localTasks.length > 0 ? (
                <SortableContext
                  items={localTasks.map((task) => task.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {localTasks.map((task) => (
                    <SortableTaskItem
                      key={task.id}
                      task={task}
                      isBlocked={isTaskBlocked(task.id)}
                      prerequisiteTasks={getPrerequisiteTasks(task.id)}
                      dependentTasks={getDependentTasks(task.id)}
                      isNewlyAvailable={newlyAvailableTasks.has(task.id)}
                      isRecentlyUpdated={recentUpdates?.has(task.id)}
                      isSelected={selectedTaskId === task.id}
                      onEdit={(task: PlanTask) => {
                        setEditingTask(task);
                        setIsTaskEditorOpen(true);
                      }}
                      onDelete={(taskId: number) => {
                        const task = localTasks.find(t => t.id === taskId);
                        if (task) {
                          setTaskToDelete(task);
                          setIsDeleteDialogOpen(true);
                        }
                      }}
                    />
                  ))}
                </SortableContext>
              ) : (
                <div className="text-sm text-gray-500 italic">
                  No tasks in this phase yet
                </div>
              )}
            </div>
            
            {/* Drag Overlay */}
            <DragOverlay>
              {activeTask ? (
                <div className="opacity-80 rotate-2 scale-105">
                  <TaskItem
                    task={activeTask}
                    isBlocked={false}
                    prerequisiteTasks={[]}
                    dependentTasks={[]}
                    isDraggable={true}
                  />
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
          
          {/* Add Task Button */}
          <div className="mt-4 pt-4 border-t border-gray-800">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setEditingTask(undefined);
                setIsTaskEditorOpen(true);
              }}
              className="w-full sm:w-auto"
              data-testid={`add-task-button-${phase.id}`}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Task
            </Button>
          </div>
        </div>
      </div>
      
      {/* Task Editor Modal */}
      <TaskEditor
        task={editingTask}
        phaseId={phase.id}
        planId={planId}
        open={isTaskEditorOpen}
        onOpenChange={(open) => {
          setIsTaskEditorOpen(open);
          if (!open) {
            setEditingTask(undefined);
          }
        }}
        currentTaskCount={phase.tasks.length}
        plan={plan}
      />
      
      {/* Delete Task Dialog */}
      <DeleteTaskDialog
        task={taskToDelete}
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        onConfirm={async () => {
          if (!taskToDelete) return;
          
          try {
            await deleteTask.mutateAsync(taskToDelete.id);
            
            toast({
              title: 'Task Deleted',
              description: `"${taskToDelete.title}" has been removed from your action plan.`,
              duration: 3000,
            });
            
            setTaskToDelete(null);
          } catch (error) {
            toast({
              title: 'Delete Failed',
              description: error instanceof Error ? error.message : 'Could not delete task. Please try again.',
              variant: 'destructive',
            });
          }
        }}
        onSkip={async () => {
          if (!taskToDelete) return;
          
          try {
            await updateTaskStatus.mutateAsync({
              id: taskToDelete.id,
              status: 'skipped',
            });
            
            toast({
              title: 'Task Skipped',
              description: `"${taskToDelete.title}" has been marked as skipped.`,
              duration: 3000,
            });
            
            setTaskToDelete(null);
          } catch (error) {
            toast({
              title: 'Skip Failed',
              description: error instanceof Error ? error.message : 'Could not skip task. Please try again.',
              variant: 'destructive',
            });
          }
        }}
      />
    </div>
  );
}
