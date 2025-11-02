import { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

interface AriaLiveRegionProps {
  message: string;
  politeness?: 'polite' | 'assertive' | 'off';
  clearAfter?: number; // milliseconds
  className?: string;
}

/**
 * ARIA live region for announcing dynamic content to screen readers
 * Use 'polite' for non-urgent updates, 'assertive' for important updates
 */
export function AriaLiveRegion({
  message,
  politeness = 'polite',
  clearAfter = 5000,
  className,
}: AriaLiveRegionProps) {
  const timeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (clearAfter && message) {
      timeoutRef.current = setTimeout(() => {
        // Message will be cleared by parent component
      }, clearAfter);
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [message, clearAfter]);

  if (!message) return null;

  return (
    <div
      role="status"
      aria-live={politeness}
      aria-atomic="true"
      className={cn('sr-only', className)}
    >
      {message}
    </div>
  );
}

/**
 * Hook to manage ARIA live announcements
 */
export function useAriaAnnounce() {
  const announce = (message: string, politeness: 'polite' | 'assertive' = 'polite') => {
    const liveRegion = document.createElement('div');
    liveRegion.setAttribute('role', 'status');
    liveRegion.setAttribute('aria-live', politeness);
    liveRegion.setAttribute('aria-atomic', 'true');
    liveRegion.className = 'sr-only';
    liveRegion.textContent = message;

    document.body.appendChild(liveRegion);

    // Remove after announcement
    setTimeout(() => {
      document.body.removeChild(liveRegion);
    }, 1000);
  };

  return { announce };
}
