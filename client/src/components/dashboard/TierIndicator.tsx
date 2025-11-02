import React, { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Crown, Zap, Building2, ArrowUpCircle } from 'lucide-react';
import { TierComparisonModal } from '@/components/tier';

interface TierIndicatorProps {
  showUsage?: boolean;
  compact?: boolean;
}

interface UsageStats {
  searchesUsed: number;
  searchesLimit: number;
  periodEnd: string;
}

const tierConfig = {
  free: {
    name: 'Free',
    icon: Zap,
    color: 'text-gray-400',
    bgColor: 'bg-gray-700',
    features: [
      '5 searches per month',
      'Basic gap analysis',
      'Export to PDF',
      'Community support',
    ],
    limits: ['Limited search history', 'No priority support', 'No advanced features'],
  },
  pro: {
    name: 'Pro',
    icon: Crown,
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-600',
    features: [
      'Unlimited searches',
      'Advanced analytics',
      'Priority support',
      'Export to multiple formats',
      'Collaboration features',
      'Custom reports',
    ],
    limits: [],
  },
  enterprise: {
    name: 'Enterprise',
    icon: Building2,
    color: 'text-purple-400',
    bgColor: 'bg-purple-600',
    features: [
      'Everything in Pro',
      'Dedicated account manager',
      'Custom integrations',
      'SLA guarantee',
      'Advanced security',
      'Team management',
      'API access',
    ],
    limits: [],
  },
};

export function TierIndicator({ showUsage = true, compact = false }: TierIndicatorProps) {
  const { user } = useAuth();
  const [isComparisonOpen, setIsComparisonOpen] = useState(false);

  // Fetch usage stats
  const { data: stats } = useQuery<UsageStats>({
    queryKey: ['/api/user/usage'],
    enabled: !!user && showUsage,
  });

  if (!user) return null;

  const tier = ((user as any).plan || 'free') as keyof typeof tierConfig;
  const config = tierConfig[tier];
  const Icon = config.icon;

  const usagePercentage = stats
    ? Math.min((stats.searchesUsed / stats.searchesLimit) * 100, 100)
    : 0;
  const isApproachingLimit = usagePercentage >= 80;

  if (compact) {
    return (
      <Badge
        className={`${config.bgColor} text-white cursor-pointer`}
        onClick={() => setIsComparisonOpen(true)}
      >
        <Icon className="w-3 h-3 mr-1" />
        {config.name}
      </Badge>
    );
  }

  return (
    <>
      <Card className="bg-gray-800/50 border-gray-700">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Icon className={`w-5 h-5 ${config.color}`} />
              <span className="font-semibold text-white">{config.name} Plan</span>
            </div>
            {tier === 'free' && (
              <Button
                size="sm"
                onClick={() => setIsComparisonOpen(true)}
                className="bg-purple-600 hover:bg-purple-700"
              >
                <ArrowUpCircle className="w-4 h-4 mr-2" />
                Upgrade
              </Button>
            )}
          </div>

          {/* Usage Progress for Free Tier */}
          {showUsage && tier === 'free' && stats && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">Searches Used</span>
                <span className="text-white font-medium">
                  {stats.searchesUsed} / {stats.searchesLimit}
                </span>
              </div>
              <Progress value={usagePercentage} className="h-2" />
              {isApproachingLimit && (
                <div className="flex items-start gap-2 p-3 bg-orange-500/10 border border-orange-500/20 rounded-lg mt-3">
                  <ArrowUpCircle className="w-4 h-4 text-orange-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm text-orange-300 font-medium">
                      You're running low on searches
                    </p>
                    <p className="text-xs text-orange-400 mt-1">
                      Upgrade to Pro for unlimited searches and advanced features
                    </p>
                    <Button
                      size="sm"
                      onClick={() => setIsComparisonOpen(true)}
                      className="mt-2 bg-orange-600 hover:bg-orange-700"
                    >
                      View Plans
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Pro/Enterprise Badge */}
          {tier !== 'free' && (
            <p className="text-sm text-gray-400">
              Enjoying unlimited searches and premium features
            </p>
          )}
        </CardContent>
      </Card>

      {/* Tier Comparison Modal */}
      <TierComparisonModal
        isOpen={isComparisonOpen}
        onClose={() => setIsComparisonOpen(false)}
      />
    </>
  );
}
