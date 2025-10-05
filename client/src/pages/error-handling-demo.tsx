import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useErrorHandler } from '@/hooks/useErrorHandler';
import { LoadingSpinner, FullPageLoader, InlineLoader } from '@/components/ui/loading-spinner';
import { ProgressIndicator, LinearProgress } from '@/components/ui/progress-indicator';
import { 
  CardSkeleton, 
  TableSkeleton, 
  SearchResultsSkeleton 
} from '@/components/ui/skeleton-loader';
import {
  showSuccessToast,
  showErrorToast,
  showWarningToast,
  showInfoToast,
  showPromiseToast,
  showNetworkErrorToast,
} from '@/lib/toast-helpers';

/**
 * Error Handling Demo Page
 * 
 * Demonstrates all error handling and loading state components.
 * This page is for testing and demonstration purposes only.
 */
export default function ErrorHandlingDemo() {
  const { handleError, retry, isRetrying, retryCount } = useErrorHandler();
  const [showFullPageLoader, setShowFullPageLoader] = useState(false);
  const [showSkeletons, setShowSkeletons] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState(0);

  // Simulate network error
  const simulateNetworkError = () => {
    const error = new Error('fetch failed');
    handleError(error, { showToast: true });
  };

  // Simulate validation error
  const simulateValidationError = () => {
    const error = new Error('validation failed');
    handleError(error, { showToast: true });
  };

  // Simulate retry with success
  const simulateRetrySuccess = async () => {
    let attempts = 0;
    try {
      await retry(async () => {
        attempts++;
        if (attempts < 2) {
          throw new Error('Temporary failure');
        }
        return 'Success!';
      });
      showSuccessToast('Success!', 'Operation completed after retry');
    } catch (error) {
      handleError(error, { showToast: true });
    }
  };

  // Simulate promise toast
  const simulatePromiseToast = async () => {
    const promise = new Promise((resolve) => {
      setTimeout(() => resolve('Done'), 2000);
    });

    await showPromiseToast(promise, {
      loading: 'Processing...',
      success: 'Operation completed!',
      error: 'Operation failed',
    });
  };

  // Simulate progress
  const simulateProgress = () => {
    setProgress(0);
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          showSuccessToast('Complete!', 'Progress reached 100%');
          return 100;
        }
        return prev + 10;
      });
    }, 500);
  };

  // Simulate step progress
  const simulateStepProgress = () => {
    setCurrentStep(0);
    const steps = ['Upload', 'Process', 'Analyze', 'Complete'];
    const interval = setInterval(() => {
      setCurrentStep((prev) => {
        if (prev >= steps.length - 1) {
          clearInterval(interval);
          showSuccessToast('Complete!', 'All steps finished');
          return prev;
        }
        return prev + 1;
      });
    }, 1500);
  };

  // Simulate component error (for ErrorBoundary)
  const [shouldThrowError, setShouldThrowError] = useState(false);
  if (shouldThrowError) {
    throw new Error('Simulated component error for ErrorBoundary test');
  }

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold mb-2">Error Handling Demo</h1>
        <p className="text-muted-foreground">
          Test all error handling and loading state components
        </p>
      </div>

      {/* Toast Notifications */}
      <Card>
        <CardHeader>
          <CardTitle>Toast Notifications</CardTitle>
          <CardDescription>Test different types of toast notifications</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button onClick={() => showSuccessToast('Success!', 'Operation completed')}>
            Success Toast
          </Button>
          <Button onClick={() => showErrorToast('Error!', 'Something went wrong')}>
            Error Toast
          </Button>
          <Button onClick={() => showWarningToast('Warning!', 'Please be careful')}>
            Warning Toast
          </Button>
          <Button onClick={() => showInfoToast('Info', 'Here is some information')}>
            Info Toast
          </Button>
          <Button onClick={() => showNetworkErrorToast()}>
            Network Error Toast
          </Button>
          <Button onClick={simulatePromiseToast}>
            Promise Toast (2s)
          </Button>
        </CardContent>
      </Card>

      {/* Error Handling */}
      <Card>
        <CardHeader>
          <CardTitle>Error Handling</CardTitle>
          <CardDescription>Test error classification and retry logic</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button onClick={simulateNetworkError}>
              Simulate Network Error
            </Button>
            <Button onClick={simulateValidationError}>
              Simulate Validation Error
            </Button>
            <Button onClick={simulateRetrySuccess} disabled={isRetrying}>
              {isRetrying ? (
                <>
                  <InlineLoader /> Retrying... ({retryCount})
                </>
              ) : (
                'Test Retry Logic'
              )}
            </Button>
            <Button 
              onClick={() => setShouldThrowError(true)}
              variant="destructive"
            >
              Trigger ErrorBoundary
            </Button>
          </div>
          {isRetrying && (
            <div className="p-4 bg-muted rounded-md">
              <p className="text-sm">Retrying operation... Attempt {retryCount}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Loading Spinners */}
      <Card>
        <CardHeader>
          <CardTitle>Loading Spinners</CardTitle>
          <CardDescription>Different spinner sizes and variants</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-8">
            <div>
              <p className="text-sm mb-2">Small</p>
              <LoadingSpinner size="sm" />
            </div>
            <div>
              <p className="text-sm mb-2">Medium</p>
              <LoadingSpinner size="md" />
            </div>
            <div>
              <p className="text-sm mb-2">Large</p>
              <LoadingSpinner size="lg" />
            </div>
            <div>
              <p className="text-sm mb-2">Extra Large</p>
              <LoadingSpinner size="xl" />
            </div>
          </div>
          <div>
            <p className="text-sm mb-2">With Text</p>
            <LoadingSpinner size="md" text="Loading your data..." />
          </div>
          <div>
            <Button onClick={() => setShowFullPageLoader(true)}>
              Show Full Page Loader
            </Button>
            {showFullPageLoader && (
              <FullPageLoader text="Loading..." />
            )}
            {showFullPageLoader && (
              <Button 
                onClick={() => setShowFullPageLoader(false)}
                className="ml-2"
              >
                Hide
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Progress Indicators */}
      <Card>
        <CardHeader>
          <CardTitle>Progress Indicators</CardTitle>
          <CardDescription>Linear and step-based progress</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <Button onClick={simulateProgress} className="mb-4">
              Simulate Linear Progress
            </Button>
            <LinearProgress 
              value={progress} 
              label="Processing..." 
              showPercentage 
            />
          </div>
          <div>
            <Button onClick={simulateStepProgress} className="mb-4">
              Simulate Step Progress
            </Button>
            <ProgressIndicator 
              steps={['Upload', 'Process', 'Analyze', 'Complete']}
              currentStep={currentStep}
            />
          </div>
        </CardContent>
      </Card>

      {/* Skeleton Loaders */}
      <Card>
        <CardHeader>
          <CardTitle>Skeleton Loaders</CardTitle>
          <CardDescription>Content placeholders while loading</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button onClick={() => setShowSkeletons(!showSkeletons)}>
            {showSkeletons ? 'Hide' : 'Show'} Skeletons
          </Button>
          
          {showSkeletons && (
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-medium mb-2">Card Skeleton</h3>
                <CardSkeleton />
              </div>
              
              <div>
                <h3 className="text-sm font-medium mb-2">Table Skeleton</h3>
                <TableSkeleton rows={3} columns={4} />
              </div>
              
              <div>
                <h3 className="text-sm font-medium mb-2">Search Results Skeleton</h3>
                <SearchResultsSkeleton count={2} />
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
