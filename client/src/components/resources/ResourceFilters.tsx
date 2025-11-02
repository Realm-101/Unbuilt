import React, { useState, useEffect } from "react";
import { Filter, X, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { cn } from "@/lib/utils";

export interface ResourceFilterValues {
  categories: number[];
  phases: string[];
  ideaTypes: string[];
  resourceTypes: string[];
  minRating: number;
  isPremium: boolean | null;
}

import type { ResourceCategory } from "@shared/schema";

interface ResourceFiltersProps {
  filters: ResourceFilterValues;
  onFiltersChange: (filters: ResourceFilterValues) => void;
  categories?: ResourceCategory[];
  className?: string;
}

const PHASES = [
  { value: "research", label: "Research" },
  { value: "validation", label: "Validation" },
  { value: "development", label: "Development" },
  { value: "launch", label: "Launch" }
];

const IDEA_TYPES = [
  { value: "software", label: "Software" },
  { value: "physical_product", label: "Physical Product" },
  { value: "service", label: "Service" },
  { value: "marketplace", label: "Marketplace" }
];

const RESOURCE_TYPES = [
  { value: "tool", label: "Tool" },
  { value: "template", label: "Template" },
  { value: "guide", label: "Guide" },
  { value: "video", label: "Video" },
  { value: "article", label: "Article" }
];

/**
 * ResourceFilters Component
 * 
 * Features:
 * - Add category filter (multi-select)
 * - Add phase filter (multi-select)
 * - Add idea type filter (multi-select)
 * - Add resource type filter (multi-select)
 * - Add minimum rating filter
 * - Add premium filter toggle
 * - Update URL params on filter change
 * 
 * Requirements: 10
 */
export function ResourceFilters({
  filters,
  onFiltersChange,
  categories = [],
  className
}: ResourceFiltersProps) {
  const [isOpen, setIsOpen] = useState(false);
  
  // Update URL params when filters change
  useEffect(() => {
    const params = new URLSearchParams();
    
    if (filters.categories.length > 0) {
      filters.categories.forEach(cat => params.append("category", cat.toString()));
    }
    
    if (filters.phases.length > 0) {
      filters.phases.forEach(phase => params.append("phase", phase));
    }
    
    if (filters.ideaTypes.length > 0) {
      filters.ideaTypes.forEach(type => params.append("ideaType", type));
    }
    
    if (filters.resourceTypes.length > 0) {
      filters.resourceTypes.forEach(type => params.append("type", type));
    }
    
    if (filters.minRating > 0) {
      params.set("minRating", filters.minRating.toString());
    }
    
    if (filters.isPremium !== null) {
      params.set("isPremium", filters.isPremium.toString());
    }
    
    // Update URL without reloading
    const newUrl = params.toString() 
      ? `${window.location.pathname}?${params.toString()}`
      : window.location.pathname;
    
    window.history.replaceState({}, "", newUrl);
  }, [filters]);
  
  // Toggle category filter
  const toggleCategory = (categoryId: number) => {
    const newCategories = filters.categories.includes(categoryId)
      ? filters.categories.filter(id => id !== categoryId)
      : [...filters.categories, categoryId];
    
    onFiltersChange({ ...filters, categories: newCategories });
  };
  
  // Toggle phase filter
  const togglePhase = (phase: string) => {
    const newPhases = filters.phases.includes(phase)
      ? filters.phases.filter(p => p !== phase)
      : [...filters.phases, phase];
    
    onFiltersChange({ ...filters, phases: newPhases });
  };
  
  // Toggle idea type filter
  const toggleIdeaType = (ideaType: string) => {
    const newIdeaTypes = filters.ideaTypes.includes(ideaType)
      ? filters.ideaTypes.filter(t => t !== ideaType)
      : [...filters.ideaTypes, ideaType];
    
    onFiltersChange({ ...filters, ideaTypes: newIdeaTypes });
  };
  
  // Toggle resource type filter
  const toggleResourceType = (resourceType: string) => {
    const newResourceTypes = filters.resourceTypes.includes(resourceType)
      ? filters.resourceTypes.filter(t => t !== resourceType)
      : [...filters.resourceTypes, resourceType];
    
    onFiltersChange({ ...filters, resourceTypes: newResourceTypes });
  };
  
  // Update minimum rating
  const updateMinRating = (value: number[]) => {
    onFiltersChange({ ...filters, minRating: value[0] });
  };
  
  // Toggle premium filter
  const togglePremium = (checked: boolean) => {
    onFiltersChange({ ...filters, isPremium: checked ? true : null });
  };
  
  // Clear all filters
  const clearFilters = () => {
    onFiltersChange({
      categories: [],
      phases: [],
      ideaTypes: [],
      resourceTypes: [],
      minRating: 0,
      isPremium: null
    });
  };
  
  // Count active filters
  const activeFilterCount = 
    filters.categories.length +
    filters.phases.length +
    filters.ideaTypes.length +
    filters.resourceTypes.length +
    (filters.minRating > 0 ? 1 : 0) +
    (filters.isPremium !== null ? 1 : 0);
  
  const hasActiveFilters = activeFilterCount > 0;
  
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "bg-gray-800 border-gray-700 text-white hover:bg-gray-700",
              hasActiveFilters && "border-purple-500/50"
            )}
          >
            <Filter className="w-4 h-4 mr-2" />
            Filters
            {hasActiveFilters && (
              <Badge 
                variant="secondary" 
                className="ml-2 bg-purple-500 text-white"
              >
                {activeFilterCount}
              </Badge>
            )}
            <ChevronDown className="w-4 h-4 ml-2" />
          </Button>
        </PopoverTrigger>
        <PopoverContent 
          className="w-80 bg-gray-900 border-gray-800 text-white p-0"
          align="start"
        >
          <div className="p-4 border-b border-gray-800 flex items-center justify-between">
            <h3 className="font-semibold">Filters</h3>
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="text-gray-400 hover:text-white h-auto p-1"
              >
                <X className="w-4 h-4 mr-1" />
                Clear all
              </Button>
            )}
          </div>
          
          <div className="max-h-[500px] overflow-y-auto">
            <Accordion type="multiple" className="w-full">
              {/* Category filter */}
              {categories.length > 0 && (
                <AccordionItem value="categories" className="border-gray-800">
                  <AccordionTrigger className="px-4 py-3 hover:bg-gray-800/50">
                    <div className="flex items-center justify-between w-full">
                      <span>Category</span>
                      {filters.categories.length > 0 && (
                        <Badge variant="secondary" className="bg-purple-500/20 text-purple-400">
                          {filters.categories.length}
                        </Badge>
                      )}
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-4 pb-3">
                    <div className="space-y-2">
                      {categories.map(category => (
                        <div key={category.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={`category-${category.id}`}
                            checked={filters.categories.includes(category.id)}
                            onCheckedChange={() => toggleCategory(category.id)}
                          />
                          <Label
                            htmlFor={`category-${category.id}`}
                            className="text-sm font-normal cursor-pointer flex-1"
                          >
                            {category.name}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              )}
              
              {/* Phase filter */}
              <AccordionItem value="phases" className="border-gray-800">
                <AccordionTrigger className="px-4 py-3 hover:bg-gray-800/50">
                  <div className="flex items-center justify-between w-full">
                    <span>Phase</span>
                    {filters.phases.length > 0 && (
                      <Badge variant="secondary" className="bg-purple-500/20 text-purple-400">
                        {filters.phases.length}
                      </Badge>
                    )}
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-3">
                  <div className="space-y-2">
                    {PHASES.map(phase => (
                      <div key={phase.value} className="flex items-center space-x-2">
                        <Checkbox
                          id={`phase-${phase.value}`}
                          checked={filters.phases.includes(phase.value)}
                          onCheckedChange={() => togglePhase(phase.value)}
                        />
                        <Label
                          htmlFor={`phase-${phase.value}`}
                          className="text-sm font-normal cursor-pointer flex-1"
                        >
                          {phase.label}
                        </Label>
                      </div>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
              
              {/* Idea type filter */}
              <AccordionItem value="ideaTypes" className="border-gray-800">
                <AccordionTrigger className="px-4 py-3 hover:bg-gray-800/50">
                  <div className="flex items-center justify-between w-full">
                    <span>Idea Type</span>
                    {filters.ideaTypes.length > 0 && (
                      <Badge variant="secondary" className="bg-purple-500/20 text-purple-400">
                        {filters.ideaTypes.length}
                      </Badge>
                    )}
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-3">
                  <div className="space-y-2">
                    {IDEA_TYPES.map(type => (
                      <div key={type.value} className="flex items-center space-x-2">
                        <Checkbox
                          id={`ideaType-${type.value}`}
                          checked={filters.ideaTypes.includes(type.value)}
                          onCheckedChange={() => toggleIdeaType(type.value)}
                        />
                        <Label
                          htmlFor={`ideaType-${type.value}`}
                          className="text-sm font-normal cursor-pointer flex-1"
                        >
                          {type.label}
                        </Label>
                      </div>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
              
              {/* Resource type filter */}
              <AccordionItem value="resourceTypes" className="border-gray-800">
                <AccordionTrigger className="px-4 py-3 hover:bg-gray-800/50">
                  <div className="flex items-center justify-between w-full">
                    <span>Resource Type</span>
                    {filters.resourceTypes.length > 0 && (
                      <Badge variant="secondary" className="bg-purple-500/20 text-purple-400">
                        {filters.resourceTypes.length}
                      </Badge>
                    )}
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-3">
                  <div className="space-y-2">
                    {RESOURCE_TYPES.map(type => (
                      <div key={type.value} className="flex items-center space-x-2">
                        <Checkbox
                          id={`resourceType-${type.value}`}
                          checked={filters.resourceTypes.includes(type.value)}
                          onCheckedChange={() => toggleResourceType(type.value)}
                        />
                        <Label
                          htmlFor={`resourceType-${type.value}`}
                          className="text-sm font-normal cursor-pointer flex-1"
                        >
                          {type.label}
                        </Label>
                      </div>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
              
              {/* Minimum rating filter */}
              <AccordionItem value="rating" className="border-gray-800">
                <AccordionTrigger className="px-4 py-3 hover:bg-gray-800/50">
                  <div className="flex items-center justify-between w-full">
                    <span>Minimum Rating</span>
                    {filters.minRating > 0 && (
                      <Badge variant="secondary" className="bg-purple-500/20 text-purple-400">
                        {filters.minRating}+ ⭐
                      </Badge>
                    )}
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-3">
                  <div className="space-y-4">
                    <Slider
                      value={[filters.minRating]}
                      onValueChange={updateMinRating}
                      min={0}
                      max={5}
                      step={0.5}
                      className="w-full"
                    />
                    <div className="flex items-center justify-between text-xs text-gray-400">
                      <span>Any</span>
                      <span className="text-white font-medium">
                        {filters.minRating > 0 ? `${filters.minRating}+ stars` : "Any rating"}
                      </span>
                      <span>5 stars</span>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
              
              {/* Premium filter */}
              <AccordionItem value="premium" className="border-gray-800 border-b-0">
                <div className="px-4 py-3">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="premium-toggle" className="text-sm font-normal cursor-pointer">
                      Premium Resources Only
                    </Label>
                    <Switch
                      id="premium-toggle"
                      checked={filters.isPremium === true}
                      onCheckedChange={togglePremium}
                    />
                  </div>
                </div>
              </AccordionItem>
            </Accordion>
          </div>
        </PopoverContent>
      </Popover>
      
      {/* Active filter badges */}
      {hasActiveFilters && (
        <div className="flex items-center gap-2 flex-wrap">
          {filters.categories.length > 0 && (
            <Badge variant="outline" className="bg-purple-500/20 text-purple-400 border-purple-500/30">
              {filters.categories.length} {filters.categories.length === 1 ? "category" : "categories"}
            </Badge>
          )}
          {filters.phases.length > 0 && (
            <Badge variant="outline" className="bg-blue-500/20 text-blue-400 border-blue-500/30">
              {filters.phases.length} {filters.phases.length === 1 ? "phase" : "phases"}
            </Badge>
          )}
          {filters.ideaTypes.length > 0 && (
            <Badge variant="outline" className="bg-green-500/20 text-green-400 border-green-500/30">
              {filters.ideaTypes.length} idea {filters.ideaTypes.length === 1 ? "type" : "types"}
            </Badge>
          )}
          {filters.resourceTypes.length > 0 && (
            <Badge variant="outline" className="bg-orange-500/20 text-orange-400 border-orange-500/30">
              {filters.resourceTypes.length} resource {filters.resourceTypes.length === 1 ? "type" : "types"}
            </Badge>
          )}
          {filters.minRating > 0 && (
            <Badge variant="outline" className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
              {filters.minRating}+ ⭐
            </Badge>
          )}
          {filters.isPremium && (
            <Badge variant="outline" className="bg-purple-500/20 text-purple-400 border-purple-500/30">
              Premium
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}
