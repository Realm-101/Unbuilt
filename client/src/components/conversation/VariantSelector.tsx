import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { GitBranch, TrendingUp, TrendingDown, Minus, Loader2 } from 'lucide-react';

interface AnalysisVariant {
  id: number;
  query: string;
  modifiedParameters: Record<string, string>;
  resultsCount: number;
  timestamp: string;
  topGaps: Array<{
    title: string;
    category: string;
    innovationScore: number;
    feasibility: string;
  }>;
}

interface VariantComparison {
  summary: string;
  keyDifferences: Array<{
    aspect: string;
    original: string;
    variant: string;
    impact: 'positive' | 'negative' | 'neutral';
  }>;
  recommendations: string[];
  preferredVariant?: 'original' | 'variant' | 'both';
  reasoning: string;
}

interface VariantSelectorProps {
  conversationId: number;
  originalAnalysisId: number;
  currentVariantId: number | null;
  onVariantSelect: (variantId: number | null) => void;
}

export function VariantSelector({
  conversationId,
  originalAnalysisId,
  currentVariantId,
  onVariantSelect,
}: VariantSelectorProps) {
  const [compareDialogOpen, setCompareDialogOpen] = useState(false);
  const [selectedCompareVariantId, setSelectedCompareVariantId] = useState<number | null>(null);

  // Fetch variants
  const { data: variantsData, isLoading: variantsLoading } = useQuery({
    queryKey: ['conversation-variants', conversationId],
    queryFn: async () => {
      const response = await fetch(`/api/conversations/${conversationId}/variants`, {
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error('Failed to fetch variants');
      }
      return response.json();
    },
  });

  // Fetch comparison data
  const { data: comparisonData, isLoading: comparisonLoading } = useQuery({
    queryKey: ['variant-comparison', conversationId, selectedCompareVariantId],
    queryFn: async () => {
      if (!selectedCompareVariantId) return null;
      const response = await fetch(
        `/api/conversations/${conversationId}/variants/${selectedCompareVariantId}/compare`,
        {
          credentials: 'include',
        }
      );
      if (!response.ok) {
        throw new Error('Failed to fetch comparison');
      }
      return response.json();
    },
    enabled: !!selectedCompareVariantId && compareDialogOpen,
  });

  const variants: AnalysisVariant[] = variantsData?.data?.variants || [];
  const comparison: VariantComparison | null = comparisonData?.data?.comparison || null;

  const handleVariantChange = (value: string) => {
    if (value === 'original') {
      onVariantSelect(null);
    } else {
      onVariantSelect(parseInt(value));
    }
  };

  const handleCompareClick = (variantId: number) => {
    setSelectedCompareVariantId(variantId);
    setCompareDialogOpen(true);
  };

  const getImpactIcon = (impact: 'positive' | 'negative' | 'neutral') => {
    switch (impact) {
      case 'positive':
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'negative':
        return <TrendingDown className="h-4 w-4 text-red-500" />;
      case 'neutral':
        return <Minus className="h-4 w-4 text-gray-500" />;
    }
  };

  if (variantsLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading variants...
      </div>
    );
  }

  if (variants.length === 0) {
    return null;
  }

  return (
    <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg border">
      <GitBranch className="h-4 w-4 text-muted-foreground" />
      <span className="text-sm font-medium">Analysis Version:</span>
      
      <Select
        value={currentVariantId ? String(currentVariantId) : 'original'}
        onValueChange={handleVariantChange}
      >
        <SelectTrigger className="w-[250px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="original">
            Original Analysis
          </SelectItem>
          {variants.map((variant) => (
            <SelectItem key={variant.id} value={String(variant.id)}>
              Variant: {variant.query.substring(0, 30)}...
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {currentVariantId && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleCompareClick(currentVariantId)}
        >
          Compare with Original
        </Button>
      )}

      {/* Comparison Dialog */}
      <Dialog open={compareDialogOpen} onOpenChange={setCompareDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Analysis Comparison</DialogTitle>
            <DialogDescription>
              Compare the original analysis with the selected variant
            </DialogDescription>
          </DialogHeader>

          {comparisonLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : comparison ? (
            <div className="space-y-6">
              {/* Summary */}
              <div className="p-4 bg-muted/50 rounded-lg">
                <h3 className="font-semibold mb-2">Summary</h3>
                <p className="text-sm text-muted-foreground">{comparison.summary}</p>
              </div>

              {/* Key Differences */}
              {comparison.keyDifferences.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-3">Key Differences</h3>
                  <div className="space-y-3">
                    {comparison.keyDifferences.map((diff, index) => (
                      <div key={index} className="p-3 border rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          {getImpactIcon(diff.impact)}
                          <span className="font-medium">{diff.aspect}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-muted-foreground">Original:</span>
                            <p className="mt-1">{diff.original}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Variant:</span>
                            <p className="mt-1">{diff.variant}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <Separator />

              {/* Recommendations */}
              {comparison.recommendations.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-3">Recommendations</h3>
                  <ul className="space-y-2">
                    {comparison.recommendations.map((rec, index) => (
                      <li key={index} className="flex items-start gap-2 text-sm">
                        <span className="text-primary mt-1">•</span>
                        <span>{rec}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Preferred Variant */}
              {comparison.preferredVariant && (
                <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="default">
                      {comparison.preferredVariant === 'original'
                        ? 'Original Recommended'
                        : comparison.preferredVariant === 'variant'
                        ? 'Variant Recommended'
                        : 'Both Have Merit'}
                    </Badge>
                  </div>
                  <p className="text-sm">{comparison.reasoning}</p>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No comparison data available
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
