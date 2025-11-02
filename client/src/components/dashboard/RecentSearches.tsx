import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { SearchCard } from './SearchCard';
import { Clock, ChevronRight, Search } from 'lucide-react';
import type { Search as SearchType } from '@shared/schema';

interface ConversationIndicators {
  [analysisId: number]: {
    hasConversation: boolean;
    messageCount: number;
    lastMessage?: {
      role: 'user' | 'assistant';
      content: string;
      timestamp: string | Date;
    };
  };
}

interface RecentSearchesProps {
  limit?: number;
  showViewAll?: boolean;
}

export function RecentSearches({ limit = 5, showViewAll = true }: RecentSearchesProps) {
  const [, setLocation] = useLocation();

  // Fetch recent searches
  const { data: response, isLoading } = useQuery({
    queryKey: ['/api/searches', { limit }],
    select: (response: any) => {
      const searches = response?.data || response || [];
      return Array.isArray(searches) ? searches.slice(0, limit) : [];
    },
  });

  // Fetch conversation indicators
  const { data: indicatorsData } = useQuery<{ indicators: ConversationIndicators }>({
    queryKey: ['conversation-indicators'],
    queryFn: async () => {
      const response = await fetch('/api/conversations/indicators', {
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error('Failed to fetch conversation indicators');
      }
      const result = await response.json();
      return result.data;
    },
  });

  const recentSearches = response || [];
  const indicators = indicatorsData?.indicators || {};

  if (isLoading) {
    return (
      <Card className="bg-gray-800/50 border-gray-700">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <Clock className="w-5 h-5" />
            Recent Searches
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="h-24 bg-gray-700/50 rounded-lg animate-pulse"
              />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (recentSearches.length === 0) {
    return (
      <Card className="bg-gray-800/50 border-gray-700">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <Clock className="w-5 h-5" />
            Recent Searches
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Search className="w-12 h-12 mx-auto text-gray-600 mb-3" />
            <p className="text-gray-400 mb-4">No searches yet</p>
            <Button onClick={() => setLocation('/')}>
              Start Your First Search
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gray-800/50 border-gray-700">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-white">
            <Clock className="w-5 h-5" />
            Recent Searches
          </CardTitle>
          {showViewAll && recentSearches.length >= limit && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLocation('/search-history')}
              className="text-purple-400 hover:text-purple-300"
            >
              View All
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {recentSearches.map((search: SearchType) => (
            <SearchCard 
              key={search.id} 
              search={search}
              conversationIndicator={indicators[search.id]}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
