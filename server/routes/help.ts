import { Router, Request, Response } from 'express';
import { db } from '../db';
import { helpArticles, type HelpArticle, type InsertHelpArticle } from '@shared/schema';
import { eq, ilike, or, sql, desc, and } from 'drizzle-orm';
import { z } from 'zod';

const router = Router();

// Validation schemas
const feedbackSchema = z.object({
  helpful: z.boolean(),
});

// GET /api/help/articles - Get all help articles
router.get('/articles', async (req: Request, res: Response) => {
  try {
    const { category, limit = '50' } = req.query;
    
    let articles;
    
    if (category && typeof category === 'string') {
      articles = await db
        .select()
        .from(helpArticles)
        .where(eq(helpArticles.category, category))
        .orderBy(desc(helpArticles.viewCount))
        .limit(parseInt(limit as string));
    } else {
      articles = await db
        .select()
        .from(helpArticles)
        .orderBy(desc(helpArticles.viewCount))
        .limit(parseInt(limit as string));
    }
    
    res.json({ success: true, data: articles });
  } catch (error) {
    console.error('Error fetching help articles:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch help articles' 
    });
  }
});

// GET /api/help/articles/:id - Get a specific help article
router.get('/articles/:id', async (req: Request, res: Response) => {
  try {
    const articleId = parseInt(req.params.id);
    
    if (isNaN(articleId)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid article ID' 
      });
    }
    
    const [article] = await db
      .select()
      .from(helpArticles)
      .where(eq(helpArticles.id, articleId));
    
    if (!article) {
      return res.status(404).json({ 
        success: false, 
        error: 'Article not found' 
      });
    }
    
    // Increment view count
    await db
      .update(helpArticles)
      .set({ 
        viewCount: sql`${helpArticles.viewCount} + 1` 
      })
      .where(eq(helpArticles.id, articleId));
    
    res.json({ success: true, data: article });
  } catch (error) {
    console.error('Error fetching help article:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch help article' 
    });
  }
});

// GET /api/help/search - Search help articles with full-text search
router.get('/search', async (req: Request, res: Response) => {
  try {
    const { q, category, limit = '20' } = req.query;
    
    if (!q || typeof q !== 'string') {
      return res.status(400).json({ 
        success: false, 
        error: 'Search query is required' 
      });
    }
    
    const searchTerm = `%${q}%`;
    
    let articles;
    
    if (category && typeof category === 'string') {
      articles = await db
        .select()
        .from(helpArticles)
        .where(
          and(
            eq(helpArticles.category, category),
            or(
              ilike(helpArticles.title, searchTerm),
              ilike(helpArticles.content, searchTerm),
              sql`${helpArticles.tags}::text ILIKE ${searchTerm}`
            )
          )
        )
        .orderBy(desc(helpArticles.viewCount))
        .limit(parseInt(limit as string));
    } else {
      articles = await db
        .select()
        .from(helpArticles)
        .where(
          or(
            ilike(helpArticles.title, searchTerm),
            ilike(helpArticles.content, searchTerm),
            sql`${helpArticles.tags}::text ILIKE ${searchTerm}`
          )
        )
        .orderBy(desc(helpArticles.viewCount))
        .limit(parseInt(limit as string));
    }
    
    res.json({ success: true, data: articles });
  } catch (error) {
    console.error('Error searching help articles:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to search help articles' 
    });
  }
});

// GET /api/help/context/:context - Get help articles for a specific context
router.get('/context/:context', async (req: Request, res: Response) => {
  try {
    const { context } = req.params;
    const { limit = '10' } = req.query;
    
    if (!context) {
      return res.status(400).json({ 
        success: false, 
        error: 'Context is required' 
      });
    }
    
    // Search for articles where the context array contains the specified context
    const articles = await db
      .select()
      .from(helpArticles)
      .where(sql`${helpArticles.context}::jsonb @> ${JSON.stringify([context])}::jsonb`)
      .orderBy(desc(helpArticles.viewCount))
      .limit(parseInt(limit as string));
    
    res.json({ success: true, data: articles });
  } catch (error) {
    console.error('Error fetching contextual help:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch contextual help' 
    });
  }
});

// POST /api/help/articles/:id/feedback - Submit feedback for a help article
router.post('/articles/:id/feedback', async (req: Request, res: Response) => {
  try {
    const articleId = parseInt(req.params.id);
    
    if (isNaN(articleId)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid article ID' 
      });
    }
    
    const validation = feedbackSchema.safeParse(req.body);
    
    if (!validation.success) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid feedback data',
        details: validation.error.errors 
      });
    }
    
    const { helpful } = validation.data;
    
    // Check if article exists
    const [article] = await db
      .select()
      .from(helpArticles)
      .where(eq(helpArticles.id, articleId));
    
    if (!article) {
      return res.status(404).json({ 
        success: false, 
        error: 'Article not found' 
      });
    }
    
    // Increment helpful count if feedback is positive
    if (helpful) {
      await db
        .update(helpArticles)
        .set({ 
          helpfulCount: sql`${helpArticles.helpfulCount} + 1` 
        })
        .where(eq(helpArticles.id, articleId));
    }
    
    res.json({ 
      success: true, 
      message: 'Feedback submitted successfully' 
    });
  } catch (error) {
    console.error('Error submitting feedback:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to submit feedback' 
    });
  }
});

export default router;
