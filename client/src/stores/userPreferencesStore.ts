import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { apiRequest } from '@/lib/queryClient';

export type UserRole = 'entrepreneur' | 'investor' | 'product_manager' | 'researcher' | 'exploring';

export interface TourStep {
  id: string;
  completed: boolean;
  timestamp?: Date;
}

export interface AccessibilitySettings {
  highContrast: boolean;
  reducedMotion: boolean;
  screenReaderOptimized: boolean;
}

export interface UserPreferencesState {
  // User role and onboarding
  role: UserRole | null;
  onboardingCompleted: boolean;
  tourProgress: TourStep[];
  
  // UI preferences
  expandedSections: Record<string, boolean>;
  keyboardShortcuts: Record<string, string>;
  
  // Accessibility
  accessibilitySettings: AccessibilitySettings;
  
  // Sync state
  lastSyncedAt: Date | null;
  isSyncing: boolean;
  
  // Actions
  setRole: (role: UserRole) => void;
  completeOnboarding: () => void;
  updateTourProgress: (stepId: string, completed: boolean) => void;
  setExpandedSection: (sectionId: string, expanded: boolean) => void;
  setKeyboardShortcut: (action: string, shortcut: string) => void;
  updateAccessibilitySettings: (settings: Partial<AccessibilitySettings>) => void;
  syncToBackend: () => Promise<void>;
  loadFromBackend: () => Promise<void>;
  reset: () => void;
}

const defaultAccessibilitySettings: AccessibilitySettings = {
  highContrast: false,
  reducedMotion: false,
  screenReaderOptimized: false,
};

const initialState = {
  role: null,
  onboardingCompleted: false,
  tourProgress: [],
  expandedSections: {},
  keyboardShortcuts: {
    'search': 'ctrl+k',
    'dashboard': 'ctrl+h',
    'new-search': 'ctrl+n',
    'export': 'ctrl+e',
    'help': '?',
  },
  accessibilitySettings: defaultAccessibilitySettings,
  lastSyncedAt: null,
  isSyncing: false,
};

// Debounce helper
let syncTimeout: NodeJS.Timeout | null = null;
const SYNC_DEBOUNCE_MS = 2000;

export const useUserPreferencesStore = create<UserPreferencesState>()(
  persist(
    (set, get) => ({
      ...initialState,
      
      setRole: (role) => {
        set({ role });
        debouncedSync(get);
      },
      
      completeOnboarding: () => {
        set({ onboardingCompleted: true });
        debouncedSync(get);
      },
      
      updateTourProgress: (stepId, completed) => {
        set((state) => {
          const existingStep = state.tourProgress.find(s => s.id === stepId);
          if (existingStep) {
            return {
              tourProgress: state.tourProgress.map(s =>
                s.id === stepId ? { ...s, completed, timestamp: new Date() } : s
              ),
            };
          } else {
            return {
              tourProgress: [
                ...state.tourProgress,
                { id: stepId, completed, timestamp: new Date() },
              ],
            };
          }
        });
        debouncedSync(get);
      },
      
      setExpandedSection: (sectionId, expanded) => {
        set((state) => ({
          expandedSections: {
            ...state.expandedSections,
            [sectionId]: expanded,
          },
        }));
        debouncedSync(get);
      },
      
      setKeyboardShortcut: (action, shortcut) => {
        set((state) => ({
          keyboardShortcuts: {
            ...state.keyboardShortcuts,
            [action]: shortcut,
          },
        }));
        debouncedSync(get);
      },
      
      updateAccessibilitySettings: (settings) => {
        set((state) => ({
          accessibilitySettings: {
            ...state.accessibilitySettings,
            ...settings,
          },
        }));
        debouncedSync(get);
      },
      
      syncToBackend: async () => {
        const state = get();
        if (state.isSyncing) return;
        
        set({ isSyncing: true });
        
        try {
          const preferences = {
            role: state.role,
            onboardingCompleted: state.onboardingCompleted,
            tourProgress: state.tourProgress,
            expandedSections: state.expandedSections,
            keyboardShortcuts: state.keyboardShortcuts,
            accessibilitySettings: state.accessibilitySettings,
          };
          
          await apiRequest('PUT', '/api/user/preferences', preferences);
          set({ lastSyncedAt: new Date(), isSyncing: false });
        } catch (error) {
          console.error('Failed to sync preferences to backend:', error);
          set({ isSyncing: false });
        }
      },
      
      loadFromBackend: async () => {
        try {
          const response = await apiRequest('GET', '/api/user/preferences');
          const data = await response.json();
          
          if (data.success && data.preferences) {
            set({
              role: data.preferences.role || null,
              onboardingCompleted: data.preferences.onboardingCompleted || false,
              tourProgress: data.preferences.tourProgress || [],
              expandedSections: data.preferences.expandedSections || {},
              keyboardShortcuts: data.preferences.keyboardShortcuts || initialState.keyboardShortcuts,
              accessibilitySettings: data.preferences.accessibilitySettings || defaultAccessibilitySettings,
              lastSyncedAt: new Date(),
            });
          }
        } catch (error) {
          console.error('Failed to load preferences from backend:', error);
        }
      },
      
      reset: () => {
        set(initialState);
      },
    }),
    {
      name: 'user-preferences-storage',
      partialize: (state) => ({
        role: state.role,
        onboardingCompleted: state.onboardingCompleted,
        tourProgress: state.tourProgress,
        expandedSections: state.expandedSections,
        keyboardShortcuts: state.keyboardShortcuts,
        accessibilitySettings: state.accessibilitySettings,
      }),
    }
  )
);

// Debounced sync helper
function debouncedSync(get: () => UserPreferencesState) {
  if (syncTimeout) {
    clearTimeout(syncTimeout);
  }
  
  syncTimeout = setTimeout(() => {
    get().syncToBackend();
  }, SYNC_DEBOUNCE_MS);
}
