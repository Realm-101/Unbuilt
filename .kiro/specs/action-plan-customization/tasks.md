# Implementation Plan - Action Plan Customization & Progress Tracking

## Overview

This implementation plan breaks down the Action Plan Customization feature into discrete, actionable coding tasks. Each task builds incrementally on previous work, ensuring the system remains functional throughout development.

---

## Phase 1: Database Schema & Core Infrastructure

- [x] 1. Create database schema for action plans and tasks





  - Create migration file for new tables: `action_plans`, `plan_phases`, `plan_tasks`, `task_dependencies`, `plan_templates`, `task_history`, `progress_snapshots`
  - Define Drizzle schema with proper types and relationships
  - Add foreign key constraints and indexes for performance
  - Create enum types for task status and plan status
  - _Requirements: 1.1, 1.4, 2.1, 4.1_

- [x] 2. Implement plan service layer





  - Create `PlanService` class with CRUD operations for action plans
  - Implement plan creation from search results
  - Add plan versioning to preserve original AI-generated content
  - Implement plan status management (active, completed, archived)
  - Write service layer unit tests
  - _Requirements: 1.1, 2.7_

- [x] 3. Implement task service layer





  - Create `TaskService` class for task CRUD operations
  - Implement task status updates with timestamp tracking
  - Add task reordering logic with order field management
  - Implement task history tracking for audit trail
  - Write service layer unit tests
  - _Requirements: 1.4, 1.5, 2.1, 2.2, 4.1_

- [x] 4. Create plan and task API endpoints





  - Implement `GET /api/plans/:searchId` to fetch plan for a search
  - Implement `POST /api/plans` to create new plan
  - Implement `PATCH /api/plans/:planId` to update plan metadata
  - Implement `GET /api/plans/:planId/tasks` to fetch all tasks
  - Implement `POST /api/plans/:planId/tasks` to create task
  - Implement `PATCH /api/tasks/:taskId` to update task
  - Implement `DELETE /api/tasks/:taskId` to delete task
  - Add authorization middleware to verify plan ownership
  - _Requirements: 1.1, 1.4, 2.1, 2.2, 2.5_

## Phase 2: Interactive Plan Display

- [x] 5. Create ActionPlanView component





  - Build main container component with TanStack Query integration
  - Implement data fetching and loading states
  - Add error handling and retry logic
  - Create Zustand store for UI state (expanded phases, selected tasks)
  - Implement overall progress bar display
  - _Requirements: 1.1, 1.7_

- [x] 6. Build PhaseAccordion component





  - Create collapsible phase sections with expand/collapse functionality
  - Display phase progress indicator when collapsed (e.g., "3 of 5 tasks completed")
  - Add smooth animations for expand/collapse transitions
  - Implement keyboard navigation (Arrow keys, Enter)
  - Style with Tailwind CSS matching Neon Flame theme
  - _Requirements: 1.1, 1.2_

- [x] 7. Implement TaskItem component





  - Create task display with checkbox for status toggle
  - Add task detail view on click (description, estimated time, resources)
  - Implement optimistic updates for status changes
  - Add edit and delete action buttons
  - Display dependency indicators (locked icon if blocked)
  - Add drag handle for reordering
  - _Requirements: 1.3, 1.4, 1.5, 2.6_
-

- [x] 8. Add task status management




  - Implement checkbox click handler with optimistic updates
  - Add status change API mutation with error rollback
  - Display visual feedback for status changes (animations, toasts)
  - Implement milestone celebration when phase completes
  - Update progress bar in real-time
  - _Requirements: 1.5, 1.6_

## Phase 3: Task Customization

- [x] 9. Create TaskEditor modal component





  - Build modal dialog for creating/editing tasks
  - Implement form with React Hook Form and Zod validation
  - Add fields: title, description, estimated time, resources
  - Implement save and cancel actions
  - Add loading states during save operations
  - _Requirements: 2.1, 2.2, 2.4_

- [x] 10. Implement task creation functionality





  - Add "Add Task" button within each phase
  - Open TaskEditor modal with phase pre-selected
  - Implement task creation API call
  - Update UI optimistically after creation
  - Handle errors and show validation messages
  - _Requirements: 2.3, 2.4_

- [x] 11. Implement task editing functionality




  - Add edit button to TaskItem component
  - Open TaskEditor modal with existing task data
  - Implement task update API call
  - Update UI optimistically after edit
  - Preserve original AI-generated content in separate field
  - _Requirements: 2.1, 2.2, 2.7_

-

- [x] 12. Implement task deletion with confirmation


  - Add delete button to TaskItem component
  - Show confirmation dialog before deletion
  - Implement soft delete or "skip" option
  - Update UI after deletion
  - Handle dependency cleanup when task is deleted
  - _Requirements: 2.5_

- [x] 13. Add drag-and-drop task reordering




  - Integrate @dnd-kit/core for drag-and-drop
  - Implement drag handles on TaskItem components
  - Add visual feedback during drag (ghost element, drop zones)
  - Implement reorder API endpoint `POST /api/plans/:planId/tasks/reorder`
  - Update task order optimistically
  - _Requirements: 2.6_

## Phase 4: Plan Templates

- [x] 14. Create template service and data





  - Implement `TemplateService` class for template management
  - Create seed data for default templates (Software Startup, Physical Product, Service Business, Content Platform, Marketplace)
  - Implement template CRUD operations
  - Add template application logic that merges template with AI insights
  - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [x] 15. Build TemplateSelector component





  - Create template selection UI with cards for each template
  - Display template preview (phases and key tasks)
  - Add category filtering
  - Implement template selection handler
  - Show "Generic Innovation Project" as default
  - _Requirements: 3.1, 3.2, 3.5, 3.7_

- [x] 16. Implement template application





  - Add template selection during plan creation
  - Implement API endpoint `POST /api/plans/:planId/apply-template`
  - Merge template structure with AI-generated insights
  - Show warning dialog when switching templates (data loss)
  - Update plan UI after template application
  - _Requirements: 3.3, 3.4, 3.6_

## Phase 5: Progress Tracking & Analytics

- [x] 17. Implement progress calculation service





  - Create `ProgressService` class for metrics calculation
  - Implement real-time progress percentage calculation
  - Calculate completion velocity (tasks per week)
  - Calculate average time per task
  - Identify phases taking longer than estimated
  - Create progress snapshot records for historical tracking
  - _Requirements: 4.1, 4.3, 4.6_

- [x] 18. Build ProgressDashboard component




  - Create dashboard layout with key metrics cards
  - Display total tasks, completed tasks, completion percentage
  - Add progress chart using Recharts (completion over time)
  - Show phase-by-phase breakdown with progress bars
  - Display completion timeline with task milestones
  - Add velocity and average time metrics
  - _Requirements: 4.2, 4.3, 4.5_

- [x] 19. Implement dashboard summary API





  - Create endpoint `GET /api/users/:userId/progress/summary`
  - Aggregate data across all active plans for user
  - Calculate overall progress metrics
  - Return active plans count and completion stats
  - Add caching for performance
  - _Requirements: 4.5_

- [x] 20. Add completion celebration and summary




  - Detect when all tasks in plan are completed
  - Display celebration modal with confetti animation
  - Generate completion summary report (total time, milestones, achievements)
  - Update plan status to "completed"
  - Show option to archive or start new plan
  - _Requirements: 4.7_

## Phase 6: Task Dependencies

- [x] 21. Implement dependency service layer




  - Create `DependencyService` class for managing task dependencies
  - Implement circular dependency detection algorithm
  - Add dependency validation logic
  - Create methods to get prerequisites and dependents for a task
  - Write unit tests for circular dependency detection
  - _Requirements: 5.1, 5.6_

- [x] 22. Create dependency API endpoints




  - Implement `GET /api/tasks/:taskId/dependencies` to fetch dependencies
  - Implement `POST /api/tasks/:taskId/dependencies` to add dependency
  - Implement `POST /api/tasks/:taskId/dependencies/validate` to check for cycles
  - Implement `DELETE /api/dependencies/:dependencyId` to remove dependency
  - Add error handling for circular dependencies
  - _Requirements: 5.1, 5.6_

- [x] 23. Add dependency UI to TaskEditor





  - Add dependency selection field to TaskEditor modal
  - Display available tasks as options (exclude self and circular refs)
  - Show existing dependencies with remove option
  - Validate dependencies before save
  - Display validation errors clearly
  - _Requirements: 5.1_

- [x] 24. Implement dependency visualization




  - Add visual indicators to TaskItem for blocked tasks (lock icon)
  - Show prerequisite tasks in task detail view
  - Highlight newly available tasks when prerequisites complete
  - Add connecting lines or icons to show dependencies
  - Implement "Next Actions" view filtering tasks ready to start
  - _Requirements: 5.2, 5.3, 5.4, 5.7_

- [x] 25. Add dependency warnings




  - Show warning when user tries to complete task with incomplete prerequisites
  - Allow override option with confirmation
  - Log override actions in task history
  - Update UI to reflect override state
  - _Requirements: 5.5_

## Phase 7: Export Functionality

- [x] 26. Implement export service





  - Create `ExportService` class for generating exports
  - Implement CSV export format with proper escaping
  - Implement JSON export with full plan structure
  - Implement Markdown export with checkboxes
  - Add export job tracking for async operations
  - _Requirements: 7.1, 7.2, 7.5, 7.7_

- [x] 27. Create export API endpoints





  - Implement `POST /api/plans/:planId/export` endpoint
  - Support format parameter (csv, json, markdown)
  - Generate export file and return download URL
  - Add option to export only incomplete tasks
  - Implement rate limiting for export requests
  - _Requirements: 7.1, 7.7_

- [x] 28. Build ExportDialog component





  - Create modal dialog for export options
  - Add format selection (CSV, JSON, Markdown, Trello, Asana)
  - Add option to include/exclude completed tasks
  - Show export progress indicator
  - Provide download link when ready
  - Handle export errors gracefully
  - _Requirements: 7.1, 7.7_

- [ ] 29. Implement Trello integration
  - Add Trello API client configuration
  - Implement Trello board creation from plan
  - Create lists for each phase
  - Create cards for each task with descriptions
  - Return Trello board URL to user
  - Handle Trello API errors
  - _Requirements: 7.3_

- [ ] 30. Implement Asana integration
  - Add Asana API client configuration
  - Implement Asana project creation from plan
  - Create sections for each phase
  - Create tasks with due dates based on estimates
  - Return Asana project URL to user
  - Handle Asana API errors
  - _Requirements: 7.4_

## Phase 8: Smart Recommendations

- [x] 31. Implement recommendation service





  - Create `RecommendationService` class for generating suggestions
  - Detect tasks stuck for >7 days and suggest breaking into subtasks
  - Recommend resources from business tools library when phase completes
  - Detect multiple skipped tasks and prompt plan review
  - Generate tips and best practices for task types
  - _Requirements: 8.1, 8.2, 8.3, 8.4_

- [x] 32. Add recommendation UI components








  - Create recommendation card component
  - Display recommendations in sidebar or inline
  - Add dismiss and "apply suggestion" actions
  - Show congratulations messages for fast progress
  - Implement timeline adjustment suggestions
  - _Requirements: 8.5, 8.6_

- [ ] 33. Implement collaborative recommendations
  - Analyze anonymized plan modifications across users
  - Identify common customization patterns
  - Suggest popular modifications to users
  - Respect privacy by anonymizing all data
  - Add opt-out option for recommendation sharing
  - _Requirements: 8.7_

## Phase 9: Team Collaboration (Depends on Team Features)

- [ ] 34. Add task assignment functionality
  - Add assignee field to task schema
  - Implement task assignment API endpoint
  - Add team member selector to TaskEditor
  - Display assignee avatar on TaskItem
  - Send notification when task is assigned
  - _Requirements: 6.1, 6.2, 6.3_

- [ ] 35. Implement task filtering by assignee
  - Add filter dropdown to ActionPlanView
  - Filter tasks by selected assignee
  - Show "My Tasks" view for current user
  - Display assignee in task list
  - _Requirements: 6.5_

- [ ] 36. Add team progress metrics
  - Calculate contribution metrics per team member
  - Display team member activity in dashboard
  - Show tasks completed by each member
  - Add team leaderboard (optional)
  - _Requirements: 6.7_

## Phase 10: Notifications & Reminders

- [x] 37. Implement notification service








  - Create `NotificationService` class for managing notifications
  - Implement email notification templates
  - Add in-app notification system
  - Implement notification preferences management
  - _Requirements: 4.4, 6.2, 6.4_

- [ ] 38. Add task reminder system
  - Implement scheduled job for checking inactive tasks
  - Send reminder emails for pending tasks (if enabled)
  - Send notifications when tasks are assigned
  - Notify plan owner when team member completes task
  - Add notification settings to user preferences
  - _Requirements: 4.4, 6.2, 6.4_

## Phase 11: Real-Time Updates

- [x] 39. Implement WebSocket infrastructure





  - Set up WebSocket server with ws library
  - Implement room-based messaging (plan rooms)
  - Add authentication for WebSocket connections
  - Handle connection lifecycle (connect, disconnect, reconnect)
  - _Requirements: 1.5, 6.4_
-


- [x] 40. Add real-time task updates



  - Broadcast task status changes to all plan viewers
  - Update UI when other users modify tasks
  - Show presence indicators (who's viewing)
  - Handle concurrent edits gracefully
  - Add optimistic updates with conflict resolution
  - _Requirements: 1.5, 6.4_

## Phase 12: Performance & Polish

- [x] 41. Optimize database queries



  - Add database indexes for common queries
  - Implement query result caching with Redis
  - Optimize N+1 queries with proper joins
  - Add database query performance monitoring
  - _Requirements: Non-functional (Performance)_

- [x] 42. Add keyboard shortcuts




  - Implement Space key to toggle task completion
  - Implement Enter key to edit selected task
  - Add Arrow keys for task navigation
  - Implement Escape key to close modals
  - Add keyboard shortcut help dialog
  - _Requirements: Non-functional (Usability)_


- [x] 43. Implement auto-save functionality




  - Add debounced auto-save for task edits (500ms delay)
  - Show "Saving..." indicator during save
  - Display "All changes saved" confirmation
  - Handle save errors with retry logic
  - _Requirements: Non-functional (Usability)_

- [x] 44. Add mobile optimization





  - Make ActionPlanView responsive for mobile screens
  - Optimize touch interactions for task checkboxes
  - Implement mobile-friendly drag-and-drop
  - Add swipe gestures for task actions
  - Test on iOS and Android devices
  - _Requirements: Non-functional (Usability)_


- [x] 45. Implement undo/redo functionality



  - Create undo/redo stack for plan modifications
  - Add undo/redo buttons to UI
  - Implement Ctrl+Z and Ctrl+Y keyboard shortcuts
  - Handle undo/redo for task status, edits, deletions
  - Limit undo history to last 20 actions
  - _Requirements: Non-functional (Usability)_

## Phase 13: Testing & Deployment

- [x] 46. Write integration tests





  - Test plan creation and retrieval
  - Test task CRUD operations
  - Test dependency validation
  - Test progress calculation
  - Test export generation
  - _Requirements: All_
- [-] 47. Write E2E tests







- [ ] 47. Write E2E tests

  - Test complete user flow: create plan, add tasks, mark complete
  - Test task reordering with drag-and-drop
  - Test template selection and application
  - Test export to CSV and Markdown
  - Test dependency creation and validation
  - _Requirements: All_

- [x] 48. Performance testing




  - Load test with 100+ task plans
  - Test concurrent task updates
  - Measure progress calculation performance
  - Test export generation time
  - Optimize bottlenecks identified
  - _Requirements: Non-functional (Performance)_

- [x] 49. Create migration guide




  - Document database migration steps
  - Create script to migrate existing searches to plans
  - Test migration on staging environment
  - Prepare rollback plan
  - _Requirements: All_

- [x] 50. Deploy with feature flag





  - Implement feature flag for action plan customization
  - Deploy to staging environment
  - Test all functionality in staging
  - Gradual rollout to production (10%, 50%, 100%)
  - Monitor error rates and performance metrics
  - _Requirements: All_

---

## Task Execution Notes

### Priority Levels
- **Phase 1-7**: Core functionality (must have)
- **Phase 8-11**: Enhanced features (should have)
- **Phase 12-13**: Polish and testing (should have)

### Dependencies
- Phases 1-7 should be completed sequentially
- Phase 9 (Team Collaboration) requires Team & Enterprise Features spec to be implemented first
- Phases 8, 10, 11 can be developed in parallel with core features
- Phase 12-13 should be done after core functionality is complete

### Testing Approach
- Write unit tests for service layer as you implement (Phases 1-7)
- Integration tests can be written after Phase 7
- E2E tests should be written after Phase 12
- Performance testing in Phase 13

### Estimated Timeline
- **Week 1**: Phases 1-2 (Database & Core Infrastructure)
- **Week 2**: Phases 3-5 (Interactive Display & Customization)
- **Week 3**: Phases 6-7 (Dependencies & Export)
- **Week 4**: Phases 8-13 (Advanced Features, Polish, Testing)

---

**Document Version:** 1.0  
**Last Updated:** October 31, 2025  
**Status:** Ready for Implementation
