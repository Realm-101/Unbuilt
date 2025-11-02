# Design Document - Resource Library Enhancement

## Overview

This design document outlines the technical architecture and implementation approach for transforming Unbuilt's resource library (EurekaShelf) from a static collection into an intelligent, context-aware system that surfaces relevant tools, templates, and guidance based on user needs and action plan progress.

## System Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend Layer                           │
├─────────────────────────────────────────────────────────────┤
│  ResourceLibrary  │  ResourceCard  │  ResourceSearch         │
│  ResourceDetail   │  ResourceFilters │ BookmarkButton        │
│  SuggestedResources │ ResourceRating │ ContributeDialog     │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                      API Layer                               │
├─────────────────────────────────────────────────────────────┤
│  /api/resources/*        │  /api/resources/suggestions/*     │
│  /api/resources/bookmarks/* │ /api/resources/ratings/*      │
│  /api/resources/contributions/* │ /api/admin/resources/*    │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                    Service Layer                             │
├─────────────────────────────────────────────────────────────┤
│  ResourceMatchingService  │  ResourceRecommendationEngine   │
│  ResourceAnalyticsService │  ResourceModerationService      │
│  TemplateGenerationService │ ResourceSearchService          │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                    Data Layer                                │
├─────────────────────────────────────────────────────────────┤
│  resources  │  resource_categories  │  resource_tags        │
│  user_bookmarks │ resource_ratings │ resource_contributions │
│  resource_analytics │ resource_access_history               │
└─────────────────────────────────────────────────────────────┘
```

## Database Schema

### Core Tables

#### resources
```sql
CREATE TABLE resources (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  url TEXT NOT NULL,
  resource_type VARCHAR(50) NOT NULL, -- 'tool', 'template', 'guide', 'video', 'article'
  category_id INTEGER REFERENCES resource_categories(id),
  phase_relevance TEXT[], -- ['research', 'validation', 'development', 'launch']
  idea_types TEXT[], -- ['software', 'physical_product', 'service', 'marketplace']
  difficulty_level VARCHAR(20), -- 'beginner', 'intermediate', 'advanced'
  estimated_time_minutes INTEGER,
  is_premium BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  average_rating DECIMAL(3,2) DEFAULT 0,
  rating_count INTEGER DEFAULT 0,
  view_count INTEGER DEFAULT 0,
  bookmark_count INTEGER DEFAULT 0,
  metadata JSONB, -- flexible storage for resource-specific data
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_resources_category ON resources(category_id);
CREATE INDEX idx_resources_phase ON resources USING GIN(phase_relevance);
CREATE INDEX idx_resources_type ON resources USING GIN(idea_types);
CREATE INDEX idx_resources_active ON resources(is_active);
```

#### resource_categories
```sql
CREATE TABLE resource_categories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  slug VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  icon VARCHAR(50), -- lucide icon name
  display_order INTEGER DEFAULT 0,
  parent_id INTEGER REFERENCES resource_categories(id),
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### resource_tags
```sql
CREATE TABLE resource_tags (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE,
  slug VARCHAR(50) NOT NULL UNIQUE,
  usage_count INTEGER DEFAULT 0
);

CREATE TABLE resource_tag_mappings (
  resource_id INTEGER REFERENCES resources(id) ON DELETE CASCADE,
  tag_id INTEGER REFERENCES resource_tags(id) ON DELETE CASCADE,
  PRIMARY KEY (resource_id, tag_id)
);
```

#### user_bookmarks
```sql
CREATE TABLE user_bookmarks (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  resource_id INTEGER REFERENCES resources(id) ON DELETE CASCADE,
  notes TEXT,
  custom_tags TEXT[],
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, resource_id)
);

CREATE INDEX idx_bookmarks_user ON user_bookmarks(user_id);
```

#### resource_ratings
```sql
CREATE TABLE resource_ratings (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  resource_id INTEGER REFERENCES resources(id) ON DELETE CASCADE,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  review TEXT,
  is_helpful_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, resource_id)
);

CREATE INDEX idx_ratings_resource ON resource_ratings(resource_id);
```

#### resource_contributions
```sql
CREATE TABLE resource_contributions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  url TEXT NOT NULL,
  suggested_category_id INTEGER REFERENCES resource_categories(id),
  suggested_tags TEXT[],
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
  admin_notes TEXT,
  reviewed_by INTEGER REFERENCES users(id),
  reviewed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_contributions_status ON resource_contributions(status);
CREATE INDEX idx_contributions_user ON resource_contributions(user_id);
```

#### resource_access_history
```sql
CREATE TABLE resource_access_history (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  resource_id INTEGER REFERENCES resources(id) ON DELETE CASCADE,
  analysis_id INTEGER REFERENCES searches(id) ON DELETE SET NULL,
  action_plan_step_id INTEGER, -- reference to specific step if applicable
  access_type VARCHAR(20), -- 'view', 'download', 'external_link'
  accessed_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_access_history_user ON resource_access_history(user_id);
CREATE INDEX idx_access_history_resource ON resource_access_history(resource_id);
CREATE INDEX idx_access_history_analysis ON resource_access_history(analysis_id);
```

#### resource_analytics
```sql
CREATE TABLE resource_analytics (
  id SERIAL PRIMARY KEY,
  resource_id INTEGER REFERENCES resources(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  view_count INTEGER DEFAULT 0,
  unique_users INTEGER DEFAULT 0,
  bookmark_count INTEGER DEFAULT 0,
  download_count INTEGER DEFAULT 0,
  external_click_count INTEGER DEFAULT 0,
  average_time_spent_seconds INTEGER DEFAULT 0,
  UNIQUE(resource_id, date)
);

CREATE INDEX idx_analytics_resource_date ON resource_analytics(resource_id, date);
```

## Core Services

### 1. ResourceMatchingService

Matches resources to action plan steps and user contexts.

```typescript
interface ResourceMatchingService {
  // Match resources to specific action plan step
  matchResourcesToStep(
    stepId: string,
    stepDescription: string,
    phase: string,
    ideaType: string,
    limit: number
  ): Promise<Resource[]>;
  
  // Get resources for entire phase
  getPhaseResources(
    phase: string,
    ideaType: string,
    userTier: string
  ): Promise<Resource[]>;
  
  // Calculate relevance score
  calculateRelevanceScore(
    resource: Resource,
    context: MatchingContext
  ): number;
}

interface MatchingContext {
  phase: string;
  ideaType: string;
  stepKeywords: string[];
  userExperience: string;
  previouslyViewed: number[];
}
```

**Matching Algorithm:**
1. Phase match (40% weight)
2. Idea type match (25% weight)
3. Keyword similarity (20% weight)
4. User experience level (10% weight)
5. Popularity/rating (5% weight)

### 2. ResourceRecommendationEngine

Provides personalized resource recommendations.

```typescript
interface ResourceRecommendationEngine {
  // Get personalized recommendations
  getRecommendations(
    userId: number,
    analysisId: number,
    limit: number
  ): Promise<Resource[]>;
  
  // Get similar resources
  getSimilarResources(
    resourceId: number,
    limit: number
  ): Promise<Resource[]>;
  
  // Get trending resources
  getTrendingResources(
    timeframe: 'day' | 'week' | 'month',
    limit: number
  ): Promise<Resource[]>;
}
```

**Recommendation Strategy:**
- Collaborative filtering (users with similar analyses)
- Content-based filtering (similar resource attributes)
- Popularity-based (trending in user's category)
- Recency boost for new resources

### 3. TemplateGenerationService

Generates pre-filled templates from gap analysis data.

```typescript
interface TemplateGenerationService {
  // Generate pre-filled template
  generateTemplate(
    templateId: number,
    analysisId: number,
    format: 'docx' | 'pdf' | 'gdocs'
  ): Promise<GeneratedTemplate>;
  
  // Get available templates for analysis
  getAvailableTemplates(
    analysisId: number
  ): Promise<TemplateOption[]>;
}

interface GeneratedTemplate {
  url: string;
  filename: string;
  format: string;
  expiresAt: Date;
}
```

**Template Variables:**
- `{{idea_title}}` - Gap opportunity title
- `{{innovation_score}}` - Innovation score
- `{{target_market}}` - Target market description
- `{{top_competitors}}` - List of competitors
- `{{key_features}}` - Suggested features
- `{{action_plan_summary}}` - Action plan overview

### 4. ResourceSearchService

Handles search and filtering.

```typescript
interface ResourceSearchService {
  // Full-text search
  search(
    query: string,
    filters: SearchFilters,
    pagination: Pagination
  ): Promise<SearchResults>;
  
  // Get search suggestions
  getSuggestions(
    partialQuery: string,
    context?: SearchContext
  ): Promise<string[]>;
}

interface SearchFilters {
  categories?: number[];
  tags?: string[];
  phases?: string[];
  ideaTypes?: string[];
  resourceTypes?: string[];
  minRating?: number;
  isPremium?: boolean;
}
```

## Frontend Components

### Component Hierarchy

```
ResourceLibrary (Page)
├── ResourceSearch
│   ├── SearchInput
│   └── SearchSuggestions
├── ResourceFilters
│   ├── CategoryFilter
│   ├── PhaseFilter
│   └── TagFilter
├── ResourceGrid
│   └── ResourceCard
│       ├── ResourceThumbnail
│       ├── ResourceMeta
│       ├── BookmarkButton
│       └── RatingDisplay
└── ResourcePagination

ResourceDetail (Page)
├── ResourceHeader
├── ResourceContent
├── ResourceActions
│   ├── BookmarkButton
│   ├── ShareButton
│   └── DownloadButton
├── ResourceRating
│   ├── RatingStars
│   └── ReviewForm
├── SimilarResources
└── ResourceComments

ActionPlanStep (Enhanced)
├── StepDescription
├── SuggestedResources (NEW)
│   └── InlineResourceCard
└── StepActions

ContributeDialog
├── ResourceForm
└── SubmissionConfirmation

AdminResourceManager
├── ResourceList
├── ResourceEditor
├── ContributionQueue
└── ResourceAnalytics
```

### Key Component Designs

#### SuggestedResources Component
```typescript
interface SuggestedResourcesProps {
  stepId: string;
  phase: string;
  stepDescription: string;
  maxResources?: number;
}

// Displays 3 contextually relevant resources inline with action plan step
// - Compact card design
// - Quick actions (view, bookmark)
// - "Show more" link to full library filtered by context
```

#### ResourceCard Component
```typescript
interface ResourceCardProps {
  resource: Resource;
  variant: 'grid' | 'list' | 'inline';
  showActions?: boolean;
  onBookmark?: (resourceId: number) => void;
  onView?: (resourceId: number) => void;
}

// Displays resource with:
// - Thumbnail/icon
// - Title and description
// - Category badge
// - Rating stars
// - Bookmark button
// - View count
// - Phase tags
```

#### ResourceRating Component
```typescript
interface ResourceRatingProps {
  resourceId: number;
  currentUserRating?: number;
  averageRating: number;
  ratingCount: number;
  onRate: (rating: number, review?: string) => void;
}

// Interactive rating with:
// - 5-star display
// - Click to rate
// - Optional review text
// - Helpful votes on reviews
```

## API Endpoints

### Resource Management

```typescript
// Get all resources (with filters)
GET /api/resources
Query: {
  category?: number;
  phase?: string;
  ideaType?: string;
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: 'rating' | 'recent' | 'popular';
}

// Get single resource
GET /api/resources/:id

// Get suggested resources for action plan step
GET /api/resources/suggestions/step/:stepId
Query: {
  analysisId: number;
  limit?: number;
}

// Get suggested resources for analysis
GET /api/resources/suggestions/analysis/:analysisId
Query: {
  phase?: string;
  limit?: number;
}

// Get personalized recommendations
GET /api/resources/recommendations
Query: {
  analysisId?: number;
  limit?: number;
}

// Track resource access
POST /api/resources/:id/access
Body: {
  analysisId?: number;
  stepId?: string;
  accessType: 'view' | 'download' | 'external_link';
}
```

### Bookmarks

```typescript
// Get user's bookmarks
GET /api/resources/bookmarks

// Add bookmark
POST /api/resources/:id/bookmark
Body: {
  notes?: string;
  customTags?: string[];
}

// Remove bookmark
DELETE /api/resources/:id/bookmark

// Update bookmark notes
PATCH /api/resources/bookmarks/:bookmarkId
Body: {
  notes?: string;
  customTags?: string[];
}
```

### Ratings & Reviews

```typescript
// Get resource ratings
GET /api/resources/:id/ratings
Query: {
  page?: number;
  limit?: number;
  sortBy?: 'recent' | 'helpful';
}

// Submit rating
POST /api/resources/:id/ratings
Body: {
  rating: number; // 1-5
  review?: string;
}

// Update rating
PATCH /api/resources/ratings/:ratingId
Body: {
  rating?: number;
  review?: string;
}

// Mark review as helpful
POST /api/resources/ratings/:ratingId/helpful
```

### Contributions

```typescript
// Submit resource contribution
POST /api/resources/contributions
Body: {
  title: string;
  description: string;
  url: string;
  suggestedCategoryId: number;
  suggestedTags: string[];
}

// Get user's contributions
GET /api/resources/contributions/mine

// Get contribution status
GET /api/resources/contributions/:id
```

### Admin Endpoints

```typescript
// Create resource (admin only)
POST /api/admin/resources
Body: Resource

// Update resource (admin only)
PATCH /api/admin/resources/:id
Body: Partial<Resource>

// Delete resource (admin only)
DELETE /api/admin/resources/:id

// Get pending contributions (admin only)
GET /api/admin/resources/contributions/pending

// Approve contribution (admin only)
POST /api/admin/resources/contributions/:id/approve
Body: {
  resourceData: Resource;
  adminNotes?: string;
}

// Reject contribution (admin only)
POST /api/admin/resources/contributions/:id/reject
Body: {
  reason: string;
}

// Get resource analytics (admin only)
GET /api/admin/resources/:id/analytics
Query: {
  startDate: string;
  endDate: string;
}
```

## Integration Points

### 1. Action Plan Integration

**Display Location:** Inline with each action plan step

**Implementation:**
- Add `<SuggestedResources>` component to action plan step display
- Fetch resources on step expand/view
- Cache suggestions for performance
- Track which resources are accessed from which steps

### 2. Conversation Integration

**Use Case:** AI suggests resources during conversations

**Implementation:**
- Extend conversation context to include resource suggestions
- AI can reference resources in responses
- Display resource cards in AI messages
- Track resource suggestions from conversations

### 3. Dashboard Integration

**Display Location:** Dashboard "Recommended Resources" section

**Implementation:**
- Show personalized recommendations based on active analyses
- Display recently bookmarked resources
- Show trending resources in user's categories

### 4. Template Generation Integration

**Use Case:** Generate pre-filled templates from analysis data

**Implementation:**
- Detect template resources (resource_type = 'template')
- Extract analysis data for template variables
- Generate documents using template engine
- Provide download links with expiration

## Search & Discovery

### Search Implementation

**Technology:** PostgreSQL full-text search with ts_vector

```sql
-- Add search vector column
ALTER TABLE resources ADD COLUMN search_vector tsvector;

-- Create search index
CREATE INDEX idx_resources_search ON resources USING GIN(search_vector);

-- Update search vector on insert/update
CREATE TRIGGER resources_search_update
BEFORE INSERT OR UPDATE ON resources
FOR EACH ROW EXECUTE FUNCTION
  tsvector_update_trigger(search_vector, 'pg_catalog.english', title, description);
```

### Filtering Strategy

**Multi-dimensional filtering:**
- Category (hierarchical)
- Phase (multi-select)
- Idea type (multi-select)
- Resource type (multi-select)
- Rating (minimum threshold)
- Premium status

**URL Structure:**
```
/resources?category=funding&phase=research,validation&type=template&minRating=4
```

## Analytics & Tracking

### Metrics to Track

**Resource-Level:**
- View count
- Unique users
- Bookmark count
- Average rating
- Download count (for templates)
- External link clicks
- Time spent on resource page

**User-Level:**
- Resources viewed
- Resources bookmarked
- Resources rated
- Most accessed categories
- Engagement over time

**System-Level:**
- Most popular resources
- Trending resources
- Category distribution
- Phase coverage
- Conversion impact (resources → action)

### Analytics Dashboard (Admin)

**Displays:**
- Top 10 resources by views/bookmarks/rating
- Resource usage by category
- Resource usage by phase
- User engagement metrics
- Contribution queue status
- Resource effectiveness (correlation with user success)

## Performance Considerations

### Caching Strategy

**Resource Data:**
- Cache popular resources (Redis, 1 hour TTL)
- Cache category tree (Redis, 24 hour TTL)
- Cache search results (Redis, 15 min TTL)

**Suggestions:**
- Cache step suggestions (Redis, 1 hour TTL)
- Cache analysis recommendations (Redis, 30 min TTL)
- Invalidate on resource updates

### Database Optimization

**Indexes:**
- Full-text search index on resources
- Composite index on (category_id, is_active)
- GIN index on phase_relevance and idea_types arrays
- Index on average_rating for sorting

**Query Optimization:**
- Use materialized views for analytics
- Batch update rating aggregates
- Paginate all list endpoints
- Limit related resource queries

### Frontend Optimization

**Loading:**
- Lazy load resource images
- Infinite scroll for resource grid
- Skeleton screens during loading
- Prefetch suggested resources on step hover

**Bundle Size:**
- Code split resource library page
- Lazy load admin components
- Optimize resource thumbnails

## Security Considerations

### Access Control

**Public Resources:**
- All users can view free resources
- Premium resources require Pro/Enterprise tier

**User Actions:**
- Authentication required for bookmarks, ratings, contributions
- Rate limiting on contributions (5 per day)
- Rate limiting on ratings (10 per hour)

**Admin Actions:**
- Admin role required for resource management
- Audit log for all admin actions
- Two-factor authentication for admin accounts

### Content Moderation

**Contribution Review:**
- All contributions require admin approval
- Automated checks for spam/malicious URLs
- Manual review for quality and relevance

**User-Generated Content:**
- Sanitize review text (XSS prevention)
- Profanity filter on reviews
- Report functionality for inappropriate content

### Data Privacy

**User Data:**
- Anonymize analytics data
- Allow users to delete their bookmarks/ratings
- GDPR compliance for user data export/deletion

## Testing Strategy

### Unit Tests

- ResourceMatchingService matching algorithm
- ResourceRecommendationEngine scoring
- TemplateGenerationService variable replacement
- Search query building and filtering

### Integration Tests

- Resource CRUD operations
- Bookmark management flow
- Rating submission and aggregation
- Contribution workflow (submit → review → approve)
- Template generation with real analysis data

### E2E Tests

- Complete resource discovery flow
- Bookmark and rate resource
- Submit contribution
- Admin approve contribution
- Generate and download template

## Migration Strategy

### Phase 1: Core Infrastructure (Week 1)
- Create database schema
- Implement basic CRUD operations
- Build resource library page
- Seed initial resources

### Phase 2: Contextual Suggestions (Week 2)
- Implement matching algorithm
- Integrate with action plan
- Build suggestion components
- Add analytics tracking

### Phase 3: User Features (Week 3)
- Implement bookmarks
- Implement ratings & reviews
- Build contribution system
- Add search and filters

### Phase 4: Advanced Features (Week 4)
- Template generation
- Admin dashboard
- Analytics and reporting
- Performance optimization

## Success Metrics

### Adoption Metrics
- % of users who view resources: Target >60%
- % of users who bookmark resources: Target >30%
- Resources viewed per user: Target >5
- Return rate to resource library: Target >40%

### Quality Metrics
- Average resource rating: Target >4.0/5
- Contribution approval rate: Target >70%
- Resource coverage per phase: Target >10 resources
- User satisfaction with suggestions: Target >4.2/5

### Business Metrics
- Impact on user retention: Target +25%
- Impact on Pro conversion: Target +15%
- Contribution rate: Target >5% of active users
- Resource engagement correlation with success: Measure

---

**Document Version:** 1.0  
**Last Updated:** October 28, 2025  
**Status:** Ready for Implementation
