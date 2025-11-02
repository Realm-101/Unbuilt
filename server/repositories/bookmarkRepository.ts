import { db } from '../db';
import {
  userBookmarks,
  resources,
  type UserBookmark,
  type InsertUserBookmark
} from '@shared/schema';
import { eq, and, sql, desc } from 'drizzle-orm';

export interface BookmarkWithResource extends UserBookmark {
  resource?: typeof resources.$inferSelect;
}

/**
 * Bookmark Repository
 * Handles all database operations for user bookmarks
 */
export class BookmarkRepository {
  /**
   * Get all bookmarks for a user
   */
  async findByUserId(userId: number): Promise<BookmarkWithResource[]> {
    const bookmarks = await db
      .select()
      .from(userBookmarks)
      .where(eq(userBookmarks.userId, userId))
      .orderBy(desc(userBookmarks.createdAt));

    // Fetch resource details for each bookmark
    const bookmarksWithResources = await Promise.all(
      bookmarks.map(async (bookmark) => {
        const resourceResult = await db
          .select()
          .from(resources)
          .where(eq(resources.id, bookmark.resourceId))
          .limit(1);

        return {
          ...bookmark,
          resource: resourceResult[0]
        };
      })
    );

    return bookmarksWithResources;
  }

  /**
   * Get bookmark by ID
   */
  async findById(id: number): Promise<BookmarkWithResource | null> {
    const bookmarkResult = await db
      .select()
      .from(userBookmarks)
      .where(eq(userBookmarks.id, id))
      .limit(1);

    const bookmark = bookmarkResult[0];

    if (!bookmark) {
      return null;
    }

    const resourceResult = await db
      .select()
      .from(resources)
      .where(eq(resources.id, bookmark.resourceId))
      .limit(1);

    return {
      ...bookmark,
      resource: resourceResult[0]
    };
  }

  /**
   * Check if user has bookmarked a resource
   */
  async exists(userId: number, resourceId: number): Promise<boolean> {
    const result = await db
      .select()
      .from(userBookmarks)
      .where(
        and(
          eq(userBookmarks.userId, userId),
          eq(userBookmarks.resourceId, resourceId)
        )
      )
      .limit(1);

    return result.length > 0;
  }

  /**
   * Get bookmark by user and resource
   */
  async findByUserAndResource(
    userId: number,
    resourceId: number
  ): Promise<UserBookmark | null> {
    const result = await db
      .select()
      .from(userBookmarks)
      .where(
        and(
          eq(userBookmarks.userId, userId),
          eq(userBookmarks.resourceId, resourceId)
        )
      )
      .limit(1);

    return result[0] || null;
  }

  /**
   * Create a new bookmark
   */
  async create(data: InsertUserBookmark): Promise<UserBookmark> {
    const [bookmark] = await db
      .insert(userBookmarks)
      .values(data)
      .returning();

    return bookmark;
  }

  /**
   * Update a bookmark
   */
  async update(
    id: number,
    data: Partial<Pick<InsertUserBookmark, 'notes' | 'customTags'>>
  ): Promise<UserBookmark | null> {
    const [bookmark] = await db
      .update(userBookmarks)
      .set(data)
      .where(eq(userBookmarks.id, id))
      .returning();

    return bookmark || null;
  }

  /**
   * Delete a bookmark
   */
  async delete(id: number): Promise<boolean> {
    const result = await db
      .delete(userBookmarks)
      .where(eq(userBookmarks.id, id));

    return result.rowCount ? result.rowCount > 0 : false;
  }

  /**
   * Delete bookmark by user and resource
   */
  async deleteByUserAndResource(
    userId: number,
    resourceId: number
  ): Promise<boolean> {
    const result = await db
      .delete(userBookmarks)
      .where(
        and(
          eq(userBookmarks.userId, userId),
          eq(userBookmarks.resourceId, resourceId)
        )
      );

    return result.rowCount ? result.rowCount > 0 : false;
  }

  /**
   * Get bookmark count for a user
   */
  async countByUserId(userId: number): Promise<number> {
    const result = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(userBookmarks)
      .where(eq(userBookmarks.userId, userId));

    return result[0]?.count || 0;
  }

  /**
   * Get bookmark count for a resource
   */
  async countByResourceId(resourceId: number): Promise<number> {
    const result = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(userBookmarks)
      .where(eq(userBookmarks.resourceId, resourceId));

    return result[0]?.count || 0;
  }

  /**
   * Get bookmarked resource IDs for a user
   */
  async getBookmarkedResourceIds(userId: number): Promise<number[]> {
    const bookmarks = await db
      .select({ resourceId: userBookmarks.resourceId })
      .from(userBookmarks)
      .where(eq(userBookmarks.userId, userId));

    return bookmarks.map(b => b.resourceId);
  }
}

// Export singleton instance
export const bookmarkRepository = new BookmarkRepository();
