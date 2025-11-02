import * as React from "react";
import { X, Search, HelpCircle, Video, FileText, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { HelpArticle } from "@shared/schema";

export interface ContextualHelpPanelProps {
  isOpen: boolean;
  context: string;
  onClose: () => void;
  className?: string;
}

/**
 * ContextualHelpPanel - A slide-in help panel with context-aware content
 * 
 * Features:
 * - Slide-in animation from right side
 * - Context-aware content loading based on current page
 * - Search within help content
 * - Video tutorial embedding
 * - Display related articles and FAQs
 * - Feedback mechanism
 * 
 * @example
 * ```tsx
 * <ContextualHelpPanel
 *   isOpen={isHelpOpen}
 *   context="dashboard"
 *   onClose={() => setIsHelpOpen(false)}
 * />
 * ```
 */
export function ContextualHelpPanel({
  isOpen,
  context,
  onClose,
  className,
}: ContextualHelpPanelProps) {
  const [searchQuery, setSearchQuery] = React.useState("");
  const [articles, setArticles] = React.useState<HelpArticle[]>([]);
  const [selectedArticle, setSelectedArticle] = React.useState<HelpArticle | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Load context-specific articles when panel opens or context changes
  React.useEffect(() => {
    if (isOpen && context) {
      loadContextArticles();
    }
  }, [isOpen, context]);

  const loadContextArticles = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/help/context/${context}`);
      if (!response.ok) throw new Error('Failed to load help articles');
      const data = await response.json();
      setArticles(data.data || []);
    } catch (err) {
      console.error('Error loading help articles:', err);
      setError('Failed to load help content');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      loadContextArticles();
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/help/search?q=${encodeURIComponent(searchQuery)}`);
      if (!response.ok) throw new Error('Search failed');
      const data = await response.json();
      setArticles(data.data || []);
    } catch (err) {
      console.error('Error searching help:', err);
      setError('Search failed');
    } finally {
      setLoading(false);
    }
  };

  const handleArticleClick = async (article: HelpArticle) => {
    setSelectedArticle(article);
    
    // Track article view
    try {
      await fetch(`/api/help/articles/${article.id}`, { method: 'GET' });
    } catch (err) {
      console.error('Error tracking article view:', err);
    }
  };

  const handleFeedback = async (articleId: number, helpful: boolean) => {
    try {
      await fetch(`/api/help/articles/${articleId}/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ helpful }),
      });
    } catch (err) {
      console.error('Error submitting feedback:', err);
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'getting-started':
        return <HelpCircle className="h-4 w-4" />;
      case 'features':
        return <FileText className="h-4 w-4" />;
      case 'troubleshooting':
        return <HelpCircle className="h-4 w-4" />;
      case 'faq':
        return <HelpCircle className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'getting-started':
        return 'bg-green-500/10 text-green-500';
      case 'features':
        return 'bg-blue-500/10 text-blue-500';
      case 'troubleshooting':
        return 'bg-orange-500/10 text-orange-500';
      case 'faq':
        return 'bg-purple-500/10 text-purple-500';
      default:
        return 'bg-gray-500/10 text-gray-500';
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className={cn(
              "fixed right-0 top-0 z-50 h-full w-full max-w-md border-l border-border bg-background shadow-2xl",
              "flex flex-col",
              className
            )}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border p-4">
              <div className="flex items-center gap-2">
                <HelpCircle className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-semibold">Help & Support</h2>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="h-8 w-8"
              >
                <X className="h-4 w-4" />
                <span className="sr-only">Close help panel</span>
              </Button>
            </div>

            {/* Search */}
            <div className="border-b border-border p-4">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search help articles..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    className="pl-9"
                  />
                </div>
                <Button onClick={handleSearch} size="sm">
                  Search
                </Button>
              </div>
            </div>

            {/* Content */}
            <ScrollArea className="flex-1">
              <div className="p-4">
                {loading && (
                  <div className="flex items-center justify-center py-8">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                  </div>
                )}

                {error && (
                  <div className="rounded-md bg-destructive/10 p-4 text-sm text-destructive">
                    {error}
                  </div>
                )}

                {!loading && !error && selectedArticle && (
                  <div className="space-y-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedArticle(null)}
                      className="mb-2"
                    >
                      <ChevronRight className="mr-2 h-4 w-4 rotate-180" />
                      Back to articles
                    </Button>

                    <div>
                      <div className="mb-2 flex items-center gap-2">
                        <Badge className={getCategoryColor(selectedArticle.category)}>
                          {selectedArticle.category}
                        </Badge>
                      </div>
                      <h3 className="mb-4 text-xl font-semibold">{selectedArticle.title}</h3>

                      {selectedArticle.videoUrl && (
                        <div className="mb-4 aspect-video overflow-hidden rounded-lg border border-border">
                          <iframe
                            src={selectedArticle.videoUrl}
                            title={selectedArticle.title}
                            className="h-full w-full"
                            allowFullScreen
                          />
                        </div>
                      )}

                      <div
                        className="prose prose-sm dark:prose-invert max-w-none"
                        dangerouslySetInnerHTML={{ __html: selectedArticle.content }}
                      />

                      <Separator className="my-6" />

                      <div className="space-y-2">
                        <p className="text-sm font-medium">Was this helpful?</p>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleFeedback(selectedArticle.id, true)}
                          >
                            Yes
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleFeedback(selectedArticle.id, false)}
                          >
                            No
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {!loading && !error && !selectedArticle && articles.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="mb-3 text-sm font-medium text-muted-foreground">
                      {searchQuery ? 'Search Results' : 'Related Articles'}
                    </h3>
                    {articles.map((article) => (
                      <button
                        key={article.id}
                        onClick={() => handleArticleClick(article)}
                        className="w-full rounded-lg border border-border p-3 text-left transition-colors hover:bg-accent"
                      >
                        <div className="mb-2 flex items-center gap-2">
                          {getCategoryIcon(article.category)}
                          <Badge
                            variant="secondary"
                            className={cn("text-xs", getCategoryColor(article.category))}
                          >
                            {article.category}
                          </Badge>
                          {article.videoUrl && (
                            <Video className="ml-auto h-4 w-4 text-muted-foreground" />
                          )}
                        </div>
                        <h4 className="mb-1 font-medium">{article.title}</h4>
                        <p className="line-clamp-2 text-sm text-muted-foreground">
                          {article.content.replace(/<[^>]*>/g, '').substring(0, 100)}...
                        </p>
                      </button>
                    ))}
                  </div>
                )}

                {!loading && !error && !selectedArticle && articles.length === 0 && (
                  <div className="py-8 text-center text-sm text-muted-foreground">
                    {searchQuery
                      ? 'No articles found. Try a different search term.'
                      : 'No help articles available for this context.'}
                  </div>
                )}
              </div>
            </ScrollArea>

            {/* Footer */}
            <div className="border-t border-border p-4">
              <p className="text-xs text-muted-foreground">
                Need more help?{' '}
                <a href="/docs" className="text-primary hover:underline">
                  View full documentation
                </a>
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
