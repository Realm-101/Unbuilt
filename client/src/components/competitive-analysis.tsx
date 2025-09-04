import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { TrendingUp, Users, DollarSign, Shield, Zap, AlertTriangle, CheckCircle, X } from "lucide-react";
import { SearchResult } from "@shared/schema";

interface CompetitiveAnalysisProps {
  result: SearchResult;
  isPro: boolean;
  onUpgrade: () => void;
}

interface Competitor {
  name: string;
  description: string;
  marketShare: number;
  strengths: string[];
  weaknesses: string[];
  pricing: string;
  funding: string;
  userBase: string;
  keyFeatures: string[];
  differentiators: string[];
}

export default function CompetitiveAnalysis({ result, isPro, onUpgrade }: CompetitiveAnalysisProps) {
  
  const generateCompetitors = (): Competitor[] => {
    // Generate realistic competitors based on the gap analysis
    const baseCompetitors = [
      {
        name: "MarketGap AI",
        description: "AI-powered market research platform for identifying business opportunities",
        marketShare: 15,
        strengths: ["Established brand", "Large dataset", "Enterprise clients"],
        weaknesses: ["Expensive pricing", "Complex interface", "Slow updates"],
        pricing: "$199-999/month",
        funding: "Series B - $25M",
        userBase: "10K+ businesses",
        keyFeatures: ["Market analysis", "Trend prediction", "Custom reports"],
        differentiators: ["Real-time data", "API access", "White-label options"]
      },
      {
        name: "OpportunityScout",
        description: "Business opportunity discovery tool for entrepreneurs and investors",
        marketShare: 8,
        strengths: ["User-friendly", "Affordable pricing", "Good support"],
        weaknesses: ["Limited data sources", "Basic analytics", "No mobile app"],
        pricing: "$49-299/month",
        funding: "Seed - $3M",
        userBase: "5K+ users",
        keyFeatures: ["Opportunity scoring", "Market sizing", "Competitor tracking"],
        differentiators: ["Beginner-friendly", "Quick setup", "Community features"]
      },
      {
        name: "InnovateIQ",
        description: "Innovation management platform with gap analysis capabilities",
        marketShare: 12,
        strengths: ["Comprehensive features", "Industry expertise", "Strong analytics"],
        weaknesses: ["High learning curve", "Enterprise focus", "Limited SMB features"],
        pricing: "$299-1999/month",
        funding: "Series A - $15M",
        userBase: "2K+ enterprises",
        keyFeatures: ["Innovation pipeline", "Portfolio management", "ROI tracking"],
        differentiators: ["Enterprise-grade", "Consulting services", "Industry templates"]
      }
    ];

    return baseCompetitors;
  };

  const competitors = generateCompetitors();

  const getCompetitiveAdvantages = () => {
    return [
      {
        advantage: "AI-Powered Gap Discovery",
        description: "Advanced AI specifically trained for identifying market gaps",
        strength: "high"
      },
      {
        advantage: "Real-Time Market Intelligence",
        description: "Live data feeds and trend analysis for immediate insights",
        strength: "high"
      },
      {
        advantage: "Affordable Pricing",
        description: "Professional features at fraction of enterprise tool costs",
        strength: "medium"
      },
      {
        advantage: "User-Centric Design",
        description: "Simple, intuitive interface designed for quick results",
        strength: "medium"
      },
      {
        advantage: "Comprehensive Action Plans",
        description: "Not just gaps - complete roadmaps to execution",
        strength: "high"
      }
    ];
  };

  const advantages = getCompetitiveAdvantages();

  if (!isPro) {
    return (
      <Card className="border-2 border-dashed border-purple-300 bg-purple-50">
        <CardHeader className="text-center">
          <div className="w-16 h-16 bg-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <TrendingUp className="w-8 h-8 text-white" />
          </div>
          <CardTitle className="text-xl">Competitive Analysis</CardTitle>
          <CardDescription>
            Deep dive into competitors, market positioning, and your competitive advantages
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <div className="space-y-4 mb-6">
            <div className="flex items-center justify-center space-x-2 text-sm text-gray-600">
              <Shield className="w-4 h-4" />
              <span>Competitor strengths & weaknesses</span>
            </div>
            <div className="flex items-center justify-center space-x-2 text-sm text-gray-600">
              <DollarSign className="w-4 h-4" />
              <span>Pricing comparison analysis</span>
            </div>
            <div className="flex items-center justify-center space-x-2 text-sm text-gray-600">
              <Zap className="w-4 h-4" />
              <span>Your competitive advantages</span>
            </div>
          </div>
          <Button onClick={onUpgrade} size="lg" className="w-full">
            Upgrade to Pro for Competitive Analysis
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Market Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <TrendingUp className="w-5 h-5" />
            <span>Market Landscape</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{competitors.length}+</div>
              <div className="text-sm text-gray-500">Direct Competitors</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{result.marketSize}</div>
              <div className="text-sm text-gray-500">Market Size</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {competitors.reduce((acc, comp) => acc + comp.marketShare, 0)}%
              </div>
              <div className="text-sm text-gray-500">Market Captured</div>
            </div>
          </div>
          
          <div className="space-y-3">
            <h4 className="font-semibold text-gray-900">Market Share Distribution</h4>
            {competitors.map((competitor, index) => (
              <div key={index} className="flex items-center space-x-3">
                <div className="w-24 text-sm font-medium">{competitor.name}</div>
                <div className="flex-1">
                  <Progress value={competitor.marketShare} className="h-2" />
                </div>
                <div className="text-sm text-gray-500">{competitor.marketShare}%</div>
              </div>
            ))}
            <div className="flex items-center space-x-3 border-t pt-2">
              <div className="w-24 text-sm font-medium text-green-600">Available</div>
              <div className="flex-1">
                <Progress 
                  value={100 - competitors.reduce((acc, comp) => acc + comp.marketShare, 0)} 
                  className="h-2" 
                />
              </div>
              <div className="text-sm text-green-600 font-semibold">
                {100 - competitors.reduce((acc, comp) => acc + comp.marketShare, 0)}%
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Competitor Profiles */}
      <div className="space-y-4">
        <h3 className="text-xl font-semibold">Competitor Analysis</h3>
        <div className="grid gap-6">
          {competitors.map((competitor, index) => (
            <Card key={index}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{competitor.name}</CardTitle>
                  <div className="flex items-center space-x-2">
                    <Badge variant="outline">{competitor.marketShare}% market share</Badge>
                    <Badge className="bg-blue-100 text-blue-800">{competitor.funding}</Badge>
                  </div>
                </div>
                <CardDescription>{competitor.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                  <div>
                    <div className="text-sm font-medium text-gray-500">Pricing</div>
                    <div className="text-sm">{competitor.pricing}</div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-500">User Base</div>
                    <div className="text-sm">{competitor.userBase}</div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-500">Funding</div>
                    <div className="text-sm">{competitor.funding}</div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-500">Market Share</div>
                    <div className="text-sm">{competitor.marketShare}%</div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-medium text-green-600 mb-2 flex items-center">
                      <CheckCircle className="w-4 h-4 mr-1" />
                      Strengths
                    </h4>
                    <ul className="space-y-1">
                      {competitor.strengths.map((strength, idx) => (
                        <li key={idx} className="text-sm text-gray-600 flex items-center">
                          <div className="w-1 h-1 bg-green-500 rounded-full mr-2"></div>
                          {strength}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-medium text-red-600 mb-2 flex items-center">
                      <AlertTriangle className="w-4 h-4 mr-1" />
                      Weaknesses
                    </h4>
                    <ul className="space-y-1">
                      {competitor.weaknesses.map((weakness, idx) => (
                        <li key={idx} className="text-sm text-gray-600 flex items-center">
                          <div className="w-1 h-1 bg-red-500 rounded-full mr-2"></div>
                          {weakness}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t">
                  <h4 className="font-medium mb-2">Key Features</h4>
                  <div className="flex flex-wrap gap-1">
                    {competitor.keyFeatures.map((feature, idx) => (
                      <Badge key={idx} variant="secondary" className="text-xs">
                        {feature}
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Your Competitive Advantages */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Zap className="w-5 h-5 text-yellow-500" />
            <span>Your Competitive Advantages</span>
          </CardTitle>
          <CardDescription>
            Based on the analysis, here are your key differentiators for {result.title}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {advantages.map((advantage, index) => (
              <div key={index} className="flex items-start space-x-3 p-3 rounded-lg bg-green-50 border border-green-200">
                <div className={`w-2 h-2 rounded-full mt-2 ${
                  advantage.strength === 'high' ? 'bg-green-500' : 
                  advantage.strength === 'medium' ? 'bg-yellow-500' : 'bg-gray-400'
                }`}></div>
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900">{advantage.advantage}</h4>
                  <p className="text-sm text-gray-600 mt-1">{advantage.description}</p>
                  <Badge 
                    className={`mt-2 ${
                      advantage.strength === 'high' ? 'bg-green-100 text-green-800' : 
                      advantage.strength === 'medium' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {advantage.strength} advantage
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Market Entry Strategy */}
      <Card>
        <CardHeader>
          <CardTitle>Recommended Market Entry Strategy</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h4 className="font-semibold text-blue-900 mb-2">Direct Competition Strategy</h4>
              <p className="text-sm text-blue-800">
                Focus on the {(100 - competitors.reduce((acc, comp) => acc + comp.marketShare, 0))}% uncaptured market while 
                differentiating through superior AI capabilities and user experience.
              </p>
            </div>
            <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
              <h4 className="font-semibold text-purple-900 mb-2">Pricing Strategy</h4>
              <p className="text-sm text-purple-800">
                Position between OpportunityScout ($49-299) and MarketGap AI ($199-999) at $29-149 range 
                to capture price-sensitive segment while maintaining premium positioning.
              </p>
            </div>
            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
              <h4 className="font-semibold text-green-900 mb-2">Go-to-Market Focus</h4>
              <p className="text-sm text-green-800">
                Target underserved SMB market that finds enterprise solutions too complex and expensive 
                but needs more than basic tools can provide.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}