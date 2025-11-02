import React from 'react';
import { Keyboard, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { formatShortcut } from '@/hooks/useKeyboardShortcuts';
import { cn } from '@/lib/utils';

interface KeyboardShortcut {
  keys: string;
  description: string;
  category: 'navigation' | 'actions' | 'editing';
}

const shortcuts: KeyboardShortcut[] = [
  // Navigation shortcuts
  {
    keys: 'ArrowUp',
    description: 'Navigate to previous task',
    category: 'navigation',
  },
  {
    keys: 'ArrowDown',
    description: 'Navigate to next task',
    category: 'navigation',
  },
  {
    keys: 'ArrowLeft',
    description: 'Collapse current phase',
    category: 'navigation',
  },
  {
    keys: 'ArrowRight',
    description: 'Expand current phase',
    category: 'navigation',
  },
  
  // Action shortcuts
  {
    keys: 'Space',
    description: 'Toggle task completion status',
    category: 'actions',
  },
  {
    keys: 'Enter',
    description: 'Edit selected task',
    category: 'actions',
  },
  
  // Editing shortcuts
  {
    keys: 'Escape',
    description: 'Close modal or dialog',
    category: 'editing',
  },
  {
    keys: '?',
    description: 'Show keyboard shortcuts help',
    category: 'editing',
  },
];

interface KeyboardShortcutsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * KeyboardShortcutsDialog Component
 * 
 * Displays a help dialog showing all available keyboard shortcuts
 * for the action plan interface.
 * 
 * Requirements: Non-functional (Usability) - Task 42
 */
export function KeyboardShortcutsDialog({
  open,
  onOpenChange,
}: KeyboardShortcutsDialogProps) {
  const categoryLabels = {
    navigation: 'Navigation',
    actions: 'Actions',
    editing: 'Editing',
  };

  const groupedShortcuts = shortcuts.reduce((acc, shortcut) => {
    if (!acc[shortcut.category]) {
      acc[shortcut.category] = [];
    }
    acc[shortcut.category].push(shortcut);
    return acc;
  }, {} as Record<string, KeyboardShortcut[]>);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto"
        data-testid="keyboard-shortcuts-dialog"
      >
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Keyboard className="w-5 h-5 text-purple-500" />
              <DialogTitle>Keyboard Shortcuts</DialogTitle>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="h-8 w-8 p-0"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
          <DialogDescription>
            Use these keyboard shortcuts to navigate and interact with your action plan more efficiently.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {Object.entries(groupedShortcuts).map(([category, categoryShortcuts]) => (
            <div key={category}>
              <h3 className="text-sm font-semibold text-white mb-3">
                {categoryLabels[category as keyof typeof categoryLabels]}
              </h3>
              <div className="space-y-2">
                {categoryShortcuts.map((shortcut, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 rounded-lg bg-gray-900/50 border border-gray-800 hover:border-purple-500/30 transition-colors"
                  >
                    <span className="text-sm text-gray-300">
                      {shortcut.description}
                    </span>
                    <kbd
                      className={cn(
                        'px-3 py-1.5 text-xs font-mono font-semibold',
                        'bg-gray-800 text-purple-400 border border-gray-700',
                        'rounded shadow-sm'
                      )}
                    >
                      {formatShortcut(shortcut.keys)}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 p-4 rounded-lg bg-purple-500/10 border border-purple-500/30">
          <p className="text-xs text-gray-400">
            <strong className="text-purple-400">Tip:</strong> Press{' '}
            <kbd className="px-2 py-0.5 text-xs font-mono bg-gray-800 text-purple-400 border border-gray-700 rounded">
              ?
            </kbd>{' '}
            at any time to view this help dialog.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
