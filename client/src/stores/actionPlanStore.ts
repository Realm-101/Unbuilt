import { create } from 'zustand';

/**
 * Action Plan UI State Store
 * 
 * Manages UI state for the interactive action plan view including:
 * - Expanded/collapsed phases
 * - Selected tasks
 * - UI preferences
 */

export interface ActionPlanUIState {
  // Expanded phases (phase IDs)
  expandedPhases: Set<number>;
  
  // Selected task for detail view
  selectedTaskId: number | null;
  
  // View mode
  viewMode: 'all' | 'incomplete' | 'completed';
  
  // Filter by assignee (for team plans)
  filterByAssignee: number | null;
  
  // Actions
  togglePhase: (phaseId: number) => void;
  expandPhase: (phaseId: number) => void;
  collapsePhase: (phaseId: number) => void;
  expandAllPhases: () => void;
  collapseAllPhases: () => void;
  
  selectTask: (taskId: number | null) => void;
  
  setViewMode: (mode: 'all' | 'incomplete' | 'completed') => void;
  setFilterByAssignee: (userId: number | null) => void;
  
  reset: () => void;
}

const initialState = {
  expandedPhases: new Set<number>(),
  selectedTaskId: null,
  viewMode: 'all' as const,
  filterByAssignee: null,
};

export const useActionPlanStore = create<ActionPlanUIState>((set) => ({
  ...initialState,
  
  // Phase expansion actions
  togglePhase: (phaseId) => {
    set((state) => {
      const newExpanded = new Set(state.expandedPhases);
      if (newExpanded.has(phaseId)) {
        newExpanded.delete(phaseId);
      } else {
        newExpanded.add(phaseId);
      }
      return { expandedPhases: newExpanded };
    });
  },
  
  expandPhase: (phaseId) => {
    set((state) => {
      const newExpanded = new Set(state.expandedPhases);
      newExpanded.add(phaseId);
      return { expandedPhases: newExpanded };
    });
  },
  
  collapsePhase: (phaseId) => {
    set((state) => {
      const newExpanded = new Set(state.expandedPhases);
      newExpanded.delete(phaseId);
      return { expandedPhases: newExpanded };
    });
  },
  
  expandAllPhases: () => {
    set({ expandedPhases: new Set<number>() }); // Empty set means all expanded
  },
  
  collapseAllPhases: () => {
    set({ expandedPhases: new Set<number>() });
  },
  
  // Task selection
  selectTask: (taskId) => {
    set({ selectedTaskId: taskId });
  },
  
  // View mode
  setViewMode: (mode) => {
    set({ viewMode: mode });
  },
  
  // Filter
  setFilterByAssignee: (userId) => {
    set({ filterByAssignee: userId });
  },
  
  // Reset on unmount or logout
  reset: () => {
    set(initialState);
  },
}));
