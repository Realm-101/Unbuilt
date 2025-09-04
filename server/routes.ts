import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupSimpleAuth, isAuthenticated } from "./simpleAuth";
import { analyzeGaps } from "./services/gemini";
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
import aiAssistantRouter from "./routes/aiAssistant";
import { config, configStatus } from "./config";
import Stripe from "stripe";

// Initialize Stripe with centralized config
const stripe = config.stripeSecretKey ? new Stripe(config.stripeSecretKey, {
  apiVersion: "2025-06-30.basil",
}) : null;

// Apply search filters to gap analysis results
function applySearchFilters(gaps: any[], filters: any) {
  if (!filters || !gaps) return gaps;
  
  let filteredGaps = [...gaps];
  
  // Filter by categories
  if (filters.categories && filters.categories.length > 0) {
    filteredGaps = filteredGaps.filter(gap => {
      const gapCategory = gap.category?.toLowerCase() || '';
      return filters.categories.some((cat: string) => 
        gapCategory.includes(cat.toLowerCase())
      );
    });
  }
  
  // Filter by innovation score
  if (filters.innovationScore) {
    filteredGaps = filteredGaps.filter(gap => {
      const score = gap.innovationScore || 50;
      return score >= filters.innovationScore[0] && score <= filters.innovationScore[1];
    });
  }
  
  // Filter by market size
  if (filters.marketSize) {
    filteredGaps = filteredGaps.filter(gap => {
      const size = gap.marketSize || 50;
      return size >= filters.marketSize[0] && size <= filters.marketSize[1];
    });
  }
  
  // Filter by feasibility score
  if (filters.feasibilityScore) {
    filteredGaps = filteredGaps.filter(gap => {
      const score = gap.feasibilityScore || 50;
      return score >= filters.feasibilityScore[0] && score <= filters.feasibilityScore[1];
    });
  }
  
  // Filter by market potential
  if (filters.marketPotential) {
    filteredGaps = filteredGaps.filter(gap => {
      const potential = gap.marketPotential?.toLowerCase() || '';
      return potential.includes(filters.marketPotential.toLowerCase());
    });
  }
  
  // Filter by keywords
  if (filters.keywords && filters.keywords.length > 0) {
    filteredGaps = filteredGaps.filter(gap => {
      const gapText = `${gap.title} ${gap.description} ${gap.opportunity}`.toLowerCase();
      return filters.keywords.some((keyword: string) => 
        gapText.includes(keyword.toLowerCase())
      );
    });
  }
  
  // Sort results
  if (filters.sortBy) {
    filteredGaps.sort((a, b) => {
      let aVal, bVal;
      
      switch (filters.sortBy) {
        case 'innovation':
          aVal = a.innovationScore || 0;
          bVal = b.innovationScore || 0;
          break;
        case 'marketSize':
          aVal = a.marketSize || 0;
          bVal = b.marketSize || 0;
          break;
        case 'feasibility':
          aVal = a.feasibilityScore || 0;
          bVal = b.feasibilityScore || 0;
          break;
        case 'relevance':
        default:
          aVal = a.relevanceScore || 0;
          bVal = b.relevanceScore || 0;
      }
      
      return filters.sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
    });
  }
  
  return filteredGaps;
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Simple auth setup
  await setupSimpleAuth(app);

  // Analytics routes
  app.use('/api/analytics', analyticsRouter);
  
  // AI Assistant routes
  app.use('/api/ai-assistant', aiAssistantRouter);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });



  // Search endpoint - now requires authentication and supports filters
  app.post("/api/search", isAuthenticated, async (req, res) => {
    try {
      const { query, filters } = req.body;
      const parsedQuery = insertSearchSchema.parse({ query });
      const userId = (req.user as any).claims.sub;
      
      // Create search record
      const search = await storage.createSearch({ query: parsedQuery.query, userId });
      
      // Analyze gaps using Gemini with filters context
      let gaps = await analyzeGaps(parsedQuery.query);
      
      // Apply filters if provided
      if (filters) {
        gaps = applySearchFilters(gaps, filters);
      }
      
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
      
      res.json({ search, results });
    } catch (error) {
      console.error('Search error:', error);
      res.status(500).json({ message: 'Failed to perform search' });
    }
  });

  // Get search results
  app.get("/api/search/:id/results", async (req, res) => {
    try {
      const searchId = parseInt(req.params.id);
      const results = await storage.getSearchResults(searchId);
      res.json(results);
    } catch (error) {
      res.status(500).json({ message: 'Failed to get search results' });
    }
  });

  // Get search history
  app.get("/api/searches", async (req, res) => {
    try {
      const searches = await storage.getSearches();
      res.json(searches);
    } catch (error) {
      res.status(500).json({ message: 'Failed to get search history' });
    }
  });

  // Save/unsave result
  app.patch("/api/results/:id/save", async (req, res) => {
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
  app.get("/api/results/saved", async (req, res) => {
    try {
      // For now return empty array until getAllSavedResults is implemented
      res.json([]);
    } catch (error) {
      res.status(500).json({ message: 'Failed to get saved results' });
    }
  });

  // Export results
  app.post("/api/export", exportResults);

  // Send email report
  app.post("/api/email-report", sendEmailReport);

  // Business Plan Generation (xAI powered)
  app.post("/api/business-plan", isAuthenticated, async (req, res) => {
    try {
      const { title, description, category, marketSize } = req.body;
      
      if (!title || !description) {
        return res.status(400).json({ message: 'Title and description are required' });
      }
      
      console.log(`📊 Generating business plan for: ${title}`);
      const businessPlan = await generateBusinessPlan(title, description, category, marketSize);
      
      res.json(businessPlan);
    } catch (error) {
      console.error('Business plan generation error:', error);
      res.status(500).json({ message: 'Failed to generate business plan' });
    }
  });
  
  // Market Research (xAI powered)
  app.post("/api/market-research", isAuthenticated, async (req, res) => {
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
  app.post("/api/action-plan", isAuthenticated, async (req, res) => {
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
  app.post("/api/teams", isAuthenticated, async (req, res) => {
    try {
      const { name, description } = req.body;
      const userId = (req.user as any).claims.sub;
      
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
  app.get("/api/teams", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any).claims.sub;
      const teams = await getTeamsByUser(userId);
      res.json(teams);
    } catch (error) {
      console.error('Get teams error:', error);
      res.status(500).json({ message: 'Failed to get teams' });
    }
  });
  
  // Share an idea
  app.post("/api/ideas/:id/share", isAuthenticated, async (req, res) => {
    try {
      const ideaId = parseInt(req.params.id);
      const userId = (req.user as any).claims.sub;
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
  app.get("/api/shared-ideas", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any).claims.sub;
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
  app.post("/api/ideas/:id/comments", isAuthenticated, async (req, res) => {
    try {
      const ideaId = parseInt(req.params.id);
      const userId = (req.user as any).claims.sub;
      const userEmail = (req.user as any).claims.email || userId;
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
  app.get("/api/ideas/:id/comments", isAuthenticated, async (req, res) => {
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
  app.post("/api/comments/:id/reactions", isAuthenticated, async (req, res) => {
    try {
      const commentId = parseInt(req.params.id);
      const userId = (req.user as any).claims.sub;
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
  app.get("/api/activity-feed", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any).claims.sub;
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
  app.get("/api/ideas/:id/action-plan", isAuthenticated, async (req, res) => {
    try {
      const ideaId = parseInt(req.params.id);
      const userId = (req.user as any).claims.sub;
      
      const idea = await storage.getIdea(ideaId, userId);
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
  app.post("/api/ideas", isAuthenticated, async (req, res) => {
    try {
      const ideaData = validateIdeaSchema.parse(req.body);
      const userId = (req.user as any).claims.sub;
      
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
  app.get("/api/ideas", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any).claims.sub;
      const ideas = await storage.getIdeas(userId);
      res.json(ideas);
    } catch (error) {
      console.error('Get ideas error:', error);
      res.status(500).json({ message: 'Failed to get ideas' });
    }
  });
  
  // Get specific idea with detailed analysis
  app.get("/api/ideas/:id", isAuthenticated, async (req, res) => {
    try {
      const ideaId = parseInt(req.params.id);
      const userId = (req.user as any).claims.sub;
      
      const idea = await storage.getIdea(ideaId, userId);
      if (!idea) {
        return res.status(404).json({ message: 'Idea not found' });
      }
      
      // Cast idea to ValidateIdea interface for financial analysis
      const ideaData = {
        title: idea.title,
        description: idea.description,
        targetMarket: idea.targetMarket,
        businessModel: idea.businessModel,
        category: idea.category as any,
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
  app.put("/api/ideas/:id", isAuthenticated, async (req, res) => {
    try {
      const ideaId = parseInt(req.params.id);
      const userId = (req.user as any).claims.sub;
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
  app.post('/api/create-subscription', isAuthenticated, async (req, res) => {
    try {
      const { plan } = req.body;
      const user = (req as any).user;

      if (!user.claims.email) {
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
          email: user.claims.email,
          name: user.claims.first_name + ' ' + user.claims.last_name,
        });
        
        // Update user with Stripe customer ID
        const currentUser = await storage.getUser(user.claims.sub);
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
      const currentUserForSub = await storage.getUser(user.claims.sub);
      if (currentUserForSub) {
        await storage.upsertUser({
          ...currentUserForSub,
          stripeSubscriptionId: subscription.id,
          plan: plan
        });
      }

      const invoice = subscription.latest_invoice as Stripe.Invoice;
      const paymentIntent = (invoice as any).payment_intent as Stripe.PaymentIntent;

      res.json({
        subscriptionId: subscription.id,
        clientSecret: paymentIntent.client_secret,
      });
    } catch (error: any) {
      console.error('Subscription creation error:', error);
      res.status(400).json({ error: error.message });
    }
  });

  // Activate free trial
  app.post('/api/trial/activate', isAuthenticated, async (req, res) => {
    try {
      const userId = (req as any).user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      
      // Check if user has already used trial (allow demo user to re-activate for testing)
      if (user.trialUsed && user.email !== 'test@example.com') {
        return res.status(400).json({ error: "Free trial has already been used" });
      }
      
      // Set trial expiration to 7 days from now
      const trialExpiration = new Date();
      trialExpiration.setDate(trialExpiration.getDate() + 7);
      
      // Update user to Pro trial
      await storage.upsertUser({
        id: userId,
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
  app.get('/api/subscription-status', isAuthenticated, async (req, res) => {
    try {
      const user = (req as any).user;
      
      if (!user.stripeSubscriptionId || !stripe) {
        return res.json({ status: 'none', plan: 'free' });
      }

      const subscription = await stripe.subscriptions.retrieve(user.stripeSubscriptionId);
      
      res.json({
        status: subscription.status,
        plan: user.plan || 'free',
        currentPeriodEnd: (subscription as any).current_period_end,
      });
    } catch (error) {
      console.error('Subscription status error:', error);
      res.status(500).json({ error: 'Failed to get subscription status' });
    }
  });

  // Export routes
  app.post('/api/export', isAuthenticated, exportResults);
  app.post('/api/send-report', isAuthenticated, sendEmailReport);

  // AI Assistant endpoint
  app.post('/api/assistant', async (req, res) => {
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

  const httpServer = createServer(app);
  return httpServer;
}
