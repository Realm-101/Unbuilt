import React, { useState, useEffect } from 'react';
import Layout from '@/components/layout-new';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  Treemap, ScatterChart, Scatter
} from 'recharts';
import { 
  TrendingUp, TrendingDown, DollarSign, Users, Target, Activity,
  Calendar, Download, Filter, RefreshCw, ChevronUp, ChevronDown
} from 'lucide-react';
import { motion } from 'framer-motion';
import { format, subDays } from 'date-fns';
import { useQuery } from '@tanstack/react-query';
import { TreemapCellProps } from '@/types/analytics';

interface MetricCard {
  title: string;
  value: string | number;
  change: number;
  icon: React.ElementType;
  trend: 'up' | 'down' | 'neutral';
}

// Custom Treemap Cell Component
const CustomTreemapCell: React.FC<TreemapCellProps> = (props) => {
  const { x, y, width, height, name, value, growth } = props;
  return (
    <g>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        style={{
          fill: growth > 40 ? '#10b981' : growth > 30 ? '#3b82f6' : '#8b5cf6',
          stroke: '#fff',
          strokeWidth: 2,
        }}
      />
      {width > 80 && height > 40 && (
        <>
          <text
            x={x + width / 2}
            y={y + height / 2 - 10}
            textAnchor="middle"
            fill="#fff"
            fontSize={12}
            fontWeight="bold"
          >
            {name}
          </text>
          <text
            x={x + width / 2}
            y={y + height / 2 + 10}
            textAnchor="middle"
            fill="#fff"
            fontSize={10}
          >
            {value}% growth
          </text>
        </>
      )}
    </g>
  );
};

export default function AnalyticsDashboard() {
  const [timeRange, setTimeRange] = useState('30d');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [refreshKey, setRefreshKey] = useState(0);

  // Fetch analytics data
  const { data: analyticsData, isLoading, refetch } = useQuery({
    queryKey: ['analytics', timeRange, selectedCategory, refreshKey],
    queryFn: async () => {
      const response = await fetch(`/api/analytics?range=${timeRange}&category=${selectedCategory}`);
      if (!response.ok) throw new Error('Failed to fetch analytics');
      return response.json();
    },
    refetchInterval: 60000, // Refresh every minute
  });

  // Generate time series data based on range
  const generateTimeSeriesData = () => {
    const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
    const data = [];
    for (let i = days; i >= 0; i--) {
      const date = subDays(new Date(), i);
      data.push({
        date: format(date, 'MMM dd'),
        searches: Math.floor(Math.random() * 1000) + 500,
        validations: Math.floor(Math.random() * 500) + 200,
        opportunities: Math.floor(Math.random() * 300) + 100,
        engagementRate: Math.random() * 100,
      });
    }
    return data;
  };

  const timeSeriesData = generateTimeSeriesData();

  // Market categories distribution
  const marketCategories = [
    { name: 'Technology', value: 3547, growth: 23.5 },
    { name: 'Healthcare', value: 2834, growth: 18.2 },
    { name: 'Finance', value: 2156, growth: 12.8 },
    { name: 'E-commerce', value: 1893, growth: 31.4 },
    { name: 'Education', value: 1567, growth: 15.3 },
    { name: 'Real Estate', value: 1234, growth: 8.7 },
    { name: 'Entertainment', value: 987, growth: 26.1 },
    { name: 'Food & Beverage', value: 876, growth: 11.2 },
  ];

  // User engagement metrics
  const engagementData = [
    { metric: 'Search Depth', A: 85, B: 92, fullMark: 100 },
    { metric: 'Validation Rate', A: 78, B: 85, fullMark: 100 },
    { metric: 'Report Generation', A: 65, B: 72, fullMark: 100 },
    { metric: 'Collaboration', A: 92, B: 88, fullMark: 100 },
    { metric: 'Return Rate', A: 88, B: 91, fullMark: 100 },
    { metric: 'Completion Rate', A: 73, B: 80, fullMark: 100 },
  ];

  // Opportunity heatmap data
  const heatmapData = [
    { name: 'AI/ML Solutions', size: 4500, growth: 45 },
    { name: 'Sustainable Tech', size: 3800, growth: 38 },
    { name: 'Remote Work Tools', size: 3200, growth: 28 },
    { name: 'Health Monitoring', size: 2900, growth: 35 },
    { name: 'EdTech Platforms', size: 2600, growth: 42 },
    { name: 'Fintech Services', size: 2400, growth: 31 },
    { name: 'IoT Solutions', size: 2100, growth: 25 },
    { name: 'Cybersecurity', size: 1900, growth: 48 },
    { name: 'Social Commerce', size: 1700, growth: 52 },
    { name: 'Digital Health', size: 1500, growth: 41 },
  ];

  // Key metrics
  const metrics: MetricCard[] = [
    {
      title: 'Total Searches',
      value: '45,234',
      change: 12.5,
      icon: Activity,
      trend: 'up',
    },
    {
      title: 'Market Opportunities',
      value: '1,892',
      change: 23.8,
      icon: Target,
      trend: 'up',
    },
    {
      title: 'Active Users',
      value: '8,421',
      change: -2.4,
      icon: Users,
      trend: 'down',
    },
    {
      title: 'Revenue Potential',
      value: '$2.4M',
      change: 18.2,
      icon: DollarSign,
      trend: 'up',
    },
  ];

  const COLORS = ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#14b8a6', '#f97316'];

  const handleExport = () => {
    // Export functionality
    console.log('Exporting analytics data...');
  };

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
    refetch();
  };

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
        <div className="container mx-auto px-4 py-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold tracking-tight">Analytics Dashboard</h1>
                <p className="text-muted-foreground mt-1">
                  Real-time insights and market trends analysis
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Select value={timeRange} onValueChange={setTimeRange}>
                  <SelectTrigger className="w-32">
                    <Calendar className="w-4 h-4 mr-2" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7d">Last 7 days</SelectItem>
                    <SelectItem value="30d">Last 30 days</SelectItem>
                    <SelectItem value="90d">Last 90 days</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" size="icon" onClick={handleRefresh}>
                  <RefreshCw className="w-4 h-4" />
                </Button>
                <Button variant="outline" onClick={handleExport}>
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </Button>
              </div>
            </div>
          </div>

          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {metrics.map((metric, index) => (
              <motion.div
                key={metric.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      {metric.title}
                    </CardTitle>
                    <metric.icon className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{metric.value}</div>
                    <p className={`text-xs flex items-center gap-1 ${
                      metric.trend === 'up' ? 'text-green-500' : 'text-red-500'
                    }`}>
                      {metric.trend === 'up' ? (
                        <ChevronUp className="w-3 h-3" />
                      ) : (
                        <ChevronDown className="w-3 h-3" />
                      )}
                      {Math.abs(metric.change)}%
                      <span className="text-muted-foreground">vs last period</span>
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          {/* Main Charts */}
          <Tabs defaultValue="overview" className="space-y-4">
            <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-grid">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="markets">Markets</TabsTrigger>
              <TabsTrigger value="engagement">Engagement</TabsTrigger>
              <TabsTrigger value="opportunities">Opportunities</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              <div className="grid gap-4 lg:grid-cols-2">
                {/* Trend Analysis */}
                <Card>
                  <CardHeader>
                    <CardTitle>Search & Validation Trends</CardTitle>
                    <CardDescription>
                      Daily activity over the selected period
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <AreaChart data={timeSeriesData}>
                        <defs>
                          <linearGradient id="colorSearches" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8}/>
                            <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                          </linearGradient>
                          <linearGradient id="colorValidations" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Area
                          type="monotone"
                          dataKey="searches"
                          stroke="#8b5cf6"
                          fillOpacity={1}
                          fill="url(#colorSearches)"
                        />
                        <Area
                          type="monotone"
                          dataKey="validations"
                          stroke="#3b82f6"
                          fillOpacity={1}
                          fill="url(#colorValidations)"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* Category Distribution */}
                <Card>
                  <CardHeader>
                    <CardTitle>Market Category Distribution</CardTitle>
                    <CardDescription>
                      Search volume by industry category
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={marketCategories}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {marketCategories.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>

              {/* Engagement Rate */}
              <Card>
                <CardHeader>
                  <CardTitle>User Engagement Rate</CardTitle>
                  <CardDescription>
                    Engagement metrics over time
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <LineChart data={timeSeriesData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line 
                        type="monotone" 
                        dataKey="engagementRate" 
                        stroke="#10b981" 
                        strokeWidth={2}
                        dot={{ fill: '#10b981' }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="markets" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Market Growth Analysis</CardTitle>
                  <CardDescription>
                    Year-over-year growth by category
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={marketCategories} layout="horizontal">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis dataKey="name" type="category" width={100} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="value" fill="#8b5cf6" name="Search Volume" />
                      <Bar dataKey="growth" fill="#10b981" name="Growth %" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="engagement" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Engagement Metrics Comparison</CardTitle>
                  <CardDescription>
                    Current period vs previous period
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={400}>
                    <RadarChart data={engagementData}>
                      <PolarGrid />
                      <PolarAngleAxis dataKey="metric" />
                      <PolarRadiusAxis angle={90} domain={[0, 100]} />
                      <Radar name="Current" dataKey="A" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.6} />
                      <Radar name="Previous" dataKey="B" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.6} />
                      <Legend />
                    </RadarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="opportunities" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Opportunity Heatmap</CardTitle>
                  <CardDescription>
                    Market opportunities by size and growth potential
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={400}>
                    <Treemap
                      data={heatmapData}
                      dataKey="size"
                      aspectRatio={4 / 3}
                      stroke="#fff"
                      fill="#8b5cf6"
                      content={CustomTreemapCell as any}
                    />
                  </ResponsiveContainer>
                  <div className="mt-4 flex items-center justify-center gap-4">
                    <Badge variant="outline">
                      <div className="w-3 h-3 bg-[#8b5cf6] rounded mr-2" />
                      Normal Growth
                    </Badge>
                    <Badge variant="outline">
                      <div className="w-3 h-3 bg-[#3b82f6] rounded mr-2" />
                      Good Growth
                    </Badge>
                    <Badge variant="outline">
                      <div className="w-3 h-3 bg-[#10b981] rounded mr-2" />
                      High Growth
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </Layout>
  );
}