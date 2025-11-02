import React from "react";
import { CheckCircle2, Circle, ChevronDown, ChevronUp, Loader2, Undo2, ChevronLeft, ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { useProgressTrackingStore } from "@/stores/progressTrackingStore";
import { useToast } from "@/hooks/use-toast";
import { useTouchFriendly } from "@/hooks/useTouchFriendly";
import { useSwipeGesture } from "@/hooks/useSwipeGesture";
import { PhaseCelebration } from "./PhaseCelebration";
import { SuggestedResources } from "@/components/resources";

export interface ActionStep {
  id: string;
  title: string;
  description: string;
  estimatedTime?: string;
  resources?: string[];
  requirements?: string[];
}

export interface ActionPhase {
  id: string;
  name: string;
  description: string;
  steps: ActionStep[];
  order: number;
}

export interface ActionPlanTrackerProps {
  analysisId: string;
  phases: ActionPhase[];
  className?: string;
}

/**
 * ActionPlanTracker - Component for tracking action plan progress
 * 
 * Features:
 * - Display 4 phase cards with step counts and progress
 * - Implement expandable phase details
 * - Add overall progress indicator
 * - Create responsive layout for mobile
 * 
 * Requirements: 6.1, 6.4
 */
export const ActionPlanTracker: React.FC<ActionPlanTrackerProps> = ({
  analysisId,
  phases,
  className,
}) => {
  const [expandedPhases, setExpandedPhases] = React.useState<Set<string>>(new Set());
  const [loadingSteps, setLoadingSteps] = React.useState<Set<string>>(new Set());
  const [celebrationPhase, setCelebrationPhase] = React.useState<ActionPhase | null>(null);
  const [previousPhaseCompletion, setPreviousPhaseCompletion] = React.useState<Record<string, number>>({});
  const [currentMobilePhase, setCurrentMobilePhase] = React.useState(0);
  
  const { 
    projectProgress, 
    loadFromBackend, 
    markStepComplete, 
    markStepIncomplete,
    undoLastAction,
    undoHistory,
  } = useProgressTrackingStore();
  const { toast } = useToast();
  const { isMobile, isTouchDevice } = useTouchFriendly();
  
  // Load progress from backend on mount
  React.useEffect(() => {
    loadFromBackend(analysisId);
  }, [analysisId, loadFromBackend]);
  
  const progress = projectProgress[analysisId];
  
  // Sort phases by order
  const sortedPhases = React.useMemo(() => {
    return [...phases].sort((a, b) => a.order - b.order);
  }, [phases]);
  
  // Swipe gesture for mobile phase navigation
  const { elementRef: swipeRef } = useSwipeGesture({
    onSwipeLeft: () => {
      if (isMobile && currentMobilePhase < sortedPhases.length - 1) {
        setCurrentMobilePhase(prev => prev + 1);
      }
    },
    onSwipeRight: () => {
      if (isMobile && currentMobilePhase > 0) {
        setCurrentMobilePhase(prev => prev - 1);
      }
    },
    enabled: isMobile,
  });
  
  // Navigate to next/previous phase on mobile
  const handlePreviousPhase = () => {
    if (currentMobilePhase > 0) {
      setCurrentMobilePhase(prev => prev - 1);
    }
  };
  
  const handleNextPhase = () => {
    if (currentMobilePhase < sortedPhases.length - 1) {
      setCurrentMobilePhase(prev => prev + 1);
    }
  };
  
  // Track phase completion changes to trigger celebration
  React.useEffect(() => {
    if (!progress) return;
    
    // Check each phase for completion
    sortedPhases.forEach((phase) => {
      const currentCompletion = progress.phaseCompletion[phase.id] || 0;
      const previousCompletion = previousPhaseCompletion[phase.id] || 0;
      
      // If phase just reached 100% completion
      if (currentCompletion === 100 && previousCompletion < 100) {
        setCelebrationPhase(phase);
      }
    });
    
    // Update previous completion state
    setPreviousPhaseCompletion(progress.phaseCompletion);
  }, [progress?.phaseCompletion, sortedPhases]);
  
  // Calculate overall completion
  const overallCompletion = React.useMemo(() => {
    if (!progress) return 0;
    return progress.overallCompletion || 0;
  }, [progress]);
  
  // Calculate phase completion
  const getPhaseCompletion = (phase: ActionPhase): number => {
    if (!progress) return 0;
    return progress.phaseCompletion[phase.id] || 0;
  };
  
  // Get completed steps count for a phase
  const getPhaseCompletedCount = (phase: ActionPhase): number => {
    if (!progress) return 0;
    const completedSteps = progress.completedSteps.filter(stepId => 
      phase.steps.some(step => step.id === stepId)
    );
    return completedSteps.length;
  };
  
  // Toggle phase expansion
  const togglePhase = (phaseId: string) => {
    setExpandedPhases(prev => {
      const newSet = new Set(prev);
      if (newSet.has(phaseId)) {
        newSet.delete(phaseId);
      } else {
        newSet.add(phaseId);
      }
      return newSet;
    });
  };
  
  // Handle step completion toggle
  const handleStepToggle = async (step: ActionStep, phase: ActionPhase, isCurrentlyComplete: boolean) => {
    // Add to loading state
    setLoadingSteps(prev => new Set(prev).add(step.id));
    
    try {
      if (isCurrentlyComplete) {
        // Mark as incomplete
        markStepIncomplete(analysisId, step.id, phase.id, phase.steps.length);
        toast({
          title: "Step unchecked",
          description: "Progress updated successfully",
        });
      } else {
        // Mark as complete
        markStepComplete(analysisId, step.id, phase.id, phase.steps.length);
        toast({
          title: "Step completed! 🎉",
          description: "Great progress! Keep going!",
        });
      }
    } catch (error) {
      console.error('Failed to update step:', error);
      toast({
        title: "Error",
        description: "Failed to update progress. Please try again.",
        variant: "destructive",
      });
    } finally {
      // Remove from loading state after a short delay for visual feedback
      setTimeout(() => {
        setLoadingSteps(prev => {
          const newSet = new Set(prev);
          newSet.delete(step.id);
          return newSet;
        });
      }, 300);
    }
  };
  
  // Handle undo
  const handleUndo = () => {
    if (undoHistory.length === 0) return;
    
    undoLastAction();
    toast({
      title: "Action undone",
      description: "Previous change has been reverted",
    });
  };
  
  // Check if undo is available for this analysis
  const canUndo = React.useMemo(() => {
    return undoHistory.some(action => action.analysisId === analysisId);
  }, [undoHistory, analysisId]);
  
  return (
    <div className={cn("space-y-4 sm:space-y-6", className)}>
      {/* Overall Progress Header */}
      <Card className="bg-gradient-to-br from-purple-900/20 to-blue-900/20 border-purple-500/30">
        <CardHeader className={cn(isMobile && "p-4")}>
          <CardTitle className={cn(
            "text-xl sm:text-2xl font-bold text-white flex items-center justify-between",
            isMobile && "flex-col items-start gap-2"
          )}>
            <span>Action Plan Progress</span>
            <div className="flex items-center gap-2 sm:gap-3">
              {canUndo && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleUndo}
                  className={cn(
                    "text-gray-400 hover:text-white",
                    isTouchDevice && "min-h-[44px]"
                  )}
                  title="Undo last action"
                >
                  <Undo2 className="w-4 h-4 mr-1" />
                  {!isMobile && "Undo"}
                </Button>
              )}
              <span className="text-2xl sm:text-3xl font-bold text-purple-400">
                {Math.round(overallCompletion)}%
              </span>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className={cn(isMobile && "p-4 pt-0")}>
          <Progress 
            value={overallCompletion} 
            className="h-2 sm:h-3 bg-gray-800 [&>div]:bg-gradient-to-r [&>div]:from-purple-500 [&>div]:to-blue-500"
          />
          <p className="text-xs sm:text-sm text-gray-400 mt-2 sm:mt-3">
            Track your progress through the 4-phase development roadmap
          </p>
        </CardContent>
      </Card>
      
      {/* Mobile Phase Navigation */}
      {isMobile && (
        <div className="flex items-center justify-between gap-2 px-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePreviousPhase}
            disabled={currentMobilePhase === 0}
            className="min-h-[44px] min-w-[44px]"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-sm text-gray-400">
            Phase {currentMobilePhase + 1} of {sortedPhases.length}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={handleNextPhase}
            disabled={currentMobilePhase === sortedPhases.length - 1}
            className="min-h-[44px] min-w-[44px]"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      )}
      
      {/* Phase Cards - Single card on mobile, grid on desktop */}
      <div 
        ref={swipeRef}
        className={cn(
          isMobile ? "space-y-4" : "grid grid-cols-1 md:grid-cols-2 gap-4"
        )}
      >
        {sortedPhases.map((phase, index) => {
          // On mobile, only show current phase
          if (isMobile && index !== currentMobilePhase) return null;
          const isExpanded = expandedPhases.has(phase.id);
          const phaseCompletion = getPhaseCompletion(phase);
          const completedCount = getPhaseCompletedCount(phase);
          const totalSteps = phase.steps.length;
          const isComplete = phaseCompletion === 100;
          
          return (
            <Card 
              key={phase.id}
              className={cn(
                "transition-all duration-200 hover:shadow-lg",
                isComplete 
                  ? "bg-green-900/20 border-green-500/30" 
                  : "bg-gray-800 border-gray-700"
              )}
            >
              <CardHeader className={cn("pb-3", isMobile && "p-4")}>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      {isComplete ? (
                        <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-green-400" />
                      ) : (
                        <Circle className="w-4 h-4 sm:w-5 sm:h-5 text-gray-500" />
                      )}
                      <CardTitle className="text-base sm:text-lg font-semibold text-white">
                        Phase {phase.order}: {phase.name}
                      </CardTitle>
                    </div>
                    <p className="text-xs sm:text-sm text-gray-400 ml-6 sm:ml-7">
                      {phase.description}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => togglePhase(phase.id)}
                    className={cn(
                      "ml-2 text-gray-400 hover:text-white",
                      isTouchDevice && "min-h-[44px] min-w-[44px]"
                    )}
                  >
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 sm:w-5 sm:h-5" />
                    ) : (
                      <ChevronDown className="w-4 h-4 sm:w-5 sm:h-5" />
                    )}
                  </Button>
                </div>
              </CardHeader>
              
              <CardContent className={cn("space-y-3", isMobile && "p-4 pt-0")}>
                {/* Progress Bar */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs sm:text-sm text-gray-400">
                      {completedCount} of {totalSteps} steps
                    </span>
                    <span className="text-xs sm:text-sm font-semibold text-white">
                      {Math.round(phaseCompletion)}%
                    </span>
                  </div>
                  <Progress 
                    value={phaseCompletion} 
                    className={cn(
                      "h-2 bg-gray-700",
                      isComplete 
                        ? "[&>div]:bg-green-500" 
                        : "[&>div]:bg-gradient-to-r [&>div]:from-purple-500 [&>div]:to-blue-500"
                    )}
                  />
                </div>
                
                {/* Expanded Phase Details */}
                {isExpanded && (
                  <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-gray-700">
                    <h4 className="text-xs sm:text-sm font-semibold text-white mb-2 sm:mb-3">
                      Phase Steps
                    </h4>
                    <div className="space-y-2">
                      {phase.steps.map((step) => {
                        const isStepComplete = progress?.completedSteps.includes(step.id);
                        const isLoading = loadingSteps.has(step.id);
                        
                        return (
                          <div 
                            key={step.id}
                            className={cn(
                              "flex items-start gap-2 sm:gap-3 p-2 sm:p-3 rounded-lg transition-all duration-200",
                              isStepComplete 
                                ? "bg-green-900/20 border border-green-500/30" 
                                : "bg-gray-900/50 hover:bg-gray-900 border border-transparent"
                            )}
                          >
                            <div className={cn(
                              "flex items-center pt-0.5",
                              isTouchDevice && "min-h-[44px] min-w-[44px] justify-center"
                            )}>
                              {isLoading ? (
                                <Loader2 className="w-5 h-5 text-purple-400 animate-spin" />
                              ) : (
                                <Checkbox
                                  checked={isStepComplete}
                                  onCheckedChange={() => handleStepToggle(step, phase, isStepComplete)}
                                  className={cn(
                                    "border-2",
                                    isTouchDevice && "h-6 w-6",
                                    isStepComplete 
                                      ? "border-green-500 data-[state=checked]:bg-green-500" 
                                      : "border-gray-500"
                                  )}
                                />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className={cn(
                                "text-xs sm:text-sm font-medium",
                                isStepComplete 
                                  ? "text-gray-400 line-through" 
                                  : "text-gray-200"
                              )}>
                                {step.title}
                              </p>
                              {step.description && (
                                <p className="text-xs text-gray-500 mt-1">
                                  {step.description}
                                </p>
                              )}
                              {step.estimatedTime && (
                                <p className="text-xs text-gray-500 mt-1">
                                  ⏱️ Est. time: {step.estimatedTime}
                                </p>
                              )}
                              {step.resources && step.resources.length > 0 && !isMobile && (
                                <div className="mt-2">
                                  <p className="text-xs text-gray-500 mb-1">Resources:</p>
                                  <ul className="text-xs text-gray-400 space-y-0.5">
                                    {step.resources.map((resource, idx) => (
                                      <li key={idx}>• {resource}</li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    
                    {/* Suggested Resources Section */}
                    <div className="mt-4 pt-4 border-t border-gray-700">
                      <SuggestedResources
                        stepId={phase.steps[0]?.id || phase.id}
                        phase={phase.name.toLowerCase().split(' ')[0]}
                        stepDescription={phase.description}
                        analysisId={analysisId}
                        maxResources={3}
                      />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
      
      {/* Mobile-specific layout adjustments handled by grid-cols-1 */}
      
      {/* Phase Celebration Modal */}
      {celebrationPhase && (
        <PhaseCelebration
          isOpen={!!celebrationPhase}
          onClose={() => setCelebrationPhase(null)}
          phaseName={celebrationPhase.name}
          phaseNumber={celebrationPhase.order}
          totalPhases={sortedPhases.length}
          nextPhaseName={
            celebrationPhase.order < sortedPhases.length
              ? sortedPhases.find(p => p.order === celebrationPhase.order + 1)?.name
              : undefined
          }
        />
      )}
    </div>
  );
};
