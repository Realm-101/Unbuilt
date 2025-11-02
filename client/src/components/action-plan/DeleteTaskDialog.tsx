import React from 'react';
import { AlertTriangle } from 'lucide-react';
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
import type { PlanTask } from '@/types/action-plan';

interface DeleteTaskDialogProps {
  task: PlanTask | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  onSkip?: () => void;
}

/**
 * DeleteTaskDialog Component
 * 
 * Confirmation dialog for task deletion with:
 * - Warning about permanent deletion
 * - Option to skip instead of delete
 * - Clear action buttons
 * 
 * Requirements: 2.5
 */
export function DeleteTaskDialog({
  task,
  open,
  onOpenChange,
  onConfirm,
  onSkip,
}: DeleteTaskDialogProps) {
  if (!task) return null;

  const handleSkip = () => {
    if (onSkip) {
      onSkip();
    }
    onOpenChange(false);
  };

  const handleDelete = () => {
    onConfirm();
    onOpenChange(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="flame-card max-w-md">
        <AlertDialogHeader>
          <div className="flex items-center space-x-3 mb-2">
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-red-400" />
            </div>
            <AlertDialogTitle className="text-xl text-white">
              Delete Task?
            </AlertDialogTitle>
          </div>
        </AlertDialogHeader>
        <AlertDialogDescription className="text-gray-300 space-y-3">
          <p>
            Are you sure you want to delete <span className="font-semibold text-white">"{task.title}"</span>?
          </p>
          <p className="text-sm">
            This action cannot be undone. The task and its history will be permanently removed.
          </p>
          {!task.isCustom && (
            <div className="p-3 rounded-lg bg-purple-500/10 border border-purple-500/30">
              <p className="text-sm text-purple-300">
                💡 <strong>Tip:</strong> This is an AI-generated task. Consider marking it as "Skipped" instead if you want to keep it for reference.
              </p>
            </div>
          )}
        </AlertDialogDescription>
        <AlertDialogFooter className="flex-col sm:flex-row gap-2">
          <AlertDialogCancel className="w-full sm:w-auto">
            Cancel
          </AlertDialogCancel>
          {onSkip && (
            <button
              onClick={handleSkip}
              className="w-full sm:w-auto px-4 py-2 rounded-md bg-gray-700 hover:bg-gray-600 text-white transition-colors"
            >
              Skip Instead
            </button>
          )}
          <AlertDialogAction
            onClick={handleDelete}
            className="w-full sm:w-auto bg-red-600 hover:bg-red-700 text-white"
          >
            Delete Task
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
