/**
 * ConversationHistory Component
 * 
 * Displays full conversation thread with pagination and search functionality.
 * Allows scrolling to specific messages and searching within conversation.
 * 
 * Requirements: 5.1, 5.3, 5.6
 */

import { useState, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Search, 
  ChevronLeft, 
  ChevronRight, 
  AlertCircle,
  X,
  ArrowDown
} from 'lucide-react';
import { UserMessage } from './UserMessage';
import { AIMessage } from './AIMessage';
import { cn } from '@/lib/utils';
import type { ConversationMessage } from '@/types';

interface ConversationHistoryProps {
  conversationId: number;
  onMessageEdit?: (messageId: number, newContent: string) => void;
  onMessageDelete?: (messageId: number) => void;
  onMessageCopy?: () => void;
  onMessageRate?: (messageId: number, rating: number) => void;
  onMessageReport?: (messageId: number) => void;
  highlightMessageId?: number;
}

export function ConversationHistory({
  conversationId,
  onMessageEdit,
  onMessageDelete,
  onMessageCopy,
  onMessageRate,
  onMessageReport,
  highlightMessageId,
}: ConversationHistoryProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [filteredMessages, setFilteredMessages] = useState<ConversationMessage[]>([]);
  const [highlightedIndex, setHighlightedIndex] = useState<number | null>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const messageRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  
  const pageSize = 20;

  // Fetch messages with pagination
  const { 
    data: messagesData, 
    isLoading, 
    error 
  } = useQuery<{
    messages: ConversationMessage[];
    pagination: {
      limit: number;
      offset: number;
      total: number;
      hasMore: boolean;
    };
  }>({
    queryKey: ['conversation-messages', conversationId, currentPage],
    queryFn: async () => {
      const offset = (currentPage - 1) * pageSize;
      const response = await fetch(
        `/api/conversations/${conversationId}/messages?limit=${pageSize}&offset=${offset}`
      );
      if (!response.ok) {
        throw new Error('Failed to load messages');
      }
      const result = await response.json();
      return result.data;
    },
  });

  const messages = messagesData?.messages || [];
  const pagination = messagesData?.pagination;
  const totalPages = pagination ? Math.ceil(pagination.total / pageSize) : 1;

  // Filter messages based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredMessages(messages);
      setHighlightedIndex(null);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = messages.filter(message =>
      message.content.toLowerCase().includes(query)
    );
    setFilteredMessages(filtered);
    
    // Highlight first match
    if (filtered.length > 0) {
      setHighlightedIndex(0);
    } else {
      setHighlightedIndex(null);
    }
  }, [searchQuery, messages]);

  // Scroll to highlighted message
  useEffect(() => {
    if (highlightMessageId) {
      const messageElement = messageRefs.current.get(highlightMessageId);
      if (messageElement) {
        messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [highlightMessageId]);

  // Scroll to specific message by index
  const scrollToMessage = (index: number) => {
    const message = filteredMessages[index];
    if (message) {
      const messageElement = messageRefs.current.get(message.id);
      if (messageElement) {
        messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  };

  // Navigate search results
  const navigateSearchResults = (direction: 'next' | 'prev') => {
    if (highlightedIndex === null || filteredMessages.length === 0) return;

    let newIndex: number;
    if (direction === 'next') {
      newIndex = (highlightedIndex + 1) % filteredMessages.length;
    } else {
      newIndex = highlightedIndex === 0 
        ? filteredMessages.length - 1 
        : highlightedIndex - 1;
    }

    setHighlightedIndex(newIndex);
    scrollToMessage(newIndex);
  };

  // Clear search
  const clearSearch = () => {
    setSearchQuery('');
    setHighlightedIndex(null);
  };

  // Scroll to bottom
  const scrollToBottom = () => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTo({
        top: messagesContainerRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  };

  // Handle pagination
  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
      scrollToBottom();
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <Card className="p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </Card>
    );
  }

  // Error state
  if (error) {
    return (
      <Card className="p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Failed to load conversation history. Please try again.
          </AlertDescription>
        </Alert>
      </Card>
    );
  }

  const displayMessages = searchQuery.trim() ? filteredMessages : messages;

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <Card className="p-4">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search in conversation..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-9"
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                onClick={clearSearch}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>

          {/* Search Navigation */}
          {searchQuery && filteredMessages.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground whitespace-nowrap">
                {highlightedIndex !== null ? highlightedIndex + 1 : 0} of {filteredMessages.length}
              </span>
              <div className="flex gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => navigateSearchResults('prev')}
                  disabled={filteredMessages.length === 0}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => navigateSearchResults('next')}
                  disabled={filteredMessages.length === 0}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Scroll to Bottom */}
          <Button
            variant="outline"
            size="icon"
            onClick={scrollToBottom}
            title="Scroll to bottom"
          >
            <ArrowDown className="h-4 w-4" />
          </Button>
        </div>

        {/* Search Results Info */}
        {searchQuery && (
          <div className="mt-2 text-sm text-muted-foreground">
            {filteredMessages.length === 0 ? (
              <span>No messages found matching "{searchQuery}"</span>
            ) : (
              <span>
                Found {filteredMessages.length} {filteredMessages.length === 1 ? 'message' : 'messages'}
              </span>
            )}
          </div>
        )}
      </Card>

      {/* Messages Container */}
      <Card className="p-4">
        <div
          ref={messagesContainerRef}
          className="space-y-4 max-h-[600px] overflow-y-auto"
        >
          {displayMessages.length > 0 ? (
            displayMessages.map((message, index) => {
              const isHighlighted = 
                highlightMessageId === message.id ||
                (highlightedIndex !== null && index === highlightedIndex);

              return (
                <div
                  key={message.id}
                  ref={(el) => {
                    if (el) {
                      messageRefs.current.set(message.id, el);
                    } else {
                      messageRefs.current.delete(message.id);
                    }
                  }}
                  className={cn(
                    "transition-all duration-300",
                    isHighlighted && "ring-2 ring-purple-500 rounded-lg p-2 -m-2"
                  )}
                >
                  {message.role === 'user' ? (
                    <UserMessage
                      message={message}
                      onEdit={onMessageEdit}
                      onDelete={onMessageDelete}
                    />
                  ) : (
                    <AIMessage
                      message={message}
                      onCopy={onMessageCopy}
                      onRate={onMessageRate}
                      onReport={onMessageReport}
                    />
                  )}
                </div>
              );
            })
          ) : (
            <div className="flex items-center justify-center h-32 text-center">
              <p className="text-muted-foreground">
                No messages in this conversation yet.
              </p>
            </div>
          )}
        </div>
      </Card>

      {/* Pagination */}
      {!searchQuery && pagination && pagination.total > pageSize && (
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              Showing {((currentPage - 1) * pageSize) + 1} to{' '}
              {Math.min(currentPage * pageSize, pagination.total)} of{' '}
              {pagination.total} messages
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Previous
              </Button>

              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum: number;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }

                  return (
                    <Button
                      key={pageNum}
                      variant={currentPage === pageNum ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => goToPage(pageNum)}
                      className="w-9"
                    >
                      {pageNum}
                    </Button>
                  );
                })}
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => goToPage(currentPage + 1)}
                disabled={currentPage === totalPages}
              >
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
