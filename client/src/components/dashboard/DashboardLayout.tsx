import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { useUserPreferencesStore } from '@/stores/userPreferencesStore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Search, Star, FolderKanban, TrendingUp } from 'lucide-react';
import type { Search as SearchType } from '@shared/schema';

interface DashboardStats {
  searchesUsed: number;
  searchesLimit: number;
  favoritesCount: number;
  activeProjects: number;
}

interface DashboardLayoutProps {
  children?: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const { user } = useAuth();
  const { role } = useUserPreferencesStore();

  // Fetch dashboard stats
  const { data: stats } = useQuery<DashboardStats>({
    queryKey: ['/api/dashboard/stats'],
    enabled: !!user,
  });

  // Fetch recent searches
  const { data: recentSearchesResponse } = useQuery({
    queryKey: ['/api/searches'],
    enabled: !!user,
  });

  const recentSearches = (recentSearchesResponse as any)?.data || [];

  // Get personalized greeting based on role
  const getGreeting = () => {
    const roleGreetings: Record<string, string> = {
      entrepreneur: 'Ready to discover your next big opportunity?',
      investor: 'Find the next breakthrough investment',
      product_manager: 'Discover gaps in your product strategy',
      researcher: 'Explore untapped innovation opportunities',
      exploring: 'Welcome! Let\'s discover what\'s unbuilt',
    };
    return roleGreetings[role || 'exploring'] || roleGreetings.exploring;
  };

  // Check if user is new (no searches yet)
  const isNewUser = !recentSearches || recentSearches.length === 0;

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-black">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Banner */}
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold mb-2">
            <span className="neon-glow">
              Welcome back{user?.name ? `, ${user.name}` : ''}
            </span>
          </h1>
          <p className="text-lg text-gray-300">{getGreeting()}</p>
        </div>

        {/* Quick Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card className="bg-gray-800/50 border-gray-700">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-400 flex items-center gap-2">
                <Search className="w-4 h-4" />
                Searches Used
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">
                {stats?.searchesUsed ?? 0}
                {stats?.searchesLimit && stats.searchesLimit > 0 && (
                  <span className="text-sm text-gray-400 ml-1">
                    / {stats.searchesLimit}
                  </span>
                )}
              </div>
              {user?.plan === 'free' && stats?.searchesLimit && (
                <div className="mt-2 w-full bg-gray-700 rounded-full h-2">
                  <div
                    className="bg-purple-500 h-2 rounded-full transition-all"
                    style={{
                      width: `${Math.min(
                        ((stats.searchesUsed || 0) / stats.searchesLimit) * 100,
                        100
                      )}%`,
                    }}
                  />
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-gray-800/50 border-gray-700">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-400 flex items-center gap-2">
                <Star className="w-4 h-4" />
                Favorites
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">
                {stats?.favoritesCount ?? 0}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-800/50 border-gray-700">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-400 flex items-center gap-2">
                <FolderKanban className="w-4 h-4" />
                Active Projects
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">
                {stats?.activeProjects ?? 0}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-800/50 border-gray-700">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-400 flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                This Month
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">
                {stats?.searchesUsed ?? 0}
              </div>
              <p className="text-xs text-gray-400 mt-1">Searches performed</p>
            </CardContent>
          </Card>
        </div>

        {/* Empty State for New Users */}
        {isNewUser && (
          <Card className="bg-gray-800/50 border-gray-700 mb-8">
            <CardContent className="pt-6 text-center py-12">
              <div className="max-w-md mx-auto">
                <Search className="w-16 h-16 mx-auto text-purple-400 mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">
                  Start Your First Search
                </h3>
                <p className="text-gray-400 mb-6">
                  Discover untapped market opportunities and innovation gaps using AI-powered analysis.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Main Content Area */}
        {children}
      </div>
    </div>
  );
}
