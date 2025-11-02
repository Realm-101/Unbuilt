import type { ConversationMessage } from '../../shared/schema.js';
import { tokenEstimator } from './tokenEstimator';

/**
 * Summarized conversation segment
 */
export interface SummarizedSegment {
  messageCount: number;
  summary: string;
  keyPoints: string[];
}

/**
 * History summarization result
 */
export interface SummarizedHistory {
  recentMessages: ConversationMessage[]; // Last 5 exchanges (10 messages)
  middleSummary?: SummarizedSegment; // Exchanges 6-10 summarized
  archivedCount: number; // Exchanges 11+ (not included)
  totalMessages: number;
}

/**
 * History Summarizer Service
 * Manages conversation history summarization for long conversations
 */
export class HistorySummarizer {
  private readonly RECENT_EXCHANGES = 5; // Keep last 5 exchanges in full
  private readonly MIDDLE_EXCHANGES = 5; // Summarize exchanges 6-10
  private readonly MESSAGES_PER_EXCHANGE = 2; // User + Assistant

  /**
   * Summarize conversation history with smart truncation
   * - Keep last 5 exchanges (10 messages) in full
   * - Summarize middle exchanges (6-10) if they exist
   * - Archive old exchanges (11+)
   */
  async summarizeHistory(
    messages: ConversationMessage[],
    maxTokens: number
  ): Promise<SummarizedHistory> {
    const totalMessages = messages.length;

    // If conversation is short, return all messages
    if (totalMessages <= this.RECENT_EXCHANGES * this.MESSAGES_PER_EXCHANGE) {
      return {
        recentMessages: messages,
        archivedCount: 0,
        totalMessages,
      };
    }

    // Calculate message boundaries
    const recentStart = Math.max(
      0,
      totalMessages - this.RECENT_EXCHANGES * this.MESSAGES_PER_EXCHANGE
    );
    const middleStart = Math.max(
      0,
      recentStart - this.MIDDLE_EXCHANGES * this.MESSAGES_PER_EXCHANGE
    );

    // Extract message segments
    const recentMessages = messages.slice(recentStart);
    const middleMessages = messages.slice(middleStart, recentStart);
    const archivedCount = middleStart;

    // Summarize middle messages if they exist
    let middleSummary: SummarizedSegment | undefined;
    if (middleMessages.length > 0) {
      middleSummary = await this.summarizeSegment(middleMessages, maxTokens);
    }

    return {
      recentMessages,
      middleSummary,
      archivedCount,
      totalMessages,
    };
  }

  /**
   * Summarize a segment of conversation messages
   */
  private async summarizeSegment(
    messages: ConversationMessage[],
    maxTokens: number
  ): Promise<SummarizedSegment> {
    // Extract key points from messages
    const keyPoints = this.extractKeyPoints(messages);

    // Create summary text
    const summary = this.createSummary(messages, keyPoints);

    // Validate token budget
    const tokens = await tokenEstimator.estimateTokens(summary);
    let finalSummary = summary;

    // If summary exceeds budget, truncate key points
    if (tokens > maxTokens) {
      const truncatedKeyPoints = keyPoints.slice(0, 3); // Keep top 3 points
      finalSummary = this.createSummary(messages, truncatedKeyPoints);
    }

    return {
      messageCount: messages.length,
      summary: finalSummary,
      keyPoints,
    };
  }

  /**
   * Extract key points from conversation messages
   */
  private extractKeyPoints(messages: ConversationMessage[]): string[] {
    const keyPoints: string[] = [];

    // Group messages into exchanges (user + assistant pairs)
    for (let i = 0; i < messages.length; i += 2) {
      const userMessage = messages[i];
      const assistantMessage = messages[i + 1];

      if (!userMessage || !assistantMessage) continue;

      // Extract topic from user message (first sentence or key phrase)
      const userTopic = this.extractTopic(userMessage.content);

      // Extract key insight from assistant response
      const assistantInsight = this.extractInsight(assistantMessage.content);

      if (userTopic && assistantInsight) {
        keyPoints.push(`${userTopic}: ${assistantInsight}`);
      } else if (userTopic) {
        keyPoints.push(userTopic);
      }
    }

    return keyPoints;
  }

  /**
   * Extract topic from user message
   */
  private extractTopic(content: string): string {
    // Get first sentence or first 100 characters
    const firstSentence = content.split(/[.!?]/)[0];
    if (firstSentence && firstSentence.length <= 100) {
      return firstSentence.trim();
    }

    // Fallback to first 100 characters
    return content.substring(0, 100).trim() + (content.length > 100 ? '...' : '');
  }

  /**
   * Extract key insight from assistant response
   */
  private extractInsight(content: string): string {
    // Look for key phrases that indicate important insights
    const insightPatterns = [
      /key insight[s]?:?\s*(.+?)(?:\.|$)/i,
      /important[ly]?:?\s*(.+?)(?:\.|$)/i,
      /note that\s*(.+?)(?:\.|$)/i,
      /consider\s*(.+?)(?:\.|$)/i,
      /recommend[ed]?:?\s*(.+?)(?:\.|$)/i,
    ];

    for (const pattern of insightPatterns) {
      const match = content.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }

    // Fallback to first sentence
    const firstSentence = content.split(/[.!?]/)[0];
    if (firstSentence && firstSentence.length <= 150) {
      return firstSentence.trim();
    }

    return content.substring(0, 150).trim() + (content.length > 150 ? '...' : '');
  }

  /**
   * Create summary text from messages and key points
   */
  private createSummary(
    messages: ConversationMessage[],
    keyPoints: string[]
  ): string {
    const exchangeCount = Math.floor(messages.length / 2);

    let summary = `[Earlier conversation - ${exchangeCount} exchanges]\n`;
    summary += `Key topics discussed:\n`;

    keyPoints.forEach((point, index) => {
      summary += `${index + 1}. ${point}\n`;
    });

    return summary;
  }

  /**
   * Format summarized history for context window
   */
  formatForContext(summarized: SummarizedHistory): string {
    let formatted = '';

    // Add archived message indicator
    if (summarized.archivedCount > 0) {
      formatted += `[${summarized.archivedCount} earlier messages archived]\n\n`;
    }

    // Add middle summary if exists
    if (summarized.middleSummary) {
      formatted += summarized.middleSummary.summary + '\n\n';
    }

    // Add recent messages in full
    if (summarized.recentMessages.length > 0) {
      formatted += '[Recent conversation]\n';
      summarized.recentMessages.forEach((message) => {
        const role = message.role === 'user' ? 'User' : 'Assistant';
        formatted += `${role}: ${message.content}\n\n`;
      });
    }

    return formatted;
  }

  /**
   * Check if conversation needs summarization
   */
  needsSummarization(messageCount: number): boolean {
    return messageCount > this.RECENT_EXCHANGES * this.MESSAGES_PER_EXCHANGE;
  }

  /**
   * Get summarization statistics
   */
  getStats(summarized: SummarizedHistory) {
    return {
      totalMessages: summarized.totalMessages,
      recentMessages: summarized.recentMessages.length,
      summarizedMessages: summarized.middleSummary?.messageCount || 0,
      archivedMessages: summarized.archivedCount,
      compressionRatio:
        summarized.totalMessages > 0
          ? summarized.recentMessages.length / summarized.totalMessages
          : 1,
    };
  }
}

// Export singleton instance
export const historySummarizer = new HistorySummarizer();
