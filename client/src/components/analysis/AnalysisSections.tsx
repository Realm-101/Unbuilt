import React from "react";
import { 
  Users, TrendingUp, AlertTriangle, Target, 
  BarChart3, Globe, Zap, Lightbulb
} from "lucide-react";
import { ExpandableSection } from "@/components/ui/expandable-section";
import { TabbedContent, TabDefinition } from "@/components/ui/tabbed-content";
import { EnhancedAccordion, AccordionItemData } from "@/components/ui/enhanced-accordion";
import { Card, CardContent } from "@/components/ui/card";
import { useTouchFriendly } from "@/hooks/useTouchFriendly";
import { cn } from "@/lib/utils";
import type { SearchResult } from "@shared/schema";

export interface AnalysisSectionsProps {
  result: SearchResult;
  isPublicView?: boolean;
}

/**
 * AnalysisSections - Expandable sections for detailed analysis
 * 
 * Features:
 * - Expandable section for competitive analysis with tabs
 * - Expandable section for market intelligence with tabs
 * - Expandable section for detailed insights with accordions
 * - Expandable section for risk assessment
 * - Persists expansion state in preferences
 * 
 * Requirements: 3.2, 3.3, 3.4, 3.5
 */
export const AnalysisSections: React.FC<AnalysisSectionsProps> = ({ result }) => {
  const { isMobile } = useTouchFriendly();
  
  // Parse competitor analysis if available
  const competitorData = React.useMemo(() => {
    if (!result.competitorAnalysis) return null;
    
    try {
      // If it's already an object, return it
      if (typeof result.competitorAnalysis === 'object') {
        return result.competitorAnalysis;
      }
      // Otherwise try to parse it
      return JSON.parse(result.competitorAnalysis);
    } catch {
      // If parsing fails, treat as plain text
      return { overview: result.competitorAnalysis };
    }
  }, [result.competitorAnalysis]);

  // Parse industry context if available
  const industryData = React.useMemo(() => {
    if (!result.industryContext) return null;
    
    try {
      if (typeof result.industryContext === 'object') {
        return result.industryContext;
      }
      return JSON.parse(result.industryContext);
    } catch {
      return { overview: result.industryContext };
    }
  }, [result.industryContext]);

  // Parse key trends
  const trends = React.useMemo(() => {
    if (!result.keyTrends) return [];
    if (Array.isArray(result.keyTrends)) return result.keyTrends as string[];
    return [];
  }, [result.keyTrends]);

  return (
    <div className={cn("space-y-3 sm:space-y-4", isMobile && "px-2")}>
      {/* Competitive Analysis Section */}
      {competitorData && (
        <ExpandableSection
          id={`competitive-analysis-${result.id}`}
          title="Competitive Analysis"
          icon={<Users className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500" />}
          summary="Understand the competitive landscape and market positioning"
          persistState={true}
          defaultExpanded={!isMobile}
          className="bg-gray-800 border-gray-700"
          headerClassName="bg-gray-800/50"
        >
          <CompetitiveAnalysisContent data={competitorData} isMobile={isMobile} />
        </ExpandableSection>
      )}

      {/* Market Intelligence Section */}
      {(industryData || result.targetAudience || trends.length > 0) && (
        <ExpandableSection
          id={`market-intelligence-${result.id}`}
          title="Market Intelligence"
          icon={<BarChart3 className="w-4 h-4 sm:w-5 sm:h-5 text-purple-500" />}
          summary="Deep dive into market demographics, size, and trends"
          persistState={true}
          defaultExpanded={!isMobile}
          className="bg-gray-800 border-gray-700"
          headerClassName="bg-gray-800/50"
        >
          <MarketIntelligenceContent 
            industryData={industryData}
            targetAudience={result.targetAudience}
            trends={trends}
            marketSize={result.marketSize}
            isMobile={isMobile}
          />
        </ExpandableSection>
      )}

      {/* Detailed Insights Section */}
      {result.actionableRecommendations && Array.isArray(result.actionableRecommendations) && 
       (result.actionableRecommendations as string[]).length > 0 && (
        <ExpandableSection
          id={`detailed-insights-${result.id}`}
          title="Detailed Insights & Recommendations"
          icon={<Lightbulb className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-500" />}
          badge={(result.actionableRecommendations as string[]).length}
          summary="Actionable recommendations and strategic insights"
          persistState={true}
          defaultExpanded={!isMobile}
          className="bg-gray-800 border-gray-700"
          headerClassName="bg-gray-800/50"
        >
          <DetailedInsightsContent recommendations={result.actionableRecommendations as string[]} />
        </ExpandableSection>
      )}

      {/* Risk Assessment Section */}
      <ExpandableSection
        id={`risk-assessment-${result.id}`}
        title="Risk Assessment"
        icon={<AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 text-orange-500" />}
        summary="Potential challenges and mitigation strategies"
        persistState={true}
        defaultExpanded={!isMobile}
        className="bg-gray-800 border-gray-700"
        headerClassName="bg-gray-800/50"
      >
        <RiskAssessmentContent 
          feasibility={result.feasibility}
          category={result.category}
        />
      </ExpandableSection>
    </div>
  );
};

// Competitive Analysis Content Component
const CompetitiveAnalysisContent: React.FC<{ data: any; isMobile: boolean }> = ({ data, isMobile }) => {
  const tabs: TabDefinition[] = [
    {
      id: 'overview',
      label: 'Overview',
      icon: <Globe className="w-4 h-4" />,
      content: (
        <div className="prose prose-invert max-w-none">
          <p className="text-gray-300">
            {data.overview || 'No overview available'}
          </p>
        </div>
      ),
    },
    {
      id: 'competitors',
      label: 'Competitors',
      icon: <Users className="w-4 h-4" />,
      content: (
        <div className="space-y-4">
          {data.competitors && Array.isArray(data.competitors) ? (
            data.competitors.map((competitor: any, index: number) => (
              <Card key={index} className="bg-gray-900 border-gray-700">
                <CardContent className="pt-4">
                  <h4 className="font-semibold text-white mb-2">
                    {competitor.name || `Competitor ${index + 1}`}
                  </h4>
                  <p className="text-gray-400 text-sm">
                    {competitor.description || competitor}
                  </p>
                </CardContent>
              </Card>
            ))
          ) : (
            <p className="text-gray-400">No competitor data available</p>
          )}
        </div>
      ),
    },
    {
      id: 'position',
      label: 'Market Position',
      icon: <Target className="w-4 h-4" />,
      content: (
        <div className="prose prose-invert max-w-none">
          <p className="text-gray-300">
            {data.marketPosition || data.position || 'No market position data available'}
          </p>
        </div>
      ),
    },
    {
      id: 'opportunities',
      label: 'Opportunities',
      icon: <Zap className="w-4 h-4" />,
      content: (
        <div className="space-y-3">
          {data.opportunities && Array.isArray(data.opportunities) ? (
            data.opportunities.map((opportunity: string, index: number) => (
              <div key={index} className="flex items-start gap-3">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center mt-0.5">
                  <Zap className="w-3 h-3 text-green-400" />
                </div>
                <p className="text-gray-300 text-sm flex-1">{opportunity}</p>
              </div>
            ))
          ) : (
            <p className="text-gray-400">No opportunity data available</p>
          )}
        </div>
      ),
    },
  ];

  return (
    <TabbedContent
      tabs={tabs}
      defaultTab="overview"
      persistSelection={true}
      persistKey="competitive-analysis"
      lazyLoad={true}
      enableSwipeGestures={isMobile}
      className={cn("mt-3 sm:mt-4")}
      tabListClassName={cn(isMobile && "text-sm")}
    />
  );
};

// Market Intelligence Content Component
const MarketIntelligenceContent: React.FC<{
  industryData: any;
  targetAudience?: string | null;
  trends: string[];
  marketSize: string;
  isMobile: boolean;
}> = ({ industryData, targetAudience, trends, marketSize, isMobile }) => {
  const tabs: TabDefinition[] = [
    {
      id: 'demographics',
      label: 'Demographics',
      icon: <Users className="w-4 h-4" />,
      content: (
        <div className="space-y-4">
          <div>
            <h4 className="font-semibold text-white mb-2">Target Audience</h4>
            <p className="text-gray-300">
              {targetAudience || 'No target audience data available'}
            </p>
          </div>
          {industryData?.demographics && (
            <div>
              <h4 className="font-semibold text-white mb-2">Demographics</h4>
              <p className="text-gray-300">{industryData.demographics}</p>
            </div>
          )}
        </div>
      ),
    },
    {
      id: 'market-size',
      label: 'Market Size',
      icon: <BarChart3 className="w-4 h-4" />,
      content: (
        <div className="space-y-4">
          <Card className="bg-gray-900 border-gray-700">
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-sm text-gray-400 mb-2">Total Addressable Market</p>
                <p className="text-3xl font-bold text-white">{marketSize}</p>
              </div>
            </CardContent>
          </Card>
          {industryData?.marketSize && (
            <div className="prose prose-invert max-w-none">
              <p className="text-gray-300">{industryData.marketSize}</p>
            </div>
          )}
        </div>
      ),
    },
    {
      id: 'trends',
      label: 'Trends',
      icon: <TrendingUp className="w-4 h-4" />,
      badge: trends.length > 0 ? trends.length : undefined,
      content: (
        <div className="space-y-3">
          {trends.length > 0 ? (
            trends.map((trend, index) => (
              <div key={index} className="flex items-start gap-3">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-purple-500/20 flex items-center justify-center mt-0.5">
                  <TrendingUp className="w-3 h-3 text-purple-400" />
                </div>
                <p className="text-gray-300 text-sm flex-1">{trend}</p>
              </div>
            ))
          ) : (
            <p className="text-gray-400">No trend data available</p>
          )}
        </div>
      ),
    },
  ];

  return (
    <TabbedContent
      tabs={tabs}
      defaultTab="demographics"
      persistSelection={true}
      persistKey="market-intelligence"
      lazyLoad={true}
      enableSwipeGestures={isMobile}
      className={cn("mt-3 sm:mt-4")}
      tabListClassName={cn(isMobile && "text-sm")}
    />
  );
};

// Detailed Insights Content Component
const DetailedInsightsContent: React.FC<{ recommendations: string[] }> = ({ recommendations }) => {
  const accordionItems: AccordionItemData[] = recommendations.map((rec, index) => ({
    id: `recommendation-${index}`,
    title: `Recommendation ${index + 1}`,
    content: (
      <p className="text-gray-300 text-sm leading-relaxed">{rec}</p>
    ),
  }));

  return (
    <EnhancedAccordion
      items={accordionItems}
      type="single"
      className="mt-4"
    />
  );
};

// Risk Assessment Content Component
const RiskAssessmentContent: React.FC<{
  feasibility: string;
  category: string;
}> = ({ feasibility, category }) => {
  // Generate risk insights based on feasibility and category
  const risks = React.useMemo(() => {
    const riskList: Array<{ level: 'high' | 'medium' | 'low'; title: string; description: string }> = [];

    // Feasibility-based risks
    if (feasibility === 'low') {
      riskList.push({
        level: 'high',
        title: 'Implementation Complexity',
        description: 'This opportunity has significant technical or operational challenges that may require substantial resources and expertise to overcome.',
      });
    } else if (feasibility === 'medium') {
      riskList.push({
        level: 'medium',
        title: 'Moderate Implementation Risk',
        description: 'While achievable, this opportunity requires careful planning and adequate resources to execute successfully.',
      });
    }

    // Category-based risks
    if (category === 'technology') {
      riskList.push({
        level: 'medium',
        title: 'Technology Evolution Risk',
        description: 'Rapid technological changes may impact the viability of this solution. Stay updated with emerging technologies.',
      });
    } else if (category === 'market') {
      riskList.push({
        level: 'medium',
        title: 'Market Dynamics',
        description: 'Market conditions and consumer preferences may shift. Regular market research and adaptability are crucial.',
      });
    }

    // Add general risks
    riskList.push({
      level: 'low',
      title: 'Competition Risk',
      description: 'New competitors may enter the market. Maintain competitive advantages through innovation and customer focus.',
    });

    return riskList;
  }, [feasibility, category]);

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'high': return 'bg-red-500/20 text-red-300 border-red-500/30';
      case 'medium': return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30';
      case 'low': return 'bg-green-500/20 text-green-300 border-green-500/30';
      default: return 'bg-gray-500/20 text-gray-300 border-gray-500/30';
    }
  };

  return (
    <div className="space-y-4 mt-4">
      {risks.map((risk, index) => (
        <Card key={index} className="bg-gray-900 border-gray-700">
          <CardContent className="pt-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
                risk.level === 'high' ? 'text-red-400' :
                risk.level === 'medium' ? 'text-yellow-400' :
                'text-green-400'
              }`} />
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h4 className="font-semibold text-white">{risk.title}</h4>
                  <span className={`text-xs px-2 py-0.5 rounded-full border capitalize ${getRiskColor(risk.level)}`}>
                    {risk.level} Risk
                  </span>
                </div>
                <p className="text-gray-400 text-sm">{risk.description}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
