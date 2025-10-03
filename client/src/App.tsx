import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Home from "@/pages/home";
import Landing from "@/pages/landing";
import About from "@/pages/about";
import Help from "@/pages/help";
import Privacy from "@/pages/privacy";
import Terms from "@/pages/terms";
import SearchResults from "@/pages/search-results";
import SavedResults from "@/pages/saved-results";
import SearchHistory from "@/pages/search-history";
import Trending from "@/pages/trending";
import Login from "@/pages/auth/login";
import Register from "@/pages/auth/register";
import ForgotPassword from "@/pages/auth/forgot-password";
import ResetPassword from "@/pages/auth/reset-password";
import Subscribe from "@/pages/subscribe";
import FreeTrial from "@/pages/free-trial";
import ValidateIdeaPage from "@/pages/validate-idea";
import ActionPlanPage from "@/pages/action-plan";
import MarketResearchPage from "@/pages/market-research";
import MarketTrendsPage from "@/pages/market-trends";
import AnalyticsDashboard from "@/pages/analytics-dashboard";
import NotFound from "@/pages/not-found";
import { Documentation } from "@/pages/documentation";
import { AIChat } from "@/components/ai-assistant/AIChat";
import { useAuth } from "./hooks/useAuth";
import { useEffect } from "react";

function Router() {
  const { isAuthenticated, isLoading, user } = useAuth();
  
  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-purple-950 to-black flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <Switch>
      {isAuthenticated ? (
        <>
          <Route path="/" component={Home} />
          <Route path="/search/:id" component={SearchResults} />
          <Route path="/saved" component={SavedResults} />
          <Route path="/history" component={SearchHistory} />
          <Route path="/trending" component={Trending} />
          <Route path="/subscribe" component={Subscribe} />
          <Route path="/free-trial" component={FreeTrial} />
          <Route path="/validate-idea" component={ValidateIdeaPage} />
          <Route path="/action-plan" component={ActionPlanPage} />
          <Route path="/market-research" component={MarketResearchPage} />
          <Route path="/market-trends" component={MarketTrendsPage} />
          <Route path="/analytics" component={AnalyticsDashboard} />
          <Route path="/documentation" component={Documentation} />
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
          <Route path="/about" component={About} />
          <Route path="/help" component={Help} />
          <Route path="/privacy" component={Privacy} />
          <Route path="/terms" component={Terms} />
        </>
      )}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <div className="min-h-screen bg-background text-foreground flame-bg dark">
          <Toaster />
          <Router />
          <AIChat />
        </div>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
