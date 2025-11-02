/**
 * AIMessage Component
 * 
 * Displays AI assistant messages in the conversation thread.
 * Left-aligned with AI avatar, copy button, rating system, and report option.
 * 
 * Requirements: 1.5, 6.1, 6.2, 6.6
 */

import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { 
  Copy, 
  ThumbsUp, 
  ThumbsDown, 
  Flag, 
  Check,
  Sparkles,
  ExternalLink
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { hapticLight, hapticSuccess, hapticMedium } from '@/lib/haptics';
import { shouldReduceMotion } from '@/lib/mobile-optimizations';
import type { AIMessageProps } from '@/types';

export function AIMessage({ message, onCopy, onRate, onReport }: AIMessageProps) {
  const [copied, setCopied] = useState(false);
  const [rating, setRating] = useState<number | null>(null);
  const [showReportDialog, setShowReportDialog] = useState(false);
  const { toast } = useToast();

  const handleCopy = () => {
    hapticSuccess();
    if (onCopy) {
      onCopy();
    }
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    toast({
      title: 'Copied to clipboard',
      description: 'Message content has been copied.',
    });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRate = (newRating: number) => {
    hapticLight();
    setRating(newRating);
    if (onRate) {
      onRate(message.id, newRating);
    }
    toast({
      title: 'Thank you for your feedback',
      description: 'Your rating helps us improve our responses.',
    });
  };

  const handleReport = () => {
    hapticMedium();
    if (onReport) {
      onReport(message.id);
    }
    setShowReportDialog(false);
    toast({
      title: 'Report submitted',
      description: 'Thank you for helping us maintain quality.',
    });
  };
  
  const handleReportClick = () => {
    hapticLight();
    setShowReportDialog(true);
  };

  const confidence = message.metadata?.confidence;
  const sources = message.metadata?.sources;
  const assumptions = message.metadata?.assumptions;

  const animationClass = shouldReduceMotion() ? '' : 'animate-in slide-in-from-left duration-300';
  
  return (
    <div 
      className={`flex gap-2 md:gap-3 ${animationClass}`}
      role="article"
      aria-label={`AI response from ${formatDistanceToNow(new Date(message.createdAt), { addSuffix: true })}`}
    >
      {/* AI Avatar - Smaller on mobile */}
      <Avatar className="h-7 w-7 md:h-8 md:w-8 border-2 border-purple-500/20 shrink-0" aria-label="AI Assistant">
        <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-500 text-white text-xs">
          <Sparkles className="h-3 w-3 md:h-4 md:w-4" />
        </AvatarFallback>
      </Avatar>

      <div className="flex flex-col flex-1 max-w-[85%] md:max-w-[80%] space-y-2">
        {/* Message Bubble - Simplified on mobile */}
        <div className="conversation-message-ai bg-muted rounded-2xl rounded-tl-sm px-3 py-2 md:px-4 md:py-3 shadow-sm">
          <p className="conversation-message-content text-sm md:text-base whitespace-pre-wrap break-words leading-relaxed">
            {message.content}
          </p>

          {/* Metadata Section - Collapsed on mobile */}
          {(confidence || assumptions || sources) && (
            <div className="mt-2 md:mt-3 pt-2 md:pt-3 border-t border-border/50 space-y-1.5 md:space-y-2">
              {/* Confidence Indicator */}
              {confidence && (
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    Confidence: {confidence}%
                  </Badge>
                </div>
              )}

              {/* Assumptions - Hidden on small mobile */}
              {assumptions && assumptions.length > 0 && (
                <div className="text-xs text-muted-foreground hidden sm:block">
                  <span className="font-medium">Assumptions:</span>
                  <ul className="list-disc list-inside mt-1 space-y-0.5">
                    {assumptions.map((assumption, index) => (
                      <li key={index}>{assumption}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Sources - Hidden on small mobile */}
              {sources && sources.length > 0 && (
                <div className="text-xs text-muted-foreground hidden sm:block">
                  <span className="font-medium">Sources:</span>
                  <ul className="list-none mt-1 space-y-0.5">
                    {sources.map((source, index) => (
                      <li key={index} className="flex items-center gap-1">
                        <ExternalLink className="h-3 w-3" />
                        <span className="truncate">{source}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Actions and Timestamp - Touch-friendly */}
        <div className="flex items-center justify-between gap-2 px-1">
          <span className="text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(message.createdAt), { addSuffix: true })}
          </span>

          <div className="flex items-center gap-0.5 md:gap-1">
            {/* Copy Button - Touch-friendly */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleCopy}
                    className="h-8 w-8 md:h-7 md:w-7 p-0 hover:bg-muted min-w-[44px] md:min-w-0"
                    aria-label={copied ? 'Copied to clipboard' : 'Copy message to clipboard'}
                  >
                    {copied ? (
                      <Check className="h-4 w-4 md:h-3 md:w-3 text-green-500" aria-hidden="true" />
                    ) : (
                      <Copy className="h-4 w-4 md:h-3 md:w-3" aria-hidden="true" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Copy to clipboard</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {/* Rating Buttons - Touch-friendly */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleRate(1)}
                    className={`h-8 w-8 md:h-7 md:w-7 p-0 hover:bg-muted min-w-[44px] md:min-w-0 ${
                      rating === 1 ? 'text-green-500' : ''
                    }`}
                    aria-label="Rate response as helpful"
                    aria-pressed={rating === 1}
                  >
                    <ThumbsUp className="h-4 w-4 md:h-3 md:w-3" aria-hidden="true" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Helpful response</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleRate(-1)}
                    className={`h-8 w-8 md:h-7 md:w-7 p-0 hover:bg-muted min-w-[44px] md:min-w-0 ${
                      rating === -1 ? 'text-red-500' : ''
                    }`}
                    aria-label="Rate response as not helpful"
                    aria-pressed={rating === -1}
                  >
                    <ThumbsDown className="h-4 w-4 md:h-3 md:w-3" aria-hidden="true" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Not helpful</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {/* Report Button - Touch-friendly */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleReportClick}
                    className="h-8 w-8 md:h-7 md:w-7 p-0 hover:bg-destructive/10 hover:text-destructive min-w-[44px] md:min-w-0"
                    aria-label="Report inappropriate content"
                  >
                    <Flag className="h-4 w-4 md:h-3 md:w-3" aria-hidden="true" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Report inappropriate content</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </div>

      {/* Report Confirmation Dialog */}
      <AlertDialog open={showReportDialog} onOpenChange={setShowReportDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Report Inappropriate Content</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to report this message? Our team will review it for quality and safety concerns.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleReport}>
              Report
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
