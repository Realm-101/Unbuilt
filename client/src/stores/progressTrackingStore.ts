import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { apiRequest } from '@/lib/queryClient';

export interface StepProgress {
  stepId: string;
  completed: boolean;
  completedAt?: Date;
}

export interface PhaseProgress {
  phaseId: string;
  completedSteps: string[];
  totalSteps: number;
  completionPercentage: number;
}

export interface ProjectProgress {
  analysisId: string;
  completedSteps: string[];
  phaseCompletion: Record<string, number>;
  overallCompletion: number;
  lastUpdated: Date;
}

export interface ProgressState {
  // Progress data
  projectProgress: Record<string, ProjectProgress>;
  
  // Undo history
  undoHistory: Array<{
    analysisId: string;
    stepId: string;
    previousState: boolean;
    timestamp: Date;
  }>;
  
  // Sync state
  isSyncing: boolean;
  pendingUpdates: Array<{
    analysisId: string;
    stepId: string;
    completed: boolean;
  }>;
  
  // Actions
  markStepComplete: (analysisId: string, stepId: string, phaseId: string, totalStepsInPhase: number) => void;
  markStepIncomplete: (analysisId: string, stepId: string, phaseId: string, totalStepsInPhase: number) => void;
  undoLastAction: () => void;
  batchUpdateSteps: (analysisId: string, updates: Array<{ stepId: string; completed: boolean; phaseId: string; totalStepsInPhase: number }>) => void;
  syncToBackend: (analysisId: string) => Promise<void>;
  loadFromBackend: (analysisId: string) => Promise<void>;
  calculatePhaseCompletion: (analysisId: string, phaseId: string, completedSteps: string[], totalSteps: number) => number;
  calculateOverallCompletion: (analysisId: string) => number;
  reset: () => void;
}

const initialState = {
  projectProgress: {},
  undoHistory: [],
  isSyncing: false,
  pendingUpdates: [],
};

// Debounce helper
let syncTimeouts: Record<string, NodeJS.Timeout> = {};
const SYNC_DEBOUNCE_MS = 1500;

export const useProgressTrackingStore = create<ProgressState>()(
  persist(
    (set, get) => ({
      ...initialState,
      
      markStepComplete: (analysisId, stepId, phaseId, totalStepsInPhase) => {
        set((state) => {
          const currentProgress = state.projectProgress[analysisId] || {
            analysisId,
            completedSteps: [],
            phaseCompletion: {},
            overallCompletion: 0,
            lastUpdated: new Date(),
          };
          
          // Add to undo history
          const wasCompleted = currentProgress.completedSteps.includes(stepId);
          const newUndoHistory = [
            ...state.undoHistory,
            {
              analysisId,
              stepId,
              previousState: wasCompleted,
              timestamp: new Date(),
            },
          ].slice(-10); // Keep last 10 actions
          
          // Update completed steps
          const newCompletedSteps = wasCompleted
            ? currentProgress.completedSteps
            : [...currentProgress.completedSteps, stepId];
          
          // Calculate phase completion
          const phaseSteps = newCompletedSteps.filter(s => s.startsWith(phaseId));
          const phaseCompletion = (phaseSteps.length / totalStepsInPhase) * 100;
          
          const updatedProgress: ProjectProgress = {
            ...currentProgress,
            completedSteps: newCompletedSteps,
            phaseCompletion: {
              ...currentProgress.phaseCompletion,
              [phaseId]: phaseCompletion,
            },
            lastUpdated: new Date(),
          };
          
          // Calculate overall completion
          updatedProgress.overallCompletion = get().calculateOverallCompletion(analysisId);
          
          return {
            projectProgress: {
              ...state.projectProgress,
              [analysisId]: updatedProgress,
            },
            undoHistory: newUndoHistory,
            pendingUpdates: [
              ...state.pendingUpdates,
              { analysisId, stepId, completed: true },
            ],
          };
        });
        
        debouncedSync(analysisId, get);
      },
      
      markStepIncomplete: (analysisId, stepId, phaseId, totalStepsInPhase) => {
        set((state) => {
          const currentProgress = state.projectProgress[analysisId];
          if (!currentProgress) return state;
          
          // Add to undo history
          const wasCompleted = currentProgress.completedSteps.includes(stepId);
          const newUndoHistory = [
            ...state.undoHistory,
            {
              analysisId,
              stepId,
              previousState: wasCompleted,
              timestamp: new Date(),
            },
          ].slice(-10);
          
          // Update completed steps
          const newCompletedSteps = currentProgress.completedSteps.filter(s => s !== stepId);
          
          // Calculate phase completion
          const phaseSteps = newCompletedSteps.filter(s => s.startsWith(phaseId));
          const phaseCompletion = (phaseSteps.length / totalStepsInPhase) * 100;
          
          const updatedProgress: ProjectProgress = {
            ...currentProgress,
            completedSteps: newCompletedSteps,
            phaseCompletion: {
              ...currentProgress.phaseCompletion,
              [phaseId]: phaseCompletion,
            },
            lastUpdated: new Date(),
          };
          
          // Calculate overall completion
          updatedProgress.overallCompletion = get().calculateOverallCompletion(analysisId);
          
          return {
            projectProgress: {
              ...state.projectProgress,
              [analysisId]: updatedProgress,
            },
            undoHistory: newUndoHistory,
            pendingUpdates: [
              ...state.pendingUpdates,
              { analysisId, stepId, completed: false },
            ],
          };
        });
        
        debouncedSync(analysisId, get);
      },
      
      undoLastAction: () => {
        set((state) => {
          if (state.undoHistory.length === 0) return state;
          
          const lastAction = state.undoHistory[state.undoHistory.length - 1];
          const { analysisId, stepId, previousState } = lastAction;
          
          const currentProgress = state.projectProgress[analysisId];
          if (!currentProgress) return state;
          
          const newCompletedSteps = previousState
            ? [...currentProgress.completedSteps, stepId]
            : currentProgress.completedSteps.filter(s => s !== stepId);
          
          const updatedProgress: ProjectProgress = {
            ...currentProgress,
            completedSteps: newCompletedSteps,
            lastUpdated: new Date(),
          };
          
          return {
            projectProgress: {
              ...state.projectProgress,
              [analysisId]: updatedProgress,
            },
            undoHistory: state.undoHistory.slice(0, -1),
          };
        });
      },
      
      batchUpdateSteps: (analysisId, updates) => {
        set((state) => {
          const currentProgress = state.projectProgress[analysisId] || {
            analysisId,
            completedSteps: [],
            phaseCompletion: {},
            overallCompletion: 0,
            lastUpdated: new Date(),
          };
          
          let newCompletedSteps = [...currentProgress.completedSteps];
          const newPhaseCompletion = { ...currentProgress.phaseCompletion };
          
          updates.forEach(({ stepId, completed, phaseId, totalStepsInPhase }) => {
            if (completed && !newCompletedSteps.includes(stepId)) {
              newCompletedSteps.push(stepId);
            } else if (!completed) {
              newCompletedSteps = newCompletedSteps.filter(s => s !== stepId);
            }
            
            // Recalculate phase completion
            const phaseSteps = newCompletedSteps.filter(s => s.startsWith(phaseId));
            newPhaseCompletion[phaseId] = (phaseSteps.length / totalStepsInPhase) * 100;
          });
          
          const updatedProgress: ProjectProgress = {
            ...currentProgress,
            completedSteps: newCompletedSteps,
            phaseCompletion: newPhaseCompletion,
            lastUpdated: new Date(),
          };
          
          updatedProgress.overallCompletion = get().calculateOverallCompletion(analysisId);
          
          return {
            projectProgress: {
              ...state.projectProgress,
              [analysisId]: updatedProgress,
            },
          };
        });
        
        debouncedSync(analysisId, get);
      },
      
      syncToBackend: async (analysisId) => {
        const state = get();
        if (state.isSyncing) return;
        
        const progress = state.projectProgress[analysisId];
        if (!progress) return;
        
        set({ isSyncing: true });
        
        try {
          await apiRequest('POST', `/api/progress/${analysisId}`, {
            completedSteps: progress.completedSteps,
            phaseCompletion: progress.phaseCompletion,
            overallCompletion: progress.overallCompletion,
          });
          
          // Clear pending updates for this analysis
          set((state) => ({
            isSyncing: false,
            pendingUpdates: state.pendingUpdates.filter(u => u.analysisId !== analysisId),
          }));
        } catch (error) {
          console.error('Failed to sync progress to backend:', error);
          set({ isSyncing: false });
        }
      },
      
      loadFromBackend: async (analysisId) => {
        try {
          const response = await apiRequest('GET', `/api/progress/${analysisId}`);
          const data = await response.json();
          
          if (data.success && data.progress) {
            set((state) => ({
              projectProgress: {
                ...state.projectProgress,
                [analysisId]: {
                  analysisId,
                  completedSteps: data.progress.completedSteps || [],
                  phaseCompletion: data.progress.phaseCompletion || {},
                  overallCompletion: data.progress.overallCompletion || 0,
                  lastUpdated: new Date(data.progress.lastUpdated),
                },
              },
            }));
          }
        } catch (error) {
          console.error('Failed to load progress from backend:', error);
        }
      },
      
      calculatePhaseCompletion: (analysisId, phaseId, completedSteps, totalSteps) => {
        const phaseSteps = completedSteps.filter(s => s.startsWith(phaseId));
        return totalSteps > 0 ? (phaseSteps.length / totalSteps) * 100 : 0;
      },
      
      calculateOverallCompletion: (analysisId) => {
        const state = get();
        const progress = state.projectProgress[analysisId];
        if (!progress) return 0;
        
        const phaseCompletions = Object.values(progress.phaseCompletion);
        if (phaseCompletions.length === 0) return 0;
        
        const totalCompletion = phaseCompletions.reduce((sum, completion) => sum + completion, 0);
        return totalCompletion / phaseCompletions.length;
      },
      
      reset: () => {
        set(initialState);
      },
    }),
    {
      name: 'progress-tracking-storage',
      partialize: (state) => ({
        projectProgress: state.projectProgress,
      }),
    }
  )
);

// Debounced sync helper
function debouncedSync(analysisId: string, get: () => ProgressState) {
  if (syncTimeouts[analysisId]) {
    clearTimeout(syncTimeouts[analysisId]);
  }
  
  syncTimeouts[analysisId] = setTimeout(() => {
    get().syncToBackend(analysisId);
    delete syncTimeouts[analysisId];
  }, SYNC_DEBOUNCE_MS);
}
