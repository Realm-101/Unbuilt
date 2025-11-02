/**
 * ResourceFactory - Test Data Factory for Resources
 * 
 * Provides methods to create, persist, and cleanup test resources for E2E testing.
 * Supports different resource types, categories, and rating/bookmark utilities.
 * 
 * Requirements: 8.2, 8.3
 * 
 * Example:
 * ```typescript
 * const resource = ResourceFactory.create({ resourceType: 'tool' });
 * await ResourceFactory.persist(resource);
 * // ... run tests
 * await ResourceFactory.cleanup(resource.id);
 * ```
 */

import { db } from '../../db';
import { 
  resources, 
  resourceCategories, 
  resourceTags, 
  resourceTagMappings,
  userBookmarks,
  resourceRatings 
} from '@shared/schema';
import { eq } from 'drizzle-orm';

export interface TestResource {
  id?: number;
  title: string;
  description: string;
  url: string;
  resourceType: 'tool' | 'template' | 'guide' | 'video' | 'article';
  categoryId?: number;
  phaseRelevance?: string[];
  ideaTypes?: string[];
  difficultyLevel?: 'beginner' | 'intermediate' | 'advanced';
  estimatedTimeMinutes?: number;
  isPremium?: boolean;
  isActive?: boolean;
  averageRating?: number;
  ratingCount?: number;
  viewCount?: number;
  bookmarkCount?: number;
  metadata?: Record<string, any>;
  createdBy?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface TestResourceCategory {
  id?: number;
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  displayOrder?: number;
  parentId?: number;
  createdAt?: Date;
}

export interface TestResourceTag {
  id?: number;
  name: string;
  slug: string;
  usageCount?: number;
}

export interface TestBookmark {
  id?: number;
  userId: number;
  resourceId: number;
  notes?: string;
  customTags?: string[];
  createdAt?: Date;
}

export interface TestRating {
  id?: number;
  userId: number;
  resourceId: number;
  rating: number; // 1-5
  review?: string;
  isHelpfulCount?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export class ResourceFactory {
  private static counter = 0;

  /**
   * Create a test resource with defaults and optional overrides
   * @param overrides - Partial resource data to override defaults
   * @returns Test resource object
   */
  static create(overrides: Partial<TestResource> = {}): TestResource {
    const counter = ++this.counter;
    const resourceTypes: Array<'tool' | 'template' | 'guide' | 'video' | 'article'> = [
      'tool', 'template', 'guide', 'video', 'article'
    ];
    
    return {
      title: `Test Resource ${counter}`,
      description: `This is a test resource description for resource ${counter}. It provides valuable information and tools for entrepreneurs.`,
      url: `https://example.com/resource-${counter}`,
      resourceType: resourceTypes[counter % resourceTypes.length],
      phaseRelevance: ['research', 'validation'],
      ideaTypes: ['software', 'service'],
      difficultyLevel: 'beginner',
      estimatedTimeMinutes: 30,
      isPremium: false,
      isActive: true,
      averageRating: 0,
      ratingCount: 0,
      viewCount: 0,
      bookmarkCount: 0,
      metadata: {},
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    };
  }

  /**
   * Create a tool resource
   * @param overrides - Optional overrides
   * @returns Tool resource
   */
  static createTool(overrides: Partial<TestResource> = {}): TestResource {
    return this.create({
      resourceType: 'tool',
      title: `Test Tool ${++this.counter}`,
      description: 'A useful tool for entrepreneurs and startups',
      phaseRelevance: ['development', 'launch'],
      ...overrides,
    });
  }

  /**
   * Create a template resource
   * @param overrides - Optional overrides
   * @returns Template resource
   */
  static createTemplate(overrides: Partial<TestResource> = {}): TestResource {
    return this.create({
      resourceType: 'template',
      title: `Test Template ${++this.counter}`,
      description: 'A ready-to-use template for business planning',
      phaseRelevance: ['research', 'validation'],
      ...overrides,
    });
  }

  /**
   * Create a guide resource
   * @param overrides - Optional overrides
   * @returns Guide resource
   */
  static createGuide(overrides: Partial<TestResource> = {}): TestResource {
    return this.create({
      resourceType: 'guide',
      title: `Test Guide ${++this.counter}`,
      description: 'A comprehensive guide for entrepreneurs',
      phaseRelevance: ['research', 'validation', 'development'],
      estimatedTimeMinutes: 60,
      ...overrides,
    });
  }

  /**
   * Create a video resource
   * @param overrides - Optional overrides
   * @returns Video resource
   */
  static createVideo(overrides: Partial<TestResource> = {}): TestResource {
    return this.create({
      resourceType: 'video',
      title: `Test Video ${++this.counter}`,
      description: 'An educational video tutorial',
      phaseRelevance: ['research'],
      estimatedTimeMinutes: 15,
      ...overrides,
    });
  }

  /**
   * Create an article resource
   * @param overrides - Optional overrides
   * @returns Article resource
   */
  static createArticle(overrides: Partial<TestResource> = {}): TestResource {
    return this.create({
      resourceType: 'article',
      title: `Test Article ${++this.counter}`,
      description: 'An informative article about market trends',
      phaseRelevance: ['research', 'validation'],
      estimatedTimeMinutes: 10,
      ...overrides,
    });
  }

  /**
   * Create a premium resource
   * @param overrides - Optional overrides
   * @returns Premium resource
   */
  static createPremium(overrides: Partial<TestResource> = {}): TestResource {
    return this.create({
      isPremium: true,
      title: `Premium Resource ${++this.counter}`,
      description: 'An exclusive premium resource with advanced features',
      ...overrides,
    });
  }

  /**
   * Create a highly-rated resource
   * @param overrides - Optional overrides
   * @returns Highly-rated resource
   */
  static createHighlyRated(overrides: Partial<TestResource> = {}): TestResource {
    return this.create({
      averageRating: 450, // 4.5 stars (stored as integer 0-500)
      ratingCount: 25,
      viewCount: 150,
      bookmarkCount: 40,
      ...overrides,
    });
  }

  /**
   * Create a resource category
   * @param overrides - Optional overrides
   * @returns Test resource category
   */
  static createCategory(overrides: Partial<TestResourceCategory> = {}): TestResourceCategory {
    const counter = ++this.counter;
    const name = `Test Category ${counter}`;
    
    return {
      name,
      slug: name.toLowerCase().replace(/\s+/g, '-'),
      description: `Description for ${name}`,
      icon: 'folder',
      displayOrder: counter,
      createdAt: new Date(),
      ...overrides,
    };
  }

  /**
   * Create a resource tag
   * @param overrides - Optional overrides
   * @returns Test resource tag
   */
  static createTag(overrides: Partial<TestResourceTag> = {}): TestResourceTag {
    const counter = ++this.counter;
    const name = `test-tag-${counter}`;
    
    return {
      name,
      slug: name,
      usageCount: 0,
      ...overrides,
    };
  }

  /**
   * Create a bookmark
   * @param userId - User ID
   * @param resourceId - Resource ID
   * @param overrides - Optional overrides
   * @returns Test bookmark
   */
  static createBookmark(
    userId: number,
    resourceId: number,
    overrides: Partial<TestBookmark> = {}
  ): TestBookmark {
    return {
      userId,
      resourceId,
      notes: 'Test bookmark notes',
      customTags: ['important', 'review-later'],
      createdAt: new Date(),
      ...overrides,
    };
  }

  /**
   * Create a rating
   * @param userId - User ID
   * @param resourceId - Resource ID
   * @param rating - Rating value (1-5)
   * @param overrides - Optional overrides
   * @returns Test rating
   */
  static createRating(
    userId: number,
    resourceId: number,
    rating: number = 5,
    overrides: Partial<TestRating> = {}
  ): TestRating {
    return {
      userId,
      resourceId,
      rating,
      review: 'This is a helpful resource that I would recommend to others.',
      isHelpfulCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    };
  }

  /**
   * Persist a test resource to the database
   * @param resource - Test resource to persist
   * @returns Persisted resource with database ID
   */
  static async persist(resource: TestResource): Promise<TestResource> {
    try {
      const insertData: any = {
        title: resource.title,
        description: resource.description,
        url: resource.url,
        resourceType: resource.resourceType,
        categoryId: resource.categoryId || null,
        phaseRelevance: resource.phaseRelevance || [],
        ideaTypes: resource.ideaTypes || [],
        difficultyLevel: resource.difficultyLevel || null,
        estimatedTimeMinutes: resource.estimatedTimeMinutes || null,
        isPremium: resource.isPremium || false,
        isActive: resource.isActive !== undefined ? resource.isActive : true,
        averageRating: resource.averageRating || 0,
        ratingCount: resource.ratingCount || 0,
        viewCount: resource.viewCount || 0,
        bookmarkCount: resource.bookmarkCount || 0,
        metadata: resource.metadata || {},
        createdBy: resource.createdBy || null,
        createdAt: resource.createdAt || new Date(),
        updatedAt: resource.updatedAt || new Date(),
      };

      const result = await db.insert(resources).values(insertData).returning();
      
      return {
        ...resource,
        id: result[0].id,
      };
    } catch (error) {
      console.error('Failed to persist test resource:', error);
      throw error;
    }
  }

  /**
   * Persist a resource category
   * @param category - Test category to persist
   * @returns Persisted category with database ID
   */
  static async persistCategory(category: TestResourceCategory): Promise<TestResourceCategory> {
    try {
      const insertData: any = {
        name: category.name,
        slug: category.slug,
        description: category.description || null,
        icon: category.icon || null,
        displayOrder: category.displayOrder || 0,
        parentId: category.parentId || null,
        createdAt: category.createdAt || new Date(),
      };

      const result = await db.insert(resourceCategories).values(insertData).returning();
      
      return {
        ...category,
        id: result[0].id,
      };
    } catch (error) {
      console.error('Failed to persist test category:', error);
      throw error;
    }
  }

  /**
   * Persist a resource tag
   * @param tag - Test tag to persist
   * @returns Persisted tag with database ID
   */
  static async persistTag(tag: TestResourceTag): Promise<TestResourceTag> {
    try {
      const insertData: any = {
        name: tag.name,
        slug: tag.slug,
        usageCount: tag.usageCount || 0,
      };

      const result = await db.insert(resourceTags).values(insertData).returning();
      
      return {
        ...tag,
        id: result[0].id,
      };
    } catch (error) {
      console.error('Failed to persist test tag:', error);
      throw error;
    }
  }

  /**
   * Persist a bookmark
   * @param bookmark - Test bookmark to persist
   * @returns Persisted bookmark with database ID
   */
  static async persistBookmark(bookmark: TestBookmark): Promise<TestBookmark> {
    try {
      const insertData: any = {
        userId: bookmark.userId,
        resourceId: bookmark.resourceId,
        notes: bookmark.notes || null,
        customTags: bookmark.customTags || [],
        createdAt: bookmark.createdAt || new Date(),
      };

      const result = await db.insert(userBookmarks).values(insertData).returning();
      
      return {
        ...bookmark,
        id: result[0].id,
      };
    } catch (error) {
      console.error('Failed to persist test bookmark:', error);
      throw error;
    }
  }

  /**
   * Persist a rating
   * @param rating - Test rating to persist
   * @returns Persisted rating with database ID
   */
  static async persistRating(rating: TestRating): Promise<TestRating> {
    try {
      const insertData: any = {
        userId: rating.userId,
        resourceId: rating.resourceId,
        rating: rating.rating,
        review: rating.review || null,
        isHelpfulCount: rating.isHelpfulCount || 0,
        createdAt: rating.createdAt || new Date(),
        updatedAt: rating.updatedAt || new Date(),
      };

      const result = await db.insert(resourceRatings).values(insertData).returning();
      
      return {
        ...rating,
        id: result[0].id,
      };
    } catch (error) {
      console.error('Failed to persist test rating:', error);
      throw error;
    }
  }

  /**
   * Create and persist a test resource in one step
   * @param overrides - Optional overrides
   * @returns Persisted test resource
   */
  static async createAndPersist(overrides: Partial<TestResource> = {}): Promise<TestResource> {
    const resource = this.create(overrides);
    return await this.persist(resource);
  }

  /**
   * Create and persist a resource with category
   * @param categoryOverrides - Category overrides
   * @param resourceOverrides - Resource overrides
   * @returns Persisted resource with category
   */
  static async createAndPersistWithCategory(
    categoryOverrides: Partial<TestResourceCategory> = {},
    resourceOverrides: Partial<TestResource> = {}
  ): Promise<{ resource: TestResource; category: TestResourceCategory }> {
    const category = await this.persistCategory(this.createCategory(categoryOverrides));
    const resource = await this.persist(this.create({ categoryId: category.id, ...resourceOverrides }));
    
    return { resource, category };
  }

  /**
   * Add tags to a resource
   * @param resourceId - Resource ID
   * @param tagIds - Array of tag IDs
   */
  static async addTags(resourceId: number, tagIds: number[]): Promise<void> {
    try {
      const mappings = tagIds.map(tagId => ({
        resourceId,
        tagId,
      }));

      await db.insert(resourceTagMappings).values(mappings);
    } catch (error) {
      console.error('Failed to add tags to resource:', error);
      throw error;
    }
  }

  /**
   * Cleanup a test resource from the database
   * @param resourceId - ID of resource to delete
   */
  static async cleanup(resourceId: number): Promise<void> {
    try {
      if (!resourceId) {
        console.warn('No resource ID provided for cleanup');
        return;
      }

      // Delete related data first (foreign key constraints)
      await db.delete(resourceTagMappings).where(eq(resourceTagMappings.resourceId, resourceId));
      await db.delete(userBookmarks).where(eq(userBookmarks.resourceId, resourceId));
      await db.delete(resourceRatings).where(eq(resourceRatings.resourceId, resourceId));
      
      // Delete resource
      await db.delete(resources).where(eq(resources.id, resourceId));
    } catch (error) {
      console.error('Failed to cleanup test resource:', error);
      throw error;
    }
  }

  /**
   * Cleanup a resource category
   * @param categoryId - Category ID
   */
  static async cleanupCategory(categoryId: number): Promise<void> {
    try {
      if (!categoryId) {
        console.warn('No category ID provided for cleanup');
        return;
      }

      await db.delete(resourceCategories).where(eq(resourceCategories.id, categoryId));
    } catch (error) {
      console.error('Failed to cleanup test category:', error);
      throw error;
    }
  }

  /**
   * Cleanup a resource tag
   * @param tagId - Tag ID
   */
  static async cleanupTag(tagId: number): Promise<void> {
    try {
      if (!tagId) {
        console.warn('No tag ID provided for cleanup');
        return;
      }

      // Delete mappings first
      await db.delete(resourceTagMappings).where(eq(resourceTagMappings.tagId, tagId));
      
      // Delete tag
      await db.delete(resourceTags).where(eq(resourceTags.id, tagId));
    } catch (error) {
      console.error('Failed to cleanup test tag:', error);
      throw error;
    }
  }

  /**
   * Cleanup a bookmark
   * @param bookmarkId - Bookmark ID
   */
  static async cleanupBookmark(bookmarkId: number): Promise<void> {
    try {
      if (!bookmarkId) {
        console.warn('No bookmark ID provided for cleanup');
        return;
      }

      await db.delete(userBookmarks).where(eq(userBookmarks.id, bookmarkId));
    } catch (error) {
      console.error('Failed to cleanup test bookmark:', error);
      throw error;
    }
  }

  /**
   * Cleanup a rating
   * @param ratingId - Rating ID
   */
  static async cleanupRating(ratingId: number): Promise<void> {
    try {
      if (!ratingId) {
        console.warn('No rating ID provided for cleanup');
        return;
      }

      await db.delete(resourceRatings).where(eq(resourceRatings.id, ratingId));
    } catch (error) {
      console.error('Failed to cleanup test rating:', error);
      throw error;
    }
  }

  /**
   * Cleanup multiple test resources
   * @param resourceIds - Array of resource IDs to delete
   */
  static async cleanupMany(resourceIds: number[]): Promise<void> {
    try {
      for (const resourceId of resourceIds) {
        await this.cleanup(resourceId);
      }
    } catch (error) {
      console.error('Failed to cleanup test resources:', error);
      throw error;
    }
  }

  /**
   * Update resource view count
   * @param resourceId - Resource ID
   * @param count - New view count
   */
  static async updateViewCount(resourceId: number, count: number): Promise<void> {
    try {
      await db.update(resources)
        .set({ viewCount: count })
        .where(eq(resources.id, resourceId));
    } catch (error) {
      console.error('Failed to update view count:', error);
      throw error;
    }
  }

  /**
   * Update resource bookmark count
   * @param resourceId - Resource ID
   * @param count - New bookmark count
   */
  static async updateBookmarkCount(resourceId: number, count: number): Promise<void> {
    try {
      await db.update(resources)
        .set({ bookmarkCount: count })
        .where(eq(resources.id, resourceId));
    } catch (error) {
      console.error('Failed to update bookmark count:', error);
      throw error;
    }
  }
}
