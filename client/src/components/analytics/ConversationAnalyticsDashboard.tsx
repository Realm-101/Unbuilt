import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  MessageSquare,
  Users,
  DollarSign,
  Clock,
  Star,
  AlertCircle,
  Activity,
} from 'lucide-react';

interface ConversationMetrics {
  conversationAdoptionRate: number;
  avgQuestionsPerConversation: number;
  avgConversationLength: number;
  returnRate: number;
  totalConversations: number;
  activeConversations: number;
  avgResponseTime: number;
  responseRelevanceScore: number;
  errorRate: number;
  inappropriateResponseRate: number;
  conversionImpact: number;
  retentionImpact: number;
  avgCostPerConversation: number;
  apiCostEfficiency: number;
  periodStart: string;
  periodEnd: string;
}

type TimePeriod = 'week' | 'month' | 'year';

const COLORS = ['#8b5cf6', '#ec4899', '#f97316', '#eab308'];

export function ConversationAnalyticsDashboard() {
  const [period, setPeriod] = useState<TimePeriod>('month');

  const { data: metricsData, isLoading, error } = useQuery({
    queryKey: ['/api/conversation-metrics', period],
    queryFn: async () => {
      const response = await fetch(`/api/conversation-metrics?period=${period}`, {
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error('Failed to fetch metrics');
      }
      return response.json();
    },
    refetchInterval: 60000, // Refetch every minute
  });

  const metrics: ConversationMetrics | undefined = metricsData?.metrics;

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Failed to load conversation analytics. Please try again later.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Conversation Analytics</h2>
          <p className="text-muted-foreground">
            Monitor engagement, quality, and business impact of AI conversations
          </p>
        </div>
        <Select value={period} onValueChange={(value) => setPeriod(value as TimePeriod)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Select period" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="week">Last 7 days</SelectItem>
            <SelectItem value="month">Last 30 days</SelectItem>
            <SelectItem value="year">Last 365 days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Tabs defaultValue="engagement" className="space-y-4">
        <TabsList>
          <TabsTrigger value="engagement">Engagement</TabsTrigger>
          <TabsTrigger value="quality">Quality</TabsTrigger>
          <TabsTrigger value="business">Business Impact</TabsTrigger>
          <TabsTrigger value="costs">Costs</TabsTrigger>
        </TabsList>

        <TabsContent value="engagement" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <MetricCard
              title="Adoption Rate"
              value={metrics?.conversationAdoptionRate}
              suffix="%"
              description="Analyses with conversations"
              icon={<MessageSquare className="h-4 w-4" />}
              isLoading={isLoading}
            />
            <MetricCard
              title="Avg Questions"
              value={metrics?.avgQuestionsPerConversation}
              description="Per conversation"
              icon={<Activity className="h-4 w-4" />}
              isLoading={isLoading}
            />
            <MetricCard
              title="Return Rate"
              value={metrics?.returnRate}
              suffix="%"
              description="Users who return"
              icon={<Users className="h-4 w-4" />}
              isLoading={isLoading}
            />
            <MetricCard
              title="Active Conversations"
              value={metrics?.activeConversations}
              description="Last 7 days"
              icon={<TrendingUp className="h-4 w-4" />}
              isLoading={isLoading}
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Engagement Overview</CardTitle>
              <CardDescription>
                Total conversations: {metrics?.totalConversations || 0}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-[300px] w-full" />
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart
                    data={[
                      {
                        name: 'Adoption',
                        value: metrics?.conversationAdoptionRate || 0,
                      },
                      {
                        name: 'Return Rate',
                        value: metrics?.returnRate || 0,
                      },
                      {
                        name: 'Avg Questions',
                        value: (metrics?.avgQuestionsPerConversation || 0) * 10, // Scale for visibility
                      },
                    ]}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="value" fill="#8b5cf6" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="quality" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <MetricCard
              title="Avg Response Time"
              value={metrics ? metrics.avgResponseTime / 1000 : undefined}
              suffix="s"
              description="AI response latency"
              icon={<Clock className="h-4 w-4" />}
              isLoading={isLoading}
              trend={
                metrics && metrics.avgResponseTime < 5000 ? 'up' : 'down'
              }
            />
            <MetricCard
              title="User Satisfaction"
              value={metrics?.responseRelevanceScore}
              suffix="/5"
              description="Average rating"
              icon={<Star className="h-4 w-4" />}
              isLoading={isLoading}
              trend={
                metrics && metrics.responseRelevanceScore >= 4 ? 'up' : 'down'
              }
            />
            <MetricCard
              title="Error Rate"
              value={metrics?.errorRate}
              suffix="%"
              description="Failed requests"
              icon={<AlertCircle className="h-4 w-4" />}
              isLoading={isLoading}
              trend={metrics && metrics.errorRate < 2 ? 'up' : 'down'}
            />
            <MetricCard
              title="Inappropriate Content"
              value={metrics?.inappropriateResponseRate}
              suffix="%"
              description="Flagged responses"
              icon={<AlertCircle className="h-4 w-4" />}
              isLoading={isLoading}
              trend={
                metrics && metrics.inappropriateResponseRate < 0.1 ? 'up' : 'down'
              }
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Quality Metrics</CardTitle>
              <CardDescription>Response quality and reliability</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-[300px] w-full" />
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={[
                        {
                          name: 'Excellent (5)',
                          value: metrics?.responseRelevanceScore === 5 ? 100 : 0,
                        },
                        {
                          name: 'Good (4)',
                          value: metrics?.responseRelevanceScore === 4 ? 100 : 0,
                        },
                        {
                          name: 'Average (3)',
                          value: metrics?.responseRelevanceScore === 3 ? 100 : 0,
                        },
                        {
                          name: 'Poor (<3)',
                          value:
                            metrics && metrics.responseRelevanceScore < 3 ? 100 : 0,
                        },
                      ]}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {COLORS.map((color, index) => (
                        <Cell key={`cell-${index}`} fill={color} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="business" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <MetricCard
              title="Conversion Impact"
              value={metrics?.conversionImpact}
              suffix="%"
              description="vs non-conversation users"
              icon={<TrendingUp className="h-4 w-4" />}
              isLoading={isLoading}
              trend={metrics && metrics.conversionImpact > 0 ? 'up' : 'down'}
            />
            <MetricCard
              title="Retention Impact"
              value={metrics?.retentionImpact}
              suffix="%"
              description="vs non-conversation users"
              icon={<Users className="h-4 w-4" />}
              isLoading={isLoading}
              trend={metrics && metrics.retentionImpact > 0 ? 'up' : 'down'}
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Business Impact</CardTitle>
              <CardDescription>
                How conversations affect conversion and retention
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-[300px] w-full" />
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart
                    data={[
                      {
                        name: 'Conversion Impact',
                        value: metrics?.conversionImpact || 0,
                      },
                      {
                        name: 'Retention Impact',
                        value: metrics?.retentionImpact || 0,
                      },
                    ]}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="value" fill="#ec4899" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="costs" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <MetricCard
              title="Avg Cost per Conversation"
              value={metrics?.avgCostPerConversation}
              prefix="$"
              description="API costs"
              icon={<DollarSign className="h-4 w-4" />}
              isLoading={isLoading}
            />
            <MetricCard
              title="API Cost Efficiency"
              value={metrics?.apiCostEfficiency}
              suffix="%"
              description="Optimized queries"
              icon={<Activity className="h-4 w-4" />}
              isLoading={isLoading}
              trend={metrics && metrics.apiCostEfficiency > 80 ? 'up' : 'down'}
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Cost Analysis</CardTitle>
              <CardDescription>
                Total estimated cost: $
                {metrics
                  ? (
                      metrics.avgCostPerConversation * metrics.totalConversations
                    ).toFixed(2)
                  : '0.00'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-[300px] w-full" />
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart
                    data={[
                      {
                        name: 'Current',
                        cost: metrics?.avgCostPerConversation || 0,
                      },
                    ]}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="cost"
                      stroke="#f97316"
                      strokeWidth={2}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

interface MetricCardProps {
  title: string;
  value?: number;
  prefix?: string;
  suffix?: string;
  description: string;
  icon: React.ReactNode;
  isLoading: boolean;
  trend?: 'up' | 'down';
}

function MetricCard({
  title,
  value,
  prefix = '',
  suffix = '',
  description,
  icon,
  isLoading,
  trend,
}: MetricCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-8 w-24" />
        ) : (
          <div className="flex items-baseline space-x-2">
            <div className="text-2xl font-bold">
              {prefix}
              {value !== undefined ? value.toFixed(2) : 'N/A'}
              {suffix}
            </div>
            {trend && (
              <div className="flex items-center">
                {trend === 'up' ? (
                  <TrendingUp className="h-4 w-4 text-green-500" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-red-500" />
                )}
              </div>
            )}
          </div>
        )}
        <p className="text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}
