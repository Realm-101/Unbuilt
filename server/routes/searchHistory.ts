import { Router } from 'express';
import { db } from '../db';
import { searches } from '@shared/schema';
import { eq, and, desc } from 'drizzle-orm';
import { requireAuth } from '../middleware/auth';

const router = Router();

// GET /api/search-history - Get user's search history
router.get('/', requireAuth, async (req, res) => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;
    const favoritesOnly = req.query.favorites === 'true';

    // Build query conditions
    const conditions = [eq(searches.userId, userId)];
    if (favoritesOnly) {
      conditions.push(eq(searches.isFavorite, true));
    }

    // Get search history with pagination
    const searchHistory = await db
      .select()
      .from(searches)
      .where(and(...conditions))
      .orderBy(desc(searches.timestamp))
      .limit(limit)
      .offset(offset);

    // Get total count for pagination
    const totalCount = await db
      .select()
      .from(searches)
      .where(and(...conditions));

    res.json({
      searches: searchHistory,
      pagination: {
        page,
        limit,
        total: totalCount.length,
        totalPages: Math.ceil(totalCount.length / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching search history:', error);
    res.status(500).json({ error: 'Failed to fetch search history' });
  }
});

// POST /api/search-history/:id/favorite - Toggle favorite status
router.post('/:id/favorite', requireAuth, async (req, res) => {
  try {
    const userId = req.user?.id;
    const searchId = parseInt(req.params.id);

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (isNaN(searchId)) {
      return res.status(400).json({ error: 'Invalid search ID' });
    }

    // Verify the search belongs to the user
    const search = await db
      .select()
      .from(searches)
      .where(and(eq(searches.id, searchId), eq(searches.userId, userId)))
      .limit(1);

    if (search.length === 0) {
      return res.status(404).json({ error: 'Search not found' });
    }

    // Toggle favorite status
    const newFavoriteStatus = !search[0].isFavorite;
    
    await db
      .update(searches)
      .set({ isFavorite: newFavoriteStatus })
      .where(eq(searches.id, searchId));

    res.json({ 
      success: true, 
      isFavorite: newFavoriteStatus,
      message: newFavoriteStatus ? 'Added to favorites' : 'Removed from favorites'
    });
  } catch (error) {
    console.error('Error toggling favorite:', error);
    res.status(500).json({ error: 'Failed to update favorite status' });
  }
});

// DELETE /api/search-history/:id - Delete a search from history
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const userId = req.user?.id;
    const searchId = parseInt(req.params.id);

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (isNaN(searchId)) {
      return res.status(400).json({ error: 'Invalid search ID' });
    }

    // Verify the search belongs to the user before deleting
    const search = await db
      .select()
      .from(searches)
      .where(and(eq(searches.id, searchId), eq(searches.userId, userId)))
      .limit(1);

    if (search.length === 0) {
      return res.status(404).json({ error: 'Search not found' });
    }

    // Delete the search
    await db
      .delete(searches)
      .where(eq(searches.id, searchId));

    res.json({ 
      success: true, 
      message: 'Search deleted successfully' 
    });
  } catch (error) {
    console.error('Error deleting search:', error);
    res.status(500).json({ error: 'Failed to delete search' });
  }
});

// DELETE /api/search-history - Delete all search history (or all non-favorites)
router.delete('/', requireAuth, async (req, res) => {
  try {
    const userId = req.user?.id;
    const keepFavorites = req.query.keepFavorites === 'true';

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Build delete conditions
    const conditions = [eq(searches.userId, userId)];
    if (keepFavorites) {
      conditions.push(eq(searches.isFavorite, false));
    }

    // Delete searches
    await db
      .delete(searches)
      .where(and(...conditions));

    res.json({ 
      success: true, 
      message: keepFavorites 
        ? 'Non-favorite searches deleted successfully' 
        : 'All search history deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting search history:', error);
    res.status(500).json({ error: 'Failed to delete search history' });
  }
});

export default router;
