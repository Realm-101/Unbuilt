// Central export point for all Zustand stores
export { useUserPreferencesStore } from './userPreferencesStore';
export type { UserPreferencesState, UserRole, TourStep, AccessibilitySettings } from './userPreferencesStore';

export { useUIStateStore } from './uiStateStore';
export type { UIState } from './uiStateStore';

export { useProgressTrackingStore } from './progressTrackingStore';
export type { ProgressState, StepProgress, PhaseProgress, ProjectProgress } from './progressTrackingStore';
