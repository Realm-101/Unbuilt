import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation, useRoute } from "wouter";
import { Loader2, BookOpen, Filter as FilterIcon } from "lucide-react";
import { ResourceSearch } from "@/components/resources/ResourceSearch";
import { ResourceFilters, type ResourceFilterValues } from "@/components/resources/ResourceFilters";
import { ResourceCard } from "@/components/resources/ResourceCard";
import { ResourceGridSkeleton } from "@/components/resources/ResourceCardSkeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { cn } from "@/lib/utils";
import type { Resource, ResourceCategory } from "@shared/schema";

import type { ResourceTag } from "@shared/schema";

interface ResourcesResponse {
  success: boolean;
  data: {
    resources: Array<Resource & {
      category?: ResourceCategory;
      tags?: ResourceTag[];
    }>;
    total: number;
    page: number;
    pageSize: number;
  };
}

interface CategoriesResponse {
  success: boolean;
  data: {
    categories: ResourceCategory[];
  };
}

/**
 * ResourceLibrary Page Component
 * 
 * Main page for browsing and discovering resources
 * 
 * Features:
 * - Build page layout with search, filters, grid
 * - Implement responsive design
 * - Add breadcrumbs for navigation
 * - Show active filter chips
 * 
 * Requirements: 10
 */
export default function ResourceLibrary() {
  const [location, setLocation] = useLocation();
  const [, params] = useRoute("/resources/:id");
  const queryClient = useQueryClient();
  
  // Parse URL parameters for initial state
  const urlParams = new URLSearchParams(window.location.search);
  const initialSearch = urlParams.get("q") || "";
  const initialPage = parseInt(urlParams.get("page") || "1", 10);
  
  // State
  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [filters, setFilters] = useState<ResourceFilterValues>({
    categories: urlParams.getAll("category").map(Number).filter(Boolean),
    phases: urlParams.getAll("phase"),
    ideaTypes: urlParams.getAll("ideaType"),
    resourceTypes: urlParams.getAll("type"),
    minRating: parseFloat(urlParams.get("minRating") || "0"),
    isPremium: urlParams.get("isPremium") === "true" ? true : null,
  });
  
  const pageSize = 12;
  
  // Fetch categories
  const { data: categoriesData } = useQuery<CategoriesResponse>({
    queryKey: ["/api/resources/categories"],
  });
  
  // Fetch resources
  const { data: resourcesData, isLoading, error } = useQuery<ResourcesResponse>({
    queryKey: [
      "/api/resources",
      searchQuery,
      currentPage,
      filters.categories,
      filters.phases,
      filters.ideaTypes,
      filters.resourceTypes,
      filters.minRating,
      filters.isPremium,
    ],
    queryFn: async () => {
      const params = new URLSearchParams();
      
      if (searchQuery) params.set("q", searchQuery);
      params.set("page", currentPage.toString());
      params.set("limit", pageSize.toString());
      
      filters.categories.forEach(cat => params.append("category", cat.toString()));
      filters.phases.forEach(phase => params.append("phase", phase));
      filters.ideaTypes.forEach(type => params.append("ideaType", type));
      filters.resourceTypes.forEach(type => params.append("type", type));
      
      if (filters.minRating > 0) {
        params.set("minRating", filters.minRating.toString());
      }
      
      if (filters.isPremium !== null) {
        params.set("isPremium", filters.isPremium.toString());
      }
      
      const response = await fetch(`/api/resources?${params.toString()}`, {
        credentials: "include",
      });
      
      if (!response.ok) {
        throw new Error("Failed to fetch resources");
      }
      
      return response.json();
    },
  });
  
  // Handle search
  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setCurrentPage(1);
  };
  
  // Handle clear search
  const handleClearSearch = () => {
    setSearchQuery("");
    setCurrentPage(1);
  };
  
  // Handle filter change
  const handleFiltersChange = (newFilters: ResourceFilterValues) => {
    setFilters(newFilters);
    setCurrentPage(1);
  };
  
  // Handle page change
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  
  // Remove individual filter
  const removeFilter = (type: keyof ResourceFilterValues, value?: string | number) => {
    const newFilters = { ...filters };
    
    switch (type) {
      case "categories":
        newFilters.categories = newFilters.categories.filter(c => c !== value);
        break;
      case "phases":
        newFilters.phases = newFilters.phases.filter(p => p !== value);
        break;
      case "ideaTypes":
        newFilters.ideaTypes = newFilters.ideaTypes.filter(t => t !== value);
        break;
      case "resourceTypes":
        newFilters.resourceTypes = newFilters.resourceTypes.filter(t => t !== value);
        break;
      case "minRating":
        newFilters.minRating = 0;
        break;
      case "isPremium":
        newFilters.isPremium = null;
        break;
    }
    
    setFilters(newFilters);
    setCurrentPage(1);
  };
  
  // Get category name by ID
  const getCategoryName = (categoryId: number): string => {
    const category = categoriesData?.data.categories.find(c => c.id === categoryId);
    return category?.name || `Category ${categoryId}`;
  };
  
  // Calculate active filter count
  const activeFilterCount = 
    filters.categories.length +
    filters.phases.length +
    filters.ideaTypes.length +
    filters.resourceTypes.length +
    (filters.minRating > 0 ? 1 : 0) +
    (filters.isPremium !== null ? 1 : 0);
  
  const hasActiveFilters = activeFilterCount > 0;
  const hasSearchQuery = searchQuery.trim().length > 0;
  
  const resources = resourcesData?.data.resources || [];
  const total = resourcesData?.data.total || 0;
  const totalPages = Math.ceil(total / pageSize);
  
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
      queryClient.invalidateQueries({ queryKey: ["/api/resources"] });
    },
  });
  
  // Handle bookmark toggle
  const handleBookmarkToggle = async (resourceId: number, isBookmarked: boolean) => {
    await bookmarkMutation.mutateAsync({ resourceId, isBookmarked });
  };
  
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
              <BreadcrumbPage className="text-white">Resource Library</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-lg bg-purple-500/20 border border-purple-500/30">
              <BookOpen className="w-6 h-6 text-purple-400" />
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold text-white">
              Resource Library
            </h1>
          </div>
          <p className="text-gray-400 text-lg">
            Discover tools, templates, and guides to help you build your innovation
          </p>
        </div>
        
        {/* Search and Filters */}
        <div className="mb-6 space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <ResourceSearch
                onSearch={handleSearch}
                onClear={handleClearSearch}
                initialValue={searchQuery}
                placeholder="Search resources by title, description, or tags..."
              />
            </div>
            <ResourceFilters
              filters={filters}
              onFiltersChange={handleFiltersChange}
              categories={categoriesData?.data.categories}
            />
          </div>
          
          {/* Active filter chips */}
          {(hasActiveFilters || hasSearchQuery) && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-gray-400">Active filters:</span>
              
              {hasSearchQuery && (
                <Badge
                  variant="outline"
                  className="bg-purple-500/20 text-purple-400 border-purple-500/30 cursor-pointer hover:bg-purple-500/30"
                  onClick={() => handleClearSearch()}
                >
                  Search: "{searchQuery}"
                  <button className="ml-1.5 hover:text-purple-300">×</button>
                </Badge>
              )}
              
              {filters.categories.map(categoryId => (
                <Badge
                  key={`cat-${categoryId}`}
                  variant="outline"
                  className="bg-blue-500/20 text-blue-400 border-blue-500/30 cursor-pointer hover:bg-blue-500/30"
                  onClick={() => removeFilter("categories", categoryId)}
                >
                  {getCategoryName(categoryId)}
                  <button className="ml-1.5 hover:text-blue-300">×</button>
                </Badge>
              ))}
              
              {filters.phases.map(phase => (
                <Badge
                  key={`phase-${phase}`}
                  variant="outline"
                  className="bg-green-500/20 text-green-400 border-green-500/30 cursor-pointer hover:bg-green-500/30"
                  onClick={() => removeFilter("phases", phase)}
                >
                  {phase}
                  <button className="ml-1.5 hover:text-green-300">×</button>
                </Badge>
              ))}
              
              {filters.ideaTypes.map(type => (
                <Badge
                  key={`idea-${type}`}
                  variant="outline"
                  className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 cursor-pointer hover:bg-yellow-500/30"
                  onClick={() => removeFilter("ideaTypes", type)}
                >
                  {type.replace("_", " ")}
                  <button className="ml-1.5 hover:text-yellow-300">×</button>
                </Badge>
              ))}
              
              {filters.resourceTypes.map(type => (
                <Badge
                  key={`type-${type}`}
                  variant="outline"
                  className="bg-orange-500/20 text-orange-400 border-orange-500/30 cursor-pointer hover:bg-orange-500/30"
                  onClick={() => removeFilter("resourceTypes", type)}
                >
                  {type}
                  <button className="ml-1.5 hover:text-orange-300">×</button>
                </Badge>
              ))}
              
              {filters.minRating > 0 && (
                <Badge
                  variant="outline"
                  className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 cursor-pointer hover:bg-yellow-500/30"
                  onClick={() => removeFilter("minRating")}
                >
                  {filters.minRating}+ ⭐
                  <button className="ml-1.5 hover:text-yellow-300">×</button>
                </Badge>
              )}
              
              {filters.isPremium && (
                <Badge
                  variant="outline"
                  className="bg-purple-500/20 text-purple-400 border-purple-500/30 cursor-pointer hover:bg-purple-500/30"
                  onClick={() => removeFilter("isPremium")}
                >
                  Premium
                  <button className="ml-1.5 hover:text-purple-300">×</button>
                </Badge>
              )}
            </div>
          )}
        </div>
        
        {/* Results count */}
        <div className="mb-4 flex items-center justify-between">
          <p className="text-sm text-gray-400">
            {isLoading ? (
              "Loading resources..."
            ) : (
              <>
                Showing {resources.length > 0 ? ((currentPage - 1) * pageSize) + 1 : 0} - {Math.min(currentPage * pageSize, total)} of {total} resources
              </>
            )}
          </p>
        </div>
        
        {/* Loading state */}
        {isLoading && (
          <ResourceGridSkeleton count={pageSize} />
        )}
        
        {/* Error state */}
        {error && (
          <div className="text-center py-20">
            <p className="text-red-400 mb-4">Failed to load resources</p>
            <Button
              variant="outline"
              onClick={() => window.location.reload()}
            >
              Try Again
            </Button>
          </div>
        )}
        
        {/* Empty state */}
        {!isLoading && !error && resources.length === 0 && (
          <div className="text-center py-20">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-800 mb-4">
              <FilterIcon className="w-8 h-8 text-gray-500" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">
              No resources found
            </h3>
            <p className="text-gray-400 mb-6">
              {hasActiveFilters || hasSearchQuery
                ? "Try adjusting your filters or search query"
                : "No resources available at the moment"}
            </p>
            {(hasActiveFilters || hasSearchQuery) && (
              <Button
                variant="outline"
                onClick={() => {
                  setSearchQuery("");
                  setFilters({
                    categories: [],
                    phases: [],
                    ideaTypes: [],
                    resourceTypes: [],
                    minRating: 0,
                    isPremium: null,
                  });
                  setCurrentPage(1);
                }}
              >
                Clear all filters
              </Button>
            )}
          </div>
        )}
        
        {/* Resource Grid */}
        {!isLoading && !error && resources.length > 0 && (
          <div className="mb-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {resources.map(resource => (
                <ResourceCard
                  key={resource.id}
                  resource={resource}
                  analysisId={undefined}
                  isBookmarked={false}
                  onView={(resourceId) => {
                    setLocation(`/resources/${resourceId}`);
                  }}
                  onBookmark={handleBookmarkToggle}
                />
              ))}
            </div>
          </div>
        )}
        
        {/* Pagination */}
        {!isLoading && !error && totalPages > 1 && (
          <div className="flex items-center justify-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="bg-gray-800 border-gray-700 text-white hover:bg-gray-700"
            >
              Previous
            </Button>
            
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum: number;
                
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }
                
                return (
                  <Button
                    key={pageNum}
                    variant={currentPage === pageNum ? "default" : "outline"}
                    size="sm"
                    onClick={() => handlePageChange(pageNum)}
                    className={cn(
                      currentPage === pageNum
                        ? "bg-purple-500 text-white hover:bg-purple-600"
                        : "bg-gray-800 border-gray-700 text-white hover:bg-gray-700"
                    )}
                  >
                    {pageNum}
                  </Button>
                );
              })}
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="bg-gray-800 border-gray-700 text-white hover:bg-gray-700"
            >
              Next
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
