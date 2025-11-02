import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { Loader2, AlertCircle, CheckCircle2, Trophy, Sparkles, BarChart3, Users, Wifi, WifiOff } from 'lucide-react';
import { 
  useActionPlan, 
  useActionPlanProgress, 
  useApplyTemplate, 
  useProgressHistory, 
  useUpdatePlanStatus,
  useRecommendations,
  useDismissRecommendation,
  useUpdateTask,
  useCreateTask,
  useDeleteTask,
  useReorderTasks,
} from '@/hooks/useActionPlan';
import { usePlanWebSocket } from '@/hooks/usePlanWebSocket';
import { useActionPlanStore } from '@/stores/actionPlanStore';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { useTouchFriendly } from '@/hooks/useTouchFriendly';
import { UndoRedoProvider, useUndoRedoContext } from '@/contexts/UndoRedoContext';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { PhaseAccordion } from './PhaseAccordion';
import { TemplateSelector } from './TemplateSelector';
import { TemplateWarningDialog } from './TemplateWarningDialog';
import { ProgressDashboard } from './ProgressDashboard';
import { CompletionCelebrationModal } from './CompletionCelebrationModal';
import { NextActionsView } from './NextActionsView';
import { RecommendationsSidebar } from './RecommendationsSidebar';
import { InlineRecommendations } from './InlineRecommendations';
import { KeyboardShortcutsDialog } from './KeyboardShortcutsDialog';
import { UndoRedoControls } from './UndoRedoControls';
import type { Recommendation, PlanTask, TaskUpdate } from '@/types/action-plan';

interface ActionPlanViewProps {
  searchId: number;
  onComplete?: () => void;
}

/**
 * ActionPlanView Component
 * 
 * Main container for interactive action plan display with:
 * - TanStack Query integration for data fetching
 * - Loading and error states
 * - Retry logic
 * - Overall progress bar
 * - Zustand store for UI state management
 * - Undo/Redo functionality
 */
export function ActionPlanView({ searchId, onComplete }: ActionPlanViewProps) {
  const { toast } = useToast();
  
  return (
    <UndoRedoProvider
      maxHistory={20}
      onUndo={(action) => {
        toast({
          title: 'Undone',
          description: action.description,
          duration: 2000,
        });
      }}
      onRedo={(action) => {
        toast({
          title: 'Redone',
          description: action.description,
          duration: 2000,
        });
      }}
    >
      <ActionPlanViewInner searchId={searchId} onComplete={onComplete} />
    </UndoRedoProvider>
  );
}

/**
 * Inner component that has access to UndoRedoContext
 */
function ActionPlanViewInner({ searchId, onComplete }: ActionPlanViewProps) {
  const {
    data: plan,
    isLoading,
    error,
    refetch,
  } = useActionPlan(searchId);
  
  const {
    data: progress,
    isLoading: isLoadingProgress,
  } = useActionPlanProgress(plan?.id || null);
  
  const {
    data: progressHistory,
  } = useProgressHistory(plan?.id || null);
  
  const {
    data: recommendations = [],
  } = useRecommendations(plan?.id || null);
  
  const applyTemplate = useApplyTemplate(plan?.id || 0);
  const updatePlanStatus = useUpdatePlanStatus(plan?.id || 0);
  const dismissRecommendation = useDismissRecommendation();
  const updateTask = useUpdateTask();
  const createTask = useCreateTask(plan?.id || 0);
  const deleteTask = useDeleteTask();
  const reorderTasks = useReorderTasks(plan?.id || 0);
  
  const { reset, selectedTaskId, selectTask, expandedPhases, togglePhase } = useActionPlanStore();
  const { toast } = useToast();
  
  // Undo/Redo functionality from context
  const {
    canUndo,
    canRedo,
    undo,
    redo,
    addAction,
    nextUndoDescription,
    nextRedoDescription,
    isPerforming: isUndoRedoPerforming,
  } = useUndoRedoContext();
  const [hasShownCompletion, setHasShownCompletion] = useState(false);
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [showTemplateSelector, setShowTemplateSelector] = useState(false);
  const [showTemplateWarning, setShowTemplateWarning] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(null);
  const [selectedTemplateName, setSelectedTemplateName] = useState<string>('');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [dismissedRecommendations, setDismissedRecommendations] = useState<Set<string>>(new Set());
  const [recentUpdates, setRecentUpdates] = useState<Map<number, Date>>(new Map());
  const [showKeyboardShortcuts, setShowKeyboardShortcuts] = useState(false);
  const [taskEditorOpen, setTaskEditorOpen] = useState(false);
  
  // Mobile optimization
  const { isMobile, isSmallScreen, isTouchDevice } = useTouchFriendly();
  
  // Get all tasks in order for keyboard navigation
  const allTasks = useMemo(() => {
    if (!plan) return [];
    
    const tasks: Array<PlanTask & { phaseId: number; phaseName: string }> = [];
    plan.phases.forEach(phase => {
      phase.tasks.forEach(task => {
        tasks.push({
          ...task,
          phaseId: phase.id,
          phaseName: phase.name,
        });
      });
    });
    
    return tasks;
  }, [plan]);
  
  // Find current task index
  const currentTaskIndex = useMemo(() => {
    if (!selectedTaskId) return -1;
    return allTasks.findIndex(t => t.id === selectedTaskId);
  }, [selectedTaskId, allTasks]);
  
  // Navigate to previous task
  const navigateToPreviousTask = useCallback(() => {
    if (allTasks.length === 0) return;
    
    const newIndex = currentTaskIndex <= 0 
      ? allTasks.length - 1 
      : currentTaskIndex - 1;
    
    const task = allTasks[newIndex];
    selectTask(task.id);
    
    // Ensure the phase is expanded
    if (!expandedPhases.has(task.phaseId)) {
      togglePhase(task.phaseId);
    }
    
    // Scroll to task
    setTimeout(() => {
      const element = document.querySelector(`[data-testid="task-item-${task.id}"]`);
      element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
  }, [allTasks, currentTaskIndex, selectTask, expandedPhases, togglePhase]);
  
  // Navigate to next task
  const navigateToNextTask = useCallback(() => {
    if (allTasks.length === 0) return;
    
    const newIndex = currentTaskIndex >= allTasks.length - 1 
      ? 0 
      : currentTaskIndex + 1;
    
    const task = allTasks[newIndex];
    selectTask(task.id);
    
    // Ensure the phase is expanded
    if (!expandedPhases.has(task.phaseId)) {
      togglePhase(task.phaseId);
    }
    
    // Scroll to task
    setTimeout(() => {
      const element = document.querySelector(`[data-testid="task-item-${task.id}"]`);
      element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
  }, [allTasks, currentTaskIndex, selectTask, expandedPhases, togglePhase]);
  
  // Edit selected task
  const editSelectedTask = useCallback(() => {
    if (!selectedTaskId) {
      // If no task selected, select the first task
      if (allTasks.length > 0) {
        selectTask(allTasks[0].id);
      }
      return;
    }
    
    const task = allTasks.find(t => t.id === selectedTaskId);
    if (task) {
      // Trigger edit on the task item
      const element = document.querySelector(`[data-testid="task-edit-${task.id}"]`);
      if (element instanceof HTMLElement) {
        element.click();
      }
    }
  }, [selectedTaskId, allTasks, selectTask]);
  
  // Toggle selected task completion
  const toggleSelectedTaskCompletion = useCallback(() => {
    if (!selectedTaskId) {
      // If no task selected, select the first task
      if (allTasks.length > 0) {
        selectTask(allTasks[0].id);
      }
      return;
    }
    
    // Trigger click on the task's status toggle button
    const element = document.querySelector(`[data-testid="task-status-toggle-${selectedTaskId}"]`);
    if (element instanceof HTMLElement) {
      element.click();
    }
  }, [selectedTaskId, allTasks, selectTask]);
  
  // Collapse/expand current phase
  const collapseCurrentPhase = useCallback(() => {
    if (!selectedTaskId) return;
    
    const task = allTasks.find(t => t.id === selectedTaskId);
    if (task && expandedPhases.has(task.phaseId)) {
      togglePhase(task.phaseId);
    }
  }, [selectedTaskId, allTasks, expandedPhases, togglePhase]);
  
  const expandCurrentPhase = useCallback(() => {
    if (!selectedTaskId) return;
    
    const task = allTasks.find(t => t.id === selectedTaskId);
    if (task && !expandedPhases.has(task.phaseId)) {
      togglePhase(task.phaseId);
    }
  }, [selectedTaskId, allTasks, expandedPhases, togglePhase]);
  
  // Keyboard shortcuts
  useKeyboardShortcuts({
    shortcuts: [
      {
        id: 'action-plan-previous-task',
        name: 'Previous Task',
        description: 'Navigate to previous task',
        category: 'navigation',
        defaultShortcut: 'ArrowUp',
        handler: navigateToPreviousTask,
        enabled: !!plan && !taskEditorOpen,
      },
      {
        id: 'action-plan-next-task',
        name: 'Next Task',
        description: 'Navigate to next task',
        category: 'navigation',
        defaultShortcut: 'ArrowDown',
        handler: navigateToNextTask,
        enabled: !!plan && !taskEditorOpen,
      },
      {
        id: 'action-plan-collapse-phase',
        name: 'Collapse Phase',
        description: 'Collapse current phase',
        category: 'navigation',
        defaultShortcut: 'ArrowLeft',
        handler: collapseCurrentPhase,
        enabled: !!plan && !taskEditorOpen,
      },
      {
        id: 'action-plan-expand-phase',
        name: 'Expand Phase',
        description: 'Expand current phase',
        category: 'navigation',
        defaultShortcut: 'ArrowRight',
        handler: expandCurrentPhase,
        enabled: !!plan && !taskEditorOpen,
      },
      {
        id: 'action-plan-toggle-task',
        name: 'Toggle Task',
        description: 'Toggle task completion status',
        category: 'actions',
        defaultShortcut: 'Space',
        handler: toggleSelectedTaskCompletion,
        enabled: !!plan && !taskEditorOpen,
      },
      {
        id: 'action-plan-edit-task',
        name: 'Edit Task',
        description: 'Edit selected task',
        category: 'actions',
        defaultShortcut: 'Enter',
        handler: editSelectedTask,
        enabled: !!plan && !taskEditorOpen,
      },
      {
        id: 'action-plan-undo',
        name: 'Undo',
        description: 'Undo last action',
        category: 'actions',
        defaultShortcut: 'Ctrl+Z',
        handler: () => {
          if (canUndo && !isUndoRedoPerforming) {
            undo();
          }
        },
        enabled: !!plan && canUndo && !isUndoRedoPerforming,
      },
      {
        id: 'action-plan-redo',
        name: 'Redo',
        description: 'Redo last undone action',
        category: 'actions',
        defaultShortcut: 'Ctrl+Y',
        handler: () => {
          if (canRedo && !isUndoRedoPerforming) {
            redo();
          }
        },
        enabled: !!plan && canRedo && !isUndoRedoPerforming,
      },
      {
        id: 'action-plan-help',
        name: 'Show Help',
        description: 'Show keyboard shortcuts help',
        category: 'help',
        defaultShortcut: '?',
        handler: () => setShowKeyboardShortcuts(true),
        enabled: !!plan,
      },
    ],
    enabled: !!plan,
  });
  
  // WebSocket connection for real-time updates
  const { isConnected, participantCount } = usePlanWebSocket({
    planId: plan?.id.toString() || '',
    enabled: !!plan?.id,
    onTaskUpdated: (task: PlanTask) => {
      // Mark task as recently updated
      setRecentUpdates(prev => new Map(prev).set(task.id, new Date()));
      
      // Clear the highlight after 3 seconds
      setTimeout(() => {
        setRecentUpdates(prev => {
          const newMap = new Map(prev);
          newMap.delete(task.id);
          return newMap;
        });
      }, 3000);
      
      // Show toast notification
      toast({
        title: 'Task Updated',
        description: `"${task.title}" was updated by another user`,
        duration: 3000,
      });
    },
    onTaskCreated: (task: PlanTask) => {
      // Mark task as recently updated
      setRecentUpdates(prev => new Map(prev).set(task.id, new Date()));
      
      // Clear the highlight after 3 seconds
      setTimeout(() => {
        setRecentUpdates(prev => {
          const newMap = new Map(prev);
          newMap.delete(task.id);
          return newMap;
        });
      }, 3000);
      
      // Show toast notification
      toast({
        title: 'Task Created',
        description: `"${task.title}" was added by another user`,
        duration: 3000,
      });
    },
    onTaskDeleted: (taskId: string) => {
      // Show toast notification
      toast({
        title: 'Task Deleted',
        description: 'A task was deleted by another user',
        duration: 3000,
      });
    },
    onTaskReordered: () => {
      // Show toast notification
      toast({
        title: 'Tasks Reordered',
        description: 'Task order was updated by another user',
        duration: 3000,
      });
    },
    onProgressUpdated: () => {
      // Progress is automatically refetched by the hook
      // No need for additional action
    },
    onUserJoined: (data) => {
      toast({
        title: 'User Joined',
        description: `${data.userName} is now viewing this plan`,
        duration: 2000,
      });
    },
    onUserLeft: (data) => {
      toast({
        title: 'User Left',
        description: `A user stopped viewing this plan`,
        duration: 2000,
      });
    },
  });
  
  // Reset store on unmount
  useEffect(() => {
    return () => reset();
  }, [reset]);
  
  // Handle template selection
  const handleTemplateSelect = (templateId: number, templateName: string) => {
    setSelectedTemplateId(templateId);
    setSelectedTemplateName(templateName);
    setShowTemplateSelector(false);
    setShowTemplateWarning(true);
  };
  
  // Handle template application confirmation
  const handleConfirmTemplateApplication = async () => {
    if (!selectedTemplateId || !plan) return;
    
    try {
      setShowTemplateWarning(false);
      
      toast({
        title: 'Applying template...',
        description: 'This may take a moment.',
      });
      
      await applyTemplate.mutateAsync(selectedTemplateId);
      
      toast({
        title: 'Template applied successfully',
        description: `Your plan has been updated with the ${selectedTemplateName} template.`,
      });
      
      // Refetch to get updated plan
      refetch();
    } catch (error) {
      toast({
        title: 'Failed to apply template',
        description: error instanceof Error ? error.message : 'An error occurred',
        variant: 'destructive',
      });
    } finally {
      setSelectedTemplateId(null);
      setSelectedTemplateName('');
    }
  };
  
  // Handle archive plan
  const handleArchivePlan = async () => {
    if (!plan) return;
    
    try {
      await updatePlanStatus.mutateAsync('archived');
      
      toast({
        title: 'Plan archived',
        description: 'Your completed plan has been archived.',
      });
      
      setShowCompletionModal(false);
      
      // Navigate back or refresh
      window.location.href = '/dashboard';
    } catch (error) {
      toast({
        title: 'Failed to archive plan',
        description: error instanceof Error ? error.message : 'An error occurred',
        variant: 'destructive',
      });
    }
  };
  
  // Handle start new plan
  const handleStartNewPlan = () => {
    setShowCompletionModal(false);
    
    toast({
      title: 'Ready for your next challenge!',
      description: 'Create a new search to generate a fresh action plan.',
    });
    
    // Navigate to search page
    window.location.href = '/';
  };
  
  // Handle dismiss recommendation
  const handleDismissRecommendation = async (recommendationId: string) => {
    if (!plan) return;
    
    // Optimistically update UI
    setDismissedRecommendations(prev => new Set(prev).add(recommendationId));
    
    try {
      await dismissRecommendation.mutateAsync({
        planId: plan.id,
        recommendationId,
      });
      
      toast({
        title: 'Recommendation dismissed',
        description: 'This recommendation has been hidden.',
        duration: 2000,
      });
    } catch (error) {
      // Rollback on error
      setDismissedRecommendations(prev => {
        const newSet = new Set(prev);
        newSet.delete(recommendationId);
        return newSet;
      });
      
      toast({
        title: 'Failed to dismiss',
        description: 'Could not dismiss recommendation. Please try again.',
        variant: 'destructive',
      });
    }
  };
  
  // Handle apply recommendation
  const handleApplyRecommendation = (recommendation: Recommendation) => {
    // Handle different recommendation types
    switch (recommendation.type) {
      case 'stuck_task':
        // Navigate to the task
        if (recommendation.metadata?.taskId) {
          toast({
            title: 'Suggestion Applied',
            description: 'Consider breaking this task into smaller subtasks.',
          });
        }
        break;
      
      case 'phase_complete':
        // Show resources
        if (recommendation.metadata?.resources) {
          toast({
            title: 'Resources Available',
            description: 'Check out the recommended resources for your next phase.',
          });
        }
        break;
      
      case 'plan_review':
        // Prompt user to review plan
        toast({
          title: 'Plan Review',
          description: 'Take a moment to review your skipped tasks and adjust your plan.',
        });
        break;
      
      case 'fast_progress':
        // Congratulate and suggest timeline adjustment
        toast({
          title: '🎉 Great Progress!',
          description: 'You\'re moving faster than expected. Keep up the momentum!',
        });
        break;
      
      case 'timeline_adjustment':
        // Suggest timeline changes
        toast({
          title: 'Timeline Adjustment',
          description: 'Consider adjusting your timeline based on current progress.',
        });
        break;
      
      default:
        toast({
          title: 'Suggestion Noted',
          description: 'This recommendation has been applied.',
        });
    }
    
    // Dismiss after applying
    handleDismissRecommendation(recommendation.id);
  };
  
  // Handle plan completion with celebration
  useEffect(() => {
    if (progress && progress.completionPercentage === 100 && !hasShownCompletion && plan) {
      setHasShownCompletion(true);
      setShowCompletionModal(true);
      
      // Update plan status to completed
      if (plan.status !== 'completed') {
        updatePlanStatus.mutate('completed');
      }
      
      if (onComplete) {
        onComplete();
      }
    } else if (progress && progress.completionPercentage < 100 && hasShownCompletion) {
      setHasShownCompletion(false);
    }
  }, [progress, onComplete, hasShownCompletion, plan, updatePlanStatus]);
  
  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 animate-spin text-purple-500 mx-auto" />
          <p className="text-gray-400">Loading your action plan...</p>
        </div>
      </div>
    );
  }
  
  // Error state with retry
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Alert variant="destructive" className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="mt-2">
            <p className="mb-4">
              {error instanceof Error ? error.message : 'Failed to load action plan'}
            </p>
            <Button
              onClick={() => refetch()}
              variant="outline"
              size="sm"
              className="w-full"
            >
              Try Again
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }
  
  // No plan found
  if (!plan) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Alert className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="mt-2">
            <p className="mb-4 text-white">
              This search doesn't have an action plan yet. Action plans are automatically generated when you complete a gap analysis search.
            </p>
            <Button
              onClick={() => refetch()}
              variant="outline"
              size="sm"
              className="w-full"
            >
              Refresh
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }
  
  // Filter out dismissed recommendations
  const visibleRecommendations = recommendations.filter(
    rec => !dismissedRecommendations.has(rec.id)
  );
  
  return (
    <div className={cn(
      "flex gap-6",
      isMobile && "flex-col gap-4"
    )}>
      {/* Main Content */}
      <div className="flex-1 min-w-0 space-y-4 md:space-y-6">
        {/* Template Selector Dialog */}
        {showTemplateSelector && (
          <TemplateSelector
            open={showTemplateSelector}
            onOpenChange={setShowTemplateSelector}
            onSelect={handleTemplateSelect}
            currentTemplateId={plan?.templateId || undefined}
          />
        )}
      
      {/* Template Warning Dialog */}
      <TemplateWarningDialog
        open={showTemplateWarning}
        onOpenChange={setShowTemplateWarning}
        onConfirm={handleConfirmTemplateApplication}
        templateName={selectedTemplateName}
      />
      
      {/* Completion Celebration Modal */}
      {plan && progress && (
        <CompletionCelebrationModal
          open={showCompletionModal}
          onOpenChange={setShowCompletionModal}
          plan={plan}
          progress={progress}
          onArchive={handleArchivePlan}
          onStartNew={handleStartNewPlan}
        />
      )}
      
      {/* Keyboard Shortcuts Help Dialog */}
      <KeyboardShortcutsDialog
        open={showKeyboardShortcuts}
        onOpenChange={setShowKeyboardShortcuts}
      />
      
      {/* Completion Celebration Banner */}
      {progress && progress.completionPercentage === 100 && (
        <Card className="flame-card border-green-500/50 bg-gradient-to-r from-green-500/10 to-emerald-500/10 animate-in fade-in slide-in-from-top-4 duration-500">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-4">
              <Trophy className="w-12 h-12 text-yellow-400 animate-bounce" />
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-green-400 mb-1">
                  🎉 Congratulations!
                </h2>
                <p className="text-gray-300">
                  You've completed your entire action plan! All {progress.totalTasks} tasks are done.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Header Section */}
      <div className="space-y-4">
        <div className={cn(
          "flex items-start justify-between",
          isMobile && "flex-col gap-4"
        )}>
          <div className="flex-1 w-full">
            <div className={cn(
              "flex items-center gap-3 mb-2",
              isMobile && "flex-col items-start gap-2"
            )}>
              <h1 className={cn(
                "font-bold text-white",
                isSmallScreen ? "text-2xl" : "text-3xl"
              )}>
                {plan.title}
              </h1>
              
              {/* Connection Status Indicator */}
              <div className={cn(
                "flex items-center gap-2",
                isMobile && "flex-wrap"
              )}>
                <Badge
                  variant={isConnected ? 'default' : 'secondary'}
                  className={cn(
                    'flex items-center gap-1.5 transition-colors',
                    isConnected 
                      ? 'bg-green-500/20 text-green-400 border-green-500/50' 
                      : 'bg-gray-500/20 text-gray-400 border-gray-500/50',
                    isSmallScreen && 'text-xs'
                  )}
                >
                  {isConnected ? (
                    <Wifi className={cn("w-3 h-3", isSmallScreen && "w-2.5 h-2.5")} />
                  ) : (
                    <WifiOff className={cn("w-3 h-3", isSmallScreen && "w-2.5 h-2.5")} />
                  )}
                  {isConnected ? 'Live' : 'Offline'}
                </Badge>
                
                {/* Presence Indicator */}
                {isConnected && participantCount > 1 && (
                  <Badge
                    variant="outline"
                    className={cn(
                      "flex items-center gap-1.5 bg-purple-500/20 text-purple-400 border-purple-500/50",
                      isSmallScreen && 'text-xs'
                    )}
                  >
                    <Users className={cn("w-3 h-3", isSmallScreen && "w-2.5 h-2.5")} />
                    {participantCount} {participantCount === 1 ? 'viewer' : 'viewers'}
                  </Badge>
                )}
              </div>
            </div>
            
            {plan.description && (
              <p className={cn(
                "text-gray-400",
                isSmallScreen ? "text-sm" : "text-lg"
              )}>
                {plan.description}
              </p>
            )}
          </div>
          <div className={cn(
            "flex items-center gap-2",
            isMobile ? "w-full flex-wrap" : "ml-4"
          )}>
            {/* Undo/Redo Controls */}
            <UndoRedoControls
              canUndo={canUndo}
              canRedo={canRedo}
              onUndo={undo}
              onRedo={redo}
              undoDescription={nextUndoDescription}
              redoDescription={nextRedoDescription}
              isPerforming={isUndoRedoPerforming}
            />
            
            <Button
              onClick={() => setShowTemplateSelector(true)}
              variant="outline"
              size={isSmallScreen ? "sm" : "default"}
              className={cn(
                "border-purple-500/50 hover:bg-purple-500/10",
                isMobile && "flex-1"
              )}
            >
              <Sparkles className="w-4 h-4 mr-2" />
              {isSmallScreen ? "Template" : "Change Template"}
            </Button>
          </div>
        </div>
        
        {/* Overall Progress Bar */}
        {progress && !isLoadingProgress && (
          <Card className="flame-card">
            <CardContent className="pt-6">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                    <span className="text-white font-semibold">
                      Overall Progress
                    </span>
                  </div>
                  <span className="text-2xl font-bold text-white">
                    {progress.completionPercentage}%
                  </span>
                </div>
                
                <Progress
                  value={progress.completionPercentage}
                  className="h-3 transition-all duration-500"
                />
                
                <div className="flex items-center justify-between text-sm text-gray-400">
                  <span>
                    {progress.completedTasks} of {progress.totalTasks} tasks completed
                  </span>
                  {progress.inProgressTasks > 0 && (
                    <span>
                      {progress.inProgressTasks} in progress
                    </span>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
      
      {/* Tabs for Plan View, Next Actions, and Dashboard */}
      <Tabs defaultValue="plan" className="w-full">
        <TabsList className={cn(
          "grid w-full grid-cols-3 mb-4 md:mb-6",
          isMobile ? "max-w-full" : "max-w-2xl"
        )}>
          <TabsTrigger value="plan" className={isSmallScreen ? "text-xs px-2" : ""}>
            {isSmallScreen ? "Plan" : "Action Plan"}
          </TabsTrigger>
          <TabsTrigger value="next-actions" className={isSmallScreen ? "text-xs px-2" : ""}>
            <Sparkles className={cn("w-4 h-4", !isSmallScreen && "mr-2")} />
            {!isSmallScreen && "Next Actions"}
          </TabsTrigger>
          <TabsTrigger value="dashboard" className={isSmallScreen ? "text-xs px-2" : ""}>
            <BarChart3 className={cn("w-4 h-4", !isSmallScreen && "mr-2")} />
            {!isSmallScreen && "Dashboard"}
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="plan" className="space-y-4">
          {/* Inline Recommendations */}
          {visibleRecommendations.length > 0 && (
            <InlineRecommendations
              recommendations={visibleRecommendations}
              onDismiss={handleDismissRecommendation}
              onApply={handleApplyRecommendation}
              maxVisible={2}
            />
          )}
          
          {/* Phase Accordions */}
          {plan.phases.map((phase) => (
            <PhaseAccordion
              key={phase.id}
              phase={phase}
              planId={plan.id}
              plan={plan}
              recentUpdates={recentUpdates}
            />
          ))}
        </TabsContent>
        
        <TabsContent value="next-actions">
          <NextActionsView
            plan={plan}
            onEditTask={(task) => {
              // Find the phase for this task and open the editor
              const phase = plan.phases.find(p => p.tasks.some(t => t.id === task.id));
              if (phase) {
                // This will be handled by the phase accordion
                console.log('Edit task from Next Actions:', task);
              }
            }}
            onDeleteTask={(taskId) => {
              // This will be handled by the phase accordion
              console.log('Delete task from Next Actions:', taskId);
            }}
          />
        </TabsContent>
        
        <TabsContent value="dashboard">
          {progress && (
            <ProgressDashboard
              progress={progress}
              phases={plan.phases}
              progressHistory={progressHistory || []}
            />
          )}
        </TabsContent>
      </Tabs>
      </div>
      
      {/* Recommendations Sidebar - Hidden on mobile, shown as inline on small screens */}
      {!isMobile && (
        <div className={cn(
          'transition-all duration-300',
          isSidebarCollapsed ? 'w-12' : 'w-80'
        )}>
          <div className="sticky top-6">
            <RecommendationsSidebar
              recommendations={visibleRecommendations}
              onDismiss={handleDismissRecommendation}
              onApply={handleApplyRecommendation}
              isCollapsed={isSidebarCollapsed}
              onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
