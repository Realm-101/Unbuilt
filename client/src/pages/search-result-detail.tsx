import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRoute, useLocation } from "wouter";
import { ArrowLeft } from "lucide-react";
import Layout from "@/components/layout-new";
import { AnalysisResultsLayout } from "@/components/analysis/AnalysisResultsLayout";
import { AnalysisSections } from "@/components/analysis/AnalysisSections";
import { Button } from "@/components/ui/button";
import ShareModal from "@/components/share-modal";
import ExportModal from "@/components/export-modal";
import { apiRequest } from "@/lib/queryClient";
import type { SearchResult } from "@shared/schema";

/**
 * SearchResultDetail - Enhanced analysis results page with progressive disclosure
 * 
 * Features:
 * - Summary view with key metrics (AnalysisResultsLayout)
 * - Expandable sections for detailed analysis (AnalysisSections)
 * - Share and export functionality
 * - Favorite/save functionality
 * - Responsive mobile layout
 * 
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 12.1, 12.2, 12.5
 */
export default function SearchResultDetail() {
  const [match, params] = useRoute("/search-result/:id");
  const [, setLocation] = useLocation();
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  
  const resultId = params?.id ? parseInt(params.id) : null;

  // Fetch the search result
  const { data: result, isLoading, error } = useQuery<SearchResult>({
    queryKey: ["/api/results", resultId],
    enabled: !!resultId,
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/results/${resultId}`);
      const data = await response.json();
      return data?.data || data;
    },
  });

  const handleShare = () => {
    setShareModalOpen(true);
  };

  const handleExport = (format: 'pdf' | 'csv') => {
    setExportModalOpen(true);
  };

  const handleFavorite = async () => {
    if (!result) return;
    
    try {
      await apiRequest("PATCH", `/api/results/${result.id}/save`, {
        isSaved: !result.isSaved,
      });
      
      // Refetch to update the UI
      // The query will automatically refetch due to mutation
    } catch (error) {
      console.error("Failed to toggle favorite:", error);
    }
  };

  const handleBack = () => {
    // Try to go back to the search results page
    if (result?.searchId) {
      setLocation(`/search/${result.searchId}`);
    } else {
      setLocation('/dashboard');
    }
  };

  if (!match || !resultId) {
    return (
      <Layout>
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-white mb-4">Result Not Found</h2>
            <Button onClick={() => setLocation('/dashboard')}>
              Go to Dashboard
            </Button>
          </div>
        </div>
      </Layout>
    );
  }

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-96">
          <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      </Layout>
    );
  }

  if (error || !result) {
    return (
      <Layout>
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-white mb-4">Error Loading Result</h2>
            <p className="text-gray-400 mb-6">
              {error instanceof Error ? error.message : 'Failed to load analysis result'}
            </p>
            <Button onClick={handleBack}>Go Back</Button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        {/* Back Button */}
        <Button
          variant="ghost"
          onClick={handleBack}
          className="mb-6 text-gray-400 hover:text-white"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Results
        </Button>

        {/* Summary View */}
        <AnalysisResultsLayout
          result={result}
          onShare={handleShare}
          onExport={handleExport}
          onFavorite={handleFavorite}
        />

        {/* Expandable Detailed Sections */}
        <div className="mt-8">
          <AnalysisSections result={result} />
        </div>
      </div>

      {/* Modals */}
      <ShareModal
        isOpen={shareModalOpen}
        result={result}
        onClose={() => setShareModalOpen(false)}
      />

      <ExportModal
        isOpen={exportModalOpen}
        results={[result]}
        onClose={() => setExportModalOpen(false)}
      />
    </Layout>
  );
}
