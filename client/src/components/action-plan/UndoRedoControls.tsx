import React from 'react';
import { Undo2, Redo2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface UndoRedoControlsProps {
  /** Whether undo is available */
  canUndo: boolean;
  /** Whether redo is available */
  canRedo: boolean;
  /** Callback when undo is clicked */
  onUndo: () => void;
  /** Callback when redo is clicked */
  onRedo: () => void;
  /** Description of next undo action */
  undoDescription?: string | null;
  /** Description of next redo action */
  redoDescription?: string | null;
  /** Whether currently performing undo/redo */
  isPerforming?: boolean;
  /** Additional CSS classes */
  className?: string;
}

/**
 * UndoRedoControls Component
 * 
 * Displays undo/redo buttons with tooltips showing action descriptions.
 * Buttons are disabled when no actions are available or when performing.
 * 
 * Requirements: Non-functional (Usability) - Task 45
 */
export function UndoRedoControls({
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  undoDescription,
  redoDescription,
  isPerforming = false,
  className,
}: UndoRedoControlsProps) {
  return (
    <TooltipProvider>
      <div className={cn('flex items-center gap-2', className)}>
        {/* Undo Button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              onClick={onUndo}
              disabled={!canUndo || isPerforming}
              className={cn(
                'border-purple-500/50 hover:bg-purple-500/10',
                'transition-all duration-200',
                !canUndo && 'opacity-50 cursor-not-allowed'
              )}
              data-testid="undo-button"
            >
              <Undo2 className="w-4 h-4" />
              <span className="ml-2 hidden sm:inline">Undo</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>
              {canUndo && undoDescription
                ? `Undo: ${undoDescription}`
                : 'No actions to undo'}
            </p>
            <p className="text-xs text-gray-400 mt-1">Ctrl+Z</p>
          </TooltipContent>
        </Tooltip>
        
        {/* Redo Button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              onClick={onRedo}
              disabled={!canRedo || isPerforming}
              className={cn(
                'border-purple-500/50 hover:bg-purple-500/10',
                'transition-all duration-200',
                !canRedo && 'opacity-50 cursor-not-allowed'
              )}
              data-testid="redo-button"
            >
              <Redo2 className="w-4 h-4" />
              <span className="ml-2 hidden sm:inline">Redo</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>
              {canRedo && redoDescription
                ? `Redo: ${redoDescription}`
                : 'No actions to redo'}
            </p>
            <p className="text-xs text-gray-400 mt-1">Ctrl+Y</p>
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
}
