import { db } from '../db';
import {
  resourceRatings,
  users,
  type ResourceRating,
  type InsertResourceRating
} from '@shared/schema';
import { eq, and, sql, desc } from 'drizzle-orm';

type UserInfo = {
  id: number;
  name: string | null;
  email: string;
};

export interface RatingWithUser extends ResourceRating {
  user?: UserInfo;
}

export interface RatingStats {
  averageRating: number;
  ratingCount: number;
  distribution: {
    1: number;
    2: number;
    3: number;
    4: number;
    5: number;
  };
}

/**
 * Rating Repository
 * Handles all database operations for resource ratings
 */
export class RatingRepository {
  /**
   * Get all ratings for a resource
   */
  async findByResourceId(
    resourceId: number,
    sortBy: 'recent' | 'helpful' = 'recent',
    limit?: number
  ): Promise<RatingWithUser[]> {
    const orderClause = sortBy === 'helpful'
      ? desc(resourceRatings.isHelpfulCount)
      : desc(resourceRatings.createdAt);

    let query = db
      .select()
      .from(resourceRatings)
      .where(eq(resourceRatings.resourceId, resourceId))
      .orderBy(orderClause);

    if (limit) {
      query = query.limit(limit) as any;
    }

    const ratings = await query;

    // Fetch user details for each rating
    const ratingsWithUsers = await Promise.all(
      ratings.map(async (rating) => {
        const userResult = await db
          .select({
            id: users.id,
            name: users.name,
            email: users.email
          })
          .from(users)
          .where(eq(users.id, rating.userId))
          .limit(1);

        return {
          ...rating,
          user: userResult[0]
        };
      })
    );

    return ratingsWithUsers;
  }

  /**
   * Get rating by ID
   */
  async findById(id: number): Promise<RatingWithUser | null> {
    const ratingResult = await db
      .select()
      .from(resourceRatings)
      .where(eq(resourceRatings.id, id))
      .limit(1);

    const rating = ratingResult[0];

    if (!rating) {
      return null;
    }

    const userResult = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email
      })
      .from(users)
      .where(eq(users.id, rating.userId))
      .limit(1);

    return {
      ...rating,
      user: userResult[0]
    };
  }

  /**
   * Get rating by user and resource
   */
  async findByUserAndResource(
    userId: number,
    resourceId: number
  ): Promise<ResourceRating | null> {
    const result = await db
      .select()
      .from(resourceRatings)
      .where(
        and(
          eq(resourceRatings.userId, userId),
          eq(resourceRatings.resourceId, resourceId)
        )
      )
      .limit(1);

    return result[0] || null;
  }

  /**
   * Check if user has rated a resource
   */
  async exists(userId: number, resourceId: number): Promise<boolean> {
    const rating = await this.findByUserAndResource(userId, resourceId);
    return !!rating;
  }

  /**
   * Create a new rating
   */
  async create(data: InsertResourceRating): Promise<ResourceRating> {
    const [rating] = await db
      .insert(resourceRatings)
      .values(data)
      .returning();

    return rating;
  }

  /**
   * Update a rating
   */
  async update(
    id: number,
    data: Partial<Pick<InsertResourceRating, 'rating' | 'review'>>
  ): Promise<ResourceRating | null> {
    const [rating] = await db
      .update(resourceRatings)
      .set({
        ...data,
        updatedAt: sql`NOW()`
      })
      .where(eq(resourceRatings.id, id))
      .returning();

    return rating || null;
  }

  /**
   * Delete a rating
   */
  async delete(id: number): Promise<boolean> {
    const result = await db
      .delete(resourceRatings)
      .where(eq(resourceRatings.id, id));

    return result.rowCount ? result.rowCount > 0 : false;
  }

  /**
   * Increment helpful count for a rating
   */
  async incrementHelpfulCount(id: number): Promise<void> {
    await db
      .update(resourceRatings)
      .set({ 
        isHelpfulCount: sql`${resourceRatings.isHelpfulCount} + 1` 
      })
      .where(eq(resourceRatings.id, id));
  }

  /**
   * Get rating statistics for a resource
   */
  async getStats(resourceId: number): Promise<RatingStats> {
    const ratings = await db
      .select()
      .from(resourceRatings)
      .where(eq(resourceRatings.resourceId, resourceId));

    if (ratings.length === 0) {
      return {
        averageRating: 0,
        ratingCount: 0,
        distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
      };
    }

    const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    let totalRating = 0;

    ratings.forEach(rating => {
      totalRating += rating.rating;
      distribution[rating.rating as keyof typeof distribution]++;
    });

    const averageRating = totalRating / ratings.length;

    return {
      averageRating: Math.round(averageRating * 10) / 10, // Round to 1 decimal
      ratingCount: ratings.length,
      distribution
    };
  }

  /**
   * Get average rating for a resource
   */
  async getAverageRating(resourceId: number): Promise<number> {
    const result = await db
      .select({ 
        avg: sql<number>`COALESCE(AVG(${resourceRatings.rating}), 0)` 
      })
      .from(resourceRatings)
      .where(eq(resourceRatings.resourceId, resourceId));

    return result[0]?.avg || 0;
  }

  /**
   * Get rating count for a resource
   */
  async countByResourceId(resourceId: number): Promise<number> {
    const result = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(resourceRatings)
      .where(eq(resourceRatings.resourceId, resourceId));

    return result[0]?.count || 0;
  }

  /**
   * Get all ratings by a user
   */
  async findByUserId(userId: number): Promise<ResourceRating[]> {
    return db
      .select()
      .from(resourceRatings)
      .where(eq(resourceRatings.userId, userId))
      .orderBy(desc(resourceRatings.createdAt));
  }

  /**
   * Get recent ratings across all resources
   */
  async getRecent(limit: number = 10): Promise<RatingWithUser[]> {
    const ratings = await db
      .select()
      .from(resourceRatings)
      .orderBy(desc(resourceRatings.createdAt))
      .limit(limit);

    // Fetch user details for each rating
    const ratingsWithUsers = await Promise.all(
      ratings.map(async (rating) => {
        const userResult = await db
          .select({
            id: users.id,
            name: users.name,
            email: users.email
          })
          .from(users)
          .where(eq(users.id, rating.userId))
          .limit(1);

        return {
          ...rating,
          user: userResult[0]
        };
      })
    );

    return ratingsWithUsers;
  }

  /**
   * Get top-rated resources
   */
  async getTopRated(limit: number = 10): Promise<number[]> {
    const result = await db
      .select({
        resourceId: resourceRatings.resourceId,
        avgRating: sql<number>`AVG(${resourceRatings.rating})`,
        count: sql<number>`count(*)::int`
      })
      .from(resourceRatings)
      .groupBy(resourceRatings.resourceId)
      .having(sql`count(*) >= 3`) // Minimum 3 ratings
      .orderBy(desc(sql`AVG(${resourceRatings.rating})`))
      .limit(limit);

    return result.map(r => r.resourceId);
  }
}

// Export singleton instance
export const ratingRepository = new RatingRepository();
