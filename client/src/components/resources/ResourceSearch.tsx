import React, { useState, useEffect, useCallback, useRef } from "react";
import { Search, X, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useDebounce } from "@/hooks/useDebounce";

interface SearchSuggestion {
  id: number;
  title: string;
  description: string;
  category?: {
    name: string;
    icon?: string;
  };
  resourceType: string;
  relevanceScore?: number;
}

interface ResourceSearchProps {
  onSearch: (query: string) => void;
  onClear?: () => void;
  placeholder?: string;
  className?: string;
  showSuggestions?: boolean;
  initialValue?: string;
}

/**
 * ResourceSearch Component
 * 
 * Features:
 * - Search input with debouncing
 * - Show search suggestions as user types
 * - Display search results with highlighting
 * - Clear search button
 * 
 * Requirements: 10
 */
export function ResourceSearch({
  onSearch,
  onClear,
  placeholder = "Search resources...",
  className,
  showSuggestions = true,
  initialValue = ""
}: ResourceSearchProps) {
  const [query, setQuery] = useState(initialValue);
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [showSuggestionsDropdown, setShowSuggestionsDropdown] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  // Debounce search query for suggestions
  const debouncedQuery = useDebounce(query, 300);
  
  // Fetch suggestions when debounced query changes
  useEffect(() => {
    if (!showSuggestions || !debouncedQuery.trim() || debouncedQuery.length < 2) {
      setSuggestions([]);
      setShowSuggestionsDropdown(false);
      return;
    }
    
    const fetchSuggestions = async () => {
      setIsLoadingSuggestions(true);
      
      try {
        const response = await fetch(
          `/api/resources/search?q=${encodeURIComponent(debouncedQuery)}&limit=5`,
          {
            credentials: "include"
          }
        );
        
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.data.resources) {
            setSuggestions(data.data.resources);
            setShowSuggestionsDropdown(true);
          }
        }
      } catch (error) {
        console.error("Failed to fetch suggestions:", error);
      } finally {
        setIsLoadingSuggestions(false);
      }
    };
    
    fetchSuggestions();
  }, [debouncedQuery, showSuggestions]);
  
  // Handle click outside to close suggestions
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowSuggestionsDropdown(false);
      }
    };
    
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);
  
  // Handle search submission
  const handleSearch = useCallback((searchQuery: string) => {
    if (searchQuery.trim()) {
      onSearch(searchQuery.trim());
      setShowSuggestionsDropdown(false);
      inputRef.current?.blur();
    }
  }, [onSearch]);
  
  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    setSelectedIndex(-1);
  };
  
  // Handle clear
  const handleClear = () => {
    setQuery("");
    setSuggestions([]);
    setShowSuggestionsDropdown(false);
    onClear?.();
    inputRef.current?.focus();
  };
  
  // Handle suggestion click
  const handleSuggestionClick = (suggestion: SearchSuggestion) => {
    setQuery(suggestion.title);
    handleSearch(suggestion.title);
  };
  
  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestionsDropdown || suggestions.length === 0) {
      if (e.key === "Enter") {
        handleSearch(query);
      }
      return;
    }
    
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedIndex(prev => prev > 0 ? prev - 1 : -1);
        break;
      case "Enter":
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
          handleSuggestionClick(suggestions[selectedIndex]);
        } else {
          handleSearch(query);
        }
        break;
      case "Escape":
        setShowSuggestionsDropdown(false);
        setSelectedIndex(-1);
        break;
    }
  };
  
  // Strip HTML tags for display (from highlighted text)
  const stripHtml = (html: string) => {
    const tmp = document.createElement("div");
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || "";
  };
  
  return (
    <div className={cn("relative", className)}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
        <Input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (suggestions.length > 0) {
              setShowSuggestionsDropdown(true);
            }
          }}
          placeholder={placeholder}
          className="pl-10 pr-20 bg-gray-800 border-gray-700 text-white"
          aria-label="Search resources"
          aria-autocomplete="list"
          aria-controls="search-suggestions"
          aria-expanded={showSuggestionsDropdown}
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {isLoadingSuggestions && (
            <Loader2 className="w-4 h-4 text-gray-500 animate-spin" />
          )}
          {query && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClear}
              className="h-7 w-7 p-0 hover:bg-gray-700"
              aria-label="Clear search"
            >
              <X className="w-4 h-4" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleSearch(query)}
            className="h-7 px-3 hover:bg-gray-700"
            disabled={!query.trim()}
          >
            Search
          </Button>
        </div>
      </div>
      
      {/* Suggestions dropdown */}
      {showSuggestionsDropdown && suggestions.length > 0 && (
        <Card
          ref={dropdownRef}
          id="search-suggestions"
          role="listbox"
          className="absolute top-full left-0 right-0 mt-2 z-50 bg-gray-900 border-gray-800 shadow-xl max-h-96 overflow-y-auto"
        >
          <CardContent className="p-2">
            {suggestions.map((suggestion, index) => (
              <button
                key={suggestion.id}
                role="option"
                aria-selected={index === selectedIndex}
                onClick={() => handleSuggestionClick(suggestion)}
                onMouseEnter={() => setSelectedIndex(index)}
                className={cn(
                  "w-full text-left p-3 rounded-lg transition-colors",
                  "hover:bg-gray-800 focus:bg-gray-800 focus:outline-none",
                  index === selectedIndex && "bg-gray-800"
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-medium text-white line-clamp-1">
                      {stripHtml(suggestion.title)}
                    </h4>
                    <p className="text-xs text-gray-400 line-clamp-2 mt-1">
                      {stripHtml(suggestion.description)}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      {suggestion.category && (
                        <Badge 
                          variant="outline" 
                          className="text-xs bg-gray-800/50 text-gray-400 border-gray-600"
                        >
                          {suggestion.category.name}
                        </Badge>
                      )}
                      <Badge 
                        variant="outline" 
                        className="text-xs bg-blue-500/20 text-blue-400 border-blue-500/30"
                      >
                        {suggestion.resourceType}
                      </Badge>
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </CardContent>
        </Card>
      )}
      
      {/* No results message */}
      {showSuggestionsDropdown && !isLoadingSuggestions && suggestions.length === 0 && debouncedQuery.length >= 2 && (
        <Card
          ref={dropdownRef}
          className="absolute top-full left-0 right-0 mt-2 z-50 bg-gray-900 border-gray-800 shadow-xl"
        >
          <CardContent className="p-4 text-center">
            <p className="text-sm text-gray-400">
              No resources found for "{debouncedQuery}"
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
