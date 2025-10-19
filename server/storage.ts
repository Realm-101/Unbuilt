import {
  users,
  searches,
  searchResults,
  ideas,
  type User,
  type UpsertUser,
  type Idea,
  type InsertIdea,
  type ValidateIdea,
} from "@shared/schema";
import type { SearchResultInput, SearchResultUpdate, FinancialProjections } from "@shared/types";
import { db } from "./db";
import { eq, like, desc, count, and } from "drizzle-orm";

// Interface for storage operations
export interface IStorage {
  // User operations
  // (IMPORTANT) these user operations are mandatory for Replit Auth.
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // Search operations
  createSearch(search: { query: string; userId?: string }): Promise<{ id: number; query: string; timestamp: Date; resultsCount: number; userId: number | null }>;
  getSearches(userId?: string): Promise<any[]>;
  
  // Search results operations
  createSearchResult(result: SearchResultInput): Promise<typeof searchResults.$inferSelect>;
  getSearchResults(searchId: number): Promise<(typeof searchResults.$inferSelect)[]>;
  getSearchResultById(id: number): Promise<typeof searchResults.$inferSelect | undefined>;
  updateSearchResult(id: number, updates: SearchResultUpdate): Promise<typeof searchResults.$inferSelect>;
  getAllSavedResults(userId: string): Promise<(typeof searchResults.$inferSelect)[]>;
  
  // Idea operations
  createIdea(idea: ValidateIdea & { 
    userId: string; 
    originalityScore?: number;
    credibilityScore?: number;
    marketGapScore?: number;
    competitionScore?: number;
    overallScore?: number;
    breakEvenMonths?: number;
    projectedRoi?: number;
    financialProjections?: FinancialProjections;
    status?: string;
  }): Promise<Idea>;
  getIdeas(userId: string): Promise<Idea[]>;
  getIdea(id: number, userId: string): Promise<Idea | undefined>;
  updateIdea(id: number, updates: Partial<Idea>, userId: string): Promise<Idea | undefined>;
  
  // Admin operations
  getAllUsers(options?: { page?: number; limit?: number; search?: string }): Promise<User[]>;
  getSystemStats(): Promise<any>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  // (IMPORTANT) these user operations are mandatory for Replit Auth.

  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, parseInt(id)));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date().toISOString(),
        },
      })
      .returning();
    return user;
  }

  // Search operations
  async createSearch(search: { query: string; userId?: string }) {
    const [newSearch] = await db.insert(searches).values({
      query: search.query,
      userId: search.userId ? parseInt(search.userId) : null,
      resultsCount: 0,
    }).returning();
    return {
      ...newSearch,
      timestamp: new Date(newSearch.timestamp)
    };
  }

  async getSearches(userId?: string) {
    if (userId) {
      return await db.select().from(searches).where(eq(searches.userId, parseInt(userId)));
    }
    return await db.select().from(searches);
  }

  // Search results operations
  async createSearchResult(result: SearchResultInput) {
    const [newResult] = await db.insert(searchResults).values(result).returning();
    return newResult;
  }

  async getSearchResults(searchId: number) {
    return await db.select().from(searchResults).where(eq(searchResults.searchId, searchId));
  }

  async getSearchResultById(id: number) {
    const [result] = await db.select().from(searchResults).where(eq(searchResults.id, id));
    return result;
  }

  async updateSearchResult(id: number, updates: SearchResultUpdate) {
    const [updated] = await db.update(searchResults)
      .set(updates)
      .where(eq(searchResults.id, id))
      .returning();
    return updated;
  }

  async getAllSavedResults(userId: string) {
    // Get all saved results for searches belonging to this user
    const results = await db
      .select({
        id: searchResults.id,
        searchId: searchResults.searchId,
        title: searchResults.title,
        description: searchResults.description,
        category: searchResults.category,
        feasibility: searchResults.feasibility,
        marketPotential: searchResults.marketPotential,
        innovationScore: searchResults.innovationScore,
        marketSize: searchResults.marketSize,
        gapReason: searchResults.gapReason,
        isSaved: searchResults.isSaved,
        confidenceScore: searchResults.confidenceScore,
        priority: searchResults.priority,
        actionableRecommendations: searchResults.actionableRecommendations,
        industryContext: searchResults.industryContext,
        competitorAnalysis: searchResults.competitorAnalysis,
        targetAudience: searchResults.targetAudience,
        keyTrends: searchResults.keyTrends,
      })
      .from(searchResults)
      .innerJoin(searches, eq(searchResults.searchId, searches.id))
      .where(and(eq(searches.userId, parseInt(userId)), eq(searchResults.isSaved, true)))
      .orderBy(desc(searchResults.id));
    
    return results;
  }

  // Idea operations
  async createIdea(ideaData: ValidateIdea & { 
    userId: string; 
    originalityScore?: number;
    credibilityScore?: number;
    marketGapScore?: number;
    competitionScore?: number;
    overallScore?: number;
    breakEvenMonths?: number;
    projectedRoi?: number;
    financialProjections?: FinancialProjections;
    status?: string;
  }): Promise<Idea> {
    const [newIdea] = await db.insert(ideas).values({
      ...ideaData,
      userId: parseInt(ideaData.userId),
      status: ideaData.status ?? 'draft'
    }).returning();
    return newIdea;
  }

  async getIdeas(userId: string): Promise<Idea[]> {
    return await db.select().from(ideas).where(eq(ideas.userId, parseInt(userId)));
  }

  async getIdea(id: number, userId: string): Promise<Idea | undefined> {
    const [idea] = await db.select()
      .from(ideas)
      .where(eq(ideas.id, id) && eq(ideas.userId, parseInt(userId)));
    return idea;
  }

  async updateIdea(id: number, updates: Partial<Idea>, userId: string): Promise<Idea | undefined> {
    const [updated] = await db.update(ideas)
      .set({
        ...updates,
        updatedAt: new Date().toISOString()
      })
      .where(eq(ideas.id, id) && eq(ideas.userId, parseInt(userId)))
      .returning();
    return updated;
  }

  // Admin operations
  async getAllUsers(options: { page?: number; limit?: number; search?: string } = {}): Promise<User[]> {
    const { page = 1, limit = 50, search } = options;
    const offset = (page - 1) * limit;

    let query = db.select().from(users);

    if (search) {
      // @ts-ignore - Drizzle ORM type inference limitation with dynamic where conditions
      query = query.where(like(users.email, `%${search}%`));
    }

    return await query
      .orderBy(desc(users.createdAt))
      .limit(limit)
      .offset(offset);
  }

  async getSystemStats(): Promise<any> {
    const [userCount] = await db.select({ count: count() }).from(users);
    const [searchCount] = await db.select({ count: count() }).from(searches);
    const [ideaCount] = await db.select({ count: count() }).from(ideas);

    return {
      totalUsers: userCount.count,
      totalSearches: searchCount.count,
      totalIdeas: ideaCount.count,
      timestamp: new Date().toISOString()
    };
  }
}

export const storage = new DatabaseStorage();