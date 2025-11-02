/**
 * ConversationInterface Component
 * 
 * Main container for the interactive AI conversation feature.
 * Displays conversation thread, input field, and suggested questions.
 * 
 * Requirements: 1.1, 1.2, 1.6
 */

import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { LoadingOverlay } from '@/components/ui/loading-overlay';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle, RefreshCw, Keyboard } from 'lucide-react';
import { UserMessage } from './UserMessage';
import { AIMessage } from './AIMessage';
import { ConversationInput } from './ConversationInput';
import { SuggestedQuestions } from './SuggestedQuestions';
import { VariantSelector } from './VariantSelector';
import { ConversationHistory } from './ConversationHistory';
import { ConversationExportDialog } from './ConversationExportDialog';
import { ClearConversationDialog } from './ClearConversationDialog';
import { VirtualizedMessageList } from './VirtualizedMessageList';
import { KeyboardShortcutsDialog } from './KeyboardShortcutsDialog';
import { ConversationLiveRegion } from './ConversationLiveRegion';
import { AccessibleConversationWrapper } from './AccessibleConversationWrapper';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { useTouchFriendly } from '@/hooks/useTouchFriendly';
import { useSwipeGesture } from '@/hooks/useSwipeGesture';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { useConversationKeyboardNav } from '@/hooks/useConversationKeyboardNav';
import type { 
  ConversationInterfaceProps, 
  Conversation, 
  ConversationMessage,
  MessageResponse 
} from '@/types';

export function ConversationInterface({ 
  analysisId, 
  onVariantCreated 
}: ConversationInterfaceProps) {
  const [sending, setSending] = useState(false);
  const [currentVariantId, setCurrentVariantId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'chat' | 'history'>('chat');
  const [showShortcuts, setShowShortcuts] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const queryClient = useQueryClient();
  
  // Touch-friendly hooks
  const { isTouchDevice, isMobile } = useTouchFriendly();

  // Keyboard navigation
  useConversationKeyboardNav({
    onFocusInput: () => {
      inputRef.current?.focus();
    },
    onShowShortcuts: () => {
      setShowShortcuts(true);
    },
    enabled: true,
  });

  // Fetch conversation for this analysis
  const { 
    data: conversationData, 
    isLoading, 
    error,
    refetch
  } = useQuery<{
    conversation: Conversation;
    messages: ConversationMessage[];
    suggestions: any[];
    analytics: any;
    rateLimit: {
      remaining: number;
      limit: number;
      unlimited: boolean;
      tier: 'free' | 'pro' | 'enterprise';
    };
  }>({
    queryKey: ['conversation', analysisId],
    queryFn: async () => {
      const response = await fetch(`/api/conversations/${analysisId}`);
      if (!response.ok) {
        throw new Error('Failed to load conversation');
      }
      const result = await response.json();
      return result.data;
    },
  });

  const conversation = conversationData?.conversation;
  const rateLimit = conversationData?.rateLimit;
  
  // Pull-to-refresh for mobile
  const { containerRef: pullToRefreshRef, isRefreshing, pullDistance } = usePullToRefresh({
    onRefresh: async () => {
      await refetch();
    },
    enabled: isMobile && activeTab === 'chat',
  });
  
  // Swipe gestures for navigation
  const { elementRef: swipeRef } = useSwipeGesture({
    onSwipeLeft: () => {
      if (activeTab === 'chat') {
        setActiveTab('history');
      }
    },
    onSwipeRight: () => {
      if (activeTab === 'history') {
        setActiveTab('chat');
      }
    },
    enabled: isMobile,
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      const response = await fetch(`/api/conversations/${analysisId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to send message');
      }
      
      return response.json() as Promise<MessageResponse>;
    },
    onSuccess: (data) => {
      // Update conversation in cache
      queryClient.invalidateQueries({ queryKey: ['conversation', analysisId] });
    },
  });

  // Auto-scroll to latest message
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [conversation?.messages]);

  // Handle message submission
  const handleSubmit = async (content: string) => {
    setSending(true);
    try {
      await sendMessageMutation.mutateAsync(content);
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setSending(false);
    }
  };

  // Handle suggested question click
  const handleQuestionClick = async (question: string) => {
    await handleSubmit(question);
  };

  // Handle message edit
  const handleEdit = async (messageId: number, newContent: string) => {
    // TODO: Implement edit functionality
    console.log('Edit message:', messageId, newContent);
  };

  // Handle message delete
  const handleDelete = async (messageId: number) => {
    // TODO: Implement delete functionality
    console.log('Delete message:', messageId);
  };

  // Handle message copy
  const handleCopy = () => {
    // Copy handled by AIMessage component
  };

  // Handle message rating
  const handleRate = async (messageId: number, rating: number) => {
    try {
      await fetch(`/api/conversations/${conversation?.id}/rate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messageId, rating }),
      });
    } catch (error) {
      console.error('Failed to rate message:', error);
    }
  };

  // Handle message report
  const handleReport = async (messageId: number) => {
    try {
      const response = await fetch(`/api/conversations/messages/${messageId}/report`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          reason: 'User reported inappropriate content',
          category: 'inappropriate',
          details: 'Reported via UI'
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to report message');
      }

      const data = await response.json();
      console.log('Message reported successfully:', data);
      
      // Show success toast (if toast system is available)
      if (typeof window !== 'undefined' && (window as any).showToast) {
        (window as any).showToast('Report submitted successfully. Our team will review it shortly.', 'success');
      }
    } catch (error) {
      console.error('Failed to report message:', error);
      
      // Show error toast (if toast system is available)
      if (typeof window !== 'undefined' && (window as any).showToast) {
        (window as any).showToast('Failed to submit report. Please try again.', 'error');
      }
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <Card className="p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-12 w-full" />
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
            Failed to load conversation. Please try again.
          </AlertDescription>
        </Alert>
      </Card>
    );
  }

  // Handle variant selection
  const handleVariantSelect = (variantId: number | null) => {
    setCurrentVariantId(variantId);
    if (variantId && onVariantCreated) {
      onVariantCreated(variantId);
    }
  };

  return (
    <AccessibleConversationWrapper
      skipToInputId="conversation-input"
      skipToMessagesId="conversation-messages"
    >
      <Card className="relative overflow-hidden" role="region" aria-label="Conversation interface">
        {sending && <LoadingOverlay isLoading={sending} message="Sending message..." />}
      
      {/* Screen reader announcements */}
      <div 
        role="status" 
        aria-live="polite" 
        aria-atomic="true" 
        className="sr-only"
      >
        {sending && 'Sending message...'}
        {sendMessageMutation.error && `Error: ${sendMessageMutation.error.message}`}
      </div>

      {/* Live region for new messages */}
      <ConversationLiveRegion messages={conversation?.messages || []} />
      
      <div className="flex flex-col h-full">
        {/* Header - Responsive */}
        <div className="p-3 md:p-4 border-b bg-muted/50">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-2 md:gap-4">
            <div className="flex-1 min-w-0">
              <h3 className="text-base md:text-lg font-semibold truncate">Ask Follow-up Questions</h3>
              <p className="text-xs md:text-sm text-muted-foreground hidden sm:block">
                Explore your analysis in more depth with AI-powered insights
              </p>
            </div>
            {conversation?.id && (
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowShortcuts(true)}
                  className="h-8 w-8 p-0"
                  title="Keyboard shortcuts (Ctrl+?)"
                  aria-label="Show keyboard shortcuts"
                >
                  <Keyboard className="h-4 w-4" />
                </Button>
                <ClearConversationDialog
                  conversationId={conversation.id}
                  analysisId={analysisId}
                  onCleared={() => {
                    queryClient.invalidateQueries({ queryKey: ['conversation', analysisId] });
                  }}
                />
                <ConversationExportDialog conversationId={conversation.id} />
              </div>
            )}
          </div>
        </div>

        {/* Tabs for Chat and History - Mobile Optimized */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'chat' | 'history')} className="flex-1 flex flex-col">
          <div className="px-3 md:px-4 pt-2 border-b">
            <TabsList className="grid w-full max-w-md grid-cols-2 h-9 md:h-10" role="tablist" aria-label="Conversation views">
              <TabsTrigger value="chat" className="text-xs md:text-sm" role="tab" aria-selected={activeTab === 'chat'}>Chat</TabsTrigger>
              <TabsTrigger value="history" className="text-xs md:text-sm" role="tab" aria-selected={activeTab === 'history'}>Full History</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="chat" className="flex-1 flex flex-col mt-0">{/* Chat View - Mobile Optimized */}

        {/* Variant Selector - Hidden on small mobile */}
        {conversation?.id && (
          <div className="p-3 md:p-4 border-b bg-background hidden sm:block">
            <VariantSelector
              conversationId={conversation.id}
              originalAnalysisId={analysisId}
              currentVariantId={currentVariantId}
              onVariantSelect={handleVariantSelect}
            />
          </div>
        )}

        {/* Suggested Questions - Collapsible on mobile */}
        {conversation?.suggestedQuestions && conversation.suggestedQuestions.length > 0 && (
          <div className="p-3 md:p-4 border-b bg-background">
            <SuggestedQuestions
              questions={conversation.suggestedQuestions}
              onQuestionClick={handleQuestionClick}
              loading={sending}
            />
          </div>
        )}

        {/* Conversation Thread - Virtualized with Pull-to-Refresh */}
        <div 
          ref={(el) => {
            if (el) {
              // Combine refs for pull-to-refresh and swipe
              (pullToRefreshRef as any).current = el;
              (swipeRef as any).current = el;
            }
          }}
          className="relative"
          style={{
            transform: pullDistance > 0 ? `translateY(${pullDistance}px)` : undefined,
            transition: pullDistance === 0 ? 'transform 0.3s ease-out' : undefined,
          }}
        >
          {/* Pull-to-Refresh Indicator */}
          {isMobile && pullDistance > 0 && (
            <div className="absolute top-0 left-0 right-0 flex items-center justify-center py-2 z-10">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                <span>{isRefreshing ? 'Refreshing...' : 'Pull to refresh'}</span>
              </div>
            </div>
          )}
          
          {/* Virtualized Message List */}
          <div id="conversation-messages">
            <VirtualizedMessageList
              messages={conversation?.messages || []}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onCopy={handleCopy}
              onRate={handleRate}
              onReport={handleReport}
              maxVisibleMessages={isMobile ? 20 : 50}
              isMobile={isMobile}
            />
          </div>
          
          <div ref={messagesEndRef} />
        </div>

        {/* Input Section - Sticky on mobile */}
        <div id="conversation-input" className="sticky bottom-0 p-3 md:p-4 border-t bg-muted/50 backdrop-blur-sm">
          <ConversationInput
            ref={inputRef}
            onSubmit={handleSubmit}
            disabled={sending}
            placeholder="Ask a follow-up question..."
            maxLength={rateLimit?.tier === 'free' ? 500 : rateLimit?.tier === 'pro' ? 1000 : 2000}
            remainingQuestions={rateLimit?.unlimited ? undefined : rateLimit?.remaining}
            questionLimit={rateLimit?.unlimited ? undefined : rateLimit?.limit}
            userTier={rateLimit?.tier || 'free'}
          />
        </div>

        {/* Error Display */}
        {sendMessageMutation.error && (
          <div className="p-4 border-t">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {sendMessageMutation.error.message}
              </AlertDescription>
            </Alert>
          </div>
        )}
          </TabsContent>

          {/* History View */}
          <TabsContent value="history" className="flex-1 p-4 overflow-y-auto">
            {conversation?.id && (
              <ConversationHistory
                conversationId={conversation.id}
                onMessageEdit={handleEdit}
                onMessageDelete={handleDelete}
                onMessageCopy={handleCopy}
                onMessageRate={handleRate}
                onMessageReport={handleReport}
              />
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Keyboard Shortcuts Dialog */}
      <KeyboardShortcutsDialog
        open={showShortcuts}
        onOpenChange={setShowShortcuts}
      />
    </Card>
    </AccessibleConversationWrapper>
  );
}
