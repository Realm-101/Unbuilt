import { useState, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';

export type UpgradePromptReason = 'search-limit' | 'premium-feature' | 'export-limit' | 'collaboration';

interface UseUpgradePromptReturn {
  shouldShowPrompt: (reason: UpgradePromptReason) => boolean;
  showPrompt: (reason: UpgradePromptReason, featureName?: string) => void;
  dismissPrompt: (reason: UpgradePromptReason) => void;
  activePrompt: {
    reason: UpgradePromptReason;
    featureName?: string;
  } | null;
  clearActivePrompt: () => void;
}

const COOLDOWN_KEY_PREFIX = 'upgrade-prompt-dismissed-';
const COOLDOWN_DURATION = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Hook to manage upgrade prompts throughout the application
 * 
 * @example
 * ```tsx
 * const { shouldShowPrompt, showPrompt, activePrompt, clearActivePrompt } = useUpgradePrompt();
 * 
 * // Check if user should see a prompt
 * if (shouldShowPrompt('search-limit')) {
 *   showPrompt('search-limit');
 * }
 * 
 * // Render the active prompt
 * {activePrompt && (
 *   <UpgradePrompt
 *     reason={activePrompt.reason}
 *     featureName={activePrompt.featureName}
 *     onDismiss={clearActivePrompt}
 *   />
 * )}
 * ```
 */
export function useUpgradePrompt(): UseUpgradePromptReturn {
  const { user } = useAuth();
  const [activePrompt, setActivePrompt] = useState<{
    reason: UpgradePromptReason;
    featureName?: string;
  } | null>(null);

  /**
   * Check if a prompt should be shown based on cooldown and user tier
   */
  const shouldShowPrompt = useCallback(
    (reason: UpgradePromptReason): boolean => {
      // Don't show prompts to non-free users
      if (!user || (user as any).plan !== 'free') {
        return false;
      }

      // Check cooldown
      const cooldownKey = `${COOLDOWN_KEY_PREFIX}${reason}`;
      const dismissedAt = localStorage.getItem(cooldownKey);

      if (dismissedAt) {
        const dismissedTime = parseInt(dismissedAt, 10);
        const now = Date.now();

        if (now - dismissedTime < COOLDOWN_DURATION) {
          return false;
        } else {
          // Cooldown expired, remove the key
          localStorage.removeItem(cooldownKey);
        }
      }

      return true;
    },
    [user]
  );

  /**
   * Show an upgrade prompt
   */
  const showPrompt = useCallback(
    (reason: UpgradePromptReason, featureName?: string) => {
      if (shouldShowPrompt(reason)) {
        setActivePrompt({ reason, featureName });
      }
    },
    [shouldShowPrompt]
  );

  /**
   * Dismiss a prompt and set cooldown
   */
  const dismissPrompt = useCallback((reason: UpgradePromptReason) => {
    const cooldownKey = `${COOLDOWN_KEY_PREFIX}${reason}`;
    localStorage.setItem(cooldownKey, Date.now().toString());
    
    // Clear active prompt if it matches
    setActivePrompt((current) => {
      if (current?.reason === reason) {
        return null;
      }
      return current;
    });
  }, []);

  /**
   * Clear the currently active prompt without setting cooldown
   */
  const clearActivePrompt = useCallback(() => {
    setActivePrompt(null);
  }, []);

  return {
    shouldShowPrompt,
    showPrompt,
    dismissPrompt,
    activePrompt,
    clearActivePrompt,
  };
}
