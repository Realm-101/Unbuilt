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
    <div className="w-full max-w-4xl mx-auto">
      {/* Main Search */}
      <form onSubmit={handleSubmit} className="relative">
        <div className="relative group">
          <div className="absolute inset-0 neon-border rounded-2xl blur-sm opacity-75 group-hover:opacity-100 transition-opacity" />
          <div className="relative flex items-center premium-card dark:premium-card rounded-2xl p-1">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-6 h-6 text-purple-400" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={placeholder}
                className="pl-12 pr-4 py-4 text-lg border-0 bg-transparent focus-visible:ring-0 placeholder:text-muted-foreground/60"
                disabled={loading}
              />
            </div>
            <Button
              type="submit"
              disabled={!query.trim() || loading}
              className="btn-premium m-1 px-8 py-4 text-lg"
            >
              {loading ? (
                <div className="flex items-center space-x-2">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Analyzing...</span>
                </div>
              ) : (
                <>
                  <Sparkles className="w-5 h-5 mr-2" />
                  Discover Gaps
                </>
              )}
            </Button>
          </div>
        </div>
      </form>

      {/* AI Suggestions */}
      <div className="mt-8">
        <div className="flex items-center justify-center space-x-2 mb-4">
          <Wand2 className="w-4 h-4 text-purple-400" />
          <span className="text-sm font-medium text-muted-foreground">Try these AI-powered searches</span>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-3">
          {exampleQueries.map((example, index) => (
            <button
              key={index}
              onClick={() => setQuery(example)}
              className="group px-4 py-2 rounded-full border border-purple-500/30 hover:border-purple-500 bg-background/50 hover:bg-purple-500/10 transition-all duration-300 hover:scale-105"
              disabled={loading}
            >
              <span className="text-sm font-medium group-hover:text-purple-400 transition-colors">
                {example}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Stats Bar */}
      <div className="mt-8 flex items-center justify-center space-x-8 text-sm text-muted-foreground">
        <div className="flex items-center space-x-2">
          <Zap className="w-4 h-4 text-yellow-400" />
          <span>10,000+ gaps discovered</span>
        </div>
        <div className="flex items-center space-x-2">
          <Sparkles className="w-4 h-4 text-blue-400" />
          <span>AI-powered insights</span>
        </div>
        <div className="flex items-center space-x-2">
          <Search className="w-4 h-4 text-green-400" />
          <span>Real-time analysis</span>
        </div>
      </div>
    </div>
  );
}