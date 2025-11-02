# Tier Comparison and Upgrade Flow

This directory contains components and utilities for managing subscription tier comparisons and contextual upgrade prompts throughout the application.

## Components

### TierComparisonModal

A comprehensive modal that displays all available subscription tiers (Free, Pro, Enterprise) side-by-side with detailed feature comparisons.

**Features:**
- Responsive design (stacked on mobile, side-by-side on desktop)
- Highlights current user tier
- Can highlight a specific tier (e.g., when prompting upgrade)
- Shows "Most Popular" badge on Pro tier
- Displays feature checkmarks and crosses
- Mobile-optimized with touch-friendly interactions

**Usage:**
```tsx
import { TierComparisonModal } from '@/components/tier';

function MyComponent() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setIsOpen(true)}>View Plans</Button>
      <TierComparisonModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        highlightTier="pro" // Optional: highlight a specific tier
      />
    </>
  );
}
```

### UpgradePrompt

A contextual upgrade prompt that appears based on user actions and can be dismissed with a 24-hour cooldown.

**Prompt Types:**
- `search-limit` - When user approaches search limit
- `premium-feature` - When accessing a Pro-only feature
- `export-limit` - When export limit is reached
- `collaboration` - When trying to use collaboration features

**Features:**
- Automatic cooldown management (24 hours after dismissal)
- Gentle, non-intrusive messaging
- Color-coded by prompt type
- Dismissible with "Maybe Later" option
- Opens TierComparisonModal on "View Plans"

**Usage:**
```tsx
import { UpgradePrompt } from '@/components/tier';

function MyComponent() {
  return (
    <UpgradePrompt
      reason="search-limit"
      featureName="Advanced Analytics" // Optional
      onDismiss={() => console.log('Dismissed')}
    />
  );
}
```

### InlineUpgradePrompt

A compact inline version of the upgrade prompt for use within other components.

**Usage:**
```tsx
import { InlineUpgradePrompt } from '@/components/tier';

function MyComponent() {
  return (
    <div>
      <h3>Advanced Analytics</h3>
      <InlineUpgradePrompt
        reason="premium-feature"
        featureName="Advanced Analytics"
        compact={true} // Optional: even more compact
      />
    </div>
  );
}
```

## Hook

### useUpgradePrompt

A hook for managing upgrade prompts programmatically throughout the application.

**Features:**
- Check if a prompt should be shown (respects cooldown and user tier)
- Show/dismiss prompts programmatically
- Track active prompt state
- Automatic cooldown management

**Usage:**
```tsx
import { useUpgradePrompt } from '@/components/tier';

function MyComponent() {
  const {
    shouldShowPrompt,
    showPrompt,
    dismissPrompt,
    activePrompt,
    clearActivePrompt
  } = useUpgradePrompt();

  const handlePremiumFeature = () => {
    if (shouldShowPrompt('premium-feature')) {
      showPrompt('premium-feature', 'Advanced Analytics');
    }
  };

  return (
    <>
      <Button onClick={handlePremiumFeature}>
        Use Premium Feature
      </Button>
      
      {activePrompt && (
        <UpgradePrompt
          reason={activePrompt.reason}
          featureName={activePrompt.featureName}
          onDismiss={clearActivePrompt}
        />
      )}
    </>
  );
}
```

## Integration Examples

### Dashboard Integration

```tsx
import { TierIndicator } from '@/components/dashboard/TierIndicator';

// TierIndicator already includes TierComparisonModal
<TierIndicator showUsage={true} />
```

### Search Page Integration

```tsx
import { UpgradePrompt } from '@/components/tier';
import { useQuery } from '@tanstack/react-query';

function SearchPage() {
  const { data: usageStats } = useQuery({
    queryKey: ['/api/user/usage'],
  });

  const usagePercentage = usageStats
    ? (usageStats.searchesUsed / usageStats.searchesLimit) * 100
    : 0;

  return (
    <>
      {usagePercentage >= 80 && (
        <UpgradePrompt reason="search-limit" />
      )}
      {/* Rest of search page */}
    </>
  );
}
```

### Premium Feature Gate

```tsx
import { InlineUpgradePrompt } from '@/components/tier';
import { useAuth } from '@/hooks/useAuth';

function PremiumFeature() {
  const { user } = useAuth();

  if (user?.plan === 'free') {
    return (
      <div className="p-6 bg-gray-800 rounded-lg">
        <h3 className="text-xl font-bold mb-4">Advanced Analytics</h3>
        <InlineUpgradePrompt
          reason="premium-feature"
          featureName="Advanced Analytics"
        />
      </div>
    );
  }

  return <AdvancedAnalyticsComponent />;
}
```

## Cooldown Management

Upgrade prompts use localStorage to track dismissals and implement a 24-hour cooldown period. This prevents prompt fatigue while still reminding users of upgrade benefits.

**Cooldown Keys:**
- `upgrade-prompt-dismissed-search-limit`
- `upgrade-prompt-dismissed-premium-feature`
- `upgrade-prompt-dismissed-export-limit`
- `upgrade-prompt-dismissed-collaboration`

The cooldown is automatically managed by the components and hook. To manually clear cooldowns:

```typescript
localStorage.removeItem('upgrade-prompt-dismissed-search-limit');
```

## Styling

All components use the application's design system:
- Dark theme with gray-800/900 backgrounds
- Purple accent colors for CTAs
- Color-coded prompts (orange for limits, purple for features)
- Responsive breakpoints (mobile-first)
- Smooth animations and transitions

## Accessibility

- Keyboard navigation support
- ARIA labels on interactive elements
- Focus management in modals
- Screen reader friendly
- Respects reduced motion preferences

## Requirements Satisfied

This implementation satisfies the following requirements from the UX Information Architecture spec:

- **Requirement 10.3**: Clear visual indicators of subscription tier and usage limits
- **Requirement 10.4**: Gentle upgrade prompts when approaching limits
- **Requirement 10.5**: Comparison view of tier features accessible from upgrade prompts
