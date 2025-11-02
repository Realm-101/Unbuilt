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
import { AlertTriangle, CheckCircle2, Circle } from 'lucide-react';
import type { PlanTask } from '@/types/action-plan';
import { cn } from '@/lib/utils';

interface DependencyWarningDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  task: PlanTask;
  incompletePrerequisites: PlanTask[];
}

/**
 * DependencyWarningDialog Component
 * 
 * Shows warning when user tries to complete task with incomplete prerequisites
 * Allows override option with confirmation
 * 
 * Requirements: 5.5
 */
export function DependencyWarningDialog({
  open,
  onOpenChange,
  onConfirm,
  task,
  incompletePrerequisites,
}: DependencyWarningDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="flame-card max-w-2xl">
        <AlertDialogHeader>
          <div className="flex items-center space-x-3 mb-2">
            <AlertTriangle className="w-6 h-6 text-yellow-500" />
            <AlertDialogTitle className="text-xl">
              Incomplete Prerequisites
            </AlertDialogTitle>
          </div>
          <AlertDialogDescription className="text-gray-300 text-base">
            This task has {incompletePrerequisites.length} incomplete prerequisite{incompletePrerequisites.length !== 1 ? 's' : ''}.
            Completing it now may affect your workflow.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4 my-4">
          {/* Task being completed */}
          <div className="p-4 rounded-lg bg-purple-500/10 border border-purple-500/30">
            <p className="text-sm font-medium text-purple-400 mb-2">
              Task you're trying to complete:
            </p>
            <p className="text-white font-semibold">
              {task.title}
            </p>
          </div>

          {/* Incomplete prerequisites */}
          <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
            <p className="text-sm font-medium text-yellow-500 mb-3">
              Incomplete prerequisites ({incompletePrerequisites.length}):
            </p>
            <div className="space-y-3">
              {incompletePrerequisites.map((prereqTask) => (
                <div 
                  key={prereqTask.id}
                  className="flex items-start space-x-3 p-3 rounded-lg bg-gray-900/50"
                >
                  {prereqTask.status === 'in_progress' ? (
                    <Circle className="w-4 h-4 text-orange-500 mt-0.5 flex-shrink-0" />
                  ) : (
                    <Circle className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-medium">
                      {prereqTask.title}
                    </p>
                    {prereqTask.description && (
                      <p className="text-sm text-gray-400 mt-1 line-clamp-2">
                        {prereqTask.description}
                      </p>
                    )}
                    <div className="flex items-center space-x-2 mt-2">
                      <span className={cn(
                        "text-xs px-2 py-1 rounded-full",
                        prereqTask.status === 'in_progress'
                          ? "bg-orange-500/20 text-orange-400"
                          : "bg-gray-500/20 text-gray-400"
                      )}>
                        {prereqTask.status === 'in_progress' ? 'In Progress' : 'Not Started'}
                      </span>
                      {prereqTask.estimatedTime && (
                        <span className="text-xs text-gray-500">
                          Est. {prereqTask.estimatedTime}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Warning message */}
          <div className="flex items-start space-x-3 p-4 rounded-lg bg-red-500/10 border border-red-500/30">
            <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm text-red-400 font-medium mb-1">
                Warning
              </p>
              <p className="text-sm text-gray-300">
                Completing this task before its prerequisites may lead to:
              </p>
              <ul className="list-disc list-inside text-sm text-gray-400 mt-2 space-y-1">
                <li>Workflow disruption</li>
                <li>Incomplete or incorrect implementation</li>
                <li>Need to redo work later</li>
                <li>Confusion for team members (if applicable)</li>
              </ul>
            </div>
          </div>

          {/* Recommendation */}
          <div className="flex items-start space-x-3 p-4 rounded-lg bg-green-500/10 border border-green-500/30">
            <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm text-green-400 font-medium mb-1">
                Recommendation
              </p>
              <p className="text-sm text-gray-300">
                We recommend completing the prerequisite tasks first to ensure a smooth workflow.
                However, if you have a specific reason to proceed, you can override this warning.
              </p>
            </div>
          </div>
        </div>

        <AlertDialogFooter className="flex-col sm:flex-row gap-2">
          <AlertDialogCancel className="w-full sm:w-auto">
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="w-full sm:w-auto bg-yellow-600 hover:bg-yellow-700 text-white"
          >
            Override and Complete Anyway
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
