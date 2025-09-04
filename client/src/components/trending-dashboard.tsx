import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { TrendingUp, TrendingDown, Flame, Clock, Users, Search, BarChart3, Target } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { apiRequest } from "@/lib/queryClient";

interface TrendingData {
  hottest: Array<{
    category: string;
    count: number;
    growth: number;
    avgInnovation: number;
  }>;
  recent: Array<{
    query: string;
    timestamp: string;
    resultsCount: number;
  }>;
  popular: Array<{
    title: string;
    category: string;
    saves: number;
    views: number;
  }>;
  stats: {
    totalSearches: number;
    totalResults: number;
    avgFeasibility: number;
    topCategory: string;
  };
}

export default function TrendingDashboard() {
  const [timeRange, setTimeRange] = useState<"24h" | "7d" | "30d">("7d");

  // Mock data for now - in production this would come from analytics
  const mockTrendingData: TrendingData = {
    hottest: [
      { category: "Tech That's Missing", count: 156, growth: 23, avgInnovation: 8.2 },
      { category: "Services That Don't Exist", count: 89, growth: 15, avgInnovation: 7.8 },
      { category: "Products Nobody's Made", count: 67, growth: 31, avgInnovation: 8.5 },
      { category: "Business Models", count: 45, growth: -5, avgInnovation: 7.1 },
    ],
    recent: [
      { query: "AI-powered personal finance for Gen Z", timestamp: "2 minutes ago", resultsCount: 8 },
      { query: "Sustainable packaging solutions", timestamp: "5 minutes ago", resultsCount: 12 },
      { query: "Remote work collaboration tools", timestamp: "8 minutes ago", resultsCount: 15 },
      { query: "Mental health apps for professionals", timestamp: "12 minutes ago", resultsCount: 9 },
      { query: "Smart home energy management", timestamp: "15 minutes ago", resultsCount: 11 },
    ],
    popular: [
      { title: "AI-Powered Code Review for Small Teams", category: "Tech That's Missing", saves: 45, views: 234 },
      { title: "Subscription Service for Local Produce", category: "Services That Don't Exist", saves: 38, views: 189 },
      { title: "Smart Pet Health Monitor", category: "Products Nobody's Made", saves: 29, views: 156 },
      { title: "Micro-Investment Platform for Kids", category: "Business Models", saves: 31, views: 142 },
    ],
    stats: {
      totalSearches: 2847,
      totalResults: 18492,
      avgFeasibility: 7.3,
      topCategory: "Tech That's Missing"
    }
  };

  const { data: trendingData } = useQuery({
    queryKey: ["/api/trending", timeRange],
    queryFn: async () => {
      const res = await fetch(`/api/trending?range=${timeRange}`, { credentials: 'include' });
      if (!res.ok) {
        // Fallback to mock data if API unavailable
        return mockTrendingData;
      }
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
  });

  const data = trendingData || mockTrendingData;

  return (
    <div className="trending-content space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Trending Now</h2>
          <p className="text-gray-300">Discover what opportunities are heating up</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant={timeRange === "24h" ? "default" : "outline"}
            size="sm"
            onClick={() => setTimeRange("24h")}
          >
            24h
          </Button>
          <Button
            variant={timeRange === "7d" ? "default" : "outline"}
            size="sm"
            onClick={() => setTimeRange("7d")}
          >
            7d
          </Button>
          <Button
            variant={timeRange === "30d" ? "default" : "outline"}
            size="sm"
            onClick={() => setTimeRange("30d")}
          >
            30d
          </Button>
        </div>
      </div>

      {/* Key Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Searches</CardTitle>
            <Search className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.stats.totalSearches.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">+12% from last period</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Opportunities Found</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.stats.totalResults.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">+18% from last period</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Feasibility</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.stats.avgFeasibility}/10</div>
            <p className="text-xs text-muted-foreground">+0.3 from last period</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Top Category</CardTitle>
            <Flame className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold">{data.stats.topCategory}</div>
            <p className="text-xs text-muted-foreground">Most searched</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="categories" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="categories">Hot Categories</TabsTrigger>
          <TabsTrigger value="recent">Recent Searches</TabsTrigger>
          <TabsTrigger value="popular">Popular Results</TabsTrigger>
        </TabsList>

        <TabsContent value="categories" className="space-y-4">
          <div className="grid gap-4">
            {data.hottest.map((category: { category: string; count: number; growth: number; avgInnovation: number }, index: number) => (
              <Card key={index}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <Badge variant="secondary">{index + 1}</Badge>
                      <h3 className="font-semibold">{category.category}</h3>
                    </div>
                    <div className="flex items-center space-x-2">
                      {category.growth > 0 ? (
                        <TrendingUp className="w-4 h-4 text-green-500" />
                      ) : (
                        <TrendingDown className="w-4 h-4 text-red-500" />
                      )}
                      <span className={`text-sm font-medium ${category.growth > 0 ? 'text-green-500' : 'text-red-500'}`}>
                        {category.growth > 0 ? '+' : ''}{category.growth}%
                      </span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-400">Searches</p>
                      <p className="font-medium text-white">{category.count}</p>
                    </div>
                    <div>
                      <p className="text-gray-400">Avg Innovation Score</p>
                      <p className="font-medium text-white">{category.avgInnovation}/10</p>
                    </div>
                  </div>
                  <div className="mt-3">
                    <Progress value={category.avgInnovation * 10} className="h-2" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="recent" className="space-y-4">
          <div className="space-y-3">
            {data.recent.map((search: { query: string; timestamp: string; resultsCount: number }, index: number) => (
              <Card key={index}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h3 className="font-medium text-white">{search.query}</h3>
                      <div className="flex items-center space-x-4 text-sm text-gray-400 mt-1">
                        <span className="flex items-center">
                          <Clock className="w-3 h-3 mr-1" />
                          {search.timestamp}
                        </span>
                        <span>{search.resultsCount} results found</span>
                      </div>
                    </div>
                    <Button variant="outline" size="sm">
                      View Results
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="popular" className="space-y-4">
          <div className="grid gap-4">
            {data.popular.map((result: { title: string; category: string; saves: number; views: number }, index: number) => (
              <Card key={index}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <Badge variant="outline">{result.category}</Badge>
                    <div className="flex items-center space-x-4 text-sm text-gray-400">
                      <span className="flex items-center">
                        <Users className="w-3 h-3 mr-1" />
                        {result.saves} saves
                      </span>
                      <span>{result.views} views</span>
                    </div>
                  </div>
                  <h3 className="font-semibold text-white">{result.title}</h3>
                  <div className="mt-3 flex justify-between items-center">
                    <Progress value={(result.saves / result.views) * 100} className="h-2 flex-1 mr-4" />
                    <span className="text-sm text-gray-400">
                      {Math.round((result.saves / result.views) * 100)}% save rate
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}