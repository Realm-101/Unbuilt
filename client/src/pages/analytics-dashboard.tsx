import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import Layout from '@/components/layout-new';

interface AnalyticsMetrics {
  totalSearches: number;
  totalExports: number;
  totalPageViews: number;
  activeUsers: number;
  popularSearches: Array<{ query: string; count: number }>;
  exportsByFormat: Record<string, number>;
  conversionRate: number;
}

export default function AnalyticsDashboard() {
  const [metrics, setMetrics] = useState<AnalyticsMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
  });
  const { toast } = useToast();

  const fetchMetrics = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/analytics?range=30d`,
        {
          credentials: 'include',
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch analytics');
      }

      const data = await response.json();
      
      // Transform the data to match our interface
      const transformedMetrics: AnalyticsMetrics = {
        totalSearches: data.summary?.totalSearches || 0,
        totalExports: 0, // Not available in current API
        totalPageViews: 0, // Not available in current API
        activeUsers: data.summary?.uniqueUsers || 0,
        popularSearches: [], // Not available in current API
        exportsByFormat: {}, // Not available in current API
        conversionRate: 0, // Not available in current API
      };
      
      setMetrics(transformedMetrics);
    } catch (error) {
      console.error('Analytics fetch error:', error);
      toast({
        title: 'Error',
        description: 'Failed to load analytics data. Using demo data.',
        variant: 'destructive',
      });
      
      // Set demo data on error
      setMetrics({
        totalSearches: 0,
        totalExports: 0,
        totalPageViews: 0,
        activeUsers: 0,
        popularSearches: [],
        exportsByFormat: {},
        conversionRate: 0,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, [dateRange]);

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

  const exportChartData = metrics
    ? Object.entries(metrics.exportsByFormat).map(([format, count]) => ({
        name: format.toUpperCase(),
        value: count,
      }))
    : [];

  if (loading) {
    return (
      <Layout>
        <div className="container mx-auto p-6">
          <div className="flex items-center justify-center h-64">
            <div className="text-lg text-foreground">Loading analytics...</div>
          </div>
        </div>
      </Layout>
    );
  }

  if (!metrics) {
    return (
      <Layout>
        <div className="container mx-auto p-6">
          <div className="flex items-center justify-center h-64">
            <div className="text-lg text-foreground">No analytics data available</div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-foreground">Analytics Dashboard</h1>
        <div className="flex gap-4">
          <input
            type="date"
            value={dateRange.startDate}
            onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
            className="border rounded px-3 py-2 bg-background text-foreground border-border"
          />
          <input
            type="date"
            value={dateRange.endDate}
            onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
            className="border rounded px-3 py-2 bg-background text-foreground border-border"
          />
          <Button onClick={fetchMetrics}>Refresh</Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Total Searches</CardTitle>
            <CardDescription>Search queries performed</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{metrics.totalSearches}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Total Exports</CardTitle>
            <CardDescription>Results exported</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{metrics.totalExports}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Active Users</CardTitle>
            <CardDescription>Unique users in period</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{metrics.activeUsers}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Conversion Rate</CardTitle>
            <CardDescription>Users who exported</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{metrics.conversionRate.toFixed(1)}%</div>
          </CardContent>
        </Card>
      </div>

      {/* Popular Searches */}
      <Card>
        <CardHeader>
          <CardTitle>Popular Searches</CardTitle>
          <CardDescription>Top 10 search queries</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={metrics.popularSearches}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="query" angle={-45} textAnchor="end" height={100} />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="count" fill="#8884d8" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Exports by Format */}
      <Card>
        <CardHeader>
          <CardTitle>Exports by Format</CardTitle>
          <CardDescription>Distribution of export formats</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={exportChartData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {exportChartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Page Views */}
      <Card>
        <CardHeader>
          <CardTitle>Page Views</CardTitle>
          <CardDescription>Total page views in period</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{metrics.totalPageViews}</div>
        </CardContent>
      </Card>
    </div>
    </Layout>
  );
}
