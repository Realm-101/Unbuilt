import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BookmarkIcon, Share2, TrendingUp, Users, DollarSign, Target, BarChart3, Zap, Crown } from "lucide-react";
import type { SearchResult } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import ActionPlanGenerator from "./action-plan-generator";
import CompetitiveAnalysis from "./competitive-analysis";
import MarketIntelligence from "./market-intelligence";

interface ResultDetailsModalProps {
  isOpen: boolean;
  result: SearchResult | null;
  onClose: () => void;
  onSave: (id: number, isSaved: boolean) => void;
  onShare: (result: SearchResult) => void;
}

export default function ResultDetailsModal({ 
  isOpen, 
  result, 
  onClose, 
  onSave, 
  onShare 
}: ResultDetailsModalProps) {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState("overview");
  
  if (!result) return null;

  const isPro = user?.plan === 'pro' || user?.plan === 'enterprise';

  const handleUpgrade = () => {
    setLocation("/subscribe");
    onClose();
  };

  const getFeasibilityColor = (feasibility: string) => {
    switch (feasibility.toLowerCase()) {
      case 'high': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getMarketPotentialColor = (potential: string) => {
    switch (potential.toLowerCase()) {
      case 'high': return 'bg-blue-100 text-blue-800';
      case 'medium': return 'bg-purple-100 text-purple-800';
      case 'low': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getInnovationScoreColor = (score: number) => {
    if (score >= 8) return 'text-green-600';
    if (score >= 6) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <DialogTitle className="text-2xl font-bold pr-8">{result.title}</DialogTitle>
              <DialogDescription className="text-base mt-2">
                {result.description}
              </DialogDescription>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onSave(result.id, !result.isSaved)}
              >
                <BookmarkIcon className={`w-4 h-4 mr-1 ${result.isSaved ? 'fill-current' : ''}`} />
                {result.isSaved ? 'Saved' : 'Save'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onShare(result)}
              >
                <Share2 className="w-4 h-4 mr-1" />
                Share
              </Button>
            </div>
          </div>
          
          {/* Key Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
            <div className="text-center">
              <div className="text-sm text-gray-500">Feasibility</div>
              <Badge className={getFeasibilityColor(result.feasibility)}>
                {result.feasibility}
              </Badge>
            </div>
            <div className="text-center">
              <div className="text-sm text-gray-500">Market Potential</div>
              <Badge className={getMarketPotentialColor(result.marketPotential)}>
                {result.marketPotential}
              </Badge>
            </div>
            <div className="text-center">
              <div className="text-sm text-gray-500">Innovation Score</div>
              <div className={`text-lg font-bold ${getInnovationScoreColor(result.innovationScore)}`}>
                {result.innovationScore}/10
              </div>
            </div>
            <div className="text-center">
              <div className="text-sm text-gray-500">Market Size</div>
              <div className="text-sm font-medium">{result.marketSize}</div>
            </div>
          </div>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="action-plan" className="relative">
              Action Plan
              {!isPro && <Crown className="w-3 h-3 ml-1 text-yellow-500" />}
            </TabsTrigger>
            <TabsTrigger value="competitive" className="relative">
              Competition
              {!isPro && <Crown className="w-3 h-3 ml-1 text-yellow-500" />}
            </TabsTrigger>
            <TabsTrigger value="market" className="relative">
              Market Intel
              {!isPro && <Crown className="w-3 h-3 ml-1 text-yellow-500" />}
            </TabsTrigger>
            <TabsTrigger value="insights" className="relative">
              AI Insights
              {!isPro && <Crown className="w-3 h-3 ml-1 text-yellow-500" />}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-6">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Gap Analysis</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-semibold mb-2">Why This Gap Exists</h4>
                      <p className="text-gray-600">{result.gapReason}</p>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-2">Category</h4>
                      <Badge variant="outline">{result.category}</Badge>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-2">Key Metrics</h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="flex items-center space-x-2">
                          <TrendingUp className="w-4 h-4 text-blue-500" />
                          <span className="text-sm">
                            <strong>Feasibility:</strong> {result.feasibility}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Users className="w-4 h-4 text-purple-500" />
                          <span className="text-sm">
                            <strong>Market Potential:</strong> {result.marketPotential}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <DollarSign className="w-4 h-4 text-green-500" />
                          <span className="text-sm">
                            <strong>Market Size:</strong> {result.marketSize}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Quick Insights */}
              <Card>
                <CardHeader>
                  <CardTitle>Quick Insights</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 bg-blue-50 rounded-lg">
                      <h4 className="font-semibold text-blue-900 mb-2">Implementation Difficulty</h4>
                      <p className="text-sm text-blue-800">
                        {result.feasibility === 'high' 
                          ? 'Low barriers to entry with proven technology and market demand.'
                          : result.feasibility === 'medium'
                          ? 'Moderate complexity requiring some specialized knowledge or resources.'
                          : 'High complexity with significant technical or regulatory challenges.'
                        }
                      </p>
                    </div>
                    <div className="p-4 bg-green-50 rounded-lg">
                      <h4 className="font-semibold text-green-900 mb-2">Revenue Potential</h4>
                      <p className="text-sm text-green-800">
                        {result.marketPotential === 'high'
                          ? 'Excellent monetization opportunities with large addressable market.'
                          : result.marketPotential === 'medium'
                          ? 'Good revenue potential with focused market segment.'
                          : 'Limited but specialized market with niche opportunities.'
                        }
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="action-plan" className="mt-6">
            <ActionPlanGenerator 
              result={result} 
              isPro={isPro} 
              onUpgrade={handleUpgrade}
            />
          </TabsContent>

          <TabsContent value="competitive" className="mt-6">
            <CompetitiveAnalysis 
              result={result} 
              isPro={isPro} 
              onUpgrade={handleUpgrade}
            />
          </TabsContent>

          <TabsContent value="market" className="mt-6">
            <MarketIntelligence 
              result={result} 
              isPro={isPro} 
              onUpgrade={handleUpgrade}
            />
          </TabsContent>

          <TabsContent value="insights" className="mt-6">
            {!isPro ? (
              <Card className="border-2 border-dashed border-orange-300 bg-orange-50">
                <CardHeader className="text-center">
                  <div className="w-16 h-16 bg-orange-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Zap className="w-8 h-8 text-white" />
                  </div>
                  <CardTitle className="text-xl">AI-Powered Insights</CardTitle>
                  <CardDescription>
                    Get personalized recommendations, risk analysis, and strategic insights powered by advanced AI
                  </CardDescription>
                </CardHeader>
                <CardContent className="text-center">
                  <div className="space-y-4 mb-6">
                    <div className="flex items-center justify-center space-x-2 text-sm text-gray-600">
                      <Target className="w-4 h-4" />
                      <span>Personalized strategy recommendations</span>
                    </div>
                    <div className="flex items-center justify-center space-x-2 text-sm text-gray-600">
                      <BarChart3 className="w-4 h-4" />
                      <span>Risk assessment & mitigation strategies</span>
                    </div>
                    <div className="flex items-center justify-center space-x-2 text-sm text-gray-600">
                      <Zap className="w-4 h-4" />
                      <span>AI-generated next steps & priorities</span>
                    </div>
                  </div>
                  <Button onClick={handleUpgrade} size="lg" className="w-full">
                    Upgrade to Pro for AI Insights
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Zap className="w-5 h-5 text-orange-500" />
                      <span>AI Strategic Insights</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                        <h4 className="font-semibold text-blue-900 mb-2">Recommended Strategy</h4>
                        <p className="text-sm text-blue-800">
                          Based on the {result.feasibility} feasibility and {result.marketPotential} market potential, 
                          we recommend a rapid prototyping approach with early customer validation.
                        </p>
                      </div>
                      <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                        <h4 className="font-semibold text-yellow-900 mb-2">Key Risks</h4>
                        <p className="text-sm text-yellow-800">
                          Primary risks include market timing, competitive response, and scaling challenges. 
                          Recommend building strong differentiation from day one.
                        </p>
                      </div>
                      <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                        <h4 className="font-semibold text-green-900 mb-2">Success Factors</h4>
                        <p className="text-sm text-green-800">
                          Focus on user experience, rapid iteration, and building a strong community. 
                          Early partnerships could accelerate market entry.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}