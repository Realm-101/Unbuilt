import React from "react";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * ResourceCardSkeleton Component
 * 
 * Skeleton loading state for ResourceCard
 * Provides visual feedback while resources are loading
 * 
 * Requirements: All (Performance)
 */
export const ResourceCardSkeleton: React.FC = () => {
  return (
    <Card className="flex flex-col h-full bg-gray-900/50 border-gray-700">
      <CardHeader className="pb-3">
        {/* Badges skeleton */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <Skeleton className="h-5 w-16 bg-gray-800" />
            <Skeleton className="h-5 w-20 bg-gray-800" />
          </div>
          <Skeleton className="h-8 w-8 rounded-full bg-gray-800" />
        </div>
        
        {/* Title skeleton */}
        <Skeleton className="h-6 w-full bg-gray-800 mb-2" />
        <Skeleton className="h-6 w-3/4 bg-gray-800" />
      </CardHeader>
      
      <CardContent className="flex-1 pb-3">
        {/* Description skeleton */}
        <div className="space-y-2 mb-3">
          <Skeleton className="h-4 w-full bg-gray-800" />
          <Skeleton className="h-4 w-full bg-gray-800" />
          <Skeleton className="h-4 w-2/3 bg-gray-800" />
        </div>
        
        {/* Phase tags skeleton */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          <Skeleton className="h-5 w-20 bg-gray-800" />
          <Skeleton className="h-5 w-24 bg-gray-800" />
        </div>
        
        {/* Metadata skeleton */}
        <div className="flex items-center gap-3">
          <Skeleton className="h-4 w-16 bg-gray-800" />
          <Skeleton className="h-4 w-12 bg-gray-800" />
        </div>
      </CardContent>
      
      <CardFooter className="pt-3 border-t border-gray-800">
        <div className="flex items-center justify-end gap-2 w-full">
          <Skeleton className="h-8 w-24 bg-gray-800" />
        </div>
      </CardFooter>
    </Card>
  );
};

/**
 * ResourceGridSkeleton Component
 * 
 * Grid of skeleton cards for initial loading state
 */
export const ResourceGridSkeleton: React.FC<{ count?: number }> = ({ count = 6 }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <ResourceCardSkeleton key={i} />
      ))}
    </div>
  );
};

