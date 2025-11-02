# Keyboard Shortcuts System

A comprehensive keyboard shortcuts system for the Unbuilt platform that provides context-aware shortcuts, customization, and a reference modal.

## Components

### KeyboardShortcutsProvider
Logic-only component that registers all global keyboard shortcuts. Automatically integrated into the app.

**Features:**
- Context-aware (doesn't trigger in input fields)
- Platform-specific modifier keys (Cmd on Mac, Ctrl on Windows/Linux)
- Custom event dispatching for page-specific actions
- Respects user preferences for custom shortcuts

### KeyboardShortcutsModal
Modal dialog that displays all available keyboard shortcuts organized by category.

**Features:**
- Search/filter shortcuts
- Platform-specific key display (Cmd vs Ctrl)
- Shows custom vs default shortcuts
- Triggered by "?" key

**Usage:**
```tsx
import { KeyboardShortcutsModal } from '@/components/keyboard-shortcuts';

// Modal is controlled by UI state store
const setShortcutsModalOpen = useUIStateStore((state) => state.setShortcutsModalOpen);

// Open modal
setShortcutsModalOpen(true);
```

### KeyboardShortcutsSettings
Settings interface for customizing keyboard shortcuts.

**Features:**
- Edit individual shortcuts
- Conflict detection
- Reset to defaults (individual or all)
- Validation of shortcut format
- Persistence to backend

**Usage:**
```tsx
import { KeyboardShortcutsSettings } from '@/components/keyboard-shortcuts';

// Add to settings page
<KeyboardShortcutsSettings />
```

## Hooks

### useKeyboardShortcuts
Core hook for registering and managing keyboard shortcuts.

**Features:**
- Context awareness (prevents triggering in input fields)
- Modifier key support (Ctrl, Alt, Shift, Meta/Cmd)
- Custom shortcut parsing
- Conflict detection

**Usage:**
```tsx
import { useKeyboardShortcuts, type KeyboardShortcut } from '@/hooks/useKeyboardShortcuts';

const shortcuts: KeyboardShortcut[] = [
  {
    id: 'my-action',
    name: 'My Action',
    description: 'Does something cool',
    category: 'actions',
    defaultShortcut: 'ctrl+m',
    handler: () => {
      // Your action here
    },
  },
];

useKeyboardShortcuts({ shortcuts, enabled: true });
```

### Utility Functions

#### formatShortcut(shortcut: string): string
Formats a shortcut string for display with platform-specific modifiers.

```tsx
formatShortcut('ctrl+k') // Returns "Ctrl+K" on Windows, "Cmd+K" on Mac
```

#### isValidShortcut(shortcut: string): boolean
Validates if a shortcut string is properly formatted.

```tsx
isValidShortcut('ctrl+k') // true
isValidShortcut('invalid') // false
```

#### shortcutsConflict(shortcut1: string, shortcut2: string): boolean
Checks if two shortcuts conflict.

```tsx
shortcutsConflict('ctrl+k', 'ctrl+k') // true
shortcutsConflict('ctrl+k', 'alt+k') // false
```

#### getModifierKeyName(): 'Cmd' | 'Ctrl'
Returns the platform-specific modifier key name.

```tsx
getModifierKeyName() // "Cmd" on Mac, "Ctrl" on Windows/Linux
```

## Default Shortcuts

### Navigation
- `Ctrl+K` - Global Search
- `Ctrl+H` - Go to Dashboard
- `Ctrl+Shift+H` - Search History
- `Ctrl+Shift+S` - Saved Results
- `Ctrl+Shift+T` - Trending

### Actions
- `Ctrl+N` - New Search
- `Ctrl+E` - Export
- `Ctrl+Shift+E` - Share
- `Ctrl+D` - Toggle Favorite

### UI Controls
- `Escape` - Close Modal
- `Ctrl+/` - Toggle Help Panel

### Help & Support
- `?` - Keyboard Shortcuts Reference
- `Ctrl+Shift+D` - Documentation

## Custom Events

The keyboard shortcuts system dispatches custom events for page-specific actions:

### keyboard-shortcut-export
Triggered when the export shortcut is pressed.

```tsx
useEffect(() => {
  const handleExport = () => {
    // Handle export
  };
  
  window.addEventListener('keyboard-shortcut-export', handleExport);
  return () => window.removeEventListener('keyboard-shortcut-export', handleExport);
}, []);
```

### keyboard-shortcut-share
Triggered when the share shortcut is pressed.

```tsx
useEffect(() => {
  const handleShare = () => {
    // Handle share
  };
  
  window.addEventListener('keyboard-shortcut-share', handleShare);
  return () => window.removeEventListener('keyboard-shortcut-share', handleShare);
}, []);
```

### keyboard-shortcut-favorite
Triggered when the favorite shortcut is pressed.

```tsx
useEffect(() => {
  const handleFavorite = () => {
    // Handle favorite toggle
  };
  
  window.addEventListener('keyboard-shortcut-favorite', handleFavorite);
  return () => window.removeEventListener('keyboard-shortcut-favorite', handleFavorite);
}, []);
```

## State Management

Keyboard shortcuts are stored in the user preferences store:

```tsx
interface UserPreferencesState {
  keyboardShortcuts: Record<string, string>; // action id -> shortcut
  setKeyboardShortcut: (action: string, shortcut: string) => void;
}
```

Changes are automatically synced to the backend with debouncing (2 seconds).

## Accessibility

- All shortcuts respect input field context
- Keyboard navigation throughout the settings interface
- Clear visual feedback for custom shortcuts
- Platform-specific key display
- Screen reader friendly labels

## Adding New Shortcuts

To add a new shortcut:

1. Add the shortcut definition to `KeyboardShortcutsProvider.tsx`:

```tsx
{
  id: 'my-new-action',
  name: 'My New Action',
  description: 'Description of what it does',
  category: 'actions', // or 'navigation', 'ui', 'help'
  defaultShortcut: 'ctrl+shift+m',
  handler: () => {
    // Your handler logic
  },
}
```

2. Add the same definition to `KeyboardShortcutsModal.tsx` and `KeyboardShortcutsSettings.tsx` in the `SHORTCUTS` array.

3. If it's a page-specific action, dispatch a custom event instead:

```tsx
handler: () => {
  const event = new CustomEvent('keyboard-shortcut-my-action');
  window.dispatchEvent(event);
}
```

## Best Practices

1. **Use standard modifiers**: Prefer Ctrl/Cmd for primary actions, add Shift for variations
2. **Avoid conflicts**: Check existing shortcuts before adding new ones
3. **Be consistent**: Use similar patterns for related actions
4. **Document clearly**: Provide clear names and descriptions
5. **Test on both platforms**: Ensure shortcuts work on Mac and Windows/Linux
6. **Respect context**: Don't override browser shortcuts or trigger in input fields

## Testing

The keyboard shortcuts system includes:
- Context awareness testing (input fields)
- Modifier key detection
- Conflict detection
- Custom shortcut persistence
- Platform-specific key display

## Future Enhancements

- Shortcut recording (press keys to set shortcut)
- Import/export shortcut configurations
- Shortcut profiles (different sets for different workflows)
- Visual shortcut hints on hover
- Shortcut analytics (most used shortcuts)
