import { Router, Request, Response } from 'express';
import { db } from '../db.js';
import { userPreferences } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { securityLogger } from '../services/securityLogger.js';

const router = Router();

// Validation schemas
const userPreferencesSchema = z.object({
  role: z.enum(['entrepreneur', 'investor', 'product_manager', 'researcher', 'exploring']).nullable().optional(),
  onboardingCompleted: z.boolean().optional(),
  tourProgress: z.array(z.object({
    id: z.string(),
    completed: z.boolean(),
    timestamp: z.string().or(z.date()).optional(),
  })).optional(),
  expandedSections: z.record(z.boolean()).optional(),
  keyboardShortcuts: z.record(z.string()).optional(),
  accessibilitySettings: z.object({
    highContrast: z.boolean(),
    reducedMotion: z.boolean(),
    screenReaderOptimized: z.boolean(),
  }).optional(),
});

const onboardingPatchSchema = z.object({
  completed: z.boolean(),
});

const tourPatchSchema = z.object({
  stepId: z.string(),
  completed: z.boolean(),
});

const notificationPreferencesSchema = z.object({
  resourceNotifications: z.boolean().optional(),
  frequency: z.enum(['daily', 'weekly']).optional(),
  categories: z.array(z.number().int().positive()).optional(),
  contributionUpdates: z.boolean().optional(),
});

// GET /api/user/preferences - Get user preferences
router.get('/preferences', async (req: Request, res: Response) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const userId = req.user.id;

    // Get or create user preferences
    const prefsResult = await db
      .select()
      .from(userPreferences)
      .where(eq(userPreferences.userId, userId))
      .limit(1);
    
    let preferences = prefsResult[0];

    // If no preferences exist, create default ones
    if (!preferences) {
      const [newPreferences] = await db.insert(userPreferences).values({
        userId,
        role: null,
        onboardingCompleted: false,
        tourProgress: [],
        expandedSections: {},
        keyboardShortcuts: {
          'search': 'ctrl+k',
          'dashboard': 'ctrl+h',
          'new-search': 'ctrl+n',
          'export': 'ctrl+e',
          'help': '?',
        },
        accessibilitySettings: {
          highContrast: false,
          reducedMotion: false,
          screenReaderOptimized: false,
        },
        notificationPreferences: {
          resourceNotifications: true,
          frequency: 'weekly',
          categories: [],
          contributionUpdates: true,
        },
      }).returning();

      preferences = newPreferences;
    }

    res.json({
      success: true,
      preferences: {
        role: preferences.role,
        onboardingCompleted: preferences.onboardingCompleted,
        tourProgress: preferences.tourProgress,
        expandedSections: preferences.expandedSections,
        keyboardShortcuts: preferences.keyboardShortcuts,
        accessibilitySettings: preferences.accessibilitySettings,
        notificationPreferences: preferences.notificationPreferences,
      },
    });
  } catch (error) {
    console.error('Error fetching user preferences:', error);
    await securityLogger.logSecurityEvent(
      'API_ACCESS',
      'get_preferences',
      false,
      {
        userId: req.user?.id,
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      },
      error instanceof Error ? error.message : 'Unknown error'
    );
    res.status(500).json({ success: false, error: 'Failed to fetch preferences' });
  }
});

// PUT /api/user/preferences - Update user preferences
router.put('/preferences', async (req: Request, res: Response) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const userId = req.user.id;

    // Validate request body
    const validationResult = userPreferencesSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid preferences data',
        details: validationResult.error.errors,
      });
    }

    const updates = validationResult.data;

    // Check if preferences exist
    const existingResult = await db
      .select()
      .from(userPreferences)
      .where(eq(userPreferences.userId, userId))
      .limit(1);
    
    const existing = existingResult[0];

    let result;
    if (existing) {
      // Update existing preferences
      [result] = await db
        .update(userPreferences)
        .set({
          ...updates,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(userPreferences.userId, userId))
        .returning();
    } else {
      // Create new preferences
      [result] = await db
        .insert(userPreferences)
        .values({
          userId,
          ...updates,
        })
        .returning();
    }

    await securityLogger.logSecurityEvent(
      'DATA_MODIFICATION',
      'update_preferences',
      true,
      {
        userId,
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        metadata: { updatedFields: Object.keys(updates) },
      }
    );

    res.json({
      success: true,
      preferences: {
        role: result.role,
        onboardingCompleted: result.onboardingCompleted,
        tourProgress: result.tourProgress,
        expandedSections: result.expandedSections,
        keyboardShortcuts: result.keyboardShortcuts,
        accessibilitySettings: result.accessibilitySettings,
        notificationPreferences: result.notificationPreferences,
      },
    });
  } catch (error) {
    console.error('Error updating user preferences:', error);
    await securityLogger.logSecurityEvent(
      'API_ACCESS',
      'update_preferences',
      false,
      {
        userId: req.user?.id,
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      },
      error instanceof Error ? error.message : 'Unknown error'
    );
    res.status(500).json({ success: false, error: 'Failed to update preferences' });
  }
});

// PATCH /api/user/preferences/onboarding - Mark onboarding as complete
router.patch('/preferences/onboarding', async (req: Request, res: Response) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const userId = req.user.id;

    // Validate request body
    const validationResult = onboardingPatchSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request data',
        details: validationResult.error.errors,
      });
    }

    const { completed } = validationResult.data;

    // Check if preferences exist
    const existingResult = await db
      .select()
      .from(userPreferences)
      .where(eq(userPreferences.userId, userId))
      .limit(1);
    
    const existing = existingResult[0];

    let result;
    if (existing) {
      [result] = await db
        .update(userPreferences)
        .set({
          onboardingCompleted: completed,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(userPreferences.userId, userId))
        .returning();
    } else {
      [result] = await db
        .insert(userPreferences)
        .values({
          userId,
          onboardingCompleted: completed,
        })
        .returning();
    }

    await securityLogger.logSecurityEvent(
      'DATA_MODIFICATION',
      'complete_onboarding',
      true,
      {
        userId,
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      }
    );

    res.json({
      success: true,
      onboardingCompleted: result.onboardingCompleted,
    });
  } catch (error) {
    console.error('Error updating onboarding status:', error);
    await securityLogger.logSecurityEvent(
      'API_ACCESS',
      'complete_onboarding',
      false,
      {
        userId: req.user?.id,
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      },
      error instanceof Error ? error.message : 'Unknown error'
    );
    res.status(500).json({ success: false, error: 'Failed to update onboarding status' });
  }
});

// PATCH /api/user/preferences/tour - Update tour progress
router.patch('/preferences/tour', async (req: Request, res: Response) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const userId = req.user.id;

    // Validate request body
    const validationResult = tourPatchSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request data',
        details: validationResult.error.errors,
      });
    }

    const { stepId, completed } = validationResult.data;

    // Get existing preferences
    const existingResult = await db
      .select()
      .from(userPreferences)
      .where(eq(userPreferences.userId, userId))
      .limit(1);
    
    const existing = existingResult[0];

    let tourProgress = existing?.tourProgress as any[] || [];
    
    // Update or add tour step
    const stepIndex = tourProgress.findIndex((s: any) => s.id === stepId);
    if (stepIndex >= 0) {
      tourProgress[stepIndex] = {
        id: stepId,
        completed,
        timestamp: new Date().toISOString(),
      };
    } else {
      tourProgress.push({
        id: stepId,
        completed,
        timestamp: new Date().toISOString(),
      });
    }

    let result;
    if (existing) {
      [result] = await db
        .update(userPreferences)
        .set({
          tourProgress,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(userPreferences.userId, userId))
        .returning();
    } else {
      [result] = await db
        .insert(userPreferences)
        .values({
          userId,
          tourProgress,
        })
        .returning();
    }

    res.json({
      success: true,
      tourProgress: result.tourProgress,
    });
  } catch (error) {
    console.error('Error updating tour progress:', error);
    await securityLogger.logSecurityEvent(
      'API_ACCESS',
      'update_tour_progress',
      false,
      {
        userId: req.user?.id,
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      },
      error instanceof Error ? error.message : 'Unknown error'
    );
    res.status(500).json({ success: false, error: 'Failed to update tour progress' });
  }
});

// GET /api/user/preferences/notifications - Get notification preferences
router.get('/preferences/notifications', async (req: Request, res: Response) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const userId = req.user.id;

    const prefsResult = await db
      .select()
      .from(userPreferences)
      .where(eq(userPreferences.userId, userId))
      .limit(1);
    
    const preferences = prefsResult[0];

    const notificationPrefs = preferences?.notificationPreferences || {
      resourceNotifications: true,
      frequency: 'weekly',
      categories: [],
      contributionUpdates: true,
    };

    res.json({
      success: true,
      notificationPreferences: notificationPrefs,
    });
  } catch (error) {
    console.error('Error fetching notification preferences:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch notification preferences' });
  }
});

// PATCH /api/user/preferences/notifications - Update notification preferences
router.patch('/preferences/notifications', async (req: Request, res: Response) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const userId = req.user.id;

    // Validate request body
    const validationResult = notificationPreferencesSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid notification preferences',
        details: validationResult.error.errors,
      });
    }

    const updates = validationResult.data;

    // Get existing preferences
    const existingResult = await db
      .select()
      .from(userPreferences)
      .where(eq(userPreferences.userId, userId))
      .limit(1);
    
    const existing = existingResult[0];

    const currentNotificationPrefs = existing?.notificationPreferences as any || {
      resourceNotifications: true,
      frequency: 'weekly',
      categories: [],
      contributionUpdates: true,
    };

    // Merge updates with existing preferences
    const updatedNotificationPrefs = {
      ...currentNotificationPrefs,
      ...updates,
    };

    let result;
    if (existing) {
      [result] = await db
        .update(userPreferences)
        .set({
          notificationPreferences: updatedNotificationPrefs,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(userPreferences.userId, userId))
        .returning();
    } else {
      [result] = await db
        .insert(userPreferences)
        .values({
          userId,
          notificationPreferences: updatedNotificationPrefs,
        })
        .returning();
    }

    await securityLogger.logSecurityEvent(
      'DATA_MODIFICATION',
      'update_notification_preferences',
      true,
      {
        userId,
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        metadata: { updatedFields: Object.keys(updates) },
      }
    );

    res.json({
      success: true,
      notificationPreferences: result.notificationPreferences,
    });
  } catch (error) {
    console.error('Error updating notification preferences:', error);
    await securityLogger.logSecurityEvent(
      'API_ACCESS',
      'update_notification_preferences',
      false,
      {
        userId: req.user?.id,
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      },
      error instanceof Error ? error.message : 'Unknown error'
    );
    res.status(500).json({ success: false, error: 'Failed to update notification preferences' });
  }
});

export default router;
