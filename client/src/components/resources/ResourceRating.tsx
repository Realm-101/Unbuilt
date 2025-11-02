import { useState } from 'react';
import { Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useMutation, useQueryClient } from '@tanstack/react-query';

interface ResourceRatingProps {
  resourceId: number;
  currentUserRating?: {
    id: number;
    rating: number;
    review?: string;
  };
  averageRating: number;
  ratingCount: number;
  onRatingSubmit?: () => void;
}

/**
 * ResourceRating Component
 * 
 * Interactive 5-star rating input with optional review
 * Shows current user's rating if exists
 * Displays average rating and count
 * 
 * Requirements: 6
 */
export function ResourceRating({
  resourceId,
  currentUserRating,
  averageRating,
  ratingCount,
  onRatingSubmit
}: ResourceRatingProps) {
  const [hoveredStar, setHoveredStar] = useState<number | null>(null);
  const [selectedRating, setSelectedRating] = useState<number>(currentUserRating?.rating || 0);
  const [review, setReview] = useState<string>(currentUserRating?.review || '');
  const [isEditing, setIsEditing] = useState<boolean>(!currentUserRating);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Submit rating mutation
  const submitRatingMutation = useMutation({
    mutationFn: async (data: { rating: number; review?: string }) => {
      const response = await fetch(`/api/resources/${resourceId}/ratings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to submit rating');
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Rating submitted',
        description: 'Thank you for your feedback!',
      });
      setIsEditing(false);
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['resource', resourceId] });
      queryClient.invalidateQueries({ queryKey: ['resource-ratings', resourceId] });
      
      onRatingSubmit?.();
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to submit rating',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Update rating mutation
  const updateRatingMutation = useMutation({
    mutationFn: async (data: { rating?: number; review?: string }) => {
      if (!currentUserRating) {
        throw new Error('No existing rating to update');
      }

      const response = await fetch(`/api/resources/ratings/${currentUserRating.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update rating');
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Rating updated',
        description: 'Your rating has been updated.',
      });
      setIsEditing(false);
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['resource', resourceId] });
      queryClient.invalidateQueries({ queryKey: ['resource-ratings', resourceId] });
      
      onRatingSubmit?.();
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to update rating',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleStarClick = (rating: number) => {
    setSelectedRating(rating);
  };

  const handleSubmit = () => {
    if (selectedRating === 0) {
      toast({
        title: 'Rating required',
        description: 'Please select a star rating',
        variant: 'destructive',
      });
      return;
    }

    if (currentUserRating) {
      // Update existing rating
      updateRatingMutation.mutate({
        rating: selectedRating !== currentUserRating.rating ? selectedRating : undefined,
        review: review !== currentUserRating.review ? review : undefined,
      });
    } else {
      // Submit new rating
      submitRatingMutation.mutate({
        rating: selectedRating,
        review: review || undefined,
      });
    }
  };

  const handleCancel = () => {
    if (currentUserRating) {
      setSelectedRating(currentUserRating.rating);
      setReview(currentUserRating.review || '');
      setIsEditing(false);
    } else {
      setSelectedRating(0);
      setReview('');
    }
  };

  const displayRating = hoveredStar !== null ? hoveredStar : selectedRating;
  const isSubmitting = submitRatingMutation.isPending || updateRatingMutation.isPending;

  return (
    <div className="space-y-4">
      {/* Average Rating Display */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="flex">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                className={`h-5 w-5 ${
                  star <= Math.round(averageRating)
                    ? 'fill-yellow-400 text-yellow-400'
                    : 'text-gray-300'
                }`}
              />
            ))}
          </div>
          <span className="text-sm font-medium">
            {averageRating.toFixed(1)} ({ratingCount} {ratingCount === 1 ? 'rating' : 'ratings'})
          </span>
        </div>
      </div>

      {/* User Rating Input */}
      <div className="border-t pt-4">
        <div className="space-y-4">
          <div>
            <Label className="text-base font-semibold">
              {currentUserRating ? 'Your Rating' : 'Rate this resource'}
            </Label>
            {!isEditing && currentUserRating && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsEditing(true)}
                className="ml-2"
              >
                Edit
              </Button>
            )}
          </div>

          {isEditing ? (
            <>
              {/* Star Rating Input */}
              <div className="flex items-center gap-2">
                <div
                  className="flex"
                  onMouseLeave={() => setHoveredStar(null)}
                >
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => handleStarClick(star)}
                      onMouseEnter={() => setHoveredStar(star)}
                      className="focus:outline-none focus:ring-2 focus:ring-purple-500 rounded"
                      disabled={isSubmitting}
                    >
                      <Star
                        className={`h-8 w-8 transition-colors ${
                          star <= displayRating
                            ? 'fill-yellow-400 text-yellow-400'
                            : 'text-gray-300 hover:text-yellow-200'
                        }`}
                      />
                    </button>
                  ))}
                </div>
                {selectedRating > 0 && (
                  <span className="text-sm text-gray-600">
                    {selectedRating} {selectedRating === 1 ? 'star' : 'stars'}
                  </span>
                )}
              </div>

              {/* Review Textarea */}
              <div className="space-y-2">
                <Label htmlFor="review">Review (optional)</Label>
                <Textarea
                  id="review"
                  placeholder="Share your experience with this resource..."
                  value={review}
                  onChange={(e) => setReview(e.target.value)}
                  maxLength={2000}
                  rows={4}
                  disabled={isSubmitting}
                  className="resize-none"
                />
                <p className="text-xs text-gray-500">
                  {review.length}/2000 characters
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2">
                <Button
                  onClick={handleSubmit}
                  disabled={isSubmitting || selectedRating === 0}
                >
                  {isSubmitting ? 'Submitting...' : currentUserRating ? 'Update Rating' : 'Submit Rating'}
                </Button>
                <Button
                  variant="outline"
                  onClick={handleCancel}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
              </div>
            </>
          ) : (
            currentUserRating && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="flex">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`h-6 w-6 ${
                          star <= currentUserRating.rating
                            ? 'fill-yellow-400 text-yellow-400'
                            : 'text-gray-300'
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-sm font-medium">
                    {currentUserRating.rating} {currentUserRating.rating === 1 ? 'star' : 'stars'}
                  </span>
                </div>
                {currentUserRating.review && (
                  <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded">
                    {currentUserRating.review}
                  </p>
                )}
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}
