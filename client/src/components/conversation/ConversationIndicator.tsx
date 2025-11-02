/**
 * ConversationIndicator Component
 * 
 * Shows badge and preview for analyses with active conversations.
 * Displays message count and last exchange preview.
 * 
 * Requirements: 5.1, 5.2
 */

import { MessageCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

interface ConversationIndicatorProps {
  messageCount: number;
  lastMessage?: {
    role: 'user' | 'assistant';
    content: string;
    timestamp: string | Date;
  };
  onContinue?: () => void;
  variant?: 'badge' | 'full';
  className?: string;
}

export function ConversationIndicator({
  messageCount,
  lastMessage,
  onContinue,
  variant = 'badge',
  className,
}: ConversationIndicatorProps) {
  if (messageCount === 0) {
    return null;
  }

  // Badge variant - compact display
  if (variant === 'badge') {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge
              variant="secondary"
              className={cn(
                "flex items-center gap-1 cursor-help",
                className
              )}
            >
              <MessageCircle className="h-3 w-3" />
              <span>{messageCount}</span>
            </Badge>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-xs">
            <div className="space-y-1">
              <p className="font-medium">
                {messageCount} {messageCount === 1 ? 'message' : 'messages'} in conversation
              </p>
              {lastMessage && (
                <>
                  <p className="text-xs text-muted-foreground">
                    Last {lastMessage.role === 'user' ? 'question' : 'response'}:{' '}
                    {formatDistanceToNow(new Date(lastMessage.timestamp), { addSuffix: true })}
                  </p>
                  <p className="text-xs line-clamp-2">
                    {lastMessage.content.substring(0, 100)}
                    {lastMessage.content.length > 100 ? '...' : ''}
                  </p>
                </>
              )}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // Full variant - detailed display with preview
  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center gap-2">
        <Badge variant="secondary" className="flex items-center gap-1">
          <MessageCircle className="h-3 w-3" />
          <span>
            {messageCount} {messageCount === 1 ? 'message' : 'messages'}
          </span>
        </Badge>
      </div>

      {lastMessage && (
        <div className="rounded-lg border bg-muted/50 p-3 space-y-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              Last {lastMessage.role === 'user' ? 'question' : 'response'}
            </span>
            <span>
              {formatDistanceToNow(new Date(lastMessage.timestamp), { addSuffix: true })}
            </span>
          </div>
          <p className="text-sm line-clamp-2">
            {lastMessage.content}
          </p>
          {onContinue && (
            <Button
              variant="outline"
              size="sm"
              onClick={onContinue}
              className="w-full"
            >
              Continue Conversation
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
