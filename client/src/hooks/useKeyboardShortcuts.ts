import { useEffect, useCallback, useRef } from 'react';
import { useLocation } from 'wouter';
import { useUserPreferencesStore } from '@/stores/userPreferencesStore';
import { useUIStateStore } from '@/stores/uiStateStore';

export interface KeyboardShortcut {
  id: string;
  name: string;
  description: string;
  category: 'navigation' | 'actions' | 'ui' | 'help';
  defaultShortcut: string;
  handler: () => void;
  enabled?: boolean;
}

interface UseKeyboardShortcutsOptions {
  shortcuts: KeyboardShortcut[];
  enabled?: boolean;
}

/**
 * Hook to manage keyboard shortcuts with context awareness
 * Prevents shortcuts from triggering when typing in input fields
 */
export function useKeyboardShortcuts({ shortcuts, enabled = true }: UseKeyboardShortcutsOptions) {
  const [, setLocation] = useLocation();
  const keyboardShortcuts = useUserPreferencesStore((state) => state.keyboardShortcuts);
  const setShortcutsModalOpen = useUIStateStore((state) => state.setShortcutsModalOpen);
  const shortcutsRef = useRef(shortcuts);

  // Update shortcuts ref when they change
  useEffect(() => {
    shortcutsRef.current = shortcuts;
  }, [shortcuts]);

  const isInputElement = useCallback((element: Element | null): boolean => {
    if (!element) return false;
    
    const tagName = element.tagName.toLowerCase();
    const isEditable = element.getAttribute('contenteditable') === 'true';
    const isInput = ['input', 'textarea', 'select'].includes(tagName);
    
    return isInput || isEditable;
  }, []);

  const parseShortcut = useCallback((shortcut: string): {
    ctrl: boolean;
    alt: boolean;
    shift: boolean;
    meta: boolean;
    key: string;
  } => {
    const parts = shortcut.toLowerCase().split('+');
    const key = parts[parts.length - 1];
    
    return {
      ctrl: parts.includes('ctrl'),
      alt: parts.includes('alt'),
      shift: parts.includes('shift'),
      meta: parts.includes('meta') || parts.includes('cmd'),
      key,
    };
  }, []);

  const matchesShortcut = useCallback((
    event: KeyboardEvent,
    shortcut: string
  ): boolean => {
    const parsed = parseShortcut(shortcut);
    const eventKey = event.key.toLowerCase();
    
    // Handle special keys
    const keyMatch = parsed.key === eventKey || 
                     (parsed.key === 'escape' && eventKey === 'escape') ||
                     (parsed.key === 'enter' && eventKey === 'enter');
    
    // Check modifiers - use metaKey for Mac Cmd key
    const ctrlMatch = parsed.ctrl ? (event.ctrlKey || event.metaKey) : !event.ctrlKey && !event.metaKey;
    const altMatch = parsed.alt ? event.altKey : !event.altKey;
    const shiftMatch = parsed.shift ? event.shiftKey : !event.shiftKey;
    const metaMatch = parsed.meta ? event.metaKey : true; // Meta is optional
    
    return keyMatch && ctrlMatch && altMatch && shiftMatch;
  }, [parseShortcut]);

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in input fields
      if (isInputElement(event.target as Element)) {
        // Exception: Allow "?" key for help even in inputs if it's not being typed
        if (event.key !== '?' || event.ctrlKey || event.altKey || event.metaKey) {
          return;
        }
      }

      // Check each registered shortcut
      for (const shortcut of shortcutsRef.current) {
        if (shortcut.enabled === false) continue;

        // Get custom shortcut from preferences or use default
        const shortcutKey = keyboardShortcuts[shortcut.id] || shortcut.defaultShortcut;
        
        if (matchesShortcut(event, shortcutKey)) {
          event.preventDefault();
          event.stopPropagation();
          shortcut.handler();
          break; // Only trigger one shortcut per keypress
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enabled, keyboardShortcuts, isInputElement, matchesShortcut]);

  return {
    parseShortcut,
    matchesShortcut,
  };
}

/**
 * Get platform-specific modifier key name
 */
export function getModifierKeyName(): 'Cmd' | 'Ctrl' {
  const isMac = typeof navigator !== 'undefined' && 
                /Mac|iPhone|iPad|iPod/.test(navigator.platform);
  return isMac ? 'Cmd' : 'Ctrl';
}

/**
 * Format shortcut for display (e.g., "ctrl+k" -> "Ctrl+K" or "Cmd+K")
 */
export function formatShortcut(shortcut: string): string {
  const modifierKey = getModifierKeyName();
  
  return shortcut
    .split('+')
    .map(part => {
      const lower = part.toLowerCase();
      if (lower === 'ctrl' || lower === 'meta' || lower === 'cmd') {
        return modifierKey;
      }
      if (lower === 'alt') return 'Alt';
      if (lower === 'shift') return 'Shift';
      if (lower === 'escape') return 'Esc';
      if (lower === 'enter') return 'Enter';
      return part.toUpperCase();
    })
    .join('+');
}

/**
 * Validate if a shortcut string is valid
 */
export function isValidShortcut(shortcut: string): boolean {
  if (!shortcut || typeof shortcut !== 'string') return false;
  
  const parts = shortcut.toLowerCase().split('+');
  if (parts.length === 0) return false;
  
  const validModifiers = ['ctrl', 'alt', 'shift', 'meta', 'cmd'];
  const modifiers = parts.slice(0, -1);
  const key = parts[parts.length - 1];
  
  // Check if all modifiers are valid
  const allModifiersValid = modifiers.every(m => validModifiers.includes(m));
  
  // Check if key is not empty and not a modifier
  const keyValid = key.length > 0 && !validModifiers.includes(key);
  
  return allModifiersValid && keyValid;
}

/**
 * Check if two shortcuts conflict
 */
export function shortcutsConflict(shortcut1: string, shortcut2: string): boolean {
  return shortcut1.toLowerCase() === shortcut2.toLowerCase();
}
