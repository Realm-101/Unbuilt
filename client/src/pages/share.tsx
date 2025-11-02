import { useQuery } from "@tanstack/react-query";
import { useRoute, useLocation } from "wouter";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { AnalysisResultsLayout } from "@/components/analysis/AnalysisResultsLayout";
import { AnalysisSections } from "@/components/analysis/AnalysisSections";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/queryClient";
import type { SearchResult, Search } from "@shared/schema";

interface ShareData {
  search: Search;
  results: SearchResult[];
  shareInfo: {
    viewCount: number;
    createdAt: string;
    expiresAt: string | null;
  };
  isOwner: boolean;
}

/**
 * PublicShareView - Public page for viewing shared analyses
 * 
 * Features:
 * - No authentication required
 * - Display analysis results in read-only mode
 * - Track views with IP and timestamp
 * - Call-to-action to create own analysis
 * - Responsive mobile layout
 * 
 * Requirements: 9.3, 9.5
 */
export default function PublicShareView() {
  const [match, params] = useRoute("/share/:token");
  const [, setLocation] = useLocation();
  
  const token = params?.token;

  // Fetch the shared analysis (public endpoint, no auth required)
  const { data, isLoading, error } = useQuery<ShareData>({
    queryKey: ["/api/share", token],
    enabled: !!token,
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/share/${token}`);
      const result = await response.json();
      return result;
    },
    retry: false, // Don't retry on 404 or expired links
  });

  if (!match || !token) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900">
        <div className="max-w-7xl mx-auto px-4 py-16">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-white mb-4">Invalid Share Link</h2>
            <p className="text-gray-300 mb-6">
              The share link you're trying to access is invalid.
            </p>
            <Button onClick={() => setLocation('/')}>
              Go to Home
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900">
        <div className="flex items-center justify-center min-h-96">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-300">Loading shared analysis...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    const errorMessage = error instanceof Error ? error.message : "This share link has expired or been revoked";
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900">
        <div className="max-w-7xl mx-auto px-4 py-16">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-white mb-4">Share Link Unavailable</h2>
            <p className="text-gray-300 mb-6">
              {errorMessage}
            </p>
            <div className="space-y-4">
              <Button onClick={() => setLocation('/')}>
                Go to Home
              </Button>
              <div className="mt-8 p-6 bg-gray-800/50 rounded-lg border border-gray-700 max-w-md mx-auto">
                <h3 className="text-lg font-semibold text-white mb-2">
                  Want to create your own analysis?
                </h3>
                <p className="text-gray-300 mb-4">
                  Discover untapped market opportunities with AI-powered gap analysis.
                </p>
                <Button 
                  onClick={() => setLocation('/validate-idea')}
                  className="w-full"
                >
                  Start Free Analysis
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const { search, results, shareInfo, isOwner } = data;
  const primaryResult = results[0]; // Use the first result as primary

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900">
      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-900/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setLocation('/')}
                className="text-gray-300 hover:text-white"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Home
              </Button>
              <div className="h-6 w-px bg-gray-700" />
              <div>
                <h1 className="text-lg font-semibold text-white">Shared Analysis</h1>
                <p className="text-sm text-gray-400">
                  {shareInfo.viewCount} view{shareInfo.viewCount !== 1 ? 's' : ''}
                </p>
              </div>
            </div>
            
            {!isOwner && (
              <Button
                onClick={() => setLocation('/validate-idea')}
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Create Your Own
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {primaryResult ? (
          <div className="space-y-6">
            {/* Analysis Summary */}
            <AnalysisResultsLayout
              result={primaryResult}
              onShare={() => {}} // Disabled in public view
              onExport={() => {}} // Disabled in public view
              onFavorite={() => {}} // Disabled in public view
              isPublicView={true}
            />

            {/* Detailed Analysis Sections */}
            <AnalysisSections
              result={primaryResult}
              isPublicView={true}
            />

            {/* Call-to-Action Banner */}
            <div className="mt-12 p-8 bg-gradient-to-r from-purple-900/50 to-pink-900/50 rounded-lg border border-purple-700/50">
              <div className="text-center max-w-2xl mx-auto">
                <h2 className="text-2xl font-bold text-white mb-3">
                  Ready to Discover Your Own Opportunities?
                </h2>
                <p className="text-gray-300 mb-6">
                  Get AI-powered gap analysis for your ideas. Identify untapped markets,
                  validate feasibility, and create actionable roadmaps.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Button
                    size="lg"
                    onClick={() => setLocation('/validate-idea')}
                    className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                  >
                    Start Free Analysis
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    onClick={() => setLocation('/pricing')}
                    className="border-purple-500 text-purple-300 hover:bg-purple-900/30"
                  >
                    View Pricing
                  </Button>
                </div>
                <p className="text-sm text-gray-400 mt-4">
                  Free tier includes 5 analyses per month. No credit card required.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-16">
            <h2 className="text-2xl font-bold text-white mb-4">No Results Available</h2>
            <p className="text-gray-300 mb-6">
              This analysis doesn't have any results to display.
            </p>
            <Button onClick={() => setLocation('/')}>
              Go to Home
            </Button>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-800 mt-16">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-sm text-gray-400">
              Powered by <span className="text-purple-400 font-semibold">Unbuilt</span> - 
              AI-Powered Innovation Gap Analysis
            </p>
            <div className="flex gap-4">
              <Button
                variant="link"
                size="sm"
                onClick={() => setLocation('/about')}
                className="text-gray-400 hover:text-white"
              >
                About
              </Button>
              <Button
                variant="link"
                size="sm"
                onClick={() => setLocation('/privacy')}
                className="text-gray-400 hover:text-white"
              >
                Privacy
              </Button>
              <Button
                variant="link"
                size="sm"
                onClick={() => setLocation('/terms')}
                className="text-gray-400 hover:text-white"
              >
                Terms
              </Button>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
