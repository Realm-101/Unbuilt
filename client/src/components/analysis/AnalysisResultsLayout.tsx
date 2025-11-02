import React from "react";
import { motion } from "framer-motion";
import { 
  Share2, Download, Heart, TrendingUp, Target, 
  DollarSign, Users, Lightbulb, AlertTriangle 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { SearchResult } from "@shared/schema";

export interface AnalysisResultsLayoutProps {
  result: SearchResult;
  onShare?: () => void;
  onExport?: (format: 'pdf' | 'csv') => void;
  onFavorite?: () => void;
  isPublicView?: boolean;
}

/**
 * AnalysisResultsLayout - Summary view with key metrics
 * 
 * Features:
 * - Innovation score gauge with visual indicator
 * - Feasibility rating and market potential indicators
 * - Key insight highlights (3-5 bullets)
 * - Share, export, and favorite buttons
 * 
 * Requirements: 3.1
 */
export const AnalysisResultsLayout: React.FC<AnalysisResultsLayoutProps> = ({
  result,
  onShare,
  onExport,
  onFavorite,
  isPublicView = false,
}) => {
  // Calculate innovation score color
  const getScoreColor = (score: number): string => {
    if (score >= 8) return "text-green-500";
    if (score >= 6) return "text-yellow-500";
    return "text-orange-500";
  };

  // Get feasibility badge color
  const getFeasibilityColor = (feasibility: string): string => {
    switch (feasibility) {
      case 'high': return "bg-green-500/20 text-green-300 border-green-500/30";
      case 'medium': return "bg-yellow-500/20 text-yellow-300 border-yellow-500/30";
      case 'low': return "bg-red-500/20 text-red-300 border-red-500/30";
      default: return "bg-gray-500/20 text-gray-300 border-gray-500/30";
    }
  };

  // Get market potential badge color
  const getMarketPotentialColor = (potential: string): string => {
    switch (potential) {
      case 'high': return "bg-purple-500/20 text-purple-300 border-purple-500/30";
      case 'medium': return "bg-blue-500/20 text-blue-300 border-blue-500/30";
      case 'low': return "bg-gray-500/20 text-gray-300 border-gray-500/30";
      default: return "bg-gray-500/20 text-gray-300 border-gray-500/30";
    }
  };

  // Extract key insights from description and recommendations
  const getKeyInsights = (): string[] => {
    const insights: string[] = [];
    
    // Add gap reason as first insight
    if (result.gapReason) {
      insights.push(result.gapReason);
    }
    
    // Add actionable recommendations
    if (result.actionableRecommendations && Array.isArray(result.actionableRecommendations)) {
      insights.push(...(result.actionableRecommendations as string[]).slice(0, 3));
    }
    
    // Limit to 5 insights
    return insights.slice(0, 5);
  };

  const keyInsights = getKeyInsights();

  return (
    <div className="space-y-6">
      {/* Header with Title and Actions */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">
            {result.title}
          </h1>
          <p className="text-gray-400 text-sm sm:text-base">
            {result.description}
          </p>
        </div>
        
        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={onFavorite}
            className="border-gray-700 text-gray-300 hover:bg-gray-800"
            aria-label={result.isSaved ? "Remove from favorites" : "Add to favorites"}
          >
            <Heart 
              className={`w-4 h-4 ${result.isSaved ? 'fill-red-500 text-red-500' : ''}`} 
            />
          </Button>
          
          {!isPublicView && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={onShare}
                className="border-gray-700 text-gray-300 hover:bg-gray-800"
              >
                <Share2 className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">Share</span>
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => onExport?.('pdf')}
                className="border-gray-700 text-gray-300 hover:bg-gray-800"
              >
                <Download className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">Export</span>
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Innovation Score */}
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-400 flex items-center gap-2">
              <Lightbulb className="w-4 h-4" />
              Innovation Score
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-2">
              <span className={`text-4xl font-bold ${getScoreColor(result.innovationScore)}`}>
                {result.innovationScore}
              </span>
              <span className="text-gray-500 text-lg mb-1">/10</span>
            </div>
            <Progress 
              value={result.innovationScore * 10} 
              className="mt-3 h-2"
            />
          </CardContent>
        </Card>

        {/* Feasibility Rating */}
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-400 flex items-center gap-2">
              <Target className="w-4 h-4" />
              Feasibility
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Badge className={`${getFeasibilityColor(result.feasibility)} text-lg px-3 py-1 capitalize`}>
              {result.feasibility}
            </Badge>
            <p className="text-xs text-gray-500 mt-2">
              Implementation difficulty
            </p>
          </CardContent>
        </Card>

        {/* Market Potential */}
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-400 flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Market Potential
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Badge className={`${getMarketPotentialColor(result.marketPotential)} text-lg px-3 py-1 capitalize`}>
              {result.marketPotential}
            </Badge>
            <p className="text-xs text-gray-500 mt-2">
              Growth opportunity
            </p>
          </CardContent>
        </Card>

        {/* Market Size */}
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-400 flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              Market Size
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {result.marketSize}
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Total addressable market
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Key Insights Highlights */}
      {keyInsights.length > 0 && (
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-white flex items-center gap-2">
              <Lightbulb className="w-5 h-5 text-yellow-500" />
              Key Insights
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {keyInsights.map((insight, index) => (
                <motion.li
                  key={index}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-start gap-3"
                >
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-purple-500/20 flex items-center justify-center mt-0.5">
                    <span className="text-xs font-bold text-purple-300">
                      {index + 1}
                    </span>
                  </div>
                  <p className="text-gray-300 text-sm flex-1">
                    {insight}
                  </p>
                </motion.li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Category and Priority Badges */}
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline" className="border-gray-700 text-gray-300 capitalize">
          {result.category.replace('_', ' ')}
        </Badge>
        
        {result.priority && (
          <Badge 
            className={`capitalize ${
              result.priority === 'high' 
                ? 'bg-red-500/20 text-red-300 border-red-500/30'
                : result.priority === 'medium'
                ? 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30'
                : 'bg-gray-500/20 text-gray-300 border-gray-500/30'
            }`}
          >
            {result.priority} Priority
          </Badge>
        )}
        
        {result.confidenceScore && (
          <Badge variant="outline" className="border-gray-700 text-gray-300">
            {result.confidenceScore}% Confidence
          </Badge>
        )}
      </div>
    </div>
  );
};
