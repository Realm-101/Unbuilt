import { create } from 'zustand';

export interface UIState {
  // Tour state
  isTourActive: boolean;
  currentTourStep: number;
  totalTourSteps: number;
  
  // Help panel
  isHelpPanelOpen: boolean;
  helpContext: string | null;
  
  // Modals
  activeModal: string | null;
  modalData: Record<string, any>;
  
  // Navigation
  navigationExpanded: boolean;
  mobileMenuOpen: boolean;
  
  // Global search
  isGlobalSearchOpen: boolean;
  
  // Keyboard shortcuts modal
  isShortcutsModalOpen: boolean;
  
  // Loading states
  isLoading: Record<string, boolean>;
  
  // Actions
  startTour: (totalSteps: number) => void;
  nextTourStep: () => void;
  previousTourStep: () => void;
  goToTourStep: (step: number) => void;
  endTour: () => void;
  
  openHelpPanel: (context?: string) => void;
  closeHelpPanel: () => void;
  
  openModal: (modalId: string, data?: Record<string, any>) => void;
  closeModal: () => void;
  
  toggleNavigation: () => void;
  setNavigationExpanded: (expanded: boolean) => void;
  toggleMobileMenu: () => void;
  setMobileMenuOpen: (open: boolean) => void;
  
  openGlobalSearch: () => void;
  closeGlobalSearch: () => void;
  toggleGlobalSearch: () => void;
  
  setShortcutsModalOpen: (open: boolean) => void;
  toggleShortcutsModal: () => void;
  
  setLoading: (key: string, loading: boolean) => void;
  setHelpPanelOpen: (open: boolean) => void;
  
  reset: () => void;
}

const initialState = {
  isTourActive: false,
  currentTourStep: 0,
  totalTourSteps: 0,
  isHelpPanelOpen: false,
  helpContext: null,
  activeModal: null,
  modalData: {},
  navigationExpanded: true,
  mobileMenuOpen: false,
  isGlobalSearchOpen: false,
  isShortcutsModalOpen: false,
  isLoading: {},
};

export const useUIStateStore = create<UIState>((set) => ({
  ...initialState,
  
  // Tour actions
  startTour: (totalSteps) => {
    set({
      isTourActive: true,
      currentTourStep: 0,
      totalTourSteps: totalSteps,
    });
  },
  
  nextTourStep: () => {
    set((state) => {
      const nextStep = state.currentTourStep + 1;
      if (nextStep >= state.totalTourSteps) {
        return {
          isTourActive: false,
          currentTourStep: 0,
        };
      }
      return { currentTourStep: nextStep };
    });
  },
  
  previousTourStep: () => {
    set((state) => ({
      currentTourStep: Math.max(0, state.currentTourStep - 1),
    }));
  },
  
  goToTourStep: (step) => {
    set((state) => ({
      currentTourStep: Math.min(Math.max(0, step), state.totalTourSteps - 1),
    }));
  },
  
  endTour: () => {
    set({
      isTourActive: false,
      currentTourStep: 0,
    });
  },
  
  // Help panel actions
  openHelpPanel: (context) => {
    set({
      isHelpPanelOpen: true,
      helpContext: context || null,
    });
  },
  
  closeHelpPanel: () => {
    set({
      isHelpPanelOpen: false,
      helpContext: null,
    });
  },
  
  // Modal actions
  openModal: (modalId, data = {}) => {
    set({
      activeModal: modalId,
      modalData: data,
    });
  },
  
  closeModal: () => {
    set({
      activeModal: null,
      modalData: {},
    });
  },
  
  // Navigation actions
  toggleNavigation: () => {
    set((state) => ({
      navigationExpanded: !state.navigationExpanded,
    }));
  },
  
  setNavigationExpanded: (expanded) => {
    set({ navigationExpanded: expanded });
  },
  
  toggleMobileMenu: () => {
    set((state) => ({
      mobileMenuOpen: !state.mobileMenuOpen,
    }));
  },
  
  setMobileMenuOpen: (open) => {
    set({ mobileMenuOpen: open });
  },
  
  // Global search actions
  openGlobalSearch: () => {
    set({ isGlobalSearchOpen: true });
  },
  
  closeGlobalSearch: () => {
    set({ isGlobalSearchOpen: false });
  },
  
  toggleGlobalSearch: () => {
    set((state) => ({
      isGlobalSearchOpen: !state.isGlobalSearchOpen,
    }));
  },
  
  // Keyboard shortcuts modal actions
  setShortcutsModalOpen: (open) => {
    set({ isShortcutsModalOpen: open });
  },
  
  toggleShortcutsModal: () => {
    set((state) => ({
      isShortcutsModalOpen: !state.isShortcutsModalOpen,
    }));
  },
  
  // Help panel setter
  setHelpPanelOpen: (open) => {
    set({ isHelpPanelOpen: open });
  },
  
  // Loading state actions
  setLoading: (key, loading) => {
    set((state) => ({
      isLoading: {
        ...state.isLoading,
        [key]: loading,
      },
    }));
  },
  
  // Reset on logout
  reset: () => {
    set(initialState);
  },
}));
