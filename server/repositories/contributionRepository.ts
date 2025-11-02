import { db } from '../db';
import {
  resourceContributions,
  users,
  resourceCategories,
  type ResourceContribution,
  type InsertResourceContribution
} from '@shared/schema';
import { eq, and, sql, desc, inArray } from 'drizzle-orm';

export interface ContributionWithDetails extends ResourceContribution {
  user?: {
    id: number;
    name: string | null;
    email: string;
  };
  reviewer?: {
    id: number;
    name: string | null;
    email: string;
  } | null;
  category?: typeof resourceCategories.$inferSelect | null;
}

export type ContributionStatus = 'pending' | 'approved' | 'rejected';

/**
 * Contribution Repository
 * Handles all database operations for resource contributions
 */
export class ContributionRepository {
  /**
   * Get all contributions
   */
  async findAll(status?: ContributionStatus): Promise<ContributionWithDetails[]> {
    let query = db
      .select()
      .from(resourceContributions)
      .orderBy(desc(resourceContributions.createdAt));

    if (status) {
      query = query.where(eq(resourceContributions.status, status)) as any;
    }

    const contributions = await query;

    return this.enrichContributions(contributions);
  }

  /**
   * Get contribution by ID
   */
  async findById(id: number): Promise<ContributionWithDetails | null> {
    const result = await db
      .select()
      .from(resourceContributions)
      .where(eq(resourceContributions.id, id))
      .limit(1);

    const contribution = result[0];

    if (!contribution) {
      return null;
    }

    const enriched = await this.enrichContributions([contribution]);
    return enriched[0] || null;
  }

  /**
   * Get contributions by user
   */
  async findByUserId(userId: number): Promise<ContributionWithDetails[]> {
    const contributions = await db
      .select()
      .from(resourceContributions)
      .where(eq(resourceContributions.userId, userId))
      .orderBy(desc(resourceContributions.createdAt));

    return this.enrichContributions(contributions);
  }

  /**
   * Get pending contributions
   */
  async findPending(): Promise<ContributionWithDetails[]> {
    return this.findAll('pending');
  }

  /**
   * Get approved contributions
   */
  async findApproved(): Promise<ContributionWithDetails[]> {
    return this.findAll('approved');
  }

  /**
   * Get rejected contributions
   */
  async findRejected(): Promise<ContributionWithDetails[]> {
    return this.findAll('rejected');
  }

  /**
   * Create a new contribution
   */
  async create(data: InsertResourceContribution): Promise<ResourceContribution> {
    const [contribution] = await db
      .insert(resourceContributions)
      .values(data)
      .returning();

    return contribution;
  }

  /**
   * Update a contribution
   */
  async update(
    id: number,
    data: Partial<InsertResourceContribution>
  ): Promise<ResourceContribution | null> {
    const [contribution] = await db
      .update(resourceContributions)
      .set(data)
      .where(eq(resourceContributions.id, id))
      .returning();

    return contribution || null;
  }

  /**
   * Approve a contribution
   */
  async approve(
    id: number,
    reviewedBy: number,
    adminNotes?: string
  ): Promise<ResourceContribution | null> {
    const [contribution] = await db
      .update(resourceContributions)
      .set({
        status: 'approved',
        reviewedBy,
        reviewedAt: sql`NOW()`,
        adminNotes
      })
      .where(eq(resourceContributions.id, id))
      .returning();

    return contribution || null;
  }

  /**
   * Reject a contribution
   */
  async reject(
    id: number,
    reviewedBy: number,
    adminNotes: string
  ): Promise<ResourceContribution | null> {
    const [contribution] = await db
      .update(resourceContributions)
      .set({
        status: 'rejected',
        reviewedBy,
        reviewedAt: sql`NOW()`,
        adminNotes
      })
      .where(eq(resourceContributions.id, id))
      .returning();

    return contribution || null;
  }

  /**
   * Delete a contribution
   */
  async delete(id: number): Promise<boolean> {
    const result = await db
      .delete(resourceContributions)
      .where(eq(resourceContributions.id, id));

    return result.rowCount ? result.rowCount > 0 : false;
  }

  /**
   * Get contribution count by status
   */
  async countByStatus(status: ContributionStatus): Promise<number> {
    const result = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(resourceContributions)
      .where(eq(resourceContributions.status, status));

    return result[0]?.count || 0;
  }

  /**
   * Get contribution count by user
   */
  async countByUserId(userId: number): Promise<number> {
    const result = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(resourceContributions)
      .where(eq(resourceContributions.userId, userId));

    return result[0]?.count || 0;
  }

  /**
   * Get pending contribution count
   */
  async countPending(): Promise<number> {
    return this.countByStatus('pending');
  }

  /**
   * Get recent contributions
   */
  async getRecent(limit: number = 10): Promise<ContributionWithDetails[]> {
    const contributions = await db
      .select()
      .from(resourceContributions)
      .orderBy(desc(resourceContributions.createdAt))
      .limit(limit);

    return this.enrichContributions(contributions);
  }

  /**
   * Get contributions by category
   */
  async findByCategoryId(categoryId: number): Promise<ContributionWithDetails[]> {
    const contributions = await db
      .select()
      .from(resourceContributions)
      .where(eq(resourceContributions.suggestedCategoryId, categoryId))
      .orderBy(desc(resourceContributions.createdAt));

    return this.enrichContributions(contributions);
  }

  /**
   * Get contribution statistics
   */
  async getStats(): Promise<{
    total: number;
    pending: number;
    approved: number;
    rejected: number;
    approvalRate: number;
  }> {
    const [total, pending, approved, rejected] = await Promise.all([
      this.countByStatus('pending'),
      this.countByStatus('pending'),
      this.countByStatus('approved'),
      this.countByStatus('rejected')
    ]);

    const totalReviewed = approved + rejected;
    const approvalRate = totalReviewed > 0 ? (approved / totalReviewed) * 100 : 0;

    return {
      total: pending + approved + rejected,
      pending,
      approved,
      rejected,
      approvalRate: Math.round(approvalRate * 10) / 10
    };
  }

  /**
   * Enrich contributions with user and category details
   */
  private async enrichContributions(
    contributions: ResourceContribution[]
  ): Promise<ContributionWithDetails[]> {
    return Promise.all(
      contributions.map(async (contribution) => {
        const [userResult, reviewerResult, categoryResult] = await Promise.all([
          db
            .select({
              id: users.id,
              name: users.name,
              email: users.email
            })
            .from(users)
            .where(eq(users.id, contribution.userId))
            .limit(1),
          contribution.reviewedBy
            ? db
                .select({
                  id: users.id,
                  name: users.name,
                  email: users.email
                })
                .from(users)
                .where(eq(users.id, contribution.reviewedBy))
                .limit(1)
            : Promise.resolve([]),
          contribution.suggestedCategoryId
            ? db
                .select()
                .from(resourceCategories)
                .where(eq(resourceCategories.id, contribution.suggestedCategoryId))
                .limit(1)
            : Promise.resolve([])
        ]);

        return {
          ...contribution,
          user: userResult[0],
          reviewer: reviewerResult[0] || null,
          category: categoryResult[0] || null
        };
      })
    );
  }
}

// Export singleton instance
export const contributionRepository = new ContributionRepository();
