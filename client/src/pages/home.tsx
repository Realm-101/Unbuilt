import React, { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Clock, Crown, Zap, Target, Lightbulb } from "lucide-react";
import Layout from "@/components/layout-new";
import PremiumSearchBar from "@/components/premium-search-bar";
import LoadingModal from "@/components/loading-modal";
import FreeTrialModal from "@/components/free-trial-modal";
import UsageTracker from "@/components/usage-tracker";
import { SearchFilters as SearchFiltersComponent, type SearchFilters } from "@/components/search/SearchFilters";
import { UpgradePrompt } from "@/components/tier";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import type { Search } from "@shared/schema";

interface UsageStats {
  searchesUsed: number;
  searchesLimit: number;
  periodEnd: string;
}

export default function Home() {
  const [, setLocation] = useLocation();
  const [isSearching, setIsSearching] = useState(false);
  const [showTrialModal, setShowTrialModal] = useState(false);
  const [searchFilters, setSearchFilters] = useState<SearchFilters | null>(null);
  const [totalResults, setTotalResults] = useState<number | undefined>(undefined);
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);
  const { user } = useAuth();

  // If user is not authenticated, return null (App.tsx handles routing)
  if (!user) {
    return null;
  }

  const { data: recentSearches } = useQuery({
    queryKey: ["/api/searches"],
    select: (response: any) => {
      // Unwrap response - server returns { success, data }
      const searches = response?.data || response || [];
      return Array.isArray(searches) ? searches.slice(0, 5) : [];
    },
  });

  // Fetch usage stats for free tier users
  const { data: usageStats } = useQuery<UsageStats>({
    queryKey: ['/api/user/usage'],
    enabled: !!user && (user as any).plan === 'free',
  });

  // Show upgrade prompt when approaching limit
  useEffect(() => {
    if (usageStats && (user as any)?.plan === 'free') {
      const usagePercentage = (usageStats.searchesUsed / usageStats.searchesLimit) * 100;
      if (usagePercentage >= 80) {
        setShowUpgradePrompt(true);
      }
    }
  }, [usageStats, user]);

  const handleSearch = async (query: string) => {
    setIsSearching(true);
    
    try {
      // Only include filters if they exist (not null)
      const requestBody: { query: string; filters?: SearchFilters } = { query };
      if (searchFilters) {
        requestBody.filters = searchFilters;
      }
      
      const response = await apiRequest("POST", "/api/search", requestBody);
      const result = await response.json();
      
      // Check if response is successful
      if (!result.success) {
        throw new Error(result.message || 'Search failed');
      }
      
      const data = result.data;
      
      if (data.upgradeRequired) {
        // Handle upgrade required
        setLocation("/auth/upgrade");
        return;
      }
      
      // Navigate to results page with search ID
      if (data.search && data.search.id) {
        setLocation(`/search/${data.search.id}`);
      } else {
        throw new Error('Invalid search response');
      }
    } catch (error) {
      console.error("Search failed:", error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleStartTrial = () => {
    setShowTrialModal(true);
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
      <div className="relative min-h-screen">
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-12">
          {/* Hero Section */}
          <div className="text-center mb-6 sm:mb-8 lg:mb-12">
            <div className="animate-float mb-6 sm:mb-8">
              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-4 sm:mb-6 px-2">
                <span className="neon-glow">Discover What's</span>
                <br />
                <span className="neon-glow">Still Unbuilt</span>
              </h1>
            </div>
            <p className="text-base sm:text-lg md:text-xl lg:text-2xl text-gray-300 max-w-3xl mx-auto mb-6 sm:mb-8 leading-relaxed px-4">
              Find untapped market opportunities and innovation gaps using AI-powered analysis.
              <br className="hidden sm:block" />
              <span className="text-purple-400">Turn hidden potential into your next big venture.</span>
            </p>
            
            {/* User Status Badge */}
            {user && (
              <div className="flex items-center justify-center mb-6 sm:mb-8 px-4">
                <div className="bg-gray-800 border border-gray-700 px-4 sm:px-6 py-2 sm:py-3 rounded-full">
                  <span className="text-xs sm:text-sm font-medium text-white">
                    Welcome back, <span className="text-purple-400">{(user as any)?.firstName || (user as any)?.email || 'User'}</span>
                  </span>
                  {(user as any)?.plan === 'pro' && (
                    <Crown className="inline w-3 h-3 sm:w-4 sm:h-4 ml-2 text-yellow-500" />
                  )}
                </div>
              </div>
            )}
          </div>
          
          {/* Usage Tracker */}
          <div className="mb-6 sm:mb-8">
            <UsageTracker onUpgrade={handleUpgrade} />
          </div>

          {/* Upgrade Prompt */}
          {showUpgradePrompt && (
            <div className="mb-6 sm:mb-8 max-w-2xl mx-auto">
              <UpgradePrompt
                reason="search-limit"
                onDismiss={() => setShowUpgradePrompt(false)}
              />
            </div>
          )}

          {/* Search with Filters */}
          <div className="mb-6 sm:mb-8">
            <SearchFiltersComponent
              onFiltersChange={setSearchFilters}
              onSearch={handleSearch}
              totalResults={totalResults}
              isLoading={isSearching}
            />
          </div>

          {/* Recent Searches */}
          {recentSearches && recentSearches.length > 0 && (
            <div className="mt-6 sm:mt-8">
              <h2 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6 text-center text-white px-4">
                <span className="text-purple-400">Recent Discoveries</span>
              </h2>
              <div className="grid gap-3 sm:gap-4 max-w-2xl mx-auto">
                {recentSearches.map((search) => (
                  <button
                    key={search.id}
                    onClick={() => setLocation(`/search/${search.id}`)}
                    className="bg-gray-800 border border-gray-700 rounded-lg p-3 sm:p-4 hover:bg-gray-750 transition-all text-white touch-manipulation"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center space-x-2 sm:space-x-3 min-w-0 flex-1">
                        <Clock className="w-4 h-4 text-purple-400 flex-shrink-0" />
                        <span className="font-medium text-sm sm:text-base truncate">{search.query}</span>
                      </div>
                      <span className="text-xs text-gray-400 flex-shrink-0">
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
      
      <FreeTrialModal
        isOpen={showTrialModal}
        onClose={() => setShowTrialModal(false)}
        onSuccess={handleTrialSuccess}
      />
    </Layout>
  );
}
