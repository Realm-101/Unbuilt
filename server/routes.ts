import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { db } from "./db";
import { users } from "@shared/schema";
import { eq } from "drizzle-orm";
import { jwtAuth, optionalJwtAuth } from "./middleware/jwtAuth";
import { sanitizeInput, validateApiInput } from "./middleware/inputSanitization";
import { validateQueryResults, validateSearchData } from "./middleware/queryValidation";
import type { SearchResultInput, SearchFilters } from "@shared/types";
import { 
  validateApiInput as comprehensiveValidation,
  validateSearch,
  validateBusinessPlan,
  validateMarketResearch,
  validateActionPlan,
  validateIdea,
  validateTeam,
  validateComment,
  validateSubscription,
  validateIdParam,
  validatePagination
} from "./middleware/validation";
import {
  apiRateLimit,
  searchRateLimit,
  aiRateLimit
} from "./middleware/rateLimiting";
import authRoutes from "./routes/auth";
import sessionRoutes from "./routes/sessions";
import securityRoutes from "./routes/security";
import adminRoutes from "./routes/admin";
import securityMonitoringRoutes from "./routes/securityMonitoring";
import securityDashboardRoutes from "./routes/securityDashboard";
import captchaRoutes from "./routes/captcha";
import privacyRoutes from "./routes/privacy";
import { trackSession, monitorSessionSecurity } from "./middleware/sessionManagement";
import { addUserAuthorization, requirePermission } from "./middleware/authorization";
import { validateSearchOwnership, validateIdeaOwnership, enforceUserDataScope } from "./middleware/resourceOwnership";
import { Permission } from "./services/authorizationService";
import { trackSearchMiddleware, trackExportMiddleware, trackPageView } from "./middleware/trackingMiddleware";
import { cacheStatsMiddleware, cacheStatsTracker } from "./middleware/cacheStats";
import { 
  AppError, 
  ErrorType, 
  asyncHandler, 
  sendSuccess, 
  sendError 
} from "./middleware/errorHandler";
import { analyzeGaps, type GapAnalysisResult } from "./services/gemini";
import { generateBusinessPlan, generateMarketResearch } from "./services/xai";
import { generateActionPlan, summarizeActionPlan } from "./services/actionPlanGenerator";
import {
  createTeam,
  inviteTeamMember,
  getTeamsByUser,
  shareIdea,
  getSharedIdeas,
  addComment,
  getComments,
  toggleCommentReaction,
  resolveComment,
  getActivityFeed
} from "./services/collaboration";
import { insertSearchSchema, insertSearchResultSchema, validateIdeaSchema } from "@shared/schema";
import { calculateIdeaScore, assessRisk } from "./services/ideaValidation";
import { getAIValidationInsights, combineValidationScores } from "./services/aiIdeaValidation";
import { generateFinancialModel, calculateBreakEvenAnalysis, generateScenarioAnalysis } from "./services/financialModeling";
import { exportResults, sendEmailReport } from "./routes/export";
import analyticsRouter from "./routes/analytics";
import analyticsAdminRouter from "./routes/analyticsAdmin";
import aiAssistantRouter from "./routes/aiAssistant";
import stripeRouter from "./routes/stripe";
import searchHistoryRouter from "./routes/searchHistory";
import profileRouter from "./routes/profile";
import passwordResetRouter from "./routes/password-reset";
import { config, configStatus } from "./config";
import Stripe from "stripe";

// Initialize Stripe with centralized config
const stripe = config.stripeSecretKey ? new Stripe(config.stripeSecretKey, {
  apiVersion: "2025-06-30.basil",
}) : null;

// Apply search filters to gap analysis results
function applySearchFilters(gaps: GapAnalysisResult[], filters: SearchFilters): GapAnalysisResult[] {
  if (!filters || !gaps) return gaps;
  
  let filteredGaps = [...gaps];
  
  // Filter by categories
  if (filters.categories && filters.categories.length > 0) {
    filteredGaps = filteredGaps.filter(gap => {
      const gapCategory = gap.category?.toLowerCase() || '';
      return filters.categories!.some((cat: string) => 
        gapCategory.includes(cat.toLowerCase())
      );
    });
  }
  
  // Filter by innovation score
  if (filters.innovationScore) {
    filteredGaps = filteredGaps.filter(gap => {
      const score = gap.innovationScore || 50;
      const min = filters.innovationScore!.min ?? 0;
      const max = filters.innovationScore!.max ?? 100;
      return score >= min && score <= max;
    });
  }
  
  // Filter by market size (string values like 'large', 'medium', 'small')
  if (filters.marketSize && filters.marketSize.length > 0) {
    filteredGaps = filteredGaps.filter(gap => {
      const size = gap.marketSize?.toLowerCase() || '';
      return filters.marketSize!.some(s => size.includes(s.toLowerCase()));
    });
  }
  
  // Filter by feasibility (string values like 'high', 'medium', 'low')
  if (filters.feasibilityScore) {
    filteredGaps = filteredGaps.filter(gap => {
      // Convert feasibility string to score for comparison
      const feasibilityMap: Record<string, number> = { high: 80, medium: 50, low: 20 };
      const score = feasibilityMap[gap.feasibility] || 50;
      const min = filters.feasibilityScore!.min ?? 0;
      const max = filters.feasibilityScore!.max ?? 100;
      return score >= min && score <= max;
    });
  }
  
  // Filter by market potential (string array)
  if (filters.marketPotential && filters.marketPotential.length > 0) {
    filteredGaps = filteredGaps.filter(gap => {
      const potential = gap.marketPotential?.toLowerCase() || '';
      return filters.marketPotential!.some(p => potential.includes(p.toLowerCase()));
    });
  }
  
  // Filter by keywords
  if (filters.keywords && filters.keywords.length > 0) {
    filteredGaps = filteredGaps.filter(gap => {
      const gapText = `${gap.title} ${gap.description} ${gap.gapReason}`.toLowerCase();
      return filters.keywords!.some((keyword: string) => 
        gapText.includes(keyword.toLowerCase())
      );
    });
  }
  
  // Sort results
  if (filters.sortBy) {
    filteredGaps.sort((a, b) => {
      let aVal: number, bVal: number;
      
      switch (filters.sortBy) {
        case 'innovation':
          aVal = a.innovationScore || 0;
          bVal = b.innovationScore || 0;
          break;
        case 'marketSize':
          // Convert string to numeric for sorting
          const sizeMap: Record<string, number> = { large: 3, medium: 2, small: 1 };
          aVal = sizeMap[a.marketSize?.toLowerCase() || 'medium'] || 2;
          bVal = sizeMap[b.marketSize?.toLowerCase() || 'medium'] || 2;
          break;
        case 'feasibility':
          const feasMap: Record<string, number> = { high: 3, medium: 2, low: 1 };
          aVal = feasMap[a.feasibility] || 2;
          bVal = feasMap[b.feasibility] || 2;
          break;
        case 'relevance':
        case 'score':
        default:
          aVal = a.confidenceScore || 0;
          bVal = b.confidenceScore || 0;
      }
      
      return filters.sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
    });
  }
  
  return filteredGaps;
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Apply global input sanitization and validation to all API routes
  app.use('/api', apiRateLimit, comprehensiveValidation, sanitizeInput, validateApiInput);
  
  // Apply cache statistics tracking
  app.use('/api', cacheStatsMiddleware);
  
  // Apply session tracking and security monitoring to authenticated routes
  app.use('/api', trackSession, monitorSessionSecurity);
  
  // Add user authorization info to all authenticated requests
  app.use('/api', addUserAuthorization);
  
  // Apply analytics tracking middleware
  app.use('/api', trackSearchMiddleware, trackExportMiddleware);
  
  // JWT Authentication routes
  app.use('/api/auth', authRoutes);
  
  // Session management routes
  app.use('/api/sessions', sessionRoutes);
  
  // Security management routes
  app.use('/api/security', securityRoutes);
  
  // CAPTCHA routes for abuse prevention
  app.use('/api/captcha', captchaRoutes);
  
  // Admin routes (protected with role-based access control)
  app.use('/api/admin', adminRoutes);

  // Security monitoring routes (protected with role-based access control)
  app.use('/api/security-monitoring', securityMonitoringRoutes);

  // Security dashboard routes (protected with role-based access control)
  app.use('/api/security-dashboard', securityDashboardRoutes);

  // Analytics routes
  app.use('/api/analytics', analyticsRouter);
  
  // Analytics admin routes (protected)
  app.use('/api/analytics-admin', analyticsAdminRouter);
  
  // AI Assistant routes
  app.use('/api/ai-assistant', aiAssistantRouter);
  
  // Stripe payment routes
  app.use('/api/stripe', stripeRouter);
  
  // Search history routes
  app.use('/api/search-history', searchHistoryRouter);
  
  // Profile management routes
  app.use('/api/profile', profileRouter);
  
  // Password reset routes
  app.use('/api/password-reset', passwordResetRouter);
  
  // Privacy and data control routes
  app.use('/api/privacy', privacyRoutes);



  // Search endpoint - now requires authentication and supports filters
  app.post("/api/search", searchRateLimit, jwtAuth, requirePermission(Permission.CREATE_IDEA), validateSearch, validateSearchData, asyncHandler(async (req, res) => {
    const { query, filters } = req.body;
    const parsedQuery = insertSearchSchema.parse({ query });
    const userId = req.user!.id;
    
    console.log(`🔍 Starting search for query: "${parsedQuery.query}" by user ${userId}`);
    
    // Generate cache key for this search query
    const { cacheService, CacheNamespaces, CacheTTL } = await import("./services/cache");
    const { log: logMessage } = await import("./vite");
    const cacheKey = cacheService.generateKey(
      CacheNamespaces.SEARCH_RESULTS, 
      `${parsedQuery.query}:${JSON.stringify(filters || {})}`
    );
    
    // Check cache first
    const cachedGaps = await cacheService.get<GapAnalysisResult[]>(cacheKey);
    let gaps: GapAnalysisResult[];
    let cacheHit = false;
    
    if (cachedGaps) {
      gaps = cachedGaps;
      cacheHit = true;
      console.log(`✅ Cache hit for search: ${parsedQuery.query}, found ${gaps.length} gaps`);
      logMessage(`Cache hit for search: ${parsedQuery.query}`);
    } else {
      console.log(`⏳ Cache miss, calling analyzeGaps for: ${parsedQuery.query}`);
      // Analyze gaps using Gemini with filters context
      gaps = await analyzeGaps(parsedQuery.query);
      console.log(`✅ analyzeGaps returned ${gaps.length} gaps`);
      
      // Cache the results for 1 hour
      await cacheService.set(cacheKey, gaps, CacheTTL.LONG);
      logMessage(`Cache miss for search: ${parsedQuery.query}`);
    }
    
    // Apply filters if provided
    if (filters) {
      const beforeFilter = gaps.length;
      gaps = applySearchFilters(gaps, filters);
      console.log(`🔍 Applied filters: ${beforeFilter} gaps -> ${gaps.length} gaps`);
    }
    
    console.log(`📝 Creating search record with ${gaps.length} gaps`);
    
    // Create search record
    const search = await storage.createSearch({ query: parsedQuery.query, userId: String(userId) });
    
    // Create search results
    const results = await Promise.all(
      gaps.map(gap => 
        storage.createSearchResult({
          searchId: search.id,
          title: gap.title,
          description: gap.description,
          category: gap.category,
          feasibility: gap.feasibility,
          marketPotential: gap.marketPotential,
          innovationScore: Math.round(gap.innovationScore), // Ensure integer
          marketSize: gap.marketSize,
          gapReason: gap.gapReason,
        })
      )
    );
    
    console.log(`✅ Created ${results.length} search results for search ID ${search.id}`);
    
    sendSuccess(res, { search, results, _cacheHit: cacheHit });
  }));

  // Get search by ID
  app.get("/api/search/:id", apiRateLimit, jwtAuth, validateIdParam, validateSearchOwnership('read'), validateSearchData, asyncHandler(async (req, res) => {
    const search = req.resource; // Loaded by validateSearchOwnership middleware
    sendSuccess(res, search);
  }));

  // Get search results
  app.get("/api/search/:id/results", apiRateLimit, jwtAuth, validateIdParam, validateSearchOwnership('read'), validateSearchData, asyncHandler(async (req, res) => {
    const searchId = parseInt(req.params.id);
    const results = await storage.getSearchResults(searchId);
    sendSuccess(res, results);
  }));

  // Get search history
  app.get("/api/searches", apiRateLimit, jwtAuth, enforceUserDataScope, validatePagination, validateSearchData, asyncHandler(async (req, res) => {
    const userId = req.query.userId as string;
    const searches = await storage.getSearches(userId);
    sendSuccess(res, searches);
  }));

  // Get cache statistics (admin only)
  app.get("/api/cache/stats", apiRateLimit, jwtAuth, requirePermission(Permission.MANAGE_USERS), asyncHandler(async (req, res) => {
    const stats = cacheStatsTracker.getAllStats();
    const { cacheService } = await import("./services/cache");
    const cacheAvailable = cacheService.isAvailable();
    
    sendSuccess(res, {
      cacheAvailable,
      statistics: stats,
      timestamp: new Date().toISOString()
    });
  }));

  // Clear cache (admin only)
  app.post("/api/cache/clear", apiRateLimit, jwtAuth, requirePermission(Permission.MANAGE_USERS), asyncHandler(async (req, res) => {
    const { cacheService } = await import("./services/cache");
    const { pattern } = req.body;
    
    let cleared = 0;
    if (pattern) {
      cleared = await cacheService.deletePattern(pattern);
    } else {
      await cacheService.flushAll();
      cleared = -1; // Indicates full flush
    }
    
    sendSuccess(res, {
      message: cleared === -1 ? 'All cache cleared' : `Cleared ${cleared} cache entries`,
      cleared
    });
  }));

  // Save/unsave result
  app.patch("/api/results/:id/save", jwtAuth, validateIdParam, validateQueryResults, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { isSaved } = req.body;
      
      const result = await storage.updateSearchResult(id, { isSaved });
      if (!result) {
        return res.status(404).json({ message: 'Result not found' });
      }
      
      res.json(result);
    } catch (error) {
      res.status(500).json({ message: 'Failed to update result' });
    }
  });

  // Get saved results
  app.get("/api/results/saved", apiRateLimit, jwtAuth, validateQueryResults, asyncHandler(async (req, res) => {
    const userId = req.user!.id.toString();
    const savedResults = await storage.getAllSavedResults(userId);
    sendSuccess(res, savedResults);
  }));

  // Export results
  app.post("/api/export", apiRateLimit, jwtAuth, exportResults);

  // Send email report
  app.post("/api/email-report", apiRateLimit, jwtAuth, sendEmailReport);

  // Business Plan Generation (xAI powered)
  app.post("/api/business-plan", aiRateLimit, jwtAuth, validateBusinessPlan, asyncHandler(async (req, res) => {
    const { title, description, category, marketSize } = req.body;
    
    if (!title || !description) {
      throw AppError.createValidationError('Title and description are required', 'VAL_MISSING_FIELDS');
    }
    
    console.log(`📊 Generating business plan for: ${title}`);
    const businessPlan = await generateBusinessPlan(title, description, category, marketSize);
    
    sendSuccess(res, businessPlan);
  }));
  
  // Market Research (xAI powered)
  app.post("/api/market-research", aiRateLimit, jwtAuth, validateMarketResearch, async (req, res) => {
    try {
      const { query } = req.body;
      
      if (!query) {
        return res.status(400).json({ message: 'Query is required' });
      }
      
      console.log(`🔍 Conducting market research for: ${query}`);
      const research = await generateMarketResearch(query);
      
      res.json(research);
    } catch (error) {
      console.error('Market research error:', error);
      res.status(500).json({ message: 'Failed to conduct market research' });
    }
  });
  
  // Action Plan Generation (xAI powered)
  app.post("/api/action-plan", aiRateLimit, jwtAuth, validateActionPlan, async (req, res) => {
    try {
      const { idea, validationScore, marketSize } = req.body;
      
      if (!idea || !idea.title || !idea.description) {
        return res.status(400).json({ message: 'Idea with title and description is required' });
      }
      
      console.log(`📋 Generating action plan for: ${idea.title}`);
      const actionPlan = await generateActionPlan(idea, validationScore, marketSize);
      const summary = summarizeActionPlan(actionPlan);
      
      res.json({ actionPlan, summary });
    } catch (error) {
      console.error('Action plan generation error:', error);
      res.status(500).json({ message: 'Failed to generate action plan' });
    }
  });
  
  // Collaboration Endpoints
  
  // Create a team
  app.post("/api/teams", apiRateLimit, jwtAuth, requirePermission(Permission.CREATE_TEAM), validateTeam, async (req, res) => {
    try {
      const { name, description } = req.body;
      const userId = req.user!.id.toString();
      
      if (!name) {
        return res.status(400).json({ message: 'Team name is required' });
      }
      
      const team = await createTeam(name, description, userId);
      res.json(team);
    } catch (error) {
      console.error('Team creation error:', error);
      res.status(500).json({ message: 'Failed to create team' });
    }
  });
  
  // Get user's teams
  app.get("/api/teams", apiRateLimit, jwtAuth, async (req, res) => {
    try {
      const userId = req.user!.id.toString();
      const teams = await getTeamsByUser(userId);
      res.json(teams);
    } catch (error) {
      console.error('Get teams error:', error);
      res.status(500).json({ message: 'Failed to get teams' });
    }
  });
  
  // Share an idea
  app.post("/api/ideas/:id/share", jwtAuth, validateIdeaOwnership('read'), requirePermission(Permission.SHARE_IDEA), validateIdParam, async (req, res) => {
    try {
      const ideaId = parseInt(req.params.id);
      const userId = req.user!.id.toString();
      const { teamId, sharedWith, permissions, expiresAt } = req.body;
      
      const share = await shareIdea(ideaId, userId, {
        teamId,
        sharedWith,
        permissions,
        expiresAt
      });
      
      res.json(share);
    } catch (error) {
      console.error('Share idea error:', error);
      res.status(500).json({ message: 'Failed to share idea' });
    }
  });
  
  // Get shared ideas
  app.get("/api/shared-ideas", jwtAuth, async (req, res) => {
    try {
      const userId = req.user!.id.toString();
      const userTeams = await getTeamsByUser(userId);
      const teamIds = userTeams.map(t => t.id);
      
      const sharedIdeas = await getSharedIdeas(userId, teamIds);
      res.json(sharedIdeas);
    } catch (error) {
      console.error('Get shared ideas error:', error);
      res.status(500).json({ message: 'Failed to get shared ideas' });
    }
  });
  
  // Add a comment to an idea
  app.post("/api/ideas/:id/comments", jwtAuth, requirePermission(Permission.COMMENT_IDEA), validateIdParam, validateComment, async (req, res) => {
    try {
      const ideaId = parseInt(req.params.id);
      const userId = req.user!.id.toString();
      const userEmail = req.user!.email;
      const { content, parentId } = req.body;
      
      if (!content) {
        return res.status(400).json({ message: 'Comment content is required' });
      }
      
      const comment = await addComment(ideaId, userId, userEmail, content, parentId);
      res.json(comment);
    } catch (error) {
      console.error('Add comment error:', error);
      res.status(500).json({ message: 'Failed to add comment' });
    }
  });
  
  // Get comments for an idea
  app.get("/api/ideas/:id/comments", jwtAuth, validateIdParam, async (req, res) => {
    try {
      const ideaId = parseInt(req.params.id);
      const includeReplies = req.query.includeReplies !== 'false';
      
      const comments = await getComments(ideaId, includeReplies);
      res.json(comments);
    } catch (error) {
      console.error('Get comments error:', error);
      res.status(500).json({ message: 'Failed to get comments' });
    }
  });
  
  // Toggle comment reaction
  app.post("/api/comments/:id/reactions", jwtAuth, validateIdParam, async (req, res) => {
    try {
      const commentId = parseInt(req.params.id);
      const userId = req.user!.id.toString();
      const { reaction } = req.body;
      
      if (!reaction) {
        return res.status(400).json({ message: 'Reaction is required' });
      }
      
      const comment = await toggleCommentReaction(commentId, userId, reaction);
      res.json(comment);
    } catch (error) {
      console.error('Toggle reaction error:', error);
      res.status(500).json({ message: 'Failed to toggle reaction' });
    }
  });
  
  // Get activity feed
  app.get("/api/activity-feed", jwtAuth, async (req, res) => {
    try {
      const userId = req.user!.id.toString();
      const { teamId, ideaId, limit } = req.query;
      
      const activities = await getActivityFeed({
        userId,
        teamId: teamId ? parseInt(teamId as string) : undefined,
        ideaId: ideaId ? parseInt(ideaId as string) : undefined,
        limit: limit ? parseInt(limit as string) : 50
      });
      
      res.json(activities);
    } catch (error) {
      console.error('Get activity feed error:', error);
      res.status(500).json({ message: 'Failed to get activity feed' });
    }
  });
  
  // Get action plan for specific idea
  app.get("/api/ideas/:id/action-plan", aiRateLimit, jwtAuth, validateIdParam, async (req, res) => {
    try {
      const ideaId = parseInt(req.params.id);
      const userId = req.user!.id;
      
      const idea = await storage.getIdea(ideaId, String(userId));
      if (!idea) {
        return res.status(404).json({ message: 'Idea not found' });
      }
      
      console.log(`📋 Generating action plan for idea: ${idea.title}`);
      const actionPlan = await generateActionPlan(
        idea, 
        idea.overallScore,
        undefined // marketSize would come from search results or validation
      );
      const summary = summarizeActionPlan(actionPlan);
      
      res.json({ actionPlan, summary, idea });
    } catch (error) {
      console.error('Action plan retrieval error:', error);
      res.status(500).json({ message: 'Failed to get action plan' });
    }
  });

  // Idea validation and financial modeling routes
  
  // Create and validate new idea with AI insights
  app.post("/api/ideas", aiRateLimit, jwtAuth, requirePermission(Permission.CREATE_IDEA), validateIdea, validateSearchData, async (req, res) => {
    try {
      const ideaData = validateIdeaSchema.parse(req.body);
      const userId = String(req.user!.id);
      
      // Calculate traditional validation scores
      const scoringResult = calculateIdeaScore(ideaData);
      const riskAssessment = assessRisk(ideaData);
      
      // Get AI-powered validation insights
      console.log(`🧠 Getting AI validation insights for: ${ideaData.title}`);
      const aiInsights = await getAIValidationInsights(ideaData);
      
      // Combine traditional and AI scores
      const combinedValidation = combineValidationScores(scoringResult, aiInsights);
      
      // Generate financial model
      const financialModel = generateFinancialModel(ideaData);
      
      // Create idea with calculated scores and financial data
      const idea = await storage.createIdea({
        ...ideaData,
        userId,
        originalityScore: scoringResult.originalityScore,
        credibilityScore: scoringResult.credibilityScore,
        marketGapScore: scoringResult.marketGapScore,
        competitionScore: scoringResult.competitionScore,
        overallScore: scoringResult.overallScore,
        breakEvenMonths: financialModel.summary.breakEvenMonth,
        projectedRoi: financialModel.summary.fiveYearROI,
        financialProjections: financialModel.projections,
        status: 'validated'
      });
      
      res.json({
        idea,
        scoring: scoringResult,
        riskAssessment,
        financialModel,
        aiInsights,
        combinedValidation
      });
    } catch (error) {
      console.error('Idea validation error:', error);
      res.status(500).json({ message: 'Failed to validate idea' });
    }
  });
  
  // Get user's ideas
  app.get("/api/ideas", jwtAuth, enforceUserDataScope, validatePagination, validateSearchData, async (req, res) => {
    try {
      const userId = parseInt(req.query.userId as string);
      const ideas = await storage.getIdeas(userId.toString());
      res.json(ideas);
    } catch (error) {
      console.error('Get ideas error:', error);
      res.status(500).json({ message: 'Failed to get ideas' });
    }
  });
  
  // Get specific idea with detailed analysis
  app.get("/api/ideas/:id", jwtAuth, validateIdeaOwnership('read'), validateIdParam, validateSearchData, async (req, res) => {
    try {
      const idea = req.resource; // Loaded by validateIdeaOwnership middleware
      
      // Cast idea to ValidateIdea interface for financial analysis
      const ideaData = {
        title: idea.title,
        description: idea.description,
        targetMarket: idea.targetMarket,
        businessModel: idea.businessModel,
        category: idea.category,
        initialInvestment: idea.initialInvestment || 0,
        monthlyRevenue: idea.monthlyRevenue || 0,
        monthlyExpenses: idea.monthlyExpenses || 0,
        sourceSearchResultId: idea.sourceSearchResultId || undefined
      };
      
      // Regenerate financial analysis with current data
      const financialModel = generateFinancialModel(ideaData);
      const breakEvenAnalysis = calculateBreakEvenAnalysis(ideaData);
      const scenarioAnalysis = generateScenarioAnalysis(ideaData);
      
      res.json({
        idea,
        financialModel,
        breakEvenAnalysis,
        scenarioAnalysis
      });
    } catch (error) {
      console.error('Get idea error:', error);
      res.status(500).json({ message: 'Failed to get idea' });
    }
  });
  
  // Update idea and recalculate scores
  app.put("/api/ideas/:id", jwtAuth, validateIdeaOwnership('write'), validateIdParam, validateIdea, validateSearchData, async (req, res) => {
    try {
      const ideaId = parseInt(req.params.id);
      const userId = String(req.user!.id);
      const updateData = validateIdeaSchema.parse(req.body);
      
      // Recalculate scores with updated data
      const scoringResult = calculateIdeaScore(updateData);
      const financialModel = generateFinancialModel(updateData);
      
      const updatedIdea = await storage.updateIdea(ideaId, {
        ...updateData,
        originalityScore: scoringResult.originalityScore,
        credibilityScore: scoringResult.credibilityScore,
        marketGapScore: scoringResult.marketGapScore,
        competitionScore: scoringResult.competitionScore,
        overallScore: scoringResult.overallScore,
        breakEvenMonths: financialModel.summary.breakEvenMonth,
        projectedRoi: financialModel.summary.fiveYearROI,
        financialProjections: financialModel.projections,
      }, userId);
      
      if (!updatedIdea) {
        return res.status(404).json({ message: 'Idea not found' });
      }
      
      res.json({
        idea: updatedIdea,
        scoring: scoringResult,
        financialModel
      });
    } catch (error) {
      console.error('Update idea error:', error);
      res.status(500).json({ message: 'Failed to update idea' });
    }
  });

  // Stripe subscription routes
  app.post('/api/create-subscription', jwtAuth, validateSubscription, async (req, res) => {
    try {
      const { plan } = req.body;
      const user = req.user!;

      if (!user.email) {
        return res.status(400).json({ error: 'User email required' });
      }

      // Define price based on plan (you'll need to create these in Stripe Dashboard)
      const priceMap = {
        pro: 'price_pro_monthly',
        enterprise: 'price_enterprise_monthly'
      };

      if (!stripe) {
        return res.status(503).json({ error: 'Payment processing unavailable' });
      }

      // Create or get Stripe customer
      let customer;
      if (user.stripeCustomerId) {
        customer = await stripe.customers.retrieve(user.stripeCustomerId);
      } else {
        customer = await stripe.customers.create({
          email: user.email,
          name: user.email, // Use email as name for now
        });
        
        // Update user with Stripe customer ID
        const currentUser = await storage.getUser(user.id.toString());
        if (currentUser) {
          await storage.upsertUser({ 
            ...currentUser,
            stripeCustomerId: customer.id 
          });
        }
      }

      // Create subscription
      const subscription = await stripe.subscriptions.create({
        customer: customer.id,
        items: [{
          price: priceMap[plan as keyof typeof priceMap] || priceMap.pro,
        }],
        payment_behavior: 'default_incomplete',
        expand: ['latest_invoice.payment_intent'],
      });

      // Update user with subscription info
      const currentUserForSub = await storage.getUser(user.id.toString());
      if (currentUserForSub) {
        await storage.upsertUser({
          ...currentUserForSub,
          stripeSubscriptionId: subscription.id,
          plan: plan
        });
      }

      const invoice = subscription.latest_invoice as Stripe.Invoice;
      // Stripe's Invoice type doesn't include payment_intent in the type definition when expanded
      // but it's present at runtime when the invoice is expanded. This is a known Stripe SDK limitation.
      const paymentIntent = (invoice as unknown as { payment_intent: Stripe.PaymentIntent }).payment_intent;

      res.json({
        subscriptionId: subscription.id,
        clientSecret: paymentIntent.client_secret,
      });
    } catch (error: unknown) {
      console.error('Subscription creation error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      res.status(400).json({ error: errorMessage });
    }
  });

  // Activate free trial
  app.post('/api/trial/activate', jwtAuth, async (req, res) => {
    try {
      const userId = req.user!.id.toString();
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      
      // Check if user has already used trial (allow demo user to re-activate for testing)
      const { demoUserService } = await import("./services/demoUser");
      if (user.trialUsed && !demoUserService.isDemoUser(user.email)) {
        return res.status(400).json({ error: "Free trial has already been used" });
      }
      
      // Set trial expiration to 7 days from now
      const trialExpiration = new Date();
      trialExpiration.setDate(trialExpiration.getDate() + 7);
      
      // Update user to Pro trial
      await storage.upsertUser({
        id: parseInt(userId),
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        profileImageUrl: user.profileImageUrl,
        plan: 'pro',
        trialUsed: true,
        trialExpiration: trialExpiration.toISOString(),
        subscriptionStatus: 'trialing'
      });
      
      res.json({ 
        success: true, 
        message: 'Free trial activated successfully',
        trialExpiration: trialExpiration.toISOString()
      });
    } catch (error) {
      console.error('Trial activation error:', error);
      res.status(500).json({ error: 'Failed to activate trial' });
    }
  });

  // Check subscription status
  app.get('/api/subscription-status', jwtAuth, async (req, res) => {
    try {
      const user = req.user!;
      
      if (!user.stripeSubscriptionId || !stripe) {
        return res.json({ status: 'none', plan: 'free' });
      }

      const subscription = await stripe.subscriptions.retrieve(user.stripeSubscriptionId);
      
      res.json({
        status: subscription.status,
        plan: user.plan ?? 'free',
        // Stripe SDK returns current_period_end as a number (Unix timestamp)
        currentPeriodEnd: 'current_period_end' in subscription ? subscription.current_period_end : undefined,
      });
    } catch (error) {
      console.error('Subscription status error:', error);
      res.status(500).json({ error: 'Failed to get subscription status' });
    }
  });

  // Export routes
  app.post('/api/export', jwtAuth, exportResults);
  app.post('/api/send-report', jwtAuth, sendEmailReport);

  // AI Assistant endpoint
  app.post('/api/assistant', jwtAuth, async (req, res) => {
    try {
      const { message } = req.body;
      
      if (!message) {
        return res.status(400).json({ error: 'Message is required' });
      }

      // Intelligent fallback responses based on documentation
      const fallbackResponses = {
        'market gaps': 'To find market gaps, use our search feature on the home page. Enter a specific industry or problem area (e.g., "sustainable packaging for e-commerce"). Our AI will analyze real-time data to identify unmet needs and opportunities.',
        'pro plan': 'The Pro plan ($29/month) includes unlimited searches, advanced AI features, business plan generation, API access, and priority support. It\'s perfect for serious entrepreneurs and innovators.',
        'validation': 'Our validation system scores ideas from 0-100 across multiple dimensions: innovation, market potential, feasibility, and competition. Scores above 80 indicate excellent opportunities worth pursuing.',
        'export': 'Pro users can export all research, validation results, and business plans in PDF, HTML, and JSON formats. Free users can export basic search results.',
        'get started': 'To get started: 1) Create your account, 2) Enter an industry or problem in the search bar, 3) Review the AI-generated insights, 4) Save promising ideas and generate action plans.',
        'api': 'API access is available for Pro and Enterprise plans. You\'ll receive an API key to access endpoints for search, validation, and research. Base URL: https://api.unbuilt.io/v1',
        'pricing': 'We offer three plans: Free ($0/month) with 5 searches, Pro ($29/month) with unlimited features, and Enterprise (custom pricing) with dedicated support.',
        'ai models': 'We use three specialized AI models: Perplexity for real-time discovery, xAI Grok for business planning, and Gemini as a reliable fallback. This ensures the best results for each type of analysis.',
        'documentation': 'You can find comprehensive documentation by clicking the "Documentation" link in the navigation menu. It covers getting started, gap discovery, idea validation, market research, collaboration features, AI capabilities, API access, billing, and security.'
      };

      // Simple keyword matching for demo responses
      const lowerMessage = message.toLowerCase();
      let response = "I can help you with questions about Unbuilt's features, pricing, and how to get started. What would you like to know?";
      
      for (const [keyword, answer] of Object.entries(fallbackResponses)) {
        if (lowerMessage.includes(keyword)) {
          response = answer;
          break;
        }
      }
      
      // General help response
      if (lowerMessage.includes('help') || lowerMessage.includes('how')) {
        response = "I can help you with:\n• Finding market gaps and opportunities\n• Understanding idea validation scores\n• Using our AI features\n• Pricing and plan information\n• Getting started with Unbuilt\n\nWhat would you like to know more about?";
      }
      
      res.json({ response });
    } catch (error) {
      console.error('Assistant error:', error);
      
      res.json({ 
        response: "I'm here to help! You can ask me about:\n• How to find market gaps\n• Understanding validation scores\n• Pricing plans\n• Getting started with Unbuilt\n\nWhat would you like to know?" 
      });
    }
  });

  // DEVELOPMENT ONLY: Reset search count for testing
  if (process.env.NODE_ENV !== 'production') {
    app.post("/api/dev/reset-searches", jwtAuth, asyncHandler(async (req, res) => {
      const userId = req.user!.id;
      await db.update(users)
        .set({ searchCount: 0, lastResetDate: new Date().toISOString() })
        .where(eq(users.id, userId));
      sendSuccess(res, { message: "Search count reset successfully" });
    }));
  }

  const httpServer = createServer(app);
  return httpServer;
}
