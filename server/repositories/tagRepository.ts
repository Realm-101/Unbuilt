import { db } from '../db';
import {
  resourceTags,
  resourceTagMappings,
  resources,
  type ResourceTag,
  type InsertResourceTag
} from '@shared/schema';
import { eq, sql, desc, like, inArray } from 'drizzle-orm';

export interface TagWithCount extends ResourceTag {
  resourceCount?: number;
}

/**
 * Tag Repository
 * Handles all database operations for resource tags
 */
export class TagRepository {
  /**
   * Get all tags
   */
  async findAll(orderBy: 'name' | 'usage' = 'name'): Promise<ResourceTag[]> {
    const orderClause = orderBy === 'usage' 
      ? desc(resourceTags.usageCount)
      : resourceTags.name;

    return db
      .select()
      .from(resourceTags)
      .orderBy(orderClause);
  }

  /**
   * Get tag by ID
   */
  async findById(id: number): Promise<ResourceTag | null> {
    const result = await db
      .select()
      .from(resourceTags)
      .where(eq(resourceTags.id, id))
      .limit(1);

    return result[0] || null;
  }

  /**
   * Get tag by slug
   */
  async findBySlug(slug: string): Promise<ResourceTag | null> {
    const result = await db
      .select()
      .from(resourceTags)
      .where(eq(resourceTags.slug, slug))
      .limit(1);

    return result[0] || null;
  }

  /**
   * Get tag by name
   */
  async findByName(name: string): Promise<ResourceTag | null> {
    const result = await db
      .select()
      .from(resourceTags)
      .where(eq(resourceTags.name, name))
      .limit(1);

    return result[0] || null;
  }

  /**
   * Search tags by name
   */
  async search(query: string, limit: number = 10): Promise<ResourceTag[]> {
    return db
      .select()
      .from(resourceTags)
      .where(like(resourceTags.name, `%${query}%`))
      .orderBy(desc(resourceTags.usageCount))
      .limit(limit);
  }

  /**
   * Get popular tags
   */
  async getPopular(limit: number = 20): Promise<TagWithCount[]> {
    const tags = await db
      .select()
      .from(resourceTags)
      .orderBy(desc(resourceTags.usageCount))
      .limit(limit);

    return tags.map(tag => ({
      ...tag,
      resourceCount: tag.usageCount
    }));
  }

  /**
   * Get tags for a resource
   */
  async getResourceTags(resourceId: number): Promise<ResourceTag[]> {
    const tagMappings = await db
      .select({ tag: resourceTags })
      .from(resourceTagMappings)
      .innerJoin(resourceTags, eq(resourceTagMappings.tagId, resourceTags.id))
      .where(eq(resourceTagMappings.resourceId, resourceId));

    return tagMappings.map(tm => tm.tag);
  }

  /**
   * Get resources for a tag
   */
  async getTagResources(tagId: number): Promise<number[]> {
    const mappings = await db
      .select({ resourceId: resourceTagMappings.resourceId })
      .from(resourceTagMappings)
      .where(eq(resourceTagMappings.tagId, tagId));

    return mappings.map(m => m.resourceId);
  }

  /**
   * Create a new tag
   */
  async create(data: InsertResourceTag): Promise<ResourceTag> {
    const [tag] = await db
      .insert(resourceTags)
      .values(data)
      .returning();

    return tag;
  }

  /**
   * Update a tag
   */
  async update(
    id: number,
    data: Partial<InsertResourceTag>
  ): Promise<ResourceTag | null> {
    const [tag] = await db
      .update(resourceTags)
      .set(data)
      .where(eq(resourceTags.id, id))
      .returning();

    return tag || null;
  }

  /**
   * Delete a tag
   */
  async delete(id: number): Promise<boolean> {
    // First delete all mappings
    await db
      .delete(resourceTagMappings)
      .where(eq(resourceTagMappings.tagId, id));

    // Then delete the tag
    const result = await db
      .delete(resourceTags)
      .where(eq(resourceTags.id, id));

    return result.rowCount ? result.rowCount > 0 : false;
  }

  /**
   * Increment usage count for a tag
   */
  async incrementUsageCount(id: number): Promise<void> {
    await db
      .update(resourceTags)
      .set({ usageCount: sql`${resourceTags.usageCount} + 1` })
      .where(eq(resourceTags.id, id));
  }

  /**
   * Decrement usage count for a tag
   */
  async decrementUsageCount(id: number): Promise<void> {
    await db
      .update(resourceTags)
      .set({ 
        usageCount: sql`GREATEST(${resourceTags.usageCount} - 1, 0)` 
      })
      .where(eq(resourceTags.id, id));
  }

  /**
   * Recalculate usage count for a tag
   */
  async recalculateUsageCount(id: number): Promise<void> {
    const result = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(resourceTagMappings)
      .where(eq(resourceTagMappings.tagId, id));

    const count = result[0]?.count || 0;

    await db
      .update(resourceTags)
      .set({ usageCount: count })
      .where(eq(resourceTags.id, id));
  }

  /**
   * Recalculate usage counts for all tags
   */
  async recalculateAllUsageCounts(): Promise<void> {
    const tags = await this.findAll();

    for (const tag of tags) {
      await this.recalculateUsageCount(tag.id);
    }
  }

  /**
   * Find or create tag by name
   */
  async findOrCreate(name: string, slug?: string): Promise<ResourceTag> {
    // Try to find existing tag
    const existing = await this.findByName(name);
    if (existing) {
      return existing;
    }

    // Create new tag
    const tagSlug = slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    return this.create({ name, slug: tagSlug, usageCount: 0 });
  }

  /**
   * Find or create multiple tags by names
   */
  async findOrCreateMany(names: string[]): Promise<ResourceTag[]> {
    const tags: ResourceTag[] = [];

    for (const name of names) {
      const tag = await this.findOrCreate(name);
      tags.push(tag);
    }

    return tags;
  }

  /**
   * Get tags by IDs
   */
  async findByIds(ids: number[]): Promise<ResourceTag[]> {
    if (ids.length === 0) {
      return [];
    }

    return db
      .select()
      .from(resourceTags)
      .where(inArray(resourceTags.id, ids));
  }

  /**
   * Get related tags (tags that appear together with a given tag)
   */
  async getRelatedTags(tagId: number, limit: number = 10): Promise<TagWithCount[]> {
    // Get resources that have this tag
    const resourceIds = await this.getTagResources(tagId);

    if (resourceIds.length === 0) {
      return [];
    }

    // Get other tags from those resources
    const relatedTagCounts = await db
      .select({
        tagId: resourceTagMappings.tagId,
        count: sql<number>`count(*)::int`
      })
      .from(resourceTagMappings)
      .where(
        sql`${resourceTagMappings.resourceId} = ANY(${resourceIds}) AND ${resourceTagMappings.tagId} != ${tagId}`
      )
      .groupBy(resourceTagMappings.tagId)
      .orderBy(desc(sql`count(*)`))
      .limit(limit);

    const tagIds = relatedTagCounts.map(tc => tc.tagId);
    const tags = await this.findByIds(tagIds);

    const countMap = new Map(relatedTagCounts.map(tc => [tc.tagId, tc.count]));

    return tags.map(tag => ({
      ...tag,
      resourceCount: countMap.get(tag.id) || 0
    }));
  }
}

// Export singleton instance
export const tagRepository = new TagRepository();
