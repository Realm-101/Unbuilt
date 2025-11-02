/**
 * useConversationKeyboardNav Hook
 * 
 * Provides comprehensive keyboard navigation for conversation interface.
 * Supports tab navigation, arrow keys for suggestions, Enter to send, Escape to cancel.
 * 
 * Requirements: All (WCAG 2.1 Level AA compliance)
 */

import { useEffect, useCallback, useRef } from 'react';

export interface KeyboardNavOptions {
  onSendMessage?: () => void;
  onCancelInput?: () => void;
  onNavigateSuggestions?: (direction: 'up' | 'down' | 'left' | 'right') => void;
  onSelectSuggestion?: () => void;
  onFocusInput?: () => void;
  onShowShortcuts?: () => void;
  enabled?: boolean;
}

export function useConversationKeyboardNav({
  onSendMessage,
  onCancelInput,
  onNavigateSuggestions,
  onSelectSuggestion,
  onFocusInput,
  onShowShortcuts,
  enabled = true,
}: KeyboardNavOptions) {
  const activeElementRef = useRef<string | null>(null);

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!enabled) return;

    const target = event.target as HTMLElement;
    const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA';
    const isSuggestion = target.getAttribute('data-suggestion') === 'true';

    // Global shortcuts (work anywhere)
    if (event.ctrlKey || event.metaKey) {
      switch (event.key) {
        case '/':
          // Focus input (Ctrl+/)
          event.preventDefault();
          onFocusInput?.();
          break;
        case '?':
          // Show keyboard shortcuts (Ctrl+?)
          event.preventDefault();
          onShowShortcuts?.();
          break;
      }
      return;
    }

    // Input-specific shortcuts
    if (isInput) {
      switch (event.key) {
        case 'Enter':
          // Send message (Enter without Shift)
          if (!event.shiftKey) {
            event.preventDefault();
            onSendMessage?.();
          }
          // Shift+Enter for newline (default behavior)
          break;
        case 'Escape':
          // Cancel/clear input
          event.preventDefault();
          onCancelInput?.();
          break;
      }
      return;
    }

    // Suggestion navigation
    if (isSuggestion) {
      switch (event.key) {
        case 'ArrowUp':
        case 'ArrowDown':
        case 'ArrowLeft':
        case 'ArrowRight':
          event.preventDefault();
          onNavigateSuggestions?.(event.key.replace('Arrow', '').toLowerCase() as any);
          break;
        case 'Enter':
        case ' ':
          // Select suggestion
          event.preventDefault();
          onSelectSuggestion?.();
          break;
        case 'Escape':
          // Return focus to input
          event.preventDefault();
          onFocusInput?.();
          break;
      }
      return;
    }

    // Global navigation shortcuts (when not in input)
    switch (event.key) {
      case '/':
        // Focus input
        event.preventDefault();
        onFocusInput?.();
        break;
      case '?':
        // Show keyboard shortcuts
        event.preventDefault();
        onShowShortcuts?.();
        break;
    }
  }, [
    enabled,
    onSendMessage,
    onCancelInput,
    onNavigateSuggestions,
    onSelectSuggestion,
    onFocusInput,
    onShowShortcuts,
  ]);

  useEffect(() => {
    if (!enabled) return;

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [enabled, handleKeyDown]);

  return {
    activeElement: activeElementRef.current,
  };
}
