# Zustand Stores Documentation

This directory contains all Zustand state management stores for the UX Information Architecture feature.

## Stores Overview

### 1. User Preferences Store (`userPreferencesStore.ts`)

Manages user preferences including role, onboarding status, tour progress, and accessibility settings.

**State:**
- `role`: User's selected role (entrepreneur, investor, product_manager, researcher, exploring)
- `onboardingCompleted`: Whether user has completed onboarding
- `tourProgress`: Array of completed tour steps
- `expandedSections`: Record of which UI sections are expanded
- `keyboardShortcuts`: Custom keyboard shortcuts
- `accessibilitySettings`: High contrast, reduced motion, screen reader settings

**Key Features:**
- Persists to localStorage
- Debounced sync to backend (2 seconds)
- Optimistic updates for better UX

**Usage:**
```typescript
import { useUserPreferencesStore } from '@/stores';

function MyComponent() {
  const { role, setRole, completeOnboarding } = useUserPreferencesStore();
  
  return (
    <button onClick={() => setRole('entrepreneur')}>
      Set Role
    </button>
  );
}
```

### 2. UI State Store (`uiStateStore.ts`)

Manages transient UI state like modals, tours, help panels, and navigation.

**State:**
- `isTourActive`: Whether interactive tour is running
- `currentTourStep`: Current step in the tour
- `isHelpPanelOpen`: Help panel visibility
- `activeModal`: Currently open modal ID
- `navigationExpanded`: Desktop navigation state
- `mobileMenuOpen`: Mobile menu state
- `isGlobalSearchOpen`: Global search modal state
- `isLoading`: Loading states by key

**Key Features:**
- No persistence (resets on page reload)
- Resets on logout
- Centralized loading state management

**Usage:**
```typescript
import { useUIStateStore } from '@/stores';

function MyComponent() {
  const { openModal, closeModal, activeModal } = useUIStateStore();
  
  return (
    <button onClick={() => openModal('upgrade-prompt')}>
      Open Modal
    </button>
  );
}
```

### 3. Progress Tracking Store (`progressTrackingStore.ts`)

Manages action plan progress tracking with undo support and batch updates.

**State:**
- `projectProgress`: Progress data by analysis ID
- `undoHistory`: Last 10 actions for undo functionality
- `isSyncing`: Sync status
- `pendingUpdates`: Queue of updates to sync

**Key Features:**
- Persists to localStorage
- Debounced sync to backend (1.5 seconds)
- Undo support (last 10 actions)
- Batch updates for performance
- Automatic phase and overall completion calculation

**Usage:**
```typescript
import { useProgressTrackingStore } from '@/stores';

function ActionPlanStep({ analysisId, stepId, phaseId }) {
  const { markStepComplete, projectProgress } = useProgressTrackingStore();
  const progress = projectProgress[analysisId];
  const isCompleted = progress?.completedSteps.includes(stepId);
  
  return (
    <input
      type="checkbox"
      checked={isCompleted}
      onChange={(e) => {
        if (e.target.checked) {
          markStepComplete(analysisId, stepId, phaseId, 10);
        }
      }}
    />
  );
}
```

## Backend Integration

All stores sync with backend API endpoints:

### User Preferences API
- `GET /api/user/preferences` - Load preferences
- `PUT /api/user/preferences` - Update preferences
- `PATCH /api/user/preferences/onboarding` - Mark onboarding complete
- `PATCH /api/user/preferences/tour` - Update tour progress

### Progress Tracking API
- `GET /api/progress/:analysisId` - Load progress
- `POST /api/progress/:analysisId` - Save progress
- `GET /api/progress/summary` - Get progress summary

## Database Schema

### user_preferences table
```sql
CREATE TABLE user_preferences (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  role TEXT,
  onboarding_completed BOOLEAN DEFAULT false,
  tour_progress JSONB DEFAULT '[]',
  expanded_sections JSONB DEFAULT '{}',
  keyboard_shortcuts JSONB DEFAULT '{}',
  accessibility_settings JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);
```

### action_plan_progress table
```sql
CREATE TABLE action_plan_progress (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  search_id INTEGER NOT NULL REFERENCES searches(id),
  completed_steps JSONB DEFAULT '[]',
  phase_completion JSONB DEFAULT '{}',
  overall_completion INTEGER DEFAULT 0,
  last_updated TIMESTAMP DEFAULT now(),
  created_at TIMESTAMP DEFAULT now()
);
```

## Best Practices

1. **Always use the store hooks in components** - Don't access stores directly
2. **Debouncing is automatic** - Don't manually debounce store updates
3. **Optimistic updates** - UI updates immediately, syncs in background
4. **Error handling** - Stores log errors but don't throw, ensuring UI stability
5. **Reset on logout** - Call `reset()` on all stores when user logs out

## Testing

To test stores:

```typescript
import { renderHook, act } from '@testing-library/react';
import { useUserPreferencesStore } from '@/stores';

test('should update role', () => {
  const { result } = renderHook(() => useUserPreferencesStore());
  
  act(() => {
    result.current.setRole('entrepreneur');
  });
  
  expect(result.current.role).toBe('entrepreneur');
});
```

## Migration

To run the database migration:

```bash
npm run db:migrate:ux
```

This creates all necessary tables for the UX Information Architecture feature.
