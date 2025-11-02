import { Router } from "express";
import { db } from "../db";
import { shareLinks, searches, searchResults } from "@shared/schema";
import { eq, and, desc } from "drizzle-orm";
import { jwtAuth, optionalJwtAuth } from "../middleware/jwtAuth";
import { apiRateLimit } from "../middleware/rateLimiting";
import { asyncHandler, sendSuccess, AppError, ErrorType } from "../middleware/errorHandler";
import { validateIdParam } from "../middleware/validation";
import crypto from "crypto";
import { z } from "zod";

const router = Router();

// Validation schemas
const createShareLinkSchema = z.object({
  expiresAt: z.string().datetime().optional(),
});

const updateShareLinkSchema = z.object({
  expiresAt: z.string().datetime().optional().nullable(),
  active: z.boolean().optional(),
});

/**
 * Generate a secure random token for share links
 */
function generateSecureToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Check if a share link is valid (not expired and active)
 */
function isShareLinkValid(shareLink: typeof shareLinks.$inferSelect): boolean {
  if (!shareLink.active) {
    return false;
  }
  
  if (shareLink.expiresAt) {
    const expirationDate = new Date(shareLink.expiresAt);
    const now = new Date();
    if (now > expirationDate) {
      return false;
    }
  }
  
  return true;
}

/**
 * POST /api/share/:analysisId
 * Create a new share link for an analysis
 * Requirements: 9.2
 */
router.post(
  "/:analysisId",
  apiRateLimit,
  jwtAuth,
  validateIdParam,
  asyncHandler(async (req, res) => {
    const analysisId = parseInt(req.params.analysisId);
    const userId = req.user!.id;
    
    // Validate request body
    const validatedData = createShareLinkSchema.parse(req.body);
    
    // Verify the search/analysis belongs to the user
    const search = await db
      .select()
      .from(searches)
      .where(and(
        eq(searches.id, analysisId),
        eq(searches.userId, userId)
      ))
      .limit(1);
    
    if (search.length === 0) {
      throw AppError.createNotFoundError('Analysis not found or access denied', 'ANALYSIS_NOT_FOUND');
    }
    
    // Generate secure token
    const token = generateSecureToken();
    
    // Create share link
    const [shareLink] = await db
      .insert(shareLinks)
      .values({
        userId,
        searchId: analysisId,
        token,
        expiresAt: validatedData.expiresAt || null,
        viewCount: 0,
        active: true,
      })
      .returning();
    
    // Generate the full share URL
    const shareUrl = `${req.protocol}://${req.get('host')}/share/${token}`;
    
    sendSuccess(res, {
      shareLink,
      shareUrl,
    });
  })
);

/**
 * GET /api/share/links
 * Get all share links created by the current user
 * Requirements: 9.2
 */
router.get(
  "/links",
  apiRateLimit,
  jwtAuth,
  asyncHandler(async (req, res) => {
    const userId = req.user!.id;
    
    // Get all share links for the user with search information
    const userShareLinks = await db
      .select({
        id: shareLinks.id,
        userId: shareLinks.userId,
        searchId: shareLinks.searchId,
        token: shareLinks.token,
        expiresAt: shareLinks.expiresAt,
        viewCount: shareLinks.viewCount,
        active: shareLinks.active,
        createdAt: shareLinks.createdAt,
        lastAccessedAt: shareLinks.lastAccessedAt,
        searchQuery: searches.query,
      })
      .from(shareLinks)
      .innerJoin(searches, eq(shareLinks.searchId, searches.id))
      .where(eq(shareLinks.userId, userId))
      .orderBy(desc(shareLinks.createdAt));
    
    // Add share URLs and validity status
    const linksWithUrls = userShareLinks.map(link => ({
      ...link,
      shareUrl: `${req.protocol}://${req.get('host')}/share/${link.token}`,
      isValid: isShareLinkValid(link),
    }));
    
    sendSuccess(res, linksWithUrls);
  })
);

/**
 * GET /api/share/:token
 * Access a shared analysis (public, no authentication required)
 * Requirements: 9.3, 9.5
 */
router.get(
  "/:token",
  apiRateLimit,
  optionalJwtAuth,
  asyncHandler(async (req, res) => {
    const token = req.params.token;
    
    // Find the share link
    const [shareLink] = await db
      .select()
      .from(shareLinks)
      .where(eq(shareLinks.token, token))
      .limit(1);
    
    if (!shareLink) {
      throw AppError.createNotFoundError('Share link not found', 'SHARE_LINK_NOT_FOUND');
    }
    
    // Check if the link is valid
    if (!isShareLinkValid(shareLink)) {
      throw AppError.createValidationError(
        'This share link has expired or been revoked',
        'SHARE_LINK_INVALID'
      );
    }
    
    // Get the search and its results
    const [search] = await db
      .select()
      .from(searches)
      .where(eq(searches.id, shareLink.searchId))
      .limit(1);
    
    if (!search) {
      throw AppError.createNotFoundError('Analysis not found', 'ANALYSIS_NOT_FOUND');
    }
    
    const results = await db
      .select()
      .from(searchResults)
      .where(eq(searchResults.searchId, search.id));
    
    // Update view count and last accessed timestamp
    await db
      .update(shareLinks)
      .set({
        viewCount: shareLink.viewCount + 1,
        lastAccessedAt: new Date().toISOString(),
      })
      .where(eq(shareLinks.id, shareLink.id));
    
    // Track the view (optional: could add IP tracking here)
    const viewerIp = req.ip || req.headers['x-forwarded-for'] || 'unknown';
    
    sendSuccess(res, {
      search,
      results,
      shareInfo: {
        viewCount: shareLink.viewCount + 1,
        createdAt: shareLink.createdAt,
        expiresAt: shareLink.expiresAt,
      },
      isOwner: req.user?.id === shareLink.userId,
    });
  })
);

/**
 * DELETE /api/share/links/:linkId
 * Revoke a share link
 * Requirements: 9.4
 */
router.delete(
  "/links/:linkId",
  apiRateLimit,
  jwtAuth,
  validateIdParam,
  asyncHandler(async (req, res) => {
    const linkId = parseInt(req.params.linkId);
    const userId = req.user!.id;
    
    // Verify the share link belongs to the user
    const [shareLink] = await db
      .select()
      .from(shareLinks)
      .where(and(
        eq(shareLinks.id, linkId),
        eq(shareLinks.userId, userId)
      ))
      .limit(1);
    
    if (!shareLink) {
      throw AppError.createNotFoundError('Share link not found or access denied', 'SHARE_LINK_NOT_FOUND');
    }
    
    // Delete the share link
    await db
      .delete(shareLinks)
      .where(eq(shareLinks.id, linkId));
    
    sendSuccess(res, {
      message: 'Share link revoked successfully',
    });
  })
);

/**
 * PATCH /api/share/links/:linkId
 * Update a share link (expiration date or active status)
 * Requirements: 9.4
 */
router.patch(
  "/links/:linkId",
  apiRateLimit,
  jwtAuth,
  validateIdParam,
  asyncHandler(async (req, res) => {
    const linkId = parseInt(req.params.linkId);
    const userId = req.user!.id;
    
    // Validate request body
    const validatedData = updateShareLinkSchema.parse(req.body);
    
    // Verify the share link belongs to the user
    const [shareLink] = await db
      .select()
      .from(shareLinks)
      .where(and(
        eq(shareLinks.id, linkId),
        eq(shareLinks.userId, userId)
      ))
      .limit(1);
    
    if (!shareLink) {
      throw AppError.createNotFoundError('Share link not found or access denied', 'SHARE_LINK_NOT_FOUND');
    }
    
    // Update the share link
    const [updatedLink] = await db
      .update(shareLinks)
      .set({
        expiresAt: validatedData.expiresAt !== undefined ? validatedData.expiresAt : shareLink.expiresAt,
        active: validatedData.active !== undefined ? validatedData.active : shareLink.active,
      })
      .where(eq(shareLinks.id, linkId))
      .returning();
    
    sendSuccess(res, {
      shareLink: updatedLink,
      message: 'Share link updated successfully',
    });
  })
);

export default router;
