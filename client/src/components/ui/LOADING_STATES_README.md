# Loading States System

## Overview

Comprehensive loading state components for providing visual feedback during async operations. Includes button loading states, skeleton screens, loading overlays, and progress indicators.

## Components

### 1. Button Loading States

Enhanced button component with built-in loading state support.

```typescript
import { Button } from "@/components/ui/button";

// Basic loading button
<Button loading>
  Save Changes
</Button>

// With custom loading text
<Button loading loadingText="Saving...">
  Save Changes
</Button>

// Programmatic control
const [isLoading, setIsLoading] = useState(false);

async function handleSave() {
  setIsLoading(true);
  await saveData();
  setIsLoading(false);
}

<Button loading={isLoading} onClick={handleSave}>
  Save Changes
</Button>
```

**Features:**
- Automatic spinner display
- Disabled state when loading
- Optional custom loading text
- ARIA `aria-busy` attribute
- Maintains button size during loading

### 2. Loading Spinner

Simple spinner component for inline loading indicators.

```typescript
import { LoadingSpinner, InlineLoader, FullPageLoader } from "@/components/ui/loading-spinner";

// Standard spinner
<LoadingSpinner size="md" text="Loading..." />

// Inline spinner (for buttons, small spaces)
<InlineLoader />

// Full page loader
<FullPageLoader text="Loading your data..." />
```

**Sizes:** `sm`, `md`, `lg`, `xl`

### 3. Skeleton Screens

Placeholder components that show content structure while loading.

```typescript
import {
  CardSkeleton,
  TableSkeleton,
  ListSkeleton,
  SearchResultsSkeleton,
  DashboardSkeleton,
  ProfileSkeleton,
} from "@/components/ui/skeleton-loader";

// Card skeleton
<CardSkeleton />

// Table skeleton
<TableSkeleton rows={5} columns={4} />

// List skeleton
<ListSkeleton items={5} />

// Search results skeleton
<SearchResultsSkeleton count={3} />

// Dashboard skeleton
<DashboardSkeleton />

// Profile skeleton
<ProfileSkeleton />
```

**When to use:**
- Initial page loads
- Data fetching
- Content that has a predictable structure
- Better UX than spinners for content-heavy pages

### 4. Loading Overlay

Full-page or container-level loading overlay with blur effect.

```typescript
import { LoadingOverlay, useLoadingOverlay } from "@/components/ui/loading-overlay";

// Basic usage
<LoadingOverlay 
  isLoading={isLoading} 
  message="Loading data..." 
/>

// Full page overlay
<LoadingOverlay 
  isLoading={isLoading} 
  message="Processing..." 
  description="This may take a few moments"
  fullPage 
/>

// Container overlay
<div className="relative">
  <LoadingOverlay isLoading={isLoading} message="Loading..." />
  <YourContent />
</div>

// Using the hook
const { isLoading, startLoading, stopLoading, LoadingOverlay } = useLoadingOverlay();

async function handleAction() {
  startLoading("Processing...", "Please wait");
  await doSomething();
  stopLoading();
}

return (
  <>
    <LoadingOverlay fullPage />
    <button onClick={handleAction}>Do Something</button>
  </>
);
```

**Props:**
- `isLoading`: boolean - Whether to show the overlay
- `message`: string - Main loading message
- `description`: string - Additional description
- `blur`: boolean - Whether to blur background (default: true)
- `fullPage`: boolean - Full page overlay using portal (default: false)
- `spinnerSize`: "sm" | "md" | "lg" - Spinner size

### 5. Progress Bar

Multi-step progress indicator for complex operations.

```typescript
import { ProgressBar, useProgressBar } from "@/components/ui/progress-bar";

// Basic usage
const steps = [
  { id: "1", label: "Validate", description: "Validating data" },
  { id: "2", label: "Process", description: "Processing request" },
  { id: "3", label: "Complete", description: "Finishing up" },
];

<ProgressBar currentStep={1} steps={steps} />

// Vertical orientation
<ProgressBar 
  currentStep={1} 
  steps={steps} 
  orientation="vertical" 
/>

// Using the hook
const { 
  currentStep, 
  nextStep, 
  prevStep, 
  goToStep, 
  isFirstStep, 
  isLastStep,
  progress,
  ProgressBar 
} = useProgressBar(steps);

async function handleMultiStepProcess() {
  for (let i = 0; i < steps.length; i++) {
    goToStep(i);
    await performStep(i);
  }
}

return (
  <>
    <ProgressBar />
    <button onClick={nextStep} disabled={isLastStep}>
      Next
    </button>
  </>
);
```

**Props:**
- `currentStep`: number - Current step index (0-based)
- `steps`: ProgressStep[] - Array of steps
- `showLabels`: boolean - Show step labels (default: true)
- `showNumbers`: boolean - Show step numbers (default: true)
- `orientation`: "horizontal" | "vertical" - Layout orientation

## Usage Patterns

### Pattern 1: Simple Button Action

```typescript
const [isLoading, setIsLoading] = useState(false);

async function handleSave() {
  setIsLoading(true);
  try {
    await saveData();
    showSuccess("Saved successfully!");
  } catch (error) {
    showError("Failed to save");
  } finally {
    setIsLoading(false);
  }
}

<Button loading={isLoading} onClick={handleSave}>
  Save
</Button>
```

### Pattern 2: Page Load with Skeleton

```typescript
function MyPage() {
  const { data, isLoading } = useQuery("myData", fetchData);

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  return <Dashboard data={data} />;
}
```

### Pattern 3: Full Page Operation

```typescript
function MyComponent() {
  const { isLoading, startLoading, stopLoading, LoadingOverlay } = useLoadingOverlay();

  async function handleExport() {
    startLoading("Generating report...", "This may take a minute");
    try {
      await generateReport();
      showSuccess("Report generated!");
    } finally {
      stopLoading();
    }
  }

  return (
    <>
      <LoadingOverlay fullPage />
      <Button onClick={handleExport}>Export Report</Button>
    </>
  );
}
```

### Pattern 4: Multi-Step Process

```typescript
function MultiStepForm() {
  const steps = [
    { id: "1", label: "Personal Info" },
    { id: "2", label: "Address" },
    { id: "3", label: "Review" },
  ];

  const { currentStep, nextStep, prevStep, isLastStep, ProgressBar } = useProgressBar(steps);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleNext() {
    if (isLastStep) {
      setIsSubmitting(true);
      await submitForm();
      setIsSubmitting(false);
    } else {
      nextStep();
    }
  }

  return (
    <>
      <ProgressBar />
      <FormStep step={currentStep} />
      <Button loading={isSubmitting} onClick={handleNext}>
        {isLastStep ? "Submit" : "Next"}
      </Button>
    </>
  );
}
```

### Pattern 5: Optimistic Updates with Loading

```typescript
function TodoItem({ todo }) {
  const [isUpdating, setIsUpdating] = useState(false);

  async function handleToggle() {
    setIsUpdating(true);
    // Optimistic update
    updateTodoLocally(todo.id, { completed: !todo.completed });
    
    try {
      await updateTodoOnServer(todo.id, { completed: !todo.completed });
    } catch (error) {
      // Revert on error
      updateTodoLocally(todo.id, { completed: todo.completed });
      showError("Failed to update");
    } finally {
      setIsUpdating(false);
    }
  }

  return (
    <div className="relative">
      {isUpdating && <LoadingOverlay isLoading message="Updating..." />}
      <Checkbox checked={todo.completed} onChange={handleToggle} />
      <span>{todo.title}</span>
    </div>
  );
}
```

## Accessibility

### ARIA Attributes

All loading components include proper ARIA attributes:

- `role="status"` or `role="progressbar"` for loading indicators
- `aria-live="polite"` for non-critical loading states
- `aria-busy="true"` on loading buttons
- `aria-valuenow`, `aria-valuemin`, `aria-valuemax` for progress bars
- Screen reader text with `sr-only` class

### Keyboard Navigation

- Loading buttons remain focusable but disabled
- Loading overlays trap focus when full-page
- Progress indicators are keyboard navigable

### Visual Accessibility

- High contrast loading indicators
- Animated spinners respect `prefers-reduced-motion`
- Clear visual distinction between loading and loaded states
- Sufficient color contrast for all loading states

## Performance Considerations

### Skeleton Screens

- Use skeleton screens for initial loads (better perceived performance)
- Lazy load skeleton components to reduce bundle size
- Match skeleton structure to actual content for smooth transition

### Loading Overlays

- Use sparingly for full-page overlays (can be jarring)
- Prefer container-level overlays when possible
- Consider using progress bars for long operations

### Button Loading States

- Always disable buttons during loading
- Provide immediate visual feedback (spinner appears instantly)
- Keep loading text concise

## Best Practices

### Do's
✅ Show loading state immediately when action starts
✅ Use skeleton screens for predictable content structures
✅ Provide progress indicators for multi-step operations
✅ Keep loading messages concise and informative
✅ Disable interactive elements during loading
✅ Use appropriate loading component for the context

### Don'ts
❌ Don't show multiple loading indicators for the same action
❌ Don't use full-page overlays for quick operations
❌ Don't forget to handle loading errors
❌ Don't leave users in loading state indefinitely
❌ Don't use loading states without timeout/error handling
❌ Don't block the entire UI for background operations

## Integration with Toast System

Loading states work seamlessly with the toast notification system:

```typescript
import { showPromise } from "@/lib/toast-helpers";
import { Button } from "@/components/ui/button";

function MyComponent() {
  const [isLoading, setIsLoading] = useState(false);

  async function handleAction() {
    setIsLoading(true);
    try {
      await showPromise(
        performAction(),
        {
          loading: "Processing...",
          success: "Action completed!",
          error: "Action failed",
        }
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Button loading={isLoading} onClick={handleAction}>
      Perform Action
    </Button>
  );
}
```

## Testing

```typescript
import { render, screen, waitFor } from "@testing-library/react";
import { Button } from "@/components/ui/button";
import { LoadingOverlay } from "@/components/ui/loading-overlay";

test("button shows loading state", () => {
  render(<Button loading>Save</Button>);
  
  expect(screen.getByRole("button")).toHaveAttribute("aria-busy", "true");
  expect(screen.getByRole("button")).toBeDisabled();
});

test("loading overlay displays message", () => {
  render(<LoadingOverlay isLoading message="Loading data..." />);
  
  expect(screen.getByText("Loading data...")).toBeInTheDocument();
  expect(screen.getByRole("status")).toBeInTheDocument();
});
```
