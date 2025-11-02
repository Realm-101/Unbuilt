/**
 * VirtualizedMessageList Component
 * 
 * Optimized message list with virtual scrolling for better performance
 * on mobile devices with long conversation histories.
 * 
 * Uses React.memo and lazy loading for optimal performance.
 * 
 * Requirements: 1.6
 */

import { memo, useRef, useEffect, useState, useCallback } from 'react';
import { UserMessage } from './UserMessage';
import { AIMessage } from './AIMessage';
import { getMaxVisibleMessages } from '@/lib/mobile-optimizations';
import type { ConversationMessage } from '@/types';

interface VirtualizedMessageListProps {
  messages: ConversationMessage[];
  onEdit?: (messageId: number, newContent: string) => void;
  onDelete?: (messageId: number) => void;
  onCopy?: () => void;
  onRate?: (messageId: number, rating: number) => void;
  onReport?: (messageId: number) => void;
  maxVisibleMessages?: number;
  isMobile?: boolean;
}

// Memoized message components for performance
const MemoizedUserMessage = memo(UserMessage);
const MemoizedAIMessage = memo(AIMessage);

export function VirtualizedMessageList({
  messages,
  onEdit,
  onDelete,
  onCopy,
  onRate,
  onReport,
  maxVisibleMessages = getMaxVisibleMessages(),
  isMobile = false,
}: VirtualizedMessageListProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: maxVisibleMessages });
  const [isNearBottom, setIsNearBottom] = useState(true);

  // Calculate visible range based on scroll position
  const handleScroll = useCallback(() => {
    if (!containerRef.current) return;

    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    const scrollPercentage = (scrollTop + clientHeight) / scrollHeight;

    // Check if near bottom (within 100px)
    const nearBottom = scrollHeight - scrollTop - clientHeight < 100;
    setIsNearBottom(nearBottom);

    // Calculate visible range
    const totalMessages = messages.length;
    const messagesPerScreen = Math.ceil(clientHeight / 100); // Assume ~100px per message
    const currentIndex = Math.floor((scrollTop / scrollHeight) * totalMessages);

    const start = Math.max(0, currentIndex - messagesPerScreen);
    const end = Math.min(totalMessages, currentIndex + messagesPerScreen * 2);

    setVisibleRange({ start, end });
  }, [messages.length]);

  // Lazy load older messages when scrolling up
  const handleLoadMore = useCallback(() => {
    if (visibleRange.start > 0) {
      setVisibleRange(prev => ({
        start: Math.max(0, prev.start - 10),
        end: prev.end,
      }));
    }
  }, [visibleRange.start]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (isNearBottom && containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [messages.length, isNearBottom]);

  // Throttled scroll handler
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let scrollTimeout: NodeJS.Timeout;
    const throttledScroll = () => {
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(handleScroll, 100);
    };

    container.addEventListener('scroll', throttledScroll, { passive: true });
    return () => {
      container.removeEventListener('scroll', throttledScroll);
      clearTimeout(scrollTimeout);
    };
  }, [handleScroll]);

  // Determine which messages to render
  const visibleMessages = isMobile
    ? messages.slice(Math.max(0, messages.length - maxVisibleMessages))
    : messages.slice(visibleRange.start, visibleRange.end);

  // Show "load more" indicator when scrolled up
  const showLoadMore = visibleRange.start > 0 && !isMobile;

  return (
    <div
      ref={containerRef}
      className="flex-1 overflow-y-auto p-3 md:p-4 space-y-3 md:space-y-4 min-h-[300px] md:min-h-[400px] max-h-[500px] md:max-h-[600px]"
      role="log"
      aria-label="Conversation messages"
      aria-live="polite"
      aria-relevant="additions"
    >
      {/* Load More Indicator */}
      {showLoadMore && (
        <div className="flex justify-center py-2">
          <button
            onClick={handleLoadMore}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Load older messages...
          </button>
        </div>
      )}

      {/* Messages */}
      {visibleMessages.map((message) => (
        message.role === 'user' ? (
          <MemoizedUserMessage
            key={message.id}
            message={message}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ) : (
          <MemoizedAIMessage
            key={message.id}
            message={message}
            onCopy={onCopy}
            onRate={onRate}
            onReport={onReport}
          />
        )
      ))}

      {/* Empty State */}
      {messages.length === 0 && (
        <div className="flex items-center justify-center h-full text-center px-4">
          <div className="space-y-2">
            <p className="text-sm md:text-base text-muted-foreground">
              No messages yet. Start a conversation by asking a question below.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
