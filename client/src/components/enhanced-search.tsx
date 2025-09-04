import React, { useState, useCallback, useRef } from 'react';
import { Search, Sparkles, TrendingUp, Lightbulb, Rocket } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

interface EnhancedSearchProps {
  onSearch: (query: string) => void;
  isSearching?: boolean;
  placeholder?: string;
}

const EXAMPLE_QUERIES = [
  { icon: Lightbulb, text: "AI tools for mental health", category: "Tech" },
  { icon: TrendingUp, text: "Sustainable fashion solutions", category: "Products" },
  { icon: Rocket, text: "Remote work productivity", category: "Services" },
  { icon: Sparkles, text: "Personalized education platforms", category: "Business" },
];

export function EnhancedSearch({ onSearch, isSearching = false, placeholder }: EnhancedSearchProps) {
  const [query, setQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim() && !isSearching) {
      onSearch(query.trim());
      setShowSuggestions(false);
    }
  }, [query, onSearch, isSearching]);

  const handleSuggestionClick = (suggestion: string) => {
    setQuery(suggestion);
    setShowSuggestions(false);
    if (!isSearching) {
      onSearch(suggestion);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    setShowSuggestions(value.length > 0);
  };

  return (
    <div className="relative w-full max-w-4xl mx-auto">
      <form onSubmit={handleSubmit} className="relative">
        <motion.div
          animate={{
            scale: isFocused ? 1.02 : 1,
            boxShadow: isFocused 
              ? '0 20px 25px -5px rgba(249, 115, 22, 0.1), 0 10px 10px -5px rgba(249, 115, 22, 0.04)'
              : '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)'
          }}
          transition={{ duration: 0.2 }}
          className={cn(
            "relative rounded-2xl backdrop-blur-xl transition-all duration-300",
            isFocused 
              ? "bg-gradient-to-r from-orange-500/10 via-red-500/10 to-purple-500/10 ring-2 ring-orange-500/50" 
              : "bg-black/40"
          )}
        >
          <div className="flex items-center p-1">
            <div className="flex-1 flex items-center">
              <Search className={cn(
                "ml-4 h-5 w-5 transition-colors duration-200",
                isFocused ? "text-orange-400" : "text-gray-400"
              )} />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={handleInputChange}
                onFocus={() => {
                  setIsFocused(true);
                  setShowSuggestions(true);
                }}
                onBlur={() => {
                  setIsFocused(false);
                  setTimeout(() => setShowSuggestions(false), 200);
                }}
                placeholder={placeholder || "Discover what's missing in any industry..."}
                className="flex-1 bg-transparent text-white placeholder-gray-400 px-4 py-4 text-lg focus:outline-none"
                disabled={isSearching}
              />
            </div>
            <motion.button
              type="submit"
              disabled={!query.trim() || isSearching}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={cn(
                "mr-2 px-6 py-3 rounded-xl font-semibold transition-all duration-200",
                query.trim() && !isSearching
                  ? "bg-gradient-to-r from-orange-500 to-red-500 text-white hover:from-orange-600 hover:to-red-600 shadow-lg"
                  : "bg-gray-700 text-gray-400 cursor-not-allowed"
              )}
            >
              {isSearching ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Analyzing...</span>
                </div>
              ) : (
                <span>Discover</span>
              )}
            </motion.button>
          </div>
        </motion.div>
      </form>

      <AnimatePresence>
        {showSuggestions && query.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="absolute w-full mt-2 bg-black/90 backdrop-blur-xl rounded-xl border border-white/10 shadow-2xl overflow-hidden z-50"
          >
            <div className="p-3 border-b border-white/10">
              <p className="text-sm font-medium text-gray-400">Try these popular searches</p>
            </div>
            <div className="max-h-64 overflow-y-auto">
              {EXAMPLE_QUERIES.map((example, index) => {
                const Icon = example.icon;
                return (
                  <button
                    key={index}
                    onClick={() => handleSuggestionClick(example.text)}
                    className="w-full px-4 py-3 flex items-center gap-3 hover:bg-white/5 transition-colors text-left group"
                  >
                    <Icon className="h-4 w-4 text-orange-400 group-hover:text-orange-300" />
                    <div className="flex-1">
                      <div className="text-white group-hover:text-orange-100">{example.text}</div>
                      <div className="text-xs text-gray-500">{example.category}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {query.length > 0 && !isSearching && (
        <div className="flex items-center justify-center mt-4 gap-2 text-sm text-gray-400">
          <Sparkles className="h-4 w-4 text-orange-400" />
          <span>Press Enter to discover market gaps</span>
        </div>
      )}
    </div>
  );
}