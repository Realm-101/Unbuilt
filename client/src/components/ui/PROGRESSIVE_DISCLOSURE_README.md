# Progressive Disclosure Components

This directory contains reusable components for implementing progressive disclosure patterns throughout the Unbuilt platform. These components help reduce information overload by revealing content gradually.

## Components

### ExpandableSection

A collapsible section component with smooth animations and state persistence.

**Features:**
- Smooth expand/collapse animations using Framer Motion
- Keyboard accessible (Enter/Space to toggle)
- State persistence using user preferences store
- ARIA attributes for screen readers
- Optional summary preview when collapsed
- Optional icon and badge support

**Requirements:** 3.2, 3.4, 15.1

**Usage:**

```tsx
import { ExpandableSection } from '@/components/ui/progressive-disclosure';

<ExpandableSection
  id="competitive-analysis"
  title="Competitive Analysis"
  summary="View detailed competitor information"
  icon={<TrendingUp className="h-5 w-5" />}
  badge={5}
  persistState={true}
  defaultExpanded={false}
>
  <div>
    {/* Your content here */}
  </div>
</ExpandableSection>
```

**Props:**

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `id` | `string` | Required | Unique identifier for state persistence |
| `title` | `string` | Required | Section title |
| `summary` | `React.ReactNode` | - | Optional summary shown when collapsed |
| `children` | `React.ReactNode` | Required | Section content |
| `defaultExpanded` | `boolean` | `false` | Initial expanded state |
| `persistState` | `boolean` | `true` | Whether to persist state in user preferences |
| `icon` | `React.ReactNode` | - | Optional icon displayed before title |
| `badge` | `string \| number` | - | Optional badge displayed after title |
| `className` | `string` | - | Additional CSS classes for container |
| `headerClassName` | `string` | - | Additional CSS classes for header |
| `contentClassName` | `string` | - | Additional CSS classes for content |

---

### TabbedContent

A tab-based content organization component with advanced features.

**Features:**
- Smooth tab switching with Framer Motion transitions
- Keyboard navigation (Arrow keys, Home, End)
- Lazy loading for tab content
- URL hash synchronization for deep linking
- Mobile swipe gestures using touch events
- State persistence in user preferences
- Icon and badge support per tab

**Requirements:** 12.1, 12.2, 8.4, 15.1

**Usage:**

```tsx
import { TabbedContent, TabDefinition } from '@/components/ui/progressive-disclosure';

const tabs: TabDefinition[] = [
  {
    id: 'overview',
    label: 'Overview',
    icon: <LayoutDashboard className="h-4 w-4" />,
    content: <div>Overview content</div>,
  },
  {
    id: 'competitors',
    label: 'Competitors',
    badge: 12,
    content: <div>Competitors content</div>,
  },
  {
    id: 'market',
    label: 'Market Position',
    content: <div>Market content</div>,
    disabled: false,
  },
];

<TabbedContent
  tabs={tabs}
  defaultTab="overview"
  persistSelection={true}
  persistKey="competitive-analysis-tabs"
  syncWithUrl={true}
  lazyLoad={true}
  enableSwipeGestures={true}
  onChange={(tabId) => console.log('Tab changed:', tabId)}
/>
```

**Props:**

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `tabs` | `TabDefinition[]` | Required | Array of tab definitions |
| `defaultTab` | `string` | - | ID of initially active tab |
| `onChange` | `(tabId: string) => void` | - | Callback when tab changes |
| `persistSelection` | `boolean` | `false` | Whether to persist selected tab |
| `persistKey` | `string` | - | Key for persisting selection (required if persistSelection is true) |
| `className` | `string` | - | Additional CSS classes for container |
| `tabListClassName` | `string` | - | Additional CSS classes for tab list |
| `tabClassName` | `string` | - | Additional CSS classes for individual tabs |
| `contentClassName` | `string` | - | Additional CSS classes for content area |
| `enableSwipeGestures` | `boolean` | `true` | Enable mobile swipe gestures |
| `lazyLoad` | `boolean` | `true` | Lazy load tab content |
| `syncWithUrl` | `boolean` | `false` | Sync active tab with URL hash |

**TabDefinition Interface:**

```typescript
interface TabDefinition {
  id: string;
  label: string;
  icon?: React.ReactNode;
  badge?: string | number;
  content: React.ReactNode;
  disabled?: boolean;
}
```

---

### EnhancedAccordion

A single-open accordion component with smooth animations.

**Features:**
- Single-open accordion pattern (only one item open at a time)
- Smooth height animations using Framer Motion
- Full keyboard navigation support
- ARIA attributes for screen readers
- Respects reduced motion preferences
- Icon and badge support per item

**Requirements:** 12.3, 12.4, 15.2

**Usage:**

```tsx
import { EnhancedAccordion, AccordionItemData } from '@/components/ui/progressive-disclosure';

const items: AccordionItemData[] = [
  {
    id: 'technical',
    title: 'Technical Feasibility',
    icon: <Code className="h-5 w-5" />,
    badge: 'High',
    content: <div>Technical feasibility content</div>,
  },
  {
    id: 'market',
    title: 'Market Feasibility',
    content: <div>Market feasibility content</div>,
  },
  {
    id: 'financial',
    title: 'Financial Feasibility',
    content: <div>Financial feasibility content</div>,
    disabled: false,
  },
];

<EnhancedAccordion
  items={items}
  defaultValue="technical"
  type="single"
  collapsible={true}
  onValueChange={(value) => console.log('Accordion changed:', value)}
/>
```

**Props:**

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `items` | `AccordionItemData[]` | Required | Array of accordion items |
| `defaultValue` | `string` | - | ID of initially open item |
| `onValueChange` | `(value: string) => void` | - | Callback when item changes |
| `className` | `string` | - | Additional CSS classes for container |
| `itemClassName` | `string` | - | Additional CSS classes for items |
| `triggerClassName` | `string` | - | Additional CSS classes for triggers |
| `contentClassName` | `string` | - | Additional CSS classes for content |
| `type` | `"single" \| "multiple"` | `"single"` | Accordion type |
| `collapsible` | `boolean` | `true` | Allow closing all items |

**AccordionItemData Interface:**

```typescript
interface AccordionItemData {
  id: string;
  title: string;
  content: React.ReactNode;
  icon?: React.ReactNode;
  badge?: string | number;
  disabled?: boolean;
}
```

---

## Accessibility

All components follow WCAG 2.1 Level AA accessibility guidelines:

- **Keyboard Navigation:** All interactive elements are keyboard accessible
- **ARIA Attributes:** Proper ARIA labels, roles, and states
- **Focus Management:** Visible focus indicators and logical tab order
- **Screen Reader Support:** Descriptive labels and announcements
- **Reduced Motion:** Respects `prefers-reduced-motion` preference

## State Persistence

Components that support state persistence use the `useUserPreferencesStore` Zustand store. The state is:

1. Stored locally in browser localStorage
2. Debounced and synced to the backend
3. Restored on page reload
4. Shared across browser tabs

## Examples

### Analysis Results with Progressive Disclosure

```tsx
import { ExpandableSection, TabbedContent } from '@/components/ui/progressive-disclosure';

function AnalysisResults({ analysis }) {
  const competitiveTabs = [
    { id: 'overview', label: 'Overview', content: <CompetitiveOverview /> },
    { id: 'competitors', label: 'Competitors', content: <CompetitorsList /> },
    { id: 'position', label: 'Market Position', content: <MarketPosition /> },
  ];

  return (
    <div className="space-y-4">
      {/* Summary always visible */}
      <AnalysisSummary analysis={analysis} />

      {/* Expandable competitive analysis */}
      <ExpandableSection
        id="competitive-analysis"
        title="Competitive Analysis"
        summary="View detailed competitor information and market positioning"
        badge={analysis.competitorCount}
      >
        <TabbedContent
          tabs={competitiveTabs}
          persistSelection={true}
          persistKey="competitive-tabs"
          lazyLoad={true}
        />
      </ExpandableSection>

      {/* More expandable sections... */}
    </div>
  );
}
```

### Action Plan with Accordion

```tsx
import { EnhancedAccordion } from '@/components/ui/progressive-disclosure';

function ActionPlan({ phases }) {
  const items = phases.map(phase => ({
    id: phase.id,
    title: phase.name,
    badge: `${phase.completedSteps}/${phase.totalSteps}`,
    content: <PhaseDetails phase={phase} />,
  }));

  return (
    <EnhancedAccordion
      items={items}
      defaultValue={phases[0].id}
      type="single"
      collapsible={true}
    />
  );
}
```

## Testing

Unit tests are provided in `__tests__/progressive-disclosure.test.tsx`. Run tests with:

```bash
npm test -- progressive-disclosure
```

## Performance Considerations

- **Lazy Loading:** TabbedContent supports lazy loading to avoid rendering all tab content upfront
- **Animations:** Uses Framer Motion with optimized animations
- **Reduced Motion:** Respects user's motion preferences
- **Debounced Sync:** State changes are debounced before syncing to backend

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile browsers (iOS Safari, Chrome Android)

## Related Components

- `Accordion` - Basic accordion from shadcn/ui
- `Tabs` - Basic tabs from shadcn/ui
- `Collapsible` - Basic collapsible from shadcn/ui

These progressive disclosure components build upon the basic shadcn/ui components with additional features for the Unbuilt platform.
