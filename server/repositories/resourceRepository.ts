import { db } from '../db';
import { 
  resources, 
  resourceCategories, 
  resourceTags, 
  resourceTagMappings,
  type Resource,
  type InsertResource,
  type UpdateResource
} from '@shared/schema';
import { eq, and, or, sql, desc, asc, inArray, gte, lte } from 'drizzle-orm';

export interface ResourceFilters {
  categoryId?: number;
  categoryIds?: number[];
  phases?: string[];
  ideaTypes?: string[];
  resourceTypes?: string[];
  minRating?: number;
  isPremium?: boolean;
  isActive?: boolean;
  searchQuery?: string;
}

export interface PaginationOptions {
  page?: number;
  limit?: number;
  sortBy?: 'rating' | 'recent' | 'popular' | 'title';
  sortOrder?: 'asc' | 'desc';
}

export interface ResourceWithRelations extends Resource {
  category?: typeof resourceCategories.$inferSelect | null;
  tags?: Array<typeof resourceTags.$inferSelect>;
}

export interface PaginatedResources {
  resources: ResourceWithRelations[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/**
 * Resource Repository
 * Handles all database operations for resources
 */
export class ResourceRepository {
  /**
   * Find all resources with filtering and pagination
   */
  async findAll(
    filters: ResourceFilters = {},
    pagination: PaginationOptions = {}
  ): Promise<PaginatedResources> {
    const {
      categoryId,
      categoryIds,
      phases,
      ideaTypes,
      resourceTypes,
      minRating,
      isPremium,
      isActive = true,
      searchQuery
    } = filters;

    const {
      page = 1,
      limit = 20,
      sortBy = 'recent',
      sortOrder = 'desc'
    } = pagination;

    const offset = (page - 1) * limit;

    // Build WHERE conditions
    const conditions = [];
    
    if (isActive !== undefined) {
      conditions.push(eq(resources.isActive, isActive));
    }

    if (categoryId) {
      conditions.push(eq(resources.categoryId, categoryId));
    }

    if (categoryIds && categoryIds.length > 0) {
      conditions.push(inArray(resources.categoryId, categoryIds));
    }

    if (isPremium !== undefined) {
      conditions.push(eq(resources.isPremium, isPremium));
    }

    if (minRating !== undefined) {
      // Rating is stored as integer (0-500 for 0.0-5.0)
      const minRatingInt = Math.floor(minRating * 100);
      conditions.push(gte(resources.averageRating, minRatingInt));
    }

    // JSONB array filters
    if (phases && phases.length > 0) {
      conditions.push(
        sql`${resources.phaseRelevance}::jsonb ?| array[${sql.join(phases.map(p => sql`${p}`), sql`, `)}]`
      );
    }

    if (ideaTypes && ideaTypes.length > 0) {
      conditions.push(
        sql`${resources.ideaTypes}::jsonb ?| array[${sql.join(ideaTypes.map(t => sql`${t}`), sql`, `)}]`
      );
    }

    if (resourceTypes && resourceTypes.length > 0) {
      conditions.push(inArray(resources.resourceType, resourceTypes));
    }

    // Full-text search
    if (searchQuery && searchQuery.trim()) {
      const searchTerms = searchQuery.trim().split(/\s+/).join(' & ');
      conditions.push(
        sql`to_tsvector('english', ${resources.title} || ' ' || ${resources.description}) @@ to_tsquery('english', ${searchTerms})`
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Determine sort order
    let orderByClause;
    const direction = sortOrder === 'asc' ? asc : desc;
    
    switch (sortBy) {
      case 'rating':
        orderByClause = direction(resources.averageRating);
        break;
      case 'popular':
        orderByClause = direction(resources.viewCount);
        break;
      case 'title':
        orderByClause = direction(resources.title);
        break;
      case 'recent':
      default:
        orderByClause = direction(resources.createdAt);
        break;
    }

    // Get total count
    const countResult = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(resources)
      .where(whereClause);
    
    const total = countResult[0]?.count || 0;

    // Get paginated results
    const results = await db
      .select()
      .from(resources)
      .where(whereClause)
      .orderBy(orderByClause)
      .limit(limit)
      .offset(offset);

    // Fetch related data for each resource
    const resourcesWithRelations = await Promise.all(
      results.map(async (resource) => {
        const [categoryResult, tagMappings] = await Promise.all([
          resource.categoryId
            ? db
                .select()
                .from(resourceCategories)
                .where(eq(resourceCategories.id, resource.categoryId))
                .limit(1)
            : Promise.resolve([]),
          db
            .select({ tag: resourceTags })
            .from(resourceTagMappings)
            .innerJoin(resourceTags, eq(resourceTagMappings.tagId, resourceTags.id))
            .where(eq(resourceTagMappings.resourceId, resource.id))
        ]);

        return {
          ...resource,
          category: categoryResult[0] || null,
          tags: tagMappings.map((tm: any) => tm.tag)
        };
      })
    );

    return {
      resources: resourcesWithRelations,
      total,
      page,
      pageSize: limit,
      totalPages: Math.ceil(total / limit)
    };
  }

  /**
   * Find resource by ID with related data
   */
  async findById(id: number): Promise<ResourceWithRelations | null> {
    const resourceResult = await db
      .select()
      .from(resources)
      .where(eq(resources.id, id))
      .limit(1);

    const resource = resourceResult[0];

    if (!resource) {
      return null;
    }

    const [categoryResult, tagMappings] = await Promise.all([
      resource.categoryId
        ? db
            .select()
            .from(resourceCategories)
            .where(eq(resourceCategories.id, resource.categoryId))
            .limit(1)
        : Promise.resolve([]),
      db
        .select({ tag: resourceTags })
        .from(resourceTagMappings)
        .innerJoin(resourceTags, eq(resourceTagMappings.tagId, resourceTags.id))
        .where(eq(resourceTagMappings.resourceId, resource.id))
    ]);

    return {
      ...resource,
      category: categoryResult[0] || null,
      tags: tagMappings.map((tm: any) => tm.tag)
    };
  }

  /**
   * Create a new resource
   */
  async create(data: InsertResource): Promise<Resource> {
    const [resource] = await db
      .insert(resources)
      .values(data)
      .returning();

    return resource;
  }

  /**
   * Update a resource
   */
  async update(id: number, data: Partial<InsertResource>): Promise<Resource | null> {
    const [resource] = await db
      .update(resources)
      .set({
        ...data,
        updatedAt: sql`NOW()`
      })
      .where(eq(resources.id, id))
      .returning();

    return resource || null;
  }

  /**
   * Delete a resource (soft delete by setting isActive to false)
   */
  async delete(id: number): Promise<boolean> {
    const result = await db
      .update(resources)
      .set({ isActive: false, updatedAt: sql`NOW()` })
      .where(eq(resources.id, id));

    return result.rowCount ? result.rowCount > 0 : false;
  }

  /**
   * Hard delete a resource (permanent deletion)
   */
  async hardDelete(id: number): Promise<boolean> {
    const result = await db
      .delete(resources)
      .where(eq(resources.id, id));

    return result.rowCount ? result.rowCount > 0 : false;
  }

  /**
   * Full-text search for resources
   */
  async search(
    query: string,
    filters: ResourceFilters = {},
    pagination: PaginationOptions = {}
  ): Promise<PaginatedResources> {
    return this.findAll(
      { ...filters, searchQuery: query },
      pagination
    );
  }

  /**
   * Full-text search with relevance scoring
   * Returns resources with relevance scores based on search query
   */
  async searchWithRelevance(
    filters: ResourceFilters = {},
    pagination: PaginationOptions = {}
  ): Promise<PaginatedResources> {
    const {
      categoryId,
      categoryIds,
      phases,
      ideaTypes,
      resourceTypes,
      minRating,
      isPremium,
      isActive = true,
      searchQuery
    } = filters;

    const {
      page = 1,
      limit = 20
    } = pagination;

    const offset = (page - 1) * limit;

    if (!searchQuery || !searchQuery.trim()) {
      return this.findAll(filters, pagination);
    }

    // Build WHERE conditions
    const conditions = [];
    
    if (isActive !== undefined) {
      conditions.push(eq(resources.isActive, isActive));
    }

    if (categoryId) {
      conditions.push(eq(resources.categoryId, categoryId));
    }

    if (categoryIds && categoryIds.length > 0) {
      conditions.push(inArray(resources.categoryId, categoryIds));
    }

    if (isPremium !== undefined) {
      conditions.push(eq(resources.isPremium, isPremium));
    }

    if (minRating !== undefined) {
      const minRatingInt = Math.floor(minRating * 100);
      conditions.push(gte(resources.averageRating, minRatingInt));
    }

    // JSONB array filters
    if (phases && phases.length > 0) {
      conditions.push(
        sql`${resources.phaseRelevance}::jsonb ?| array[${sql.join(phases.map(p => sql`${p}`), sql`, `)}]`
      );
    }

    if (ideaTypes && ideaTypes.length > 0) {
      conditions.push(
        sql`${resources.ideaTypes}::jsonb ?| array[${sql.join(ideaTypes.map(t => sql`${t}`), sql`, `)}]`
      );
    }

    if (resourceTypes && resourceTypes.length > 0) {
      conditions.push(inArray(resources.resourceType, resourceTypes));
    }

    // Full-text search with relevance scoring
    const searchTerms = searchQuery.trim().split(/\s+/).join(' & ');
    conditions.push(
      sql`to_tsvector('english', ${resources.title} || ' ' || ${resources.description}) @@ to_tsquery('english', ${searchTerms})`
    );

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Calculate relevance score
    // Title matches are weighted higher than description matches
    const relevanceScore = sql<number>`
      ts_rank(to_tsvector('english', ${resources.title}), to_tsquery('english', ${searchTerms})) * 2 +
      ts_rank(to_tsvector('english', ${resources.description}), to_tsquery('english', ${searchTerms}))
    `;

    // Get total count
    const countResult = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(resources)
      .where(whereClause);
    
    const total = countResult[0]?.count || 0;

    // Get paginated results ordered by relevance
    const results = await db
      .select({
        resource: resources,
        relevance: relevanceScore
      })
      .from(resources)
      .where(whereClause)
      .orderBy(desc(relevanceScore))
      .limit(limit)
      .offset(offset);

    // Fetch related data for each resource
    const resourcesWithRelations = await Promise.all(
      results.map(async ({ resource, relevance }) => {
        const [categoryResult, tagMappings] = await Promise.all([
          resource.categoryId
            ? db
                .select()
                .from(resourceCategories)
                .where(eq(resourceCategories.id, resource.categoryId))
                .limit(1)
            : Promise.resolve([]),
          db
            .select({ tag: resourceTags })
            .from(resourceTagMappings)
            .innerJoin(resourceTags, eq(resourceTagMappings.tagId, resourceTags.id))
            .where(eq(resourceTagMappings.resourceId, resource.id))
        ]);

        return {
          ...resource,
          category: categoryResult[0] || null,
          tags: tagMappings.map((tm: any) => tm.tag),
          relevanceScore: relevance
        };
      })
    );

    return {
      resources: resourcesWithRelations,
      total,
      page,
      pageSize: limit,
      totalPages: Math.ceil(total / limit)
    };
  }

  /**
   * Increment view count for a resource
   */
  async incrementViewCount(id: number): Promise<void> {
    await db
      .update(resources)
      .set({ viewCount: sql`${resources.viewCount} + 1` })
      .where(eq(resources.id, id));
  }

  /**
   * Increment bookmark count for a resource
   */
  async incrementBookmarkCount(id: number): Promise<void> {
    await db
      .update(resources)
      .set({ bookmarkCount: sql`${resources.bookmarkCount} + 1` })
      .where(eq(resources.id, id));
  }

  /**
   * Decrement bookmark count for a resource
   */
  async decrementBookmarkCount(id: number): Promise<void> {
    await db
      .update(resources)
      .set({ 
        bookmarkCount: sql`GREATEST(${resources.bookmarkCount} - 1, 0)` 
      })
      .where(eq(resources.id, id));
  }

  /**
   * Update resource rating statistics
   */
  async updateRatingStats(
    id: number,
    averageRating: number,
    ratingCount: number
  ): Promise<void> {
    // Store rating as integer (0-500 for 0.0-5.0 with 0.1 precision)
    const ratingInt = Math.floor(averageRating * 100);
    
    await db
      .update(resources)
      .set({
        averageRating: ratingInt,
        ratingCount,
        updatedAt: sql`NOW()`
      })
      .where(eq(resources.id, id));
  }

  /**
   * Get resources by IDs
   */
  async findByIds(ids: number[]): Promise<Resource[]> {
    if (ids.length === 0) {
      return [];
    }

    return db
      .select()
      .from(resources)
      .where(inArray(resources.id, ids));
  }

  /**
   * Get similar resources based on category and tags
   */
  async findSimilar(
    resourceId: number,
    limit: number = 5
  ): Promise<ResourceWithRelations[]> {
    const resource = await this.findById(resourceId);
    
    if (!resource) {
      return [];
    }

    const conditions = [
      eq(resources.isActive, true),
      sql`${resources.id} != ${resourceId}`
    ];

    // Prefer same category
    if (resource.categoryId) {
      conditions.push(eq(resources.categoryId, resource.categoryId));
    }

    const results = await db
      .select()
      .from(resources)
      .where(and(...conditions))
      .orderBy(desc(resources.averageRating))
      .limit(limit);

    // Fetch related data
    const resourcesWithRelations = await Promise.all(
      results.map(async (r) => {
        const [categoryResult, tagMappings] = await Promise.all([
          r.categoryId
            ? db
                .select()
                .from(resourceCategories)
                .where(eq(resourceCategories.id, r.categoryId))
                .limit(1)
            : Promise.resolve([]),
          db
            .select({ tag: resourceTags })
            .from(resourceTagMappings)
            .innerJoin(resourceTags, eq(resourceTagMappings.tagId, resourceTags.id))
            .where(eq(resourceTagMappings.resourceId, r.id))
        ]);

        return {
          ...r,
          category: categoryResult[0] || null,
          tags: tagMappings.map((tm: any) => tm.tag)
        };
      })
    );

    return resourcesWithRelations;
  }

  /**
   * Assign tags to a resource
   */
  async assignTags(resourceId: number, tagIds: number[]): Promise<void> {
    if (tagIds.length === 0) {
      return;
    }

    // Remove existing tags
    await db
      .delete(resourceTagMappings)
      .where(eq(resourceTagMappings.resourceId, resourceId));

    // Insert new tags
    await db
      .insert(resourceTagMappings)
      .values(tagIds.map(tagId => ({ resourceId, tagId })));
  }
}

// Export singleton instance
export const resourceRepository = new ResourceRepository();
