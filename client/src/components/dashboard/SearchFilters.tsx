import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Filter, X, SlidersHorizontal } from 'lucide-react';
import { useUserPreferencesStore } from '@/stores/userPreferencesStore';

export interface SearchFilterOptions {
  sortBy: 'date' | 'score' | 'title';
  sortOrder: 'asc' | 'desc';
  dateRange?: 'today' | 'week' | 'month' | 'all';
  minScore?: number;
  tags?: string[];
}

interface SearchFiltersProps {
  onFilterChange: (filters: SearchFilterOptions) => void;
  availableTags?: string[];
}

export function SearchFilters({ onFilterChange, availableTags = [] }: SearchFiltersProps) {
  const { preferences, updatePreferences } = useUserPreferencesStore();
  
  // Initialize filters from stored preferences or defaults
  const [filters, setFilters] = useState<SearchFilterOptions>(() => {
    const stored = preferences?.searchFilters as SearchFilterOptions | undefined;
    return stored || {
      sortBy: 'date',
      sortOrder: 'desc',
      dateRange: 'all',
      tags: [],
    };
  });

  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // Update parent and persist preferences when filters change
  useEffect(() => {
    onFilterChange(filters);
    // Persist to preferences store
    updatePreferences({ searchFilters: filters });
  }, [filters, onFilterChange]);

  const handleSortChange = (value: string) => {
    setFilters((prev) => ({ ...prev, sortBy: value as any }));
  };

  const handleOrderChange = () => {
    setFilters((prev) => ({
      ...prev,
      sortOrder: prev.sortOrder === 'asc' ? 'desc' : 'asc',
    }));
  };

  const handleDateRangeChange = (value: string) => {
    setFilters((prev) => ({ ...prev, dateRange: value as any }));
  };

  const handleMinScoreChange = (value: string) => {
    const score = parseInt(value);
    setFilters((prev) => ({
      ...prev,
      minScore: isNaN(score) ? undefined : score,
    }));
  };

  const handleTagToggle = (tag: string) => {
    setFilters((prev) => {
      const tags = prev.tags || [];
      const newTags = tags.includes(tag)
        ? tags.filter((t) => t !== tag)
        : [...tags, tag];
      return { ...prev, tags: newTags };
    });
  };

  const handleClearFilters = () => {
    setFilters({
      sortBy: 'date',
      sortOrder: 'desc',
      dateRange: 'all',
      tags: [],
    });
  };

  const activeFilterCount =
    (filters.dateRange && filters.dateRange !== 'all' ? 1 : 0) +
    (filters.minScore ? 1 : 0) +
    (filters.tags?.length || 0);

  return (
    <Card className="bg-gray-800/50 border-gray-700">
      <CardContent className="p-4">
        <div className="flex items-center gap-3 flex-wrap">
          {/* Sort By */}
          <div className="flex items-center gap-2">
            <Label className="text-sm text-gray-400">Sort:</Label>
            <Select value={filters.sortBy} onValueChange={handleSortChange}>
              <SelectTrigger className="w-[140px] bg-gray-700 border-gray-600">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date">Date</SelectItem>
                <SelectItem value="score">Innovation Score</SelectItem>
                <SelectItem value="title">Title</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Sort Order */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleOrderChange}
            className="bg-gray-700 border-gray-600"
          >
            {filters.sortOrder === 'asc' ? '↑' : '↓'}
          </Button>

          {/* Advanced Filters */}
          <Popover open={isFilterOpen} onOpenChange={setIsFilterOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="bg-gray-700 border-gray-600"
              >
                <SlidersHorizontal className="w-4 h-4 mr-2" />
                Filters
                {activeFilterCount > 0 && (
                  <Badge
                    variant="secondary"
                    className="ml-2 bg-purple-600 text-white"
                  >
                    {activeFilterCount}
                  </Badge>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 bg-gray-800 border-gray-700">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-white">Filters</h4>
                  {activeFilterCount > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleClearFilters}
                      className="text-xs"
                    >
                      Clear All
                    </Button>
                  )}
                </div>

                {/* Date Range */}
                <div>
                  <Label className="text-white mb-2 block">Date Range</Label>
                  <Select
                    value={filters.dateRange}
                    onValueChange={handleDateRangeChange}
                  >
                    <SelectTrigger className="bg-gray-700 border-gray-600">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Time</SelectItem>
                      <SelectItem value="today">Today</SelectItem>
                      <SelectItem value="week">This Week</SelectItem>
                      <SelectItem value="month">This Month</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Min Score */}
                <div>
                  <Label className="text-white mb-2 block">
                    Minimum Innovation Score
                  </Label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={filters.minScore || ''}
                    onChange={(e) => handleMinScoreChange(e.target.value)}
                    placeholder="0-100"
                    className="bg-gray-700 border-gray-600 text-white"
                  />
                </div>

                {/* Tags */}
                {availableTags.length > 0 && (
                  <div>
                    <Label className="text-white mb-2 block">Tags</Label>
                    <div className="flex flex-wrap gap-2">
                      {availableTags.map((tag) => (
                        <Badge
                          key={tag}
                          variant={
                            filters.tags?.includes(tag) ? 'default' : 'outline'
                          }
                          className="cursor-pointer"
                          onClick={() => handleTagToggle(tag)}
                        >
                          {tag}
                          {filters.tags?.includes(tag) && (
                            <X className="w-3 h-3 ml-1" />
                          )}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </PopoverContent>
          </Popover>

          {/* Active Filters Display */}
          {activeFilterCount > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              {filters.dateRange && filters.dateRange !== 'all' && (
                <Badge variant="secondary" className="bg-purple-600/20 text-purple-300">
                  {filters.dateRange}
                  <button
                    onClick={() =>
                      setFilters((prev) => ({ ...prev, dateRange: 'all' }))
                    }
                    className="ml-1"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              )}
              {filters.minScore && (
                <Badge variant="secondary" className="bg-purple-600/20 text-purple-300">
                  Score ≥ {filters.minScore}
                  <button
                    onClick={() =>
                      setFilters((prev) => ({ ...prev, minScore: undefined }))
                    }
                    className="ml-1"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              )}
              {filters.tags?.map((tag) => (
                <Badge
                  key={tag}
                  variant="secondary"
                  className="bg-purple-600/20 text-purple-300"
                >
                  {tag}
                  <button
                    onClick={() => handleTagToggle(tag)}
                    className="ml-1"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
