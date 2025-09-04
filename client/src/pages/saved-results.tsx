import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Layout from "@/components/layout-new";
import ResultCard from "@/components/result-card";
import ShareModal from "@/components/share-modal";
import ActionPlanModal from "@/components/action-plan-modal";
import ExportModal from "@/components/export-modal";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/queryClient";
import type { SearchResult } from "@shared/schema";

export default function SavedResults() {
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [actionPlanModalOpen, setActionPlanModalOpen] = useState(false);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [selectedResult, setSelectedResult] = useState<SearchResult | null>(null);
  const queryClient = useQueryClient();

  const { data: savedResults = [], isLoading } = useQuery<SearchResult[]>({
    queryKey: ["/api/results/saved"],
  });

  const saveResultMutation = useMutation({
    mutationFn: async ({ id, isSaved }: { id: number; isSaved: boolean }) => {
      const response = await apiRequest("PATCH", `/api/results/${id}/save`, { isSaved });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/results/saved"] });
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

  if (isLoading) {
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
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-medium text-google-gray-dark mb-2">Saved Results</h1>
          <p className="text-google-gray">
            Your collection of interesting gaps and opportunities
          </p>
        </div>

        {(savedResults as SearchResult[]).length === 0 ? (
          <div className="text-center py-12">
            <p className="text-lg text-google-gray mb-4">No saved results yet</p>
            <p className="text-google-gray">
              Start exploring and save interesting gaps you discover
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {(savedResults as SearchResult[]).map((result: SearchResult) => (
              <ResultCard
                key={result.id}
                result={result}
                onSave={handleSaveResult}
                onShare={handleShareResult}
                onViewDetails={handleViewDetails}
              />
            ))}
          </div>
        )}
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
        results={(savedResults as SearchResult[])}
        onClose={() => setExportModalOpen(false)}
      />
    </Layout>
  );
}
