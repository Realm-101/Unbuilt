/**
 * Onboarding System Components
 * 
 * This module provides a comprehensive onboarding experience including:
 * - OnboardingWizard: Multi-step role selection and personalization
 * - InteractiveTour: Spotlight-based feature tours
 * - TourControls: Help menu integration with resume capability
 * - Tour step definitions for different features and roles
 * 
 * Requirements: 1.1-1.5, 2.1-2.5
 */

export { OnboardingWizard } from './OnboardingWizard';
export type { OnboardingWizardProps } from './OnboardingWizard';

export { InteractiveTour } from './InteractiveTour';
export type { InteractiveTourProps, TourStep } from './InteractiveTour';

export { TourControls, AdvancedTips } from './TourControls';

export {
  dashboardTourSteps,
  searchFlowTourSteps,
  actionPlanTourSteps,
  getRoleSpecificTourSteps,
  getCompleteTour,
  quickTourSteps
} from './tourSteps';

export {
  useTour,
  useMainTour,
  useDashboardTour,
  useSearchFlowTour,
  useActionPlanTour
} from '@/hooks/useTour';

// Legacy export for backward compatibility
export { default as OnboardingTour } from './OnboardingTour';
