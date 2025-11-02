import React, { useState, useEffect, useRef } from "react";
import { ExternalLink, Star, Clock, TrendingUp, Download, Bookmark, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useTouchFriendly } from "@/hooks/useTouchFriendly";
import { useResourceTracking } from "@/hooks/useResourceTracking";
import { BookmarkButton } from "./BookmarkButton";
import { TemplateGenerationDialog } from "./TemplateGenerationDialog";
import type { Resource } from "@shared/schema";

import type { ResourceCategory, ResourceTag } from "@shared/schema";

export interface ResourceCardProps {
  resource: Resource & {
    category?: ResourceCategory;
    tags?: ResourceTag[];
  };
  analysisId?: number;
  onView?: (resourceId: number) => void;
  onBookmark?: (resourceId: number, isBookmarked: boolean) => Promise<void>;
  isBookmarked?: boolean;
  className?: string;
}

/**
 * ResourceCard Component
 * 
 * Display resource in a card format for the resource grid
 * 
 * Features:
 * - Display resource thumbnail/icon
 * - Show title, description, category
 * - Display rating stars and count
 * - Add bookmark button
 * - Show phase tags
 * - Add hover effects
 * 
 * Requirements: 1
 */
export const ResourceCard: React.FC<ResourceCardProps> = ({
  resource,
  analysisId,
  onView,
  onBookmark,
  isBookmarked = false,
  className,
}) => {
  const { isTouchDevice } = useTouchFriendly();
  const { trackExternalLink, trackDownload } = useResourceTracking();
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [isPrefetched, setIsPrefetched] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  
  // Intersection Observer for lazy loading
  useEffect(() => {
    if (!cardRef.current) return;
    
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(true);
            observer.disconnect();
          }
        });
      },
      {
        rootMargin: '50px', // Start loading 50px before entering viewport
        threshold: 0.1,
      }
    );
    
    observer.observe(cardRef.current);
    
    return () => observer.disconnect();
  }, []);
  
  // Prefetch on hover (desktop only)
  const handleMouseEnter = () => {
    if (!isTouchDevice && !isPrefetched && isVisible) {
      // Prefetch resource details
      setIsPrefetched(true);
      // Could add actual prefetch logic here if needed
    }
  };
  
  // Format rating (stored as integer 0-500, display as 0.0-5.0)
  const displayRating = (resource.averageRating / 100).toFixed(1);
  const ratingStars = Math.round(resource.averageRating / 100);
  
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
  
  // Get phase badge colors
  const getPhaseBadgeColor = (phase: string) => {
    const colors: Record<string, string> = {
      research: "bg-blue-500/10 text-blue-400 border-blue-500/20",
      validation: "bg-green-500/10 text-green-400 border-green-500/20",
      development: "bg-orange-500/10 text-orange-400 border-orange-500/20",
      launch: "bg-purple-500/10 text-purple-400 border-purple-500/20",
    };
    
    return colors[phase] || "bg-gray-500/10 text-gray-400 border-gray-500/20";
  };
  
  // Handle view action (external link click)
  const handleView = () => {
    // Track the external link click
    trackExternalLink(resource.id, { analysisId });
    
    // Call parent callback if provided
    if (onView) {
      onView(resource.id);
    }
    
    // Open resource URL in new tab
    window.open(resource.url, '_blank', 'noopener,noreferrer');
  };
  
  // Handle template generation
  const handleGenerateTemplate = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowTemplateDialog(true);
  };
  
  // Handle template generation callback
  const handleTemplateGenerated = async (format: 'docx' | 'pdf' | 'gdocs') => {
    // Track the download
    trackDownload(resource.id, { analysisId });
  };
  
  // Handle bookmark toggle
  const handleBookmarkToggle = async (resourceId: number, newIsBookmarked: boolean) => {
    if (onBookmark) {
      await onBookmark(resourceId, newIsBookmarked);
    }
  };
  
  // Get phases array from JSONB
  const phases = Array.isArray(resource.phaseRelevance) ? resource.phaseRelevance : [];
  
  return (
    <Card
      ref={cardRef}
      className={cn(
        "group relative flex flex-col h-full transition-all duration-200",
        "bg-gray-900/50 border-gray-700 hover:border-purple-500/50 hover:bg-gray-900/70",
        "cursor-pointer hover:shadow-lg hover:shadow-purple-500/10",
        !isVisible && "opacity-0",
        className
      )}
      onClick={handleView}
      onMouseEnter={handleMouseEnter}
      role="article"
      aria-label={`Resource: ${resource.title}`}
    >
      <CardHeader className="pb-3">
        {/* Header with badges and bookmark */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex flex-wrap items-center gap-1.5">
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
          {onBookmark && (
            <BookmarkButton
              resourceId={resource.id}
              isBookmarked={isBookmarked}
              bookmarkCount={resource.bookmarkCount}
              onToggle={handleBookmarkToggle}
              size="sm"
              variant="ghost"
            />
          )}
        </div>
        
        {/* Title */}
        <h3 className="text-base sm:text-lg font-semibold text-white line-clamp-2 group-hover:text-purple-400 transition-colors">
          {resource.title}
        </h3>
      </CardHeader>
      
      <CardContent className="flex-1 pb-3">
        {/* Description */}
        <p className="text-sm text-gray-400 line-clamp-3 mb-3">
          {resource.description}
        </p>
        
        {/* Phase tags */}
        {phases.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {phases.slice(0, 3).map((phase) => (
              <Badge
                key={phase}
                variant="outline"
                className={cn("text-xs capitalize", getPhaseBadgeColor(phase))}
              >
                {phase}
              </Badge>
            ))}
            {phases.length > 3 && (
              <Badge
                variant="outline"
                className="text-xs bg-gray-800/50 text-gray-400 border-gray-600"
              >
                +{phases.length - 3}
              </Badge>
            )}
          </div>
        )}
        
        {/* Metadata */}
        <div className="flex items-center gap-3 text-xs text-gray-500">
          {/* Rating */}
          {resource.ratingCount > 0 && (
            <div className="flex items-center gap-1">
              <div className="flex items-center">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className={cn(
                      "w-3 h-3",
                      i < ratingStars
                        ? "fill-yellow-500 text-yellow-500"
                        : "text-gray-600"
                    )}
                  />
                ))}
              </div>
              <span className="text-gray-400">{displayRating}</span>
              <span className="text-gray-500">({resource.ratingCount})</span>
            </div>
          )}
          
          {/* View count */}
          {resource.viewCount > 0 && (
            <div className="flex items-center gap-1">
              <TrendingUp className="w-3 h-3" />
              <span>{resource.viewCount}</span>
            </div>
          )}
          
          {/* Estimated time */}
          {resource.estimatedTimeMinutes && (
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              <span>{resource.estimatedTimeMinutes}m</span>
            </div>
          )}
        </div>
      </CardContent>
      
      <CardFooter className="pt-3 border-t border-gray-800">
        {/* Action buttons */}
        <div className="flex items-center justify-end gap-2 w-full">
          {/* Generate Template button for templates */}
          {isTemplate && (
            <Button
              variant="outline"
              size="sm"
              className={cn(
                "text-xs",
                isTouchDevice && "min-h-[44px]",
                "text-green-400 hover:text-green-300 hover:bg-green-500/10 border-green-500/30"
              )}
              onClick={handleGenerateTemplate}
            >
              <FileText className="w-3.5 h-3.5 mr-1.5" />
              Generate
            </Button>
          )}
          
          {/* View button */}
          <Button
            variant="outline"
            size="sm"
            className={cn(
              "text-xs",
              isTouchDevice && "min-h-[44px]",
              "text-purple-400 hover:text-purple-300 hover:bg-purple-500/10 border-purple-500/30"
            )}
            onClick={handleView}
          >
            View Resource
            <ExternalLink className="w-3.5 h-3.5 ml-1.5" />
          </Button>
        </div>
      </CardFooter>
      
      {/* Template Generation Dialog */}
      {isTemplate && (
        <TemplateGenerationDialog
          open={showTemplateDialog}
          onOpenChange={setShowTemplateDialog}
          resourceId={resource.id}
          resourceTitle={resource.title}
          analysisId={analysisId}
          onGenerate={handleTemplateGenerated}
        />
      )}
    </Card>
  );
};
