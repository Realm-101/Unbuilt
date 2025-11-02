import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { useTouchFriendly } from '@/hooks/useTouchFriendly';
import Layout from '@/components/layout-new';
import {
  DashboardLayout,
  RecentSearches,
  Favorites,
  ProjectManager,
  SearchFilters,
  TierIndicator,
  RecommendedResources,
  type SearchFilterOptions,
} from '@/components/dashboard';
import { RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Search } from '@shared/schema';

export default function Dashboard() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { isMobile } = useTouchFriendly();
  const [filters, setFilters] = useState<SearchFilterOptions>({
    sortBy: 'date',
    sortOrder: 'desc',
    dateRange: 'all',
  });

  // Pull-to-refresh functionality for mobile
  const handleRefresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ['/api/searches'] });
    await queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
    await queryClient.invalidateQueries({ queryKey: ['/api/user/preferences'] });
  };

  const { containerRef, isRefreshing, pullDistance, isPulling } = usePullToRefresh({
    onRefresh: handleRefresh,
    enabled: isMobile,
  });

  // If user is not authenticated, return null (App.tsx handles routing)
  if (!user) {
    return null;
  }

  return (
    <Layout>
      <div 
        ref={containerRef}
        className="overflow-y-auto h-full"
        style={{
          transform: isPulling ? `translateY(${pullDistance}px)` : undefined,
          transition: isPulling ? 'none' : 'transform 0.3s ease-out',
        }}
      >
        {/* Pull-to-refresh indicator */}
        {isMobile && (
          <div
            className={cn(
              "flex items-center justify-center py-4 transition-opacity",
              isPulling || isRefreshing ? "opacity-100" : "opacity-0"
            )}
            style={{
              height: pullDistance > 0 ? `${pullDistance}px` : '0px',
            }}
          >
            <RefreshCw 
              className={cn(
                "w-6 h-6 text-purple-400",
                isRefreshing && "animate-spin"
              )}
            />
          </div>
        )}

        <DashboardLayout>
          <div className="space-y-4 sm:space-y-6">
            {/* Tier Indicator - Compact on mobile */}
            <TierIndicator showUsage={true} />

            {/* Search Filters - Collapsible on mobile */}
            <SearchFilters
              onFilterChange={setFilters}
              availableTags={['market', 'technology', 'ux', 'business_model']}
            />

            {/* Recommended Resources - Full width */}
            <RecommendedResources limit={6} showViewAll={true} />

            {/* Responsive Layout - Stack on mobile, two columns on desktop */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
              {/* Left Column */}
              <div className="space-y-4 sm:space-y-6">
                <RecentSearches limit={5} showViewAll={true} />
                <Favorites />
              </div>

              {/* Right Column */}
              <div className="space-y-4 sm:space-y-6">
                <ProjectManager />
              </div>
            </div>
          </div>
        </DashboardLayout>
      </div>
    </Layout>
  );
}
