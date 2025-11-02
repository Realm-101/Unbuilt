import { resourceRepository } from '../repositories/resourceRepository';
import { bookmarkRepository } from '../repositories/bookmarkRepository';
import { accessHistoryRepository } from '../repositories/accessHistoryRepository';
import type { Resource } from '@shared/schema';
import { db } from '../db';
import { searches, users } from '@shared/schema';
import { eq, and, inArray, sql } from 'drizzle-orm';

/**
 * Recommendation context for personalized suggestions
 */
export interface RecommendationContext {
  userId: number;
  analysisId?: number;
  limit?: number;
  excludeResourceIds?: number[];
}

/**
 * Scored recommendation with explanation
 */
export interface ScoredRecommendation {
  resource: Resource;
  score: number;
  reason: string;
  scoreBreakdown: {
    collaborative: number;
    contentBased: number;
    popularity: number;
    diversity: number;
  };
}

/**
 * User similarity score
 */
interface UserSimilarity {
  userId: number;
  similarity: number;
}

/**
 * Resource Recommendation Engine
 * Provides personalized resource recommendations using collaborative filtering,
 * content-based filtering, and popularity-based strategies
 */
export class ResourceRecommendationEngine {
  // Recommendation strategy weights
  private readonly WEIGHTS = {
    COLLABORATIVE: 0.40,
    CONTENT_BASED: 0.35,
    POPULARITY: 0.15,
    DIVERSITY: 0.10,
  };

  // Minimum similarity threshold for collaborative filtering
  private readonly MIN_SIMILARITY_THRESHOLD = 0.1;

  // Cache TTL in milliseconds (1 hour)
  private readonly CACHE_TTL = 60 * 60 * 1000;

  // In-memory cache for recommendations
  private recommendationCache = new Map<string, {
    recommendations: Resource[];
    timestamp: number;
  }>();

  /**
   * Get personalized recommendations for a user
   */
  async getRecommendations(
    context: RecommendationContext
  ): Promise<Resource[]> {
    const { userId, analysisId, limit = 10, excludeResourceIds = [] } = context;

    // Check cache first
    const cacheKey = this.getCacheKey(userId, analysisId);
    const cached = this.recommendationCache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return this.filterAndLimit(cached.recommendations, excludeResourceIds, limit);
    }

    // Get user's interaction history
    const [bookmarkedIds, accessedIds, analysisContext] = await Promise.all([
      bookmarkRepository.getBookmarkedResourceIds(userId),
      accessHistoryRepository.getAccessedResourceIds(userId),
      analysisId ? this.getAnalysisContext(analysisId) : Promise.resolve(null),
    ]);

    const interactedResourceIds = [...new Set([...bookmarkedIds, ...accessedIds])];

    // Get candidate resources (exclude already interacted)
    const { resources: candidates } = await resourceRepository.findAll(
      { isActive: true },
      { limit: 200, sortBy: 'rating' }
    );

    const candidatePool = candidates.filter(
      (r) => !interactedResourceIds.includes(r.id)
    );

    // Score each candidate using multiple strategies
    const scoredRecommendations = await Promise.all(
      candidatePool.map((resource) =>
        this.scoreRecommendation(resource, userId, interactedResourceIds, analysisContext)
      )
    );

    // Sort by score and apply diversity
    const diversifiedRecommendations = this.applyDiversityBoost(
      scoredRecommendations,
      analysisContext
    );

    // Extract resources
    const recommendations = diversifiedRecommendations.map((sr) => sr.resource);

    // Cache the results
    this.recommendationCache.set(cacheKey, {
      recommendations,
      timestamp: Date.now(),
    });

    return this.filterAndLimit(recommendations, excludeResourceIds, limit);
  }

  /**
   * Get similar resources based on content
   */
  async getSimilarResources(
    resourceId: number,
    limit: number = 5
  ): Promise<Resource[]> {
    const resource = await resourceRepository.findById(resourceId);

    if (!resource) {
      return [];
    }

    // Get all active resources
    const { resources: candidates } = await resourceRepository.findAll(
      { isActive: true },
      { limit: 100, sortBy: 'rating' }
    );

    // Calculate content similarity for each candidate
    const scoredResources = candidates
      .filter((r) => r.id !== resourceId)
      .map((candidate) => ({
        resource: candidate,
        similarity: this.calculateContentSimilarity(resource, candidate),
      }))
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit);

    return scoredResources.map((sr) => sr.resource);
  }

  /**
   * Get trending resources based on recent activity
   */
  async getTrendingResources(
    timeframe: 'day' | 'week' | 'month' = 'week',
    limit: number = 10
  ): Promise<Resource[]> {
    const days = timeframe === 'day' ? 1 : timeframe === 'week' ? 7 : 30;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get most accessed resources in timeframe
    const mostAccessed = await accessHistoryRepository.getMostAccessed(limit * 2);

    if (mostAccessed.length === 0) {
      // Fallback to highest rated resources
      const { resources } = await resourceRepository.findAll(
        { isActive: true },
        { limit, sortBy: 'rating' }
      );
      return resources;
    }

    // Get full resource details
    const resourceIds = mostAccessed.map((ma) => ma.resourceId);
    const resources = await resourceRepository.findByIds(resourceIds);

    // Sort by access count and rating
    const scored = resources.map((resource) => {
      const accessData = mostAccessed.find((ma) => ma.resourceId === resource.id);
      const accessScore = accessData ? accessData.accessCount : 0;
      const ratingScore = resource.averageRating / 100; // Normalize to 0-5

      return {
        resource,
        score: accessScore * 0.7 + ratingScore * 0.3,
      };
    });

    scored.sort((a, b) => b.score - a.score);

    return scored.slice(0, limit).map((s) => s.resource);
  }

  /**
   * Score a recommendation using multiple strategies
   */
  private async scoreRecommendation(
    resource: Resource,
    userId: number,
    interactedResourceIds: number[],
    analysisContext: any
  ): Promise<ScoredRecommendation> {
    const [collaborativeScore, contentScore, popularityScore] = await Promise.all([
      this.calculateCollaborativeScore(resource, userId, interactedResourceIds),
      this.calculateContentScore(resource, interactedResourceIds, analysisContext),
      this.calculatePopularityScore(resource),
    ]);

    const diversityScore = 0; // Will be calculated during diversity boost

    const totalScore =
      collaborativeScore * this.WEIGHTS.COLLABORATIVE +
      contentScore * this.WEIGHTS.CONTENT_BASED +
      popularityScore * this.WEIGHTS.POPULARITY;

    // Determine primary reason for recommendation
    const scores = [
      { name: 'collaborative', value: collaborativeScore },
      { name: 'content', value: contentScore },
      { name: 'popularity', value: popularityScore },
    ];
    const primaryReason = scores.reduce((max, curr) =>
      curr.value > max.value ? curr : max
    );

    let reason = 'Recommended for you';
    if (primaryReason.name === 'collaborative') {
      reason = 'Users like you also viewed this';
    } else if (primaryReason.name === 'content') {
      reason = 'Similar to resources you\'ve used';
    } else if (primaryReason.name === 'popularity') {
      reason = 'Popular in your category';
    }

    return {
      resource,
      score: totalScore,
      reason,
      scoreBreakdown: {
        collaborative: collaborativeScore,
        contentBased: contentScore,
        popularity: popularityScore,
        diversity: diversityScore,
      },
    };
  }

  /**
   * Calculate collaborative filtering score
   * Based on similar users' interactions
   */
  private async calculateCollaborativeScore(
    resource: Resource,
    userId: number,
    interactedResourceIds: number[]
  ): Promise<number> {
    if (interactedResourceIds.length === 0) {
      return 0; // No history to base recommendations on
    }

    // Find similar users (users who interacted with same resources)
    const similarUsers = await this.findSimilarUsers(userId, interactedResourceIds);

    if (similarUsers.length === 0) {
      return 0;
    }

    // Check if similar users interacted with this resource
    let weightedScore = 0;
    let totalWeight = 0;

    for (const similarUser of similarUsers) {
      const hasInteracted = await accessHistoryRepository.hasAccessed(
        similarUser.userId,
        resource.id
      );

      if (hasInteracted) {
        weightedScore += similarUser.similarity;
        totalWeight += similarUser.similarity;
      }
    }

    return totalWeight > 0 ? weightedScore / totalWeight : 0;
  }

  /**
   * Calculate content-based filtering score
   * Based on similarity to user's interacted resources
   */
  private async calculateContentScore(
    resource: Resource,
    interactedResourceIds: number[],
    analysisContext: any
  ): Promise<number> {
    if (interactedResourceIds.length === 0 && !analysisContext) {
      return 0.5; // Neutral score
    }

    let totalSimilarity = 0;
    let count = 0;

    // Compare with interacted resources
    if (interactedResourceIds.length > 0) {
      const interactedResources = await resourceRepository.findByIds(
        interactedResourceIds.slice(0, 10) // Limit to recent 10
      );

      for (const interactedResource of interactedResources) {
        totalSimilarity += this.calculateContentSimilarity(resource, interactedResource);
        count++;
      }
    }

    // Boost score if matches analysis context
    if (analysisContext) {
      const contextMatch = this.calculateContextMatch(resource, analysisContext);
      totalSimilarity += contextMatch;
      count++;
    }

    return count > 0 ? totalSimilarity / count : 0.5;
  }

  /**
   * Calculate popularity score
   */
  private calculatePopularityScore(resource: Resource): number {
    const ratingScore = resource.averageRating / 500; // Normalize 0-500 to 0-1
    const viewScore = Math.min(resource.viewCount / 1000, 1); // Cap at 1000
    const bookmarkScore = Math.min(resource.bookmarkCount / 100, 1); // Cap at 100

    return ratingScore * 0.5 + viewScore * 0.3 + bookmarkScore * 0.2;
  }

  /**
   * Find similar users based on interaction overlap
   */
  private async findSimilarUsers(
    userId: number,
    interactedResourceIds: number[]
  ): Promise<UserSimilarity[]> {
    if (interactedResourceIds.length === 0) {
      return [];
    }

    // Find users who accessed the same resources
    const result = await db
      .select({
        userId: sql<number>`${sql.raw('resource_access_history.user_id')}`,
        commonResources: sql<number>`COUNT(DISTINCT ${sql.raw('resource_access_history.resource_id')})::int`,
      })
      .from(sql.raw('resource_access_history'))
      .where(
        and(
          sql`${sql.raw('resource_access_history.user_id')} != ${userId}`,
          sql`${sql.raw('resource_access_history.resource_id')} = ANY(${sql.raw(`ARRAY[${interactedResourceIds.join(',')}]`)})`
        )
      )
      .groupBy(sql.raw('resource_access_history.user_id'))
      .having(sql`COUNT(DISTINCT ${sql.raw('resource_access_history.resource_id')}) >= 2`)
      .orderBy(sql`COUNT(DISTINCT ${sql.raw('resource_access_history.resource_id')}) DESC`)
      .limit(20);

    // Calculate Jaccard similarity
    const similarities: UserSimilarity[] = [];

    for (const row of result) {
      const otherUserResourceIds = await accessHistoryRepository.getAccessedResourceIds(
        row.userId
      );

      const similarity = this.calculateJaccardSimilarity(
        interactedResourceIds,
        otherUserResourceIds
      );

      if (similarity >= this.MIN_SIMILARITY_THRESHOLD) {
        similarities.push({
          userId: row.userId,
          similarity,
        });
      }
    }

    return similarities.sort((a, b) => b.similarity - a.similarity);
  }

  /**
   * Calculate Jaccard similarity between two sets
   */
  private calculateJaccardSimilarity(set1: number[], set2: number[]): number {
    const s1 = new Set(set1);
    const s2 = new Set(set2);

    const intersection = new Set([...s1].filter((x) => s2.has(x)));
    const union = new Set([...s1, ...s2]);

    return union.size > 0 ? intersection.size / union.size : 0;
  }

  /**
   * Calculate content similarity between two resources
   */
  private calculateContentSimilarity(resource1: Resource, resource2: Resource): number {
    let similarity = 0;
    let factors = 0;

    // Category match (30%)
    if (resource1.categoryId === resource2.categoryId) {
      similarity += 0.3;
    }
    factors++;

    // Phase overlap (25%)
    const phases1 = Array.isArray(resource1.phaseRelevance) ? resource1.phaseRelevance : [];
    const phases2 = Array.isArray(resource2.phaseRelevance) ? resource2.phaseRelevance : [];
    const phaseOverlap = phases1.filter((p) => phases2.includes(p)).length;
    const phaseUnion = new Set([...phases1, ...phases2]).size;
    if (phaseUnion > 0) {
      similarity += (phaseOverlap / phaseUnion) * 0.25;
    }
    factors++;

    // Idea type overlap (25%)
    const types1 = Array.isArray(resource1.ideaTypes) ? resource1.ideaTypes : [];
    const types2 = Array.isArray(resource2.ideaTypes) ? resource2.ideaTypes : [];
    const typeOverlap = types1.filter((t) => types2.includes(t)).length;
    const typeUnion = new Set([...types1, ...types2]).size;
    if (typeUnion > 0) {
      similarity += (typeOverlap / typeUnion) * 0.25;
    }
    factors++;

    // Resource type match (20%)
    if (resource1.resourceType === resource2.resourceType) {
      similarity += 0.2;
    }
    factors++;

    return similarity;
  }

  /**
   * Calculate match with analysis context
   */
  private calculateContextMatch(resource: Resource, analysisContext: any): number {
    if (!analysisContext) {
      return 0;
    }

    let match = 0;

    // Phase match
    const phases = Array.isArray(resource.phaseRelevance) ? resource.phaseRelevance : [];
    if (analysisContext.phase && phases.includes(analysisContext.phase)) {
      match += 0.5;
    }

    // Idea type match
    const ideaTypes = Array.isArray(resource.ideaTypes) ? resource.ideaTypes : [];
    if (analysisContext.ideaType && ideaTypes.includes(analysisContext.ideaType)) {
      match += 0.5;
    }

    return match;
  }

  /**
   * Apply diversity boost to recommendations
   * Ensures variety in categories and types
   */
  private applyDiversityBoost(
    recommendations: ScoredRecommendation[],
    analysisContext: any
  ): ScoredRecommendation[] {
    const categoryCount = new Map<number | null, number>();
    const typeCount = new Map<string, number>();

    // Sort by initial score
    recommendations.sort((a, b) => b.score - a.score);

    // Apply diversity penalty for over-represented categories/types
    const boosted = recommendations.map((rec) => {
      const categoryId = rec.resource.categoryId;
      const resourceType = rec.resource.resourceType;

      const categoryPenalty = (categoryCount.get(categoryId) || 0) * 0.1;
      const typePenalty = (typeCount.get(resourceType) || 0) * 0.05;

      const diversityScore = Math.max(0, 1 - categoryPenalty - typePenalty);
      const adjustedScore = rec.score * (1 - this.WEIGHTS.DIVERSITY) + diversityScore * this.WEIGHTS.DIVERSITY;

      // Update counts
      categoryCount.set(categoryId, (categoryCount.get(categoryId) || 0) + 1);
      typeCount.set(resourceType, (typeCount.get(resourceType) || 0) + 1);

      return {
        ...rec,
        score: adjustedScore,
        scoreBreakdown: {
          ...rec.scoreBreakdown,
          diversity: diversityScore,
        },
      };
    });

    // Re-sort by adjusted score
    boosted.sort((a, b) => b.score - a.score);

    return boosted;
  }

  /**
   * Get analysis context for recommendations
   */
  private async getAnalysisContext(analysisId: number): Promise<any> {
    const analysisResult = await db
      .select()
      .from(searches)
      .where(eq(searches.id, analysisId))
      .limit(1);

    const analysis = analysisResult[0];

    if (!analysis) {
      return null;
    }

    // Extract relevant context
    return {
      phase: this.inferPhaseFromAnalysis(analysis),
      ideaType: this.inferIdeaTypeFromAnalysis(analysis),
      keywords: this.extractKeywordsFromAnalysis(analysis),
    };
  }

  /**
   * Infer phase from analysis
   */
  private inferPhaseFromAnalysis(analysis: any): string {
    // Simple heuristic based on analysis content
    // In a real implementation, this could be more sophisticated
    const query = (analysis.query || '').toLowerCase();

    if (query.includes('research') || query.includes('market')) {
      return 'research';
    } else if (query.includes('validate') || query.includes('test')) {
      return 'validation';
    } else if (query.includes('build') || query.includes('develop')) {
      return 'development';
    } else if (query.includes('launch') || query.includes('market')) {
      return 'launch';
    }

    return 'research'; // Default
  }

  /**
   * Infer idea type from analysis
   */
  private inferIdeaTypeFromAnalysis(analysis: any): string {
    const query = (analysis.query || '').toLowerCase();

    if (query.includes('software') || query.includes('app') || query.includes('platform')) {
      return 'software';
    } else if (query.includes('product') || query.includes('physical')) {
      return 'physical_product';
    } else if (query.includes('service') || query.includes('consulting')) {
      return 'service';
    } else if (query.includes('marketplace') || query.includes('platform')) {
      return 'marketplace';
    }

    return 'software'; // Default
  }

  /**
   * Extract keywords from analysis
   */
  private extractKeywordsFromAnalysis(analysis: any): string[] {
    const text = `${analysis.query || ''} ${analysis.result || ''}`.toLowerCase();
    const words = text.match(/\b[a-z0-9]+\b/g) || [];

    const stopWords = new Set([
      'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from',
      'has', 'he', 'in', 'is', 'it', 'its', 'of', 'on', 'that', 'the',
      'to', 'was', 'will', 'with',
    ]);

    return [...new Set(words.filter((w) => w.length > 3 && !stopWords.has(w)))];
  }

  /**
   * Filter and limit recommendations
   */
  private filterAndLimit(
    resources: Resource[],
    excludeIds: number[],
    limit: number
  ): Resource[] {
    const filtered = resources.filter((r) => !excludeIds.includes(r.id));
    return filtered.slice(0, limit);
  }

  /**
   * Get cache key for recommendations
   */
  private getCacheKey(userId: number, analysisId?: number): string {
    return `user:${userId}:analysis:${analysisId || 'none'}`;
  }

  /**
   * Clear cache for a user
   */
  clearCache(userId: number): void {
    const keysToDelete: string[] = [];
    
    for (const key of this.recommendationCache.keys()) {
      if (key.startsWith(`user:${userId}:`)) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach((key) => this.recommendationCache.delete(key));
  }

  /**
   * Clear all cache
   */
  clearAllCache(): void {
    this.recommendationCache.clear();
  }
}

// Export singleton instance
export const resourceRecommendationEngine = new ResourceRecommendationEngine();
