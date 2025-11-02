/**
 * AccessibleConversationWrapper Component
 * 
 * Wrapper component that applies accessibility styles and provides
 * skip links for keyboard navigation.
 * 
 * Requirements: All (WCAG 2.1 Level AA compliance)
 */

import { ReactNode } from 'react';
import './conversation-accessibility.css';

interface AccessibleConversationWrapperProps {
  children: ReactNode;
  skipToInputId?: string;
  skipToMessagesId?: string;
}

export function AccessibleConversationWrapper({
  children,
  skipToInputId = 'conversation-input',
  skipToMessagesId = 'conversation-messages',
}: AccessibleConversationWrapperProps) {
  return (
    <div className="conversation-interface">
      {/* Skip Links for Keyboard Navigation */}
      <a
        href={`#${skipToInputId}`}
        className="conversation-skip-link"
      >
        Skip to message input
      </a>
      <a
        href={`#${skipToMessagesId}`}
        className="conversation-skip-link"
      >
        Skip to messages
      </a>

      {children}
    </div>
  );
}
