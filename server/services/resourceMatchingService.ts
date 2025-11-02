import { resourceRepository } from '../repositories/resourceRepository';
import type { Resource } from '@shared/schema';

/**
 * Context for matching resources to action plan steps or analyses
 */
export interface MatchingContext {
  phase: string; // 'research', 'validation', 'development', 'launch'
  ideaType?: string; // 'software', 'physical_product', 'service', 'marketplace'
  stepKeywords?: string[]; // Keywords extracted from step description
  userExperience?: string; // 'beginner', 'intermediate', 'advanced'
  previouslyViewed?: number[]; // Resource IDs already viewed
  userTier?: 'free' | 'pro' | 'enterprise'; // User subscription tier
}

/**
 * Resource with relevance score
 */
export interface ScoredResource {
  resource: Resource;
  score: number;
  scoreBreakdown: {
    phaseMatch: number;
    ideaTypeMatch: number;
    keywordSimilarity: number;
    experienceMatch: number;
    popularityBoost: number;
  };
}

/**
 * Resource Matching Service
 * Matches resources to action plan steps and user contexts using a weighted scoring algorithm
 */
export class ResourceMatchingService {
  // Scoring weights (must sum to 1.0)
  private readonly WEIGHTS = {
    PHASE_MATCH: 0.40,
    IDEA_TYPE_MATCH: 0.25,
    KEYWORD_SIMILARITY: 0.20,
    EXPERIENCE_MATCH: 0.10,
    POPULARITY_BOOST: 0.05,
  };

  /**
   * Match resources to a specific action plan step
   */
  async matchResourcesToStep(
    stepId: string,
    stepDescription: string,
    phase: string,
    ideaType: string,
    limit: number = 3
  ): Promise<Resource[]> {
    // Extract keywords from step description
    const keywords = this.extractKeywords(stepDescription);

    const context: MatchingContext = {
      phase,
      ideaType,
      stepKeywords: keywords,
    };

    return this.matchResources(context, limit);
  }

  /**
   * Get resources for an entire phase
   */
  async getPhaseResources(
    phase: string,
    ideaType: string,
    userTier: 'free' | 'pro' | 'enterprise' = 'free',
    limit: number = 10
  ): Promise<Resource[]> {
    const context: MatchingContext = {
      phase,
      ideaType,
      userTier,
    };

    return this.matchResources(context, limit);
  }

  /**
   * Match resources based on context with relevance scoring
   */
  async matchResources(
    context: MatchingContext,
    limit: number = 3
  ): Promise<Resource[]> {
    // Get candidate resources
    const filters: any = {
      isActive: true,
    };

    // Filter by premium status based on user tier
    if (context.userTier === 'free') {
      filters.isPremium = false;
    }

    // Get a larger pool of candidates for scoring
    const candidateLimit = Math.max(limit * 10, 50);
    const { resources: candidates } = await resourceRepository.findAll(
      filters,
      { limit: candidateLimit, sortBy: 'rating' }
    );

    // Score each resource
    const scoredResources = candidates.map((resource) => ({
      resource,
      ...this.calculateRelevanceScore(resource, context),
    }));

    // Sort by score (descending) and take top N
    scoredResources.sort((a, b) => b.score - a.score);

    // Filter out previously viewed if specified
    let filteredResources = scoredResources;
    if (context.previouslyViewed && context.previouslyViewed.length > 0) {
      filteredResources = scoredResources.filter(
        (sr) => !context.previouslyViewed!.includes(sr.resource.id)
      );
    }

    return filteredResources.slice(0, limit).map((sr) => sr.resource);
  }

  /**
   * Calculate relevance score for a resource given a context
   * Returns score (0-100) and breakdown of scoring components
   */
  calculateRelevanceScore(
    resource: Resource,
    context: MatchingContext
  ): { score: number; scoreBreakdown: ScoredResource['scoreBreakdown'] } {
    const breakdown = {
      phaseMatch: this.calculatePhaseMatch(resource, context),
      ideaTypeMatch: this.calculateIdeaTypeMatch(resource, context),
      keywordSimilarity: this.calculateKeywordSimilarity(resource, context),
      experienceMatch: this.calculateExperienceMatch(resource, context),
      popularityBoost: this.calculatePopularityBoost(resource),
    };

    // Calculate weighted score
    const score =
      breakdown.phaseMatch * this.WEIGHTS.PHASE_MATCH +
      breakdown.ideaTypeMatch * this.WEIGHTS.IDEA_TYPE_MATCH +
      breakdown.keywordSimilarity * this.WEIGHTS.KEYWORD_SIMILARITY +
      breakdown.experienceMatch * this.WEIGHTS.EXPERIENCE_MATCH +
      breakdown.popularityBoost * this.WEIGHTS.POPULARITY_BOOST;

    return {
      score: Math.round(score * 100) / 100, // Round to 2 decimal places
      scoreBreakdown: breakdown,
    };
  }

  /**
   * Calculate phase match score (0-1)
   * 40% weight
   */
  private calculatePhaseMatch(
    resource: Resource,
    context: MatchingContext
  ): number {
    if (!context.phase) {
      return 0.5; // Neutral score if no phase specified
    }

    const phaseRelevance = Array.isArray(resource.phaseRelevance)
      ? resource.phaseRelevance
      : [];

    // Exact match
    if (phaseRelevance.includes(context.phase)) {
      return 1.0;
    }

    // Partial match for adjacent phases
    const phaseOrder = ['research', 'validation', 'development', 'launch'];
    const contextPhaseIndex = phaseOrder.indexOf(context.phase);

    if (contextPhaseIndex === -1) {
      return 0;
    }

    // Check if resource is relevant to adjacent phases
    const adjacentPhases = [
      phaseOrder[contextPhaseIndex - 1],
      phaseOrder[contextPhaseIndex + 1],
    ].filter(Boolean);

    const hasAdjacentMatch = adjacentPhases.some((phase) =>
      phaseRelevance.includes(phase)
    );

    return hasAdjacentMatch ? 0.5 : 0;
  }

  /**
   * Calculate idea type match score (0-1)
   * 25% weight
   */
  private calculateIdeaTypeMatch(
    resource: Resource,
    context: MatchingContext
  ): number {
    if (!context.ideaType) {
      return 0.5; // Neutral score if no idea type specified
    }

    const ideaTypes = Array.isArray(resource.ideaTypes)
      ? resource.ideaTypes
      : [];

    // Exact match
    if (ideaTypes.includes(context.ideaType)) {
      return 1.0;
    }

    // If resource has no specific idea types, it's generic (moderate score)
    if (ideaTypes.length === 0) {
      return 0.6;
    }

    // No match
    return 0;
  }

  /**
   * Calculate keyword similarity score (0-1)
   * 20% weight
   */
  private calculateKeywordSimilarity(
    resource: Resource,
    context: MatchingContext
  ): number {
    if (!context.stepKeywords || context.stepKeywords.length === 0) {
      return 0.5; // Neutral score if no keywords
    }

    // Extract keywords from resource title and description
    const resourceText = `${resource.title} ${resource.description}`.toLowerCase();
    const resourceKeywords = this.extractKeywords(resourceText);

    // Calculate Jaccard similarity
    const contextKeywordsSet = new Set(
      context.stepKeywords.map((k) => k.toLowerCase())
    );
    const resourceKeywordsSet = new Set(resourceKeywords);

    const intersection = new Set(
      [...contextKeywordsSet].filter((k) => resourceKeywordsSet.has(k))
    );
    const union = new Set([...contextKeywordsSet, ...resourceKeywordsSet]);

    if (union.size === 0) {
      return 0;
    }

    return intersection.size / union.size;
  }

  /**
   * Calculate experience level match score (0-1)
   * 10% weight
   */
  private calculateExperienceMatch(
    resource: Resource,
    context: MatchingContext
  ): number {
    if (!context.userExperience || !resource.difficultyLevel) {
      return 0.5; // Neutral score if not specified
    }

    const experienceLevels = ['beginner', 'intermediate', 'advanced'];
    const userLevel = experienceLevels.indexOf(context.userExperience);
    const resourceLevel = experienceLevels.indexOf(resource.difficultyLevel);

    if (userLevel === -1 || resourceLevel === -1) {
      return 0.5;
    }

    // Exact match
    if (userLevel === resourceLevel) {
      return 1.0;
    }

    // Adjacent levels get partial credit
    const levelDiff = Math.abs(userLevel - resourceLevel);
    if (levelDiff === 1) {
      return 0.6;
    }

    // Two levels apart
    return 0.2;
  }

  /**
   * Calculate popularity boost score (0-1)
   * 5% weight
   */
  private calculatePopularityBoost(resource: Resource): number {
    // Combine rating and view count for popularity
    const ratingScore = resource.averageRating / 500; // Normalize from 0-500 to 0-1
    const viewScore = Math.min(resource.viewCount / 1000, 1); // Cap at 1000 views

    // Weight rating more heavily than views (70/30)
    return ratingScore * 0.7 + viewScore * 0.3;
  }

  /**
   * Extract keywords from text
   * Removes common stop words and returns meaningful terms
   */
  private extractKeywords(text: string): string[] {
    // Common stop words to filter out
    const stopWords = new Set([
      'a',
      'an',
      'and',
      'are',
      'as',
      'at',
      'be',
      'by',
      'for',
      'from',
      'has',
      'he',
      'in',
      'is',
      'it',
      'its',
      'of',
      'on',
      'that',
      'the',
      'to',
      'was',
      'will',
      'with',
      'you',
      'your',
      'this',
      'they',
      'their',
      'have',
      'can',
      'should',
      'would',
      'could',
    ]);

    // Extract words (alphanumeric sequences)
    const words = text
      .toLowerCase()
      .match(/\b[a-z0-9]+\b/g) || [];

    // Filter stop words and short words
    const keywords = words.filter(
      (word) => word.length > 2 && !stopWords.has(word)
    );

    // Remove duplicates
    return [...new Set(keywords)];
  }

  /**
   * Get similar resources based on a reference resource
   */
  async getSimilarResources(
    resourceId: number,
    limit: number = 5
  ): Promise<Resource[]> {
    const resource = await resourceRepository.findById(resourceId);

    if (!resource) {
      return [];
    }

    // Build context from the resource
    const phaseRelevance = Array.isArray(resource.phaseRelevance)
      ? resource.phaseRelevance
      : [];
    const ideaTypes = Array.isArray(resource.ideaTypes)
      ? resource.ideaTypes
      : [];

    const context: MatchingContext = {
      phase: phaseRelevance[0] || '',
      ideaType: ideaTypes[0],
      stepKeywords: this.extractKeywords(
        `${resource.title} ${resource.description}`
      ),
      previouslyViewed: [resourceId], // Exclude the reference resource
    };

    return this.matchResources(context, limit);
  }
}

// Export singleton instance
export const resourceMatchingService = new ResourceMatchingService();
