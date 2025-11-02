import React from 'react';
import { Sparkles } from 'lucide-react';
import { RecommendationCard } from './RecommendationCard';
import type { Recommendation } from '@/types/action-plan';

interface InlineRecommendationsProps {
  recommendations: Recommendation[];
  onDismiss?: (recommendationId: string) => void;
  onApply?: (recommendation: Recommendation) => void;
  maxVisible?: number;
  className?: string;
}

/**
 * InlineRecommendations Component
 * 
 * Displays recommendations inline within the action plan view
 * Shows high-priority recommendations prominently
 * 
 * Requirements: 8.5, 8.6
 */
export function InlineRecommendations({
  recommendations,
  onDismiss,
  onApply,
  maxVisible = 3,
  className,
}: InlineRecommendationsProps) {
  // Filter to show only high and medium priority recommendations
  const importantRecommendations = recommendations
    .filter(rec => rec.priority === 'high' || rec.priority === 'medium')
    .slice(0, maxVisible);
  
  if (importantRecommendations.length === 0) {
    return null;
  }
  
  return (
    <div className={className}>
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="w-4 h-4 text-purple-400" />
        <h3 className="text-sm font-semibold text-white">
          Recommendations for You
        </h3>
      </div>
      
      <div className="space-y-2">
        {importantRecommendations.map(recommendation => (
          <RecommendationCard
            key={recommendation.id}
            recommendation={recommendation}
            onDismiss={onDismiss}
            onApply={onApply}
          />
        ))}
      </div>
      
      {recommendations.length > maxVisible && (
        <p className="text-xs text-gray-500 mt-2 text-center">
          +{recommendations.length - maxVisible} more recommendations available
        </p>
      )}
    </div>
  );
}
