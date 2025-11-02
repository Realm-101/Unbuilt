/**
 * ConversationLiveRegion Component
 * 
 * ARIA live region for announcing new messages to screen readers.
 * 
 * Requirements: All (WCAG 2.1 Level AA compliance)
 */

import { useEffect, useState } from 'react';
import type { ConversationMessage } from '@/types';

interface ConversationLiveRegionProps {
  messages: ConversationMessage[];
}

export function ConversationLiveRegion({ messages }: ConversationLiveRegionProps) {
  const [announcement, setAnnouncement] = useState<string>('');

  useEffect(() => {
    if (messages.length === 0) return;

    const latestMessage = messages[messages.length - 1];
    
    // Announce new messages
    if (latestMessage.role === 'user') {
      setAnnouncement(`You said: ${latestMessage.content}`);
    } else {
      setAnnouncement(`AI responded: ${latestMessage.content.substring(0, 150)}${latestMessage.content.length > 150 ? '...' : ''}`);
    }

    // Clear announcement after a delay
    const timer = setTimeout(() => setAnnouncement(''), 1000);
    return () => clearTimeout(timer);
  }, [messages]);

  return (
    <div
      role="log"
      aria-live="polite"
      aria-atomic="false"
      aria-relevant="additions"
      className="sr-only"
    >
      {announcement}
    </div>
  );
}
