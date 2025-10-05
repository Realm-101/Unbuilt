import React, { useState } from "react";
import { Search, Sparkles, Zap, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface PremiumSearchBarProps {
  onSearch: (query: string) => void;
  loading?: boolean;
  placeholder?: string;
}

export default function PremiumSearchBar({ 
  onSearch, 
  loading = false, 
  placeholder = "Discover what's still unbuilt..." 
}: PremiumSearchBarProps) {
  const [query, setQuery] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim() && !loading) {
      onSearch(query);
    }
  };

  const exampleQueries = [
    "AI tools for mental health therapy",
    "Sustainable packaging solutions",
    "Remote work productivity apps",
    "Elder care technology",
    "Climate change monitoring"
  ];

  return (
    <div className="w-full max-w-4xl mx-auto px-2 sm:px-0">
      {/* Main Search */}
      <form onSubmit={handleSubmit} className="relative">
        <div className="relative group">
          <div className="absolute inset-0 neon-border rounded-xl sm:rounded-2xl blur-sm opacity-75 group-hover:opacity-100 transition-opacity" />
          <div className="relative flex flex-col sm:flex-row items-stretch sm:items-center premium-card dark:premium-card rounded-xl sm:rounded-2xl p-1 gap-2 sm:gap-0">
            <div className="flex-1 relative">
              <Search className="absolute left-3 sm:left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 sm:w-6 sm:h-6 text-purple-400" />
              <Input
                type="search"
                inputMode="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={placeholder}
                className="pl-10 sm:pl-12 pr-3 sm:pr-4 py-3 sm:py-4 text-base sm:text-lg border-0 bg-transparent focus-visible:ring-0 placeholder:text-muted-foreground/60"
                disabled={loading}
              />
            </div>
            <Button
              type="submit"
              disabled={!query.trim() || loading}
              className="btn-premium m-1 px-6 sm:px-8 py-3 sm:py-4 text-base sm:text-lg min-h-[48px] w-full sm:w-auto"
            >
              {loading ? (
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span className="text-sm sm:text-base">Analyzing...</span>
                </div>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                  <span className="text-sm sm:text-base">Discover Gaps</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </form>

      {/* AI Suggestions */}
      <div className="mt-6 sm:mt-8">
        <div className="flex items-center justify-center gap-2 mb-3 sm:mb-4">
          <Wand2 className="w-3 h-3 sm:w-4 sm:h-4 text-purple-400" />
          <span className="text-xs sm:text-sm font-medium text-muted-foreground">Try these AI-powered searches</span>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3">
          {exampleQueries.map((example, index) => (
            <button
              key={index}
              onClick={() => setQuery(example)}
              className="group px-3 sm:px-4 py-2 rounded-full border border-purple-500/30 hover:border-purple-500 bg-background/50 hover:bg-purple-500/10 transition-all duration-300 hover:scale-105 touch-manipulation min-h-[44px]"
              disabled={loading}
            >
              <span className="text-xs sm:text-sm font-medium group-hover:text-purple-400 transition-colors">
                {example}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Stats Bar */}
      <div className="mt-6 sm:mt-8 flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-8 text-xs sm:text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <Zap className="w-3 h-3 sm:w-4 sm:h-4 text-yellow-400" />
          <span>10,000+ gaps discovered</span>
        </div>
        <div className="flex items-center gap-2">
          <Sparkles className="w-3 h-3 sm:w-4 sm:h-4 text-blue-400" />
          <span>AI-powered insights</span>
        </div>
        <div className="flex items-center gap-2">
          <Search className="w-3 h-3 sm:w-4 sm:h-4 text-green-400" />
          <span>Real-time analysis</span>
        </div>
      </div>
    </div>
  );
}