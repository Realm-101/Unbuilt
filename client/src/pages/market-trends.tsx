import React, { useState, useEffect } from "react";
import { useLocation } from "wouter";
import {
  TrendingUp, TrendingDown, Minus, Filter, RefreshCw,
  Globe, Zap, Shield, Heart, ShoppingBag, Briefcase,
  GraduationCap, Leaf, DollarSign, Activity, ChevronRight
} from "lucide-react";
import Layout from "@/components/layout-new";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { motion, AnimatePresence } from "framer-motion";
import { apiRequest } from "@/lib/queryClient";

interface TrendData {
  id: string;
  name: string;
  category: string;
  score: number; // 0-100
  trend: 'up' | 'down' | 'stable';
  change: number; // percentage
  volume: number;
  opportunity: string;
  risk: 'low' | 'medium' | 'high';
}

interface CategoryData {
  name: string;
  icon: React.ReactNode;
  color: string;
  trends: TrendData[];
}

const categoryIcons: Record<string, { icon: React.ReactNode; color: string }> = {
  'Technology': { icon: <Zap className="w-5 h-5" />, color: 'purple' },
  'Healthcare': { icon: <Heart className="w-5 h-5" />, color: 'red' },
  'Finance': { icon: <DollarSign className="w-5 h-5" />, color: 'green' },
  'E-commerce': { icon: <ShoppingBag className="w-5 h-5" />, color: 'blue' },
  'Education': { icon: <GraduationCap className="w-5 h-5" />, color: 'indigo' },
  'Sustainability': { icon: <Leaf className="w-5 h-5" />, color: 'emerald' },
  'B2B': { icon: <Briefcase className="w-5 h-5" />, color: 'slate' },
  'Security': { icon: <Shield className="w-5 h-5" />, color: 'amber' },
};

export default function MarketTrendsPage() {
  const [, setLocation] = useLocation();
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [timeframe, setTimeframe] = useState<string>("7d");
  const [isLoading, setIsLoading] = useState(false);
  const [trendData, setTrendData] = useState<CategoryData[]>([]);
  const [hoveredTrend, setHoveredTrend] = useState<string | null>(null);

  useEffect(() => {
    loadTrendData();
  }, [timeframe]);

  const loadTrendData = async () => {
    setIsLoading(true);
    try {
      // This would fetch real trend data from the API
      // For now, generating sample data
      const sampleData = generateSampleTrends();
      setTrendData(sampleData);
    } catch (error) {
      console.error('Failed to load trends:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const generateSampleTrends = (): CategoryData[] => {
    return Object.entries(categoryIcons).map(([category, { icon, color }]) => ({
      name: category,
      icon,
      color,
      trends: generateCategoryTrends(category)
    }));
  };

  const generateCategoryTrends = (category: string): TrendData[] => {
    const trends: Record<string, string[]> = {
      'Technology': ['AI Agents', 'Quantum Computing', 'Edge AI', 'WebAssembly', 'Zero Trust Security'],
      'Healthcare': ['Telemedicine', 'Mental Health Apps', 'Biotech APIs', 'Health Wearables', 'Precision Medicine'],
      'Finance': ['DeFi Protocols', 'Embedded Finance', 'RegTech', 'Open Banking', 'Crypto Payments'],
      'E-commerce': ['Social Commerce', 'Voice Shopping', 'AR Try-On', 'Subscription Box', 'Live Shopping'],
      'Education': ['Micro-Learning', 'AI Tutors', 'Skill Marketplaces', 'VR Training', 'Cohort Learning'],
      'Sustainability': ['Carbon Tracking', 'Circular Economy', 'Green Tech', 'ESG Analytics', 'Clean Energy'],
      'B2B': ['Vertical SaaS', 'PLG Tools', 'No-Code Platforms', 'API-First', 'Revenue Ops'],
      'Security': ['Zero-Knowledge Proofs', 'Privacy Tech', 'Blockchain Security', 'AI Defense', 'Compliance Automation']
    };

    return (trends[category] || []).map((name, index) => ({
      id: `${category}-${index}`,
      name,
      category,
      score: Math.floor(Math.random() * 40) + 60,
      trend: Math.random() > 0.3 ? 'up' : Math.random() > 0.5 ? 'stable' : 'down',
      change: Math.floor(Math.random() * 50) - 10,
      volume: Math.floor(Math.random() * 100000) + 10000,
      opportunity: ['High growth potential', 'Emerging market', 'Untapped niche', 'Market disruption'][Math.floor(Math.random() * 4)],
      risk: ['low', 'medium', 'high'][Math.floor(Math.random() * 3)] as 'low' | 'medium' | 'high'
    }));
  };

  const getHeatColor = (score: number): string => {
    if (score >= 80) return 'from-red-500 to-orange-500';
    if (score >= 60) return 'from-orange-500 to-yellow-500';
    if (score >= 40) return 'from-yellow-500 to-green-500';
    return 'from-green-500 to-blue-500';
  };

  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up': return <TrendingUp className="w-4 h-4 text-green-500" />;
      case 'down': return <TrendingDown className="w-4 h-4 text-red-500" />;
      case 'stable': return <Minus className="w-4 h-4 text-yellow-500" />;
    }
  };

  const getRiskBadgeColor = (risk: 'low' | 'medium' | 'high') => {
    switch (risk) {
      case 'low': return 'bg-green-500/20 text-green-300 border-green-500/30';
      case 'medium': return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30';
      case 'high': return 'bg-red-500/20 text-red-300 border-red-500/30';
    }
  };

  const filteredData = selectedCategory === 'all' 
    ? trendData 
    : trendData.filter(cat => cat.name === selectedCategory);

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-4">
            <span className="flame-text">Market Trends Heat Map</span>
          </h1>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto">
            Real-time visualization of trending opportunities and market movements
          </p>
        </div>

        {/* Controls */}
        <Card className="flame-card mb-8">
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="text-white">Filter Trends</CardTitle>
              <Button 
                size="sm"
                variant="outline"
                className="border-gray-700 text-gray-300"
                onClick={loadTrendData}
                disabled={isLoading}
              >
                {isLoading ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4" />
                )}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-sm text-gray-400 mb-1 block">Category</label>
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {Object.keys(categoryIcons).map(cat => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="text-sm text-gray-400 mb-1 block">Timeframe</label>
                <Select value={timeframe} onValueChange={setTimeframe}>
                  <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="24h">Last 24 Hours</SelectItem>
                    <SelectItem value="7d">Last 7 Days</SelectItem>
                    <SelectItem value="30d">Last 30 Days</SelectItem>
                    <SelectItem value="90d">Last 90 Days</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex items-end">
                <div className="flex gap-2 w-full">
                  <Badge className="bg-red-500/20 text-red-300 border-red-500/30">
                    🔥 Hot (80+)
                  </Badge>
                  <Badge className="bg-orange-500/20 text-orange-300 border-orange-500/30">
                    📈 Trending (60+)
                  </Badge>
                  <Badge className="bg-green-500/20 text-green-300 border-green-500/30">
                    🌱 Emerging (40+)
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Heat Map Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 mb-8">
          <AnimatePresence mode="popLayout">
            {filteredData.map(category => (
              <motion.div
                key={category.name}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.3 }}
              >
                <Card className="flame-card h-full">
                  <CardHeader className="pb-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div className={`p-2 rounded-lg bg-${category.color}-500/20`}>
                          {category.icon}
                        </div>
                        <CardTitle className="text-white">{category.name}</CardTitle>
                      </div>
                      <Badge variant="outline" className="border-gray-600 text-gray-400">
                        {category.trends.length} trends
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {category.trends.slice(0, 5).map(trend => (
                        <motion.div
                          key={trend.id}
                          className="relative"
                          onHoverStart={() => setHoveredTrend(trend.id)}
                          onHoverEnd={() => setHoveredTrend(null)}
                          whileHover={{ scale: 1.02 }}
                        >
                          <div
                            className={`
                              p-3 rounded-lg cursor-pointer transition-all
                              bg-gradient-to-r ${getHeatColor(trend.score)}
                              bg-opacity-20 hover:bg-opacity-30
                              ${hoveredTrend === trend.id ? 'ring-2 ring-white/20' : ''}
                            `}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="font-semibold text-white text-sm">{trend.name}</h4>
                              <div className="flex items-center space-x-2">
                                {getTrendIcon(trend.trend)}
                                <span className={`text-xs font-medium ${
                                  trend.change > 0 ? 'text-green-400' : 
                                  trend.change < 0 ? 'text-red-400' : 'text-yellow-400'
                                }`}>
                                  {trend.change > 0 ? '+' : ''}{trend.change}%
                                </span>
                              </div>
                            </div>
                            
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-3">
                                <div className="text-xs text-gray-300">
                                  Score: <span className="font-bold text-white">{trend.score}</span>
                                </div>
                                <Badge className={`text-xs ${getRiskBadgeColor(trend.risk)}`}>
                                  {trend.risk} risk
                                </Badge>
                              </div>
                              <Activity className="w-3 h-3 text-gray-400" />
                            </div>
                            
                            {hoveredTrend === trend.id && (
                              <motion.div
                                initial={{ opacity: 0, y: -5 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="mt-2 pt-2 border-t border-white/10"
                              >
                                <p className="text-xs text-gray-200">{trend.opportunity}</p>
                                <p className="text-xs text-gray-400 mt-1">
                                  Volume: {(trend.volume / 1000).toFixed(1)}k searches
                                </p>
                              </motion.div>
                            )}
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Top Opportunities */}
        <Card className="flame-card">
          <CardHeader>
            <CardTitle className="text-2xl text-white">
              <Zap className="inline w-6 h-6 mr-2 text-yellow-500" />
              Top Opportunities This Week
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {trendData
                .flatMap(cat => cat.trends)
                .sort((a, b) => b.score - a.score)
                .slice(0, 6)
                .map(trend => (
                  <motion.div
                    key={trend.id}
                    whileHover={{ scale: 1.05 }}
                    className="bg-gray-800 rounded-lg p-4 cursor-pointer hover:bg-gray-700 transition-colors"
                    onClick={() => setLocation(`/validate-idea?idea=${encodeURIComponent(trend.name)}`)}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-semibold text-white">{trend.name}</h4>
                      <Badge className="bg-purple-500/20 text-purple-300">
                        {trend.score}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-400 mb-2">{trend.category}</p>
                    <p className="text-xs text-gray-300">{trend.opportunity}</p>
                    <div className="mt-3 flex items-center justify-between">
                      {getTrendIcon(trend.trend)}
                      <ChevronRight className="w-4 h-4 text-gray-500" />
                    </div>
                  </motion.div>
                ))}
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="mt-8 flex justify-center space-x-4">
          <Button className="btn-flame" onClick={() => setLocation('/validate-idea')}>
            Validate an Idea
          </Button>
          <Button variant="outline" className="border-gray-700 text-gray-300" onClick={() => setLocation('/market-research')}>
            Deep Market Research
          </Button>
        </div>
      </div>
    </Layout>
  );
}