import { useEffect } from 'react';
import { useLocation } from 'wouter';
import { useKeyboardShortcuts, type KeyboardShortcut } from '@/hooks/useKeyboardShortcuts';
import { useUIStateStore } from '@/stores/uiStateStore';
import { useUserPreferencesStore } from '@/stores/userPreferencesStore';

/**
 * Global keyboard shortcuts provider
 * Registers all application-wide keyboard shortcuts
 */
export function KeyboardShortcutsProvider() {
  const [, setLocation] = useLocation();
  const setShortcutsModalOpen = useUIStateStore((state) => state.setShortcutsModalOpen);
  const setHelpPanelOpen = useUIStateStore((state) => state.setHelpPanelOpen);
  const keyboardShortcutsEnabled = useUserPreferencesStore(
    (state) => state.keyboardShortcuts !== undefined
  );

  // Define all global shortcuts
  const shortcuts: KeyboardShortcut[] = [
    // Navigation shortcuts
    {
      id: 'search',
      name: 'Global Search',
      description: 'Open global search',
      category: 'navigation',
      defaultShortcut: 'ctrl+k',
      handler: () => {
        // The GlobalSearch component handles its own state
        // This is just for registration in the shortcuts modal
      },
    },
    {
      id: 'dashboard',
      name: 'Go to Dashboard',
      description: 'Navigate to dashboard',
      category: 'navigation',
      defaultShortcut: 'ctrl+h',
      handler: () => setLocation('/'),
    },
    {
      id: 'history',
      name: 'Search History',
      description: 'View search history',
      category: 'navigation',
      defaultShortcut: 'ctrl+shift+h',
      handler: () => setLocation('/history'),
    },
    {
      id: 'saved',
      name: 'Saved Results',
      description: 'View saved results',
      category: 'navigation',
      defaultShortcut: 'ctrl+shift+s',
      handler: () => setLocation('/saved'),
    },
    {
      id: 'trending',
      name: 'Trending',
      description: 'View trending searches',
      category: 'navigation',
      defaultShortcut: 'ctrl+shift+t',
      handler: () => setLocation('/trending'),
    },
    
    // Action shortcuts
    {
      id: 'new-search',
      name: 'New Search',
      description: 'Start a new search',
      category: 'actions',
      defaultShortcut: 'ctrl+n',
      handler: () => setLocation('/'),
    },
    {
      id: 'export',
      name: 'Export',
      description: 'Export current view',
      category: 'actions',
      defaultShortcut: 'ctrl+e',
      handler: () => {
        // This will be handled by individual pages
        const event = new CustomEvent('keyboard-shortcut-export');
        window.dispatchEvent(event);
      },
    },
    {
      id: 'share',
      name: 'Share',
      description: 'Share current view',
      category: 'actions',
      defaultShortcut: 'ctrl+shift+e',
      handler: () => {
        const event = new CustomEvent('keyboard-shortcut-share');
        window.dispatchEvent(event);
      },
    },
    {
      id: 'favorite',
      name: 'Toggle Favorite',
      description: 'Add/remove from favorites',
      category: 'actions',
      defaultShortcut: 'ctrl+d',
      handler: () => {
        const event = new CustomEvent('keyboard-shortcut-favorite');
        window.dispatchEvent(event);
      },
    },
    
    // UI shortcuts
    {
      id: 'close-modal',
      name: 'Close Modal',
      description: 'Close current modal or dialog',
      category: 'ui',
      defaultShortcut: 'escape',
      handler: () => {
        // Escape is handled by individual modals
      },
    },
    {
      id: 'toggle-help',
      name: 'Toggle Help Panel',
      description: 'Open/close help panel',
      category: 'ui',
      defaultShortcut: 'ctrl+/',
      handler: () => {
        setHelpPanelOpen(true);
      },
    },
    
    // Help shortcuts
    {
      id: 'help',
      name: 'Keyboard Shortcuts',
      description: 'Show keyboard shortcuts reference',
      category: 'help',
      defaultShortcut: '?',
      handler: () => {
        setShortcutsModalOpen(true);
      },
    },
    {
      id: 'documentation',
      name: 'Documentation',
      description: 'Open documentation',
      category: 'help',
      defaultShortcut: 'ctrl+shift+d',
      handler: () => setLocation('/documentation'),
    },
  ];

  // Register shortcuts
  useKeyboardShortcuts({
    shortcuts,
    enabled: keyboardShortcutsEnabled,
  });

  return null; // This is a logic-only component
}
