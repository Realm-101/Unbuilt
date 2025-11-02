import { useState } from 'react';
import { Star, ThumbsUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';

interface Review {
  id: number;
  rating: number;
  review?: string;
  isHelpfulCount: number;
  createdAt: string;
  user?: {
    id: number;
    name: string;
  };
}

interface ReviewListProps {
  resourceId: number;
  currentUserId?: number;
}

/**
 * ReviewList Component
 * 
 * Displays reviews with user info and date
 * Shows helpful vote count
 * Adds "Mark as helpful" button
 * Implements pagination for reviews
 * Sorts by recent or most helpful
 * 
 * Requirements: 6
 */
export function ReviewList({ resourceId, currentUserId }: ReviewListProps) {
  const [sortBy, setSortBy] = useState<'recent' | 'helpful'>('recent');
  const [page, setPage] = useState(1);
  const limit = 10;
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch reviews
  const { data, isLoading, error } = useQuery({
    queryKey: ['resource-ratings', resourceId, sortBy, page],
    queryFn: async () => {
      const response = await fetch(
        `/api/resources/${resourceId}/ratings?page=${page}&limit=${limit}&sortBy=${sortBy}`,
        {
          credentials: 'include',
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch reviews');
      }

      return response.json();
    },
  });

  // Mark as helpful mutation
  const markHelpfulMutation = useMutation({
    mutationFn: async (ratingId: number) => {
      const response = await fetch(`/api/resources/ratings/${ratingId}/helpful`, {
        method: 'POST',
        credentials: 'include',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to mark as helpful');
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Thank you!',
        description: 'Your feedback has been recorded.',
      });
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['resource-ratings', resourceId] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to mark as helpful',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleMarkHelpful = (ratingId: number, reviewUserId: number) => {
    if (!currentUserId) {
      toast({
        title: 'Sign in required',
        description: 'Please sign in to mark reviews as helpful',
        variant: 'destructive',
      });
      return;
    }

    if (currentUserId === reviewUserId) {
      toast({
        title: 'Cannot mark own review',
        description: 'You cannot mark your own review as helpful',
        variant: 'destructive',
      });
      return;
    }

    markHelpfulMutation.mutate(ratingId);
  };

  const handleSortChange = (newSortBy: 'recent' | 'helpful') => {
    setSortBy(newSortBy);
    setPage(1); // Reset to first page when changing sort
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    // Scroll to top of reviews
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Reviews</h3>
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="border rounded-lg p-4 animate-pulse">
              <div className="flex items-start gap-4">
                <div className="h-10 w-10 bg-gray-200 rounded-full" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-1/4" />
                  <div className="h-4 bg-gray-200 rounded w-1/3" />
                  <div className="h-16 bg-gray-200 rounded" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-600">Failed to load reviews</p>
      </div>
    );
  }

  const reviews = data?.data?.ratings || [];
  const pagination = data?.data?.pagination || { page: 1, totalPages: 1, total: 0 };
  const stats = data?.data?.stats;

  if (reviews.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Reviews</h3>
        </div>
        <div className="text-center py-8 text-gray-500">
          <p>No reviews yet. Be the first to review this resource!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with Sort Options */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">
          Reviews ({pagination.total})
        </h3>
        <div className="flex gap-2">
          <Button
            variant={sortBy === 'recent' ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleSortChange('recent')}
          >
            Most Recent
          </Button>
          <Button
            variant={sortBy === 'helpful' ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleSortChange('helpful')}
          >
            Most Helpful
          </Button>
        </div>
      </div>

      {/* Rating Distribution (if available) */}
      {stats && (
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center gap-4">
            <div className="text-center">
              <div className="text-3xl font-bold">{stats.averageRating.toFixed(1)}</div>
              <div className="flex justify-center mt-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`h-4 w-4 ${
                      star <= Math.round(stats.averageRating)
                        ? 'fill-yellow-400 text-yellow-400'
                        : 'text-gray-300'
                    }`}
                  />
                ))}
              </div>
              <div className="text-xs text-gray-600 mt-1">
                {stats.ratingCount} {stats.ratingCount === 1 ? 'rating' : 'ratings'}
              </div>
            </div>
            <div className="flex-1 space-y-1">
              {[5, 4, 3, 2, 1].map((rating) => (
                <div key={rating} className="flex items-center gap-2">
                  <span className="text-xs w-8">{rating} star</span>
                  <div className="flex-1 bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-yellow-400 h-2 rounded-full"
                      style={{
                        width: `${
                          stats.ratingCount > 0
                            ? (stats.distribution[rating as keyof typeof stats.distribution] / stats.ratingCount) * 100
                            : 0
                        }%`,
                      }}
                    />
                  </div>
                  <span className="text-xs w-8 text-right">
                    {stats.distribution[rating as keyof typeof stats.distribution]}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Reviews List */}
      <div className="space-y-4">
        {reviews.map((review: Review) => (
          <div key={review.id} className="border rounded-lg p-4">
            <div className="flex items-start gap-4">
              {/* User Avatar */}
              <div className="h-10 w-10 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-purple-600 font-semibold">
                  {review.user?.name?.charAt(0).toUpperCase() || 'U'}
                </span>
              </div>

              {/* Review Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium">{review.user?.name || 'Anonymous'}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={`h-4 w-4 ${
                              star <= review.rating
                                ? 'fill-yellow-400 text-yellow-400'
                                : 'text-gray-300'
                            }`}
                          />
                        ))}
                      </div>
                      <span className="text-xs text-gray-500">
                        {formatDistanceToNow(new Date(review.createdAt), { addSuffix: true })}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Review Text */}
                {review.review && (
                  <p className="mt-3 text-gray-700 whitespace-pre-wrap break-words">
                    {review.review}
                  </p>
                )}

                {/* Helpful Button */}
                <div className="mt-3 flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleMarkHelpful(review.id, review.user?.id || 0)}
                    disabled={markHelpfulMutation.isPending || !currentUserId || currentUserId === review.user?.id}
                    className="text-gray-600 hover:text-purple-600"
                  >
                    <ThumbsUp className="h-4 w-4 mr-1" />
                    Helpful ({review.isHelpfulCount})
                  </Button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(page - 1)}
            disabled={page === 1}
          >
            Previous
          </Button>
          <span className="text-sm text-gray-600">
            Page {pagination.page} of {pagination.totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(page + 1)}
            disabled={page === pagination.totalPages}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
