import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { Filter, Grid, List, ChevronLeft, ChevronRight, Download, Search as SearchIcon, SlidersHorizontal, BarChart3, Eye } from "lucide-react";
import Layout from "@/components/layout-new";
import ResultCard from "@/components/result-card";
import GapCategoryCard from "@/components/GapCategoryCard";
import ShareModal from "@/components/share-modal";
import ActionPlanModal from "@/components/action-plan-modal";
import ExportModal from "@/components/export-modal";
import SearchAnalyticsPanel from "@/components/search-analytics-panel";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiRequest } from "@/lib/queryClient";
import type { Search, SearchResult } from "@shared/schema";

export default function SearchResults() {
  const [match, params] = useRoute("/search/:id");
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [actionPlanModalOpen, setActionPlanModalOpen] = useState(false);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [selectedResult, setSelectedResult] = useState<SearchResult | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"results" | "analytics">("results");
  const [searchQuery, setSearchQuery] = useState("");
  const [innovationRange, setInnovationRange] = useState([1, 10]);
  const [feasibilityFilter, setFeasibilityFilter] = useState<string[]>(["high", "medium", "low"]);
  const [marketPotentialFilter, setMarketPotentialFilter] = useState<string[]>(["high", "medium", "low"]);
  const [categoryFilters, setCategoryFilters] = useState<string[]>([
    "technology",
    "market", 
    "ux",
    "business_model"
  ]);
  const [sortBy, setSortBy] = useState("relevance");
  const [currentPage, setCurrentPage] = useState(1);
  const resultsPerPage = 10;

  const queryClient = useQueryClient();
  const searchId = params?.id ? parseInt(params.id) : null;

  const { data: search, isLoading: searchLoading } = useQuery<Search>({
    queryKey: ["/api/search", searchId],
    enabled: !!searchId,
    staleTime: 0, // Always fetch fresh data
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/search/${searchId}`);
      const result = await response.json();
      // Unwrap the success response wrapper
      return result?.data || result;
    }
  });

  const { data: results = [], isLoading: resultsLoading } = useQuery<SearchResult[]>({
    queryKey: ["/api/search", searchId, "results"],
    enabled: !!searchId,
    staleTime: 0, // Always fetch fresh data
    select: (response: any) => {
      // Unwrap the success response wrapper
      console.log("🔍 Raw response:", JSON.stringify(response).substring(0, 200));
      
      // Handle different response formats
      if (response && typeof response === 'object') {
        // If response has success and data properties, unwrap it
        if (response.success && response.data) {
          console.log("✅ Found success wrapper, unwrapping data");
          return Array.isArray(response.data) ? response.data : [];
        }
        // If response is already an array, return it
        if (Array.isArray(response)) {
          console.log("✅ Response is already an array");
          return response;
        }
      }
      
      console.log("⚠️ Unexpected response format, returning empty array");
      return [];
    },
  }) as { data: SearchResult[]; isLoading: boolean };

  const saveResultMutation = useMutation({
    mutationFn: async ({ id, isSaved }: { id: number; isSaved: boolean }) => {
      const response = await apiRequest("PATCH", `/api/results/${id}/save`, { isSaved });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/search", searchId, "results"] });
    },
  });

  const handleSaveResult = (id: number, isSaved: boolean) => {
    saveResultMutation.mutate({ id, isSaved });
  };

  const handleShareResult = (result: SearchResult) => {
    setSelectedResult(result);
    setShareModalOpen(true);
  };

  const handleViewDetails = (result: SearchResult) => {
    setSelectedResult(result);
    setActionPlanModalOpen(true);
  };

  const handleCategoryFilter = (category: string) => {
    setCategoryFilters(prev => 
      prev.includes(category) 
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  const filteredResults = results.filter((result: SearchResult) => {
    // Category filter
    if (!categoryFilters.includes(result.category)) return false;
    
    // Search query filter
    if (searchQuery && !result.title.toLowerCase().includes(searchQuery.toLowerCase()) && 
        !result.description.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    
    // Innovation score filter
    if (result.innovationScore < innovationRange[0] || result.innovationScore > innovationRange[1]) {
      return false;
    }
    
    // Feasibility filter
    if (!feasibilityFilter.includes(result.feasibility)) return false;
    
    // Market potential filter
    if (!marketPotentialFilter.includes(result.marketPotential)) return false;
    
    return true;
  });

  const sortedResults = [...filteredResults].sort((a: SearchResult, b: SearchResult) => {
    switch (sortBy) {
      case "feasibility":
        const feasibilityOrder = { high: 3, medium: 2, low: 1 };
        return feasibilityOrder[b.feasibility as keyof typeof feasibilityOrder] - feasibilityOrder[a.feasibility as keyof typeof feasibilityOrder];
      case "market-potential":
        const marketOrder = { high: 3, medium: 2, low: 1 };
        return marketOrder[b.marketPotential as keyof typeof marketOrder] - marketOrder[a.marketPotential as keyof typeof marketOrder];
      case "innovation":
        return b.innovationScore - a.innovationScore;
      default:
        return 0;
    }
  });

  const totalPages = Math.ceil(sortedResults.length / resultsPerPage);
  const paginatedResults = sortedResults.slice(
    (currentPage - 1) * resultsPerPage,
    currentPage * resultsPerPage
  );

  if (!match || !searchId) {
    return <div>Search not found</div>;
  }

  if (searchLoading || resultsLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-96">
          <div className="w-8 h-8 border-4 border-google-blue border-t-transparent rounded-full animate-spin"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
        <div className="flex flex-col lg:flex-row gap-4 lg:gap-8">
          {/* Sidebar - Only show for results view */}
          {viewMode === "results" && (
            <aside className="w-full lg:w-64 hidden lg:block">
              <div className="bg-gray-800 rounded-lg border border-gray-700 p-4 mb-6">
                <h3 className="font-medium text-white mb-3">Filter by Category</h3>
                <div className="space-y-2">
                  {[
                    { value: "technology", label: "Technology" },
                    { value: "market", label: "Market" },
                    { value: "ux", label: "User Experience" },
                    { value: "business_model", label: "Business Model" }
                  ].map(({ value, label }) => (
                    <div key={value} className="flex items-center space-x-2">
                      <Checkbox
                        id={value}
                        checked={categoryFilters.includes(value)}
                        onCheckedChange={() => handleCategoryFilter(value)}
                      />
                      <label htmlFor={value} className="text-sm cursor-pointer text-gray-300">
                        {label}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            </aside>
          )}

          {/* Main Content */}
          <main className="flex-1 min-w-0">
            {/* Search Results Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4 sm:mb-6">
              <div className="min-w-0">
                <h2 className="text-lg sm:text-xl font-medium text-white truncate">Gap Analysis Results</h2>
                <p className="text-xs sm:text-sm text-gray-400">
                  About {filteredResults.length} opportunities found for "{search?.query}"
                </p>
              </div>
              <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                {/* View Mode Toggle */}
                <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as "results" | "analytics")} className="w-full sm:w-auto">
                  <TabsList className="bg-gray-800 border-gray-700 w-full sm:w-auto">
                    <TabsTrigger value="results" className="flex items-center gap-1 sm:gap-2 flex-1 sm:flex-initial">
                      <Eye className="w-3 h-3 sm:w-4 sm:h-4" />
                      <span className="text-xs sm:text-sm">Results</span>
                    </TabsTrigger>
                    <TabsTrigger value="analytics" className="flex items-center gap-1 sm:gap-2 flex-1 sm:flex-initial">
                      <BarChart3 className="w-3 h-3 sm:w-4 sm:h-4" />
                      <span className="text-xs sm:text-sm">Analytics</span>
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
                
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setFiltersOpen(!filtersOpen)}
                  className="border-gray-700 text-gray-300 hover:bg-gray-800 touch-manipulation"
                >
                  <SlidersHorizontal className="w-4 h-4 sm:mr-2" />
                  <span className="hidden sm:inline">Advanced Filters</span>
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setExportModalOpen(true)}
                  className="border-gray-700 text-gray-300 hover:bg-gray-800 touch-manipulation"
                >
                  <Download className="w-4 h-4 sm:mr-2" />
                  <span className="hidden sm:inline">Export</span>
                </Button>
                {viewMode === "results" && (
                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger className="w-full sm:w-48 bg-gray-800 border-gray-700 text-gray-300 text-xs sm:text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-800 border-gray-700">
                      <SelectItem value="relevance">Sort by Relevance</SelectItem>
                      <SelectItem value="feasibility">Sort by Feasibility</SelectItem>
                      <SelectItem value="market-potential">Sort by Market Potential</SelectItem>
                      <SelectItem value="innovation">Sort by Innovation Score</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>

            {/* Advanced Filters Panel - Only show for results view */}
            {viewMode === "results" && (
              <Collapsible open={filtersOpen} onOpenChange={setFiltersOpen}>
                <CollapsibleContent>
                  <div className="bg-gray-800 rounded-lg border border-gray-700 p-4 sm:p-6 mb-4 sm:mb-6">
                  <h3 className="font-semibold text-white mb-3 sm:mb-4 text-sm sm:text-base">Advanced Filters</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                    {/* Search Query Filter */}
                    <div>
                      <Label htmlFor="search-filter">Search within results</Label>
                      <div className="relative">
                        <SearchIcon className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                        <Input
                          id="search-filter"
                          placeholder="Filter by keywords..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="pl-10"
                        />
                      </div>
                    </div>

                    {/* Innovation Score Range */}
                    <div>
                      <Label>Innovation Score Range</Label>
                      <div className="mt-2">
                        <Slider
                          value={innovationRange}
                          onValueChange={setInnovationRange}
                          max={10}
                          min={1}
                          step={1}
                          className="w-full"
                        />
                        <div className="flex justify-between text-xs text-gray-500 mt-1">
                          <span>{innovationRange[0]}</span>
                          <span>{innovationRange[1]}</span>
                        </div>
                      </div>
                    </div>

                    {/* Feasibility Filter */}
                    <div>
                      <Label>Feasibility Level</Label>
                      <div className="mt-2 space-y-2">
                        {["high", "medium", "low"].map((level) => (
                          <div key={level} className="flex items-center space-x-2">
                            <Checkbox
                              id={`feasibility-${level}`}
                              checked={feasibilityFilter.includes(level)}
                              onCheckedChange={(checked) => {
                                setFeasibilityFilter(prev => 
                                  checked 
                                    ? [...prev, level]
                                    : prev.filter(f => f !== level)
                                );
                              }}
                            />
                            <label htmlFor={`feasibility-${level}`} className="text-sm capitalize">
                              {level}
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Market Potential Filter */}
                    <div>
                      <Label>Market Potential</Label>
                      <div className="mt-2 space-y-2">
                        {["high", "medium", "low"].map((level) => (
                          <div key={level} className="flex items-center space-x-2">
                            <Checkbox
                              id={`market-${level}`}
                              checked={marketPotentialFilter.includes(level)}
                              onCheckedChange={(checked) => {
                                setMarketPotentialFilter(prev => 
                                  checked 
                                    ? [...prev, level]
                                    : prev.filter(f => f !== level)
                                );
                              }}
                            />
                            <label htmlFor={`market-${level}`} className="text-sm capitalize">
                              {level}
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Reset Filters */}
                    <div className="flex items-end">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setSearchQuery("");
                          setInnovationRange([1, 10]);
                          setFeasibilityFilter(["high", "medium", "low"]);
                          setMarketPotentialFilter(["high", "medium", "low"]);
                        }}
                        className="w-full"
                      >
                        Reset Filters
                      </Button>
                    </div>
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>
            )}

            {/* Content Views */}
            {viewMode === "analytics" ? (
              <SearchAnalyticsPanel results={filteredResults} query={search?.query || ""} />
            ) : (
              <>
                {/* Results */}
                <div className="space-y-6">
                  {paginatedResults.map((result: SearchResult) => (
                    <GapCategoryCard
                      key={result.id}
                      result={result}
                      onSave={handleSaveResult}
                      onShare={handleShareResult}
                      onViewDetails={handleViewDetails}
                    />
                  ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-center mt-6 sm:mt-8">
                    <div className="flex items-center gap-1 sm:gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        disabled={currentPage === 1}
                        className="border-gray-700 text-gray-300 hover:bg-gray-800 touch-manipulation min-w-[44px] min-h-[44px]"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </Button>
                      <div className="flex items-center gap-1 overflow-x-auto max-w-[200px] sm:max-w-none">
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                          <Button
                            key={page}
                            variant={currentPage === page ? "default" : "outline"}
                            size="sm"
                            onClick={() => setCurrentPage(page)}
                            className={`touch-manipulation min-w-[44px] min-h-[44px] ${currentPage === page ? "bg-orange-600 hover:bg-orange-700" : "border-gray-700 text-gray-300 hover:bg-gray-800"}`}
                          >
                            {page}
                          </Button>
                        ))}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                        disabled={currentPage === totalPages}
                        className="border-gray-700 text-gray-300 hover:bg-gray-800 touch-manipulation min-w-[44px] min-h-[44px]"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </main>
        </div>
      </div>

      <ShareModal
        isOpen={shareModalOpen}
        result={selectedResult}
        onClose={() => setShareModalOpen(false)}
      />

      <ActionPlanModal
        isOpen={actionPlanModalOpen}
        result={selectedResult}
        onClose={() => setActionPlanModalOpen(false)}
      />

      <ExportModal
        isOpen={exportModalOpen}
        results={filteredResults}
        onClose={() => setExportModalOpen(false)}
      />
    </Layout>
  );
}
