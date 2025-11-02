import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRoute, useLocation } from "wouter";
import { 
  Loader2, 
  ExternalLink, 
  Download, 
  Share2, 
  ArrowLeft,
  Clock,
  TrendingUp,
  Star,
  BookOpen
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useResourceTracking } from "@/hooks/useResourceTracking";
import { BookmarkButton } from "@/components/resources/BookmarkButton";
import { ResourceRating } from "@/components/resources/ResourceRating";
import { ReviewList } from "@/components/resources/ReviewList";
import { ResourceCard } from "@/components/resources/ResourceCard";
import { TemplateGenerationDialog } from "@/components/resources/TemplateGenerationDialog";
import type { Resource, ResourceCategory, ResourceRating as ResourceRatingType } from "@shared/schema";

interface ResourceDetailResponse {
  success: boolean;
  data: {
    resource: Resource & {
      category?: ResourceCategory;
      tags?: Array<{ id: number; name: string }>;
    };
    relatedResources: Array<Resource & {
      category?: ResourceCategory;
      tags?: Array<{ id: number; name: string }>;
    }>;
    userBookmark?: {
      id: number;
      notes: string | null;
      customTags: string[];
    };
    userRating?: ResourceRatingType;
  };
}

/**
 * ResourceDetail Page Component
 * 
 * Detailed view of a single resource
 * 
 * Features:
 * - Display full resource information
 * - Show related resources
 * - Include rating and review section
 * - Add bookmark and share buttons
 * - Track page views
 * 
 * Requirements: 1, 6, 7
 */
export default function ResourceDetail() {
  const [, params] = useRoute("/resources/:id");
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { trackView, trackExternalLink, trackDownload } = useResourceTracking();
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  
  const resourceId = params?.id ? parseInt(params.id, 10) : null;
  
  // Fetch resource details
  const { data, isLoading, error } = useQuery<ResourceDetailResponse>({
    queryKey: ["/api/resources", resourceId],
    queryFn: async () => {
      if (!resourceId) throw new Error("Invalid resource ID");
      
      const response = await fetch(`/api/resources/${resourceId}`, {
        credentials: "include",
      });
      
      if (!response.ok) {
        throw new Error("Failed to fetch resource");
      }
      
      return response.json();
    },
    enabled: !!resourceId,
  });
  
  // Track view on mount
  useEffect(() => {
    if (resourceId) {
      trackView(resourceId);
    }
  }, [resourceId, trackView]);
  
  // Bookmark mutation
  const bookmarkMutation = useMutation({
    mutationFn: async ({ resourceId, isBookmarked }: { resourceId: number; isBookmarked: boolean }) => {
      const method = isBookmarked ? "POST" : "DELETE";
      const response = await fetch(`/api/resources/${resourceId}/bookmark`, {
        method,
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });
      
      if (!response.ok) {
        throw new Error("Failed to update bookmark");
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/resources", resourceId] });
    },
  });
  
  // Handle bookmark toggle
  const handleBookmarkToggle = async (resourceId: number, isBookmarked: boolean) => {
    await bookmarkMutation.mutateAsync({ resourceId, isBookmarked });
  };
  
  // Handle external link
  const handleExternalLink = () => {
    if (resource) {
      trackExternalLink(resource.id);
      window.open(resource.url, '_blank', 'noopener,noreferrer');
    }
  };
  
  // Handle template generation
  const handleGenerateTemplate = () => {
    setShowTemplateDialog(true);
  };
  
  // Handle template generated callback
  const handleTemplateGenerated = async (format: 'docx' | 'pdf' | 'gdocs') => {
    if (resource) {
      trackDownload(resource.id);
      toast({
        title: "Template Generated",
        description: `Your ${format.toUpperCase()} template has been generated successfully.`,
      });
    }
  };
  
  // Handle share
  const handleShare = async () => {
    const url = window.location.href;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: resource?.title,
          text: resource?.description,
          url,
        });
      } catch (error) {
        // User cancelled or error occurred
        console.error("Share failed:", error);
      }
    } else {
      // Fallback: copy to clipboard
      try {
        await navigator.clipboard.writeText(url);
        toast({
          title: "Link copied",
          description: "Resource link copied to clipboard",
          duration: 2000,
        });
      } catch (error) {
        toast({
          title: "Failed to copy",
          description: "Could not copy link to clipboard",
          variant: "destructive",
          duration: 3000,
        });
      }
    }
  };
  
  if (!resourceId) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-black flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 mb-4">Invalid resource ID</p>
          <Button variant="outline" onClick={() => setLocation("/resources")}>
            Back to Resources
          </Button>
        </div>
      </div>
    );
  }
  
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-black flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
      </div>
    );
  }
  
  if (error || !data?.success) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-black flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 mb-4">Failed to load resource</p>
          <Button variant="outline" onClick={() => setLocation("/resources")}>
            Back to Resources
          </Button>
        </div>
      </div>
    );
  }
  
  const { resource, relatedResources, userBookmark, userRating } = data.data;
  const isBookmarked = !!userBookmark;
  const isTemplate = resource.resourceType === 'template';
  
  // Format rating
  const displayRating = (resource.averageRating / 100).toFixed(1);
  const ratingStars = Math.round(resource.averageRating / 100);
  
  // Get phases array
  const phases = Array.isArray(resource.phaseRelevance) ? resource.phaseRelevance : [];
  
  // Get resource type badge
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
  
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-black">
      <div className="container mx-auto px-4 py-6 sm:py-8 max-w-7xl">
        {/* Breadcrumbs */}
        <Breadcrumb className="mb-6">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/dashboard" className="text-gray-400 hover:text-white">
                Dashboard
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink href="/resources" className="text-gray-400 hover:text-white">
                Resources
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage className="text-white line-clamp-1">
                {resource.title}
              </BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        
        {/* Back button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setLocation("/resources")}
          className="mb-6 text-gray-400 hover:text-white"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Resources
        </Button>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Resource header */}
            <Card className="bg-gray-900/50 border-gray-700">
              <CardHeader>
                <div className="flex flex-wrap items-center gap-2 mb-4">
                  <Badge variant="outline" className={cn("text-xs", typeBadge.className)}>
                    {typeBadge.label}
                  </Badge>
                  
                  {resource.category && (
                    <Badge variant="outline" className="text-xs bg-gray-800/50 text-gray-400 border-gray-600">
                      {resource.category.name}
                    </Badge>
                  )}
                  
                  {resource.isPremium && (
                    <Badge variant="outline" className="text-xs bg-gradient-to-r from-purple-500/20 to-blue-500/20 text-purple-400 border-purple-500/30">
                      Pro
                    </Badge>
                  )}
                  
                  {phases.map((phase) => (
                    <Badge
                      key={phase}
                      variant="outline"
                      className="text-xs capitalize bg-blue-500/10 text-blue-400 border-blue-500/20"
                    >
                      {phase}
                    </Badge>
                  ))}
                </div>
                
                <CardTitle className="text-2xl sm:text-3xl text-white mb-4">
                  {resource.title}
                </CardTitle>
                
                {/* Metadata */}
                <div className="flex flex-wrap items-center gap-4 text-sm text-gray-400">
                  {resource.ratingCount > 0 && (
                    <div className="flex items-center gap-1.5">
                      <div className="flex items-center">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            className={cn(
                              "w-4 h-4",
                              i < ratingStars
                                ? "fill-yellow-500 text-yellow-500"
                                : "text-gray-600"
                            )}
                          />
                        ))}
                      </div>
                      <span className="text-white font-medium">{displayRating}</span>
                      <span>({resource.ratingCount} {resource.ratingCount === 1 ? 'rating' : 'ratings'})</span>
                    </div>
                  )}
                  
                  {resource.viewCount > 0 && (
                    <div className="flex items-center gap-1.5">
                      <TrendingUp className="w-4 h-4" />
                      <span>{resource.viewCount} views</span>
                    </div>
                  )}
                  
                  {resource.estimatedTimeMinutes && (
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-4 h-4" />
                      <span>{resource.estimatedTimeMinutes} minutes</span>
                    </div>
                  )}
                </div>
              </CardHeader>
              
              <CardContent>
                <p className="text-gray-300 text-base leading-relaxed mb-6">
                  {resource.description}
                </p>
                
                {/* Action buttons */}
                <div className="flex flex-wrap items-center gap-3">
                  <Button
                    onClick={handleExternalLink}
                    className="bg-purple-500 hover:bg-purple-600 text-white"
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Open Resource
                  </Button>
                  
                  {isTemplate && (
                    <Button
                      onClick={handleGenerateTemplate}
                      variant="outline"
                      className="text-green-400 hover:text-green-300 hover:bg-green-500/10 border-green-500/30"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Generate Template
                    </Button>
                  )}
                  
                  <BookmarkButton
                    resourceId={resource.id}
                    isBookmarked={isBookmarked}
                    bookmarkCount={resource.bookmarkCount}
                    onToggle={handleBookmarkToggle}
                    size="md"
                    variant="outline"
                    showCount
                  />
                  
                  <Button
                    onClick={handleShare}
                    variant="outline"
                    size="md"
                  >
                    <Share2 className="w-4 h-4 mr-2" />
                    Share
                  </Button>
                </div>
              </CardContent>
            </Card>
            
            {/* Rating and reviews section */}
            <Card className="bg-gray-900/50 border-gray-700">
              <CardHeader>
                <CardTitle className="text-xl text-white">Ratings & Reviews</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <ResourceRating
                  resourceId={resource.id}
                  currentUserRating={userRating?.rating}
                  currentUserReview={userRating?.review || undefined}
                  averageRating={resource.averageRating / 100}
                  ratingCount={resource.ratingCount}
                />
                
                <Separator className="bg-gray-800" />
                
                <ReviewList resourceId={resource.id} />
              </CardContent>
            </Card>
          </div>
          
          {/* Sidebar */}
          <div className="space-y-6">
            {/* Resource info */}
            <Card className="bg-gray-900/50 border-gray-700">
              <CardHeader>
                <CardTitle className="text-lg text-white">Resource Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {resource.difficultyLevel && (
                  <div>
                    <p className="text-sm text-gray-400 mb-1">Difficulty Level</p>
                    <Badge variant="outline" className="capitalize">
                      {resource.difficultyLevel}
                    </Badge>
                  </div>
                )}
                
                {resource.tags && resource.tags.length > 0 && (
                  <div>
                    <p className="text-sm text-gray-400 mb-2">Tags</p>
                    <div className="flex flex-wrap gap-1.5">
                      {resource.tags.map((tag) => (
                        <Badge
                          key={tag.id}
                          variant="outline"
                          className="text-xs bg-gray-800/50 text-gray-400 border-gray-600"
                        >
                          {tag.name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
            
            {/* Related resources */}
            {relatedResources.length > 0 && (
              <Card className="bg-gray-900/50 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-lg text-white flex items-center gap-2">
                    <BookOpen className="w-5 h-5" />
                    Related Resources
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {relatedResources.slice(0, 3).map((relatedResource) => (
                    <div
                      key={relatedResource.id}
                      className="p-3 rounded-lg border border-gray-800 hover:border-purple-500/50 transition-colors cursor-pointer"
                      onClick={() => setLocation(`/resources/${relatedResource.id}`)}
                    >
                      <h4 className="text-sm font-semibold text-white mb-1 line-clamp-2">
                        {relatedResource.title}
                      </h4>
                      <p className="text-xs text-gray-400 line-clamp-2">
                        {relatedResource.description}
                      </p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
      
      {/* Template Generation Dialog */}
      {isTemplate && resource && (
        <TemplateGenerationDialog
          open={showTemplateDialog}
          onOpenChange={setShowTemplateDialog}
          resourceId={resource.id}
          resourceTitle={resource.title}
          analysisId={undefined} // TODO: Get from context or URL params
          onGenerate={handleTemplateGenerated}
        />
      )}
    </div>
  );
}
