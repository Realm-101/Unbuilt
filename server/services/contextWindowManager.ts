import type { ConversationMessage } from '../../shared/schema.js';
import { tokenEstimator } from './tokenEstimator';
import { historySummarizer } from './historySummarizer';
import { contextOptimizer } from './contextOptimizer';

/**
 * Context Window for AI conversation
 */
export interface ContextWindow {
  systemPrompt: string;
  analysisContext: string;
  conversationHistory: string;
  currentQuery: string;
  totalTokens: number;
}

/**
 * Token budget allocation for context window
 */
export interface TokenBudget {
  systemPrompt: number;
  analysisContext: number;
  conversationHistory: number;
  currentQuery: number;
  responseBuffer: number;
}

/**
 * Analysis data for context building
 */
export interface AnalysisData {
  searchQuery: string;
  innovationScore?: number;
  feasibilityRating?: string;
  topGaps?: Array<{
    title: string;
    description: string;
    score?: number;
  }>;
  competitors?: Array<{
    name: string;
    description?: string;
  }>;
  actionPlan?: {
    phases?: Array<{
      name: string;
      description?: string;
    }>;
  };
}

/**
 * Context Window Manager Service
 * Manages context building, token estimation, and history summarization
 */
export class ContextWindowManager {
  // Default token budget (total ~8000 tokens)
  private readonly defaultBudget: TokenBudget = {
    systemPrompt: 200,
    analysisContext: 2000,
    conversationHistory: 1500,
    currentQuery: 500,
    responseBuffer: 3000,
  };

  /**
   * Build complete context window for AI conversation
   */
  async buildContext(
    analysis: AnalysisData,
    conversationHistory: ConversationMessage[],
    currentQuery: string,
    maxTokens: number = 8000,
    options: {
      useCache?: boolean;
      optimize?: boolean;
    } = {}
  ): Promise<ContextWindow> {
    const { useCache = true, optimize = true } = options;
    const budget = this.calculateBudget(maxTokens);

    // Build system prompt
    const systemPrompt = this.buildSystemPrompt();

    // Check cache for analysis context
    let analysisContext: string;
    const analysisId = (analysis as any).id?.toString();

    if (useCache && analysisId) {
      // Try Redis cache first
      const { conversationCacheService } = await import('./conversationCacheService.js');
      const redisCached = await conversationCacheService.getAnalysisContext(parseInt(analysisId));
      
      if (redisCached) {
        analysisContext = redisCached;
      } else {
        // Try in-memory cache
        const cached = contextOptimizer.getCachedAnalysisContext(analysisId);
        if (cached) {
          analysisContext = cached.content;
        } else {
          // Optimize analysis data (top 5 gaps only)
          const optimizedAnalysis = contextOptimizer.optimizeAnalysisData(analysis, 5);
          analysisContext = this.buildAnalysisContext(
            optimizedAnalysis,
            budget.analysisContext
          );

          // Cache in both Redis and memory
          await conversationCacheService.cacheAnalysisContext(parseInt(analysisId), analysisContext);
          const tokens = await tokenEstimator.estimateTokens(analysisContext);
          contextOptimizer.cacheAnalysisContext(analysisId, analysisContext, tokens);
        }
      }
    } else {
      // Optimize analysis data (top 5 gaps only)
      const optimizedAnalysis = contextOptimizer.optimizeAnalysisData(analysis, 5);
      analysisContext = this.buildAnalysisContext(optimizedAnalysis, budget.analysisContext);
    }

    // Build conversation history (with summarization if needed)
    const historyContext = await this.buildConversationHistory(
      conversationHistory,
      budget.conversationHistory
    );

    // Truncate current query if needed
    const truncatedQuery = this.truncateText(currentQuery, budget.currentQuery);

    // Optimize context window if requested
    let finalContext = {
      systemPrompt,
      analysisContext,
      conversationHistory: historyContext,
      currentQuery: truncatedQuery,
    };

    if (optimize) {
      const optimized = await contextOptimizer.optimizeContextWindow(finalContext);
      finalContext = {
        systemPrompt: optimized.systemPrompt,
        analysisContext: optimized.analysisContext,
        conversationHistory: optimized.conversationHistory,
        currentQuery: optimized.currentQuery,
      };
    }

    // Estimate total tokens using tokenEstimator
    const totalTokens = await tokenEstimator.estimateTokensForSegments([
      finalContext.systemPrompt,
      finalContext.analysisContext,
      finalContext.conversationHistory,
      finalContext.currentQuery,
    ]);

    return {
      systemPrompt: finalContext.systemPrompt,
      analysisContext: finalContext.analysisContext,
      conversationHistory: finalContext.conversationHistory,
      currentQuery: finalContext.currentQuery,
      totalTokens,
    };
  }

  /**
   * Build system prompt with role definition and guidelines
   */
  private buildSystemPrompt(): string {
    return `You are an AI advisor for Unbuilt, a platform that helps entrepreneurs discover market gaps and innovation opportunities. You are having a conversation with a user about their gap analysis.

GUIDELINES:
1. Be conversational and helpful, not robotic
2. Reference specific data from the analysis when relevant
3. If you make assumptions, state them explicitly
4. For financial projections, include appropriate disclaimers
5. Stay focused on the analysis topic; politely redirect off-topic questions
6. Acknowledge uncertainty rather than making up information
7. Cite sources when making specific claims
8. Be encouraging but realistic about opportunities and challenges

SAFETY:
- Reject inappropriate, offensive, or harmful requests
- Do not provide legal, medical, or financial advice
- Do not make guarantees about business success
- Respect user privacy and data

RESPONSE FORMAT:
- Use clear paragraphs
- Include bullet points for lists
- Bold key insights with **text**
- Keep responses concise (200-400 words typically)`;
  }

  /**
   * Build analysis context from gap analysis data
   */
  private buildAnalysisContext(analysis: AnalysisData, maxTokens: number): string {
    let context = `ANALYSIS CONTEXT:\n\n`;
    context += `Original Search: ${analysis.searchQuery}\n\n`;

    if (analysis.innovationScore !== undefined) {
      context += `Innovation Score: ${analysis.innovationScore}/100\n`;
    }

    if (analysis.feasibilityRating) {
      context += `Feasibility: ${analysis.feasibilityRating}\n`;
    }

    context += `\n`;

    // Add top gaps (limit to top 5)
    if (analysis.topGaps && analysis.topGaps.length > 0) {
      context += `TOP GAPS:\n`;
      const gapsToInclude = analysis.topGaps.slice(0, 5);
      gapsToInclude.forEach((gap, index) => {
        context += `${index + 1}. ${gap.title}`;
        if (gap.score !== undefined) {
          context += ` (Score: ${gap.score})`;
        }
        context += `\n`;
        if (gap.description) {
          context += `   ${this.truncateText(gap.description, 100)}\n`;
        }
      });
      context += `\n`;
    }

    // Add competitors (limit to top 5)
    if (analysis.competitors && analysis.competitors.length > 0) {
      context += `KEY COMPETITORS:\n`;
      const competitorsToInclude = analysis.competitors.slice(0, 5);
      competitorsToInclude.forEach((competitor, index) => {
        context += `${index + 1}. ${competitor.name}`;
        if (competitor.description) {
          context += `: ${this.truncateText(competitor.description, 80)}`;
        }
        context += `\n`;
      });
      context += `\n`;
    }

    // Add action plan overview
    if (analysis.actionPlan?.phases && analysis.actionPlan.phases.length > 0) {
      context += `ACTION PLAN PHASES:\n`;
      analysis.actionPlan.phases.forEach((phase, index) => {
        context += `${index + 1}. ${phase.name}`;
        if (phase.description) {
          context += `: ${this.truncateText(phase.description, 80)}`;
        }
        context += `\n`;
      });
    }

    // Truncate if exceeds budget
    return this.truncateText(context, maxTokens);
  }

  /**
   * Build conversation history with smart truncation and summarization
   */
  private async buildConversationHistory(
    messages: ConversationMessage[],
    maxTokens: number
  ): Promise<string> {
    if (messages.length === 0) {
      return '';
    }

    let history = `CONVERSATION HISTORY:\n\n`;

    // Check if summarization is needed
    if (historySummarizer.needsSummarization(messages.length)) {
      // Summarize long conversations
      const summarized = await historySummarizer.summarizeHistory(messages, maxTokens);
      history += historySummarizer.formatForContext(summarized);
    } else {
      // Short conversations - include all messages
      messages.forEach((message) => {
        const role = message.role === 'user' ? 'User' : 'Assistant';
        history += `${role}: ${message.content}\n\n`;
      });
    }

    // Truncate if exceeds budget
    return this.truncateText(history, maxTokens);
  }

  /**
   * Calculate token budget based on max tokens
   */
  private calculateBudget(maxTokens: number): TokenBudget {
    const ratio = maxTokens / 8000;
    return {
      systemPrompt: Math.floor(this.defaultBudget.systemPrompt * ratio),
      analysisContext: Math.floor(this.defaultBudget.analysisContext * ratio),
      conversationHistory: Math.floor(this.defaultBudget.conversationHistory * ratio),
      currentQuery: Math.floor(this.defaultBudget.currentQuery * ratio),
      responseBuffer: Math.floor(this.defaultBudget.responseBuffer * ratio),
    };
  }

  /**
   * Estimate tokens for text using tokenEstimator
   */
  async estimateTokens(text: string): Promise<number> {
    return await tokenEstimator.estimateTokens(text);
  }

  /**
   * Truncate text to fit within token budget
   * Uses character-based approximation for performance
   */
  private truncateText(text: string, maxTokens: number): string {
    // Use character-based approximation (1 token ≈ 4 characters)
    const maxChars = maxTokens * 4;

    if (text.length <= maxChars) {
      return text;
    }

    // Truncate and add ellipsis
    return text.substring(0, maxChars - 3) + '...';
  }

  /**
   * Validate context window fits within budget
   */
  async validateBudget(context: ContextWindow, maxTokens: number): Promise<boolean> {
    return context.totalTokens <= maxTokens;
  }

  /**
   * Get detailed token breakdown for context components
   */
  async getTokenBreakdown(context: ContextWindow) {
    return await tokenEstimator.getTokenBreakdown({
      systemPrompt: context.systemPrompt,
      analysisContext: context.analysisContext,
      conversationHistory: context.conversationHistory,
      currentQuery: context.currentQuery,
    });
  }

  /**
   * Get token budget breakdown
   */
  getTokenBudget(maxTokens: number = 8000): TokenBudget {
    return this.calculateBudget(maxTokens);
  }

  /**
   * Get cache statistics from optimizer
   */
  getCacheStats() {
    return contextOptimizer.getCacheStats();
  }

  /**
   * Clear optimization cache
   */
  clearCache(): void {
    contextOptimizer.clearCache();
  }
}

// Export singleton instance
export const contextWindowManager = new ContextWindowManager();
