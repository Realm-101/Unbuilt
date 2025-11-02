/**
 * KeyboardShortcutsDialog Component
 * 
 * Displays a reference of all keyboard shortcuts available in the conversation interface.
 * 
 * Requirements: All (WCAG 2.1 Level AA compliance)
 */

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Keyboard } from 'lucide-react';

interface KeyboardShortcutsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface Shortcut {
  keys: string[];
  description: string;
  context?: string;
}

const shortcuts: Shortcut[] = [
  {
    keys: ['Enter'],
    description: 'Send message',
    context: 'In input field',
  },
  {
    keys: ['Shift', 'Enter'],
    description: 'New line',
    context: 'In input field',
  },
  {
    keys: ['Escape'],
    description: 'Cancel/clear input',
    context: 'In input field',
  },
  {
    keys: ['Tab'],
    description: 'Navigate through messages and controls',
    context: 'Anywhere',
  },
  {
    keys: ['Arrow Keys'],
    description: 'Navigate suggested questions',
    context: 'In suggestions',
  },
  {
    keys: ['Enter'],
    description: 'Select suggested question',
    context: 'In suggestions',
  },
  {
    keys: ['Ctrl', '/'],
    description: 'Focus input field',
    context: 'Anywhere',
  },
  {
    keys: ['Ctrl', '?'],
    description: 'Show keyboard shortcuts',
    context: 'Anywhere',
  },
  {
    keys: ['Escape'],
    description: 'Return to input from suggestions',
    context: 'In suggestions',
  },
];

export function KeyboardShortcutsDialog({ open, onOpenChange }: KeyboardShortcutsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Keyboard className="h-5 w-5" />
            <DialogTitle>Keyboard Shortcuts</DialogTitle>
          </div>
          <DialogDescription>
            Use these keyboard shortcuts to navigate the conversation interface efficiently.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {shortcuts.map((shortcut, index) => (
            <div
              key={index}
              className="flex items-start justify-between gap-4 p-3 rounded-lg border bg-muted/50"
            >
              <div className="flex-1">
                <p className="text-sm font-medium">{shortcut.description}</p>
                {shortcut.context && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {shortcut.context}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {shortcut.keys.map((key, keyIndex) => (
                  <span key={keyIndex} className="flex items-center gap-1">
                    <Badge
                      variant="outline"
                      className="font-mono text-xs px-2 py-1"
                    >
                      {key}
                    </Badge>
                    {keyIndex < shortcut.keys.length - 1 && (
                      <span className="text-xs text-muted-foreground">+</span>
                    )}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 p-4 rounded-lg bg-muted/30 border">
          <p className="text-sm text-muted-foreground">
            <strong>Tip:</strong> Press <Badge variant="outline" className="font-mono text-xs mx-1">Ctrl</Badge> +{' '}
            <Badge variant="outline" className="font-mono text-xs mx-1">?</Badge> anytime to view this reference.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
