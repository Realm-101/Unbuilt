import React, { useState } from "react";
import { Bookmark, Share2, ArrowRight, Lightbulb, TrendingUp, Crown, Zap, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import type { SearchResult } from "@shared/schema";

interface ResultCardProps {
  result: SearchResult;
  onSave: (id: number, isSaved: boolean) => void;
  onShare: (result: SearchResult) => void;
  onViewDetails: (result: SearchResult) => void;
}

export default function ResultCard({ result, onSave, onShare, onViewDetails }: ResultCardProps) {
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

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "Tech That's Missing":
        return "bg-blue-100 text-blue-800";
      case "Services That Don't Exist":
        return "bg-green-100 text-green-800";
      case "Products Nobody's Made":
        return "bg-purple-100 text-purple-800";
      case "Business Models":
        return "bg-orange-100 text-orange-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getFeasibilityColor = (feasibility: string) => {
    switch (feasibility) {
      case "high":
        return "bg-green-500";
      case "medium":
        return "bg-yellow-500";
      case "low":
        return "bg-red-500";
      default:
        return "bg-gray-500";
    }
  };

  const getMarketPotentialColor = (potential: string) => {
    switch (potential) {
      case "high":
        return "bg-green-500";
      case "medium":
        return "bg-yellow-500";
      case "low":
        return "bg-red-500";
      default:
        return "bg-gray-500";
    }
  };

  const getBorderColor = (category: string) => {
    switch (category) {
      case "Tech That's Missing":
        return "border-blue-500";
      case "Services That Don't Exist":
        return "border-green-500";
      case "Products Nobody's Made":
        return "border-purple-500";
      case "Business Models":
        return "border-orange-500";
      default:
        return "border-gray-500";
    }
  };

  return (
    <div className="bg-gray-800 rounded-lg border border-gray-700 shadow-sm hover:shadow-md transition-shadow p-6 neon-flame-border">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3">
          <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${getCategoryColor(result.category)}`}>
            {result.category}
          </span>
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${getFeasibilityColor(result.feasibility)}`}></div>
            <span className="text-xs text-gray-300 capitalize">{result.feasibility} Feasibility</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${getMarketPotentialColor(result.marketPotential)}`}></div>
            <span className="text-xs text-gray-300 capitalize">{result.marketPotential} Market Potential</span>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSave}
            className={`p-2 ${isSaved ? 'text-orange-400' : 'text-gray-400 hover:text-orange-400'}`}
          >
            <Bookmark className={`w-4 h-4 ${isSaved ? 'fill-current' : ''}`} />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onShare(result)}
            className="p-2 text-gray-400 hover:text-orange-400"
          >
            <Share2 className="w-4 h-4" />
          </Button>
        </div>
      </div>
      
      <h3 className="text-lg font-medium text-white mb-3">{result.title}</h3>
      <p className="text-gray-300 mb-4">{result.description}</p>
      
      <div className={`border-l-4 ${getBorderColor(result.category)} pl-4 mb-4`}>
        <h4 className="font-medium text-white mb-2">Why This Gap Exists:</h4>
        <p className="text-sm text-gray-300">{result.gapReason}</p>
      </div>
      
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="flex items-center text-sm text-gray-300">
            <Lightbulb className="w-4 h-4 mr-1 text-orange-400" />
            Innovation Score: {result.innovationScore}/10
          </div>
          <div className="flex items-center text-sm text-gray-300">
            <TrendingUp className="w-4 h-4 mr-1 text-orange-400" />
            Market Size: {result.marketSize}
          </div>
        </div>
        <Button 
          variant="ghost" 
          className="text-orange-400 hover:text-orange-300 text-sm font-medium"
          onClick={() => onViewDetails(result)}
        >
          Action Plan <ArrowRight className="w-4 h-4 ml-1" />
        </Button>
      </div>
    </div>
  );
}
