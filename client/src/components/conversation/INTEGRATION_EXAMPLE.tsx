/**
 * Integration Example: ConversationInterface
 * 
 * This file demonstrates how to integrate the ConversationInterface
 * component into an analysis results page.
 * 
 * DO NOT USE THIS FILE IN PRODUCTION - IT'S FOR REFERENCE ONLY
 */

import { ConversationInterface } from '@/components/conversation';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

// Example: Integration in Analysis Results Page
export function AnalysisResultsPageExample() {
  // Assume we have the analysis ID from route params or props
  const analysisId = 123;

  return (
    <div className="container mx-auto py-8 space-y-8">
      {/* Original Analysis Results */}
      <Card>
        <CardHeader>
          <CardTitle>Gap Analysis Results</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Your existing analysis display components */}
          <div className="space-y-4">
            <div>Innovation Score: 85/100</div>
            <div>Top Gaps: ...</div>
            <div>Competitive Analysis: ...</div>
            {/* etc. */}
          </div>
        </CardContent>
      </Card>

      <Separator />

      {/* Conversation Interface */}
      <div className="space-y-4">
        <div>
          <h2 className="text-2xl font-bold">Continue the Conversation</h2>
          <p className="text-muted-foreground">
            Ask follow-up questions to explore your analysis in more depth
          </p>
        </div>
        
        <ConversationInterface
          analysisId={analysisId}
          onVariantCreated={(variantId) => {
            console.log('New variant created:', variantId);
            // Handle variant creation (e.g., navigate to variant view)
          }}
        />
      </div>
    </div>
  );
}

// Example: Minimal Integration
export function MinimalIntegrationExample() {
  const analysisId = 123;

  return (
    <div className="max-w-4xl mx-auto p-4">
      <ConversationInterface analysisId={analysisId} />
    </div>
  );
}

// Example: With Custom Styling
export function CustomStyledExample() {
  const analysisId = 123;

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-500 to-pink-500 bg-clip-text text-transparent">
            AI-Powered Insights
          </h1>
          <p className="text-muted-foreground">
            Explore your analysis with interactive conversations
          </p>
        </div>

        <ConversationInterface analysisId={analysisId} />
      </div>
    </div>
  );
}

// Example: With Loading State
export function WithLoadingStateExample() {
  const analysisId = 123;
  const isAnalysisLoading = false; // Replace with actual loading state

  if (isAnalysisLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-2">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
          <p className="text-muted-foreground">Loading analysis...</p>
        </div>
      </div>
    );
  }

  return <ConversationInterface analysisId={analysisId} />;
}

// Example: With Error Boundary
import { ErrorBoundary } from '@/components/ErrorBoundary';

export function WithErrorBoundaryExample() {
  const analysisId = 123;

  return (
    <ErrorBoundary
      fallback={
        <Card className="p-6">
          <div className="text-center space-y-2">
            <p className="text-destructive font-medium">
              Failed to load conversation
            </p>
            <p className="text-sm text-muted-foreground">
              Please refresh the page or try again later
            </p>
          </div>
        </Card>
      }
    >
      <ConversationInterface analysisId={analysisId} />
    </ErrorBoundary>
  );
}

// Example: With Conditional Display (Pro Users Only)
export function ProUserOnlyExample() {
  const analysisId = 123;
  const userTier = 'pro'; // Replace with actual user tier from auth context
  const isProUser = userTier === 'pro' || userTier === 'enterprise';

  if (!isProUser) {
    return (
      <Card className="p-6">
        <div className="text-center space-y-4">
          <h3 className="text-xl font-semibold">
            Unlock AI Conversations
          </h3>
          <p className="text-muted-foreground">
            Upgrade to Pro to ask follow-up questions and explore your analysis in depth
          </p>
          <a
            href="/pricing"
            className="inline-flex items-center justify-center rounded-md bg-primary px-6 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Upgrade to Pro
          </a>
        </div>
      </Card>
    );
  }

  return <ConversationInterface analysisId={analysisId} />;
}

// Example: With Analytics Tracking
export function WithAnalyticsExample() {
  const analysisId = 123;

  const handleVariantCreated = (variantId: number) => {
    // Track variant creation
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', 'variant_created', {
        analysis_id: analysisId,
        variant_id: variantId,
      });
    }
    
    console.log('Variant created:', variantId);
  };

  return (
    <ConversationInterface
      analysisId={analysisId}
      onVariantCreated={handleVariantCreated}
    />
  );
}

/**
 * Usage Notes:
 * 
 * 1. The ConversationInterface component is self-contained and handles:
 *    - Data fetching
 *    - Loading states
 *    - Error handling
 *    - Message sending
 *    - Auto-scrolling
 * 
 * 2. Required props:
 *    - analysisId: The ID of the gap analysis
 * 
 * 3. Optional props:
 *    - onVariantCreated: Callback when user creates an analysis variant
 * 
 * 4. The component uses TanStack Query for data management, so make sure
 *    your app is wrapped with QueryClientProvider
 * 
 * 5. The component respects user tier limits automatically by checking
 *    the backend API responses
 * 
 * 6. All styling is handled internally using Tailwind CSS and shadcn/ui
 * 
 * 7. The component is fully responsive and works on mobile devices
 * 
 * 8. Accessibility features are built-in (keyboard navigation, ARIA labels, etc.)
 */
