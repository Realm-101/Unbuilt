import React, { useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Clock, Crown, Zap, Target, Lightbulb } from "lucide-react";
import Layout from "@/components/layout-new";
import PremiumSearchBar from "@/components/premium-search-bar";
import LoadingModal from "@/components/loading-modal";
import OnboardingTour from "@/components/onboarding-tour";
import FreeTrialModal from "@/components/free-trial-modal";
import UsageTracker from "@/components/usage-tracker";
import { SearchFilters as SearchFiltersComponent, type SearchFilters } from "@/components/search/SearchFilters";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import type { Search } from "@shared/schema";

export default function Home() {
  const [, setLocation] = useLocation();
  const [isSearching, setIsSearching] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showTrialModal, setShowTrialModal] = useState(false);
  const [searchFilters, setSearchFilters] = useState<SearchFilters | null>(null);
  const [totalResults, setTotalResults] = useState<number | undefined>(undefined);
  const { user } = useAuth();
  
  // Simple onboarding tour state management
  const hasSeenTour = localStorage.getItem('unbuilt-tour-completed') === 'true';
  const shouldShowTour = !hasSeenTour;
  
  const markTourAsShown = () => {
    localStorage.setItem('unbuilt-tour-completed', 'true');
  };

  React.useEffect(() => {
    if (shouldShowTour) {
      // Show tour after a brief delay for better UX
      const timer = setTimeout(() => setShowOnboarding(true), 1000);
      return () => clearTimeout(timer);
    }
  }, [shouldShowTour]);

  // If user is not authenticated, return null (App.tsx handles routing)
  if (!user) {
    return null;
  }

  const { data: recentSearches } = useQuery({
    queryKey: ["/api/searches"],
    select: (data: Search[]) => data.slice(0, 5),
  });

  const handleSearch = async (query: string) => {
    setIsSearching(true);
    
    try {
      const response = await apiRequest("POST", "/api/search", { 
        query,
        filters: searchFilters 
      });
      const data = await response.json();
      
      if (data.upgradeRequired) {
        // Handle upgrade required
        setLocation("/auth/upgrade");
        return;
      }
      
      // Navigate to results page with search ID
      setLocation(`/search/${data.search.id}`);
    } catch (error) {
      console.error("Search failed:", error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleStartTrial = () => {
    setShowTrialModal(true);
  };

  const handleCloseTour = () => {
    setShowOnboarding(false);
    markTourAsShown();
  };

  const handleUpgrade = () => {
    setShowTrialModal(true);
  };

  const handleTrialSuccess = () => {
    // Trial activated successfully - user can now search unlimited
    setShowTrialModal(false);
  };

  return (
    <Layout>
      <div className="relative bg-gray-900 min-h-screen">
        {/* Background Effects - Fixed positioning */}
        <div className="fixed inset-0 bg-gradient-to-br from-purple-900/15 via-pink-900/15 to-orange-900/15 pointer-events-none z-0" />
        <div className="fixed inset-0 bg-[radial-gradient(circle_at_30%_70%,rgba(168,85,247,0.08),transparent_50%)] pointer-events-none z-0" />
        
        <div className="relative max-w-6xl mx-auto px-4 py-8 z-10">
          {/* Hero Section */}
          <div className="text-center mb-8">
            <div className="animate-float mb-8">
              <h1 className="text-6xl font-bold mb-6">
                <span className="neon-glow">Discover What's</span>
                <br />
                <span className="neon-glow">Still Unbuilt</span>
              </h1>
            </div>
            <p className="text-2xl text-gray-300 max-w-3xl mx-auto mb-8 leading-relaxed">
              Find untapped market opportunities and innovation gaps using AI-powered analysis.
              <br />
              <span className="text-purple-400">Turn hidden potential into your next big venture.</span>
            </p>
            
            {/* User Status Badge */}
            {user && (
              <div className="flex items-center justify-center space-x-4 mb-8">
                <div className="bg-gray-800 border border-gray-700 px-6 py-3 rounded-full">
                  <span className="text-sm font-medium text-white">
                    Welcome back, <span className="text-purple-400">{(user as any)?.firstName || (user as any)?.email || 'User'}</span>
                  </span>
                  {(user as any)?.plan === 'pro' && (
                    <Crown className="inline w-4 h-4 ml-2 text-yellow-500" />
                  )}
                </div>
              </div>
            )}
          </div>
          
          {/* Usage Tracker */}
          <div className="mb-8">
            <UsageTracker onUpgrade={handleUpgrade} />
          </div>

          {/* Search with Filters */}
          <div className="mb-8">
            <SearchFiltersComponent
              onFiltersChange={setSearchFilters}
              onSearch={handleSearch}
              totalResults={totalResults}
              isLoading={isSearching}
            />
          </div>

          {/* Recent Searches */}
          {recentSearches && recentSearches.length > 0 && (
            <div className="mt-8">
              <h2 className="text-2xl font-bold mb-6 text-center text-white">
                <span className="text-purple-400">Recent Discoveries</span>
              </h2>
              <div className="grid gap-4 max-w-2xl mx-auto">
                {recentSearches.map((search) => (
                  <button
                    key={search.id}
                    onClick={() => setLocation(`/search/${search.id}`)}
                    className="bg-gray-800 border border-gray-700 rounded-lg p-4 hover:bg-gray-750 transition-all text-white"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <Clock className="w-4 h-4 text-purple-400" />
                        <span className="font-medium">{search.query}</span>
                      </div>
                      <span className="text-xs text-gray-400">
                        {new Date(search.timestamp).toLocaleDateString()}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <LoadingModal
        isOpen={isSearching}
        title="Analyzing Market Gaps"
        message="Our AI is exploring untapped opportunities in your search area..."
      />
      
      <OnboardingTour
        isOpen={showOnboarding}
        onClose={handleCloseTour}
        onStartTrial={handleStartTrial}
      />
      
      <FreeTrialModal
        isOpen={showTrialModal}
        onClose={() => setShowTrialModal(false)}
        onSuccess={handleTrialSuccess}
      />
    </Layout>
  );
}
