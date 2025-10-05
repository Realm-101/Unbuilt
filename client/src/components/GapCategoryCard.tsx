import React, { useState } from "react";
import { 
  Bookmark, 
  Share2, 
  ArrowRight, 
  Lightbulb, 
  TrendingUp, 
  Target,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Users,
  BarChart3
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import type { SearchResult } from "@shared/schema";

interface GapCategoryCardProps {
  result: SearchResult;
  onSave: (id: number, isSaved: boolean) => void;
  onShare: (result: SearchResult) => void;
  onViewDetails: (result: SearchResult) => void;
}

export default function GapCategoryCard({ result, onSave, onShare, onViewDetails }: GapCategoryCardProps) {
  const [isSaved, setIsSaved] = useState(result.isSaved);
  const { toast } = useToast();

  const handleSave = () => {
    const newSavedState = !isSaved;
    setIsSaved(newSavedState);
    onSave(result.id, newSavedState);
    
    toast({
      title: newSavedState ? "Result saved" : "Result unsaved",
      description: newSavedState ? "Added to your saved results" : "Removed from saved results",
    });
  };

  // Map structured categories to display info
  const getCategoryInfo = (category: string) => {
    switch (category) {
      case "market":
        return {
          label: "Market Gap",
          color: "bg-blue-500/10 text-blue-400 border-blue-500/30",
          icon: <Users className="w-4 h-4" />
        };
      case "technology":
        return {
          label: "Technology Gap",
          color: "bg-purple-500/10 text-purple-400 border-purple-500/30",
          icon: <Sparkles className="w-4 h-4" />
        };
      case "ux":
        return {
          label: "UX Gap",
          color: "bg-green-500/10 text-green-400 border-green-500/30",
          icon: <Target className="w-4 h-4" />
        };
      case "business_model":
        return {
          label: "Business Model Gap",
          color: "bg-orange-500/10 text-orange-400 border-orange-500/30",
          icon: <BarChart3 className="w-4 h-4" />
        };
      default:
        return {
          label: "Market Gap",
          color: "bg-gray-500/10 text-gray-400 border-gray-500/30",
          icon: <Users className="w-4 h-4" />
        };
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "bg-green-500/10 text-green-400 border-green-500/50";
      case "medium":
        return "bg-yellow-500/10 text-yellow-400 border-yellow-500/50";
      case "low":
        return "bg-gray-500/10 text-gray-400 border-gray-500/50";
      default:
        return "bg-gray-500/10 text-gray-400 border-gray-500/50";
    }
  };

  const getFeasibilityColor = (feasibility: string) => {
    switch (feasibility) {
      case "high":
        return "text-green-400";
      case "medium":
        return "text-yellow-400";
      case "low":
        return "text-red-400";
      default:
        return "text-gray-400";
    }
  };

  const categoryInfo = getCategoryInfo(result.category);
  const confidenceScore = result.confidenceScore || 75;
  const priority = result.priority || "medium";
  const recommendations = (result.actionableRecommendations as string[] | null) || [];

  return (
    <Card className="bg-gray-800/50 border-gray-700 hover:border-gray-600 transition-all duration-200 hover:shadow-lg">
      <CardHeader className="pb-3 p-4 sm:p-6">
        <div className="flex items-start justify-between mb-3 gap-2">
          <div className="flex items-center gap-2 flex-wrap flex-1 min-w-0">
            <Badge className={`${categoryInfo.color} border flex items-center gap-1 text-xs`}>
              {categoryInfo.icon}
              <span className="hidden sm:inline">{categoryInfo.label}</span>
              <span className="sm:hidden">{categoryInfo.label.split(' ')[0]}</span>
            </Badge>
            <Badge className={`${getPriorityColor(priority)} border capitalize text-xs`}>
              {priority} Priority
            </Badge>
          </div>
          <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSave}
              className={`p-2 touch-manipulation min-w-[44px] min-h-[44px] ${isSaved ? 'text-orange-400' : 'text-gray-400 hover:text-orange-400'}`}
            >
              <Bookmark className={`w-4 h-4 ${isSaved ? 'fill-current' : ''}`} />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onShare(result)}
              className="p-2 text-gray-400 hover:text-orange-400 touch-manipulation min-w-[44px] min-h-[44px]"
            >
              <Share2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
        
        <h3 className="text-lg sm:text-xl font-semibold text-white mb-2">{result.title}</h3>
        
        {/* Confidence Score */}
        <div className="flex items-center gap-2 sm:gap-3 text-xs sm:text-sm">
          <span className="text-gray-400 flex-shrink-0">Confidence:</span>
          <div className="flex-1 max-w-[150px] sm:max-w-[200px]">
            <Progress value={confidenceScore} className="h-2" />
          </div>
          <span className="text-gray-300 font-medium flex-shrink-0">{confidenceScore}%</span>
        </div>
      </CardHeader>

      <CardContent className="space-y-3 sm:space-y-4 p-4 sm:p-6">
        {/* Description */}
        <p className="text-sm sm:text-base text-gray-300 leading-relaxed">{result.description}</p>
        
        {/* Key Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3">
          <div className="bg-gray-900/50 rounded-lg p-2 sm:p-3 border border-gray-700">
            <div className="flex items-center gap-1 sm:gap-2 mb-1">
              <Lightbulb className="w-3 h-3 sm:w-4 sm:h-4 text-orange-400" />
              <span className="text-xs text-gray-400">Innovation</span>
            </div>
            <p className="text-base sm:text-lg font-semibold text-white">{result.innovationScore}/10</p>
          </div>
          
          <div className="bg-gray-900/50 rounded-lg p-2 sm:p-3 border border-gray-700">
            <div className="flex items-center gap-1 sm:gap-2 mb-1">
              <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4 text-orange-400" />
              <span className="text-xs text-gray-400">Market Size</span>
            </div>
            <p className="text-xs sm:text-sm font-semibold text-white truncate">{result.marketSize}</p>
          </div>
          
          <div className="bg-gray-900/50 rounded-lg p-2 sm:p-3 border border-gray-700">
            <div className="flex items-center gap-1 sm:gap-2 mb-1">
              <CheckCircle2 className={`w-3 h-3 sm:w-4 sm:h-4 ${getFeasibilityColor(result.feasibility)}`} />
              <span className="text-xs text-gray-400">Feasibility</span>
            </div>
            <p className={`text-xs sm:text-sm font-semibold capitalize ${getFeasibilityColor(result.feasibility)}`}>
              {result.feasibility}
            </p>
          </div>
          
          <div className="bg-gray-900/50 rounded-lg p-2 sm:p-3 border border-gray-700">
            <div className="flex items-center gap-1 sm:gap-2 mb-1">
              <Target className={`w-3 h-3 sm:w-4 sm:h-4 ${getFeasibilityColor(result.marketPotential)}`} />
              <span className="text-xs text-gray-400">Potential</span>
            </div>
            <p className={`text-xs sm:text-sm font-semibold capitalize ${getFeasibilityColor(result.marketPotential)}`}>
              {result.marketPotential}
            </p>
          </div>
        </div>

        {/* Gap Reason */}
        <div className="bg-gray-900/30 border-l-4 border-orange-500 pl-3 sm:pl-4 py-2 sm:py-3 rounded-r">
          <h4 className="font-medium text-white mb-1 text-xs sm:text-sm">Why This Gap Exists:</h4>
          <p className="text-xs sm:text-sm text-gray-300">{result.gapReason}</p>
        </div>

        {/* Actionable Recommendations */}
        {recommendations.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium text-white text-xs sm:text-sm flex items-center gap-2">
              <AlertCircle className="w-3 h-3 sm:w-4 sm:h-4 text-orange-400" />
              Actionable Recommendations:
            </h4>
            <ul className="space-y-1.5">
              {recommendations.slice(0, 3).map((rec: string, index: number) => (
                <li key={index} className="flex items-start gap-2 text-xs sm:text-sm text-gray-300">
                  <span className="text-orange-400 mt-0.5 flex-shrink-0">•</span>
                  <span>{rec}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Industry Context & Competitor Analysis */}
        {(result.industryContext || result.competitorAnalysis) && (
          <div className="grid sm:grid-cols-2 gap-2 sm:gap-3 pt-2">
            {result.industryContext && (
              <div className="text-xs sm:text-sm">
                <span className="text-gray-400 font-medium">Industry: </span>
                <span className="text-gray-300">{result.industryContext}</span>
              </div>
            )}
            {result.competitorAnalysis && (
              <div className="text-xs sm:text-sm">
                <span className="text-gray-400 font-medium">Competition: </span>
                <span className="text-gray-300">{result.competitorAnalysis}</span>
              </div>
            )}
          </div>
        )}

        {/* Action Button */}
        <div className="flex justify-end pt-2">
          <Button 
            variant="ghost" 
            className="text-orange-400 hover:text-orange-300 hover:bg-orange-400/10 touch-manipulation min-h-[44px] text-sm"
            onClick={() => onViewDetails(result)}
          >
            View Full Analysis <ArrowRight className="w-3 h-3 sm:w-4 sm:h-4 ml-2" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
