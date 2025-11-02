import { Router } from 'express';
import { db } from '../db';
import { searches, helpArticles, users } from '@shared/schema';
import { eq, or, ilike, desc, sql } from 'drizzle-orm';
import { requireAuth } from '../middleware/auth';

const router = Router();

interface SearchResult {
  type: 'analysis' | 'resource' | 'help' | 'page';
  id: string;
  title: string;
  description: string;
  path: string;
  metadata?: Record<string, any>;
}

/**
 * GET /api/search/global
 * Global search across analyses, resources, help articles, and pages
 */
router.get('/global', requireAuth, async (req, res) => {
  try {
    const { q, page = '1', pageSize = '20', type } = req.query;
    const userId = req.user!.id;

    if (!q || typeof q !== 'string') {
      return res.json({
        success: true,
        results: [],
        pagination: {
          page: 1,
          pageSize: 20,
          total: 0,
        },
      });
    }

    const searchQuery = q.trim();
    const pageNum = parseInt(page as string, 10);
    const pageSizeNum = parseInt(pageSize as string, 10);
    const offset = (pageNum - 1) * pageSizeNum;

    const results: SearchResult[] = [];

    // Search analyses (if type is not specified or is 'analysis')
    if (!type || type === 'analysis') {
      try {
        const analysisResults = await db
          .select({
            id: searches.id,
            query: searches.query,
            timestamp: searches.timestamp,
            resultsCount: searches.resultsCount,
          })
          .from(searches)
          .where(
            sql`${searches.userId} = ${userId} AND ${searches.query} ILIKE ${`%${searchQuery}%`}`
          )
          .orderBy(desc(searches.timestamp))
          .limit(pageSizeNum)
          .offset(offset);

        results.push(
          ...analysisResults.map((analysis) => ({
            type: 'analysis' as const,
            id: analysis.id.toString(),
            title: analysis.query,
            description: `${analysis.resultsCount} results found`,
            path: `/search-result/${analysis.id}`,
            metadata: {
              resultsCount: analysis.resultsCount,
              timestamp: analysis.timestamp,
            },
          }))
        );
      } catch (error) {
        console.error('Error searching analyses:', error);
      }
    }

    // Search help articles (if type is not specified or is 'help')
    if (!type || type === 'help') {
      try {
        const helpResults = await db
          .select({
            id: helpArticles.id,
            title: helpArticles.title,
            content: helpArticles.content,
            category: helpArticles.category,
          })
          .from(helpArticles)
          .where(
            or(
              ilike(helpArticles.title, `%${searchQuery}%`),
              ilike(helpArticles.content, `%${searchQuery}%`),
              sql`${helpArticles.tags}::text ILIKE ${`%${searchQuery}%`}`
            )
          )
          .limit(pageSizeNum)
          .offset(offset);

        results.push(
          ...helpResults.map((article) => ({
            type: 'help' as const,
            id: article.id.toString(),
            title: article.title,
            description: article.content.substring(0, 150) + '...',
            path: `/help?article=${article.id}`,
            metadata: {
              category: article.category,
            },
          }))
        );
      } catch (error) {
        console.error('Error searching help articles:', error);
      }
    }

    // Calculate relevance score based on query match
    const scoredResults = results.map((result) => {
      let score = 0;
      const lowerQuery = searchQuery.toLowerCase();
      const lowerTitle = result.title.toLowerCase();
      const lowerDesc = result.description.toLowerCase();

      // Exact title match
      if (lowerTitle === lowerQuery) {
        score += 100;
      }
      // Title starts with query
      else if (lowerTitle.startsWith(lowerQuery)) {
        score += 50;
      }
      // Title contains query
      else if (lowerTitle.includes(lowerQuery)) {
        score += 25;
      }

      // Description contains query
      if (lowerDesc.includes(lowerQuery)) {
        score += 10;
      }

      return { ...result, score };
    });

    // Sort by relevance score
    scoredResults.sort((a, b) => b.score - a.score);

    res.json({
      success: true,
      results: scoredResults.slice(0, pageSizeNum),
      pagination: {
        page: pageNum,
        pageSize: pageSizeNum,
        total: scoredResults.length,
      },
    });
  } catch (error) {
    console.error('Global search error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to perform search',
    });
  }
});

export default router;
