import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'wouter';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Star, 
  Search, 
  Trash2, 
  Clock, 
  Filter,
  ChevronLeft,
  ChevronRight,
  AlertCircle
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';

interface SearchHistoryItem {
  id: number;
  query: string;
  timestamp: string;
  resultsCount: number;
  isFavorite: boolean;
}

interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export default function SearchHistory() {
  const [currentPage, setCurrentPage] = useState(1);
  const [searchFilter, setSearchFilter] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'favorites'>('all');
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Fetch search history
  const { data, isLoading, error } = useQuery<{
    searches: SearchHistoryItem[];
    pagination: PaginationInfo;
  }>({
    queryKey: ['searchHistory', currentPage, activeTab],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '20',
      });
      
      if (activeTab === 'favorites') {
        params.append('favorites', 'true');
      }

      const response = await fetch(`/api/search-history?${params}`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch search history');
      }

      return response.json();
    },
  });

  // Toggle favorite mutation
  const toggleFavoriteMutation = useMutation({
    mutationFn: async (searchId: number) => {
      const response = await fetch(`/api/search-history/${searchId}/favorite`, {
        method: 'POST',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to toggle favorite');
      }

      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['searchHistory'] });
      toast({
        title: data.message,
        variant: 'default',
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
    mutationFn: async (searchId: number) => {
      const response = await fetch(`/api/search-history/${searchId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to delete search');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['searchHistory'] });
      toast({
        title: 'Success',
        description: 'Search deleted successfully',
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

  // Delete all searches mutation
  const deleteAllMutation = useMutation({
    mutationFn: async (keepFavorites: boolean) => {
      const params = new URLSearchParams();
      if (keepFavorites) {
        params.append('keepFavorites', 'true');
      }

      const response = await fetch(`/api/search-history?${params}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to delete searches');
      }

      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['searchHistory'] });
      toast({
        title: 'Success',
        description: data.message,
      });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to delete searches',
        variant: 'destructive',
      });
    },
  });

  // Re-run search
  const handleRerunSearch = (query: string) => {
    navigate(`/search-results?q=${encodeURIComponent(query)}`);
  };

  // Filter searches by query text
  const filteredSearches = data?.searches.filter(search =>
    search.query.toLowerCase().includes(searchFilter.toLowerCase())
  ) || [];

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Search History</h1>
        <p className="text-muted-foreground">
          View and manage your previous searches
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'all' | 'favorites')} className="mb-6">
        <TabsList>
          <TabsTrigger value="all">All Searches</TabsTrigger>
          <TabsTrigger value="favorites">
            <Star className="w-4 h-4 mr-2" />
            Favorites
          </TabsTrigger>
        </TabsList>

        <div className="mt-4 flex flex-col sm:flex-row gap-4 justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Filter searches..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => deleteAllMutation.mutate(true)}
              disabled={deleteAllMutation.isPending}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Clear Non-Favorites
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => {
                if (confirm('Are you sure you want to delete all search history?')) {
                  deleteAllMutation.mutate(false);
                }
              }}
              disabled={deleteAllMutation.isPending}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Clear All
            </Button>
          </div>
        </div>

        <TabsContent value="all" className="mt-6">
          {isLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
              <p className="mt-4 text-muted-foreground">Loading search history...</p>
            </div>
          ) : error ? (
            <Card className="border-destructive">
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 text-destructive">
                  <AlertCircle className="w-5 h-5" />
                  <p>Failed to load search history</p>
                </div>
              </CardContent>
            </Card>
          ) : filteredSearches.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-center py-12">
                <Search className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  {searchFilter ? 'No searches match your filter' : 'No search history yet'}
                </p>
                {!searchFilter && (
                  <Button
                    className="mt-4"
                    onClick={() => navigate('/')}
                  >
                    Start Searching
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredSearches.map((search) => (
                <Card key={search.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <CardTitle className="text-lg mb-2">{search.query}</CardTitle>
                        <CardDescription className="flex items-center gap-4 flex-wrap">
                          <span className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            {formatDistanceToNow(new Date(search.timestamp), { addSuffix: true })}
                          </span>
                          <Badge variant="secondary">
                            {search.resultsCount} {search.resultsCount === 1 ? 'result' : 'results'}
                          </Badge>
                        </CardDescription>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => toggleFavoriteMutation.mutate(search.id)}
                          disabled={toggleFavoriteMutation.isPending}
                        >
                          <Star
                            className={`w-5 h-5 ${
                              search.isFavorite ? 'fill-yellow-400 text-yellow-400' : ''
                            }`}
                          />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            if (confirm('Delete this search?')) {
                              deleteSearchMutation.mutate(search.id);
                            }
                          }}
                          disabled={deleteSearchMutation.isPending}
                        >
                          <Trash2 className="w-5 h-5" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Button
                      onClick={() => handleRerunSearch(search.query)}
                      className="w-full sm:w-auto"
                    >
                      <Search className="w-4 h-4 mr-2" />
                      Re-run Search
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Pagination */}
          {data && data.pagination.totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-8">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="w-4 h-4" />
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {currentPage} of {data.pagination.totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.min(data.pagination.totalPages, p + 1))}
                disabled={currentPage === data.pagination.totalPages}
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          )}
        </TabsContent>

        <TabsContent value="favorites" className="mt-6">
          {/* Same content as "all" tab but filtered for favorites */}
          {isLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
              <p className="mt-4 text-muted-foreground">Loading favorites...</p>
            </div>
          ) : filteredSearches.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-center py-12">
                <Star className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No favorite searches yet</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Star searches to add them to your favorites
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredSearches.map((search) => (
                <Card key={search.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <CardTitle className="text-lg mb-2">{search.query}</CardTitle>
                        <CardDescription className="flex items-center gap-4 flex-wrap">
                          <span className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            {formatDistanceToNow(new Date(search.timestamp), { addSuffix: true })}
                          </span>
                          <Badge variant="secondary">
                            {search.resultsCount} {search.resultsCount === 1 ? 'result' : 'results'}
                          </Badge>
                        </CardDescription>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => toggleFavoriteMutation.mutate(search.id)}
                          disabled={toggleFavoriteMutation.isPending}
                        >
                          <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            if (confirm('Delete this search?')) {
                              deleteSearchMutation.mutate(search.id);
                            }
                          }}
                          disabled={deleteSearchMutation.isPending}
                        >
                          <Trash2 className="w-5 h-5" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Button
                      onClick={() => handleRerunSearch(search.query)}
                      className="w-full sm:w-auto"
                    >
                      <Search className="w-4 h-4 mr-2" />
                      Re-run Search
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
