import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useUserPreferencesStore } from '@/stores/userPreferencesStore';

export function useGlobalSearch() {
  const [isOpen, setIsOpen] = useState(false);
  const [, setLocation] = useLocation();
  const keyboardShortcuts = useUserPreferencesStore((state) => state.keyboardShortcuts);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Get the search shortcut from preferences (default: ctrl+k)
      const searchShortcut = keyboardShortcuts['search'] || 'ctrl+k';
      const [modifier, key] = searchShortcut.toLowerCase().split('+');

      // Check if the correct modifier and key are pressed
      const modifierPressed =
        (modifier === 'ctrl' && (e.ctrlKey || e.metaKey)) ||
        (modifier === 'alt' && e.altKey) ||
        (modifier === 'shift' && e.shiftKey);

      if (modifierPressed && e.key.toLowerCase() === key) {
        e.preventDefault();
        setIsOpen(true);
      }

      // Close on Escape
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, keyboardShortcuts]);

  const handleResultSelect = (result: { path: string }) => {
    setLocation(result.path);
    setIsOpen(false);
  };

  return {
    isOpen,
    setIsOpen,
    handleResultSelect,
  };
}
