import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { SearchCard } from './SearchCard';
import { Star } from 'lucide-react';
import type { Search as SearchType } from '@shared/schema';

type SortOption = 'date' | 'score';

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

export function Favorites() {
  const [sortBy, setSortBy] = useState<SortOption>('date');

  // Fetch favorite searches
  const { data: response, isLoading } = useQuery({
    queryKey: ['/api/searches/favorites'],
    select: (response: any) => {
      const searches = response?.data || response || [];
      return Array.isArray(searches) ? searches.filter((s: SearchType) => s.isFavorite) : [];
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

  const favorites = response || [];
  const indicators = indicatorsData?.indicators || {};

  // Sort favorites based on selected option
  const sortedFavorites = [...favorites].sort((a: SearchType, b: SearchType) => {
    if (sortBy === 'date') {
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    } else if (sortBy === 'score') {
      const scoreA = (a as any).innovationScore || 0;
      const scoreB = (b as any).innovationScore || 0;
      return scoreB - scoreA;
    }
    return 0;
  });

  if (isLoading) {
    return (
      <Card className="bg-gray-800/50 border-gray-700">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <Star className="w-5 h-5 text-yellow-400" />
            Favorites
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(2)].map((_, i) => (
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

  if (favorites.length === 0) {
    return (
      <Card className="bg-gray-800/50 border-gray-700">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <Star className="w-5 h-5 text-yellow-400" />
            Favorites
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Star className="w-12 h-12 mx-auto text-gray-600 mb-3" />
            <p className="text-gray-400">No favorites yet</p>
            <p className="text-sm text-gray-500 mt-2">
              Star searches to add them to your favorites
            </p>
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
            <Star className="w-5 h-5 text-yellow-400" />
            Favorites
          </CardTitle>
          <Select value={sortBy} onValueChange={(value) => setSortBy(value as SortOption)}>
            <SelectTrigger className="w-[140px] bg-gray-700 border-gray-600">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="date">Newest First</SelectItem>
              <SelectItem value="score">Highest Score</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {sortedFavorites.map((search: SearchType) => (
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
