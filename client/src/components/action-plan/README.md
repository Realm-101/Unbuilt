# Action Plan Components

This directory contains components for the interactive action plan feature, which transforms static AI-generated plans into dynamic, customizable roadmaps with progress tracking.

## Components

### ActionPlanView

Main container component for displaying and managing action plans.

**Features:**
- TanStack Query integration for data fetching
- Loading and error states with retry logic
- Overall progress bar display
- Zustand store for UI state management
- Optimistic updates for task status changes
- Real-time progress tracking

**Props:**
```typescript
interface ActionPlanViewProps {
  searchId: number;        // ID of the search to load plan for
  onComplete?: () => void; // Callback when plan is 100% complete
}
```

**Usage:**
```tsx
import { ActionPlanView } from '@/components/action-plan';

function MyPage() {
  return (
    <ActionPlanView
      searchId={123}
      onComplete={() => console.log('Plan completed!')}
    />
  );
}
```

## Hooks

### useActionPlan

Fetches action plan data for a given search ID.

```typescript
const { data, isLoading, error, refetch } = useActionPlan(searchId);
```

### useActionPlanProgress

Fetches progress metrics for a plan.

```typescript
const { data, isLoading } = useActionPlanProgress(planId);
```

### useUpdateTaskStatus

Mutation hook for updating task status with optimistic updates.

```typescript
const mutation = useUpdateTaskStatus();

mutation.mutate({
  id: taskId,
  status: 'completed'
});
```

## Store

### useActionPlanStore

Zustand store for managing UI state:

```typescript
const {
  expandedPhases,      // Set of expanded phase IDs
  selectedTaskId,      // Currently selected task
  viewMode,            // 'all' | 'incomplete' | 'completed'
  filterByAssignee,    // Filter by user ID
  togglePhase,         // Toggle phase expansion
  selectTask,          // Select a task
  setViewMode,         // Change view mode
  reset,               // Reset state
} = useActionPlanStore();
```

## Types

### ActionPlanWithDetails

Extended action plan with phases and tasks:

```typescript
interface ActionPlanWithDetails extends ActionPlan {
  phases: PlanPhaseWithTasks[];
}
```

### ProgressMetrics

Progress tracking metrics:

```typescript
interface ProgressMetrics {
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  notStartedTasks: number;
  skippedTasks: number;
  completionPercentage: number;
  currentPhase: string | null;
  estimatedCompletion: string | null;
  velocity: number;
  averageTaskTime: number;
}
```

## API Integration

The components integrate with the following API endpoints:

- `GET /api/plans/:searchId` - Fetch action plan
- `GET /api/plans/:planId/progress` - Fetch progress metrics
- `PATCH /api/tasks/:taskId` - Update task

## State Management

### Server State (TanStack Query)

- Action plan data
- Progress metrics
- Task updates

**Query Keys:**
- `['/api/plans', searchId]` - Action plan data
- `['/api/plans', planId, 'progress']` - Progress metrics

### Client State (Zustand)

- Expanded/collapsed phases
- Selected task
- View mode filters
- UI preferences

## Error Handling

The component implements comprehensive error handling:

1. **Loading States**: Shows spinner while fetching data
2. **Error States**: Displays error message with retry button
3. **Empty States**: Shows helpful message when no plan exists
4. **Optimistic Updates**: Rolls back on error

## Performance Optimizations

- **Stale Time**: 30s for plan data, 10s for progress
- **Refetch on Focus**: Disabled to reduce unnecessary requests
- **Optimistic Updates**: Immediate UI feedback
- **Query Invalidation**: Smart invalidation on mutations

### PhaseAccordion

Collapsible phase sections with progress indicators and smooth animations.

**Features:**
- Expand/collapse functionality with smooth height animations
- Phase progress indicator when collapsed (e.g., "3 of 5 tasks completed")
- Visual progress bars with gradient colors
- Phase status icons (completed, in progress, not started)
- Keyboard navigation (Arrow keys, Enter, Space)
- Neon Flame theme styling
- Full accessibility support (ARIA attributes, focus management)

**Props:**
```typescript
interface PhaseAccordionProps {
  phase: PlanPhaseWithTasks;
  planId: number;
}
```

**Usage:**
```tsx
import { PhaseAccordion } from '@/components/action-plan';

function MyPlanView() {
  return (
    <PhaseAccordion
      phase={phase}
      planId={planId}
    />
  );
}
```

**Keyboard Navigation:**
- **Enter/Space**: Toggle expansion
- **Arrow Down**: Focus next phase
- **Arrow Up**: Focus previous phase

**Status**: ✅ Implemented (Task 6)

## Future Enhancements

The following components will be added in subsequent tasks:

- **TaskItem**: Individual task display with actions
- **TaskEditor**: Modal for creating/editing tasks
- **ProgressDashboard**: Detailed analytics view
- **TemplateSelector**: Template selection interface
- **ExportDialog**: Export options

## Testing

Unit tests should cover:

- Data fetching and loading states
- Error handling and retry logic
- Optimistic updates
- Store state management
- Progress calculation

## Accessibility

- Keyboard navigation support
- ARIA labels for interactive elements
- Focus management
- Screen reader announcements

## Related Documentation

- [Design Document](/.kiro/specs/action-plan-customization/design.md)
- [Requirements](/.kiro/specs/action-plan-customization/requirements.md)
- [Tasks](/.kiro/specs/action-plan-customization/tasks.md)
