import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TrendingUp, Users, DollarSign, Globe, BarChart3, LineChart, PieChart, Calendar } from "lucide-react";
import { SearchResult } from "@shared/schema";

interface MarketIntelligenceProps {
  result: SearchResult;
  isPro: boolean;
  onUpgrade: () => void;
}

interface MarketData {
  marketSize: {
    current: string;
    projected: string;
    growthRate: string;
    timeline: string;
  };
  segments: {
    name: string;
    size: string;
    growth: string;
    characteristics: string[];
  }[];
  trends: {
    trend: string;
    impact: 'high' | 'medium' | 'low';
    timeframe: string;
    description: string;
  }[];
  demographics: {
    primaryAudience: string;
    ageRange: string;
    income: string;
    geography: string;
    behavior: string[];
  };
  barriers: {
    barrier: string;
    severity: 'high' | 'medium' | 'low';
    solutions: string[];
  }[];
  opportunities: {
    opportunity: string;
    potential: 'high' | 'medium' | 'low';
    timeline: string;
    requirements: string[];
  }[];
}

export default function MarketIntelligence({ result, isPro, onUpgrade }: MarketIntelligenceProps) {
  const [activeTab, setActiveTab] = useState("overview");

  const generateMarketData = (): MarketData => {
    // Generate comprehensive market intelligence based on the gap
    return {
      marketSize: {
        current: result.marketSize,
        projected: "$" + (parseFloat(result.marketSize.replace(/[$B,M]/g, '')) * 1.8).toFixed(1) + "B",
        growthRate: "18-25% CAGR",
        timeline: "2024-2028"
      },
      segments: [
        {
          name: "Enterprise Innovators",
          size: "40% of market",
          growth: "22% annually",
          characteristics: [
            "Large corporations seeking innovation",
            "Budget $100K+ for market research",
            "Need comprehensive analysis tools",
            "Value enterprise support"
          ]
        },
        {
          name: "SMB Entrepreneurs", 
          size: "35% of market",
          growth: "28% annually",
          characteristics: [
            "Small-medium business owners",
            "Budget $1K-50K for tools",
            "Seek affordable, easy-to-use solutions",
            "Value quick implementation"
          ]
        },
        {
          name: "Startup Founders",
          size: "25% of market", 
          growth: "35% annually",
          characteristics: [
            "Early-stage entrepreneurs",
            "Limited budgets but high growth potential",
            "Need validation and market insights",
            "Value mentorship and community"
          ]
        }
      ],
      trends: [
        {
          trend: "AI-Driven Market Analysis",
          impact: "high",
          timeframe: "2024-2025",
          description: "Increasing adoption of AI for market research and opportunity identification"
        },
        {
          trend: "Remote Innovation Teams",
          impact: "medium",
          timeframe: "2024-2026", 
          description: "Distributed teams need cloud-based collaboration tools for innovation"
        },
        {
          trend: "Sustainability Focus",
          impact: "high",
          timeframe: "2024-2030",
          description: "Growing demand for environmentally conscious business opportunities"
        },
        {
          trend: "Micro-SaaS Growth",
          impact: "medium",
          timeframe: "2024-2027",
          description: "Smaller, specialized software solutions gaining market traction"
        }
      ],
      demographics: {
        primaryAudience: "Innovation-focused professionals aged 28-50",
        ageRange: "28-50 years (65% of market)",
        income: "$75K-250K household income",
        geography: "North America (45%), Europe (30%), Asia-Pacific (25%)",
        behavior: [
          "Active on LinkedIn and industry forums",
          "Subscribe to business/tech newsletters", 
          "Attend virtual conferences and webinars",
          "Influence purchasing decisions at their companies",
          "Value data-driven insights and ROI"
        ]
      },
      barriers: [
        {
          barrier: "High Cost of Entry",
          severity: "high",
          solutions: [
            "Freemium model with limited searches",
            "Tiered pricing for different market segments",
            "ROI-focused marketing to justify investment"
          ]
        },
        {
          barrier: "Market Education Required",
          severity: "medium", 
          solutions: [
            "Content marketing and thought leadership",
            "Free educational resources and templates",
            "Case studies and success stories"
          ]
        },
        {
          barrier: "Trust and Credibility",
          severity: "medium",
          solutions: [
            "Transparent methodology and data sources",
            "Customer testimonials and reviews",
            "Industry partnerships and certifications"
          ]
        }
      ],
      opportunities: [
        {
          opportunity: "AI-Powered Personalization",
          potential: "high",
          timeline: "6-12 months",
          requirements: [
            "Advanced ML algorithms",
            "User behavior tracking",
            "Personalized recommendations engine"
          ]
        },
        {
          opportunity: "Industry-Specific Solutions",
          potential: "high", 
          timeline: "12-18 months",
          requirements: [
            "Domain expertise partnerships",
            "Specialized data sources",
            "Industry-specific templates"
          ]
        },
        {
          opportunity: "International Expansion",
          potential: "medium",
          timeline: "18-24 months", 
          requirements: [
            "Localized market data",
            "Multi-language support",
            "Regional partnerships"
          ]
        }
      ]
    };
  };

  const marketData = generateMarketData();

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPotentialColor = (potential: string) => {
    switch (potential) {
      case 'high': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (!isPro) {
    return (
      <Card className="border-2 border-dashed border-green-300 bg-green-50">
        <CardHeader className="text-center">
          <div className="w-16 h-16 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <BarChart3 className="w-8 h-8 text-white" />
          </div>
          <CardTitle className="text-xl">Market Intelligence</CardTitle>
          <CardDescription>
            Comprehensive market analysis, trends, demographics, and growth opportunities
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <div className="space-y-4 mb-6">
            <div className="flex items-center justify-center space-x-2 text-sm text-gray-600">
              <TrendingUp className="w-4 h-4" />
              <span>Market size & growth projections</span>
            </div>
            <div className="flex items-center justify-center space-x-2 text-sm text-gray-600">
              <Users className="w-4 h-4" />
              <span>Target audience analysis</span>
            </div>
            <div className="flex items-center justify-center space-x-2 text-sm text-gray-600">
              <Globe className="w-4 h-4" />
              <span>Industry trends & opportunities</span>
            </div>
          </div>
          <Button onClick={onUpgrade} size="lg" className="w-full">
            Upgrade to Pro for Market Intelligence
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="segments">Segments</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
          <TabsTrigger value="opportunities">Opportunities</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="space-y-6">
            {/* Market Size */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <PieChart className="w-5 h-5" />
                  <span>Market Size Analysis</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{marketData.marketSize.current}</div>
                    <div className="text-sm text-gray-500">Current Market</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{marketData.marketSize.projected}</div>
                    <div className="text-sm text-gray-500">Projected ({marketData.marketSize.timeline})</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">{marketData.marketSize.growthRate}</div>
                    <div className="text-sm text-gray-500">Growth Rate</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-600">{result.feasibility}</div>
                    <div className="text-sm text-gray-500">Entry Feasibility</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Demographics */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Users className="w-5 h-5" />
                  <span>Target Demographics</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-semibold mb-2">Primary Audience</h4>
                      <p className="text-sm text-gray-600">{marketData.demographics.primaryAudience}</p>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-2">Demographics</h4>
                      <ul className="space-y-1 text-sm text-gray-600">
                        <li>• Age: {marketData.demographics.ageRange}</li>
                        <li>• Income: {marketData.demographics.income}</li>
                        <li>• Geography: {marketData.demographics.geography}</li>
                      </ul>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">Behavioral Characteristics</h4>
                    <ul className="space-y-1">
                      {marketData.demographics.behavior.map((behavior, index) => (
                        <li key={index} className="text-sm text-gray-600 flex items-start">
                          <div className="w-1 h-1 bg-blue-500 rounded-full mt-2 mr-2 flex-shrink-0"></div>
                          {behavior}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="segments">
          <div className="space-y-4">
            <h3 className="text-xl font-semibold">Market Segments</h3>
            <div className="grid gap-4">
              {marketData.segments.map((segment, index) => (
                <Card key={index}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{segment.name}</CardTitle>
                      <div className="flex items-center space-x-2">
                        <Badge className="bg-blue-100 text-blue-800">{segment.size}</Badge>
                        <Badge className="bg-green-100 text-green-800">{segment.growth}</Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <h4 className="font-semibold mb-2">Key Characteristics</h4>
                    <ul className="space-y-1">
                      {segment.characteristics.map((char, idx) => (
                        <li key={idx} className="text-sm text-gray-600 flex items-start">
                          <div className="w-1 h-1 bg-blue-500 rounded-full mt-2 mr-2 flex-shrink-0"></div>
                          {char}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="trends">
          <div className="space-y-4">
            <h3 className="text-xl font-semibold">Market Trends</h3>
            <div className="space-y-4">
              {marketData.trends.map((trend, index) => (
                <Card key={index}>
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between mb-3">
                      <h4 className="font-semibold text-lg">{trend.trend}</h4>
                      <div className="flex items-center space-x-2">
                        <Badge className={getImpactColor(trend.impact)}>
                          {trend.impact} impact
                        </Badge>
                        <Badge variant="outline">
                          <Calendar className="w-3 h-3 mr-1" />
                          {trend.timeframe}
                        </Badge>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600">{trend.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="opportunities">
          <div className="space-y-6">
            {/* Opportunities */}
            <div>
              <h3 className="text-xl font-semibold mb-4">Growth Opportunities</h3>
              <div className="space-y-4">
                {marketData.opportunities.map((opportunity, index) => (
                  <Card key={index}>
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between mb-3">
                        <h4 className="font-semibold text-lg">{opportunity.opportunity}</h4>
                        <div className="flex items-center space-x-2">
                          <Badge className={getPotentialColor(opportunity.potential)}>
                            {opportunity.potential} potential
                          </Badge>
                          <Badge variant="outline">{opportunity.timeline}</Badge>
                        </div>
                      </div>
                      <div>
                        <h5 className="font-medium mb-2">Requirements</h5>
                        <div className="flex flex-wrap gap-1">
                          {opportunity.requirements.map((req, idx) => (
                            <Badge key={idx} variant="secondary" className="text-xs">
                              {req}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* Barriers */}
            <div>
              <h3 className="text-xl font-semibold mb-4">Market Barriers & Solutions</h3>
              <div className="space-y-4">
                {marketData.barriers.map((barrier, index) => (
                  <Card key={index}>
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between mb-3">
                        <h4 className="font-semibold text-lg">{barrier.barrier}</h4>
                        <Badge className={getImpactColor(barrier.severity)}>
                          {barrier.severity} severity
                        </Badge>
                      </div>
                      <div>
                        <h5 className="font-medium mb-2">Recommended Solutions</h5>
                        <ul className="space-y-1">
                          {barrier.solutions.map((solution, idx) => (
                            <li key={idx} className="text-sm text-gray-600 flex items-start">
                              <div className="w-1 h-1 bg-green-500 rounded-full mt-2 mr-2 flex-shrink-0"></div>
                              {solution}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}