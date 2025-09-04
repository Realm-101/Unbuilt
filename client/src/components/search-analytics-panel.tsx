import React from "react";
import { TrendingUp, Target, Lightbulb, BarChart3, Users, DollarSign } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import type { SearchResult } from "@shared/schema";

interface SearchAnalyticsPanelProps {
  results: SearchResult[];
  query: string;
}

export default function SearchAnalyticsPanel({ results, query }: SearchAnalyticsPanelProps) {
  // Calculate analytics
  const totalOpportunities = results.length;
  const highFeasibilityCount = results.filter(r => r.feasibility === 'high').length;
  const highMarketPotentialCount = results.filter(r => r.marketPotential === 'high').length;
  const averageInnovationScore = results.length > 0 
    ? Math.round(results.reduce((sum, r) => sum + r.innovationScore, 0) / results.length)
    : 0;

  // Category distribution
  const categoryDistribution = results.reduce((acc, result) => {
    acc[result.category] = (acc[result.category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Top opportunities (highest combined scores)
  const topOpportunities = [...results]
    .sort((a, b) => {
      const scoreA = a.innovationScore + (a.feasibility === 'high' ? 3 : a.feasibility === 'medium' ? 2 : 1);
      const scoreB = b.innovationScore + (b.feasibility === 'high' ? 3 : b.feasibility === 'medium' ? 2 : 1);
      return scoreB - scoreA;
    })
    .slice(0, 3);

  // Market insights
  const marketInsights = [
    {
      icon: Target,
      title: "High-Impact Opportunities",
      value: `${highFeasibilityCount} of ${totalOpportunities}`,
      description: "Have high feasibility ratings",
      percentage: totalOpportunities > 0 ? Math.round((highFeasibilityCount / totalOpportunities) * 100) : 0
    },
    {
      icon: TrendingUp,
      title: "Market Potential",
      value: `${highMarketPotentialCount} of ${totalOpportunities}`,
      description: "Show high market potential",
      percentage: totalOpportunities > 0 ? Math.round((highMarketPotentialCount / totalOpportunities) * 100) : 0
    },
    {
      icon: Lightbulb,
      title: "Innovation Score",
      value: `${averageInnovationScore}/10`,
      description: "Average innovation rating",
      percentage: averageInnovationScore * 10
    }
  ];

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "Tech That's Missing":
        return "from-purple-500 to-pink-500";
      case "Services That Don't Exist":
        return "from-green-400 to-blue-500";
      case "Products Nobody's Made":
        return "from-orange-400 to-red-500";
      case "Business Models":
        return "from-blue-400 to-purple-500";
      default:
        return "from-gray-400 to-gray-600";
    }
  };

  return (
    <div className="space-y-6">
      {/* Market Intelligence Summary */}
      <Card className="neon-flame-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 flame-text">
            <BarChart3 className="w-5 h-5" />
            Market Intelligence Summary
          </CardTitle>
          <CardDescription>
            Strategic insights for "{query}" opportunities
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {marketInsights.map((insight, index) => (
              <div key={index} className="text-center p-4 rounded-lg bg-gradient-to-br from-black to-gray-900 border border-gray-700">
                <insight.icon className="w-8 h-8 mx-auto mb-3 text-orange-400" />
                <div className="text-2xl font-bold text-white mb-1">{insight.value}</div>
                <div className="text-sm text-gray-300 mb-3">{insight.description}</div>
                <Progress value={insight.percentage} className="h-2" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Opportunity Distribution */}
      <Card className="neon-flame-border">
        <CardHeader>
          <CardTitle className="flame-text">Opportunity Distribution</CardTitle>
          <CardDescription>
            Breakdown by category and potential
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Object.entries(categoryDistribution).map(([category, count]) => (
              <div key={category} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-4 h-4 rounded bg-gradient-to-r ${getCategoryColor(category)}`}></div>
                  <span className="text-white font-medium">{category}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="bg-gray-800 text-gray-200 border-gray-700">
                    {count} opportunities
                  </Badge>
                  <div className="text-sm text-gray-400">
                    {Math.round((count / totalOpportunities) * 100)}%
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Top Strategic Opportunities */}
      <Card className="neon-flame-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 flame-text">
            <Target className="w-5 h-5" />
            Strategic Priorities
          </CardTitle>
          <CardDescription>
            Highest-potential opportunities to pursue first
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {topOpportunities.map((opportunity, index) => (
              <div key={opportunity.id} className="p-4 rounded-lg bg-gradient-to-br from-black to-gray-900 border border-gray-700">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-gradient-to-r from-orange-400 to-red-500 flex items-center justify-center text-white text-sm font-bold">
                      {index + 1}
                    </div>
                    <h4 className="font-medium text-white">{opportunity.title}</h4>
                  </div>
                  <Badge className="bg-orange-600 text-white border-orange-500">
                    Score: {opportunity.innovationScore}
                  </Badge>
                </div>
                <p className="text-sm text-gray-300 mb-3">{opportunity.description}</p>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400">Feasibility:</span>
                    <Badge variant={opportunity.feasibility === 'high' ? 'default' : 'secondary'}>
                      {opportunity.feasibility}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400">Market:</span>
                    <Badge variant={opportunity.marketPotential === 'high' ? 'default' : 'secondary'}>
                      {opportunity.marketPotential}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400">Size:</span>
                    <span className="text-sm text-orange-400 font-medium">{opportunity.marketSize}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Quick Action Insights */}
      <Card className="neon-flame-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 flame-text">
            <Users className="w-5 h-5" />
            Execution Recommendations
          </CardTitle>
          <CardDescription>
            Strategic advice for turning insights into action
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {highFeasibilityCount > 0 && (
              <div className="flex items-start gap-3 p-3 rounded-lg bg-green-900/20 border border-green-700">
                <Target className="w-5 h-5 text-green-400 mt-0.5" />
                <div>
                  <div className="text-sm font-medium text-green-400">Start with High-Feasibility Opportunities</div>
                  <div className="text-sm text-gray-300">Focus on the {highFeasibilityCount} high-feasibility opportunities for quick wins</div>
                </div>
              </div>
            )}
            
            {averageInnovationScore >= 7 && (
              <div className="flex items-start gap-3 p-3 rounded-lg bg-blue-900/20 border border-blue-700">
                <Lightbulb className="w-5 h-5 text-blue-400 mt-0.5" />
                <div>
                  <div className="text-sm font-medium text-blue-400">Strong Innovation Potential</div>
                  <div className="text-sm text-gray-300">Average innovation score of {averageInnovationScore}/10 indicates promising market gaps</div>
                </div>
              </div>
            )}

            {Object.keys(categoryDistribution).length > 2 && (
              <div className="flex items-start gap-3 p-3 rounded-lg bg-purple-900/20 border border-purple-700">
                <BarChart3 className="w-5 h-5 text-purple-400 mt-0.5" />
                <div>
                  <div className="text-sm font-medium text-purple-400">Diversified Opportunities</div>
                  <div className="text-sm text-gray-300">Spread across {Object.keys(categoryDistribution).length} categories - consider portfolio approach</div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}