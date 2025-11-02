# Design Document - UX & Information Architecture Improvements

## Overview

This design document outlines the technical approach for implementing comprehensive UX and information architecture improvements to the Unbuilt platform. The improvements focus on reducing cognitive load through progressive disclosure, enhancing navigation and discoverability, implementing personalized onboarding, and creating a more intuitive user journey from first visit through ongoing usage.

The design leverages existing React components and Tailwind CSS while introducing new patterns for progressive disclosure, state management for user preferences, and enhanced accessibility features. All improvements maintain the distinctive "Neon Flame" aesthetic while prioritizing usability and clarity.

## Architecture

### High-Level Component Structure

```
┌─────────────────────────────────────────────────────────┐
│                    App Shell                             │
│  ┌────────────────────────────────────────────────────┐ │
│  │         Enhanced Navigation Component               │ │
│  │  - Role-based menu items                           │ │
│  │  - Global search                                   │ │
│  │  - Tier indicator                                  │ │
│  └────────────────────────────────────────────────────┘ │
│                                                           │
│  ┌────────────────────────────────────────────────────┐ │
│  │              Main Content Area                      │ │
│  │                                                     │ │
│  │  ┌──────────────────────────────────────────────┐ │ │
│  │  │  Onboarding Tour Overlay (conditional)       │ │ │
│  │  └──────────────────────────────────────────────┘ │ │
│  │                                                     │ │
│  │  ┌──────────────────────────────────────────────┐ │ │
│  │  │  Page Content with Progressive Disclosure    │ │ │
│  │  │  - Dashboard                                 │ │ │
│  │  │  - Analysis Results                          │ │ │
│  │  │  - Action Plans                              │ │ │
│  │  │  - Resources                                 │ │ │
│  │  └──────────────────────────────────────────────┘ │ │
│  └────────────────────────────────────────────────────┘ │
│                                                           │
│  ┌────────────────────────────────────────────────────┐ │
│  │         Contextual Help Panel (slide-in)           │ │
│  └────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

### State Management Architecture

```typescript
// User Preferences Store (Zustand)
interface UserPreferencesState {
  role: 'entrepreneur' | 'investor' | 'product_manager' | 'researcher' | 'exploring';
  onboardingCompleted: boolean;
  tourProgress: TourStep[];
  expandedSections: Record<string, boolean>;
  keyboardShortcutsEnabled: boolean;
  accessibilityMode: boolean;
}

// UI State Store (Zustand)
interface UIState {
  isTourActive: boolean;
  currentTourStep: number;
  isHelpPanelOpen: boolean;
  helpContext: string;
  activeModal: string | null;
  navigationExpanded: boolean;
}

// Progress Tracking Store (Zustand)
interface ProgressState {
  projectProgress: Record<string, ProjectProgress>;
  completedSteps: Record<string, string[]>; // analysisId -> stepIds
  lastViewedAnalysis: string | null;
}
```

## Components and Interfaces

### 1. Onboarding System

#### OnboardingWizard Component
```typescript
interface OnboardingWizardProps {
  onComplete: (role: UserRole) => void;
  onSkip: () => void;
}

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  roleSpecific?: UserRole[];
  component: React.ComponentType<OnboardingStepProps>;
}
```

**Features:**
- Multi-step wizard with role selection
- Personalized content based on selected role
- Progress indicator
- Skip and restart options
- Completion tracking in user preferences

#### InteractiveTour Component
```typescript
interface InteractiveTourProps {
  steps: TourStep[];
  onComplete: () => void;
  onDismiss: () => void;
  startStep?: number;
}

interface TourStep {
  id: string;
  target: string; // CSS selector
  title: string;
  content: string;
  placement: 'top' | 'bottom' | 'left' | 'right';
  requiresInteraction?: boolean;
  highlightElement?: boolean;
}
```

**Implementation:**
- Uses React Portals for overlay
- Spotlight effect on target elements
- Smooth scrolling to targets
- Keyboard navigation support
- Persistent progress tracking

### 2. Progressive Disclosure Components

#### ExpandableSection Component
```typescript
interface ExpandableSectionProps {
  id: string;
  title: string;
  summary?: React.ReactNode;
  children: React.ReactNode;
  defaultExpanded?: boolean;
  persistState?: boolean;
  icon?: React.ReactNode;
  badge?: string | number;
}
```

**Features:**
- Smooth expand/collapse animations
- State persistence in user preferences
- Keyboard accessible (Enter/Space to toggle)
- ARIA attributes for screen readers
- Optional summary preview when collapsed

#### TabbedContent Component
```typescript
interface TabbedContentProps {
  tabs: TabDefinition[];
  defaultTab?: string;
  onChange?: (tabId: string) => void;
  persistSelection?: boolean;
}

interface TabDefinition {
  id: string;
  label: string;
  icon?: React.ReactNode;
  badge?: string | number;
  content: React.ReactNode;
  disabled?: boolean;
}
```

**Features:**
- Lazy loading of tab content
- Keyboard navigation (Arrow keys)
- URL hash synchronization
- Mobile-friendly swipe gestures
- Loading states for async content

### 3. Enhanced Dashboard

#### DashboardLayout Component
```typescript
interface DashboardLayoutProps {
  user: User;
  recentSearches: SearchSummary[];
  favorites: SearchSummary[];
  projects: Project[];
  stats: UserStats;
}

interface SearchSummary {
  id: string;
  title: string;
  innovationScore: number;
  feasibilityRating: number;
  createdAt: Date;
  thumbnail?: string;
  tags: string[];
  projectId?: string;
}
```

**Layout Structure:**
- Welcome banner with personalized greeting
- Quick stats cards (searches used, favorites, active projects)
- Recent searches grid with thumbnails
- Favorites section
- Projects overview
- Quick action buttons

#### ProjectManager Component
```typescript
interface ProjectManagerProps {
  projects: Project[];
  onCreateProject: (name: string, description: string) => void;
  onUpdateProject: (id: string, updates: Partial<Project>) => void;
  onDeleteProject: (id: string) => void;
}

interface Project {
  id: string;
  name: string;
  description: string;
  analyses: string[]; // analysis IDs
  createdAt: Date;
  updatedAt: Date;
  tags: string[];
  archived: boolean;
}
```

### 4. Enhanced Analysis Results View

#### AnalysisResultsLayout Component
```typescript
interface AnalysisResultsLayoutProps {
  analysis: GapAnalysis;
  onShare: () => void;
  onExport: (format: ExportFormat) => void;
  onFavorite: () => void;
}
```

**Progressive Disclosure Structure:**
1. **Summary View (Always Visible)**
   - Innovation score with visual gauge
   - Feasibility rating
   - Market potential indicator
   - Key insight highlights (3-5 bullets)

2. **Expandable Sections**
   - Competitive Analysis (tabbed: Overview, Competitors, Market Position)
   - Market Intelligence (tabbed: Demographics, Size, Trends)
   - Detailed Insights (accordion by category)
   - Risk Assessment
   - Opportunity Breakdown

3. **Action Plan Section**
   - Phase overview cards (4 phases)
   - Expandable phase details
   - Progress tracking integration

### 5. Action Plan with Progress Tracking

#### ActionPlanTracker Component
```typescript
interface ActionPlanTrackerProps {
  analysisId: string;
  phases: ActionPhase[];
  progress: ProgressData;
  onStepComplete: (phaseId: string, stepId: string, completed: boolean) => void;
}

interface ActionPhase {
  id: string;
  name: string;
  description: string;
  steps: ActionStep[];
  order: number;
}

interface ActionStep {
  id: string;
  title: string;
  description: string;
  estimatedTime?: string;
  resources?: Resource[];
  requirements?: string[];
}

interface ProgressData {
  completedSteps: string[];
  phaseCompletion: Record<string, number>; // phaseId -> percentage
  overallCompletion: number;
  lastUpdated: Date;
}
```

**Features:**
- Visual progress indicators per phase
- Checkbox interaction with optimistic updates
- Celebration animations on phase completion
- Progress persistence to backend
- Undo functionality for accidental checks

### 6. Contextual Help System

#### ContextualHelpPanel Component
```typescript
interface ContextualHelpPanelProps {
  isOpen: boolean;
  context: string; // page or feature identifier
  onClose: () => void;
}

interface HelpContent {
  title: string;
  description: string;
  steps?: string[];
  videoUrl?: string;
  relatedArticles: HelpArticle[];
  commonQuestions: FAQ[];
}
```

**Features:**
- Slide-in panel from right side
- Context-aware content loading
- Search within help content
- Video tutorials embedded
- Links to detailed documentation
- Feedback mechanism ("Was this helpful?")

#### TooltipSystem Component
```typescript
interface EnhancedTooltipProps {
  content: string | React.ReactNode;
  placement?: 'top' | 'bottom' | 'left' | 'right';
  delay?: number;
  interactive?: boolean;
  maxWidth?: number;
}
```

**Implementation:**
- Uses Radix UI Tooltip primitive
- Keyboard accessible (focus triggers tooltip)
- Respects reduced motion preferences
- Smart positioning (avoids viewport edges)
- Rich content support (not just text)

### 7. Enhanced Navigation

#### MainNavigation Component
```typescript
interface MainNavigationProps {
  user: User;
  currentPath: string;
  onNavigate: (path: string) => void;
}

interface NavigationItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  path: string;
  badge?: string | number;
  children?: NavigationItem[];
  requiredRole?: UserRole[];
  requiredTier?: SubscriptionTier[];
}
```

**Navigation Structure:**
```
Discover
  └─ New Search
  └─ Trending Gaps

My Work
  └─ Dashboard
  └─ Recent Searches
  └─ Favorites
  └─ Projects

Resources
  └─ Business Tools
  └─ Templates
  └─ Learning Center

Account
  └─ Profile
  └─ Subscription
  └─ Settings
  └─ Help
```

**Features:**
- Role-based menu filtering
- Tier-based feature badges
- Global search integration
- Keyboard navigation (Tab, Arrow keys)
- Mobile hamburger menu
- Active state highlighting

#### GlobalSearch Component
```typescript
interface GlobalSearchProps {
  onResultSelect: (result: SearchResult) => void;
}

interface SearchResult {
  type: 'analysis' | 'resource' | 'help' | 'page';
  id: string;
  title: string;
  description: string;
  path: string;
  metadata?: Record<string, any>;
}
```

**Features:**
- Keyboard shortcut activation (Cmd/Ctrl + K)
- Real-time search across analyses, resources, help
- Recent searches
- Fuzzy matching
- Category filtering
- Keyboard navigation of results

### 8. Sharing System

#### ShareDialog Component
```typescript
interface ShareDialogProps {
  analysisId: string;
  onClose: () => void;
}

interface ShareLink {
  id: string;
  url: string;
  expiresAt?: Date;
  viewCount: number;
  createdAt: Date;
  active: boolean;
}
```

**Features:**
- Generate secure read-only links
- Set expiration dates
- Copy to clipboard
- QR code generation
- View analytics
- Revoke access
- Email sharing option

### 9. Tier Indicator System

#### TierIndicator Component
```typescript
interface TierIndicatorProps {
  user: User;
  showUsage?: boolean;
  compact?: boolean;
}

interface UsageStats {
  searchesUsed: number;
  searchesLimit: number;
  periodEnd: Date;
}
```

**Features:**
- Visual tier badge (Free, Pro, Enterprise)
- Usage progress bar for Free tier
- Upgrade prompt when approaching limit
- Tier comparison modal
- Contextual upgrade suggestions

## Data Models

### User Preferences Schema
```typescript
interface UserPreferences {
  userId: string;
  role: UserRole;
  onboardingCompleted: boolean;
  tourCompleted: boolean;
  expandedSections: Record<string, boolean>;
  keyboardShortcuts: Record<string, string>;
  accessibilitySettings: {
    highContrast: boolean;
    reducedMotion: boolean;
    screenReaderOptimized: boolean;
  };
  notificationSettings: {
    email: boolean;
    inApp: boolean;
    frequency: 'immediate' | 'daily' | 'weekly';
  };
  createdAt: Date;
  updatedAt: Date;
}
```

### Project Schema
```typescript
interface Project {
  id: string;
  userId: string;
  name: string;
  description: string;
  analyses: string[]; // analysis IDs
  tags: string[];
  archived: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

### Progress Tracking Schema
```typescript
interface ActionPlanProgress {
  id: string;
  userId: string;
  analysisId: string;
  completedSteps: string[]; // step IDs
  phaseCompletion: Record<string, number>;
  overallCompletion: number;
  lastUpdated: Date;
  createdAt: Date;
}
```

### Share Link Schema
```typescript
interface ShareLink {
  id: string;
  userId: string;
  analysisId: string;
  token: string; // unique secure token
  expiresAt: Date | null;
  viewCount: number;
  active: boolean;
  createdAt: Date;
  lastAccessedAt: Date | null;
}
```

### Help Content Schema
```typescript
interface HelpArticle {
  id: string;
  title: string;
  content: string; // Markdown
  context: string[]; // page/feature identifiers
  category: 'getting-started' | 'features' | 'troubleshooting' | 'faq';
  tags: string[];
  videoUrl?: string;
  relatedArticles: string[]; // article IDs
  viewCount: number;
  helpfulCount: number;
  createdAt: Date;
  updatedAt: Date;
}
```

## API Endpoints

### User Preferences
```
GET    /api/user/preferences
PUT    /api/user/preferences
PATCH  /api/user/preferences/onboarding
PATCH  /api/user/preferences/tour
```

### Projects
```
GET    /api/projects
POST   /api/projects
GET    /api/projects/:id
PUT    /api/projects/:id
DELETE /api/projects/:id
POST   /api/projects/:id/analyses/:analysisId
DELETE /api/projects/:id/analyses/:analysisId
```

### Progress Tracking
```
GET    /api/progress/:analysisId
POST   /api/progress/:analysisId/steps/:stepId/complete
DELETE /api/progress/:analysisId/steps/:stepId/complete
GET    /api/progress/summary
```

### Share Links
```
POST   /api/share/:analysisId
GET    /api/share/links
GET    /api/share/:token (public, no auth)
DELETE /api/share/links/:linkId
PATCH  /api/share/links/:linkId
```

### Help System
```
GET    /api/help/articles
GET    /api/help/articles/:id
GET    /api/help/search?q=query
GET    /api/help/context/:context
POST   /api/help/articles/:id/feedback
```

## Error Handling

### User-Facing Error Patterns

1. **Graceful Degradation**
   - If preferences fail to load, use sensible defaults
   - If tour data is unavailable, skip tour gracefully
   - If help content fails, show generic help link

2. **Error Messages**
   - Clear, actionable error messages
   - Suggested next steps
   - Contact support option for critical errors

3. **Retry Logic**
   - Automatic retry for transient failures
   - Exponential backoff for API calls
   - User-initiated retry button for failed operations

4. **Offline Support**
   - Cache user preferences locally
   - Queue progress updates when offline
   - Sync when connection restored

## Testing Strategy

### Unit Tests
- Component rendering with various props
- State management logic (Zustand stores)
- Utility functions (keyboard shortcuts, accessibility helpers)
- Progressive disclosure state transitions

### Integration Tests
- Onboarding flow completion
- Tour navigation and interaction
- Progress tracking persistence
- Share link generation and access
- Project management operations

### Accessibility Tests
- Keyboard navigation through all interactive elements
- Screen reader compatibility (ARIA labels)
- Focus management in modals and overlays
- Color contrast ratios
- Reduced motion preferences

### E2E Tests
- Complete user journey from onboarding to analysis
- Mobile responsive behavior
- Cross-browser compatibility
- Performance under load

### Visual Regression Tests
- Component appearance across breakpoints
- Animation consistency
- Theme application
- Progressive disclosure states

## Performance Considerations

### Optimization Strategies

1. **Code Splitting**
   - Lazy load onboarding components
   - Lazy load help panel content
   - Split tour logic into separate bundle

2. **State Management**
   - Debounce preference updates
   - Batch progress tracking updates
   - Memoize expensive computations

3. **Rendering Optimization**
   - Use React.memo for static components
   - Virtualize long lists (projects, searches)
   - Optimize re-renders with proper key usage

4. **Data Fetching**
   - Prefetch help content for current context
   - Cache user preferences aggressively
   - Use stale-while-revalidate for non-critical data

5. **Animation Performance**
   - Use CSS transforms for animations
   - Respect prefers-reduced-motion
   - Throttle scroll-based animations

## Accessibility Implementation

### WCAG 2.1 Level AA Compliance

1. **Keyboard Navigation**
   - All interactive elements keyboard accessible
   - Logical tab order
   - Skip links for main content
   - Keyboard shortcuts with escape hatches

2. **Screen Reader Support**
   - Semantic HTML elements
   - ARIA labels and descriptions
   - Live regions for dynamic content
   - Descriptive link text

3. **Visual Accessibility**
   - Minimum 4.5:1 contrast ratio for text
   - Focus indicators visible
   - No information conveyed by color alone
   - Resizable text up to 200%

4. **Cognitive Accessibility**
   - Clear, consistent navigation
   - Predictable interactions
   - Error prevention and recovery
   - Sufficient time for interactions

## Mobile-First Responsive Design

### Breakpoints
```css
/* Mobile: 320px - 767px */
/* Tablet: 768px - 1023px */
/* Desktop: 1024px+ */
/* Large Desktop: 1440px+ */
```

### Mobile Optimizations
- Touch-friendly targets (minimum 44x44px)
- Swipe gestures for navigation
- Collapsible navigation
- Optimized image sizes
- Reduced animation complexity
- Simplified layouts

### Progressive Enhancement
- Core functionality works without JavaScript
- Enhanced features layer on top
- Graceful degradation for older browsers

## Security Considerations

### Share Link Security
- Cryptographically secure token generation
- Rate limiting on share link access
- Expiration enforcement
- Access logging
- Revocation capability

### User Preferences Security
- Validate all preference updates
- Sanitize user-provided content (project names, tags)
- Prevent preference injection attacks
- Audit log for sensitive preference changes

## Migration Strategy

### Phase 1: Foundation (Week 1-2)
- Implement state management stores
- Create base progressive disclosure components
- Set up API endpoints for preferences and projects

### Phase 2: Core UX (Week 3-4)
- Implement enhanced dashboard
- Add progress tracking to action plans
- Create contextual help system

### Phase 3: Onboarding (Week 5-6)
- Build onboarding wizard
- Implement interactive tour
- Add role-based personalization

### Phase 4: Polish (Week 7-8)
- Implement sharing system
- Add keyboard shortcuts
- Accessibility audit and fixes
- Performance optimization
- User testing and refinements

## Monitoring and Analytics

### Key Metrics
- Onboarding completion rate
- Tour completion rate
- Feature discovery rate (% of users who find each feature)
- Progress tracking engagement
- Help system usage
- Share link creation and access
- Mobile vs desktop usage
- Accessibility feature usage

### User Feedback
- In-app feedback forms
- Help article ratings
- Feature request tracking
- Usability testing sessions

## Future Enhancements

### Potential Additions
- Collaborative projects (multi-user)
- Custom dashboard layouts
- Advanced filtering and search
- Personalized recommendations
- AI-powered help suggestions
- Voice navigation support
- Offline mode with sync
- Native mobile apps
