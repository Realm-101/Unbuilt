import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Keyboard, RotateCcw, AlertCircle, Check } from 'lucide-react';
import { useUserPreferencesStore } from '@/stores/userPreferencesStore';
import {
  formatShortcut,
  isValidShortcut,
  shortcutsConflict,
} from '@/hooks/useKeyboardShortcuts';
import { useToast } from '@/hooks/use-toast';

interface ShortcutDefinition {
  id: string;
  name: string;
  description: string;
  category: 'navigation' | 'actions' | 'ui' | 'help';
  defaultShortcut: string;
}

// Same shortcuts as in KeyboardShortcutsModal
const SHORTCUTS: ShortcutDefinition[] = [
  // Navigation
  {
    id: 'search',
    name: 'Global Search',
    description: 'Open global search',
    category: 'navigation',
    defaultShortcut: 'ctrl+k',
  },
  {
    id: 'dashboard',
    name: 'Go to Dashboard',
    description: 'Navigate to dashboard',
    category: 'navigation',
    defaultShortcut: 'ctrl+h',
  },
  {
    id: 'history',
    name: 'Search History',
    description: 'View search history',
    category: 'navigation',
    defaultShortcut: 'ctrl+shift+h',
  },
  {
    id: 'saved',
    name: 'Saved Results',
    description: 'View saved results',
    category: 'navigation',
    defaultShortcut: 'ctrl+shift+s',
  },
  {
    id: 'trending',
    name: 'Trending',
    description: 'View trending searches',
    category: 'navigation',
    defaultShortcut: 'ctrl+shift+t',
  },
  
  // Actions
  {
    id: 'new-search',
    name: 'New Search',
    description: 'Start a new search',
    category: 'actions',
    defaultShortcut: 'ctrl+n',
  },
  {
    id: 'export',
    name: 'Export',
    description: 'Export current view',
    category: 'actions',
    defaultShortcut: 'ctrl+e',
  },
  {
    id: 'share',
    name: 'Share',
    description: 'Share current view',
    category: 'actions',
    defaultShortcut: 'ctrl+shift+e',
  },
  {
    id: 'favorite',
    name: 'Toggle Favorite',
    description: 'Add/remove from favorites',
    category: 'actions',
    defaultShortcut: 'ctrl+d',
  },
  
  // UI
  {
    id: 'close-modal',
    name: 'Close Modal',
    description: 'Close current modal or dialog',
    category: 'ui',
    defaultShortcut: 'escape',
  },
  {
    id: 'toggle-help',
    name: 'Toggle Help Panel',
    description: 'Open/close help panel',
    category: 'ui',
    defaultShortcut: 'ctrl+/',
  },
  
  // Help
  {
    id: 'help',
    name: 'Keyboard Shortcuts',
    description: 'Show shortcuts reference',
    category: 'help',
    defaultShortcut: '?',
  },
  {
    id: 'documentation',
    name: 'Documentation',
    description: 'Open documentation',
    category: 'help',
    defaultShortcut: 'ctrl+shift+d',
  },
];

const CATEGORY_LABELS = {
  navigation: 'Navigation',
  actions: 'Actions',
  ui: 'UI Controls',
  help: 'Help & Support',
};

const CATEGORY_ORDER: Array<keyof typeof CATEGORY_LABELS> = ['navigation', 'actions', 'ui', 'help'];

export function KeyboardShortcutsSettings() {
  const keyboardShortcuts = useUserPreferencesStore((state) => state.keyboardShortcuts);
  const setKeyboardShortcut = useUserPreferencesStore((state) => state.setKeyboardShortcut);
  const { toast } = useToast();
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [error, setError] = useState<string | null>(null);

  const getShortcut = (id: string, defaultShortcut: string): string => {
    return keyboardShortcuts[id] || defaultShortcut;
  };

  const handleEdit = (id: string, currentShortcut: string) => {
    setEditingId(id);
    setEditValue(currentShortcut);
    setError(null);
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditValue('');
    setError(null);
  };

  const handleSave = (id: string, defaultShortcut: string) => {
    const newShortcut = editValue.trim().toLowerCase();
    
    // Validate shortcut format
    if (!isValidShortcut(newShortcut)) {
      setError('Invalid shortcut format. Use format like "ctrl+k" or "alt+shift+s"');
      return;
    }

    // Check for conflicts with other shortcuts
    const conflict = SHORTCUTS.find(
      (s) =>
        s.id !== id &&
        shortcutsConflict(newShortcut, getShortcut(s.id, s.defaultShortcut))
    );

    if (conflict) {
      setError(`This shortcut conflicts with "${conflict.name}"`);
      return;
    }

    // Save the shortcut
    setKeyboardShortcut(id, newShortcut);
    setEditingId(null);
    setEditValue('');
    setError(null);

    toast({
      title: 'Shortcut updated',
      description: `"${SHORTCUTS.find(s => s.id === id)?.name}" shortcut has been updated`,
    });
  };

  const handleReset = (id: string, defaultShortcut: string) => {
    setKeyboardShortcut(id, defaultShortcut);
    setEditingId(null);
    setEditValue('');
    setError(null);

    toast({
      title: 'Shortcut reset',
      description: `"${SHORTCUTS.find(s => s.id === id)?.name}" shortcut has been reset to default`,
    });
  };

  const handleResetAll = () => {
    SHORTCUTS.forEach((shortcut) => {
      setKeyboardShortcut(shortcut.id, shortcut.defaultShortcut);
    });

    toast({
      title: 'All shortcuts reset',
      description: 'All keyboard shortcuts have been reset to their defaults',
    });
  };

  // Group shortcuts by category
  const groupedShortcuts: Record<string, ShortcutDefinition[]> = {};
  SHORTCUTS.forEach((shortcut) => {
    if (!groupedShortcuts[shortcut.category]) {
      groupedShortcuts[shortcut.category] = [];
    }
    groupedShortcuts[shortcut.category].push(shortcut);
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Keyboard className="w-6 h-6" />
            Keyboard Shortcuts
          </h2>
          <p className="text-muted-foreground mt-1">
            Customize keyboard shortcuts to match your workflow
          </p>
        </div>
        <Button variant="outline" onClick={handleResetAll}>
          <RotateCcw className="w-4 h-4 mr-2" />
          Reset All
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-6">
        {CATEGORY_ORDER.map((category) => {
          const shortcuts = groupedShortcuts[category];
          if (!shortcuts || shortcuts.length === 0) return null;

          return (
            <Card key={category}>
              <CardHeader>
                <CardTitle className="text-lg">{CATEGORY_LABELS[category]}</CardTitle>
                <CardDescription>
                  Shortcuts for {CATEGORY_LABELS[category].toLowerCase()}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {shortcuts.map((shortcut) => {
                  const currentShortcut = getShortcut(shortcut.id, shortcut.defaultShortcut);
                  const isCustom = keyboardShortcuts[shortcut.id] !== undefined &&
                                   keyboardShortcuts[shortcut.id] !== shortcut.defaultShortcut;
                  const isEditing = editingId === shortcut.id;

                  return (
                    <div
                      key={shortcut.id}
                      className="flex items-center justify-between py-3 border-b last:border-0"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Label className="font-medium">{shortcut.name}</Label>
                          {isCustom && (
                            <Badge variant="secondary" className="text-xs">
                              Custom
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {shortcut.description}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 ml-4">
                        {isEditing ? (
                          <>
                            <Input
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              placeholder="e.g., ctrl+k"
                              className="w-40"
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  handleSave(shortcut.id, shortcut.defaultShortcut);
                                } else if (e.key === 'Escape') {
                                  handleCancel();
                                }
                              }}
                            />
                            <Button
                              size="sm"
                              onClick={() => handleSave(shortcut.id, shortcut.defaultShortcut)}
                            >
                              <Check className="w-4 h-4" />
                            </Button>
                            <Button size="sm" variant="ghost" onClick={handleCancel}>
                              Cancel
                            </Button>
                          </>
                        ) : (
                          <>
                            <kbd className="px-3 py-1.5 text-sm font-mono bg-muted rounded border border-border shadow-sm">
                              {formatShortcut(currentShortcut)}
                            </kbd>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEdit(shortcut.id, currentShortcut)}
                            >
                              Edit
                            </Button>
                            {isCustom && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleReset(shortcut.id, shortcut.defaultShortcut)}
                              >
                                <RotateCcw className="w-4 h-4" />
                              </Button>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          <strong>Tip:</strong> Use modifiers like "ctrl", "alt", "shift", or "meta" (Cmd on Mac)
          combined with a key. Examples: "ctrl+k", "alt+shift+s", "meta+n"
        </AlertDescription>
      </Alert>
    </div>
  );
}
