import { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, Keyboard } from 'lucide-react';
import { useUIStateStore } from '@/stores/uiStateStore';
import { useUserPreferencesStore } from '@/stores/userPreferencesStore';
import { formatShortcut } from '@/hooks/useKeyboardShortcuts';

interface ShortcutDefinition {
  id: string;
  name: string;
  description: string;
  category: 'navigation' | 'actions' | 'ui' | 'help';
  defaultShortcut: string;
}

// Define all shortcuts (same as in KeyboardShortcutsProvider)
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
    description: 'Show this shortcuts reference',
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

export function KeyboardShortcutsModal() {
  const isOpen = useUIStateStore((state) => state.isShortcutsModalOpen);
  const setOpen = useUIStateStore((state) => state.setShortcutsModalOpen);
  const keyboardShortcuts = useUserPreferencesStore((state) => state.keyboardShortcuts);
  
  const [searchQuery, setSearchQuery] = useState('');

  // Get custom or default shortcut for each action
  const getShortcut = (id: string, defaultShortcut: string): string => {
    return keyboardShortcuts[id] || defaultShortcut;
  };

  // Filter shortcuts based on search query
  const filteredShortcuts = useMemo(() => {
    if (!searchQuery.trim()) return SHORTCUTS;
    
    const query = searchQuery.toLowerCase();
    return SHORTCUTS.filter(
      (shortcut) =>
        shortcut.name.toLowerCase().includes(query) ||
        shortcut.description.toLowerCase().includes(query) ||
        shortcut.category.toLowerCase().includes(query)
    );
  }, [searchQuery]);

  // Group shortcuts by category
  const groupedShortcuts = useMemo(() => {
    const groups: Record<string, ShortcutDefinition[]> = {};
    
    filteredShortcuts.forEach((shortcut) => {
      if (!groups[shortcut.category]) {
        groups[shortcut.category] = [];
      }
      groups[shortcut.category].push(shortcut);
    });
    
    return groups;
  }, [filteredShortcuts]);

  return (
    <Dialog open={isOpen} onOpenChange={setOpen}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="w-5 h-5" />
            Keyboard Shortcuts
          </DialogTitle>
          <DialogDescription>
            Use these keyboard shortcuts to navigate and interact with Unbuilt more efficiently
          </DialogDescription>
        </DialogHeader>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search shortcuts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Shortcuts list */}
        <div className="flex-1 overflow-y-auto space-y-6 pr-2">
          {CATEGORY_ORDER.map((category) => {
            const shortcuts = groupedShortcuts[category];
            if (!shortcuts || shortcuts.length === 0) return null;

            return (
              <div key={category}>
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                  {CATEGORY_LABELS[category]}
                </h3>
                <div className="space-y-2">
                  {shortcuts.map((shortcut) => {
                    const shortcutKey = getShortcut(shortcut.id, shortcut.defaultShortcut);
                    const isCustom = keyboardShortcuts[shortcut.id] !== undefined;

                    return (
                      <div
                        key={shortcut.id}
                        className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-accent/50 transition-colors"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{shortcut.name}</span>
                            {isCustom && (
                              <Badge variant="secondary" className="text-xs">
                                Custom
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {shortcut.description}
                          </p>
                        </div>
                        <kbd className="ml-4 px-3 py-1.5 text-sm font-mono bg-muted rounded border border-border shadow-sm whitespace-nowrap">
                          {formatShortcut(shortcutKey)}
                        </kbd>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {filteredShortcuts.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <Keyboard className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No shortcuts found matching "{searchQuery}"</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pt-4 border-t text-sm text-muted-foreground">
          <p>
            Tip: You can customize these shortcuts in{' '}
            <span className="font-medium text-foreground">Settings → Keyboard Shortcuts</span>
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
