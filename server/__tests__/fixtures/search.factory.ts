/**
 * SearchFactory - Test Data Factory for Searches
 * 
 * Provides methods to create, persist, and cleanup test searches for E2E testing.
 * Supports different search states (pending, completed, failed) and configurable scores.
 * 
 * Requirements: 8.2, 8.3
 * 
 * Example:
 * ```typescript
 * const search = SearchFactory.create(userId, { innovationScore: 85 });
 * await SearchFactory.persist(search);
 * // ... run tests
 * await SearchFactory.cleanup(search.id);
 * ```
 */

import { db } from '../../db';
import { searches, searchResults } from '@shared/schema';
import { eq } from 'drizzle-orm';

export interface TestSearch {
  id?: number;
  userId: number;
  query: string;
  timestamp?: Date;
  resultsCount?: number;
  isFavorite?: boolean;
  status?: 'pending' | 'completed' | 'failed';
  results?: TestSearchResult[];
}

export interface TestSearchResult {
  id?: number;
  searchId?: number;
  title: string;
  description: string;
  category: 'market' | 'technology' | 'ux' | 'business_model';
  feasibility: 'high' | 'medium' | 'low';
  marketPotential: 'high' | 'medium' | 'low';
  innovationScore: number;
  marketSize: string;
  gapReason: string;
  isSaved?: boolean;
  confidenceScore?: number;
  priority?: 'high' | 'medium' | 'low';
  actionableRecommendations?: string[];
  competitorAnalysis?: string;
  industryContext?: string;
  targetAudience?: string;
  keyTrends?: string[];
}

export class SearchFactory {
  private static counter = 0;

  /**
   * Create a test search with defaults and optional overrides
   * @param userId - User ID who owns the search
   * @param overrides - Partial search data to override defaults
   * @returns Test search object
   */
  static create(userId: number, overrides: Partial<TestSearch> = {}): TestSearch {
    const counter = ++this.counter;
    
    return {
      userId,
      query: `Test search query ${counter}`,
      timestamp: new Date(),
      resultsCount: 0,
      isFavorite: false,
      status: 'completed',
      ...overrides,
    };
  }

  /**
   * Create a pending search
   * @param userId - User ID
   * @param overrides - Optional overrides
   * @returns Pending test search
   */
  static createPending(userId: number, overrides: Partial<TestSearch> = {}): TestSearch {
    return this.create(userId, {
      status: 'pending',
      resultsCount: 0,
      ...overrides,
    });
  }

  /**
   * Create a completed search with results
   * @param userId - User ID
   * @param overrides - Optional overrides
   * @returns Completed test search
   */
  static createCompleted(userId: number, overrides: Partial<TestSearch> = {}): TestSearch {
    const resultCount = overrides.results?.length || 5;
    
    return this.create(userId, {
      status: 'completed',
      resultsCount: resultCount,
      results: overrides.results || this.generateResults(resultCount),
      ...overrides,
    });
  }

  /**
   * Create a failed search
   * @param userId - User ID
   * @param overrides - Optional overrides
   * @returns Failed test search
   */
  static createFailed(userId: number, overrides: Partial<TestSearch> = {}): TestSearch {
    return this.create(userId, {
      status: 'failed',
      resultsCount: 0,
      ...overrides,
    });
  }

  /**
   * Create a favorite search
   * @param userId - User ID
   * @param overrides - Optional overrides
   * @returns Favorite test search
   */
  static createFavorite(userId: number, overrides: Partial<TestSearch> = {}): TestSearch {
    return this.createCompleted(userId, {
      isFavorite: true,
      ...overrides,
    });
  }

  /**
   * Generate test search results
   * @param count - Number of results to generate
   * @param overrides - Optional overrides for all results
   * @returns Array of test search results
   */
  static generateResults(count: number = 5, overrides: Partial<TestSearchResult> = {}): TestSearchResult[] {
    const results: TestSearchResult[] = [];
    const categories: Array<'market' | 'technology' | 'ux' | 'business_model'> = ['market', 'technology', 'ux', 'business_model'];
    const feasibilities: Array<'high' | 'medium' | 'low'> = ['high', 'medium', 'low'];
    const priorities: Array<'high' | 'medium' | 'low'> = ['high', 'medium', 'low'];

    for (let i = 0; i < count; i++) {
      results.push({
        title: `Gap Opportunity ${i + 1}`,
        description: `This is a test gap opportunity description for result ${i + 1}. It represents an untapped market opportunity.`,
        category: categories[i % categories.length],
        feasibility: feasibilities[i % feasibilities.length],
        marketPotential: feasibilities[i % feasibilities.length],
        innovationScore: 60 + (i * 5), // 60, 65, 70, 75, 80
        marketSize: `$${(i + 1) * 10}M - $${(i + 1) * 50}M`,
        gapReason: `Market gap exists due to lack of solutions addressing specific need ${i + 1}`,
        isSaved: false,
        confidenceScore: 70 + (i * 3), // 70, 73, 76, 79, 82
        priority: priorities[i % priorities.length],
        actionableRecommendations: [
          `Recommendation 1 for gap ${i + 1}`,
          `Recommendation 2 for gap ${i + 1}`,
          `Recommendation 3 for gap ${i + 1}`,
        ],
        competitorAnalysis: `Limited competition in this space. Main competitors: Competitor A, Competitor B`,
        industryContext: `Industry is growing at ${10 + i}% annually with increasing demand`,
        targetAudience: `Target audience: ${['SMBs', 'Enterprises', 'Consumers', 'Developers', 'Startups'][i % 5]}`,
        keyTrends: [
          `Trend 1: Growing market demand`,
          `Trend 2: Technology advancement`,
          `Trend 3: Regulatory changes`,
        ],
        ...overrides,
      });
    }

    return results;
  }

  /**
   * Create a search result with specific innovation score
   * @param innovationScore - Innovation score (0-100)
   * @param overrides - Optional overrides
   * @returns Test search result
   */
  static createResultWithScore(innovationScore: number, overrides: Partial<TestSearchResult> = {}): TestSearchResult {
    const results = this.generateResults(1, { innovationScore, ...overrides });
    return results[0];
  }

  /**
   * Create high-scoring search results
   * @param count - Number of results
   * @returns Array of high-scoring results
   */
  static createHighScoringResults(count: number = 3): TestSearchResult[] {
    return this.generateResults(count, {
      innovationScore: 85,
      confidenceScore: 90,
      feasibility: 'high',
      marketPotential: 'high',
      priority: 'high',
    });
  }

  /**
   * Create low-scoring search results
   * @param count - Number of results
   * @returns Array of low-scoring results
   */
  static createLowScoringResults(count: number = 3): TestSearchResult[] {
    return this.generateResults(count, {
      innovationScore: 45,
      confidenceScore: 50,
      feasibility: 'low',
      marketPotential: 'low',
      priority: 'low',
    });
  }

  /**
   * Persist a test search to the database
   * @param search - Test search to persist
   * @returns Persisted search with database ID
   */
  static async persist(search: TestSearch): Promise<TestSearch> {
    try {
      const insertData: any = {
        userId: search.userId,
        query: search.query,
        timestamp: search.timestamp || new Date(),
        resultsCount: search.resultsCount || 0,
        isFavorite: search.isFavorite || false,
      };

      const result = await db.insert(searches).values(insertData).returning();
      const persistedSearch = {
        ...search,
        id: result[0].id,
      };

      // Persist results if provided
      if (search.results && search.results.length > 0) {
        const persistedResults = await this.persistResults(result[0].id, search.results);
        persistedSearch.results = persistedResults;
      }

      return persistedSearch;
    } catch (error) {
      console.error('Failed to persist test search:', error);
      throw error;
    }
  }

  /**
   * Persist search results to the database
   * @param searchId - Search ID
   * @param results - Array of search results
   * @returns Persisted results with database IDs
   */
  static async persistResults(searchId: number, results: TestSearchResult[]): Promise<TestSearchResult[]> {
    try {
      const insertData = results.map(result => ({
        searchId,
        title: result.title,
        description: result.description,
        category: result.category,
        feasibility: result.feasibility,
        marketPotential: result.marketPotential,
        innovationScore: result.innovationScore,
        marketSize: result.marketSize,
        gapReason: result.gapReason,
        isSaved: result.isSaved || false,
        confidenceScore: result.confidenceScore || 75,
        priority: result.priority || 'medium',
        actionableRecommendations: result.actionableRecommendations || [],
        competitorAnalysis: result.competitorAnalysis || null,
        industryContext: result.industryContext || null,
        targetAudience: result.targetAudience || null,
        keyTrends: result.keyTrends || [],
      }));

      const persistedResults = await db.insert(searchResults).values(insertData).returning();

      return persistedResults.map((pr, index) => ({
        ...results[index],
        id: pr.id,
        searchId: pr.searchId,
      }));
    } catch (error) {
      console.error('Failed to persist search results:', error);
      throw error;
    }
  }

  /**
   * Create and persist a test search in one step
   * @param userId - User ID
   * @param overrides - Optional overrides
   * @returns Persisted test search
   */
  static async createAndPersist(userId: number, overrides: Partial<TestSearch> = {}): Promise<TestSearch> {
    const search = this.create(userId, overrides);
    return await this.persist(search);
  }

  /**
   * Create and persist a completed search with results
   * @param userId - User ID
   * @param overrides - Optional overrides
   * @returns Persisted completed search
   */
  static async createAndPersistCompleted(userId: number, overrides: Partial<TestSearch> = {}): TestSearch {
    const search = this.createCompleted(userId, overrides);
    return await this.persist(search);
  }

  /**
   * Cleanup a test search and its results from the database
   * @param searchId - ID of search to delete
   */
  static async cleanup(searchId: number): Promise<void> {
    try {
      if (!searchId) {
        console.warn('No search ID provided for cleanup');
        return;
      }

      // Delete results first (foreign key constraint)
      await db.delete(searchResults).where(eq(searchResults.searchId, searchId));
      
      // Delete search
      await db.delete(searches).where(eq(searches.id, searchId));
    } catch (error) {
      console.error('Failed to cleanup test search:', error);
      throw error;
    }
  }

  /**
   * Cleanup multiple test searches
   * @param searchIds - Array of search IDs to delete
   */
  static async cleanupMany(searchIds: number[]): Promise<void> {
    try {
      for (const searchId of searchIds) {
        await this.cleanup(searchId);
      }
    } catch (error) {
      console.error('Failed to cleanup test searches:', error);
      throw error;
    }
  }

  /**
   * Cleanup all searches for a specific user
   * @param userId - User ID
   */
  static async cleanupByUser(userId: number): Promise<void> {
    try {
      const userSearches = await db.query.searches.findMany({
        where: (searches, { eq }) => eq(searches.userId, userId),
      });

      const searchIds = userSearches.map(s => s.id);
      await this.cleanupMany(searchIds);
    } catch (error) {
      console.error('Failed to cleanup user searches:', error);
      throw error;
    }
  }

  /**
   * Update search favorite status
   * @param searchId - Search ID
   * @param isFavorite - Favorite status
   */
  static async updateFavorite(searchId: number, isFavorite: boolean): Promise<void> {
    try {
      await db.update(searches)
        .set({ isFavorite })
        .where(eq(searches.id, searchId));
    } catch (error) {
      console.error('Failed to update favorite status:', error);
      throw error;
    }
  }

  /**
   * Find a search by ID
   * @param searchId - Search ID
   * @returns Search or null
   */
  static async findById(searchId: number): Promise<TestSearch | null> {
    try {
      const result = await db.query.searches.findFirst({
        where: (searches, { eq }) => eq(searches.id, searchId),
        with: {
          // Note: This assumes the relation is set up in the schema
        },
      });

      if (!result) return null;

      return {
        id: result.id,
        userId: result.userId!,
        query: result.query,
        timestamp: new Date(result.timestamp),
        resultsCount: result.resultsCount,
        isFavorite: result.isFavorite,
        status: 'completed', // Default status
      };
    } catch (error) {
      console.error('Failed to find search by ID:', error);
      return null;
    }
  }
}
