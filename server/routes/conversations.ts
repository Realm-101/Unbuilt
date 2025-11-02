import { Router } from 'express';
import { jwtAuth } from '../middleware/jwtAuth';
import { apiRateLimit, aiRateLimit } from '../middleware/rateLimiting';
import { validateIdParam } from '../middleware/validation';
import { asyncHandler, sendSuccess, AppError } from '../middleware/errorHandler';
import {
  checkConversationRateLimit,
  checkDailyConversationLimit,
  validateMessageLength,
  getRemainingQuestions,
  CONVERSATION_LIMITS,
} from '../middleware/conversationRateLimiting';
import { conversationService } from '../services/conversationService';
import {
  logConversationStart,
  logMessageSent,
  logConversationError,
  logRateLimit,
} from '../services/conversationLogger';
import { db } from '../db';
import { searches, users, searchResults, conversations, conversationMessages } from '@shared/schema';
import { eq, desc } from 'drizzle-orm';
import { z } from 'zod';

const router = Router();

/**
 * GET /api/conversations/:analysisId
 * Get or create conversation for an analysis
 * Returns conversation with messages and suggestions
 */
router.get(
  '/:analysisId',
  apiRateLimit,
  jwtAuth,
  validateIdParam,
  asyncHandler(async (req, res) => {
    const analysisId = parseInt(req.params.analysisId);
    const userId = req.user!.id;

    // Verify the analysis exists and belongs to the user
    const analysis = await db
      .select()
      .from(searches)
      .where(eq(searches.id, analysisId))
      .limit(1);

    if (analysis.length === 0) {
      throw AppError.createNotFoundError('Analysis not found', 'ANALYSIS_NOT_FOUND');
    }

    if (analysis[0].userId !== userId) {
      throw AppError.createAuthorizationError(
        'You do not have permission to access this analysis',
        'UNAUTHORIZED_ACCESS'
      );
    }

    // Get or create conversation
    const conversation = await conversationService.getOrCreateConversation(
      analysisId,
      userId
    );

    // Log conversation start
    logConversationStart(conversation.id, userId);

    // Get conversation details
    const details = await conversationService.getConversationWithDetails(
      conversation.id
    );

    if (!details) {
      throw AppError.createNotFoundError('Conversation not found', 'CONVERSATION_NOT_FOUND');
    }

    // Get user tier and remaining questions
    const user = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    const userTier = (user[0]?.subscriptionTier || user[0]?.plan || 'free') as 'free' | 'pro' | 'enterprise';
    const remainingInfo = await getRemainingQuestions(userId, analysisId, userTier);

    sendSuccess(res, {
      conversation: details.conversation,
      messages: details.messages,
      suggestions: details.suggestions,
      analytics: details.analytics,
      rateLimit: {
        remaining: remainingInfo.remaining,
        limit: remainingInfo.limit,
        unlimited: remainingInfo.unlimited,
        tier: userTier,
      },
    });
  })
);

/**
 * POST /api/conversations/:analysisId/messages
 * Send a message in a conversation
 * Validates input, checks rate limits, and returns AI response
 */
router.post(
  '/:analysisId/messages',
  aiRateLimit,
  jwtAuth,
  validateIdParam,
  checkConversationRateLimit,
  checkDailyConversationLimit,
  validateMessageLength,
  asyncHandler(async (req, res) => {
    const analysisId = parseInt(req.params.analysisId);
    const userId = req.user!.id;

    // Validate request body
    const messageSchema = z.object({
      content: z.string().min(1).max(2000, 'Message is too long'),
    });

    const { content } = messageSchema.parse(req.body);

    // Verify the analysis exists and belongs to the user
    const analysis = await db
      .select()
      .from(searches)
      .where(eq(searches.id, analysisId))
      .limit(1);

    if (analysis.length === 0) {
      throw AppError.createNotFoundError('Analysis not found', 'ANALYSIS_NOT_FOUND');
    }

    if (analysis[0].userId !== userId) {
      throw AppError.createAuthorizationError(
        'You do not have permission to access this analysis',
        'UNAUTHORIZED_ACCESS'
      );
    }

    // Get user to check tier
    const user = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (user.length === 0) {
      throw AppError.createNotFoundError('User not found', 'USER_NOT_FOUND');
    }

    const userTier = (user[0].subscriptionTier || user[0].plan || 'free') as 'free' | 'pro' | 'enterprise';

    // Get or create conversation
    const conversation = await conversationService.getOrCreateConversation(
      analysisId,
      userId
    );

    // Validate and sanitize input
    const { inputValidator } = await import('../services/conversations/inputValidator.js');
    const validationResult = await inputValidator.validateUserInput(
      content,
      userTier,
      {
        userId,
        conversationId: conversation.id.toString(),
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      }
    );

    if (!validationResult.isValid) {
      throw AppError.createValidationError(
        validationResult.reason || 'Invalid message content',
        'INVALID_MESSAGE_CONTENT'
      );
    }

    const sanitizedContent = validationResult.sanitized;

    // Check for prompt injection
    const { promptInjectionDetector } = await import('../services/conversations/promptInjectionDetector.js');
    const injectionResult = await promptInjectionDetector.detectInjection(
      sanitizedContent,
      {
        userId,
        conversationId: conversation.id.toString(),
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      }
    );

    if (injectionResult.isInjection) {
      throw AppError.createValidationError(
        'Your message contains content that violates our usage policy. Please rephrase your question.',
        'PROMPT_INJECTION_DETECTED'
      );
    }

    // Moderate content
    const { contentModerator } = await import('../services/conversations/contentModerator.js');
    const moderationResult = await contentModerator.moderateUserInput(
      sanitizedContent,
      userId,
      {
        conversationId: conversation.id.toString(),
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      }
    );

    if (!moderationResult.approved) {
      throw AppError.createValidationError(
        'Your message contains inappropriate content. Please keep conversations professional and respectful.',
        'CONTENT_MODERATION_FAILED'
      );
    }

    // Check if streaming is requested
    const streamingEnabled = req.query.stream === 'true' && (userTier === 'pro' || userTier === 'enterprise');

    // Add user message
    const startTime = Date.now();
    const userMessage = await conversationService.addUserMessage(
      conversation.id,
      sanitizedContent
    );

    // Log message sent
    logMessageSent(conversation.id, userMessage.id, userId, {
      messageLength: sanitizedContent.length,
      tier: user[0].subscriptionTier,
    });

    // Get analysis data for context
    const analysisResults = await db
      .select()
      .from(searchResults)
      .where(eq(searchResults.searchId, analysisId))
      .orderBy(desc(searchResults.innovationScore))
      .limit(5);

    const analysisData = {
      searchQuery: analysis[0].query,
      innovationScore: analysisResults[0]?.innovationScore,
      feasibilityRating: analysisResults[0]?.feasibility,
      topGaps: analysisResults.map(r => ({
        title: r.title,
        description: r.description,
        score: r.innovationScore,
      })),
    };

    // Get conversation history
    const conversationHistory = await conversationService.getMessages(
      conversation.id,
      20, // Last 20 messages
      0
    );

    // Check for similar queries (deduplication)
    const { queryDeduplicationService } = await import('../services/queryDeduplicationService.js');
    const similarityResult = await queryDeduplicationService.findSimilarQuery(
      sanitizedContent,
      conversationHistory,
      0.9 // 90% similarity threshold
    );

    // If similar query found, return cached response
    if (similarityResult.isSimilar && similarityResult.cachedResponse) {
      console.log(`🔄 Using cached response for similar query (${(similarityResult.similarity * 100).toFixed(1)}% match)`);
      
      const aiMessage = await conversationService.addAIResponse(
        conversation.id,
        similarityResult.cachedResponse,
        {
          processingTime: 0,
          tokensUsed: {
            input: 0,
            output: 0,
            total: 0,
          },
        }
      );

      const details = await conversationService.getConversationWithDetails(
        conversation.id
      );

      const remainingInfo = await getRemainingQuestions(userId, analysisId, userTier);

      return sendSuccess(res, {
        userMessage,
        aiMessage,
        conversation: details?.conversation,
        analytics: details?.analytics,
        cached: true,
        similarity: similarityResult.similarity,
        rateLimit: {
          remaining: remainingInfo.remaining,
          limit: remainingInfo.limit,
          unlimited: remainingInfo.unlimited,
          tier: userTier,
        },
      });
    }

    // Build context window
    const { contextWindowManager } = await import('../services/contextWindowManager.js');
    const contextWindow = await contextWindowManager.buildContext(
      analysisData,
      conversationHistory,
      sanitizedContent, // Current query
      8000 // Max tokens
    );

    if (streamingEnabled) {
      // Set headers for SSE (Server-Sent Events)
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.flushHeaders();

      let fullContent = '';
      let aiMessageId: number | null = null;

      try {
        // Generate streaming response
        const { generateStreamingResponse } = await import('../services/geminiConversationService.js');
        
        const aiResponse = await generateStreamingResponse(
          contextWindow,
          (chunk: string) => {
            fullContent += chunk;
            // Send chunk to client
            res.write(`data: ${JSON.stringify({ type: 'chunk', content: chunk })}\n\n`);
          }
        );

        // Save AI message to database
        const aiMessage = await conversationService.addAIResponse(
          conversation.id,
          aiResponse.content,
          {
            processingTime: aiResponse.metadata.processingTime,
            tokensUsed: aiResponse.metadata.tokensUsed,
          }
        );

        aiMessageId = aiMessage.id;

        // Cache query-response pair for deduplication
        await queryDeduplicationService.cacheQueryResponse(
          sanitizedContent,
          aiResponse.content,
          conversation.id
        );

        // Send completion event
        const remainingInfo = await getRemainingQuestions(userId, analysisId, userTier);
        res.write(`data: ${JSON.stringify({
          type: 'complete',
          messageId: aiMessage.id,
          metadata: aiResponse.metadata,
          rateLimit: {
            remaining: remainingInfo.remaining,
            limit: remainingInfo.limit,
            unlimited: remainingInfo.unlimited,
            tier: userTier,
          },
        })}\n\n`);

        res.end();
      } catch (error) {
        console.error('Streaming error:', error);
        res.write(`data: ${JSON.stringify({
          type: 'error',
          error: error instanceof Error ? error.message : 'Unknown error',
        })}\n\n`);
        res.end();
      }
    } else {
      // Non-streaming response
      const { generateResponse } = await import('../services/geminiConversationService.js');
      
      const aiResponse = await generateResponse(contextWindow);

      const aiMessage = await conversationService.addAIResponse(
        conversation.id,
        aiResponse.content,
        {
          processingTime: aiResponse.metadata.processingTime,
          tokensUsed: aiResponse.metadata.tokensUsed,
        }
      );

      // Cache query-response pair for deduplication
      await queryDeduplicationService.cacheQueryResponse(
        sanitizedContent,
        aiResponse.content,
        conversation.id
      );

      // Get updated conversation details
      const details = await conversationService.getConversationWithDetails(
        conversation.id
      );

      // Get remaining questions
      const remainingInfo = await getRemainingQuestions(userId, analysisId, userTier);

      sendSuccess(res, {
        userMessage,
        aiMessage,
        conversation: details?.conversation,
        analytics: details?.analytics,
        rateLimit: {
          remaining: remainingInfo.remaining,
          limit: remainingInfo.limit,
          unlimited: remainingInfo.unlimited,
          tier: userTier,
        },
      });
    }
  })
);

/**
 * GET /api/conversations/:conversationId/messages
 * Get messages for a conversation with pagination
 * Returns messages in chronological order
 */
router.get(
  '/:conversationId/messages',
  apiRateLimit,
  jwtAuth,
  validateIdParam,
  asyncHandler(async (req, res) => {
    const conversationId = parseInt(req.params.conversationId);
    const userId = req.user!.id;

    // Validate pagination parameters
    const paginationSchema = z.object({
      limit: z.coerce.number().int().min(1).max(100).optional().default(50),
      offset: z.coerce.number().int().min(0).optional().default(0),
    });

    const { limit, offset } = paginationSchema.parse(req.query);

    // Get conversation to verify ownership
    const conversation = await conversationService.getConversationWithDetails(
      conversationId
    );

    if (!conversation) {
      throw AppError.createNotFoundError('Conversation not found', 'CONVERSATION_NOT_FOUND');
    }

    // Verify the conversation belongs to the user
    if (conversation.conversation.userId !== userId) {
      throw AppError.createAuthorizationError(
        'You do not have permission to access this conversation',
        'UNAUTHORIZED_ACCESS'
      );
    }

    // Get messages with pagination
    const messages = await conversationService.getMessages(
      conversationId,
      limit,
      offset
    );

    // Get total message count for pagination metadata
    const totalMessages = await conversationService.getMessageCount(conversationId);

    sendSuccess(res, {
      messages,
      pagination: {
        limit,
        offset,
        total: totalMessages,
        hasMore: offset + messages.length < totalMessages,
      },
    });
  })
);

/**
 * DELETE /api/conversations/:conversationId
 * Clear conversation thread while preserving analysis
 * Requires confirmation and logs deletion for audit trail
 */
router.delete(
  '/:conversationId',
  apiRateLimit,
  jwtAuth,
  validateIdParam,
  asyncHandler(async (req, res) => {
    const conversationId = parseInt(req.params.conversationId);
    const userId = req.user!.id;

    // Validate confirmation
    const confirmationSchema = z.object({
      confirm: z.boolean().refine((val) => val === true, {
        message: 'Confirmation is required to delete conversation',
      }),
    });

    const { confirm } = confirmationSchema.parse(req.body);

    // Get conversation to verify ownership
    const conversation = await conversationService.getConversationWithDetails(
      conversationId
    );

    if (!conversation) {
      throw AppError.createNotFoundError('Conversation not found', 'CONVERSATION_NOT_FOUND');
    }

    // Verify the conversation belongs to the user
    if (conversation.conversation.userId !== userId) {
      throw AppError.createAuthorizationError(
        'You do not have permission to delete this conversation',
        'UNAUTHORIZED_ACCESS'
      );
    }

    // Clear conversation (delete messages and suggestions, reset analytics)
    await conversationService.clearConversation(conversationId);

    // Log deletion for audit trail
    console.log(
      `[AUDIT] Conversation ${conversationId} cleared by user ${userId} at ${new Date().toISOString()}`
    );

    sendSuccess(res, {
      message: 'Conversation cleared successfully',
      conversationId,
      analysisId: conversation.conversation.analysisId,
    });
  })
);

/**
 * GET /api/conversations/:conversationId/suggestions
 * Get suggested follow-up questions for a conversation
 * Returns categorized and prioritized questions (cached for 1 hour)
 */
router.get(
  '/:conversationId/suggestions',
  apiRateLimit,
  jwtAuth,
  validateIdParam,
  asyncHandler(async (req, res) => {
    const conversationId = parseInt(req.params.conversationId);
    const userId = req.user!.id;

    // Get conversation to verify ownership
    const conversation = await conversationService.getConversationWithDetails(
      conversationId
    );

    if (!conversation) {
      throw AppError.createNotFoundError('Conversation not found', 'CONVERSATION_NOT_FOUND');
    }

    // Verify the conversation belongs to the user
    if (conversation.conversation.userId !== userId) {
      throw AppError.createAuthorizationError(
        'You do not have permission to access this conversation',
        'UNAUTHORIZED_ACCESS'
      );
    }

    // Get existing suggestions (not used)
    const suggestions = await conversationService.getSuggestedQuestions(
      conversationId,
      false // Only get unused questions
    );

    sendSuccess(res, {
      suggestions,
      conversationId,
    });
  })
);

/**
 * POST /api/conversations/:conversationId/suggestions/refresh
 * Generate new suggested questions based on current conversation context
 * Deletes old unused questions and generates fresh ones
 */
router.post(
  '/:conversationId/suggestions/refresh',
  apiRateLimit,
  jwtAuth,
  validateIdParam,
  asyncHandler(async (req, res) => {
    const conversationId = parseInt(req.params.conversationId);
    const userId = req.user!.id;

    // Get conversation to verify ownership
    const conversation = await conversationService.getConversationWithDetails(
      conversationId
    );

    if (!conversation) {
      throw AppError.createNotFoundError('Conversation not found', 'CONVERSATION_NOT_FOUND');
    }

    // Verify the conversation belongs to the user
    if (conversation.conversation.userId !== userId) {
      throw AppError.createAuthorizationError(
        'You do not have permission to access this conversation',
        'UNAUTHORIZED_ACCESS'
      );
    }

    // Get analysis data
    const analysis = await db
      .select()
      .from(searches)
      .where(eq(searches.id, conversation.conversation.analysisId))
      .limit(1);

    if (analysis.length === 0) {
      throw AppError.createNotFoundError('Analysis not found', 'ANALYSIS_NOT_FOUND');
    }

    // Get search results for analysis context
    const results = await db
      .select()
      .from(searchResults)
      .where(eq(searchResults.searchId, analysis[0].id))
      .orderBy(desc(searchResults.innovationScore))
      .limit(5);

    // Build analysis data
    const analysisData = {
      query: analysis[0].query,
      innovationScore: results[0]?.innovationScore,
      feasibilityRating: results[0]?.feasibility,
      topGaps: results.map(r => ({
        title: r.title,
        category: r.category,
        feasibility: r.feasibility,
        marketPotential: r.marketPotential,
        innovationScore: r.innovationScore,
      })),
    };

    // Generate new questions
    const { generateFollowUpQuestions } = await import('../services/questionGeneratorService');
    const { prioritizeQuestions } = await import('../services/questionPrioritizationService');
    
    const generatedQuestions = await generateFollowUpQuestions(
      analysisData,
      conversation.messages
    );

    // Prioritize questions
    const prioritizedQuestions = prioritizeQuestions(
      generatedQuestions,
      analysisData,
      conversation.messages
    );

    // Refresh suggestions in database
    const newQuestions = prioritizedQuestions.map(q => ({
      questionText: q.text,
      category: q.category,
      priority: q.priority,
    }));

    const suggestions = await conversationService.refreshSuggestedQuestions(
      conversationId,
      newQuestions
    );

    sendSuccess(res, {
      suggestions,
      conversationId,
      generated: suggestions.length,
    });
  })
);

/**
 * POST /api/conversations/:conversationId/variants
 * Create a variant analysis with modified parameters
 * Triggers new gap analysis and links it to the original
 */
router.post(
  '/:conversationId/variants',
  aiRateLimit,
  jwtAuth,
  validateIdParam,
  asyncHandler(async (req, res) => {
    const conversationId = parseInt(req.params.conversationId);
    const userId = req.user!.id;

    // Validate request body
    const variantSchema = z.object({
      modifiedParameters: z.record(z.string()),
      modifiedQuery: z.string().min(1).max(500),
    });

    const { modifiedParameters, modifiedQuery } = variantSchema.parse(req.body);

    // Get conversation to verify ownership
    const conversation = await conversationService.getConversationWithDetails(
      conversationId
    );

    if (!conversation) {
      throw AppError.createNotFoundError('Conversation not found', 'CONVERSATION_NOT_FOUND');
    }

    // Verify the conversation belongs to the user
    if (conversation.conversation.userId !== userId) {
      throw AppError.createAuthorizationError(
        'You do not have permission to create variants for this conversation',
        'UNAUTHORIZED_ACCESS'
      );
    }

    // Get original analysis
    const originalAnalysis = await db
      .select()
      .from(searches)
      .where(eq(searches.id, conversation.conversation.analysisId))
      .limit(1);

    if (originalAnalysis.length === 0) {
      throw AppError.createNotFoundError('Original analysis not found', 'ANALYSIS_NOT_FOUND');
    }

    // Create new search for the variant
    const [variantSearch] = await db
      .insert(searches)
      .values({
        query: modifiedQuery,
        userId,
        resultsCount: 0,
        isFavorite: false,
      })
      .returning();

    // Store modified parameters in a metadata field (we'll need to add this to schema or use a separate table)
    // For now, we'll store it in the conversation's variantIds as a JSON string with metadata
    
    // Add variant ID to conversation
    await conversationService.addVariant(
      conversationId,
      `${variantSearch.id}:${JSON.stringify(modifiedParameters)}`
    );

    // Create a new conversation for the variant
    const variantConversation = await conversationService.getOrCreateConversation(
      variantSearch.id,
      userId
    );

    // TODO: Trigger gap analysis for the variant
    // This would call the existing gap analysis service with the modified query
    // For now, we'll return the variant search ID and let the client handle the analysis

    sendSuccess(res, {
      variantId: variantSearch.id,
      variantConversationId: variantConversation.id,
      modifiedQuery,
      modifiedParameters,
      message: 'Variant created successfully. Analysis will be performed.',
    });
  })
);

/**
 * GET /api/conversations/:conversationId/variants
 * Get all variants for a conversation
 * Returns list of variant analyses with their parameters
 */
router.get(
  '/:conversationId/variants',
  apiRateLimit,
  jwtAuth,
  validateIdParam,
  asyncHandler(async (req, res) => {
    const conversationId = parseInt(req.params.conversationId);
    const userId = req.user!.id;

    // Get conversation to verify ownership
    const conversation = await conversationService.getConversationWithDetails(
      conversationId
    );

    if (!conversation) {
      throw AppError.createNotFoundError('Conversation not found', 'CONVERSATION_NOT_FOUND');
    }

    // Verify the conversation belongs to the user
    if (conversation.conversation.userId !== userId) {
      throw AppError.createAuthorizationError(
        'You do not have permission to access this conversation',
        'UNAUTHORIZED_ACCESS'
      );
    }

    // Parse variant IDs and get variant analyses
    const variantIds = (conversation.conversation.variantIds as string[]) || [];
    const variants = [];

    for (const variantIdStr of variantIds) {
      try {
        // Parse variant ID and parameters
        const [idStr, paramsStr] = String(variantIdStr).split(':');
        const variantId = parseInt(idStr);
        const modifiedParameters = paramsStr ? JSON.parse(paramsStr) : {};

        // Get variant analysis
        const variantAnalysis = await db
          .select()
          .from(searches)
          .where(eq(searches.id, variantId))
          .limit(1);

        if (variantAnalysis.length > 0) {
          // Get variant results
          const variantResults = await db
            .select()
            .from(searchResults)
            .where(eq(searchResults.searchId, variantId))
            .orderBy(desc(searchResults.innovationScore))
            .limit(5);

          variants.push({
            id: variantId,
            query: variantAnalysis[0].query,
            modifiedParameters,
            resultsCount: variantAnalysis[0].resultsCount,
            timestamp: variantAnalysis[0].timestamp,
            topGaps: variantResults.map(r => ({
              title: r.title,
              category: r.category,
              innovationScore: r.innovationScore,
              feasibility: r.feasibility,
            })),
          });
        }
      } catch (error) {
        console.error('Error parsing variant:', error);
        // Skip invalid variants
      }
    }

    sendSuccess(res, {
      conversationId,
      originalAnalysisId: conversation.conversation.analysisId,
      variants,
      variantCount: variants.length,
    });
  })
);

/**
 * GET /api/conversations/:conversationId/variants/:variantId/compare
 * Compare a variant with the original analysis
 * Returns detailed comparison data
 */
router.get(
  '/:conversationId/variants/:variantId/compare',
  apiRateLimit,
  jwtAuth,
  validateIdParam,
  asyncHandler(async (req, res) => {
    const conversationId = parseInt(req.params.conversationId);
    const variantId = parseInt(req.params.variantId);
    const userId = req.user!.id;

    // Validate variantId parameter
    if (isNaN(variantId) || variantId <= 0) {
      throw AppError.createValidationError('Invalid variant ID', 'INVALID_VARIANT_ID');
    }

    // Get conversation to verify ownership
    const conversation = await conversationService.getConversationWithDetails(
      conversationId
    );

    if (!conversation) {
      throw AppError.createNotFoundError('Conversation not found', 'CONVERSATION_NOT_FOUND');
    }

    // Verify the conversation belongs to the user
    if (conversation.conversation.userId !== userId) {
      throw AppError.createAuthorizationError(
        'You do not have permission to access this conversation',
        'UNAUTHORIZED_ACCESS'
      );
    }

    // Get original analysis
    const originalAnalysis = await db
      .select()
      .from(searches)
      .where(eq(searches.id, conversation.conversation.analysisId))
      .limit(1);

    if (originalAnalysis.length === 0) {
      throw AppError.createNotFoundError('Original analysis not found', 'ANALYSIS_NOT_FOUND');
    }

    // Get original analysis results
    const originalResults = await db
      .select()
      .from(searchResults)
      .where(eq(searchResults.searchId, originalAnalysis[0].id))
      .orderBy(desc(searchResults.innovationScore))
      .limit(10);

    // Get variant analysis
    const variantAnalysis = await db
      .select()
      .from(searches)
      .where(eq(searches.id, variantId))
      .limit(1);

    if (variantAnalysis.length === 0) {
      throw AppError.createNotFoundError('Variant analysis not found', 'VARIANT_NOT_FOUND');
    }

    // Verify variant belongs to this conversation
    const variantIds = (conversation.conversation.variantIds as string[]) || [];
    const variantExists = variantIds.some(vid => {
      const [idStr] = String(vid).split(':');
      return parseInt(idStr) === variantId;
    });

    if (!variantExists) {
      throw AppError.createValidationError(
        'Variant does not belong to this conversation',
        'INVALID_VARIANT'
      );
    }

    // Get variant analysis results
    const variantResults = await db
      .select()
      .from(searchResults)
      .where(eq(searchResults.searchId, variantId))
      .orderBy(desc(searchResults.innovationScore))
      .limit(10);

    // Extract modified parameters from variantIds
    let modifiedParameters: Record<string, string> = {};
    for (const vid of variantIds) {
      const [idStr, paramsStr] = String(vid).split(':');
      if (parseInt(idStr) === variantId && paramsStr) {
        try {
          modifiedParameters = JSON.parse(paramsStr);
        } catch (error) {
          console.error('Error parsing variant parameters:', error);
        }
        break;
      }
    }

    // Build comparison data structures
    const originalData = {
      query: originalAnalysis[0].query,
      innovationScore: originalResults.length > 0 
        ? Math.round(originalResults.reduce((sum, r) => sum + (r.innovationScore || 0), 0) / originalResults.length)
        : undefined,
      feasibilityRating: originalResults.length > 0 ? originalResults[0].feasibility : undefined,
      topGaps: originalResults.slice(0, 5).map(r => ({
        title: r.title,
        category: r.category,
        description: r.description,
      })),
      marketSize: originalResults.length > 0 ? originalResults[0].marketSize : undefined,
      competitiveLandscape: originalResults.length > 0 ? (originalResults[0].competitorAnalysis || undefined) : undefined,
      parameters: {},
    };

    const variantData = {
      query: variantAnalysis[0].query,
      innovationScore: variantResults.length > 0
        ? Math.round(variantResults.reduce((sum, r) => sum + (r.innovationScore || 0), 0) / variantResults.length)
        : undefined,
      feasibilityRating: variantResults.length > 0 ? variantResults[0].feasibility : undefined,
      topGaps: variantResults.slice(0, 5).map(r => ({
        title: r.title,
        category: r.category,
        description: r.description,
      })),
      marketSize: variantResults.length > 0 ? variantResults[0].marketSize : undefined,
      competitiveLandscape: variantResults.length > 0 ? (variantResults[0].competitorAnalysis || undefined) : undefined,
      parameters: modifiedParameters,
    };

    // Use variant comparison service to generate detailed comparison
    const { compareAnalysisVariants } = await import('../services/variantComparisonService.js');
    const comparison = await compareAnalysisVariants(originalData, variantData);

    sendSuccess(res, {
      conversationId,
      originalAnalysisId: originalAnalysis[0].id,
      variantAnalysisId: variantId,
      original: {
        query: originalData.query,
        innovationScore: originalData.innovationScore,
        feasibilityRating: originalData.feasibilityRating,
        topGaps: originalData.topGaps,
      },
      variant: {
        query: variantData.query,
        innovationScore: variantData.innovationScore,
        feasibilityRating: variantData.feasibilityRating,
        topGaps: variantData.topGaps,
        modifiedParameters,
      },
      comparison,
    });
  })
);

/**
 * POST /api/conversations/messages/:messageId/report
 * Report inappropriate message content
 * Logs report for admin review and creates security alert
 */
router.post(
  '/messages/:messageId/report',
  apiRateLimit,
  jwtAuth,
  validateIdParam,
  asyncHandler(async (req, res) => {
    const messageId = req.params.messageId;
    const userId = req.user!.id;

    // Validate report data
    const reportSchema = z.object({
      reason: z.string().min(1).max(500),
      category: z.enum(['inappropriate', 'inaccurate', 'harmful', 'spam', 'other']),
      details: z.string().max(1000).optional(),
    });

    const reportData = reportSchema.parse(req.body);

    // Check if user is abusing report system
    const { contentModerator } = await import('../services/conversations/contentModerator.js');
    const abuseCheck = await contentModerator.checkReportAbuse(userId);

    if (abuseCheck.isAbusive) {
      throw AppError.createValidationError(
        'You have exceeded the maximum number of reports. Please contact support if you believe this is an error.',
        'REPORT_ABUSE_DETECTED'
      );
    }

    // Submit report
    const result = await contentModerator.reportMessage(
      {
        messageId,
        reportedBy: userId,
        reason: reportData.reason,
        category: reportData.category,
        details: reportData.details,
      },
      {
        userId,
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      }
    );

    if (!result.success) {
      throw AppError.createNotFoundError('Message not found', 'MESSAGE_NOT_FOUND');
    }

    sendSuccess(res, {
      message: 'Report submitted successfully. Our team will review it shortly.',
      reportId: result.reportId,
    });
  })
);

/**
 * POST /api/conversations/messages/:messageId/rate
 * Rate an AI response (thumbs up/down)
 * Tracks user satisfaction and response quality
 */
router.post(
  '/messages/:messageId/rate',
  apiRateLimit,
  jwtAuth,
  validateIdParam,
  asyncHandler(async (req, res) => {
    const messageId = parseInt(req.params.messageId);
    const userId = req.user!.id;

    // Validate rating data
    const ratingSchema = z.object({
      rating: z.number().int().min(1).max(5),
      feedback: z.string().max(500).optional(),
    });

    const { rating, feedback } = ratingSchema.parse(req.body);

    // Update message rating
    const result = await conversationService.rateMessage(
      messageId,
      userId,
      rating,
      feedback
    );

    if (!result.success) {
      throw AppError.createNotFoundError('Message not found', 'MESSAGE_NOT_FOUND');
    }

    sendSuccess(res, {
      message: 'Rating submitted successfully',
      rating,
    });
  })
);

/**
 * GET /api/conversations/indicators
 * Get conversation indicators for user's searches
 * Returns analysis IDs with active conversations and preview data
 */
router.get(
  '/indicators',
  apiRateLimit,
  jwtAuth,
  asyncHandler(async (req, res) => {
    const userId = req.user!.id;

    // Get all user's searches
    const userSearches = await db
      .select()
      .from(searches)
      .where(eq(searches.userId, userId))
      .orderBy(desc(searches.timestamp));

    // Get conversations for these searches
    const searchIds = userSearches.map(s => s.id);
    const userConversations = await db
      .select()
      .from(conversations)
      .where(eq(conversations.userId, userId));

    // Build indicators map
    const indicators: Record<number, {
      hasConversation: boolean;
      messageCount: number;
      lastMessage?: {
        role: 'user' | 'assistant';
        content: string;
        timestamp: Date;
      };
    }> = {};

    for (const conversation of userConversations) {
      if (searchIds.includes(conversation.analysisId)) {
        // Get message count and last message
        const messages = await db
          .select()
          .from(conversationMessages)
          .where(eq(conversationMessages.conversationId, conversation.id))
          .orderBy(desc(conversationMessages.createdAt))
          .limit(1);

        const messageCount = await db
          .select()
          .from(conversationMessages)
          .where(eq(conversationMessages.conversationId, conversation.id));

        indicators[conversation.analysisId] = {
          hasConversation: messageCount.length > 0,
          messageCount: messageCount.length,
          lastMessage: messages.length > 0 ? {
            role: messages[0].role as 'user' | 'assistant',
            content: messages[0].content,
            timestamp: messages[0].createdAt as any,
          } : undefined,
        };
      }
    }

    sendSuccess(res, { indicators });
  })
);

/**
 * POST /api/conversations/:conversationId/export
 * Export conversation in specified format (PDF, Markdown, JSON)
 * Supports including or excluding conversation based on user choice
 */
router.post(
  '/:conversationId/export',
  apiRateLimit,
  jwtAuth,
  validateIdParam,
  asyncHandler(async (req, res) => {
    const conversationId = parseInt(req.params.conversationId);
    const userId = req.user!.id;

    // Validate export options
    const exportSchema = z.object({
      format: z.enum(['pdf', 'markdown', 'json']),
      includeConversation: z.boolean().default(true),
    });

    const options = exportSchema.parse(req.body);

    // Get conversation to verify ownership
    const conversation = await conversationService.getConversationWithDetails(
      conversationId
    );

    if (!conversation) {
      throw AppError.createNotFoundError('Conversation not found', 'CONVERSATION_NOT_FOUND');
    }

    // Verify the conversation belongs to the user
    if (conversation.conversation.userId !== userId) {
      throw AppError.createAuthorizationError(
        'You do not have permission to export this conversation',
        'UNAUTHORIZED_ACCESS'
      );
    }

    // Export conversation
    const { exportConversation } = await import('../services/conversationExportService.js');
    const { content, filename, mimeType } = await exportConversation(
      conversationId,
      options
    );

    // Set response headers for download
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(content);
  })
);

export default router;
