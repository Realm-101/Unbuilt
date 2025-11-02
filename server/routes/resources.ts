import { Router } from 'express';
import { jwtAuth, optionalJwtAuth } from '../middleware/jwtAuth';
import { apiRateLimit } from '../middleware/rateLimiting';
import { asyncHandler, sendSuccess, AppError } from '../middleware/errorHandler';
import { resourceRepository } from '../repositories/resourceRepository';
import { categoryRepository } from '../repositories/categoryRepository';
import { resourceMatchingService } from '../services/resourceMatchingService';
import { resourceRecommendationEngine } from '../services/resourceRecommendationEngine';
import { resourceCacheService } from '../services/resourceCacheService';
import type { ResourceFilters, PaginationOptions } from '../repositories/resourceRepository';

const router = Router();

/**
 * GET /api/resources
 * List resources with filtering, sorting, and pagination
 * 
 * Query Parameters:
 * - category: number - Filter by category ID
 * - phase: string[] - Filter by phase (research, validation, development, launch)
 * - type: string[] - Filter by resource type (tool, template, guide, video, article)
 * - ideaType: string[] - Filter by idea type (software, physical_product, service, marketplace)
 * - minRating: number - Minimum rating (0-5)
 * - isPremium: boolean - Filter premium resources
 * - search: string - Full-text search query
 * - page: number - Page number (default: 1)
 * - limit: number - Items per page (default: 20, max: 100)
 * - sortBy: string - Sort field (rating, recent, popular, title)
 * - sortOrder: string - Sort direction (asc, desc)
 * 
 * Requirements: 1, 10
 */
router.get(
  '/',
  apiRateLimit,
  optionalJwtAuth,
  asyncHandler(async (req, res) => {
    // Parse filters from query parameters
    const filters: ResourceFilters = {};
    
    if (req.query.category) {
      filters.categoryId = parseInt(req.query.category as string);
    }
    
    if (req.query.categories) {
      const categoryIds = Array.isArray(req.query.categories)
        ? req.query.categories.map(c => parseInt(c as string))
        : [parseInt(req.query.categories as string)];
      filters.categoryIds = categoryIds;
    }
    
    if (req.query.phase) {
      filters.phases = Array.isArray(req.query.phase)
        ? req.query.phase as string[]
        : [req.query.phase as string];
    }
    
    if (req.query.type) {
      filters.resourceTypes = Array.isArray(req.query.type)
        ? req.query.type as string[]
        : [req.query.type as string];
    }
    
    if (req.query.ideaType) {
      filters.ideaTypes = Array.isArray(req.query.ideaType)
        ? req.query.ideaType as string[]
        : [req.query.ideaType as string];
    }
    
    if (req.query.minRating) {
      filters.minRating = parseFloat(req.query.minRating as string);
    }
    
    if (req.query.isPremium !== undefined) {
      filters.isPremium = req.query.isPremium === 'true';
    }
    
    if (req.query.search) {
      filters.searchQuery = req.query.search as string;
    }
    
    // Parse pagination options
    const pagination: PaginationOptions = {
      page: req.query.page ? parseInt(req.query.page as string) : 1,
      limit: req.query.limit ? Math.min(parseInt(req.query.limit as string), 100) : 20,
      sortBy: (req.query.sortBy as any) || 'recent',
      sortOrder: (req.query.sortOrder as 'asc' | 'desc') || 'desc'
    };
    
    // Validate pagination
    if (pagination.page! < 1) {
      throw AppError.createValidationError('Page must be >= 1', 'VAL_INVALID_PAGE');
    }
    
    if (pagination.limit! < 1 || pagination.limit! > 100) {
      throw AppError.createValidationError('Limit must be between 1 and 100', 'VAL_INVALID_LIMIT');
    }
    
    // Check cache for search queries
    let result;
    let fromCache = false;
    
    if (filters.searchQuery) {
      const cached = await resourceCacheService.getCachedSearchResults(
        filters.searchQuery,
        { ...filters, ...pagination }
      );
      
      if (cached) {
        result = cached;
        fromCache = true;
      }
    }
    
    // Get resources from database if not cached
    if (!result) {
      result = await resourceRepository.findAll(filters, pagination);
      
      // Cache search results
      if (filters.searchQuery) {
        await resourceCacheService.cacheSearchResults(
          filters.searchQuery,
          { ...filters, ...pagination },
          result
        );
      }
    }
    
    sendSuccess(res, {
      resources: result.resources,
      pagination: {
        page: result.page,
        pageSize: result.pageSize,
        total: result.total,
        totalPages: result.totalPages
      },
      cached: fromCache
    });
  })
);

/**
 * GET /api/resources/:id
 * Get single resource by ID with related data
 * 
 * Includes:
 * - Resource details
 * - Category information
 * - Tags
 * - Related resources
 * - Rating summary
 * 
 * Also tracks view count
 * 
 * Requirements: 1
 */
router.get(
  '/:id',
  apiRateLimit,
  optionalJwtAuth,
  asyncHandler(async (req, res) => {
    const resourceId = parseInt(req.params.id);
    
    if (isNaN(resourceId)) {
      throw AppError.createValidationError('Invalid resource ID', 'VAL_INVALID_ID');
    }
    
    // Try to get from cache first
    let resource = await resourceCacheService.getCachedResource(resourceId);
    let fromCache = false;
    
    if (!resource) {
      // Get resource with related data from database
      resource = await resourceRepository.findById(resourceId);
      
      if (resource) {
        // Cache the resource
        await resourceCacheService.cacheResource(resource);
      }
    } else {
      fromCache = true;
    }
    
    if (!resource) {
      throw AppError.createNotFoundError('Resource not found', 'RES_NOT_FOUND');
    }
    
    // Check if resource is active
    if (!resource.isActive) {
      throw AppError.createNotFoundError('Resource not found', 'RES_NOT_FOUND');
    }
    
    // Check if user has access to premium resources
    if (resource.isPremium && (!req.user || req.user.plan === 'free')) {
      throw AppError.createAuthorizationError(
        'Premium resource requires Pro or Enterprise plan',
        'RES_PREMIUM_REQUIRED'
      );
    }
    
    // Get related resources
    const relatedResources = await resourceRepository.findSimilar(resourceId, 5);
    
    // Increment view count asynchronously (don't wait)
    resourceRepository.incrementViewCount(resourceId).catch(err => {
      console.error('Failed to increment view count:', err);
    });
    
    // Format rating (stored as integer 0-500, display as 0.0-5.0)
    const formattedResource = {
      ...resource,
      averageRating: resource.averageRating / 100,
      relatedResources: relatedResources.map(r => ({
        ...r,
        averageRating: r.averageRating / 100
      }))
    };
    
    sendSuccess(res, formattedResource);
  })
);

/**
 * GET /api/resources/suggestions/step/:stepId
 * Get resource suggestions for a specific action plan step
 * 
 * Extracts step context and returns top 3 relevant resources
 * Results are cached for 1 hour
 * 
 * Requirements: 1
 */
router.get(
  '/suggestions/step/:stepId',
  apiRateLimit,
  optionalJwtAuth,
  asyncHandler(async (req, res) => {
    const { stepId } = req.params;
    
    // Check cache first
    const cached = await resourceCacheService.getCachedStepSuggestions(stepId);
    if (cached) {
      // Format ratings for cached results
      const formattedCached = cached.map(r => ({
        ...r,
        averageRating: r.averageRating / 100
      }));
      return sendSuccess(res, { resources: formattedCached, cached: true });
    }
    
    // TODO: Fetch step details from database
    // For now, accept step context from query params
    const phase = req.query.phase as string;
    const ideaType = req.query.ideaType as string;
    const description = req.query.description as string;
    
    if (!phase || !description) {
      throw AppError.createValidationError(
        'Phase and description are required',
        'VAL_MISSING_CONTEXT'
      );
    }
    
    // Get suggestions using matching service
    const resources = await resourceMatchingService.matchResourcesToStep(
      stepId,
      description,
      phase,
      ideaType,
      3
    );
    
    // Cache results before formatting
    await resourceCacheService.cacheStepSuggestions(stepId, resources);
    
    // Format ratings
    const formattedResources = resources.map(r => ({
      ...r,
      averageRating: r.averageRating / 100
    }));
    
    sendSuccess(res, { resources: formattedResources, cached: false });
  })
);

/**
 * GET /api/resources/suggestions/analysis/:analysisId
 * Get resource suggestions for an entire analysis
 * 
 * Returns phase-specific recommendations based on analysis context
 * Supports filtering by specific phase
 * 
 * Requirements: 1
 */
router.get(
  '/suggestions/analysis/:analysisId',
  apiRateLimit,
  optionalJwtAuth,
  asyncHandler(async (req, res) => {
    const { analysisId } = req.params;
    const analysisIdNum = parseInt(analysisId);
    const filterPhase = req.query.phase as string | undefined;
    
    // Check cache first
    const cached = await resourceCacheService.getCachedAnalysisSuggestions(
      analysisIdNum,
      filterPhase
    );
    
    if (cached) {
      // Format ratings for cached results
      if (filterPhase) {
        const formattedCached = cached.map((r: any) => ({
          ...r,
          averageRating: r.averageRating / 100
        }));
        return sendSuccess(res, { resources: formattedCached, cached: true });
      } else {
        // Format ratings for all phases
        const formattedCached: Record<string, any[]> = {};
        for (const [phase, resources] of Object.entries(cached)) {
          formattedCached[phase] = (resources as any[]).map(r => ({
            ...r,
            averageRating: r.averageRating / 100
          }));
        }
        return sendSuccess(res, { resources: formattedCached, cached: true });
      }
    }
    
    // TODO: Fetch analysis details from database
    // For now, accept context from query params
    const ideaType = req.query.ideaType as string;
    
    if (!ideaType) {
      throw AppError.createValidationError(
        'Idea type is required',
        'VAL_MISSING_CONTEXT'
      );
    }
    
    const userTier = (req.user?.plan || 'free') as 'free' | 'pro' | 'enterprise';
    
    // If filtering by phase, get resources for that phase only
    if (filterPhase) {
      const resources = await resourceMatchingService.getPhaseResources(
        filterPhase,
        ideaType,
        userTier,
        10
      );
      
      // Cache before formatting
      await resourceCacheService.cacheAnalysisSuggestions(
        analysisIdNum,
        filterPhase,
        resources
      );
      
      const formattedResources = resources.map(r => ({
        ...r,
        averageRating: r.averageRating / 100
      }));
      
      return sendSuccess(res, { resources: formattedResources, cached: false });
    }
    
    // Get resources for all phases
    const phases = ['research', 'validation', 'development', 'launch'];
    const phaseResources: Record<string, any[]> = {};
    
    for (const phase of phases) {
      const resources = await resourceMatchingService.getPhaseResources(
        phase,
        ideaType,
        userTier,
        5
      );
      
      phaseResources[phase] = resources;
    }
    
    // Cache before formatting
    await resourceCacheService.cacheAnalysisSuggestions(
      analysisIdNum,
      undefined,
      phaseResources
    );
    
    // Format ratings
    const formattedPhaseResources: Record<string, any[]> = {};
    for (const [phase, resources] of Object.entries(phaseResources)) {
      formattedPhaseResources[phase] = resources.map(r => ({
        ...r,
        averageRating: r.averageRating / 100
      }));
    }
    
    sendSuccess(res, { resources: formattedPhaseResources, cached: false });
  })
);

/**
 * GET /api/resources/recommendations
 * Get personalized resource recommendations for the authenticated user
 * 
 * Uses collaborative filtering, content-based filtering, and popularity-based strategies
 * to provide personalized suggestions based on user's interaction history and active analyses
 * 
 * Query Parameters:
 * - analysisId: number (optional) - Context from specific analysis
 * - limit: number (optional) - Number of recommendations (default: 10, max: 50)
 * - excludeIds: number[] (optional) - Resource IDs to exclude from recommendations
 * 
 * Returns:
 * - List of recommended resources with relevance scores
 * - Cached results for performance
 * 
 * Requirements: 1, 12
 */
router.get(
  '/recommendations',
  apiRateLimit,
  jwtAuth,
  asyncHandler(async (req, res) => {
    const userId = req.user!.id;
    const analysisId = req.query.analysisId ? parseInt(req.query.analysisId as string) : undefined;
    const limit = req.query.limit ? Math.min(parseInt(req.query.limit as string), 50) : 10;
    
    // Parse exclude IDs
    let excludeResourceIds: number[] = [];
    if (req.query.excludeIds) {
      if (Array.isArray(req.query.excludeIds)) {
        excludeResourceIds = req.query.excludeIds.map(id => parseInt(id as string)).filter(id => !isNaN(id));
      } else {
        const parsed = parseInt(req.query.excludeIds as string);
        if (!isNaN(parsed)) {
          excludeResourceIds = [parsed];
        }
      }
    }
    
    // Validate limit
    if (limit < 1 || limit > 50) {
      throw AppError.createValidationError('Limit must be between 1 and 50', 'VAL_INVALID_LIMIT');
    }
    
    // Validate analysisId if provided
    if (analysisId !== undefined && isNaN(analysisId)) {
      throw AppError.createValidationError('Invalid analysis ID', 'VAL_INVALID_ANALYSIS_ID');
    }
    
    // Check cache first (only if no excludeIds specified)
    let recommendations;
    let fromCache = false;
    
    if (excludeResourceIds.length === 0) {
      const cached = await resourceCacheService.getCachedRecommendations(userId, analysisId);
      if (cached) {
        recommendations = cached.slice(0, limit);
        fromCache = true;
      }
    }
    
    // Get recommendations from engine if not cached
    if (!recommendations) {
      recommendations = await resourceRecommendationEngine.getRecommendations({
        userId,
        analysisId,
        limit,
        excludeResourceIds,
      });
      
      // Cache recommendations (only if no excludeIds)
      if (excludeResourceIds.length === 0) {
        await resourceCacheService.cacheRecommendations(userId, analysisId, recommendations);
      }
    }
    
    // Format ratings (stored as integer 0-500, display as 0.0-5.0)
    const formattedRecommendations = recommendations.map(r => ({
      ...r,
      averageRating: r.averageRating / 100
    }));
    
    sendSuccess(res, {
      recommendations: formattedRecommendations,
      count: formattedRecommendations.length,
      context: {
        userId,
        analysisId: analysisId || null,
        limit
      },
      cached: fromCache
    });
  })
);

/**
 * GET /api/resources/search
 * Full-text search for resources with enhanced features
 * 
 * Query Parameters:
 * - q: string - Search query (required)
 * - category: number - Filter by category ID
 * - categories: number[] - Filter by multiple category IDs
 * - phase: string[] - Filter by phase
 * - type: string[] - Filter by resource type
 * - ideaType: string[] - Filter by idea type
 * - minRating: number - Minimum rating
 * - isPremium: boolean - Filter premium resources
 * - page: number - Page number (default: 1)
 * - limit: number - Items per page (default: 20, max: 100)
 * 
 * Returns:
 * - Resources with highlighted matching keywords
 * - Relevance scores
 * - Pagination metadata
 * 
 * Requirements: 10
 */
router.get(
  '/search',
  apiRateLimit,
  optionalJwtAuth,
  asyncHandler(async (req, res) => {
    const searchQuery = req.query.q as string;
    
    if (!searchQuery || !searchQuery.trim()) {
      throw AppError.createValidationError('Search query is required', 'VAL_MISSING_QUERY');
    }
    
    // Parse filters from query parameters
    const filters: ResourceFilters = {
      searchQuery: searchQuery.trim()
    };
    
    if (req.query.category) {
      filters.categoryId = parseInt(req.query.category as string);
    }
    
    if (req.query.categories) {
      const categoryIds = Array.isArray(req.query.categories)
        ? req.query.categories.map(c => parseInt(c as string))
        : [parseInt(req.query.categories as string)];
      filters.categoryIds = categoryIds;
    }
    
    if (req.query.phase) {
      filters.phases = Array.isArray(req.query.phase)
        ? req.query.phase as string[]
        : [req.query.phase as string];
    }
    
    if (req.query.type) {
      filters.resourceTypes = Array.isArray(req.query.type)
        ? req.query.type as string[]
        : [req.query.type as string];
    }
    
    if (req.query.ideaType) {
      filters.ideaTypes = Array.isArray(req.query.ideaType)
        ? req.query.ideaType as string[]
        : [req.query.ideaType as string];
    }
    
    if (req.query.minRating) {
      filters.minRating = parseFloat(req.query.minRating as string);
    }
    
    if (req.query.isPremium !== undefined) {
      filters.isPremium = req.query.isPremium === 'true';
    }
    
    // Parse pagination options
    const pagination: PaginationOptions = {
      page: req.query.page ? parseInt(req.query.page as string) : 1,
      limit: req.query.limit ? Math.min(parseInt(req.query.limit as string), 100) : 20,
      sortBy: 'recent', // Search results are sorted by relevance by default
      sortOrder: 'desc'
    };
    
    // Validate pagination
    if (pagination.page! < 1) {
      throw AppError.createValidationError('Page must be >= 1', 'VAL_INVALID_PAGE');
    }
    
    if (pagination.limit! < 1 || pagination.limit! > 100) {
      throw AppError.createValidationError('Limit must be between 1 and 100', 'VAL_INVALID_LIMIT');
    }
    
    // Perform search with relevance scoring
    const result = await resourceRepository.searchWithRelevance(filters, pagination);
    
    // Highlight matching keywords in results
    const searchTerms = searchQuery.trim().toLowerCase().split(/\s+/);
    const highlightedResources = result.resources.map(resource => {
      const highlightText = (text: string) => {
        let highlighted = text;
        searchTerms.forEach(term => {
          const regex = new RegExp(`(${term})`, 'gi');
          highlighted = highlighted.replace(regex, '<mark>$1</mark>');
        });
        return highlighted;
      };
      
      return {
        ...resource,
        titleHighlighted: highlightText(resource.title),
        descriptionHighlighted: highlightText(resource.description),
        averageRating: resource.averageRating / 100
      };
    });
    
    sendSuccess(res, {
      resources: highlightedResources,
      query: searchQuery,
      pagination: {
        page: result.page,
        pageSize: result.pageSize,
        total: result.total,
        totalPages: result.totalPages
      }
    });
  })
);

/**
 * GET /api/resources/categories
 * Get hierarchical category tree with resource counts
 * 
 * Returns:
 * - Category hierarchy
 * - Resource count per category (including subcategories)
 * - Category metadata (icon, description)
 * 
 * Requirements: 10
 */
router.get(
  '/categories/tree',
  apiRateLimit,
  asyncHandler(async (req, res) => {
    // Check cache first
    let categoryTree = await resourceCacheService.getCachedCategoryTree();
    let fromCache = false;
    
    if (!categoryTree) {
      // Get from database
      categoryTree = await categoryRepository.getCategoryTree();
      
      // Cache the result
      await resourceCacheService.cacheCategoryTree(categoryTree);
    } else {
      fromCache = true;
    }
    
    sendSuccess(res, { categories: categoryTree, cached: fromCache });
  })
);

/**
 * GET /api/resources/bookmarks
 * Get all bookmarks for the authenticated user
 * 
 * Returns:
 * - List of bookmarks with resource details
 * - Supports filtering by category and tags
 * 
 * Requirements: 7
 */
router.get(
  '/bookmarks',
  apiRateLimit,
  jwtAuth,
  asyncHandler(async (req, res) => {
    const userId = req.user!.id;
    
    // Import bookmark repository
    const { bookmarkRepository } = await import('../repositories/bookmarkRepository');
    
    // Get all bookmarks for user
    const bookmarks = await bookmarkRepository.findByUserId(userId);
    
    // Format ratings (stored as integer 0-500, display as 0.0-5.0)
    const formattedBookmarks = bookmarks.map(bookmark => ({
      ...bookmark,
      resource: bookmark.resource ? {
        ...bookmark.resource,
        averageRating: bookmark.resource.averageRating / 100
      } : undefined
    }));
    
    sendSuccess(res, { bookmarks: formattedBookmarks });
  })
);

/**
 * POST /api/resources/:id/bookmark
 * Add a bookmark for a resource
 * 
 * Body:
 * - notes: string (optional) - Personal notes about the resource
 * - customTags: string[] (optional) - Custom tags for organization
 * 
 * Requirements: 7
 */
router.post(
  '/:id/bookmark',
  apiRateLimit,
  jwtAuth,
  asyncHandler(async (req, res) => {
    const resourceId = parseInt(req.params.id);
    const userId = req.user!.id;
    
    if (isNaN(resourceId)) {
      throw AppError.createValidationError('Invalid resource ID', 'VAL_INVALID_ID');
    }
    
    // Check if resource exists
    const resource = await resourceRepository.findById(resourceId);
    if (!resource) {
      throw AppError.createNotFoundError('Resource not found', 'RES_NOT_FOUND');
    }
    
    // Import bookmark repository
    const { bookmarkRepository } = await import('../repositories/bookmarkRepository');
    
    // Check if bookmark already exists
    const existingBookmark = await bookmarkRepository.findByUserAndResource(userId, resourceId);
    if (existingBookmark) {
      throw AppError.createValidationError('Resource already bookmarked', 'RES_ALREADY_BOOKMARKED');
    }
    
    // Create bookmark
    const bookmark = await bookmarkRepository.create({
      userId,
      resourceId,
      notes: req.body.notes || null,
      customTags: req.body.customTags || [],
    });
    
    // Increment bookmark count on resource
    await resourceRepository.incrementBookmarkCount(resourceId);
    
    sendSuccess(res, { bookmark });
  })
);

/**
 * PATCH /api/resources/bookmarks/:id
 * Update bookmark notes and custom tags
 * 
 * Body:
 * - notes: string (optional) - Updated personal notes
 * - customTags: string[] (optional) - Updated custom tags
 * 
 * Requirements: 7
 */
router.patch(
  '/bookmarks/:id',
  apiRateLimit,
  jwtAuth,
  asyncHandler(async (req, res) => {
    const bookmarkId = parseInt(req.params.id);
    const userId = req.user!.id;
    
    if (isNaN(bookmarkId)) {
      throw AppError.createValidationError('Invalid bookmark ID', 'VAL_INVALID_ID');
    }
    
    // Import bookmark repository
    const { bookmarkRepository } = await import('../repositories/bookmarkRepository');
    
    // Get bookmark to verify ownership
    const bookmark = await bookmarkRepository.findById(bookmarkId);
    if (!bookmark) {
      throw AppError.createNotFoundError('Bookmark not found', 'RES_BOOKMARK_NOT_FOUND');
    }
    
    if (bookmark.userId !== userId) {
      throw AppError.createAuthorizationError(
        'You can only update your own bookmarks',
        'RES_BOOKMARK_UNAUTHORIZED'
      );
    }
    
    // Update bookmark
    const updatedBookmark = await bookmarkRepository.update(bookmarkId, {
      notes: req.body.notes !== undefined ? req.body.notes : undefined,
      customTags: req.body.customTags !== undefined ? req.body.customTags : undefined,
    });
    
    sendSuccess(res, { bookmark: updatedBookmark });
  })
);

/**
 * DELETE /api/resources/:id/bookmark
 * Remove a bookmark for a resource
 * 
 * Requirements: 7
 */
router.delete(
  '/:id/bookmark',
  apiRateLimit,
  jwtAuth,
  asyncHandler(async (req, res) => {
    const resourceId = parseInt(req.params.id);
    const userId = req.user!.id;
    
    if (isNaN(resourceId)) {
      throw AppError.createValidationError('Invalid resource ID', 'VAL_INVALID_ID');
    }
    
    // Import bookmark repository
    const { bookmarkRepository } = await import('../repositories/bookmarkRepository');
    
    // Delete bookmark
    const deleted = await bookmarkRepository.deleteByUserAndResource(userId, resourceId);
    
    if (deleted) {
      // Decrement bookmark count on resource
      await resourceRepository.decrementBookmarkCount(resourceId);
    }
    
    sendSuccess(res, { message: 'Bookmark removed' });
  })
);

/**
 * POST /api/resources/:id/access
 * Track resource access
 * 
 * Logs access with user, resource, analysis, step context
 * Updates resource view count
 * Updates daily analytics aggregates
 * 
 * Body:
 * - analysisId: number (optional) - ID of the analysis context
 * - stepId: string (optional) - ID of the action plan step
 * - accessType: 'view' | 'download' | 'external_link' - Type of access
 * 
 * Requirements: 11
 */
router.post(
  '/:id/access',
  apiRateLimit,
  optionalJwtAuth,
  asyncHandler(async (req, res) => {
    const resourceId = parseInt(req.params.id);
    
    if (isNaN(resourceId)) {
      throw AppError.createValidationError('Invalid resource ID', 'VAL_INVALID_ID');
    }
    
    // Only track if user is authenticated
    if (!req.user) {
      return sendSuccess(res, { message: 'Access tracked (anonymous)' });
    }
    
    const userId = req.user.id;
    const { analysisId, stepId, accessType } = req.body;
    
    // Validate access type
    if (!['view', 'download', 'external_link'].includes(accessType)) {
      throw AppError.createValidationError('Invalid access type', 'VAL_INVALID_ACCESS_TYPE');
    }
    
    // Import access tracking service
    const { resourceAccessTrackingService } = await import('../services/resourceAccessTrackingService');
    
    // Log access using the service
    const result = await resourceAccessTrackingService.logAccess({
      userId,
      resourceId,
      analysisId: analysisId ? parseInt(analysisId) : undefined,
      actionPlanStepId: stepId || undefined,
      accessType,
    });
    
    if (!result.success) {
      throw AppError.createValidationError(
        result.error || 'Failed to track access',
        'RES_ACCESS_TRACKING_FAILED'
      );
    }
    
    sendSuccess(res, { 
      message: 'Access tracked',
      accessId: result.accessRecord?.id
    });
  })
);

/**
 * GET /api/resources/:id/ratings
 * Get all ratings for a resource
 * 
 * Query Parameters:
 * - page: number - Page number (default: 1)
 * - limit: number - Items per page (default: 10, max: 50)
 * - sortBy: 'recent' | 'helpful' - Sort order (default: 'recent')
 * 
 * Returns:
 * - List of ratings with user information
 * - Pagination metadata
 * - Rating statistics
 * 
 * Requirements: 6
 */
router.get(
  '/:id/ratings',
  apiRateLimit,
  optionalJwtAuth,
  asyncHandler(async (req, res) => {
    const resourceId = parseInt(req.params.id);
    
    if (isNaN(resourceId)) {
      throw AppError.createValidationError('Invalid resource ID', 'VAL_INVALID_ID');
    }
    
    // Check if resource exists
    const resource = await resourceRepository.findById(resourceId);
    if (!resource) {
      throw AppError.createNotFoundError('Resource not found', 'RES_NOT_FOUND');
    }
    
    // Parse query parameters
    const page = req.query.page ? parseInt(req.query.page as string) : 1;
    const limit = req.query.limit ? Math.min(parseInt(req.query.limit as string), 50) : 10;
    const sortBy = (req.query.sortBy as 'recent' | 'helpful') || 'recent';
    
    if (page < 1) {
      throw AppError.createValidationError('Page must be >= 1', 'VAL_INVALID_PAGE');
    }
    
    // Import rating repository
    const { ratingRepository } = await import('../repositories/ratingRepository');
    
    // Get all ratings for pagination calculation
    const allRatings = await ratingRepository.findByResourceId(resourceId, sortBy);
    const total = allRatings.length;
    const totalPages = Math.ceil(total / limit);
    
    // Get paginated ratings
    const offset = (page - 1) * limit;
    const ratings = allRatings.slice(offset, offset + limit);
    
    // Get rating statistics
    const stats = await ratingRepository.getStats(resourceId);
    
    // Format ratings (hide email for privacy)
    const formattedRatings = ratings.map(rating => ({
      ...rating,
      user: rating.user ? {
        id: rating.user.id,
        name: rating.user.name || 'Anonymous'
      } : undefined
    }));
    
    sendSuccess(res, {
      ratings: formattedRatings,
      pagination: {
        page,
        pageSize: limit,
        total,
        totalPages
      },
      stats: {
        averageRating: stats.averageRating,
        ratingCount: stats.ratingCount,
        distribution: stats.distribution
      }
    });
  })
);

/**
 * POST /api/resources/:id/ratings
 * Submit a rating for a resource
 * 
 * Body:
 * - rating: number (1-5) - Star rating
 * - review: string (optional) - Written review (max 2000 chars)
 * 
 * Creates a new rating or updates existing rating for the user
 * Updates resource average rating
 * 
 * Requirements: 6
 */
router.post(
  '/:id/ratings',
  apiRateLimit,
  jwtAuth,
  asyncHandler(async (req, res) => {
    const resourceId = parseInt(req.params.id);
    const userId = req.user!.id;
    
    if (isNaN(resourceId)) {
      throw AppError.createValidationError('Invalid resource ID', 'VAL_INVALID_ID');
    }
    
    // Validate rating
    const { rating, review } = req.body;
    
    if (!rating || rating < 1 || rating > 5 || !Number.isInteger(rating)) {
      throw AppError.createValidationError('Rating must be an integer between 1 and 5', 'VAL_INVALID_RATING');
    }
    
    if (review && review.length > 2000) {
      throw AppError.createValidationError('Review must be 2000 characters or less', 'VAL_REVIEW_TOO_LONG');
    }
    
    // Check if resource exists
    const resource = await resourceRepository.findById(resourceId);
    if (!resource) {
      throw AppError.createNotFoundError('Resource not found', 'RES_NOT_FOUND');
    }
    
    // Import rating repository
    const { ratingRepository } = await import('../repositories/ratingRepository');
    
    // Check if user already rated this resource
    const existingRating = await ratingRepository.findByUserAndResource(userId, resourceId);
    
    let result;
    if (existingRating) {
      // Update existing rating
      result = await ratingRepository.update(existingRating.id, {
        rating,
        review: review || null
      });
    } else {
      // Create new rating
      result = await ratingRepository.create({
        userId,
        resourceId,
        rating,
        review: review || null
      });
    }
    
    // Update resource average rating
    const avgRating = await ratingRepository.getAverageRating(resourceId);
    const ratingCount = await ratingRepository.countByResourceId(resourceId);
    
    // Store as integer (0-500 for 0.0-5.0 with 0.1 precision)
    const avgRatingInt = Math.round(avgRating * 100);
    
    await resourceRepository.updateRatingStats(resourceId, avgRatingInt, ratingCount);
    
    sendSuccess(res, {
      rating: result,
      message: existingRating ? 'Rating updated' : 'Rating submitted'
    });
  })
);

/**
 * PATCH /api/resources/ratings/:id
 * Update an existing rating
 * 
 * Body:
 * - rating: number (1-5) (optional) - Updated star rating
 * - review: string (optional) - Updated review
 * 
 * Only the rating owner can update their rating
 * 
 * Requirements: 6
 */
router.patch(
  '/ratings/:id',
  apiRateLimit,
  jwtAuth,
  asyncHandler(async (req, res) => {
    const ratingId = parseInt(req.params.id);
    const userId = req.user!.id;
    
    if (isNaN(ratingId)) {
      throw AppError.createValidationError('Invalid rating ID', 'VAL_INVALID_ID');
    }
    
    // Import rating repository
    const { ratingRepository } = await import('../repositories/ratingRepository');
    
    // Get rating to verify ownership
    const rating = await ratingRepository.findById(ratingId);
    if (!rating) {
      throw AppError.createNotFoundError('Rating not found', 'RES_RATING_NOT_FOUND');
    }
    
    if (rating.userId !== userId) {
      throw AppError.createAuthorizationError(
        'You can only update your own ratings',
        'RES_RATING_UNAUTHORIZED'
      );
    }
    
    // Validate updates
    const { rating: newRating, review } = req.body;
    
    if (newRating !== undefined && (newRating < 1 || newRating > 5 || !Number.isInteger(newRating))) {
      throw AppError.createValidationError('Rating must be an integer between 1 and 5', 'VAL_INVALID_RATING');
    }
    
    if (review !== undefined && review.length > 2000) {
      throw AppError.createValidationError('Review must be 2000 characters or less', 'VAL_REVIEW_TOO_LONG');
    }
    
    // Update rating
    const updatedRating = await ratingRepository.update(ratingId, {
      rating: newRating,
      review: review !== undefined ? review : undefined
    });
    
    // Update resource average rating if rating value changed
    if (newRating !== undefined) {
      const avgRating = await ratingRepository.getAverageRating(rating.resourceId);
      const ratingCount = await ratingRepository.countByResourceId(rating.resourceId);
      const avgRatingInt = Math.round(avgRating * 100);
      
      await resourceRepository.updateRatingStats(rating.resourceId, avgRatingInt, ratingCount);
    }
    
    sendSuccess(res, { rating: updatedRating });
  })
);

/**
 * POST /api/resources/ratings/:id/helpful
 * Mark a rating as helpful
 * 
 * Increments the helpful count for a rating
 * Users can mark any rating as helpful (except their own)
 * 
 * Requirements: 6
 */
router.post(
  '/ratings/:id/helpful',
  apiRateLimit,
  jwtAuth,
  asyncHandler(async (req, res) => {
    const ratingId = parseInt(req.params.id);
    const userId = req.user!.id;
    
    if (isNaN(ratingId)) {
      throw AppError.createValidationError('Invalid rating ID', 'VAL_INVALID_ID');
    }
    
    // Import rating repository
    const { ratingRepository } = await import('../repositories/ratingRepository');
    
    // Get rating
    const rating = await ratingRepository.findById(ratingId);
    if (!rating) {
      throw AppError.createNotFoundError('Rating not found', 'RES_RATING_NOT_FOUND');
    }
    
    // Prevent users from marking their own ratings as helpful
    if (rating.userId === userId) {
      throw AppError.createValidationError(
        'You cannot mark your own rating as helpful',
        'RES_RATING_OWN_HELPFUL'
      );
    }
    
    // Increment helpful count
    await ratingRepository.incrementHelpfulCount(ratingId);
    
    sendSuccess(res, { message: 'Rating marked as helpful' });
  })
);

/**
 * POST /api/resources/contributions
 * Submit a new resource contribution
 * 
 * Body:
 * - title: string - Resource title (5-255 chars)
 * - description: string - Resource description (min 20 chars)
 * - url: string - Resource URL (must be valid URL)
 * - suggestedCategoryId: number (optional) - Suggested category
 * - suggestedTags: string[] (optional) - Suggested tags
 * 
 * Creates a pending contribution that requires admin approval
 * Sends notification to admins
 * 
 * Requirements: 9
 */
router.post(
  '/contributions',
  apiRateLimit,
  jwtAuth,
  asyncHandler(async (req, res) => {
    const userId = req.user!.id;
    
    // Import validation schema
    const { createResourceContributionSchema } = await import('@shared/schema');
    
    // Validate request body
    const validationResult = createResourceContributionSchema.safeParse(req.body);
    
    if (!validationResult.success) {
      throw AppError.createValidationError(
        validationResult.error.errors[0].message,
        'VAL_INVALID_CONTRIBUTION'
      );
    }
    
    const { title, description, url, suggestedCategoryId, suggestedTags } = validationResult.data;
    
    // Verify category exists if provided
    if (suggestedCategoryId) {
      const category = await categoryRepository.findById(suggestedCategoryId);
      if (!category) {
        throw AppError.createValidationError('Invalid category ID', 'VAL_INVALID_CATEGORY');
      }
    }
    
    // Import contribution repository
    const { contributionRepository } = await import('../repositories/contributionRepository');
    
    // Create contribution
    const contribution = await contributionRepository.create({
      userId,
      title,
      description,
      url,
      suggestedCategoryId: suggestedCategoryId || null,
      suggestedTags: suggestedTags || [],
      status: 'pending'
    });
    
    // Send notification to admins
    const { notifyAdminsOfNewContribution } = await import('../services/contributionNotificationService');
    await notifyAdminsOfNewContribution(contribution.id);
    
    console.log(`New resource contribution submitted by user ${userId}: ${title}`);
    
    sendSuccess(res, {
      contribution,
      message: 'Contribution submitted successfully. It will be reviewed by our team.'
    });
  })
);

/**
 * GET /api/resources/contributions/mine
 * Get all contributions submitted by the authenticated user
 * 
 * Returns:
 * - List of contributions with status and admin feedback
 * - Sorted by creation date (newest first)
 * 
 * Requirements: 9
 */
router.get(
  '/contributions/mine',
  apiRateLimit,
  jwtAuth,
  asyncHandler(async (req, res) => {
    const userId = req.user!.id;
    
    // Import contribution repository
    const { contributionRepository } = await import('../repositories/contributionRepository');
    
    // Get user's contributions
    const contributions = await contributionRepository.findByUserId(userId);
    
    sendSuccess(res, { contributions });
  })
);

/**
 * GET /api/resources/contributions/:id
 * Get a specific contribution by ID
 * 
 * Returns:
 * - Contribution details
 * - Status and review information
 * - Admin feedback if rejected
 * 
 * Only accessible by the contribution owner or admins
 * 
 * Requirements: 9
 */
router.get(
  '/contributions/:id',
  apiRateLimit,
  jwtAuth,
  asyncHandler(async (req, res) => {
    const contributionId = parseInt(req.params.id);
    const userId = req.user!.id;
    
    if (isNaN(contributionId)) {
      throw AppError.createValidationError('Invalid contribution ID', 'VAL_INVALID_ID');
    }
    
    // Import contribution repository
    const { contributionRepository } = await import('../repositories/contributionRepository');
    
    // Get contribution
    const contribution = await contributionRepository.findById(contributionId);
    
    if (!contribution) {
      throw AppError.createNotFoundError('Contribution not found', 'RES_CONTRIBUTION_NOT_FOUND');
    }
    
    // Check authorization - only owner or admin can view
    // TODO: Add admin role check when admin middleware is available
    if (contribution.userId !== userId) {
      throw AppError.createAuthorizationError(
        'You can only view your own contributions',
        'RES_CONTRIBUTION_UNAUTHORIZED'
      );
    }
    
    sendSuccess(res, { contribution });
  })
);

/**
 * GET /api/resources/:id/generate-template
 * Generate a pre-filled template from an analysis
 * 
 * Query Parameters:
 * - analysisId: number (required) - The analysis/search ID to use for template data
 * - format: string (optional) - Output format (docx, pdf, gdocs) - default: docx
 * 
 * Returns:
 * - url: Download URL for the generated template
 * - filename: Generated filename
 * - format: Output format
 * - expiresAt: Expiration timestamp
 * 
 * Requirements: 2, 3, 4
 */
router.get(
  '/:id/generate-template',
  apiRateLimit,
  jwtAuth,
  asyncHandler(async (req, res) => {
    const resourceId = parseInt(req.params.id);
    const analysisId = req.query.analysisId ? parseInt(req.query.analysisId as string) : undefined;
    const format = (req.query.format as 'docx' | 'pdf' | 'gdocs') || 'docx';
    
    if (isNaN(resourceId)) {
      throw AppError.createValidationError('Invalid resource ID', 'VAL_INVALID_ID');
    }
    
    if (!analysisId || isNaN(analysisId)) {
      throw AppError.createValidationError('Analysis ID is required', 'VAL_MISSING_ANALYSIS_ID');
    }
    
    // Validate format
    if (!['docx', 'pdf', 'gdocs'].includes(format)) {
      throw AppError.createValidationError('Invalid format. Must be docx, pdf, or gdocs', 'VAL_INVALID_FORMAT');
    }
    
    // Import template generation service
    const { templateGenerationService } = await import('../services/templateGenerationService');
    
    // Verify resource exists and is a template
    const resource = await resourceRepository.findById(resourceId);
    
    if (!resource) {
      throw AppError.createNotFoundError('Resource not found', 'RES_NOT_FOUND');
    }
    
    if (resource.resourceType !== 'template') {
      throw AppError.createValidationError('Resource is not a template', 'RES_NOT_TEMPLATE');
    }
    
    // Generate template
    const generatedTemplate = await templateGenerationService.generateTemplate(
      resourceId,
      analysisId,
      format
    );
    
    if (!generatedTemplate) {
      throw AppError.createNotFoundError('Could not generate template. Analysis may not exist.', 'RES_TEMPLATE_GENERATION_FAILED');
    }
    
    // Track template generation as download access
    const { resourceAccessTrackingService } = await import('../services/resourceAccessTrackingService');
    await resourceAccessTrackingService.logAccess({
      userId: req.user!.id,
      resourceId,
      analysisId,
      accessType: 'download',
    });
    
    sendSuccess(res, {
      template: {
        url: generatedTemplate.url,
        filename: generatedTemplate.filename,
        format: generatedTemplate.format,
        expiresAt: generatedTemplate.expiresAt,
      }
    });
  })
);

/**
 * GET /api/resources/templates/download/:token
 * Download a generated template by token
 * 
 * Returns:
 * - The generated template file
 * 
 * Requirements: 2, 3, 4
 */
router.get(
  '/templates/download/:token',
  apiRateLimit,
  asyncHandler(async (req, res) => {
    const token = req.params.token;
    
    if (!token) {
      throw AppError.createValidationError('Token is required', 'VAL_MISSING_TOKEN');
    }
    
    // Import template generation service
    const { templateGenerationService } = await import('../services/templateGenerationService');
    
    // Get template by token
    const template = templateGenerationService.getTemplateByToken(token);
    
    if (!template) {
      throw AppError.createNotFoundError('Template not found or expired', 'RES_TEMPLATE_NOT_FOUND');
    }
    
    // Get rendered content from variables (stored during generation)
    const renderedContent = (template.variables as any).renderedContent || '';
    
    // Set appropriate content type and headers
    let contentType = 'text/plain';
    if (template.format === 'docx') {
      contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    } else if (template.format === 'pdf') {
      contentType = 'application/pdf';
    } else if (template.format === 'gdocs') {
      contentType = 'text/html';
    }
    
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${template.filename}"`);
    res.send(renderedContent);
  })
);

/**
 * GET /api/resources/templates/available
 * Get available templates for an analysis
 * 
 * Query Parameters:
 * - analysisId: number (required) - The analysis/search ID
 * 
 * Returns:
 * - List of available templates with metadata
 * 
 * Requirements: 2, 3, 4
 */
router.get(
  '/templates/available',
  apiRateLimit,
  jwtAuth,
  asyncHandler(async (req, res) => {
    const analysisId = req.query.analysisId ? parseInt(req.query.analysisId as string) : undefined;
    
    if (!analysisId || isNaN(analysisId)) {
      throw AppError.createValidationError('Analysis ID is required', 'VAL_MISSING_ANALYSIS_ID');
    }
    
    // Import template generation service
    const { templateGenerationService } = await import('../services/templateGenerationService');
    
    // Get available templates
    const templates = await templateGenerationService.getAvailableTemplates(analysisId);
    
    sendSuccess(res, { templates });
  })
);

export default router;
