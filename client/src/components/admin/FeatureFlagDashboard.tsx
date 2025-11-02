/**
 * Feature Flag Dashboard Component
 * 
 * Admin interface for managing feature flags and monitoring rollout
 */

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Flag, 
  Users, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle, 
  XCircle,
  RefreshCw
} from 'lucide-react';

interface FeatureFlag {
  id: number;
  name: string;
  description: string;
  enabled: boolean;
  rolloutPercentage: number;
  allowedTiers: string[];
  allowedUserIds: number[];
  createdAt: string;
  updatedAt: string;
}

export function FeatureFlagDashboard() {
  const queryClient = useQueryClient();
  const [selectedFlag, setSelectedFlag] = useState<FeatureFlag | null>(null);

  // Fetch all feature flags
  const { data: flags, isLoading } = useQuery<{ success: boolean; data: FeatureFlag[] }>({
    queryKey: ['feature-flags'],
    queryFn: async () => {
      const response = await fetch('/api/feature-flags', {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch feature flags');
      return response.json();
    },
    refetchInterval: 30000 // Refresh every 30 seconds
  });

  // Update feature flag mutation
  const updateFlagMutation = useMutation({
    mutationFn: async (data: { name: string; config: Partial<FeatureFlag> }) => {
      const response = await fetch('/api/feature-flags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name: data.name, ...data.config })
      });
      if (!response.ok) throw new Error('Failed to update feature flag');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feature-flags'] });
    }
  });

  // Update rollout percentage mutation
  const updateRolloutMutation = useMutation({
    mutationFn: async (data: { name: string; percentage: number }) => {
      const response = await fetch(`/api/feature-flags/${data.name}/rollout`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ percentage: data.percentage })
      });
      if (!response.ok) throw new Error('Failed to update rollout');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feature-flags'] });
    }
  });

  // Clear cache mutation
  const clearCacheMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/feature-flags/cache/clear', {
        method: 'POST',
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to clear cache');
      return response.json();
    }
  });

  const handleToggleEnabled = (flag: FeatureFlag) => {
    updateFlagMutation.mutate({
      name: flag.name,
      config: { enabled: !flag.enabled }
    });
  };

  const handleUpdateRollout = (flag: FeatureFlag, percentage: number) => {
    updateRolloutMutation.mutate({
      name: flag.name,
      percentage
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-purple-500" />
      </div>
    );
  }

  const featureFlags = flags?.data || [];

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Flag className="w-8 h-8 text-purple-500" />
            Feature Flags
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage feature rollout and A/B testing
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => clearCacheMutation.mutate()}
          disabled={clearCacheMutation.isPending}
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${clearCacheMutation.isPending ? 'animate-spin' : ''}`} />
          Clear Cache
        </Button>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Flags</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{featureFlags.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Enabled</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">
              {featureFlags.filter(f => f.enabled).length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">In Rollout</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-500">
              {featureFlags.filter(f => f.enabled && f.rolloutPercentage < 100).length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Feature Flags List */}
      <div className="space-y-4">
        {featureFlags.map((flag) => (
          <Card key={flag.id} className="border-l-4 border-l-purple-500">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <CardTitle className="flex items-center gap-2">
                    {flag.name}
                    {flag.enabled ? (
                      <Badge variant="default" className="bg-green-500">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Enabled
                      </Badge>
                    ) : (
                      <Badge variant="secondary">
                        <XCircle className="w-3 h-3 mr-1" />
                        Disabled
                      </Badge>
                    )}
                  </CardTitle>
                  <CardDescription>{flag.description}</CardDescription>
                </div>
                <Switch
                  checked={flag.enabled}
                  onCheckedChange={() => handleToggleEnabled(flag)}
                  disabled={updateFlagMutation.isPending}
                />
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Rollout Percentage */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Rollout Percentage</Label>
                  <span className="text-sm font-medium">{flag.rolloutPercentage}%</span>
                </div>
                <Slider
                  value={[flag.rolloutPercentage]}
                  onValueChange={([value]) => handleUpdateRollout(flag, value)}
                  max={100}
                  step={5}
                  disabled={!flag.enabled || updateRolloutMutation.isPending}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>0%</span>
                  <span>50%</span>
                  <span>100%</span>
                </div>
              </div>

              {/* Allowed Tiers */}
              {flag.allowedTiers.length > 0 && (
                <div className="space-y-2">
                  <Label>Allowed Tiers</Label>
                  <div className="flex gap-2">
                    {flag.allowedTiers.map((tier) => (
                      <Badge key={tier} variant="outline">
                        {tier}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Beta Users */}
              {flag.allowedUserIds.length > 0 && (
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    Beta Users
                  </Label>
                  <div className="text-sm text-muted-foreground">
                    {flag.allowedUserIds.length} users have explicit access
                  </div>
                </div>
              )}

              {/* Metadata */}
              <div className="pt-4 border-t text-xs text-muted-foreground space-y-1">
                <div>Created: {new Date(flag.createdAt).toLocaleString()}</div>
                <div>Updated: {new Date(flag.updatedAt).toLocaleString()}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {featureFlags.length === 0 && (
        <Alert>
          <AlertTriangle className="w-4 h-4" />
          <AlertDescription>
            No feature flags found. Initialize feature flags using the deployment script.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
