import { Router } from 'express';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from '@neondatabase/serverless';
import { sql } from 'drizzle-orm';
import * as schema from '@shared/schema';
import { subDays, startOfDay, endOfDay } from 'date-fns';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const db = drizzle(pool, { schema });
const router = Router();

// Get analytics data
router.get('/', async (req, res) => {
  try {
    const { range = '30d', category = 'all' } = req.query;
    
    // Parse date range
    const days = range === '7d' ? 7 : range === '30d' ? 30 : 90;
    const startDate = startOfDay(subDays(new Date(), days));
    const endDate = endOfDay(new Date());

    // Get search statistics
    const searchStats = await db
      .select({
        total: sql<number>`count(*)`,
        uniqueUsers: sql<number>`count(distinct user_id)`,
      })
      .from(schema.searches)
      .where(
        sql`created_at >= ${startDate.toISOString()} AND created_at <= ${endDate.toISOString()}`
      );

    // Get validation statistics (using search results as proxy since ideaValidations doesn't exist)
    const validationStats = await db
      .select({
        total: sql<number>`count(*)`,
        avgScore: sql<number>`avg(${schema.searchResults.innovationScore})`,
      })
      .from(schema.searchResults)
      .innerJoin(schema.searches, sql`${schema.searchResults.searchId} = ${schema.searches.id}`)
      .where(
        sql`${schema.searches.timestamp} >= ${startDate.toISOString()} AND ${schema.searches.timestamp} <= ${endDate.toISOString()}`
      );

    // Get category distribution from search results
    const categoryDistribution = await db
      .select({
        category: schema.searchResults.category,
        count: sql<number>`count(*)`,
      })
      .from(schema.searchResults)
      .innerJoin(schema.searches, sql`${schema.searchResults.searchId} = ${schema.searches.id}`)
      .where(
        sql`${schema.searches.timestamp} >= ${startDate.toISOString()} AND ${schema.searches.timestamp} <= ${endDate.toISOString()}`
      )
      .groupBy(schema.searchResults.category);

    // Get time series data
    const timeSeries = await db
      .select({
        date: sql<string>`date(timestamp)`,
        searches: sql<number>`count(*)`,
        uniqueUsers: sql<number>`count(distinct user_id)`,
      })
      .from(schema.searches)
      .where(
        sql`timestamp >= ${startDate.toISOString()} AND timestamp <= ${endDate.toISOString()}`
      )
      .groupBy(sql`date(timestamp)`)
      .orderBy(sql`date(timestamp)`);

    // Get top opportunities from search results
    const topOpportunities = await db
      .select({
        name: schema.searchResults.title,
        score: schema.searchResults.innovationScore,
        growth: schema.searchResults.marketPotential,
        category: schema.searchResults.category,
      })
      .from(schema.searchResults)
      .innerJoin(schema.searches, sql`${schema.searchResults.searchId} = ${schema.searches.id}`)
      .where(
        sql`${schema.searches.timestamp} >= ${startDate.toISOString()} AND ${schema.searches.timestamp} <= ${endDate.toISOString()}`
      )
      .orderBy(sql`${schema.searchResults.innovationScore} desc`)
      .limit(10);

    // Get user engagement metrics simplified
    const engagementMetrics = await db
      .select({
        avgSearches: sql<number>`count(*)::numeric / count(distinct user_id)::numeric`,
        uniqueUsers: sql<number>`count(distinct user_id)`,
      })
      .from(schema.searches)
      .where(
        sql`created_at >= ${startDate.toISOString()} AND created_at <= ${endDate.toISOString()}`
      );

    // Calculate growth rates by comparing current period to previous period
    // 
    // Growth rate calculation strategy:
    // - Current period: Last N days (e.g., last 30 days)
    // - Previous period: N days before that (e.g., days 31-60)
    // - Formula: ((current - previous) / previous) * 100
    // 
    // Example for 30-day range:
    // - Current: Days 0-30 (today back to 30 days ago)
    // - Previous: Days 31-60 (31 days ago back to 60 days ago)
    // 
    // This gives us a percentage change that shows if metrics are improving or declining
    const previousPeriodStart = startOfDay(subDays(new Date(), days * 2));
    const previousPeriodEnd = endOfDay(subDays(new Date(), days));
    
    const previousSearchStats = await db
      .select({
        total: sql<number>`count(*)`,
      })
      .from(schema.searches)
      .where(
        sql`created_at >= ${previousPeriodStart.toISOString()} AND created_at <= ${previousPeriodEnd.toISOString()}`
      );

    const currentTotal = searchStats[0]?.total || 0;
    const previousTotal = previousSearchStats[0]?.total || 1; // Use 1 to avoid division by zero
    
    // Calculate percentage change: positive = growth, negative = decline
    const growthRate = ((currentTotal - previousTotal) / previousTotal) * 100;

    res.json({
      summary: {
        totalSearches: searchStats[0]?.total || 0,
        uniqueUsers: searchStats[0]?.uniqueUsers || 0,
        totalValidations: validationStats[0]?.total || 0,
        avgValidationScore: validationStats[0]?.avgScore || 0,
        growthRate: growthRate.toFixed(1),
      },
      timeSeries,
      categoryDistribution,
      topOpportunities,
      engagementMetrics: engagementMetrics[0] || {},
      range,
      category,
    });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    res.status(500).json({ 
      error: 'Failed to fetch analytics data',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get real-time metrics (for dashboard auto-refresh)
router.get('/realtime', async (req, res) => {
  try {
    const now = new Date();
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);

    const recentActivity = await db
      .select({
        activeUsers: sql<number>`count(distinct user_id)`,
        recentSearches: sql<number>`count(*)`,
      })
      .from(schema.searches)
      .where(
        sql`created_at >= ${fiveMinutesAgo.toISOString()}`
      );

    res.json({
      timestamp: now.toISOString(),
      activeUsers: recentActivity[0]?.activeUsers || 0,
      recentSearches: recentActivity[0]?.recentSearches || 0,
    });
  } catch (error) {
    console.error('Error fetching realtime metrics:', error);
    res.status(500).json({ error: 'Failed to fetch realtime metrics' });
  }
});

export default router;