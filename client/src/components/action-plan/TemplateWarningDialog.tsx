import React from 'react';
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
import { AlertTriangle } from 'lucide-react';

interface TemplateWarningDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  templateName: string;
}

/**
 * TemplateWarningDialog Component
 * 
 * Warning dialog shown when user attempts to switch templates
 * Warns about data loss (existing phases and tasks will be replaced)
 */
export function TemplateWarningDialog({
  open,
  onOpenChange,
  onConfirm,
  templateName,
}: TemplateWarningDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="flame-card max-w-md">
        <AlertDialogHeader>
          <div className="flex items-center space-x-3 mb-2">
            <div className="p-2 rounded-full bg-orange-500/20">
              <AlertTriangle className="w-6 h-6 text-orange-500" />
            </div>
            <AlertDialogTitle className="text-xl text-white">
              Switch Template?
            </AlertDialogTitle>
          </div>
          <AlertDialogDescription className="text-gray-300 space-y-3">
            <p>
              You're about to apply the <span className="font-semibold text-white">{templateName}</span> template to your action plan.
            </p>
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30">
              <p className="text-red-400 font-medium mb-2">
                ⚠️ Warning: This action cannot be undone
              </p>
              <ul className="text-sm text-gray-400 space-y-1 list-disc list-inside">
                <li>All existing phases will be replaced</li>
                <li>All existing tasks will be deleted</li>
                <li>Custom tasks you created will be lost</li>
                <li>Task completion history will be cleared</li>
              </ul>
            </div>
            <p className="text-sm">
              The new template structure will be merged with your AI-generated insights.
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="bg-gray-700 hover:bg-gray-600 text-white border-gray-600">
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="bg-orange-600 hover:bg-orange-700 text-white"
          >
            Apply Template
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
