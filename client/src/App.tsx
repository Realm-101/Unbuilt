import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { lazy, Suspense, useEffect } from "react";
import { useAuth } from "./hooks/useAuth";
import { initializeAuth } from "./hooks/use-auth";
import { SkipLink } from "@/components/accessibility/SkipLink";

// Eager load critical pages
import Home from "@/pages/home";
import Landing from "@/pages/landing";
import Login from "@/pages/auth/login";
import Register from "@/pages/auth/register";

// Lazy load non-critical pages for better performance
const About = lazy(() => import("@/pages/about"));
const Help = lazy(() => import("@/pages/help"));
const Privacy = lazy(() => import("@/pages/privacy"));
const Terms = lazy(() => import("@/pages/terms"));
const SearchResults = lazy(() => import("@/pages/search-results"));
const SearchResultDetail = lazy(() => import("@/pages/search-result-detail"));
const SavedResults = lazy(() => import("@/pages/saved-results"));
const SearchHistory = lazy(() => import("@/pages/search-history"));
const Trending = lazy(() => import("@/pages/trending"));
const Bookmarks = lazy(() => import("@/pages/bookmarks"));
const Contributions = lazy(() => import("@/pages/contributions"));
const ResourceLibrary = lazy(() => import("@/pages/resources"));
const ResourceDetail = lazy(() => import("@/pages/resource-detail"));
const ForgotPassword = lazy(() => import("@/pages/auth/forgot-password"));
const ResetPassword = lazy(() => import("@/pages/auth/reset-password"));
const Subscribe = lazy(() => import("@/pages/subscribe"));
const FreeTrial = lazy(() => import("@/pages/free-trial"));
const ValidateIdeaPage = lazy(() => import("@/pages/validate-idea"));
const ActionPlanPage = lazy(() => import("@/pages/action-plan"));
const MarketResearchPage = lazy(() => import("@/pages/market-research"));
const MarketTrendsPage = lazy(() => import("@/pages/market-trends"));
const AnalyticsDashboard = lazy(() => import("@/pages/analytics-dashboard"));
const Profile = lazy(() => import("@/pages/profile"));
const NotFound = lazy(() => import("@/pages/not-found"));
const Documentation = lazy(() => import("@/pages/documentation").then(m => ({ default: m.Documentation })));
const AIChat = lazy(() => import("@/components/ai-assistant/AIChat").then(m => ({ default: m.AIChat })));
const OnboardingTour = lazy(() => import("@/components/onboarding/OnboardingTour"));
const Pricing = lazy(() => import("@/pages/pricing"));
const KeyboardShortcutsModal = lazy(() => import("@/components/keyboard-shortcuts").then(m => ({ default: m.KeyboardShortcutsModal })));
const KeyboardShortcutsProvider = lazy(() => import("@/components/keyboard-shortcuts").then(m => ({ default: m.KeyboardShortcutsProvider })));
const Account = lazy(() => import("@/pages/account"));
const ProfileEdit = lazy(() => import("@/pages/profile-edit"));
const ChangePassword = lazy(() => import("@/pages/change-password"));
const ForgotPasswordAuth = lazy(() => import("@/pages/forgot-password"));
const ResetPasswordAuth = lazy(() => import("@/pages/reset-password"));
const SubscriptionSuccess = lazy(() => import("@/pages/subscription-success"));
const PublicShareView = lazy(() => import("@/pages/share"));

// Loading fallback component
function PageLoader() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-purple-950 to-black flex items-center justify-center">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-white">Loading...</p>
      </div>
    </div>
  );
}

function Router() {
  const { isAuthenticated, isLoading } = useAuth();
  
  // Show loading state while checking authentication
  if (isLoading) {
    return <PageLoader />;
  }

  return (
    <Suspense fallback={<PageLoader />}>
      <Switch>
        {/* Public routes accessible without authentication */}
        <Route path="/share/:token" component={PublicShareView} />
        
        {isAuthenticated ? (
          <>
            <Route path="/" component={Home} />
            <Route path="/search/:id" component={SearchResults} />
            <Route path="/search-result/:id" component={SearchResultDetail} />
            <Route path="/saved" component={SavedResults} />
            <Route path="/history" component={SearchHistory} />
            <Route path="/trending" component={Trending} />
            <Route path="/bookmarks" component={Bookmarks} />
            <Route path="/contributions" component={Contributions} />
            <Route path="/resources" component={ResourceLibrary} />
            <Route path="/resources/:id" component={ResourceDetail} />
            <Route path="/subscribe" component={Subscribe} />
            <Route path="/free-trial" component={FreeTrial} />
            <Route path="/validate-idea" component={ValidateIdeaPage} />
            <Route path="/action-plan" component={ActionPlanPage} />
            <Route path="/market-research" component={MarketResearchPage} />
            <Route path="/market-trends" component={MarketTrendsPage} />
            <Route path="/analytics" component={AnalyticsDashboard} />
            <Route path="/documentation" component={Documentation} />
            <Route path="/pricing" component={Pricing} />
            <Route path="/account" component={Account} />
            <Route path="/profile-edit" component={ProfileEdit} />
            <Route path="/change-password" component={ChangePassword} />
            <Route path="/profile" component={Profile} />
            <Route path="/subscription/success" component={SubscriptionSuccess} />
            <Route path="/about" component={About} />
            <Route path="/help" component={Help} />
            <Route path="/privacy" component={Privacy} />
            <Route path="/terms" component={Terms} />
          </>
        ) : (
          <>
            <Route path="/" component={Landing} />
            <Route path="/auth/login" component={Login} />
            <Route path="/auth/register" component={Register} />
            <Route path="/auth/forgot-password" component={ForgotPassword} />
            <Route path="/auth/reset-password" component={ResetPassword} />
            <Route path="/forgot-password" component={ForgotPasswordAuth} />
            <Route path="/reset-password" component={ResetPasswordAuth} />
            <Route path="/pricing" component={Pricing} />
            <Route path="/about" component={About} />
            <Route path="/help" component={Help} />
            <Route path="/privacy" component={Privacy} />
            <Route path="/terms" component={Terms} />
          </>
        )}
        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

function App() {
  // Initialize auth on app load (only once)
  useEffect(() => {
    initializeAuth();
  }, []); // Empty dependency array ensures this runs only once

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <div className="min-h-screen bg-background text-foreground flame-bg dark">
            <SkipLink href="#main-content">Skip to main content</SkipLink>
            <Toaster />
            <Router />
            <Suspense fallback={null}>
              <AIChat />
              <OnboardingTour />
              <KeyboardShortcutsProvider />
              <KeyboardShortcutsModal />
            </Suspense>
          </div>
        </TooltipProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
