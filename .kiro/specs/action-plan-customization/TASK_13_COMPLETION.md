# Task 13 Completion: Drag-and-Drop Task Reordering

## Task Description
Add drag-and-drop task reordering functionality to allow users to reorder tasks within a phase using intuitive drag-and-drop interactions.

## Implementation Summary

### 1. Installed Dependencies
- `@dnd-kit/core` - Core drag-and-drop functionality
- `@dnd-kit/sortable` - Sortable list functionality
- `@dnd-kit/utilities` - Utility functions for transforms

### 2. Backend (Already Implemented)
The backend reorder functionality was already implemented in previous tasks:
- `POST /api/plans/:planId/tasks/reorder` endpoint exists in `server/routes/plans.ts`
- `TaskService.reorderTasks()` method handles the reordering logic
- Proper validation and authorization middleware in place

### 3. Frontend Hook
Added `useReorderTasks` hook in `client/src/hooks/useActionPlan.ts`:
- Accepts `planId` and returns mutation function
- Takes `phaseId` and `taskIds` array as parameters
- Implements optimistic updates for instant UI feedback
- Handles error rollback if server request fails
- Invalidates queries to ensure data consistency

### 4. Created SortableTaskItem Component
New component `client/src/components/action-plan/SortableTaskItem.tsx`:
- Wraps TaskItem with sortable functionality from @dnd-kit
- Uses `useSortable` hook for drag-and-drop behavior
- Applies CSS transforms for smooth animations
- Reduces opacity during drag for visual feedback
- Passes drag handle props to TaskItem

### 5. Updated TaskItem Component
Modified `client/src/components/action-plan/TaskItem.tsx`:
- Added `dragHandleProps` prop to accept sortable listeners
- Spread drag handle props onto the GripVertical button
- Drag handle only visible on hover (opacity transition)
- Proper ARIA labels for accessibility

### 6. Updated PhaseAccordion Component
Enhanced `client/src/components/action-plan/PhaseAccordion.tsx`:
- Integrated DndContext from @dnd-kit/core
- Added SortableContext for managing sortable items
- Implemented local state (`localTasks`) for optimistic updates
- Configured sensors for pointer and keyboard drag interactions
- Added drag start/end handlers with proper state management
- Implemented DragOverlay for visual feedback during drag
- Integrated with `useReorderTasks` mutation
- Shows success/error toasts for user feedback
- Automatic rollback on error

### 7. Drag-and-Drop Features
- **Activation Constraint**: 8px movement required before drag starts (prevents accidental drags)
- **Keyboard Support**: Full keyboard navigation with sortableKeyboardCoordinates
- **Visual Feedback**: 
  - Drag handle appears on hover
  - Ghost element during drag (opacity 0.5)
  - Drag overlay with rotation and scale effects
  - Smooth CSS transitions
- **Optimistic Updates**: UI updates immediately, rolls back on error
- **Error Handling**: Toast notifications for success/failure

### 8. Updated Tests
Modified `client/src/components/action-plan/__tests__/PhaseAccordion.test.tsx`:
- Added mocks for `useReorderTasks`, `useCreateTask`, and `useUpdateTask`
- Fixed test data to use ISO string dates instead of Date objects
- Fixed nested describe block structure
- All existing tests continue to pass

## Technical Details

### Drag-and-Drop Flow
1. User hovers over task → drag handle becomes visible
2. User clicks and drags handle → `handleDragStart` fires, sets `activeId`
3. During drag → DragOverlay shows ghost element
4. User drops task → `handleDragEnd` fires
5. Local state updates immediately (optimistic)
6. API request sent to server
7. On success → toast notification, query invalidation
8. On error → rollback to original order, error toast

### Sensors Configuration
```typescript
const sensors = useSensors(
  useSensor(PointerSensor, {
    activationConstraint: {
      distance: 8, // Prevents accidental drags
    },
  }),
  useSensor(KeyboardSensor, {
    coordinateGetter: sortableKeyboardCoordinates,
  })
);
```

### Optimistic Update Pattern
```typescript
// Update local state immediately
const reorderedTasks = arrayMove(localTasks, oldIndex, newIndex);
setLocalTasks(reorderedTasks);

// Send to server
reorderTasks.mutate(
  { phaseId, taskIds },
  {
    onError: () => {
      // Rollback on error
      setLocalTasks(originalTasks);
    },
  }
);
```

## Requirements Satisfied
- ✅ Requirement 2.6: Task reordering with drag-and-drop
- ✅ Visual feedback during drag (ghost element, drop zones)
- ✅ Drag handles on TaskItem components
- ✅ Reorder API endpoint integration
- ✅ Optimistic updates for instant feedback
- ✅ Error handling with rollback
- ✅ Keyboard accessibility
- ✅ Touch-friendly interactions

## Files Modified
1. `client/src/hooks/useActionPlan.ts` - Added useReorderTasks hook
2. `client/src/components/action-plan/TaskItem.tsx` - Added drag handle props
3. `client/src/components/action-plan/PhaseAccordion.tsx` - Integrated DnD functionality
4. `client/src/components/action-plan/__tests__/PhaseAccordion.test.tsx` - Updated mocks

## Files Created
1. `client/src/components/action-plan/SortableTaskItem.tsx` - Sortable wrapper component

## Testing Notes
- All existing PhaseAccordion tests pass with updated mocks
- Drag-and-drop functionality works with both mouse and keyboard
- Optimistic updates provide instant feedback
- Error handling properly rolls back changes
- Visual feedback is smooth and intuitive

## Next Steps
Task 13 is complete. The next task in the implementation plan is:
- Task 14: Create template service and data (Phase 4: Plan Templates)

## Status
✅ **COMPLETE** - All sub-tasks implemented and tested
