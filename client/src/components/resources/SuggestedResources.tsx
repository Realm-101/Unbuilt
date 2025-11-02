import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Lightbulb, ChevronRight, AlertCircle } from "lucide-react";
import { InlineResourceCard } from "./InlineResourceCard";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import type { Resource } from "@shared/schema";

export interface SuggestedResourcesProps {
  stepId: string;
  phase: string;
  stepDescription: string;
  ideaType?: string;
  analysisId?: string;
  maxResources?: number;
  className?: string;
}

interface ResourceWithCategory extends Resource {
  category?: {
    id: number;
    name: string;
    icon?: string;
  };
  tags?: Array<{
    id: number;
    name: string;
  }>;
}

/**
 * SuggestedResources - Display contextually relevant resources for action plan steps
 * 
 * Features:
 * - Fetch suggestions based on step context
 * - Display up to 3 inline resource cards
 * - Show loading skeleton during fetch
 * - Handle empty state (no suggestions)
 * - Provide "Show more" link to filtered library
 * 
 * Requirements: 1
 */
export const SuggestedResources: React.FC<SuggestedResourcesProps> = ({
  stepId,
  phase,
  stepDescription,
  ideaType = 'software',
  analysisId,
  maxResources = 3,
  className,
}) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [bookmarkedIds, setBookmarkedIds] = React.useState<Set<number>>(new Set());
  
  // Fetch suggested resources
  const { data, isLoading, error } = useQuery({
    queryKey: ['resource-suggestions', 'step', stepId, phase, ideaType],
    queryFn: async () => {
      const params = new URLSearchParams({
        phase,
        description: stepDescription,
        ...(ideaType && { ideaType }),
      });
      
      const response = await fetch(`/api/resources/suggestions/step/${stepId}?${params}`, {
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch resource suggestions');
      }
      
      const result = await response.json();
      return result.resources as ResourceWithCategory[];
    },
    staleTime: 60 * 60 * 1000, // 1 hour
    retry: 1,
  });
  
  // Note: Tracking is now handled by InlineResourceCard via useResourceTracking hook
  // This keeps tracking logic centralized and consistent
  
  // Bookmark resource
  const bookmarkMutation = useMutation({
    mutationFn: async (resourceId: number) => {
      const isBookmarked = bookmarkedIds.has(resourceId);
      
      if (isBookmarked) {
        // Remove bookmark
        const response = await fetch(`/api/resources/${resourceId}/bookmark`, {
          method: 'DELETE',
          credentials: 'include',
        });
        
        if (!response.ok) {
          throw new Error('Failed to remove bookmark');
        }
        
        return { resourceId, action: 'removed' as const };
      } else {
        // Add bookmark
        const response = await fetch(`/api/resources/${resourceId}/bookmark`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({}),
        });
        
        if (!response.ok) {
          throw new Error('Failed to add bookmark');
        }
        
        return { resourceId, action: 'added' as const };
      }
    },
    onSuccess: ({ resourceId, action }) => {
      // Update local state
      setBookmarkedIds(prev => {
        const newSet = new Set(prev);
        if (action === 'added') {
          newSet.add(resourceId);
        } else {
          newSet.delete(resourceId);
        }
        return newSet;
      });
      
      // Invalidate bookmarks query
      queryClient.invalidateQueries({ queryKey: ['user-bookmarks'] });
      
      toast({
        title: action === 'added' ? "Bookmark added" : "Bookmark removed",
        description: action === 'added' 
          ? "Resource saved to your collection" 
          : "Resource removed from your collection",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update bookmark. Please try again.",
        variant: "destructive",
      });
    },
  });
  
  // Note: View tracking is now handled by InlineResourceCard
  
  // Handle bookmark toggle
  const handleBookmark = (resourceId: number) => {
    bookmarkMutation.mutate(resourceId);
  };
  
  // Handle show more
  const handleShowMore = () => {
    // Navigate to resource library with filters
    const params = new URLSearchParams({
      phase,
      ...(ideaType && { ideaType }),
    });
    
    window.open(`/resources?${params}`, '_blank', 'noopener,noreferrer');
  };
  
  // Loading skeleton
  if (isLoading) {
    return (
      <div className={cn("space-y-3", className)}>
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Finding relevant resources...</span>
        </div>
        <div className="grid gap-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-32 rounded-lg bg-gray-800/50 animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }
  
  // Error state
  if (error) {
    return (
      <div className={cn("space-y-3", className)}>
        <div className="flex items-center gap-2 p-3 rounded-lg bg-red-900/20 border border-red-500/30">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
          <p className="text-sm text-red-400">
            Failed to load resource suggestions. Please try again later.
          </p>
        </div>
      </div>
    );
  }
  
  // Empty state
  if (!data || data.length === 0) {
    return (
      <div className={cn("space-y-3", className)}>
        <div className="flex items-center gap-2 p-3 rounded-lg bg-gray-800/50 border border-gray-700">
          <Lightbulb className="w-4 h-4 text-gray-400 shrink-0" />
          <p className="text-sm text-gray-400">
            No specific resources found for this step. Check out our full library for more options.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleShowMore}
          className="w-full sm:w-auto text-purple-400 border-purple-500/30 hover:bg-purple-500/10"
        >
          Browse Resource Library
          <ChevronRight className="w-4 h-4 ml-1" />
        </Button>
      </div>
    );
  }
  
  // Display resources
  const displayResources = data.slice(0, maxResources);
  
  return (
    <div className={cn("space-y-3", className)}>
      {/* Header */}
      <div className="flex items-center gap-2 text-sm text-gray-400">
        <Lightbulb className="w-4 h-4 text-purple-400" />
        <span>Suggested resources for this step</span>
      </div>
      
      {/* Resource cards */}
      <div className="grid gap-3">
        {displayResources.map((resource) => (
          <InlineResourceCard
            key={resource.id}
            resource={resource}
            analysisId={analysisId ? parseInt(analysisId) : undefined}
            stepId={stepId}
            onBookmark={handleBookmark}
            isBookmarked={bookmarkedIds.has(resource.id)}
          />
        ))}
      </div>
      
      {/* Show more link */}
      {data.length > maxResources && (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleShowMore}
          className="w-full text-purple-400 hover:text-purple-300 hover:bg-purple-500/10"
        >
          Show {data.length - maxResources} more resources
          <ChevronRight className="w-4 h-4 ml-1" />
        </Button>
      )}
      
      {/* Browse library link */}
      {data.length <= maxResources && (
        <Button
          variant="outline"
          size="sm"
          onClick={handleShowMore}
          className="w-full sm:w-auto text-purple-400 border-purple-500/30 hover:bg-purple-500/10"
        >
          Browse all {phase} resources
          <ChevronRight className="w-4 h-4 ml-1" />
        </Button>
      )}
    </div>
  );
};
