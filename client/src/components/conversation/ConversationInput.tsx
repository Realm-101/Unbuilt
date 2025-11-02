/**
 * ConversationInput Component
 * 
 * Auto-expanding textarea for user input with character count,
 * keyboard shortcuts, and validation.
 * 
 * Requirements: 1.2, 1.3, 7.3
 */

import { useState, useRef, useEffect, KeyboardEvent, forwardRef, useImperativeHandle } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Send, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { hapticLight, hapticSuccess, hapticError } from '@/lib/haptics';
import type { ConversationInputProps } from '@/types';
import { ConversationUpgradePrompt, RemainingQuestionsIndicator } from './ConversationUpgradePrompt';

export const ConversationInput = forwardRef<HTMLTextAreaElement, ConversationInputProps>(function ConversationInput({
  onSubmit,
  disabled = false,
  placeholder = 'Ask a follow-up question...',
  maxLength = 1000,
  remainingQuestions,
  questionLimit,
  userTier = 'free',
}, ref) {
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { toast } = useToast();

  // Expose textarea ref to parent
  useImperativeHandle(ref, () => textareaRef.current as HTMLTextAreaElement);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [content]);

  // Focus textarea on mount
  useEffect(() => {
    if (textareaRef.current && !disabled) {
      textareaRef.current.focus();
    }
  }, [disabled]);

  // Validate input
  const validateInput = (text: string): { valid: boolean; error?: string } => {
    const trimmed = text.trim();
    
    if (!trimmed) {
      return { valid: false, error: 'Please enter a question' };
    }
    
    if (trimmed.length > maxLength) {
      return { valid: false, error: `Message is too long (max ${maxLength} characters)` };
    }
    
    if (trimmed.length < 3) {
      return { valid: false, error: 'Message is too short (min 3 characters)' };
    }
    
    return { valid: true };
  };

  // Sanitize input
  const sanitizeInput = (text: string): string => {
    // Remove HTML tags
    let sanitized = text.replace(/<[^>]*>/g, '');
    
    // Remove excessive whitespace
    sanitized = sanitized.replace(/\s+/g, ' ');
    
    // Trim
    sanitized = sanitized.trim();
    
    return sanitized;
  };

  // Handle submit
  const handleSubmit = async () => {
    const validation = validateInput(content);
    
    if (!validation.valid) {
      hapticError();
      toast({
        title: 'Invalid input',
        description: validation.error,
        variant: 'destructive',
      });
      return;
    }

    const sanitized = sanitizeInput(content);
    
    hapticLight();
    setIsSubmitting(true);
    try {
      await onSubmit(sanitized);
      hapticSuccess();
      setContent('');
      
      // Reset textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    } catch (error) {
      hapticError();
      console.error('Failed to submit message:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle keyboard shortcuts
  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // Enter to send (without Shift)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
    
    // Shift+Enter for newline (default behavior)
  };

  const characterCount = content.length;
  const isNearLimit = characterCount > maxLength * 0.8;
  const isOverLimit = characterCount > maxLength;
  const canSubmit = !disabled && !isSubmitting && content.trim().length > 0 && !isOverLimit;

  // Show upgrade prompt if at or near limit
  const showUpgradePrompt = userTier === 'free' && remainingQuestions !== undefined && remainingQuestions <= 2;
  const isAtLimit = remainingQuestions === 0;

  return (
    <div className="space-y-2">
      {/* Upgrade Prompt (Free Tier) */}
      {showUpgradePrompt && questionLimit !== undefined && (
        <ConversationUpgradePrompt
          remaining={remainingQuestions}
          limit={questionLimit}
          tier={userTier}
          variant={isAtLimit ? 'inline' : 'banner'}
        />
      )}

      {/* Input Container */}
      <div className="relative">
        <Textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled || isSubmitting || remainingQuestions === 0}
          className={`min-h-[60px] max-h-[200px] pr-24 resize-none ${
            isOverLimit ? 'border-destructive focus-visible:ring-destructive' : ''
          }`}
          aria-label="Message input"
          aria-describedby="character-count"
        />

        {/* Character Count and Send Button */}
        <div className="absolute bottom-2 right-2 flex items-center gap-2">
          <Badge
            id="character-count"
            variant={isOverLimit ? 'destructive' : isNearLimit ? 'secondary' : 'outline'}
            className="text-xs"
          >
            {characterCount}/{maxLength}
          </Badge>
          
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="h-8 w-8 p-0"
            aria-label="Send message"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Keyboard Shortcuts Hint and Remaining Questions */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          Press <kbd className="px-1.5 py-0.5 text-xs font-semibold bg-muted rounded">Enter</kbd> to send,{' '}
          <kbd className="px-1.5 py-0.5 text-xs font-semibold bg-muted rounded">Shift</kbd> +{' '}
          <kbd className="px-1.5 py-0.5 text-xs font-semibold bg-muted rounded">Enter</kbd> for new line
        </p>
        
        {/* Remaining Questions Indicator */}
        {userTier === 'free' && remainingQuestions !== undefined && questionLimit !== undefined && !showUpgradePrompt && (
          <RemainingQuestionsIndicator
            remaining={remainingQuestions}
            limit={questionLimit}
            tier={userTier}
          />
        )}
      </div>
    </div>
  );
});
