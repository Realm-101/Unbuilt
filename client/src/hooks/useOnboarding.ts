import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';

export interface OnboardingStep {
  id: string;
  completed: boolean;
}

export interface OnboardingState {
  isActive: boolean;
  currentStep: number;
  steps: OnboardingStep[];
  hasCompletedOnboarding: boolean;
  hasSkipped: boolean;
}

const ONBOARDING_STORAGE_KEY = 'unbuilt_onboarding_state';

const defaultSteps: OnboardingStep[] = [
  { id: 'welcome', completed: false },
  { id: 'search', completed: false },
  { id: 'results', completed: false },
  { id: 'export', completed: false },
];

export function useOnboarding() {
  const { user } = useAuth();
  const [state, setState] = useState<OnboardingState>(() => {
    // Load from localStorage on mount
    const stored = localStorage.getItem(ONBOARDING_STORAGE_KEY);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        return {
          isActive: false,
          currentStep: 0,
          steps: defaultSteps,
          hasCompletedOnboarding: false,
          hasSkipped: false,
        };
      }
    }
    return {
      isActive: false,
      currentStep: 0,
      steps: defaultSteps,
      hasCompletedOnboarding: false,
      hasSkipped: false,
    };
  });

  // Persist state to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem(ONBOARDING_STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  // Check if user should see onboarding on first login
  useEffect(() => {
    if (user && !state.hasCompletedOnboarding && !state.hasSkipped && !state.isActive) {
      // Check if this is a new user (created within last 5 minutes)
      const userCreatedAt = (user as any).createdAt ? new Date((user as any).createdAt).getTime() : 0;
      const now = Date.now();
      const fiveMinutes = 5 * 60 * 1000;
      
      if (now - userCreatedAt < fiveMinutes) {
        // Auto-start onboarding for new users
        setState(prev => ({ ...prev, isActive: true }));
      }
    }
  }, [user, state.hasCompletedOnboarding, state.hasSkipped, state.isActive]);

  const startOnboarding = useCallback(() => {
    setState(prev => ({
      ...prev,
      isActive: true,
      currentStep: 0,
      hasSkipped: false,
    }));
  }, []);

  const nextStep = useCallback(() => {
    setState(prev => {
      const newSteps = [...prev.steps];
      if (prev.currentStep < newSteps.length) {
        newSteps[prev.currentStep] = { ...newSteps[prev.currentStep], completed: true };
      }
      
      const nextStepIndex = prev.currentStep + 1;
      const isComplete = nextStepIndex >= newSteps.length;
      
      return {
        ...prev,
        currentStep: nextStepIndex,
        steps: newSteps,
        hasCompletedOnboarding: isComplete,
        isActive: !isComplete,
      };
    });
  }, []);

  const previousStep = useCallback(() => {
    setState(prev => ({
      ...prev,
      currentStep: Math.max(0, prev.currentStep - 1),
    }));
  }, []);

  const skipOnboarding = useCallback(() => {
    setState(prev => ({
      ...prev,
      isActive: false,
      hasSkipped: true,
    }));
  }, []);

  const completeOnboarding = useCallback(async () => {
    setState(prev => {
      const newSteps = prev.steps.map(step => ({ ...step, completed: true }));
      return {
        ...prev,
        steps: newSteps,
        hasCompletedOnboarding: true,
        isActive: false,
      };
    });

    // Save to backend if user is logged in
    if (user) {
      try {
        await fetch('/api/auth/onboarding-complete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
        });
      } catch (error) {
        console.error('Failed to save onboarding completion:', error);
      }
    }
  }, [user]);

  const resetOnboarding = useCallback(() => {
    setState({
      isActive: false,
      currentStep: 0,
      steps: defaultSteps,
      hasCompletedOnboarding: false,
      hasSkipped: false,
    });
  }, []);

  const goToStep = useCallback((stepIndex: number) => {
    setState(prev => ({
      ...prev,
      currentStep: Math.max(0, Math.min(stepIndex, prev.steps.length - 1)),
    }));
  }, []);

  return {
    ...state,
    startOnboarding,
    nextStep,
    previousStep,
    skipOnboarding,
    completeOnboarding,
    resetOnboarding,
    goToStep,
    canGoNext: state.currentStep < state.steps.length - 1,
    canGoPrevious: state.currentStep > 0,
    progress: ((state.currentStep + 1) / state.steps.length) * 100,
  };
}
