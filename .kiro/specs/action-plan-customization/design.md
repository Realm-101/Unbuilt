# Design Document - Action Plan Customization & Progress Tracking

## Overview

This design document outlines the technical architecture for transforming Unbuilt's static action plans into interactive, customizable roadmaps with progress tracking. The system will enable users to modify AI-generated plans, track task completion, collaborate with teams, and export to external tools.

### Design Goals

1. **Seamless Interaction** - Transform static plans into dynamic, interactive experiences
2. **Real-time Updates** - Instant feedback on task status changes and progress
3. **Flexible Customization** - Allow users to adapt plans without losing AI-generated insights
4. **Scalable Architecture** - Support 10,000+ active plans with 100+ tasks each
5. **Integration-Ready** - Export to popular project management tools

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend Layer                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Action Plan  │  │  Progress    │  │   Export     │      │
│  │  Component   │  │  Dashboard   │  │   Service    │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                         API Layer                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  Plan API    │  │  Task API    │  │ Template API │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                       Service Layer                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Plan Service │  │ Progress Svc │  │ Export Svc   │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                       Data Layer                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  PostgreSQL  │  │   Redis      │  │  WebSocket   │      │
│  │  (Neon DB)   │  │  (Cache)     │  │  (Real-time) │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
```

### Component Breakdown

**Frontend Components:**
- `ActionPlanView` - Main interactive plan display
- `PhaseAccordion` - Collapsible phase sections
- `TaskItem` - Individual task with checkbox and actions
- `TaskEditor` - Modal for editing/creating tasks
- `ProgressDashboard` - Analytics and metrics display
- `TemplateSelector` - Template selection interface
- `ExportDialog` - Export options and configuration

**Backend Services:**
- `PlanService` - Plan CRUD operations and versioning
- `TaskService` - Task management and dependencies
- `ProgressService` - Progress calculation and analytics
- `TemplateService` - Template management
- `ExportService` - Export format generation
- `NotificationService` - Task reminders and updates

## Data Models

### Database Schema

```typescript
// Action Plans Table
interface ActionPlan {
  id: string;
  searchId: string;  // Reference to gap analysis
  userId: string;
  templateId: string | null;
  title: string;
  description: string;
  status: 'active' | 'completed' | 'archived';
  originalPlan: JSON;  // AI-generated plan (immutable)
  customizations: JSON;  // User modifications
  createdAt: Date;
  updatedAt: Date;
  completedAt: Date | null;
}

// Plan Phases Table
interface PlanPhase {
  id: string;
  planId: string;
  name: string;
  description: string;
  order: number;
  estimatedDuration: string;  // e.g., "2 weeks"
  isCustom: boolean;  // User-created vs AI-generated
  createdAt: Date;
  updatedAt: Date;
}

// Plan Tasks Table
interface PlanTask {
  id: string;
  phaseId: string;
  planId: string;  // Denormalized for faster queries
  title: string;
  description: string;
  estimatedTime: string;  // e.g., "4 hours"
  resources: string[];  // Links to resources
  order: number;
  status: 'not_started' | 'in_progress' | 'completed' | 'skipped';
  isCustom: boolean;
  assigneeId: string | null;  // For team collaboration
  completedAt: Date | null;
  completedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// Task Dependencies Table
interface TaskDependency {
  id: string;
  taskId: string;  // Dependent task
  prerequisiteTaskId: string;  // Must be completed first
  createdAt: Date;
}

// Plan Templates Table
interface PlanTemplate {
  id: string;
  name: string;
  description: string;
  category: string;  // 'software', 'physical', 'service', etc.
  icon: string;
  phases: JSON;  // Template structure
  isDefault: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Task History Table (for audit trail)
interface TaskHistory {
  id: string;
  taskId: string;
  userId: string;
  action: 'created' | 'updated' | 'completed' | 'skipped' | 'deleted';
  previousState: JSON;
  newState: JSON;
  timestamp: Date;
}

// Progress Snapshots Table (for analytics)
interface ProgressSnapshot {
  id: string;
  planId: string;
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  skippedTasks: number;
  completionPercentage: number;
  averageTaskTime: number;  // In hours
  velocity: number;  // Tasks per week
  timestamp: Date;
}
```

### TypeScript Interfaces

```typescript
// Frontend Types
interface ActionPlanState {
  plan: ActionPlan;
  phases: PlanPhase[];
  tasks: Map<string, PlanTask[]>;  // Grouped by phaseId
  dependencies: Map<string, string[]>;  // taskId -> prerequisiteIds
  progress: ProgressMetrics;
  isLoading: boolean;
  error: string | null;
}

interface ProgressMetrics {
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  completionPercentage: number;
  currentPhase: string;
  estimatedCompletion: Date | null;
  velocity: number;  // Tasks per week
  averageTaskTime: number;  // In hours
}

interface TaskUpdate {
  id: string;
  status?: TaskStatus;
  title?: string;
  description?: string;
  estimatedTime?: string;
  order?: number;
  assigneeId?: string | null;
}

interface DependencyValidation {
  isValid: boolean;
  errors: string[];
  circularDependencies: string[][];
}
```

## Components and Interfaces

### Frontend Components

#### 1. ActionPlanView Component

**Purpose:** Main container for interactive action plan display

**Props:**
```typescript
interface ActionPlanViewProps {
  searchId: string;
  onComplete?: () => void;
}
```

**State Management:**
- Uses TanStack Query for server state
- Zustand store for UI state (expanded phases, selected tasks)
- Optimistic updates for task status changes

**Key Features:**
- Collapsible phase sections
- Real-time progress bar
- Keyboard shortcuts (Space, Enter, Arrow keys)
- Auto-save with debouncing (500ms)

#### 2. TaskItem Component

**Purpose:** Individual task display with interaction controls

**Props:**
```typescript
interface TaskItemProps {
  task: PlanTask;
  dependencies: string[];
  isBlocked: boolean;
  onStatusChange: (taskId: string, status: TaskStatus) => void;
  onEdit: (task: PlanTask) => void;
  onDelete: (taskId: string) => void;
}
```

**Features:**
- Checkbox for status toggle
- Dependency indicators
- Edit/delete actions
- Drag handle for reordering
- Assignee avatar (team plans)

#### 3. TaskEditor Component

**Purpose:** Modal for creating/editing tasks

**Props:**
```typescript
interface TaskEditorProps {
  task?: PlanTask;  // Undefined for new tasks
  phaseId: string;
  onSave: (task: Partial<PlanTask>) => Promise<void>;
  onCancel: () => void;
}
```

**Validation:**
- Required: title, description
- Optional: estimatedTime, resources, dependencies
- Circular dependency detection

#### 4. ProgressDashboard Component

**Purpose:** Analytics and progress visualization

**Features:**
- Overall progress chart (Recharts)
- Phase-by-phase breakdown
- Completion timeline
- Velocity metrics
- Milestone celebrations

#### 5. TemplateSelector Component

**Purpose:** Template selection during plan creation

**Props:**
```typescript
interface TemplateSelectorProps {
  onSelect: (templateId: string) => void;
  currentTemplate?: string;
}
```

**Features:**
- Template cards with previews
- Category filtering
- Template comparison
- Custom template creation (future)

### Backend API Endpoints

#### Plan Management

```typescript
// Get action plan for a search
GET /api/plans/:searchId
Response: ActionPlan with phases and tasks

// Create action plan from template
POST /api/plans
Body: { searchId, templateId?, customizations? }
Response: Created ActionPlan

// Update plan metadata
PATCH /api/plans/:planId
Body: { title?, description?, status? }
Response: Updated ActionPlan

// Delete plan
DELETE /api/plans/:planId
Response: { success: boolean }
```

#### Task Management

```typescript
// Get tasks for a phase
GET /api/plans/:planId/phases/:phaseId/tasks
Response: PlanTask[]

// Create task
POST /api/plans/:planId/tasks
Body: { phaseId, title, description, order, ... }
Response: Created PlanTask

// Update task
PATCH /api/tasks/:taskId
Body: { status?, title?, description?, order?, ... }
Response: Updated PlanTask

// Reorder tasks
POST /api/plans/:planId/tasks/reorder
Body: { taskIds: string[] }  // New order
Response: { success: boolean }

// Delete task
DELETE /api/tasks/:taskId
Response: { success: boolean }
```

#### Dependencies

```typescript
// Get task dependencies
GET /api/tasks/:taskId/dependencies
Response: { prerequisites: string[], dependents: string[] }

// Add dependency
POST /api/tasks/:taskId/dependencies
Body: { prerequisiteTaskId: string }
Response: TaskDependency

// Validate dependencies (check for cycles)
POST /api/tasks/:taskId/dependencies/validate
Body: { prerequisiteTaskId: string }
Response: DependencyValidation

// Remove dependency
DELETE /api/dependencies/:dependencyId
Response: { success: boolean }
```

#### Progress & Analytics

```typescript
// Get progress metrics
GET /api/plans/:planId/progress
Response: ProgressMetrics

// Get progress history
GET /api/plans/:planId/progress/history
Query: { startDate?, endDate?, interval? }
Response: ProgressSnapshot[]

// Get dashboard summary
GET /api/users/:userId/progress/summary
Response: { activePlans, totalTasks, completedTasks, ... }
```

#### Templates

```typescript
// List templates
GET /api/templates
Query: { category?, isActive? }
Response: PlanTemplate[]

// Get template details
GET /api/templates/:templateId
Response: PlanTemplate with full structure

// Apply template to existing plan
POST /api/plans/:planId/apply-template
Body: { templateId: string }
Response: Updated ActionPlan
```

#### Export

```typescript
// Export plan
POST /api/plans/:planId/export
Body: { format: 'csv' | 'json' | 'markdown' | 'trello' | 'asana' }
Response: { downloadUrl: string } or { integrationUrl: string }

// Get export status (for async exports)
GET /api/exports/:exportId/status
Response: { status: 'pending' | 'completed' | 'failed', url?: string }
```

## Error Handling

### Client-Side Error Handling

```typescript
// Optimistic Update Pattern
const updateTaskStatus = useMutation({
  mutationFn: (update: TaskUpdate) => api.updateTask(update),
  onMutate: async (update) => {
    // Cancel outgoing refetches
    await queryClient.cancelQueries(['plan', planId]);
    
    // Snapshot previous value
    const previous = queryClient.getQueryData(['plan', planId]);
    
    // Optimistically update
    queryClient.setQueryData(['plan', planId], (old) => ({
      ...old,
      tasks: old.tasks.map(t => 
        t.id === update.id ? { ...t, ...update } : t
      )
    }));
    
    return { previous };
  },
  onError: (err, update, context) => {
    // Rollback on error
    queryClient.setQueryData(['plan', planId], context.previous);
    toast.error('Failed to update task. Please try again.');
  },
  onSettled: () => {
    // Refetch to ensure consistency
    queryClient.invalidateQueries(['plan', planId]);
  }
});
```

### Server-Side Error Handling

```typescript
// Validation Errors
class ValidationError extends Error {
  constructor(public field: string, message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

// Dependency Errors
class CircularDependencyError extends Error {
  constructor(public cycle: string[]) {
    super('Circular dependency detected');
    this.name = 'CircularDependencyError';
  }
}

// Error Response Format
interface ErrorResponse {
  success: false;
  error: string;
  code: string;
  details?: any;
}
```

## Testing Strategy

### Unit Tests

**Frontend:**
- Component rendering and interactions
- State management logic
- Dependency validation algorithms
- Progress calculation functions

**Backend:**
- Service layer business logic
- Dependency cycle detection
- Progress metrics calculation
- Template application logic

### Integration Tests

- API endpoint functionality
- Database transactions
- Real-time updates via WebSocket
- Export generation

### E2E Tests

- Complete user flows:
  - Create plan from template
  - Add/edit/delete tasks
  - Mark tasks complete
  - Reorder tasks with drag-and-drop
  - Export to CSV/Markdown
  - View progress dashboard

### Performance Tests

- Load 100+ task plans
- Concurrent task updates
- Progress calculation with large datasets
- Export generation time

## Security Considerations

### Authorization

```typescript
// Middleware for plan access control
async function requirePlanAccess(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const { planId } = req.params;
  const userId = req.user.id;
  
  const plan = await db.query.actionPlans.findFirst({
    where: eq(actionPlans.id, planId)
  });
  
  if (!plan) {
    return res.status(404).json({ error: 'Plan not found' });
  }
  
  // Check ownership or team membership
  const hasAccess = plan.userId === userId || 
    await checkTeamMembership(userId, plan.id);
  
  if (!hasAccess) {
    return res.status(403).json({ error: 'Access denied' });
  }
  
  req.plan = plan;
  next();
}
```

### Input Validation

```typescript
// Zod schemas for validation
const taskSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000),
  estimatedTime: z.string().optional(),
  order: z.number().int().min(0),
  status: z.enum(['not_started', 'in_progress', 'completed', 'skipped'])
});

const dependencySchema = z.object({
  taskId: z.string().uuid(),
  prerequisiteTaskId: z.string().uuid()
}).refine(data => data.taskId !== data.prerequisiteTaskId, {
  message: 'Task cannot depend on itself'
});
```

### Data Protection

- Encrypt sensitive plan data at rest
- Audit log all modifications
- Rate limiting on API endpoints
- CSRF protection for state-changing operations

## Performance Optimization

### Database Optimization

```sql
-- Indexes for fast queries
CREATE INDEX idx_plans_user_id ON action_plans(user_id);
CREATE INDEX idx_plans_search_id ON action_plans(search_id);
CREATE INDEX idx_tasks_plan_id ON plan_tasks(plan_id);
CREATE INDEX idx_tasks_phase_id ON plan_tasks(phase_id);
CREATE INDEX idx_tasks_status ON plan_tasks(status);
CREATE INDEX idx_dependencies_task_id ON task_dependencies(task_id);
CREATE INDEX idx_dependencies_prerequisite ON task_dependencies(prerequisite_task_id);

-- Composite index for common queries
CREATE INDEX idx_tasks_plan_status ON plan_tasks(plan_id, status);
```

### Caching Strategy

```typescript
// Redis caching for frequently accessed data
const cacheKeys = {
  plan: (planId: string) => `plan:${planId}`,
  progress: (planId: string) => `progress:${planId}`,
  templates: () => 'templates:all'
};

// Cache with TTL
await redis.setex(
  cacheKeys.plan(planId),
  3600,  // 1 hour
  JSON.stringify(plan)
);

// Invalidate on update
await redis.del(cacheKeys.plan(planId));
```

### Frontend Optimization

- Virtual scrolling for 100+ task lists
- Debounced auto-save (500ms)
- Lazy loading for progress charts
- Memoized progress calculations
- Code splitting for export dialogs

## Real-Time Updates

### WebSocket Implementation

```typescript
// Server-side WebSocket handler
io.on('connection', (socket) => {
  socket.on('join-plan', (planId: string) => {
    // Verify access
    if (canAccessPlan(socket.user.id, planId)) {
      socket.join(`plan:${planId}`);
    }
  });
  
  socket.on('task-update', async (update: TaskUpdate) => {
    // Process update
    const task = await updateTask(update);
    
    // Broadcast to all plan viewers
    io.to(`plan:${task.planId}`).emit('task-updated', task);
  });
});

// Client-side WebSocket listener
useEffect(() => {
  socket.on('task-updated', (task: PlanTask) => {
    queryClient.setQueryData(['plan', planId], (old) => ({
      ...old,
      tasks: old.tasks.map(t => t.id === task.id ? task : t)
    }));
  });
  
  return () => socket.off('task-updated');
}, [planId]);
```

## Export Service Design

### Export Formats

#### CSV Export

```typescript
function exportToCSV(plan: ActionPlan): string {
  const rows = [
    ['Phase', 'Task', 'Status', 'Estimated Time', 'Completed At', 'Assignee']
  ];
  
  for (const phase of plan.phases) {
    for (const task of phase.tasks) {
      rows.push([
        phase.name,
        task.title,
        task.status,
        task.estimatedTime || '',
        task.completedAt?.toISOString() || '',
        task.assigneeId || ''
      ]);
    }
  }
  
  return rows.map(row => row.join(',')).join('\n');
}
```

#### Markdown Export

```typescript
function exportToMarkdown(plan: ActionPlan): string {
  let md = `# ${plan.title}\n\n`;
  md += `${plan.description}\n\n`;
  md += `**Progress:** ${plan.progress.completionPercentage}%\n\n`;
  
  for (const phase of plan.phases) {
    md += `## ${phase.name}\n\n`;
    
    for (const task of phase.tasks) {
      const checkbox = task.status === 'completed' ? '[x]' : '[ ]';
      md += `- ${checkbox} ${task.title}\n`;
      if (task.description) {
        md += `  ${task.description}\n`;
      }
    }
    md += '\n';
  }
  
  return md;
}
```

#### Trello Integration

```typescript
async function exportToTrello(plan: ActionPlan, apiKey: string, token: string) {
  // Create board
  const board = await trello.createBoard({
    name: plan.title,
    desc: plan.description
  });
  
  // Create lists for each phase
  for (const phase of plan.phases) {
    const list = await trello.createList({
      name: phase.name,
      idBoard: board.id
    });
    
    // Create cards for each task
    for (const task of phase.tasks) {
      await trello.createCard({
        name: task.title,
        desc: task.description,
        idList: list.id,
        due: task.estimatedTime ? calculateDueDate(task.estimatedTime) : null
      });
    }
  }
  
  return { boardUrl: board.url };
}
```

## Template System Design

### Template Structure

```typescript
interface TemplatePhase {
  name: string;
  description: string;
  order: number;
  tasks: TemplateTask[];
}

interface TemplateTask {
  title: string;
  description: string;
  estimatedTime: string;
  resources: string[];
  order: number;
}

// Example: Software Startup Template
const softwareStartupTemplate: PlanTemplate = {
  id: 'software-startup',
  name: 'Software Startup',
  description: 'Optimized for SaaS and software products',
  category: 'software',
  icon: 'code',
  phases: [
    {
      name: 'Research & Validation',
      description: 'Validate market need and technical feasibility',
      order: 1,
      tasks: [
        {
          title: 'Conduct user interviews',
          description: 'Interview 20-30 potential users',
          estimatedTime: '2 weeks',
          resources: [],
          order: 1
        },
        {
          title: 'Create technical architecture',
          description: 'Design system architecture and tech stack',
          estimatedTime: '1 week',
          resources: [],
          order: 2
        }
      ]
    },
    {
      name: 'MVP Development',
      description: 'Build minimum viable product',
      order: 2,
      tasks: [
        {
          title: 'Set up development environment',
          description: 'Configure CI/CD, hosting, and databases',
          estimatedTime: '3 days',
          resources: [],
          order: 1
        },
        {
          title: 'Implement core features',
          description: 'Build essential functionality',
          estimatedTime: '6 weeks',
          resources: [],
          order: 2
        }
      ]
    }
  ]
};
```

### Template Application Logic

```typescript
async function applyTemplate(
  planId: string,
  templateId: string,
  aiInsights: any
): Promise<ActionPlan> {
  const template = await getTemplate(templateId);
  const plan = await getPlan(planId);
  
  // Merge template structure with AI insights
  const enhancedPhases = template.phases.map(phase => ({
    ...phase,
    tasks: phase.tasks.map(task => ({
      ...task,
      // Enhance with AI-generated insights
      description: enhanceWithAI(task.description, aiInsights),
      resources: [...task.resources, ...findRelevantResources(task, aiInsights)]
    }))
  }));
  
  // Update plan
  return await updatePlan(planId, {
    templateId: template.id,
    phases: enhancedPhases
  });
}
```

## Migration Strategy

### Phase 1: Database Schema

1. Create new tables (action_plans, plan_phases, plan_tasks, etc.)
2. Add foreign keys and indexes
3. Create migration scripts

### Phase 2: Backend API

1. Implement service layer
2. Create API endpoints
3. Add validation and error handling
4. Write unit tests

### Phase 3: Frontend Components

1. Build core components (ActionPlanView, TaskItem)
2. Implement state management
3. Add real-time updates
4. Create progress dashboard

### Phase 4: Advanced Features

1. Template system
2. Export functionality
3. Dependency management
4. Smart recommendations

### Phase 5: Testing & Deployment

1. Integration tests
2. E2E tests
3. Performance testing
4. Gradual rollout with feature flags

## Monitoring and Analytics

### Key Metrics to Track

```typescript
// Application Metrics
- Plan creation rate
- Task completion rate
- Average tasks per plan
- Template usage distribution
- Export format popularity

// Performance Metrics
- API response times
- Database query performance
- WebSocket connection stability
- Export generation time

// User Engagement
- Daily active plans
- Task updates per user
- Time spent on progress dashboard
- Feature adoption rates
```

### Logging Strategy

```typescript
// Structured logging
logger.info('Task completed', {
  userId: user.id,
  planId: plan.id,
  taskId: task.id,
  completionTime: Date.now() - task.createdAt.getTime(),
  phase: phase.name
});

// Error tracking
logger.error('Export failed', {
  userId: user.id,
  planId: plan.id,
  format: 'trello',
  error: error.message,
  stack: error.stack
});
```

## Future Enhancements

### Phase 2 Features (Post-MVP)

1. **Gantt Chart Visualization** - Visual timeline of tasks and dependencies
2. **Time Tracking Integration** - Connect with Toggl, Harvest
3. **Calendar Integration** - Sync with Google Calendar, Outlook
4. **AI-Powered Recommendations** - Smart task suggestions based on progress
5. **Mobile App** - Native iOS/Android apps
6. **Offline Mode** - Work on plans without internet connection
7. **Custom Fields** - User-defined task metadata
8. **Recurring Tasks** - Automated task creation for repeated activities

---

**Document Version:** 1.0  
**Last Updated:** October 31, 2025  
**Status:** Ready for Review
