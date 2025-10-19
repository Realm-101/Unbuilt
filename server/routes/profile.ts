import { Router } from 'express';
import { db } from '../db';
import { users } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth';

const router = Router();

// Profile update schema
const updateProfileSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  firstName: z.string().min(1).max(50).optional(),
  lastName: z.string().min(1).max(50).optional(),
  profileImageUrl: z.string().url().optional().or(z.literal('')),
  company: z.string().max(100).optional(),
});

// Get current user profile
router.get('/me', requireAuth, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Not authenticated' });
    }

    const [user] = await db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        firstName: users.firstName,
        lastName: users.lastName,
        profileImageUrl: users.profileImageUrl,
        preferences: users.preferences,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.id, userId));

    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    // Extract company from preferences if it exists
    const preferences = user.preferences as Record<string, any> || {};
    const company = preferences.company || '';

    res.json({
      success: true,
      data: {
        ...user,
        company,
      },
    });
  } catch (error) {
    console.error('Error fetching profile:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch profile' });
  }
});

// Update user profile
router.put('/me', requireAuth, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Not authenticated' });
    }

    const validation = updateProfileSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid profile data',
        details: validation.error.errors,
      });
    }

    const { company, ...profileData } = validation.data;

    // Get current preferences
    const [currentUser] = await db
      .select({ preferences: users.preferences })
      .from(users)
      .where(eq(users.id, userId));

    const currentPreferences = (currentUser?.preferences as Record<string, any>) || {};

    // Update user with new data
    const [updatedUser] = await db
      .update(users)
      .set({
        ...profileData,
        preferences: {
          ...currentPreferences,
          company: company || currentPreferences.company || '',
        },
        updatedAt: new Date().toISOString(),
      })
      .where(eq(users.id, userId))
      .returning({
        id: users.id,
        email: users.email,
        name: users.name,
        firstName: users.firstName,
        lastName: users.lastName,
        profileImageUrl: users.profileImageUrl,
        preferences: users.preferences,
      });

    if (!updatedUser) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const preferences = updatedUser.preferences as Record<string, any> || {};

    res.json({
      success: true,
      data: {
        ...updatedUser,
        company: preferences.company || '',
      },
    });
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ success: false, error: 'Failed to update profile' });
  }
});

export default router;
