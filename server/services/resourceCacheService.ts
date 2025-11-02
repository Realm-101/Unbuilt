import { cacheService, CacheTTL } from './cache';
import type { Resource, ResourceCategory } from '@shared/schema';

/**
 * Resource Cache Service
 * 
 * Provides caching functionality specifically for resource library data
 * with appropriate TTLs and cache invalidation strategies
 * 
 * Cache Strategy:
 * - Popular resources: 1 hour TTL
 * - Category tree: 24 hours TTL
 * - Search results: 15 minutes TTL
 * - Suggestions: 1 hour TTL
 * 
 * Requirements: All
 */

// Cache key prefixes
const CACHE_PREFIX = {
  RESOURCE: 'resource',
  CATEGORY_TREE: 'category:tree',
  SEARCH: 'search',
  SUGGESTIONS: 'suggestions',
  POPULAR: 'popular',
  RECOMMENDATIONS: 'recommendations',
} as const;

// Cache TTLs (in seconds)
const RESOURCE_TTL = {
  POPULAR_RESOURCES: 3600,      // 1 hour
  CATEGORY_TREE: 86400,          // 24 hours
  SEARCH_RESULTS: 900,           // 15 minutes
  SUGGESTIONS: 3600,             // 1 hour
  RECOMMENDATIONS: 1800,         // 30 minutes
  RESOURCE_DETAIL: 3600,         // 1 hour
} as const;

export class ResourceCacheService {
  /**
   * Generate cache key for a resource
   */
  private generateResourceKey(resourceId: number): string {
    return cacheService.generateKey(CACHE_PREFIX.RESOURCE, resourceId.toString());
  }

  /**
   * Generate cache key for category tree
   */
  private generateCategoryTreeKey(): string {
    return cacheService.generateKey(CACHE_PREFIX.CATEGORY_TREE, 'all');
  }

  /**
   * Generate cache key for search results
   */
  private generateSearchKey(query: string, filters: Record<string, any>): string {
    const filterString = JSON.stringify(filters);
    const hash = this.hashString(`${query}:${filterString}`);
    return cacheService.generateKey(CACHE_PREFIX.SEARCH, hash);
  }

  /**
   * Generate cache key for step suggestions
   */
  private generateStepSuggestionsKey(stepId: string): string {
    return cacheService.generateKey(CACHE_PREFIX.SUGGESTIONS, `step:${stepId}`);
  }

  /**
   * Generate cache key for analysis suggestions
   */
  private generateAnalysisSuggestionsKey(analysisId: number, phase?: string): string {
    const key = phase ? `analysis:${analysisId}:${phase}` : `analysis:${analysisId}:all`;
    return cacheService.generateKey(CACHE_PREFIX.SUGGESTIONS, key);
  }

  /**
   * Generate cache key for recommendations
   */
  private generateRecommendationsKey(userId: number, analysisId?: number): string {
    const key = analysisId ? `user:${userId}:analysis:${analysisId}` : `user:${userId}`;
    return cacheService.generateKey(CACHE_PREFIX.RECOMMENDATIONS, key);
  }

  /**
   * Generate cache key for popular resources
   */
  private generatePopularResourcesKey(limit: number): string {
    return cacheService.generateKey(CACHE_PREFIX.POPULAR, `top:${limit}`);
  }

  /**
   * Simple hash function for cache keys
   */
  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(36);
  }

  // ============================================================================
  // Resource Caching
  // ============================================================================

  /**
   * Cache a single resource
   */
  async cacheResource(resource: Resource): Promise<boolean> {
    const key = this.generateResourceKey(resource.id);
    return await cacheService.set(key, resource, RESOURCE_TTL.RESOURCE_DETAIL);
  }

  /**
   * Get cached resource
   */
  async getCachedResource(resourceId: number): Promise<Resource | null> {
    const key = this.generateResourceKey(resourceId);
    return await cacheService.get<Resource>(key);
  }

  /**
   * Invalidate resource cache
   */
  async invalidateResource(resourceId: number): Promise<boolean> {
    const key = this.generateResourceKey(resourceId);
    return await cacheService.delete(key);
  }

  // ============================================================================
  // Category Tree Caching
  // ============================================================================

  /**
   * Cache category tree
   */
  async cacheCategoryTree(categories: ResourceCategory[]): Promise<boolean> {
    const key = this.generateCategoryTreeKey();
    return await cacheService.set(key, categories, RESOURCE_TTL.CATEGORY_TREE);
  }

  /**
   * Get cached category tree
   */
  async getCachedCategoryTree(): Promise<ResourceCategory[] | null> {
    const key = this.generateCategoryTreeKey();
    return await cacheService.get<ResourceCategory[]>(key);
  }

  /**
   * Invalidate category tree cache
   */
  async invalidateCategoryTree(): Promise<boolean> {
    const key = this.generateCategoryTreeKey();
    return await cacheService.delete(key);
  }

  // ============================================================================
  // Search Results Caching
  // ============================================================================

  /**
   * Cache search results
   */
  async cacheSearchResults(
    query: string,
    filters: Record<string, any>,
    results: any
  ): Promise<boolean> {
    const key = this.generateSearchKey(query, filters);
    return await cacheService.set(key, results, RESOURCE_TTL.SEARCH_RESULTS);
  }

  /**
   * Get cached search results
   */
  async getCachedSearchResults(
    query: string,
    filters: Record<string, any>
  ): Promise<any | null> {
    const key = this.generateSearchKey(query, filters);
    return await cacheService.get<any>(key);
  }

  /**
   * Invalidate all search results
   */
  async invalidateAllSearchResults(): Promise<number> {
    const pattern = cacheService.generateKey(CACHE_PREFIX.SEARCH, '*');
    return await cacheService.deletePattern(pattern);
  }

  // ============================================================================
  // Suggestions Caching
  // ============================================================================

  /**
   * Cache step suggestions
   */
  async cacheStepSuggestions(stepId: string, resources: Resource[]): Promise<boolean> {
    const key = this.generateStepSuggestionsKey(stepId);
    return await cacheService.set(key, resources, RESOURCE_TTL.SUGGESTIONS);
  }

  /**
   * Get cached step suggestions
   */
  async getCachedStepSuggestions(stepId: string): Promise<Resource[] | null> {
    const key = this.generateStepSuggestionsKey(stepId);
    return await cacheService.get<Resource[]>(key);
  }

  /**
   * Cache analysis suggestions
   */
  async cacheAnalysisSuggestions(
    analysisId: number,
    phase: string | undefined,
    resources: any
  ): Promise<boolean> {
    const key = this.generateAnalysisSuggestionsKey(analysisId, phase);
    return await cacheService.set(key, resources, RESOURCE_TTL.SUGGESTIONS);
  }

  /**
   * Get cached analysis suggestions
   */
  async getCachedAnalysisSuggestions(
    analysisId: number,
    phase?: string
  ): Promise<any | null> {
    const key = this.generateAnalysisSuggestionsKey(analysisId, phase);
    return await cacheService.get<any>(key);
  }

  /**
   * Invalidate all suggestions
   */
  async invalidateAllSuggestions(): Promise<number> {
    const pattern = cacheService.generateKey(CACHE_PREFIX.SUGGESTIONS, '*');
    return await cacheService.deletePattern(pattern);
  }

  // ============================================================================
  // Recommendations Caching
  // ============================================================================

  /**
   * Cache user recommendations
   */
  async cacheRecommendations(
    userId: number,
    analysisId: number | undefined,
    recommendations: Resource[]
  ): Promise<boolean> {
    const key = this.generateRecommendationsKey(userId, analysisId);
    return await cacheService.set(key, recommendations, RESOURCE_TTL.RECOMMENDATIONS);
  }

  /**
   * Get cached recommendations
   */
  async getCachedRecommendations(
    userId: number,
    analysisId?: number
  ): Promise<Resource[] | null> {
    const key = this.generateRecommendationsKey(userId, analysisId);
    return await cacheService.get<Resource[]>(key);
  }

  /**
   * Invalidate user recommendations
   */
  async invalidateUserRecommendations(userId: number): Promise<number> {
    const pattern = cacheService.generateKey(
      CACHE_PREFIX.RECOMMENDATIONS,
      `user:${userId}*`
    );
    return await cacheService.deletePattern(pattern);
  }

  // ============================================================================
  // Popular Resources Caching
  // ============================================================================

  /**
   * Cache popular resources
   */
  async cachePopularResources(resources: Resource[], limit: number): Promise<boolean> {
    const key = this.generatePopularResourcesKey(limit);
    return await cacheService.set(key, resources, RESOURCE_TTL.POPULAR_RESOURCES);
  }

  /**
   * Get cached popular resources
   */
  async getCachedPopularResources(limit: number): Promise<Resource[] | null> {
    const key = this.generatePopularResourcesKey(limit);
    return await cacheService.get<Resource[]>(key);
  }

  // ============================================================================
  // Cache Invalidation
  // ============================================================================

  /**
   * Invalidate all resource-related caches
   * Call this when a resource is created, updated, or deleted
   */
  async invalidateAllResourceCaches(): Promise<void> {
    await Promise.all([
      this.invalidateAllSearchResults(),
      this.invalidateAllSuggestions(),
      cacheService.deletePattern(cacheService.generateKey(CACHE_PREFIX.RESOURCE, '*')),
      cacheService.deletePattern(cacheService.generateKey(CACHE_PREFIX.POPULAR, '*')),
      cacheService.deletePattern(cacheService.generateKey(CACHE_PREFIX.RECOMMENDATIONS, '*')),
    ]);
  }

  /**
   * Invalidate caches related to a specific resource
   */
  async invalidateResourceCaches(resourceId: number): Promise<void> {
    await Promise.all([
      this.invalidateResource(resourceId),
      this.invalidateAllSearchResults(),
      this.invalidateAllSuggestions(),
    ]);
  }

  /**
   * Invalidate caches when categories change
   */
  async invalidateCategoryCaches(): Promise<void> {
    await Promise.all([
      this.invalidateCategoryTree(),
      this.invalidateAllSearchResults(),
    ]);
  }
}

// Export singleton instance
export const resourceCacheService = new ResourceCacheService();

