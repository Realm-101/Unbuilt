import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  LineChart, 
  Line, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts';
import { 
  TrendingUp, 
  Eye, 
  Bookmark, 
  Download, 
  ExternalLink,
  AlertCircle,
  Calendar,
  FileDown
} from 'lucide-react';
import { format, subDays } from 'date-fns';

interface ResourceAnalyticsData {
  resource: {
    id: number;
    title: string;
    averageRating: number;
    ratingCount: number;
    viewCount: number;
    bookmarkCount: number;
  };
  analytics: Array<{
    date: string;
    viewCount: number;
    uniqueUsers: number;
    bookmarkCount: number;
    downloadCount: number;
    externalClickCount: number;
  }>;
  totals: {
    totalViews: number;
    totalUniqueUsers: number;
    totalBookmarks: number;
    totalDownloads: number;
    totalExternalClicks: number;
  };
  dateRange: {
    start: string;
    end: string;
  };
}

interface ResourceAnalyticsProps {
  resourceId: number;
}

export function ResourceAnalytics({ resourceId }: ResourceAnalyticsProps) {
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d' | 'custom'>('30d');
  const [startDate, setStartDate] = useState(format(subDays(new Date(), 30), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  const { data, isLoading, error } = useQuery<ResourceAnalyticsData>({
    queryKey: ['admin', 'resource-analytics', resourceId, startDate, endDate],
    queryFn: async () => {
      const params = new URLSearchParams({
        startDate,
        endDate
      });
      
      const response = await fetch(
        `/api/admin/resources/${resourceId}/analytics?${params}`,
        { credentials: 'include' }
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch resource analytics');
      }
      
      const result = await response.json();
      return result.data;
    }
  });

  const handleDateRangeChange = (range: '7d' | '30d' | '90d' | 'custom') => {
    setDateRange(range);
    
    if (range !== 'custom') {
      const days = range === '7d' ? 7 : range === '30d' ? 30 : 90;
      setStartDate(format(subDays(new Date(), days), 'yyyy-MM-dd'));
      setEndDate(format(new Date(), 'yyyy-MM-dd'));
    }
  };

  const exportToCSV = () => {
    if (!data) return;

    const headers = ['Date', 'Views', 'Unique Users', 'Bookmarks', 'Downloads', 'External Clicks'];
    const rows = data.analytics.map(day => [
      day.date,
      day.viewCount,
      day.uniqueUsers,
      day.bookmarkCount,
      day.downloadCount,
      day.externalClickCount
    ]);

    const csv = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `resource-${resourceId}-analytics-${startDate}-to-${endDate}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertCircle className="h-5 w-5" />
            Error Loading Analytics
          </CardTitle>
          <CardDescription>
            {error instanceof Error ? error.message : 'An unknown error occurred'}
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Resource Info */}
      <Card>
        <CardHeader>
          <CardTitle>{data.resource.title}</CardTitle>
          <CardDescription>
            Resource Analytics Dashboard
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Average Rating</p>
              <p className="text-2xl font-bold">
                {(data.resource.averageRating / 100).toFixed(1)}
              </p>
              <p className="text-xs text-muted-foreground">
                {data.resource.ratingCount} ratings
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Views</p>
              <p className="text-2xl font-bold">{data.resource.viewCount}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Bookmarks</p>
              <p className="text-2xl font-bold">{data.resource.bookmarkCount}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Unique Users</p>
              <p className="text-2xl font-bold">{data.totals.totalUniqueUsers}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Date Range Controls */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Analytics Period</CardTitle>
              <CardDescription>
                Select a date range to view analytics
              </CardDescription>
            </div>
            <Button onClick={exportToCSV} variant="outline" size="sm">
              <FileDown className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <div className="flex gap-2">
              <Button
                variant={dateRange === '7d' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleDateRangeChange('7d')}
              >
                Last 7 Days
              </Button>
              <Button
                variant={dateRange === '30d' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleDateRangeChange('30d')}
              >
                Last 30 Days
              </Button>
              <Button
                variant={dateRange === '90d' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleDateRangeChange('90d')}
              >
                Last 90 Days
              </Button>
              <Button
                variant={dateRange === 'custom' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleDateRangeChange('custom')}
              >
                Custom
              </Button>
            </div>

            {dateRange === 'custom' && (
              <div className="flex gap-2 items-center">
                <div>
                  <Label htmlFor="start-date" className="text-xs">Start Date</Label>
                  <Input
                    id="start-date"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-40"
                  />
                </div>
                <div>
                  <Label htmlFor="end-date" className="text-xs">End Date</Label>
                  <Input
                    id="end-date"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-40"
                  />
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Views</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.totals.totalViews}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unique Users</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.totals.totalUniqueUsers}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Bookmarks</CardTitle>
            <Bookmark className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.totals.totalBookmarks}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Downloads</CardTitle>
            <Download className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.totals.totalDownloads}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">External Clicks</CardTitle>
            <ExternalLink className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.totals.totalExternalClicks}</div>
          </CardContent>
        </Card>
      </div>

      {/* Views Over Time Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Views Over Time</CardTitle>
          <CardDescription>
            Daily view count and unique users
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data.analytics}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="date" 
                tickFormatter={(value) => format(new Date(value), 'MMM d')}
              />
              <YAxis />
              <Tooltip 
                labelFormatter={(value) => format(new Date(value), 'MMM d, yyyy')}
              />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="viewCount" 
                stroke="#8884d8" 
                name="Views"
                strokeWidth={2}
              />
              <Line 
                type="monotone" 
                dataKey="uniqueUsers" 
                stroke="#82ca9d" 
                name="Unique Users"
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Engagement Metrics Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Engagement Metrics</CardTitle>
          <CardDescription>
            Bookmarks, downloads, and external clicks
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.analytics}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="date" 
                tickFormatter={(value) => format(new Date(value), 'MMM d')}
              />
              <YAxis />
              <Tooltip 
                labelFormatter={(value) => format(new Date(value), 'MMM d, yyyy')}
              />
              <Legend />
              <Bar dataKey="bookmarkCount" fill="#8884d8" name="Bookmarks" />
              <Bar dataKey="downloadCount" fill="#82ca9d" name="Downloads" />
              <Bar dataKey="externalClickCount" fill="#ffc658" name="External Clicks" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
