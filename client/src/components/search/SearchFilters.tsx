import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  Filter, 
  SlidersHorizontal, 
  Calendar as CalendarIcon,
  TrendingUp,
  Target,
  DollarSign,
  Building,
  Lightbulb,
  ChevronDown,
  ChevronUp,
  X,
  RotateCcw,
  Save,
  Search,
  Sparkles
} from 'lucide-react';
import { format, subDays } from 'date-fns';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

export interface SearchFilters {
  categories: string[];
  innovationScore: [number, number];
  marketSize: [number, number];
  feasibilityScore: [number, number];
  marketPotential: string | null;
  dateRange: {
    from: Date | undefined;
    to: Date | undefined;
  };
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  keywords: string[];
}

interface SearchFiltersProps {
  onFiltersChange: (filters: SearchFilters) => void;
  onSearch: (query: string) => void;
  totalResults?: number;
  isLoading?: boolean;
}

const categories = [
  { value: 'technology', label: 'Technology', icon: '💻' },
  { value: 'healthcare', label: 'Healthcare', icon: '🏥' },
  { value: 'finance', label: 'Finance', icon: '💰' },
  { value: 'education', label: 'Education', icon: '📚' },
  { value: 'ecommerce', label: 'E-commerce', icon: '🛒' },
  { value: 'entertainment', label: 'Entertainment', icon: '🎮' },
  { value: 'sustainability', label: 'Sustainability', icon: '🌱' },
  { value: 'food', label: 'Food & Beverage', icon: '🍔' },
  { value: 'travel', label: 'Travel', icon: '✈️' },
  { value: 'real-estate', label: 'Real Estate', icon: '🏠' },
];

const sortOptions = [
  { value: 'relevance', label: 'Relevance' },
  { value: 'innovation', label: 'Innovation Score' },
  { value: 'marketSize', label: 'Market Size' },
  { value: 'feasibility', label: 'Feasibility' },
  { value: 'marketPotential', label: 'Market Potential' },
  { value: 'date', label: 'Date' },
];

const presetFilters = [
  { 
    name: 'High Innovation', 
    filters: { 
      innovationScore: [70, 100] as [number, number],
      sortBy: 'innovation' 
    } 
  },
  { 
    name: 'Large Markets', 
    filters: { 
      marketSize: [80, 100] as [number, number],
      sortBy: 'marketSize' 
    } 
  },
  { 
    name: 'Easy to Build', 
    filters: { 
      feasibilityScore: [70, 100] as [number, number],
      sortBy: 'feasibility' 
    } 
  },
  { 
    name: 'Trending Now', 
    filters: { 
      dateRange: { 
        from: subDays(new Date(), 7), 
        to: new Date() 
      },
      sortBy: 'date' 
    } 
  },
];

export function SearchFilters({ onFiltersChange, onSearch, totalResults, isLoading }: SearchFiltersProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [expandedSections, setExpandedSections] = useState({
    categories: true,
    scores: true,
    date: false,
    keywords: false,
  });

  const [filters, setFilters] = useState<SearchFilters>({
    categories: [],
    innovationScore: [0, 100],
    marketSize: [0, 100],
    feasibilityScore: [0, 100],
    marketPotential: null,
    dateRange: {
      from: undefined,
      to: undefined,
    },
    sortBy: 'relevance',
    sortOrder: 'desc',
    keywords: [],
  });

  const [activeFiltersCount, setActiveFiltersCount] = useState(0);

  useEffect(() => {
    // Calculate active filters
    let count = 0;
    if (filters.categories.length > 0) count += filters.categories.length;
    if (filters.innovationScore[0] > 0 || filters.innovationScore[1] < 100) count++;
    if (filters.marketSize[0] > 0 || filters.marketSize[1] < 100) count++;
    if (filters.feasibilityScore[0] > 0 || filters.feasibilityScore[1] < 100) count++;
    if (filters.marketPotential) count++;
    if (filters.dateRange.from || filters.dateRange.to) count++;
    if (filters.keywords.length > 0) count += filters.keywords.length;
    setActiveFiltersCount(count);
  }, [filters]);

  const handleCategoryToggle = (category: string) => {
    setFilters(prev => ({
      ...prev,
      categories: prev.categories.includes(category)
        ? prev.categories.filter(c => c !== category)
        : [...prev.categories, category]
    }));
  };

  const handleSliderChange = (key: 'innovationScore' | 'marketSize' | 'feasibilityScore', value: number[]) => {
    setFilters(prev => ({
      ...prev,
      [key]: value as [number, number]
    }));
  };

  const handleSortChange = (value: string) => {
    setFilters(prev => ({
      ...prev,
      sortBy: value
    }));
  };

  const handleSortOrderToggle = () => {
    setFilters(prev => ({
      ...prev,
      sortOrder: prev.sortOrder === 'asc' ? 'desc' : 'asc'
    }));
  };

  const handleKeywordAdd = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const input = e.currentTarget;
      const keyword = input.value.trim();
      if (keyword && !filters.keywords.includes(keyword)) {
        setFilters(prev => ({
          ...prev,
          keywords: [...prev.keywords, keyword]
        }));
        input.value = '';
      }
    }
  };

  const handleKeywordRemove = (keyword: string) => {
    setFilters(prev => ({
      ...prev,
      keywords: prev.keywords.filter(k => k !== keyword)
    }));
  };

  const applyFilters = () => {
    onFiltersChange(filters);
    setIsOpen(false);
  };

  const resetFilters = () => {
    const defaultFilters: SearchFilters = {
      categories: [],
      innovationScore: [0, 100],
      marketSize: [0, 100],
      feasibilityScore: [0, 100],
      marketPotential: null,
      dateRange: {
        from: undefined,
        to: undefined,
      },
      sortBy: 'relevance',
      sortOrder: 'desc',
      keywords: [],
    };
    setFilters(defaultFilters);
    onFiltersChange(defaultFilters);
  };

  const applyPreset = (preset: typeof presetFilters[0]) => {
    setFilters(prev => ({
      ...prev,
      ...preset.filters
    }));
  };

  const handleSearch = () => {
    if (searchQuery.trim()) {
      onSearch(searchQuery.trim());
    }
  };

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  return (
    <div className="space-y-4">
      {/* Search Bar with Filters */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search for market opportunities..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="pl-10 pr-4"
          />
        </div>
        <Button onClick={handleSearch} disabled={isLoading}>
          {isLoading ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            'Search'
          )}
        </Button>
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon" className="relative">
              <SlidersHorizontal className="w-4 h-4" />
              {activeFiltersCount > 0 && (
                <Badge 
                  variant="destructive" 
                  className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center"
                >
                  {activeFiltersCount}
                </Badge>
              )}
            </Button>
          </SheetTrigger>
          <SheetContent className="w-[400px] sm:w-[540px]">
            <SheetHeader>
              <SheetTitle>Advanced Filters</SheetTitle>
              <SheetDescription>
                Refine your search to find the perfect market opportunities
              </SheetDescription>
            </SheetHeader>
            
            <ScrollArea className="h-[calc(100vh-200px)] mt-6 pr-4">
              <div className="space-y-6">
                {/* Preset Filters */}
                <div className="space-y-2">
                  <Label>Quick Presets</Label>
                  <div className="flex flex-wrap gap-2">
                    {presetFilters.map((preset) => (
                      <Button
                        key={preset.name}
                        variant="outline"
                        size="sm"
                        onClick={() => applyPreset(preset)}
                      >
                        <Sparkles className="w-3 h-3 mr-1" />
                        {preset.name}
                      </Button>
                    ))}
                  </div>
                </div>

                <Separator />

                {/* Categories */}
                <div className="space-y-3">
                  <div 
                    className="flex items-center justify-between cursor-pointer"
                    onClick={() => toggleSection('categories')}
                  >
                    <Label className="text-base">Categories</Label>
                    {expandedSections.categories ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </div>
                  
                  <AnimatePresence>
                    {expandedSections.categories && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="grid grid-cols-2 gap-2"
                      >
                        {categories.map((category) => (
                          <div
                            key={category.value}
                            className={cn(
                              "flex items-center space-x-2 p-2 rounded-lg border cursor-pointer transition-colors",
                              filters.categories.includes(category.value)
                                ? "bg-primary/10 border-primary"
                                : "hover:bg-muted"
                            )}
                            onClick={() => handleCategoryToggle(category.value)}
                          >
                            <Checkbox
                              checked={filters.categories.includes(category.value)}
                              onCheckedChange={() => handleCategoryToggle(category.value)}
                              onClick={(e) => e.stopPropagation()}
                            />
                            <span className="text-sm">
                              {category.icon} {category.label}
                            </span>
                          </div>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <Separator />

                {/* Score Filters */}
                <div className="space-y-4">
                  <div 
                    className="flex items-center justify-between cursor-pointer"
                    onClick={() => toggleSection('scores')}
                  >
                    <Label className="text-base">Score Filters</Label>
                    {expandedSections.scores ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </div>
                  
                  <AnimatePresence>
                    {expandedSections.scores && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="space-y-4"
                      >
                        {/* Innovation Score */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <Label className="text-sm">
                              <Lightbulb className="w-3 h-3 inline mr-1" />
                              Innovation Score
                            </Label>
                            <span className="text-sm text-muted-foreground">
                              {filters.innovationScore[0]} - {filters.innovationScore[1]}
                            </span>
                          </div>
                          <Slider
                            value={filters.innovationScore}
                            onValueChange={(value) => handleSliderChange('innovationScore', value)}
                            max={100}
                            step={5}
                            className="w-full"
                          />
                        </div>

                        {/* Market Size */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <Label className="text-sm">
                              <DollarSign className="w-3 h-3 inline mr-1" />
                              Market Size
                            </Label>
                            <span className="text-sm text-muted-foreground">
                              {filters.marketSize[0]} - {filters.marketSize[1]}
                            </span>
                          </div>
                          <Slider
                            value={filters.marketSize}
                            onValueChange={(value) => handleSliderChange('marketSize', value)}
                            max={100}
                            step={5}
                            className="w-full"
                          />
                        </div>

                        {/* Feasibility Score */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <Label className="text-sm">
                              <Target className="w-3 h-3 inline mr-1" />
                              Feasibility Score
                            </Label>
                            <span className="text-sm text-muted-foreground">
                              {filters.feasibilityScore[0]} - {filters.feasibilityScore[1]}
                            </span>
                          </div>
                          <Slider
                            value={filters.feasibilityScore}
                            onValueChange={(value) => handleSliderChange('feasibilityScore', value)}
                            max={100}
                            step={5}
                            className="w-full"
                          />
                        </div>

                        {/* Market Potential */}
                        <div className="space-y-2">
                          <Label className="text-sm">Market Potential</Label>
                          <Select
                            value={filters.marketPotential || ''}
                            onValueChange={(value) => setFilters(prev => ({ ...prev, marketPotential: value || null }))}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Any potential" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="very-high">Very High</SelectItem>
                              <SelectItem value="high">High</SelectItem>
                              <SelectItem value="medium">Medium</SelectItem>
                              <SelectItem value="low">Low</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <Separator />

                {/* Date Range */}
                <div className="space-y-3">
                  <div 
                    className="flex items-center justify-between cursor-pointer"
                    onClick={() => toggleSection('date')}
                  >
                    <Label className="text-base">Date Range</Label>
                    {expandedSections.date ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </div>
                  
                  <AnimatePresence>
                    {expandedSections.date && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="flex gap-2"
                      >
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="outline" className="flex-1 justify-start">
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {filters.dateRange.from ? (
                                format(filters.dateRange.from, "PPP")
                              ) : (
                                "From date"
                              )}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0">
                            <Calendar
                              mode="single"
                              selected={filters.dateRange.from}
                              onSelect={(date) => setFilters(prev => ({
                                ...prev,
                                dateRange: { ...prev.dateRange, from: date }
                              }))}
                            />
                          </PopoverContent>
                        </Popover>
                        
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="outline" className="flex-1 justify-start">
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {filters.dateRange.to ? (
                                format(filters.dateRange.to, "PPP")
                              ) : (
                                "To date"
                              )}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0">
                            <Calendar
                              mode="single"
                              selected={filters.dateRange.to}
                              onSelect={(date) => setFilters(prev => ({
                                ...prev,
                                dateRange: { ...prev.dateRange, to: date }
                              }))}
                            />
                          </PopoverContent>
                        </Popover>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <Separator />

                {/* Keywords */}
                <div className="space-y-3">
                  <div 
                    className="flex items-center justify-between cursor-pointer"
                    onClick={() => toggleSection('keywords')}
                  >
                    <Label className="text-base">Keywords</Label>
                    {expandedSections.keywords ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </div>
                  
                  <AnimatePresence>
                    {expandedSections.keywords && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="space-y-2"
                      >
                        <Input
                          placeholder="Add keyword and press Enter"
                          onKeyDown={handleKeywordAdd}
                        />
                        <div className="flex flex-wrap gap-2">
                          {filters.keywords.map((keyword) => (
                            <Badge
                              key={keyword}
                              variant="secondary"
                              className="cursor-pointer"
                              onClick={() => handleKeywordRemove(keyword)}
                            >
                              {keyword}
                              <X className="w-3 h-3 ml-1" />
                            </Badge>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <Separator />

                {/* Sort Options */}
                <div className="space-y-3">
                  <Label className="text-base">Sort By</Label>
                  <div className="flex gap-2">
                    <Select value={filters.sortBy} onValueChange={handleSortChange}>
                      <SelectTrigger className="flex-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {sortOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={handleSortOrderToggle}
                    >
                      {filters.sortOrder === 'asc' ? (
                        <TrendingUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </ScrollArea>

            {/* Footer Actions */}
            <div className="flex gap-2 mt-6">
              <Button variant="outline" onClick={resetFilters} className="flex-1">
                <RotateCcw className="w-4 h-4 mr-2" />
                Reset
              </Button>
              <Button onClick={applyFilters} className="flex-1">
                Apply Filters
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* Active Filters Display */}
      {activeFiltersCount > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-muted-foreground">Active filters:</span>
          {filters.categories.map((cat) => (
            <Badge key={cat} variant="secondary">
              {categories.find(c => c.value === cat)?.label}
              <X 
                className="w-3 h-3 ml-1 cursor-pointer" 
                onClick={() => handleCategoryToggle(cat)}
              />
            </Badge>
          ))}
          {(filters.innovationScore[0] > 0 || filters.innovationScore[1] < 100) && (
            <Badge variant="secondary">
              Innovation: {filters.innovationScore[0]}-{filters.innovationScore[1]}
            </Badge>
          )}
          {(filters.marketSize[0] > 0 || filters.marketSize[1] < 100) && (
            <Badge variant="secondary">
              Market: {filters.marketSize[0]}-{filters.marketSize[1]}
            </Badge>
          )}
          {filters.dateRange.from && (
            <Badge variant="secondary">
              From: {format(filters.dateRange.from, "MMM dd")}
            </Badge>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={resetFilters}
            className="h-6 px-2"
          >
            Clear all
          </Button>
        </div>
      )}

      {/* Results Count */}
      {totalResults !== undefined && (
        <div className="text-sm text-muted-foreground">
          Found {totalResults} opportunities
        </div>
      )}
    </div>
  );
}