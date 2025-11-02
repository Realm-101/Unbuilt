import { useCallback, useEffect } from "react";
import { useUserPreferencesStore } from "@/stores/userPreferencesStore";
import { useUIStateStore } from "@/stores/uiStateStore";
import { TourStep } from "@/components/onboarding/InteractiveTour";

/**
 * Hook for managing interactive tour state and persistence
 * 
 * Features:
 * - Dismiss functionality with resume option
 * - Track tour progress in preferences store
 * - Resume tour capability
 * - Advanced tips after initial tour completion
 * 
 * Requirements: 2.4, 2.5
 */
export function useTour(tourId: string, steps: TourStep[]) {
  const { tourProgress, updateTourProgress, onboardingCompleted } = useUserPreferencesStore();
  const { 
    isTourActive, 
    currentTourStep, 
    totalTourSteps,
    startTour, 
    nextTourStep, 
    previousTourStep,
    goToTourStep,
    endTour 
  } = useUIStateStore();

  // Check if this specific tour is completed
  const isTourCompleted = tourProgress.some(
    step => step.id === `${tourId}-completed` && step.completed
  );

  // Get current step for this tour
  const getCurrentStepIndex = useCallback(() => {
    const lastCompletedStep = tourProgress
      .filter(step => step.id.startsWith(`${tourId}-step-`) && step.completed)
      .sort((a, b) => {
        const aIndex = parseInt(a.id.split('-').pop() || '0');
        const bIndex = parseInt(b.id.split('-').pop() || '0');
        return bIndex - aIndex;
      })[0];

    if (!lastCompletedStep) return 0;

    const lastIndex = parseInt(lastCompletedStep.id.split('-').pop() || '0');
    return Math.min(lastIndex + 1, steps.length - 1);
  }, [tourProgress, tourId, steps.length]);

  // Start or resume tour
  const startOrResumeTour = useCallback(() => {
    const startIndex = isTourCompleted ? 0 : getCurrentStepIndex();
    startTour(steps.length);
    if (startIndex > 0) {
      goToTourStep(startIndex);
    }
  }, [isTourCompleted, getCurrentStepIndex, startTour, goToTourStep, steps.length]);

  // Handle tour step completion
  const completeCurrentStep = useCallback(() => {
    const stepId = `${tourId}-step-${currentTourStep}`;
    updateTourProgress(stepId, true);
    
    // If this is the last step, mark tour as completed
    if (currentTourStep === steps.length - 1) {
      updateTourProgress(`${tourId}-completed`, true);
    }
  }, [tourId, currentTourStep, steps.length, updateTourProgress]);

  // Handle next step
  const handleNext = useCallback(() => {
    completeCurrentStep();
    nextTourStep();
  }, [completeCurrentStep, nextTourStep]);

  // Handle previous step
  const handlePrevious = useCallback(() => {
    previousTourStep();
  }, [previousTourStep]);

  // Handle tour completion
  const handleComplete = useCallback(() => {
    completeCurrentStep();
    updateTourProgress(`${tourId}-completed`, true);
    endTour();
  }, [completeCurrentStep, tourId, updateTourProgress, endTour]);

  // Handle tour dismissal (with option to resume)
  const handleDismiss = useCallback(() => {
    // Save current progress before dismissing
    if (currentTourStep > 0) {
      const stepId = `${tourId}-step-${currentTourStep}`;
      updateTourProgress(stepId, true);
    }
    endTour();
  }, [tourId, currentTourStep, updateTourProgress, endTour]);

  // Reset tour progress
  const resetTour = useCallback(() => {
    // Clear all progress for this tour
    steps.forEach((_, index) => {
      const stepId = `${tourId}-step-${index}`;
      updateTourProgress(stepId, false);
    });
    updateTourProgress(`${tourId}-completed`, false);
  }, [tourId, steps, updateTourProgress]);

  // Check if user should see advanced tips
  const shouldShowAdvancedTips = useCallback(() => {
    return onboardingCompleted && isTourCompleted;
  }, [onboardingCompleted, isTourCompleted]);

  return {
    // State
    isTourActive,
    currentStepIndex: currentTourStep,
    totalSteps: totalTourSteps,
    isTourCompleted,
    canResume: getCurrentStepIndex() > 0 && !isTourCompleted,
    shouldShowAdvancedTips: shouldShowAdvancedTips(),
    
    // Actions
    startOrResumeTour,
    handleNext,
    handlePrevious,
    handleComplete,
    handleDismiss,
    resetTour,
    goToStep: goToTourStep,
    
    // Computed
    progress: totalTourSteps > 0 ? ((currentTourStep + 1) / totalTourSteps) * 100 : 0,
    canGoNext: currentTourStep < steps.length - 1,
    canGoPrevious: currentTourStep > 0,
    isLastStep: currentTourStep === steps.length - 1,
  };
}

/**
 * Hook for managing the main onboarding tour
 */
export function useMainTour(steps: TourStep[]) {
  return useTour('main-tour', steps);
}

/**
 * Hook for managing dashboard tour
 */
export function useDashboardTour(steps: TourStep[]) {
  return useTour('dashboard-tour', steps);
}

/**
 * Hook for managing search flow tour
 */
export function useSearchFlowTour(steps: TourStep[]) {
  return useTour('search-flow-tour', steps);
}

/**
 * Hook for managing action plan tour
 */
export function useActionPlanTour(steps: TourStep[]) {
  return useTour('action-plan-tour', steps);
}
