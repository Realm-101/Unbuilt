import React, { useState } from 'react';
import { Sparkles, X, ChevronDown, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { RecommendationCard } from './RecommendationCard';
import type { Recommendation, RecommendationType, RecommendationPriority } from '@/types/action-plan';

interface RecommendationsSidebarProps {
  recommendations: Recommendation[];
  onDismiss?: (recommendationId: string) => void;
  onApply?: (recommendation: Recommendation) => void;
  className?: string;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

/**
 * RecommendationsSidebar Component
 * 
 * Displays recommendations in a sidebar with:
 * - Filtering by type and priority
 * - Collapsible sections
 * - Dismiss and apply actions
 * - Empty state
 * 
 * Requirements: 8.5, 8.6
 */
export function RecommendationsSidebar({
  recommendations,
  onDismiss,
  onApply,
  className,
  isCollapsed = false,
  onToggleCollapse,
}: RecommendationsSidebarProps) {
  const [selectedTypes, setSelectedTypes] = useState<Set<RecommendationType>>(new Set());
  const [selectedPriorities, setSelectedPriorities] = useState<Set<RecommendationPriority>>(new Set());
  
  // Filter recommendations
  const filteredRecommendations = recommendations.filter(rec => {
    const typeMatch = selectedTypes.size === 0 || selectedTypes.has(rec.type);
    const priorityMatch = selectedPriorities.size === 0 || selectedPriorities.has(rec.priority);
    return typeMatch && priorityMatch;
  });
  
  // Toggle type filter
  const toggleType = (type: RecommendationType) => {
    const newTypes = new Set(selectedTypes);
    if (newTypes.has(type)) {
      newTypes.delete(type);
    } else {
      newTypes.add(type);
    }
    setSelectedTypes(newTypes);
  };
  
  // Toggle priority filter
  const togglePriority = (priority: RecommendationPriority) => {
    const newPriorities = new Set(selectedPriorities);
    if (newPriorities.has(priority)) {
      newPriorities.delete(priority);
    } else {
      newPriorities.add(priority);
    }
    setSelectedPriorities(newPriorities);
  };
  
  // Clear all filters
  const clearFilters = () => {
    setSelectedTypes(new Set());
    setSelectedPriorities(new Set());
  };
  
  // Get unique types and priorities
  const availableTypes = Array.from(new Set(recommendations.map(r => r.type)));
  const availablePriorities = Array.from(new Set(recommendations.map(r => r.priority)));
  
  // Type labels
  const typeLabels: Record<RecommendationType, string> = {
    stuck_task: 'Stuck Tasks',
    phase_complete: 'Phase Complete',
    plan_review: 'Plan Review',
    task_tip: 'Task Tips',
    fast_progress: 'Fast Progress',
    timeline_adjustment: 'Timeline',
  };
  
  // Priority labels
  const priorityLabels: Record<RecommendationPriority, string> = {
    high: 'High Priority',
    medium: 'Medium Priority',
    low: 'Low Priority',
  };
  
  if (isCollapsed) {
    return (
      <div className={cn('flex flex-col items-center gap-2', className)}>
        <Button
          variant="outline"
          size="sm"
          onClick={onToggleCollapse}
          className="w-10 h-10 p-0 border-purple-500/50 hover:bg-purple-500/10"
          aria-label="Show recommendations"
        >
          <Sparkles className="w-4 h-4 text-purple-400" />
        </Button>
        {recommendations.length > 0 && (
          <div className="w-6 h-6 rounded-full bg-purple-500 text-white text-xs flex items-center justify-center font-semibold">
            {recommendations.length}
          </div>
        )}
      </div>
    );
  }
  
  return (
    <Card className={cn('flame-card flex flex-col h-full', className)}>
      <CardHeader className="pb-3 flex-shrink-0">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-400" />
            <span>Recommendations</span>
            {recommendations.length > 0 && (
              <span className="text-sm font-normal text-gray-400">
                ({filteredRecommendations.length})
              </span>
            )}
          </CardTitle>
          
          <div className="flex items-center gap-2">
            {/* Filter Menu */}
            {recommendations.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                  >
                    <Filter className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <div className="px-2 py-1.5 text-xs font-semibold text-gray-400">
                    Filter by Type
                  </div>
                  {availableTypes.map(type => (
                    <DropdownMenuCheckboxItem
                      key={type}
                      checked={selectedTypes.has(type)}
                      onCheckedChange={() => toggleType(type)}
                    >
                      {typeLabels[type]}
                    </DropdownMenuCheckboxItem>
                  ))}
                  
                  <div className="px-2 py-1.5 text-xs font-semibold text-gray-400 border-t border-gray-800 mt-1">
                    Filter by Priority
                  </div>
                  {availablePriorities.map(priority => (
                    <DropdownMenuCheckboxItem
                      key={priority}
                      checked={selectedPriorities.has(priority)}
                      onCheckedChange={() => togglePriority(priority)}
                    >
                      {priorityLabels[priority]}
                    </DropdownMenuCheckboxItem>
                  ))}
                  
                  {(selectedTypes.size > 0 || selectedPriorities.size > 0) && (
                    <>
                      <div className="border-t border-gray-800 mt-1" />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={clearFilters}
                        className="w-full justify-start text-xs"
                      >
                        Clear Filters
                      </Button>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            
            {/* Collapse Button */}
            {onToggleCollapse && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onToggleCollapse}
                className="h-8 w-8 p-0"
                aria-label="Hide recommendations"
              >
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="flex-1 overflow-hidden p-0">
        {filteredRecommendations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full p-6 text-center">
            <Sparkles className="w-12 h-12 text-gray-600 mb-3" />
            <p className="text-sm text-gray-400 mb-1">
              {recommendations.length === 0 
                ? "No recommendations yet"
                : "No recommendations match your filters"
              }
            </p>
            <p className="text-xs text-gray-500">
              {recommendations.length === 0
                ? "Keep working on your plan to get personalized suggestions"
                : "Try adjusting your filters"
              }
            </p>
            {selectedTypes.size > 0 || selectedPriorities.size > 0 ? (
              <Button
                variant="outline"
                size="sm"
                onClick={clearFilters}
                className="mt-4"
              >
                Clear Filters
              </Button>
            ) : null}
          </div>
        ) : (
          <ScrollArea className="h-full px-6 pb-6">
            <div className="space-y-3">
              {filteredRecommendations.map(recommendation => (
                <RecommendationCard
                  key={recommendation.id}
                  recommendation={recommendation}
                  onDismiss={onDismiss}
                  onApply={onApply}
                />
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
