# UI Components - Error Handling & Loading States

This directory contains enhanced UI components for error handling, loading states, and user feedback.

## Components

### ErrorBoundary

Catches JavaScript errors in the component tree and displays a fallback UI.

```tsx
import { ErrorBoundary } from '@/components/ErrorBoundary';

<ErrorBoundary>
  <App />
</ErrorBoundary>
```

### Loading Spinners

Various loading spinner components for different use cases:

```tsx
import { LoadingSpinner, FullPageLoader, InlineLoader } from '@/components/ui/loading-spinner';

// Standard spinner
<LoadingSpinner size="md" text="Loading..." />

// Full page overlay
<FullPageLoader text="Processing your request..." />

// Inline spinner for buttons
<Button disabled>
  <InlineLoader /> Loading...
</Button>
```

### Progress Indicators

Display progress for multi-step operations:

```tsx
import { ProgressIndicator, LinearProgress } from '@/components/ui/progress-indicator';

// Multi-step progress
<ProgressIndicator 
  steps={['Upload', 'Process', 'Complete']} 
  currentStep={1} 
/>

// Linear progress bar
<LinearProgress 
  value={75} 
  label="Processing..." 
  showPercentage 
/>
```

### Skeleton Loaders

Display skeleton loaders while content is loading:

```tsx
import { 
  CardSkeleton, 
  TableSkeleton, 
  ListSkeleton,
  SearchResultsSkeleton,
  DashboardSkeleton 
} from '@/components/ui/skeleton-loader';

// Card skeleton
<CardSkeleton />

// Table skeleton
<TableSkeleton rows={5} columns={4} />

// Search results skeleton
<SearchResultsSkeleton count={3} />
```

## Hooks

### useErrorHandler

Comprehensive error handling hook with retry logic:

```tsx
import { useErrorHandler } from '@/hooks/useErrorHandler';

function MyComponent() {
  const { handleError, retry, isRetrying } = useErrorHandler();

  const fetchData = async () => {
    try {
      const data = await api.getData();
      return data;
    } catch (error) {
      handleError(error, { 
        showToast: true,
        retry: true 
      });
    }
  };

  // With automatic retry
  const fetchWithRetry = () => {
    retry(
      () => api.getData(),
      { maxRetries: 3, initialDelay: 1000 }
    );
  };

  return (
    <div>
      {isRetrying && <LoadingSpinner text="Retrying..." />}
      <Button onClick={fetchData}>Fetch Data</Button>
    </div>
  );
}
```

## Toast Helpers

Convenient functions for showing toast notifications:

```tsx
import {
  showSuccessToast,
  showErrorToast,
  showWarningToast,
  showInfoToast,
  showLoadingToast,
  showPromiseToast,
  showNetworkErrorToast,
  showAuthErrorToast,
  showValidationErrorToast
} from '@/lib/toast-helpers';

// Success notification
showSuccessToast('Saved!', 'Your changes have been saved.');

// Error notification
showErrorToast('Error', 'Something went wrong.');

// Promise-based notification
await showPromiseToast(
  saveData(),
  {
    loading: 'Saving...',
    success: 'Saved successfully!',
    error: 'Failed to save'
  }
);

// Network error
showNetworkErrorToast();

// Validation errors
showValidationErrorToast(['Email is required', 'Password is too short']);
```

## Complete Example

Here's a complete example combining all the components:

```tsx
import { useState } from 'react';
import { useErrorHandler } from '@/hooks/useErrorHandler';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { SearchResultsSkeleton } from '@/components/ui/skeleton-loader';
import { showSuccessToast, showPromiseToast } from '@/lib/toast-helpers';

function SearchPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState(null);
  const { handleError, retry, isRetrying } = useErrorHandler();

  const performSearch = async (query: string) => {
    setIsLoading(true);
    
    try {
      const data = await retry(
        () => api.search(query),
        { maxRetries: 3 }
      );
      
      setResults(data);
      showSuccessToast('Search complete', `Found ${data.length} results`);
    } catch (error) {
      handleError(error, { showToast: true });
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading || isRetrying) {
    return <SearchResultsSkeleton count={3} />;
  }

  return (
    <div>
      {/* Your search UI */}
    </div>
  );
}
```

## Best Practices

1. **Always wrap your app with ErrorBoundary** at the root level
2. **Use skeleton loaders** instead of generic spinners for better UX
3. **Provide retry options** for network errors
4. **Show progress indicators** for long-running operations
5. **Use toast notifications** for success/error feedback
6. **Handle errors gracefully** with user-friendly messages
7. **Log errors** in production for debugging

## Requirements Addressed

These components address the following requirements from Phase 3:

- **Requirement 9.1**: User-friendly error messages
- **Requirement 9.2**: Validation error highlighting
- **Requirement 9.3**: Retry options for failed requests
- **Requirement 9.4**: Loading states and progress indicators
- **Requirement 9.5**: Success confirmation feedback
- **Requirement 9.6**: Network connectivity detection
- **Requirement 9.7**: Error logging without exposing sensitive data
