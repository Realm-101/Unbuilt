/**
 * UserMessage Component
 * 
 * Displays user messages in the conversation thread.
 * Right-aligned with user avatar, timestamp, and edit/delete options.
 * 
 * Requirements: 1.5, 1.6
 */

import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
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
import { Edit2, Trash2, Check, X } from 'lucide-react';
import { hapticLight, hapticMedium, hapticSuccess } from '@/lib/haptics';
import { getAnimationClasses, shouldReduceMotion } from '@/lib/mobile-optimizations';
import type { UserMessageProps } from '@/types';

export function UserMessage({ message, onEdit, onDelete }: UserMessageProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(message.content);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // Check if message can be edited (within 5 minutes)
  const messageAge = Date.now() - new Date(message.createdAt).getTime();
  const canEdit = messageAge < 5 * 60 * 1000; // 5 minutes in milliseconds

  const handleSaveEdit = () => {
    hapticSuccess();
    if (onEdit && editedContent.trim() !== message.content) {
      onEdit(message.id, editedContent.trim());
    }
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    hapticLight();
    setEditedContent(message.content);
    setIsEditing(false);
  };

  const handleDelete = () => {
    hapticMedium();
    if (onDelete) {
      onDelete(message.id);
    }
    setShowDeleteDialog(false);
  };
  
  const handleEditClick = () => {
    hapticLight();
    setIsEditing(true);
  };
  
  const handleDeleteClick = () => {
    hapticLight();
    setShowDeleteDialog(true);
  };

  const animationClass = shouldReduceMotion() ? '' : 'animate-in slide-in-from-right duration-300';
  
  return (
    <div 
      className={`flex justify-end gap-2 md:gap-3 ${animationClass}`}
      role="article"
      aria-label={`Your message from ${formatDistanceToNow(new Date(message.createdAt), { addSuffix: true })}`}
    >
      <div className="flex flex-col items-end max-w-[85%] md:max-w-[80%] space-y-1">
        {/* Message Bubble - Simplified on mobile */}
        <div className="conversation-message-user bg-primary text-primary-foreground rounded-2xl rounded-tr-sm px-3 py-2 md:px-4 md:py-3 shadow-sm">
          {isEditing ? (
            <div className="space-y-2">
              <Textarea
                value={editedContent}
                onChange={(e) => setEditedContent(e.target.value)}
                className="min-h-[60px] bg-primary-foreground/10 text-primary-foreground border-primary-foreground/20 text-sm"
                autoFocus
              />
              <div className="flex gap-2 justify-end">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleCancelEdit}
                  className="h-8 min-w-[44px] text-primary-foreground hover:bg-primary-foreground/10"
                >
                  <X className="h-4 w-4 md:mr-1" />
                  <span className="hidden md:inline">Cancel</span>
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={handleSaveEdit}
                  className="h-8 min-w-[44px]"
                >
                  <Check className="h-4 w-4 md:mr-1" />
                  <span className="hidden md:inline">Save</span>
                </Button>
              </div>
            </div>
          ) : (
            <p className="conversation-message-content text-sm md:text-base whitespace-pre-wrap break-words">
              {message.content}
            </p>
          )}
        </div>

        {/* Timestamp and Actions - Touch-friendly */}
        <div className="flex items-center gap-2 px-1">
          <span className="text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(message.createdAt), { addSuffix: true })}
            {message.editedAt && ' (edited)'}
          </span>

          {!isEditing && (
            <div className="flex gap-1">
              {canEdit && onEdit && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleEditClick}
                  className="h-8 w-8 md:h-6 md:w-6 p-0 hover:bg-muted min-w-[44px] md:min-w-0"
                  title="Edit message"
                  aria-label="Edit message"
                >
                  <Edit2 className="h-4 w-4 md:h-3 md:w-3" aria-hidden="true" />
                </Button>
              )}
              {onDelete && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleDeleteClick}
                  className="h-8 w-8 md:h-6 md:w-6 p-0 hover:bg-destructive/10 hover:text-destructive min-w-[44px] md:min-w-0"
                  title="Delete message"
                  aria-label="Delete message"
                >
                  <Trash2 className="h-4 w-4 md:h-3 md:w-3" aria-hidden="true" />
                </Button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* User Avatar - Smaller on mobile */}
      <Avatar className="h-7 w-7 md:h-8 md:w-8 border-2 border-primary/20 shrink-0">
        <AvatarFallback className="bg-primary text-primary-foreground text-xs">
          You
        </AvatarFallback>
      </Avatar>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Message</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this message? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
