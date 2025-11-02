/**
 * Feature Flags API Routes
 * 
 * Admin endpoints for managing feature flags and gradual rollout
 */

import { Router } from 'express';
import { featureFlagService } from '../services/featureFlagService';
import { requireAuth } from '../middleware/auth';
import { requireAdmin } from '../middleware/authorization';
import { logger } from '../config/logger';
import { z } from 'zod';

const router = Router();

// Validation schemas
const upsertFeatureFlagSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  enabled: z.boolean().optional(),
  rolloutPercentage: z.number().min(0).max(100).optional(),
  allowedTiers: z.array(z.string()).optional(),
  allowedUserIds: z.array(z.number()).optional(),
});

const updateRolloutSchema = z.object({
  percentage: z.number().min(0).max(100),
});

const userAccessSchema = z.object({
  userId: z.number().int().positive(),
});

/**
 * GET /api/feature-flags
 * Get all feature flags (Admin only)
 */
router.get('/', requireAuth, requireAdmin, async (req, res) => {
  try {
    const flags = await featureFlagService.getAllFeatureFlags();
    res.json({ success: true, data: flags });
  } catch (error) {
    logger.error('Error fetching feature flags', { error });
    res.status(500).json({ success: false, error: 'Failed to fetch feature flags' });
  }
});

/**
 * GET /api/feature-flags/:name
 * Get specific feature flag (Admin only)
 */
router.get('/:name', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { name } = req.params;
    const flag = await featureFlagService.getFeatureFlag(name);
    
    if (!flag) {
      return res.status(404).json({ success: false, error: 'Feature flag not found' });
    }
    
    res.json({ success: true, data: flag });
  } catch (error) {
    logger.error('Error fetching feature flag', { name: req.params.name, error });
    res.status(500).json({ success: false, error: 'Failed to fetch feature flag' });
  }
});

/**
 * POST /api/feature-flags
 * Create or update feature flag (Admin only)
 */
router.post('/', requireAuth, requireAdmin, async (req, res) => {
  try {
    const validation = upsertFeatureFlagSchema.safeParse(req.body);
    
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request data',
        details: validation.error.errors
      });
    }
    
    const { name, ...config } = validation.data;
    const flag = await featureFlagService.upsertFeatureFlag(name, config);
    
    res.json({ success: true, data: flag });
  } catch (error) {
    logger.error('Error upserting feature flag', { body: req.body, error });
    res.status(500).json({ success: false, error: 'Failed to upsert feature flag' });
  }
});

/**
 * PATCH /api/feature-flags/:name/rollout
 * Update rollout percentage for gradual rollout (Admin only)
 */
router.patch('/:name/rollout', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { name } = req.params;
    const validation = updateRolloutSchema.safeParse(req.body);
    
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request data',
        details: validation.error.errors
      });
    }
    
    await featureFlagService.updateRolloutPercentage(name, validation.data.percentage);
    const flag = await featureFlagService.getFeatureFlag(name);
    
    res.json({ success: true, data: flag });
  } catch (error) {
    logger.error('Error updating rollout percentage', { name: req.params.name, error });
    res.status(500).json({ success: false, error: 'Failed to update rollout percentage' });
  }
});

/**
 * POST /api/feature-flags/:name/users
 * Add user to feature (beta testing) (Admin only)
 */
router.post('/:name/users', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { name } = req.params;
    const validation = userAccessSchema.safeParse(req.body);
    
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request data',
        details: validation.error.errors
      });
    }
    
    await featureFlagService.addUserToFeature(name, validation.data.userId);
    const flag = await featureFlagService.getFeatureFlag(name);
    
    res.json({ success: true, data: flag });
  } catch (error) {
    logger.error('Error adding user to feature', { name: req.params.name, error });
    res.status(500).json({ success: false, error: 'Failed to add user to feature' });
  }
});

/**
 * DELETE /api/feature-flags/:name/users/:userId
 * Remove user from feature (Admin only)
 */
router.delete('/:name/users/:userId', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { name, userId } = req.params;
    const userIdNum = parseInt(userId, 10);
    
    if (isNaN(userIdNum)) {
      return res.status(400).json({ success: false, error: 'Invalid user ID' });
    }
    
    await featureFlagService.removeUserFromFeature(name, userIdNum);
    const flag = await featureFlagService.getFeatureFlag(name);
    
    res.json({ success: true, data: flag });
  } catch (error) {
    logger.error('Error removing user from feature', { name: req.params.name, userId: req.params.userId, error });
    res.status(500).json({ success: false, error: 'Failed to remove user from feature' });
  }
});

/**
 * GET /api/feature-flags/check/:name
 * Check if feature is enabled for current user
 */
router.get('/check/:name', requireAuth, async (req, res) => {
  try {
    const { name } = req.params;
    const userId = req.user?.id;
    const userTier = req.user?.plan;
    
    const check = await featureFlagService.isFeatureEnabled(name, userId, userTier);
    
    res.json({ success: true, data: check });
  } catch (error) {
    logger.error('Error checking feature flag', { name: req.params.name, error });
    res.status(500).json({ success: false, error: 'Failed to check feature flag' });
  }
});

/**
 * GET /api/feature-flags/user/features
 * Get all features enabled for current user
 */
router.get('/user/features', requireAuth, async (req, res) => {
  try {
    const userId = req.user?.id;
    const userTier = req.user?.plan;
    
    if (!userId) {
      return res.status(401).json({ success: false, error: 'User not authenticated' });
    }
    
    const features = await featureFlagService.getUserFeatures(userId, userTier);
    
    res.json({ success: true, data: features });
  } catch (error) {
    logger.error('Error fetching user features', { error });
    res.status(500).json({ success: false, error: 'Failed to fetch user features' });
  }
});

/**
 * POST /api/feature-flags/cache/clear
 * Clear feature flag cache (Admin only)
 */
router.post('/cache/clear', requireAuth, requireAdmin, async (req, res) => {
  try {
    featureFlagService.clearCache();
    res.json({ success: true, message: 'Feature flag cache cleared' });
  } catch (error) {
    logger.error('Error clearing feature flag cache', { error });
    res.status(500).json({ success: false, error: 'Failed to clear cache' });
  }
});

export default router;
