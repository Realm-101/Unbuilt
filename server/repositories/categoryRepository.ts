import { db } from '../db';
import {
  resourceCategories,
  resources,
  type ResourceCategory,
  type InsertResourceCategory
} from '@shared/schema';
import { eq, sql, isNull, desc } from 'drizzle-orm';

export interface CategoryWithChildren extends ResourceCategory {
  children?: CategoryWithChildren[];
  resourceCount?: number;
}

/**
 * Category Repository
 * Handles all database operations for resource categories
 */
export class CategoryRepository {
  /**
   * Get all categories
   */
  async findAll(): Promise<ResourceCategory[]> {
    return db
      .select()
      .from(resourceCategories)
      .orderBy(resourceCategories.displayOrder, resourceCategories.name);
  }

  /**
   * Get category by ID
   */
  async findById(id: number): Promise<ResourceCategory | null> {
    const result = await db
      .select()
      .from(resourceCategories)
      .where(eq(resourceCategories.id, id))
      .limit(1);

    return result[0] || null;
  }

  /**
   * Get category by slug
   */
  async findBySlug(slug: string): Promise<ResourceCategory | null> {
    const result = await db
      .select()
      .from(resourceCategories)
      .where(eq(resourceCategories.slug, slug))
      .limit(1);

    return result[0] || null;
  }

  /**
   * Get hierarchical category tree
   */
  async getCategoryTree(): Promise<CategoryWithChildren[]> {
    // Get all categories
    const allCategories = await db
      .select()
      .from(resourceCategories)
      .orderBy(resourceCategories.displayOrder, resourceCategories.name);

    // Get resource counts for each category
    const categoryCounts = await db
      .select({
        categoryId: resources.categoryId,
        count: sql<number>`count(*)::int`
      })
      .from(resources)
      .where(eq(resources.isActive, true))
      .groupBy(resources.categoryId);

    const countMap = new Map(
      categoryCounts.map(c => [c.categoryId, c.count])
    );

    // Build tree structure
    const categoryMap = new Map<number, CategoryWithChildren>();
    const rootCategories: CategoryWithChildren[] = [];

    // First pass: create all category objects with counts
    allCategories.forEach(category => {
      categoryMap.set(category.id, {
        ...category,
        children: [],
        resourceCount: countMap.get(category.id) || 0
      });
    });

    // Second pass: build hierarchy
    allCategories.forEach(category => {
      const categoryWithChildren = categoryMap.get(category.id)!;
      
      if (category.parentId === null) {
        rootCategories.push(categoryWithChildren);
      } else {
        const parent = categoryMap.get(category.parentId);
        if (parent) {
          parent.children!.push(categoryWithChildren);
          // Add child resource count to parent
          parent.resourceCount = (parent.resourceCount || 0) + (categoryWithChildren.resourceCount || 0);
        }
      }
    });

    return rootCategories;
  }

  /**
   * Get root categories (no parent)
   */
  async getRootCategories(): Promise<CategoryWithChildren[]> {
    const categories = await db
      .select()
      .from(resourceCategories)
      .where(isNull(resourceCategories.parentId))
      .orderBy(resourceCategories.displayOrder, resourceCategories.name);

    // Get resource counts
    const categoryCounts = await db
      .select({
        categoryId: resources.categoryId,
        count: sql<number>`count(*)::int`
      })
      .from(resources)
      .where(eq(resources.isActive, true))
      .groupBy(resources.categoryId);

    const countMap = new Map(
      categoryCounts.map(c => [c.categoryId, c.count])
    );

    return categories.map(category => ({
      ...category,
      resourceCount: countMap.get(category.id) || 0
    }));
  }

  /**
   * Get child categories of a parent
   */
  async getChildCategories(parentId: number): Promise<CategoryWithChildren[]> {
    const categories = await db
      .select()
      .from(resourceCategories)
      .where(eq(resourceCategories.parentId, parentId))
      .orderBy(resourceCategories.displayOrder, resourceCategories.name);

    // Get resource counts
    const categoryCounts = await db
      .select({
        categoryId: resources.categoryId,
        count: sql<number>`count(*)::int`
      })
      .from(resources)
      .where(eq(resources.isActive, true))
      .groupBy(resources.categoryId);

    const countMap = new Map(
      categoryCounts.map(c => [c.categoryId, c.count])
    );

    return categories.map(category => ({
      ...category,
      resourceCount: countMap.get(category.id) || 0
    }));
  }

  /**
   * Create a new category
   */
  async create(data: InsertResourceCategory): Promise<ResourceCategory> {
    const [category] = await db
      .insert(resourceCategories)
      .values(data)
      .returning();

    return category;
  }

  /**
   * Update a category
   */
  async update(
    id: number,
    data: Partial<InsertResourceCategory>
  ): Promise<ResourceCategory | null> {
    const [category] = await db
      .update(resourceCategories)
      .set(data)
      .where(eq(resourceCategories.id, id))
      .returning();

    return category || null;
  }

  /**
   * Delete a category
   */
  async delete(id: number): Promise<boolean> {
    // Check if category has children
    const children = await db
      .select()
      .from(resourceCategories)
      .where(eq(resourceCategories.parentId, id))
      .limit(1);

    if (children.length > 0) {
      throw new Error('Cannot delete category with children');
    }

    // Check if category has resources
    const resourcesInCategory = await db
      .select()
      .from(resources)
      .where(eq(resources.categoryId, id))
      .limit(1);

    if (resourcesInCategory.length > 0) {
      throw new Error('Cannot delete category with resources');
    }

    const result = await db
      .delete(resourceCategories)
      .where(eq(resourceCategories.id, id));

    return result.rowCount ? result.rowCount > 0 : false;
  }

  /**
   * Get category path (breadcrumb trail)
   */
  async getCategoryPath(id: number): Promise<ResourceCategory[]> {
    const path: ResourceCategory[] = [];
    let currentId: number | null = id;

    while (currentId !== null) {
      const category = await this.findById(currentId);
      if (!category) break;
      
      path.unshift(category);
      currentId = category.parentId;
    }

    return path;
  }

  /**
   * Get resource count for a category (including subcategories)
   */
  async getResourceCount(id: number, includeChildren: boolean = true): Promise<number> {
    if (!includeChildren) {
      const result = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(resources)
        .where(eq(resources.categoryId, id));
      
      return result[0]?.count || 0;
    }

    // Get all descendant category IDs
    const descendantIds = await this.getDescendantIds(id);
    const allIds = [id, ...descendantIds];

    const result = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(resources)
      .where(sql`${resources.categoryId} = ANY(${allIds})`);

    return result[0]?.count || 0;
  }

  /**
   * Get all descendant category IDs
   */
  private async getDescendantIds(parentId: number): Promise<number[]> {
    const children = await db
      .select()
      .from(resourceCategories)
      .where(eq(resourceCategories.parentId, parentId));

    const descendantIds: number[] = [];

    for (const child of children) {
      descendantIds.push(child.id);
      const childDescendants = await this.getDescendantIds(child.id);
      descendantIds.push(...childDescendants);
    }

    return descendantIds;
  }
}

// Export singleton instance
export const categoryRepository = new CategoryRepository();
