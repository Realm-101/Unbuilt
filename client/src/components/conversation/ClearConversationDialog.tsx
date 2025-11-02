/**
 * ClearConversationDialog Component
 * 
 * Dialog for clearing conversation with confirmation.
 * Preserves original analysis when clearing and updates UI immediately.
 * 
 * Requirements: 5.4
 */

import { useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Trash2, AlertCircle, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';

interface ClearConversationDialogProps {
  conversationId: number;
  analysisId: number;
  onCleared?: () => void;
  trigger?: React.ReactNode;
}

export function ClearConversationDialog({
  conversationId,
  analysisId,
  onCleared,
  trigger,
}: ClearConversationDialogProps) {
  const [open, setOpen] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleClear = async () => {
    setClearing(true);
    setError(null);

    try {
      const response = await fetch(`/api/conversations/${conversationId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          confirm: true,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to clear conversation');
      }

      // Invalidate conversation queries to refresh UI
      await queryClient.invalidateQueries({ 
        queryKey: ['conversation', analysisId] 
      });
      await queryClient.invalidateQueries({ 
        queryKey: ['conversation-messages', conversationId] 
      });

      toast({
        title: 'Conversation cleared',
        description: 'Your conversation history has been cleared. The analysis is preserved.',
      });

      setOpen(false);

      // Call onCleared callback if provided
      if (onCleared) {
        onCleared();
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to clear conversation';
      setError(errorMessage);
      toast({
        title: 'Clear failed',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setClearing(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <Trash2 className="h-4 w-4 mr-2" />
            Clear Conversation
          </Button>
        )}
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Clear Conversation?</AlertDialogTitle>
          <AlertDialogDescription className="space-y-3">
            <p>
              This will permanently delete all messages in this conversation. This action cannot be
              undone.
            </p>
            <Alert>
              <AlertDescription className="text-sm">
                <strong>Note:</strong> Your original analysis and results will be preserved. Only
                the conversation history will be cleared.
              </AlertDescription>
            </Alert>
          </AlertDialogDescription>
        </AlertDialogHeader>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel disabled={clearing}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              handleClear();
            }}
            disabled={clearing}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {clearing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Clearing...
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4 mr-2" />
                Clear Conversation
              </>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
