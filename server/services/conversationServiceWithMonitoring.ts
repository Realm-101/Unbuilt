import { conversationService } from './conversationService';
import { conversationPerformanceMonitor } from './conversationPerformanceMonitor';
import type {
  Conversation,
  ConversationMessage,
  SuggestedQuestion,
  ConversationAnalytics,
} from '@shared/schema';

/**
 * Conversation Service with Performance Monitoring
 * 
 * Wraps the conversation service to add performance tracking
 * for all database operations.
 */

/**
 * Get or create conversation with monitoring
 */
export async function getOrCreateConversation(
  analysisId: number,
  userId: number
): Promise<Conversation> {
  return conversationPerformanceMonitor.measureQuery(
    'getOrCreateConversation',
    () => conversationService.getOrCreateConversation(analysisId, userId)
  );
}

/**
 * Get conversation with details with monitoring
 */
export async function getConversationWithDetails(
  conversationId: number
): Promise<{
  conversation: Conversation;
  messages: ConversationMessage[];
  suggestions: SuggestedQuestion[];
  analytics: ConversationAnalytics | null;
} | null> {
  return conversationPerformanceMonitor.measureQuery(
    'getConversationWithDetails',
    () => conversationService.getConversationWithDetails(conversationId)
  );
}

/**
 * Add user message with monitoring
 */
export async function addUserMessage(
  conversationId: number,
  content: string
): Promise<ConversationMessage> {
  return conversationPerformanceMonitor.measureQuery(
    'addUserMessage',
    () => conversationService.addUserMessage(conversationId, content)
  );
}

/**
 * Add AI response with monitoring
 */
export async function addAIResponse(
  conversationId: number,
  content: string,
  metadata: {
    processingTime: number;
    tokensUsed: {
      input: number;
      output: number;
      total: number;
    };
    cached?: boolean;
  }
): Promise<ConversationMessage> {
  return conversationPerformanceMonitor.measureQuery(
    'addAIResponse',
    () => conversationService.addAIResponse(conversationId, content, metadata)
  );
}

/**
 * Get messages with pagination and monitoring
 */
export async function getMessages(
  conversationId: number,
  limit?: number,
  offset?: number
): Promise<ConversationMessage[]> {
  return conversationPerformanceMonitor.measureQuery(
    'getMessages',
    () => conversationService.getMessages(conversationId, limit, offset)
  );
}

/**
 * Get message count with monitoring
 */
export async function getMessageCount(
  conversationId: number
): Promise<number> {
  return conversationPerformanceMonitor.measureQuery(
    'getMessageCount',
    () => conversationService.getMessageCount(conversationId)
  );
}

/**
 * Get suggested questions with monitoring
 */
export async function getSuggestedQuestions(
  conversationId: number,
  onlyUnused?: boolean
): Promise<SuggestedQuestion[]> {
  return conversationPerformanceMonitor.measureQuery(
    'getSuggestedQuestions',
    () => conversationService.getSuggestedQuestions(conversationId, onlyUnused)
  );
}

/**
 * Add suggested questions with monitoring
 */
export async function addSuggestedQuestions(
  conversationId: number,
  questions: Array<{
    questionText: string;
    category: string;
    priority: number;
  }>
): Promise<SuggestedQuestion[]> {
  return conversationPerformanceMonitor.measureQuery(
    'addSuggestedQuestions',
    () => conversationService.addSuggestedQuestions(conversationId, questions)
  );
}

/**
 * Refresh suggested questions with monitoring
 */
export async function refreshSuggestedQuestions(
  conversationId: number,
  newQuestions: Array<{
    questionText: string;
    category: string;
    priority: number;
  }>
): Promise<SuggestedQuestion[]> {
  return conversationPerformanceMonitor.measureQuery(
    'refreshSuggestedQuestions',
    () => conversationService.refreshSuggestedQuestions(conversationId, newQuestions)
  );
}

/**
 * Mark question as used with monitoring
 */
export async function markQuestionAsUsed(
  questionId: number
): Promise<void> {
  return conversationPerformanceMonitor.measureQuery(
    'markQuestionAsUsed',
    () => conversationService.markQuestionAsUsed(questionId)
  );
}

/**
 * Clear conversation with monitoring
 */
export async function clearConversation(
  conversationId: number
): Promise<void> {
  return conversationPerformanceMonitor.measureQuery(
    'clearConversation',
    () => conversationService.clearConversation(conversationId)
  );
}

/**
 * Add variant with monitoring
 */
export async function addVariant(
  conversationId: number,
  variantId: string
): Promise<void> {
  return conversationPerformanceMonitor.measureQuery(
    'addVariant',
    () => conversationService.addVariant(conversationId, variantId)
  );
}

/**
 * Rate message with monitoring
 */
export async function rateMessage(
  messageId: number,
  userId: number,
  rating: number,
  feedback?: string
): Promise<{ success: boolean }> {
  return conversationPerformanceMonitor.measureQuery(
    'rateMessage',
    () => conversationService.rateMessage(messageId, userId, rating, feedback)
  );
}

/**
 * Get analytics with monitoring
 */
export async function getAnalytics(
  conversationId: number
): Promise<ConversationAnalytics | null> {
  return conversationPerformanceMonitor.measureQuery(
    'getAnalytics',
    () => conversationService.getAnalytics(conversationId)
  );
}

/**
 * Update analytics with monitoring
 */
export async function updateAnalytics(
  conversationId: number,
  updates: {
    messageCount?: number;
    totalTokensUsed?: number;
    avgResponseTime?: number;
    userSatisfaction?: number;
  }
): Promise<void> {
  return conversationPerformanceMonitor.measureQuery(
    'updateAnalytics',
    () => conversationService.updateAnalytics(conversationId, updates)
  );
}

// Export the monitored service
export const monitoredConversationService = {
  getOrCreateConversation,
  getConversationWithDetails,
  addUserMessage,
  addAIResponse,
  getMessages,
  getMessageCount,
  getSuggestedQuestions,
  addSuggestedQuestions,
  refreshSuggestedQuestions,
  markQuestionAsUsed,
  clearConversation,
  addVariant,
  rateMessage,
  getAnalytics,
  updateAnalytics,
};
