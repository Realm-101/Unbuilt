/**
 * Rating and Review System Integration Example
 * 
 * This example shows how to integrate the ResourceRating and ReviewList
 * components into a resource detail page.
 * 
 * Task 9: Implement rating and review system
 * Requirements: 6
 */

import { useQuery } from '@tanstack/react-query';
import { ResourceRating, ReviewList } from '@/components/resources';
import { useUser } from '@/hooks/use-user';

interface Resource {
  id: number;
  title: string;
  description: string;
  averageRating: number;
  ratingCount: number;
  // ... other resource fields
}

interface UserRating {
  id: number;
  rating: number;
  review?: string;
}

/**
 * Example Resource Detail Page Component
 * 
 * Shows how to integrate rating and review components
 */
export function ResourceDetailPage({ resourceId }: { resourceId: number }) {
  const { user } = useUser();

  // Fetch resource details
  const { data: resourceData, isLoading: resourceLoading } = useQuery({
    queryKey: ['resource', resourceId],
    queryFn: async () => {
      const response = await fetch(`/api/resources/${resourceId}`, {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch resource');
      return response.json();
    },
  });

  // Fetch user's rating if authenticated
  const { data: userRatingData } = useQuery({
    queryKey: ['user-rating', resourceId],
    queryFn: async () => {
      if (!user) return null;
      
      const response = await fetch(
        `/api/resources/${resourceId}/ratings?userId=${user.id}`,
        { credentials: 'include' }
      );
      if (!response.ok) return null;
      
      const data = await response.json();
      // Find user's rating in the list
      return data.data.ratings.find((r: any) => r.user?.id === user.id) || null;
    },
    enabled: !!user,
  });

  if (resourceLoading) {
    return <div>Loading...</div>;
  }

  const resource: Resource = resourceData?.data;
  const userRating: UserRating | null = userRatingData?.data || null;

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      {/* Resource Header */}
      <div>
        <h1 className="text-3xl font-bold">{resource.title}</h1>
        <p className="text-gray-600 mt-2">{resource.description}</p>
      </div>

      {/* Resource Content */}
      <div className="prose max-w-none">
        {/* Resource details, preview, etc. */}
      </div>

      {/* Rating and Review Section */}
      <div className="border-t pt-8 space-y-8">
        {/* Rating Input Component */}
        <div className="bg-white rounded-lg border p-6">
          <ResourceRating
            resourceId={resourceId}
            currentUserRating={userRating}
            averageRating={resource.averageRating}
            ratingCount={resource.ratingCount}
            onRatingSubmit={() => {
              // Optional callback after rating submission
              console.log('Rating submitted!');
            }}
          />
        </div>

        {/* Reviews List Component */}
        <div className="bg-white rounded-lg border p-6">
          <ReviewList
            resourceId={resourceId}
            currentUserId={user?.id}
          />
        </div>
      </div>
    </div>
  );
}

/**
 * Example: Inline Rating Display (for resource cards)
 * 
 * Shows how to display rating in a compact format
 */
export function ResourceCard({ resource }: { resource: Resource }) {
  return (
    <div className="border rounded-lg p-4">
      <h3 className="font-semibold">{resource.title}</h3>
      <p className="text-sm text-gray-600 mt-1">{resource.description}</p>
      
      {/* Compact Rating Display */}
      <div className="flex items-center gap-2 mt-3">
        <div className="flex">
          {[1, 2, 3, 4, 5].map((star) => (
            <Star
              key={star}
              className={`h-4 w-4 ${
                star <= Math.round(resource.averageRating)
                  ? 'fill-yellow-400 text-yellow-400'
                  : 'text-gray-300'
              }`}
            />
          ))}
        </div>
        <span className="text-sm text-gray-600">
          {resource.averageRating.toFixed(1)} ({resource.ratingCount})
        </span>
      </div>
    </div>
  );
}

/**
 * Example: Rating Filter (for resource library)
 * 
 * Shows how to filter resources by minimum rating
 */
export function ResourceLibraryFilters({
  minRating,
  onMinRatingChange,
}: {
  minRating: number;
  onMinRatingChange: (rating: number) => void;
}) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">Minimum Rating</label>
      <div className="flex gap-2">
        {[0, 3, 4, 5].map((rating) => (
          <button
            key={rating}
            onClick={() => onMinRatingChange(rating)}
            className={`px-3 py-1 rounded border ${
              minRating === rating
                ? 'bg-purple-600 text-white border-purple-600'
                : 'bg-white text-gray-700 border-gray-300'
            }`}
          >
            {rating === 0 ? 'All' : `${rating}+ ⭐`}
          </button>
        ))}
      </div>
    </div>
  );
}

/**
 * API Usage Examples
 */

// Submit a rating
async function submitRating(resourceId: number, rating: number, review?: string) {
  const response = await fetch(`/api/resources/${resourceId}/ratings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ rating, review }),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error);
  }
  
  return response.json();
}

// Update a rating
async function updateRating(ratingId: number, rating?: number, review?: string) {
  const response = await fetch(`/api/resources/ratings/${ratingId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ rating, review }),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error);
  }
  
  return response.json();
}

// Mark review as helpful
async function markReviewHelpful(ratingId: number) {
  const response = await fetch(`/api/resources/ratings/${ratingId}/helpful`, {
    method: 'POST',
    credentials: 'include',
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error);
  }
  
  return response.json();
}

// Fetch ratings with pagination and sorting
async function fetchRatings(
  resourceId: number,
  page: number = 1,
  sortBy: 'recent' | 'helpful' = 'recent'
) {
  const response = await fetch(
    `/api/resources/${resourceId}/ratings?page=${page}&limit=10&sortBy=${sortBy}`,
    { credentials: 'include' }
  );
  
  if (!response.ok) {
    throw new Error('Failed to fetch ratings');
  }
  
  return response.json();
}

/**
 * Usage Notes:
 * 
 * 1. Authentication:
 *    - Rating submission requires authentication
 *    - Helpful voting requires authentication
 *    - Anonymous users can view ratings
 * 
 * 2. Validation:
 *    - Rating must be 1-5 integer
 *    - Review max 2000 characters
 *    - Users can only update their own ratings
 * 
 * 3. Data Updates:
 *    - Average rating auto-calculated on submission
 *    - Resource rating stats updated immediately
 *    - TanStack Query handles cache invalidation
 * 
 * 4. UI/UX:
 *    - Optimistic updates for better UX
 *    - Loading states during submission
 *    - Toast notifications for feedback
 *    - Disabled states prevent double-submission
 * 
 * 5. Performance:
 *    - Ratings paginated (10 per page)
 *    - Queries cached by TanStack Query
 *    - Helpful votes increment without refetch
 */
