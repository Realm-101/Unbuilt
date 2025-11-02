import React from 'react';
import { 
  AlertCircle, 
  CheckCircle2, 
  Lightbulb, 
  TrendingUp, 
  Trophy,
  Clock,
  X,
  ChevronRight,
  Sparkles
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { Recommendation } from '@/types/action-plan';

interface RecommendationCardProps {
  recommendation: Recommendation;
  onDismiss?: (recommendationId: string) => void;
  onApply?: (recommendation: Recommendation) => void;
  className?: string;
}

/**
 * RecommendationCard Component
 * 
 * Displays a single recommendation with:
 * - Type-specific icon and styling
 * - Priority-based visual treatment
 * - Dismiss action
 * - Apply suggestion action (if actionable)
 * - Expandable details
 * 
 * Requirements: 8.5, 8.6
 */
export function RecommendationCard({
  recommendation,
  onDismiss,
  onApply,
  className,
}: RecommendationCardProps) {
  const [isExpanded, setIsExpanded] = React.useState(false);
  
  // Get icon based on recommendation type
  const getIcon = () => {
    switch (recommendation.type) {
      case 'stuck_task':
        return <AlertCircle className="w-5 h-5" />;
      case 'phase_complete':
        return <CheckCircle2 className="w-5 h-5" />;
      case 'plan_review':
        return <AlertCircle className="w-5 h-5" />;
      case 'task_tip':
        return <Lightbulb className="w-5 h-5" />;
      case 'fast_progress':
        return <Trophy className="w-5 h-5" />;
      case 'timeline_adjustment':
        return <Clock className="w-5 h-5" />;
      default:
        return <Sparkles className="w-5 h-5" />;
    }
  };
  
  // Get color scheme based on priority and type
  const getColorScheme = () => {
    // Fast progress and phase complete are always positive
    if (recommendation.type === 'fast_progress' || recommendation.type === 'phase_complete') {
      return {
        border: 'border-green-500/50',
        bg: 'bg-green-500/10',
        icon: 'text-green-400',
        title: 'text-green-400',
        button: 'border-green-500/50 hover:bg-green-500/10 text-green-400',
      };
    }
    
    // Priority-based colors for other types
    switch (recommendation.priority) {
      case 'high':
        return {
          border: 'border-red-500/50',
          bg: 'bg-red-500/10',
          icon: 'text-red-400',
          title: 'text-red-400',
          button: 'border-red-500/50 hover:bg-red-500/10 text-red-400',
        };
      case 'medium':
        return {
          border: 'border-orange-500/50',
          bg: 'bg-orange-500/10',
          icon: 'text-orange-400',
          title: 'text-orange-400',
          button: 'border-orange-500/50 hover:bg-orange-500/10 text-orange-400',
        };
      case 'low':
        return {
          border: 'border-blue-500/50',
          bg: 'bg-blue-500/10',
          icon: 'text-blue-400',
          title: 'text-blue-400',
          button: 'border-blue-500/50 hover:bg-blue-500/10 text-blue-400',
        };
    }
  };
  
  const colors = getColorScheme();
  
  // Handle apply action
  const handleApply = () => {
    if (onApply) {
      onApply(recommendation);
    }
  };
  
  // Handle dismiss action
  const handleDismiss = () => {
    if (onDismiss) {
      onDismiss(recommendation.id);
    }
  };
  
  return (
    <Card
      className={cn(
        'flame-card transition-all duration-300 hover:shadow-lg',
        colors.border,
        colors.bg,
        className
      )}
      data-testid={`recommendation-card-${recommendation.id}`}
    >
      <CardContent className="pt-4 pb-4">
        <div className="space-y-3">
          {/* Header */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 flex-1 min-w-0">
              {/* Icon */}
              <div className={cn('flex-shrink-0 mt-0.5', colors.icon)}>
                {getIcon()}
              </div>
              
              {/* Content */}
              <div className="flex-1 min-w-0">
                <h4 className={cn('font-semibold text-sm mb-1', colors.title)}>
                  {recommendation.title}
                </h4>
                <p className="text-sm text-gray-300 leading-relaxed">
                  {recommendation.message}
                </p>
              </div>
            </div>
            
            {/* Dismiss Button */}
            {onDismiss && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDismiss}
                className="flex-shrink-0 h-8 w-8 p-0 hover:bg-white/10"
                aria-label="Dismiss recommendation"
              >
                <X className="w-4 h-4 text-gray-400" />
              </Button>
            )}
          </div>
          
          {/* Suggestions (if available and expanded) */}
          {recommendation.metadata?.suggestions && recommendation.metadata.suggestions.length > 0 && (
            <div className="space-y-2">
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="flex items-center gap-2 text-xs text-gray-400 hover:text-gray-300 transition-colors"
              >
                <ChevronRight
                  className={cn(
                    'w-3 h-3 transition-transform',
                    isExpanded && 'rotate-90'
                  )}
                />
                <span>
                  {isExpanded ? 'Hide' : 'Show'} suggestions ({recommendation.metadata.suggestions.length})
                </span>
              </button>
              
              {isExpanded && (
                <ul className="space-y-1.5 pl-5 animate-in fade-in slide-in-from-top-2 duration-200">
                  {recommendation.metadata.suggestions.map((suggestion, index) => (
                    <li
                      key={index}
                      className="text-xs text-gray-400 leading-relaxed flex items-start gap-2"
                    >
                      <span className="text-purple-400 mt-0.5">•</span>
                      <span>{suggestion}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
          
          {/* Resources (if available) */}
          {recommendation.metadata?.resources && recommendation.metadata.resources.length > 0 && (
            <div className="pt-2 border-t border-gray-800">
              <p className="text-xs text-gray-400 mb-2">Recommended resources:</p>
              <div className="space-y-1">
                {recommendation.metadata.resources.slice(0, 3).map((resource: any, index: number) => (
                  <a
                    key={index}
                    href={resource.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block text-xs text-purple-400 hover:text-purple-300 transition-colors truncate"
                  >
                    {resource.name || resource.title}
                  </a>
                ))}
              </div>
            </div>
          )}
          
          {/* Actions */}
          {recommendation.actionable && onApply && (
            <div className="pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleApply}
                className={cn('w-full text-xs', colors.button)}
              >
                <TrendingUp className="w-3 h-3 mr-2" />
                Apply Suggestion
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
