import React from "react";
import { ExternalLink, Bookmark, Star, Clock, TrendingUp, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useTouchFriendly } from "@/hooks/useTouchFriendly";
import { useResourceTracking } from "@/hooks/useResourceTracking";
import type { Resource } from "@shared/schema";

import type { ResourceCategory, ResourceTag } from "@shared/schema";

export interface InlineResourceCardProps {
  resource: Resource & {
    category?: ResourceCategory;
    tags?: ResourceTag[];
  };
  analysisId?: number;
  stepId?: string;
  onView?: (resourceId: number) => void;
  onBookmark?: (resourceId: number) => void;
  isBookmarked?: boolean;
  className?: string;
}

/**
 * InlineResourceCard - Compact resource card for inline suggestions
 * 
 * Features:
 * - Display resource title, description, category
 * - Add quick actions (view, bookmark)
 * - Show rating and resource type badge
 * - Make responsive for mobile
 * 
 * Requirements: 1
 */
export const InlineResourceCard: React.FC<InlineResourceCardProps> = ({
  resource,
  analysisId,
  stepId,
  onView,
  onBookmark,
  isBookmarked = false,
  className,
}) => {
  const { isTouchDevice } = useTouchFriendly();
  const { trackExternalLink, trackDownload } = useResourceTracking();
  
  // Format rating (stored as integer 0-500, display as 0.0-5.0)
  const displayRating = (resource.averageRating / 100).toFixed(1);
  
  // Get resource type badge color
  const getResourceTypeBadge = (type: string) => {
    const badges: Record<string, { label: string; className: string }> = {
      tool: { label: "Tool", className: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
      template: { label: "Template", className: "bg-purple-500/20 text-purple-400 border-purple-500/30" },
      guide: { label: "Guide", className: "bg-green-500/20 text-green-400 border-green-500/30" },
      video: { label: "Video", className: "bg-red-500/20 text-red-400 border-red-500/30" },
      article: { label: "Article", className: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" },
    };
    
    return badges[type] || badges.article;
  };
  
  const typeBadge = getResourceTypeBadge(resource.resourceType);
  const isTemplate = resource.resourceType === 'template';
  
  // Handle view action (external link click)
  const handleView = () => {
    // Track the external link click
    trackExternalLink(resource.id, { analysisId, stepId });
    
    // Call parent callback if provided
    if (onView) {
      onView(resource.id);
    }
    
    // Open resource URL in new tab
    window.open(resource.url, '_blank', 'noopener,noreferrer');
  };
  
  // Handle template download
  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation();
    
    // Track the download
    trackDownload(resource.id, { analysisId, stepId });
    
    // Open resource URL in new tab (for now, until template generation is implemented)
    window.open(resource.url, '_blank', 'noopener,noreferrer');
  };
  
  // Handle bookmark action
  const handleBookmark = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onBookmark) {
      onBookmark(resource.id);
    }
  };
  
  return (
    <div
      className={cn(
        "group relative flex flex-col gap-2 p-3 sm:p-4 rounded-lg border transition-all duration-200",
        "bg-gray-900/50 border-gray-700 hover:border-purple-500/50 hover:bg-gray-900/70",
        "cursor-pointer",
        className
      )}
      onClick={handleView}
      role="article"
      aria-label={`Resource: ${resource.title}`}
    >
      {/* Header with badges */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          <Badge 
            variant="outline" 
            className={cn("text-xs", typeBadge.className)}
          >
            {typeBadge.label}
          </Badge>
          
          {resource.category && (
            <Badge 
              variant="outline" 
              className="text-xs bg-gray-800/50 text-gray-400 border-gray-600"
            >
              {resource.category.name}
            </Badge>
          )}
          
          {resource.isPremium && (
            <Badge 
              variant="outline" 
              className="text-xs bg-gradient-to-r from-purple-500/20 to-blue-500/20 text-purple-400 border-purple-500/30"
            >
              Pro
            </Badge>
          )}
        </div>
        
        {/* Bookmark button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={handleBookmark}
          className={cn(
            "h-7 w-7 sm:h-8 sm:w-8 p-0 shrink-0",
            isTouchDevice && "min-h-[44px] min-w-[44px]",
            isBookmarked ? "text-purple-400" : "text-gray-500 hover:text-purple-400"
          )}
          aria-label={isBookmarked ? "Remove bookmark" : "Add bookmark"}
        >
          <Bookmark 
            className={cn(
              "w-4 h-4",
              isBookmarked && "fill-current"
            )} 
          />
        </Button>
      </div>
      
      {/* Title */}
      <h4 className="text-sm sm:text-base font-semibold text-white line-clamp-2 group-hover:text-purple-400 transition-colors">
        {resource.title}
      </h4>
      
      {/* Description */}
      <p className="text-xs sm:text-sm text-gray-400 line-clamp-2">
        {resource.description}
      </p>
      
      {/* Footer with metadata */}
      <div className="flex items-center justify-between gap-2 pt-2 border-t border-gray-800">
        <div className="flex items-center gap-3 sm:gap-4 text-xs text-gray-500">
          {/* Rating */}
          {resource.ratingCount > 0 && (
            <div className="flex items-center gap-1">
              <Star className="w-3 h-3 sm:w-3.5 sm:h-3.5 fill-yellow-500 text-yellow-500" />
              <span className="text-gray-400">{displayRating}</span>
              <span className="hidden sm:inline">({resource.ratingCount})</span>
            </div>
          )}
          
          {/* View count */}
          {resource.viewCount > 0 && (
            <div className="flex items-center gap-1">
              <TrendingUp className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              <span>{resource.viewCount}</span>
            </div>
          )}
          
          {/* Estimated time */}
          {resource.estimatedTimeMinutes && (
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              <span>{resource.estimatedTimeMinutes}m</span>
            </div>
          )}
        </div>
        
        {/* Action buttons */}
        <div className="flex items-center gap-1">
          {/* Download button for templates */}
          {isTemplate && (
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "h-7 px-2 sm:h-8 sm:px-3 text-xs",
                isTouchDevice && "min-h-[44px]",
                "text-green-400 hover:text-green-300 hover:bg-green-500/10"
              )}
              onClick={handleDownload}
              title="Download template"
            >
              <Download className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            </Button>
          )}
          
          {/* View button */}
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "h-7 px-2 sm:h-8 sm:px-3 text-xs",
              isTouchDevice && "min-h-[44px]",
              "text-purple-400 hover:text-purple-300 hover:bg-purple-500/10"
            )}
            onClick={handleView}
          >
            <span className="hidden sm:inline">View</span>
            <ExternalLink className="w-3 h-3 sm:w-3.5 sm:h-3.5 sm:ml-1" />
          </Button>
        </div>
      </div>
    </div>
  );
};
