import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getQueryFn } from '@/lib/queryClient';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Search,
  FileText,
  BookOpen,
  HelpCircle,
  Layout,
  History,
  TrendingUp,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import Fuse from 'fuse.js';

export type SearchResultType = 'analysis' | 'resource' | 'help' | 'page';

export interface SearchResult {
  type: SearchResultType;
  id: string;
  title: string;
  description: string;
  path: string;
  metadata?: Record<string, any>;
  score?: number;
}

interface GlobalSearchProps {
  isOpen: boolean;
  onClose: () => void;
  onResultSelect: (result: SearchResult) => void;
}

const resultTypeConfig = {
  analysis: {
    icon: FileText,
    label: 'Analysis',
    color: 'text-blue-500',
  },
  resource: {
    icon: BookOpen,
    label: 'Resource',
    color: 'text-green-500',
  },
  help: {
    icon: HelpCircle,
    label: 'Help',
    color: 'text-purple-500',
  },
  page: {
    icon: Layout,
    label: 'Page',
    color: 'text-orange-500',
  },
};

// Static pages for search
const staticPages: SearchResult[] = [
  {
    type: 'page',
    id: 'home',
    title: 'Home',
    description: 'Start a new gap analysis',
    path: '/',
  },
  {
    type: 'page',
    id: 'dashboard',
    title: 'Dashboard',
    description: 'View your recent searches and favorites',
    path: '/dashboard',
  },
  {
    type: 'page',
    id: 'validate-idea',
    title: 'Validate Idea',
    description: 'Test your business ideas',
    path: '/validate-idea',
  },
  {
    type: 'page',
    id: 'market-trends',
    title: 'Market Trends',
    description: 'Explore market heat map',
    path: '/market-trends',
  },
  {
    type: 'page',
    id: 'analytics',
    title: 'Analytics',
    description: 'View data insights',
    path: '/analytics',
  },
  {
    type: 'page',
    id: 'history',
    title: 'Search History',
    description: 'View your past searches',
    path: '/history',
  },
  {
    type: 'page',
    id: 'saved',
    title: 'Saved Analyses',
    description: 'Your favorited analyses',
    path: '/saved',
  },
  {
    type: 'page',
    id: 'help',
    title: 'Help & Support',
    description: 'Get help and documentation',
    path: '/help',
  },
  {
    type: 'page',
    id: 'account',
    title: 'Account Settings',
    description: 'Manage your account',
    path: '/account',
  },
  {
    type: 'page',
    id: 'subscribe',
    title: 'Subscription',
    description: 'Upgrade your plan',
    path: '/subscribe',
  },
];

export function GlobalSearch({
  isOpen,
  onClose,
  onResultSelect,
}: GlobalSearchProps) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState<SearchResultType | 'all'>('all');
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  // Fetch search results from API
  const { data: apiResults, isLoading } = useQuery<{
    success: boolean;
    results?: SearchResult[];
    pagination?: {
      page: number;
      pageSize: number;
      total: number;
    };
  }>({
    queryKey: ['/api/search/global', query],
    queryFn: getQueryFn({ on401: 'returnNull' }),
    enabled: isOpen && query.length > 0,
    staleTime: 30000, // 30 seconds
  });

  // Load recent searches from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('recent-searches');
    if (stored) {
      try {
        setRecentSearches(JSON.parse(stored));
      } catch (e) {
        console.error('Failed to parse recent searches:', e);
      }
    }
  }, []);

  // Save recent search
  const saveRecentSearch = (searchQuery: string) => {
    const updated = [
      searchQuery,
      ...recentSearches.filter((s) => s !== searchQuery),
    ].slice(0, 5);
    setRecentSearches(updated);
    localStorage.setItem('recent-searches', JSON.stringify(updated));
  };

  // Focus input when dialog opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    } else {
      setQuery('');
      setSelectedIndex(0);
      setSelectedCategory('all');
    }
  }, [isOpen]);

  // Combine API results with static pages
  const allResults = useMemo(() => {
    const results: SearchResult[] = [...staticPages];

    if (apiResults?.success && apiResults.results) {
      results.push(...apiResults.results);
    }

    return results;
  }, [apiResults]);

  // Fuzzy search with Fuse.js
  const searchResults = useMemo(() => {
    if (!query) return [];

    const fuse = new Fuse(allResults, {
      keys: [
        { name: 'title', weight: 2 },
        { name: 'description', weight: 1 },
        { name: 'metadata.tags', weight: 0.5 },
      ],
      threshold: 0.4,
      includeScore: true,
      minMatchCharLength: 2,
    });

    const fuseResults = fuse.search(query);
    return fuseResults.map((result) => ({
      ...result.item,
      score: result.score ?? 0,
    }));
  }, [query, allResults]);

  // Filter by category
  const filteredResults = useMemo(() => {
    if (selectedCategory === 'all') return searchResults;
    return searchResults.filter((result) => result.type === selectedCategory);
  }, [searchResults, selectedCategory]);

  // Group results by type
  const groupedResults = useMemo(() => {
    const groups: Record<SearchResultType, SearchResult[]> = {
      analysis: [],
      resource: [],
      help: [],
      page: [],
    };

    filteredResults.forEach((result) => {
      groups[result.type].push(result);
    });

    return groups;
  }, [filteredResults]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex((prev) =>
            prev < filteredResults.length - 1 ? prev + 1 : prev
          );
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex((prev) => (prev > 0 ? prev - 1 : prev));
          break;
        case 'Enter':
          e.preventDefault();
          if (filteredResults[selectedIndex]) {
            handleResultClick(filteredResults[selectedIndex]);
          }
          break;
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filteredResults, selectedIndex, onClose]);

  // Scroll selected item into view
  useEffect(() => {
    if (resultsRef.current) {
      const selectedElement = resultsRef.current.querySelector(
        `[data-index="${selectedIndex}"]`
      );
      if (selectedElement) {
        selectedElement.scrollIntoView({
          block: 'nearest',
          behavior: 'smooth',
        });
      }
    }
  }, [selectedIndex]);

  const handleResultClick = (result: SearchResult) => {
    saveRecentSearch(query);
    onResultSelect(result);
    onClose();
  };

  const handleRecentSearchClick = (search: string) => {
    setQuery(search);
    inputRef.current?.focus();
  };

  const categories: Array<{ value: SearchResultType | 'all'; label: string }> = [
    { value: 'all', label: 'All' },
    { value: 'analysis', label: 'Analyses' },
    { value: 'page', label: 'Pages' },
    { value: 'help', label: 'Help' },
    { value: 'resource', label: 'Resources' },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl p-0 gap-0">
        <DialogHeader className="px-4 pt-4 pb-0">
          <DialogTitle className="sr-only">Global Search</DialogTitle>
          <div className="flex items-center gap-2 border-b pb-4">
            <Search className="w-5 h-5 text-muted-foreground" />
            <Input
              ref={inputRef}
              type="text"
              placeholder="Search analyses, pages, help articles..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
            />
            {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
          </div>
        </DialogHeader>

        {/* Category filters */}
        <div className="flex gap-2 px-4 py-2 border-b overflow-x-auto">
          {categories.map((category) => (
            <Button
              key={category.value}
              variant={selectedCategory === category.value ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setSelectedCategory(category.value)}
              className="flex-shrink-0"
            >
              {category.label}
            </Button>
          ))}
        </div>

        {/* Results */}
        <div
          ref={resultsRef}
          className="max-h-[400px] overflow-y-auto px-2 py-2"
        >
          {query === '' && recentSearches.length > 0 && (
            <div className="px-2 py-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                <History className="w-4 h-4" />
                <span>Recent Searches</span>
              </div>
              <div className="space-y-1">
                {recentSearches.map((search, index) => (
                  <Button
                    key={index}
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start text-left"
                    onClick={() => handleRecentSearchClick(search)}
                  >
                    <Search className="w-4 h-4 mr-2" />
                    {search}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {query !== '' && filteredResults.length === 0 && !isLoading && (
            <div className="px-4 py-8 text-center text-muted-foreground">
              <Search className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No results found for "{query}"</p>
              <p className="text-sm mt-1">Try a different search term</p>
            </div>
          )}

          {query !== '' && filteredResults.length > 0 && (
            <div className="space-y-4">
              {Object.entries(groupedResults).map(([type, results]) => {
                if (results.length === 0) return null;

                const config = resultTypeConfig[type as SearchResultType];
                const Icon = config.icon;

                return (
                  <div key={type} className="px-2">
                    <div className="flex items-center gap-2 text-sm font-medium mb-2">
                      <Icon className={cn('w-4 h-4', config.color)} />
                      <span>{config.label}s</span>
                      <Badge variant="secondary" className="text-xs">
                        {results.length}
                      </Badge>
                    </div>
                    <div className="space-y-1">
                      {results.map((result, index) => {
                        const globalIndex = filteredResults.findIndex(r => r.id === result.id);
                        const isSelected = globalIndex === selectedIndex;

                        return (
                          <Button
                            key={result.id}
                            variant={isSelected ? 'secondary' : 'ghost'}
                            size="sm"
                            className="w-full justify-start text-left h-auto py-2"
                            onClick={() => handleResultClick(result)}
                            data-index={globalIndex}
                          >
                            <div className="flex-1 min-w-0">
                              <div className="font-medium truncate">
                                {result.title}
                              </div>
                              <div className="text-xs text-muted-foreground truncate">
                                {result.description}
                              </div>
                            </div>
                            {result.metadata?.resultsCount && (
                              <Badge variant="outline" className="ml-2">
                                {result.metadata.resultsCount}
                              </Badge>
                            )}
                          </Button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer with keyboard shortcuts */}
        <div className="border-t px-4 py-2 flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-muted rounded">↑↓</kbd>
              Navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-muted rounded">Enter</kbd>
              Select
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-muted rounded">Esc</kbd>
              Close
            </span>
          </div>
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 bg-muted rounded">Ctrl</kbd>
            <span>+</span>
            <kbd className="px-1.5 py-0.5 bg-muted rounded">K</kbd>
            to open
          </span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
