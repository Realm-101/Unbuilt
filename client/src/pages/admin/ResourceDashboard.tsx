import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  Star, 
  Bookmark, 
  Eye,
  AlertCircle
} from 'lucide-react';

interface ResourceStats {
  resources: {
    total: number;
    active: number;
    premium: number;
  };
  contributions: {
    total: number;
    pending: number;
    approved: number;
    rejected: number;
    approvalRate: number;
  };
  topResources: {
    byViews: Array<{
      id: number;
      title: string;
      viewCount: number;
      averageRating: number;
    }>;
    byRating: Array<{
      id: number;
      title: string;
      averageRating: number;
      ratingCount: number;
    }>;
    byBookmarks: Array<{
      id: number;
      title: string;
      bookmarkCount: number;
    }>;
  };
}

export default function ResourceDashboard() {
  const { data: stats, isLoading, error } = useQuery<ResourceStats>({
    queryKey: ['admin', 'resource-stats'],
    queryFn: async () => {
      const response = await fetch('/api/admin/resources/stats', {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch resource statistics');
      }
      
      const result = await response.json();
      return result.data;
    }
  });

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <Skeleton className="h-12 w-64" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              Error Loading Dashboard
            </CardTitle>
            <CardDescription>
              {error instanceof Error ? error.message : 'An unknown error occurred'}
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (!stats) {
    return null;
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Resource Library Dashboard</h1>
        <p className="text-muted-foreground">
          Manage and monitor your resource library
        </p>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Resources</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.resources.total}</div>
            <p className="text-xs text-muted-foreground">
              {stats.resources.active} active, {stats.resources.premium} premium
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Contributions</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.contributions.pending}</div>
            <p className="text-xs text-muted-foreground">
              {stats.contributions.approvalRate.toFixed(1)}% approval rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Contributions</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.contributions.total}</div>
            <p className="text-xs text-muted-foreground">
              {stats.contributions.approved} approved, {stats.contributions.rejected} rejected
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approval Rate</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.contributions.approvalRate.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">
              Of reviewed contributions
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Top Resources */}
      <Tabs defaultValue="views" className="space-y-4">
        <TabsList>
          <TabsTrigger value="views">Top by Views</TabsTrigger>
          <TabsTrigger value="rating">Top by Rating</TabsTrigger>
          <TabsTrigger value="bookmarks">Top by Bookmarks</TabsTrigger>
        </TabsList>

        <TabsContent value="views" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Most Viewed Resources</CardTitle>
              <CardDescription>
                Resources with the highest view counts
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {stats.topResources.byViews.map((resource, index) => (
                  <div
                    key={resource.id}
                    className="flex items-center justify-between p-3 rounded-lg border"
                  >
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className="w-8 h-8 flex items-center justify-center">
                        {index + 1}
                      </Badge>
                      <div>
                        <p className="font-medium">{resource.title}</p>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Eye className="h-3 w-3" />
                          {resource.viewCount} views
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      <span className="text-sm font-medium">
                        {(resource.averageRating / 100).toFixed(1)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rating" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Highest Rated Resources</CardTitle>
              <CardDescription>
                Resources with the best user ratings
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {stats.topResources.byRating.map((resource, index) => (
                  <div
                    key={resource.id}
                    className="flex items-center justify-between p-3 rounded-lg border"
                  >
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className="w-8 h-8 flex items-center justify-center">
                        {index + 1}
                      </Badge>
                      <div>
                        <p className="font-medium">{resource.title}</p>
                        <p className="text-sm text-muted-foreground">
                          {resource.ratingCount} ratings
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      <span className="text-sm font-medium">
                        {(resource.averageRating / 100).toFixed(1)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bookmarks" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Most Bookmarked Resources</CardTitle>
              <CardDescription>
                Resources saved most frequently by users
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {stats.topResources.byBookmarks.map((resource, index) => (
                  <div
                    key={resource.id}
                    className="flex items-center justify-between p-3 rounded-lg border"
                  >
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className="w-8 h-8 flex items-center justify-center">
                        {index + 1}
                      </Badge>
                      <p className="font-medium">{resource.title}</p>
                    </div>
                    <div className="flex items-center gap-1 text-sm">
                      <Bookmark className="h-4 w-4" />
                      <span className="font-medium">{resource.bookmarkCount}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
