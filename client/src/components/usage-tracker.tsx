import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Crown, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { Search } from "@shared/schema";


interface UsageTrackerProps {
  onUpgrade: () => void;
  className?: string;
}

export default function UsageTracker({ onUpgrade, className = "" }: UsageTrackerProps) {
  const { data: user } = useQuery({
    queryKey: ["/api/auth/user"],
  });

  const { data: searches = [] } = useQuery({
    queryKey: ["/api/searches"],
  });

  if (!user) return null;

  const userPlan = (user as any)?.plan || 'free';
  const isProUser = userPlan === 'pro';
  
  // Calculate usage for current month
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  
  const monthlySearches = (searches as Search[]).filter((search: Search) => {
    const searchDate = new Date(search.timestamp);
    return searchDate.getMonth() === currentMonth && searchDate.getFullYear() === currentYear;
  });

  const searchesUsed = monthlySearches.length;
  const searchLimit = isProUser ? Infinity : 5;
  const searchesRemaining = isProUser ? Infinity : Math.max(0, searchLimit - searchesUsed);
  const usagePercentage = isProUser ? 0 : (searchesUsed / searchLimit) * 100;

  const shouldShowWarning = !isProUser && searchesUsed >= 3;
  const isLimitReached = !isProUser && searchesUsed >= searchLimit;

  if (isProUser) {
    return (
        <Card className={`bg-gradient-to-r from-yellow-600/20 to-orange-600/20 border-yellow-500/30 ${className}`}>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <Crown className="w-5 h-5 text-yellow-400" />
              <div>
                <p className="text-sm font-medium text-yellow-300">Pro Plan Active</p>
                <p className="text-xs text-gray-300">Unlimited searches • Advanced features</p>
              </div>
            </div>
          </CardContent>
        </Card>
    );
  }

  return (
      <Card className={`${shouldShowWarning ? 'bg-gradient-to-r from-red-600/20 to-orange-600/20 border-red-500/30' : 'bg-gradient-to-r from-purple-600/20 to-pink-600/20 border-purple-500/30'} ${className}`}>
        <CardContent className="p-4">
          <div className="space-y-3">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                {shouldShowWarning ? (
                  <AlertTriangle className="w-5 h-5 text-red-400" />
                ) : (
                  <Zap className="w-5 h-5 text-purple-400" />
                )}
                <div>
                  <p className={`text-sm font-medium ${shouldShowWarning ? 'text-red-300' : 'text-purple-300'}`}>
                    {isLimitReached ? 'Search Limit Reached' : 'Free Plan'}
                  </p>
                  <p className="text-xs text-gray-300">
                    {isLimitReached 
                      ? 'Upgrade to continue searching'
                      : `${searchesRemaining} searches remaining this month`
                    }
                  </p>
                </div>
              </div>
              
              {(shouldShowWarning || isLimitReached) && (
                <Button 
                  size="sm" 
                  onClick={onUpgrade}
                  className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white text-xs px-3 py-1"
                >
                  Upgrade
                </Button>
              )}
            </div>

            {/* Progress Bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-gray-300">{searchesUsed} / {searchLimit} searches</span>
                <span className={`font-medium ${shouldShowWarning ? 'text-red-300' : 'text-purple-300'}`}>
                  {Math.round(usagePercentage)}%
                </span>
              </div>
              <Progress 
                value={usagePercentage} 
                className={`h-2 ${shouldShowWarning ? 'bg-red-900/30' : 'bg-purple-900/30'}`}
              />
            </div>

            {/* Upgrade CTA */}
            {(shouldShowWarning || isLimitReached) && (
              <div className="pt-2 border-t border-gray-600">
                <p className="text-xs text-gray-300 mb-2">
                  {isLimitReached 
                    ? 'Get unlimited searches and advanced features:'
                    : 'Running low? Upgrade for unlimited access:'
                  }
                </p>
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <div className="w-1.5 h-1.5 bg-purple-400 rounded-full" />
                      <span className="text-xs text-gray-300">Unlimited AI searches</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-1.5 h-1.5 bg-purple-400 rounded-full" />
                      <span className="text-xs text-gray-300">PDF exports & reports</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-purple-300 font-medium">$29/month</p>
                    <p className="text-xs text-gray-400">7-day free trial</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
  );
}