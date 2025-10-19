import React, { useState } from "react";
import { useLocation } from "wouter";
import {
  Search, TrendingUp, Users, Globe, BarChart3,
  Building, Target, DollarSign, Shield, Activity,
  ChevronRight, Filter, Download, RefreshCw, Zap,
  CheckCircle, AlertCircle
} from "lucide-react";
import Layout from "@/components/layout-new";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { apiRequest } from "@/lib/queryClient";
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar
} from 'recharts';

interface MarketData {
  overview: {
    marketSize: string;
    growthRate: string;
    keyTrends: string[];
    opportunities: string[];
    challenges: string[];
  };
  competitors: {
    name: string;
    marketShare: number;
    strengths: string[];
    weaknesses: string[];
    funding: string;
    valuation: string;
  }[];
  customerSegments: {
    segment: string;
    size: string;
    needs: string[];
    painPoints: string[];
    willingness: string;
  }[];
  financialProjections: {
    year: number;
    marketSize: number;
    growthRate: number;
    tam: number;
    sam: number;
    som: number;
  }[];
  swotAnalysis: {
    strengths: string[];
    weaknesses: string[];
    opportunities: string[];
    threats: string[];
  };
}

export default function MarketResearchPage() {
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [industry, setIndustry] = useState("tech");
  const [isLoading, setIsLoading] = useState(false);
  const [marketData, setMarketData] = useState<MarketData | null>(null);

  // Check for context from action plan modal and auto-start research
  React.useEffect(() => {
    const contextData = sessionStorage.getItem('marketResearchContext');
    if (contextData) {
      try {
        const context = JSON.parse(contextData);
        const query = context.title || context.description;
        setSearchQuery(query);
        
        // Determine industry from category or industryContext
        let selectedIndustry = 'tech';
        if (context.category) {
          const categoryToIndustry: Record<string, string> = {
            'technology': 'tech',
            'market': 'tech',
            'ux': 'tech',
            'business_model': 'b2b'
          };
          selectedIndustry = categoryToIndustry[context.category] || 'tech';
          setIndustry(selectedIndustry);
        }
        
        // Clear the context after using it
        sessionStorage.removeItem('marketResearchContext');
        
        // Auto-start research
        if (query.trim()) {
          setIsLoading(true);
          apiRequest("POST", "/api/market-research", {
            query: `${query} in ${selectedIndustry} industry market analysis competitors customer segments financial projections`
          })
            .then(response => response.json())
            .then(data => {
              const structuredData = parseMarketResearch(data);
              setMarketData(structuredData);
            })
            .catch(error => {
              console.error('Market research failed:', error);
            })
            .finally(() => {
              setIsLoading(false);
            });
        }
      } catch (e) {
        console.error('Failed to parse market research context:', e);
      }
    }
  }, []);

  const handleResearch = async () => {
    if (!searchQuery.trim()) return;

    setIsLoading(true);
    try {
      const response = await apiRequest("POST", "/api/market-research", {
        query: `${searchQuery} in ${industry} industry market analysis competitors customer segments financial projections`
      });
      const data = await response.json();
      
      // Parse and structure the research data
      const structuredData = parseMarketResearch(data);
      setMarketData(structuredData);
    } catch (error) {
      console.error('Market research failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const parseMarketResearch = (data: any): MarketData => {
    // This would parse the AI response into structured data
    // For now, returning sample data
    return {
      overview: {
        marketSize: "$50B",
        growthRate: "25% CAGR",
        keyTrends: [
          "AI integration becoming mainstream",
          "Shift to subscription models",
          "Focus on sustainability",
          "Remote-first solutions"
        ],
        opportunities: [
          "Untapped SMB market",
          "International expansion",
          "Platform consolidation",
          "B2B2C opportunities"
        ],
        challenges: [
          "High customer acquisition costs",
          "Regulatory compliance",
          "Market saturation in tier 1",
          "Technology adoption barriers"
        ]
      },
      competitors: [
        {
          name: "Market Leader Co",
          marketShare: 35,
          strengths: ["Brand recognition", "Large user base", "Strong funding"],
          weaknesses: ["Legacy tech stack", "Slow innovation", "Poor UX"],
          funding: "$500M",
          valuation: "$5B"
        },
        {
          name: "Fast Challenger Inc",
          marketShare: 20,
          strengths: ["Modern tech", "Great UX", "Agile team"],
          weaknesses: ["Limited resources", "Small market presence"],
          funding: "$100M",
          valuation: "$1B"
        },
        {
          name: "Niche Player Ltd",
          marketShare: 10,
          strengths: ["Specialized features", "Loyal customers"],
          weaknesses: ["Limited scalability", "Narrow focus"],
          funding: "$20M",
          valuation: "$200M"
        }
      ],
      customerSegments: [
        {
          segment: "Enterprise",
          size: "10,000 companies",
          needs: ["Scalability", "Security", "Integration"],
          painPoints: ["Complex implementation", "High costs"],
          willingness: "High ($100K+ annually)"
        },
        {
          segment: "SMBs",
          size: "500,000 companies",
          needs: ["Affordability", "Ease of use", "Quick setup"],
          painPoints: ["Limited budget", "No IT team"],
          willingness: "Medium ($1-10K annually)"
        },
        {
          segment: "Startups",
          size: "100,000 companies",
          needs: ["Flexibility", "Growth potential", "Free tier"],
          painPoints: ["Cash constraints", "Rapid changes"],
          willingness: "Low ($100-1K annually)"
        }
      ],
      financialProjections: [
        { year: 2024, marketSize: 50, growthRate: 25, tam: 200, sam: 100, som: 10 },
        { year: 2025, marketSize: 62.5, growthRate: 25, tam: 250, sam: 125, som: 15 },
        { year: 2026, marketSize: 78, growthRate: 24.8, tam: 312, sam: 156, som: 23 },
        { year: 2027, marketSize: 97, growthRate: 24.3, tam: 390, sam: 195, som: 35 },
        { year: 2028, marketSize: 120, growthRate: 23.7, tam: 487, sam: 244, som: 50 }
      ],
      swotAnalysis: {
        strengths: [
          "First-mover advantage in AI integration",
          "Strong technical team",
          "Patented technology",
          "Capital efficient model"
        ],
        weaknesses: [
          "Limited brand awareness",
          "No enterprise sales team",
          "Single product focus",
          "Geographic concentration"
        ],
        opportunities: [
          "Expanding TAM with new use cases",
          "Strategic partnerships available",
          "Acquisition targets identified",
          "Regulatory tailwinds"
        ],
        threats: [
          "Big tech entering market",
          "Economic downturn risk",
          "Commoditization of features",
          "Talent competition"
        ]
      }
    };
  };

  const COLORS = ['#8b5cf6', '#ec4899', '#3b82f6', '#10b981', '#f59e0b'];

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-4">
            <span className="flame-text">AI Market Research Platform</span>
          </h1>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto">
            Deep market intelligence powered by real-time data analysis and AI insights
          </p>
        </div>

        {/* Search Section */}
        <Card className="flame-card mb-8">
          <CardHeader>
            <CardTitle className="text-white">Research Parameters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <Label htmlFor="query" className="text-gray-300">Market/Product/Industry</Label>
                <Input
                  id="query"
                  placeholder="e.g., AI-powered mental health apps, sustainable packaging, fintech for SMBs..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-gray-800 border-gray-700 text-white"
                />
              </div>
              <div>
                <Label htmlFor="industry" className="text-gray-300">Industry Focus</Label>
                <Select value={industry} onValueChange={setIndustry}>
                  <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tech">Technology</SelectItem>
                    <SelectItem value="healthcare">Healthcare</SelectItem>
                    <SelectItem value="fintech">FinTech</SelectItem>
                    <SelectItem value="ecommerce">E-Commerce</SelectItem>
                    <SelectItem value="sustainability">Sustainability</SelectItem>
                    <SelectItem value="education">Education</SelectItem>
                    <SelectItem value="b2b">B2B SaaS</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="mt-4 flex gap-4">
              <Button 
                className="btn-flame flex-1"
                onClick={handleResearch}
                disabled={isLoading || !searchQuery.trim()}
              >
                {isLoading ? (
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Search className="w-4 h-4 mr-2" />
                )}
                {isLoading ? "Researching..." : "Conduct Research"}
              </Button>
              <Button 
                variant="outline"
                className="border-gray-700 text-gray-300"
                onClick={() => {
                  setSearchQuery("");
                  setMarketData(null);
                }}
              >
                Clear
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Results Section */}
        {marketData && (
          <div className="space-y-8">
            {/* Market Overview */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card className="flame-card">
                <CardHeader className="pb-3">
                  <DollarSign className="w-8 h-8 text-green-500 mb-2" />
                  <CardTitle className="text-white">Market Size</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-white">{marketData.overview.marketSize}</div>
                  <p className="text-gray-400 text-sm">Current valuation</p>
                </CardContent>
              </Card>

              <Card className="flame-card">
                <CardHeader className="pb-3">
                  <TrendingUp className="w-8 h-8 text-purple-500 mb-2" />
                  <CardTitle className="text-white">Growth Rate</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-white">{marketData.overview.growthRate}</div>
                  <p className="text-gray-400 text-sm">Annual growth</p>
                </CardContent>
              </Card>

              <Card className="flame-card">
                <CardHeader className="pb-3">
                  <Building className="w-8 h-8 text-blue-500 mb-2" />
                  <CardTitle className="text-white">Competitors</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-white">{marketData.competitors.length}</div>
                  <p className="text-gray-400 text-sm">Major players</p>
                </CardContent>
              </Card>

              <Card className="flame-card">
                <CardHeader className="pb-3">
                  <Users className="w-8 h-8 text-orange-500 mb-2" />
                  <CardTitle className="text-white">Segments</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-white">{marketData.customerSegments.length}</div>
                  <p className="text-gray-400 text-sm">Target markets</p>
                </CardContent>
              </Card>
            </div>

            {/* Detailed Analysis Tabs */}
            <Card className="flame-card">
              <CardHeader>
                <CardTitle className="text-2xl text-white">Comprehensive Market Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="overview" className="w-full">
                  <TabsList className="grid w-full grid-cols-5 bg-gray-800 border-gray-700">
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="competitors">Competitors</TabsTrigger>
                    <TabsTrigger value="customers">Customers</TabsTrigger>
                    <TabsTrigger value="financials">Financials</TabsTrigger>
                    <TabsTrigger value="swot">SWOT</TabsTrigger>
                  </TabsList>

                  <TabsContent value="overview" className="space-y-6 mt-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div>
                        <h3 className="font-semibold text-white mb-3 flex items-center">
                          <Activity className="w-5 h-5 mr-2 text-purple-400" />
                          Key Trends
                        </h3>
                        <ul className="space-y-2">
                          {marketData.overview.keyTrends.map((trend, i) => (
                            <li key={i} className="flex items-start">
                              <ChevronRight className="w-4 h-4 text-purple-400 mt-0.5 mr-2" />
                              <span className="text-gray-300 text-sm">{trend}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div>
                        <h3 className="font-semibold text-white mb-3 flex items-center">
                          <Target className="w-5 h-5 mr-2 text-green-400" />
                          Opportunities
                        </h3>
                        <ul className="space-y-2">
                          {marketData.overview.opportunities.map((opp, i) => (
                            <li key={i} className="flex items-start">
                              <ChevronRight className="w-4 h-4 text-green-400 mt-0.5 mr-2" />
                              <span className="text-gray-300 text-sm">{opp}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div>
                        <h3 className="font-semibold text-white mb-3 flex items-center">
                          <Shield className="w-5 h-5 mr-2 text-red-400" />
                          Challenges
                        </h3>
                        <ul className="space-y-2">
                          {marketData.overview.challenges.map((challenge, i) => (
                            <li key={i} className="flex items-start">
                              <ChevronRight className="w-4 h-4 text-red-400 mt-0.5 mr-2" />
                              <span className="text-gray-300 text-sm">{challenge}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="competitors" className="space-y-6 mt-6">
                    <div className="mb-6">
                      <h3 className="font-semibold text-white mb-4">Market Share Distribution</h3>
                      <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                          <Pie
                            data={marketData.competitors}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={(entry) => `${entry.name}: ${entry.marketShare}%`}
                            outerRadius={100}
                            fill="#8884d8"
                            dataKey="marketShare"
                          >
                            {marketData.competitors.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>

                    <div className="space-y-4">
                      {marketData.competitors.map((comp, i) => (
                        <div key={i} className="bg-gray-800 rounded-lg p-4">
                          <div className="flex justify-between items-start mb-3">
                            <div>
                              <h4 className="font-semibold text-white text-lg">{comp.name}</h4>
                              <div className="flex gap-4 mt-1">
                                <Badge className="bg-purple-500/20 text-purple-300">
                                  {comp.marketShare}% Market Share
                                </Badge>
                                <Badge className="bg-green-500/20 text-green-300">
                                  {comp.funding} Funding
                                </Badge>
                                <Badge className="bg-blue-500/20 text-blue-300">
                                  {comp.valuation} Valuation
                                </Badge>
                              </div>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <p className="text-sm font-medium text-green-400 mb-2">Strengths</p>
                              <ul className="text-sm text-gray-300 space-y-1">
                                {comp.strengths.map((s, j) => (
                                  <li key={j}>• {s}</li>
                                ))}
                              </ul>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-red-400 mb-2">Weaknesses</p>
                              <ul className="text-sm text-gray-300 space-y-1">
                                {comp.weaknesses.map((w, j) => (
                                  <li key={j}>• {w}</li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </TabsContent>

                  <TabsContent value="customers" className="space-y-6 mt-6">
                    {marketData.customerSegments.map((segment, i) => (
                      <div key={i} className="bg-gray-800 rounded-lg p-4">
                        <div className="flex justify-between items-start mb-3">
                          <h4 className="font-semibold text-white text-lg">{segment.segment}</h4>
                          <div className="text-right">
                            <Badge className="bg-blue-500/20 text-blue-300">{segment.size}</Badge>
                            <p className="text-sm text-gray-400 mt-1">{segment.willingness}</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-sm font-medium text-green-400 mb-2">Key Needs</p>
                            <ul className="text-sm text-gray-300 space-y-1">
                              {segment.needs.map((need, j) => (
                                <li key={j}>• {need}</li>
                              ))}
                            </ul>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-orange-400 mb-2">Pain Points</p>
                            <ul className="text-sm text-gray-300 space-y-1">
                              {segment.painPoints.map((pain, j) => (
                                <li key={j}>• {pain}</li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </div>
                    ))}
                  </TabsContent>

                  <TabsContent value="financials" className="space-y-6 mt-6">
                    <div>
                      <h3 className="font-semibold text-white mb-4">Market Size Projections ($B)</h3>
                      <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={marketData.financialProjections}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                          <XAxis dataKey="year" stroke="#9CA3AF" />
                          <YAxis stroke="#9CA3AF" />
                          <Tooltip 
                            contentStyle={{ backgroundColor: '#1F2937', border: 'none' }}
                            labelStyle={{ color: '#fff' }}
                          />
                          <Legend />
                          <Line type="monotone" dataKey="tam" stroke="#8b5cf6" name="TAM" strokeWidth={2} />
                          <Line type="monotone" dataKey="sam" stroke="#3b82f6" name="SAM" strokeWidth={2} />
                          <Line type="monotone" dataKey="som" stroke="#10b981" name="SOM" strokeWidth={2} />
                          <Line type="monotone" dataKey="marketSize" stroke="#f59e0b" name="Current Market" strokeWidth={2} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                      <Card className="bg-gray-800 border-gray-700">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-sm text-gray-400">Total Addressable Market</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-2xl font-bold text-purple-400">
                            ${marketData.financialProjections[marketData.financialProjections.length - 1].tam}B
                          </p>
                          <p className="text-xs text-gray-500">by 2028</p>
                        </CardContent>
                      </Card>

                      <Card className="bg-gray-800 border-gray-700">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-sm text-gray-400">Serviceable Addressable</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-2xl font-bold text-blue-400">
                            ${marketData.financialProjections[marketData.financialProjections.length - 1].sam}B
                          </p>
                          <p className="text-xs text-gray-500">by 2028</p>
                        </CardContent>
                      </Card>

                      <Card className="bg-gray-800 border-gray-700">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-sm text-gray-400">Serviceable Obtainable</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-2xl font-bold text-green-400">
                            ${marketData.financialProjections[marketData.financialProjections.length - 1].som}B
                          </p>
                          <p className="text-xs text-gray-500">by 2028</p>
                        </CardContent>
                      </Card>
                    </div>
                  </TabsContent>

                  <TabsContent value="swot" className="mt-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
                        <h3 className="font-semibold text-green-400 mb-3 flex items-center">
                          <Zap className="w-5 h-5 mr-2" />
                          Strengths
                        </h3>
                        <ul className="space-y-2">
                          {marketData.swotAnalysis.strengths.map((s, i) => (
                            <li key={i} className="text-gray-300 text-sm flex items-start">
                              <CheckCircle className="w-4 h-4 text-green-400 mt-0.5 mr-2 flex-shrink-0" />
                              {s}
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
                        <h3 className="font-semibold text-red-400 mb-3 flex items-center">
                          <AlertCircle className="w-5 h-5 mr-2" />
                          Weaknesses
                        </h3>
                        <ul className="space-y-2">
                          {marketData.swotAnalysis.weaknesses.map((w, i) => (
                            <li key={i} className="text-gray-300 text-sm flex items-start">
                              <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 mr-2 flex-shrink-0" />
                              {w}
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                        <h3 className="font-semibold text-blue-400 mb-3 flex items-center">
                          <Target className="w-5 h-5 mr-2" />
                          Opportunities
                        </h3>
                        <ul className="space-y-2">
                          {marketData.swotAnalysis.opportunities.map((o, i) => (
                            <li key={i} className="text-gray-300 text-sm flex items-start">
                              <Target className="w-4 h-4 text-blue-400 mt-0.5 mr-2 flex-shrink-0" />
                              {o}
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-4">
                        <h3 className="font-semibold text-orange-400 mb-3 flex items-center">
                          <Shield className="w-5 h-5 mr-2" />
                          Threats
                        </h3>
                        <ul className="space-y-2">
                          {marketData.swotAnalysis.threats.map((t, i) => (
                            <li key={i} className="text-gray-300 text-sm flex items-start">
                              <Shield className="w-4 h-4 text-orange-400 mt-0.5 mr-2 flex-shrink-0" />
                              {t}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <div className="flex justify-center space-x-4">
              <Button className="btn-flame">
                <Download className="w-4 h-4 mr-2" />
                Export Research Report
              </Button>
              <Button variant="outline" className="border-gray-700 text-gray-300">
                Save to Library
              </Button>
              <Button 
                variant="outline" 
                className="border-gray-700 text-gray-300"
                onClick={() => setLocation('/validate-idea')}
              >
                Validate Business Idea
              </Button>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}