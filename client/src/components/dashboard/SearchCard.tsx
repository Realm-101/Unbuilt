import React, { useState } from 'react';
import { useLocation } from 'wouter';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Eye,
  FileDown,
  Trash2,
  Star,
  MoreVertical,
  TrendingUp,
  Target,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useTouchFriendly } from '@/hooks/useTouchFriendly';
import { apiRequest } from '@/lib/queryClient';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { ConversationIndicator } from '@/components/conversation/ConversationIndicator';
import type { Search } from '@shared/schema';

interface SearchCardProps {
  search: Search & {
    innovationScore?: number;
    feasibilityRating?: string;
    resultsCount?: number;
  };
  conversationIndicator?: {
    hasConversation: boolean;
    messageCount: number;
    lastMessage?: {
      role: 'user' | 'assistant';
      content: string;
      timestamp: string | Date;
    };
  };
  onDelete?: (id: number) => void;
  onFavorite?: (id: number, isFavorite: boolean) => void;
  draggable?: boolean;
  onDragStart?: (e: React.DragEvent, searchId: number) => void;
}

export function SearchCard({
  search,
  conversationIndicator,
  onDelete,
  onFavorite,
  draggable = false,
  onDragStart,
}: SearchCardProps) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { isMobile, isTouchDevice } = useTouchFriendly();
  const [isHovered, setIsHovered] = useState(false);
  const [showActions, setShowActions] = useState(false);

  // Toggle favorite mutation
  const toggleFavoriteMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest(
        'PATCH',
        `/api/searches/${search.id}/favorite`,
        { isFavorite: !search.isFavorite }
      );
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/searches'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/stats'] });
      if (onFavorite) {
        onFavorite(search.id, !search.isFavorite);
      }
      toast({
        title: search.isFavorite ? 'Removed from favorites' : 'Added to favorites',
      });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to update favorite status',
        variant: 'destructive',
      });
    },
  });

  // Delete search mutation
  const deleteSearchMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('DELETE', `/api/searches/${search.id}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/searches'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/stats'] });
      if (onDelete) {
        onDelete(search.id);
      }
      toast({
        title: 'Search deleted',
      });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to delete search',
        variant: 'destructive',
      });
    },
  });

  const handleView = () => {
    setLocation(`/search/${search.id}`);
  };

  const handleExport = () => {
    // TODO: Implement export functionality
    toast({
      title: 'Export',
      description: 'Export functionality coming soon',
    });
  };

  const handleDelete = () => {
    if (confirm('Are you sure you want to delete this search?')) {
      deleteSearchMutation.mutate();
    }
  };

  const handleFavorite = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleFavoriteMutation.mutate();
  };

  const handleDragStart = (e: React.DragEvent) => {
    if (onDragStart) {
      onDragStart(e, search.id);
    }
  };

  return (
    <Card
      className={cn(
        "bg-gray-800/50 border-gray-700 hover:bg-gray-800 transition-all cursor-pointer group",
        isTouchDevice && "active:bg-gray-700"
      )}
      onMouseEnter={() => !isMobile && setIsHovered(true)}
      onMouseLeave={() => !isMobile && setIsHovered(false)}
      onClick={handleView}
      draggable={draggable}
      onDragStart={handleDragStart}
    >
      <CardContent className={cn("p-4", isMobile && "p-3")}>
        <div className="flex items-start justify-between gap-3 sm:gap-4">
          {/* Main Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <h3 className={cn(
                "font-semibold text-white truncate",
                isMobile && "text-sm"
              )}>
                {search.query}
              </h3>
              {search.isFavorite && (
                <Star className="w-4 h-4 text-yellow-400 fill-yellow-400 flex-shrink-0" />
              )}
            </div>

            {/* Metrics - Stack on very small screens */}
            <div className={cn(
              "flex flex-wrap items-center gap-2 sm:gap-4 text-xs sm:text-sm text-gray-400 mb-2 sm:mb-3"
            )}>
              <span className="flex items-center gap-1">
                <TrendingUp className="w-3 h-3" />
                {search.innovationScore ? `${search.innovationScore}/100` : 'N/A'}
              </span>
              {search.feasibilityRating && (
                <span className="flex items-center gap-1">
                  <Target className="w-3 h-3" />
                  {search.feasibilityRating}
                </span>
              )}
              <span>
                {search.resultsCount || 0} {search.resultsCount === 1 ? 'result' : 'results'}
              </span>
            </div>

            {/* Timestamp and Conversation Indicator */}
            <div className="flex items-center gap-2">
              <p className="text-xs text-gray-500">
                {formatDistanceToNow(new Date(search.timestamp), { addSuffix: true })}
              </p>
              {conversationIndicator?.hasConversation && (
                <ConversationIndicator
                  messageCount={conversationIndicator.messageCount}
                  lastMessage={conversationIndicator.lastMessage}
                  variant="badge"
                />
              )}
            </div>
          </div>

          {/* Quick Actions - Always visible on mobile, hover on desktop */}
          {(isHovered || isMobile) && (
            <div className="flex items-center gap-1 flex-shrink-0">
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  "h-8 w-8",
                  isTouchDevice && "min-h-[44px] min-w-[44px]"
                )}
                onClick={handleFavorite}
              >
                <Star
                  className={cn(
                    "w-4 h-4",
                    search.isFavorite ? 'text-yellow-400 fill-yellow-400' : 'text-gray-400'
                  )}
                />
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className={cn(
                      "h-8 w-8",
                      isTouchDevice && "min-h-[44px] min-w-[44px]"
                    )}
                  >
                    <MoreVertical className="w-4 h-4 text-gray-400" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                  <DropdownMenuItem 
                    onClick={handleView}
                    className={cn(isTouchDevice && "min-h-[44px]")}
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    View Details
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={handleExport}
                    className={cn(isTouchDevice && "min-h-[44px]")}
                  >
                    <FileDown className="w-4 h-4 mr-2" />
                    Export
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={handleDelete} 
                    className={cn(
                      "text-red-400",
                      isTouchDevice && "min-h-[44px]"
                    )}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
