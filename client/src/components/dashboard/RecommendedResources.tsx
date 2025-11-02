import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ResourceCard } from '@/components/resources/ResourceCard';
import { Sparkles, ArrowRight, RefreshCw } from 'lucide-react';
import { Link } from 'wouter';
import type { Resource } from '@shared/schema';

interface RecommendedResourcesProps {
  analysisId?: number;
  limit?: number;
  showViewAll?: boolean;
}

interface RecommendationsResponse {
  recommendations: Resource[];
  count: number;
  context: {
    userId: number;
    analysisId: number | null;
    limit: number;
  };
}

/**
 * RecommendedResources Component
 * 
 * Displays personalized resource recommendations based on user's interaction history
 * and active analyses. Uses the recommendation engine with collaborative filtering,
 * content-based filtering, and popularity-based strategies.
 * 
 * Features:
 * - Personalized recommendations
 * - Context-aware suggestions based on active analysis
 * - Loading states and error handling
 * - Refresh functionality
 * - Link to full resource library
 * 
 * Requirements: 12
 */
export function RecommendedResources({
  analysisId,
  limit = 6,
  showViewAll = true,
}: RecommendedResourcesProps) {
  const { user } = useAuth();

  // Fetch recommendations
  const {
    data,
    isLoading,
    error,
    refetch,
    isRefetching,
  } = useQuery<RecommendationsResponse>({
    queryKey: ['/api/resources/recommendations', { analysisId, limit }],
    enabled: !!user,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
  });

  const recommendations = data?.recommendations || [];

  // Don't show if user is not authenticated
  if (!user) {
    return null;
  }

  return (
    <Card className="border-purple-500/20 bg-gradient-to-br from-gray-900 to-gray-800">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-400" />
            <CardTitle className="text-lg sm:text-xl">Recommended for You</CardTitle>
          </div>
          {!isLoading && recommendations.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => refetch()}
              disabled={isRefetching}
              className="text-purple-400 hover:text-purple-300"
            >
              <RefreshCw className={`w-4 h-4 ${isRefetching ? 'animate-spin' : ''}`} />
            </Button>
          )}
        </div>
        <CardDescription>
          Resources tailored to your interests and current projects
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-5/6" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-8">
            <p className="text-gray-400 mb-4">
              Unable to load recommendations
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              className="border-purple-500/30 text-purple-400 hover:bg-purple-500/10"
            >
              Try Again
            </Button>
          </div>
        ) : recommendations.length === 0 ? (
          <div className="text-center py-8">
            <Sparkles className="w-12 h-12 text-purple-400/50 mx-auto mb-4" />
            <p className="text-gray-400 mb-2">
              No recommendations yet
            </p>
            <p className="text-sm text-gray-500 mb-4">
              Start exploring resources to get personalized suggestions
            </p>
            <Link href="/resources">
              <Button
                variant="outline"
                size="sm"
                className="border-purple-500/30 text-purple-400 hover:bg-purple-500/10"
              >
                Browse Resources
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Display recommendations in grid on larger screens */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {recommendations.slice(0, limit).map((resource) => (
                <ResourceCard
                  key={resource.id}
                  resource={resource}
                  analysisId={analysisId}
                />
              ))}
            </div>

            {/* View All Link */}
            {showViewAll && (
              <div className="pt-4 border-t border-gray-700">
                <Link href="/resources">
                  <Button
                    variant="ghost"
                    className="w-full text-purple-400 hover:text-purple-300 hover:bg-purple-500/10"
                  >
                    View All Resources
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
