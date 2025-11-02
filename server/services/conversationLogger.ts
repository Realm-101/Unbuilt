/**
 * Conversation Logger Service
 * 
 * Provides structured logging for conversation events, AI performance,
 * and user feedback. Logs are stored in a structured format for analysis.
 */

export enum ConversationEventType {
  CONVERSATION_START = 'conversation_start',
  MESSAGE_SENT = 'message_sent',
  AI_RESPONSE = 'ai_response',
  ERROR = 'error',
  RATE_LIMIT = 'rate_limit',
  SUGGESTION_GENERATED = 'suggestion_generated',
  VARIANT_CREATED = 'variant_created',
  CONVERSATION_CLEARED = 'conversation_cleared',
  MESSAGE_RATED = 'message_rated',
  MESSAGE_REPORTED = 'message_reported',
  EXPORT = 'export',
}

export interface ConversationLogEntry {
  timestamp: string;
  eventType: ConversationEventType;
  conversationId?: number;
  userId?: number;
  messageId?: number;
  metadata?: Record<string, any>;
  level: 'info' | 'warn' | 'error';
}

export interface AIPerformanceLog {
  timestamp: string;
  conversationId: number;
  messageId: number;
  responseTime: number; // milliseconds
  tokensUsed: {
    input: number;
    output: number;
    total: number;
  };
  model: string;
  cacheHit: boolean;
  error?: string;
}

export interface UserFeedbackLog {
  timestamp: string;
  conversationId: number;
  messageId: number;
  userId: number;
  feedbackType: 'rating' | 'report';
  rating?: number; // 1-5
  reportReason?: string;
  feedback?: string;
}

class ConversationLogger {
  private logs: ConversationLogEntry[] = [];
  private performanceLogs: AIPerformanceLog[] = [];
  private feedbackLogs: UserFeedbackLog[] = [];
  private maxLogsInMemory = 1000;

  /**
   * Log a conversation event
   */
  logEvent(
    eventType: ConversationEventType,
    data: {
      conversationId?: number;
      userId?: number;
      messageId?: number;
      metadata?: Record<string, any>;
      level?: 'info' | 'warn' | 'error';
    }
  ): void {
    const logEntry: ConversationLogEntry = {
      timestamp: new Date().toISOString(),
      eventType,
      conversationId: data.conversationId,
      userId: data.userId,
      messageId: data.messageId,
      metadata: data.metadata,
      level: data.level || 'info',
    };

    this.logs.push(logEntry);
    this.trimLogs();

    // Console output in development
    if (process.env.NODE_ENV === 'development') {
      const color = data.level === 'error' ? '\x1b[31m' : data.level === 'warn' ? '\x1b[33m' : '\x1b[36m';
      console.log(
        `${color}[Conversation ${eventType}]\x1b[0m`,
        JSON.stringify(logEntry, null, 2)
      );
    }

    // In production, send to logging service (e.g., CloudWatch, Datadog, etc.)
    if (process.env.NODE_ENV === 'production') {
      this.sendToLoggingService(logEntry);
    }
  }

  /**
   * Log AI performance metrics
   */
  logAIPerformance(data: {
    conversationId: number;
    messageId: number;
    responseTime: number;
    tokensUsed: {
      input: number;
      output: number;
      total: number;
    };
    model: string;
    cacheHit: boolean;
    error?: string;
  }): void {
    const performanceLog: AIPerformanceLog = {
      timestamp: new Date().toISOString(),
      ...data,
    };

    this.performanceLogs.push(performanceLog);
    this.trimPerformanceLogs();

    if (process.env.NODE_ENV === 'development') {
      console.log(
        '\x1b[35m[AI Performance]\x1b[0m',
        JSON.stringify(performanceLog, null, 2)
      );
    }

    if (process.env.NODE_ENV === 'production') {
      this.sendToLoggingService(performanceLog);
    }
  }

  /**
   * Log user feedback
   */
  logUserFeedback(data: {
    conversationId: number;
    messageId: number;
    userId: number;
    feedbackType: 'rating' | 'report';
    rating?: number;
    reportReason?: string;
    feedback?: string;
  }): void {
    const feedbackLog: UserFeedbackLog = {
      timestamp: new Date().toISOString(),
      ...data,
    };

    this.feedbackLogs.push(feedbackLog);
    this.trimFeedbackLogs();

    if (process.env.NODE_ENV === 'development') {
      console.log(
        '\x1b[32m[User Feedback]\x1b[0m',
        JSON.stringify(feedbackLog, null, 2)
      );
    }

    if (process.env.NODE_ENV === 'production') {
      this.sendToLoggingService(feedbackLog);
    }
  }

  /**
   * Get recent logs
   */
  getRecentLogs(limit: number = 100): ConversationLogEntry[] {
    return this.logs.slice(-limit);
  }

  /**
   * Get recent performance logs
   */
  getRecentPerformanceLogs(limit: number = 100): AIPerformanceLog[] {
    return this.performanceLogs.slice(-limit);
  }

  /**
   * Get recent feedback logs
   */
  getRecentFeedbackLogs(limit: number = 100): UserFeedbackLog[] {
    return this.feedbackLogs.slice(-limit);
  }

  /**
   * Get logs by conversation ID
   */
  getLogsByConversation(conversationId: number): ConversationLogEntry[] {
    return this.logs.filter((log) => log.conversationId === conversationId);
  }

  /**
   * Get logs by user ID
   */
  getLogsByUser(userId: number): ConversationLogEntry[] {
    return this.logs.filter((log) => log.userId === userId);
  }

  /**
   * Get logs by event type
   */
  getLogsByEventType(eventType: ConversationEventType): ConversationLogEntry[] {
    return this.logs.filter((log) => log.eventType === eventType);
  }

  /**
   * Get error logs
   */
  getErrorLogs(limit: number = 100): ConversationLogEntry[] {
    return this.logs.filter((log) => log.level === 'error').slice(-limit);
  }

  /**
   * Get performance statistics
   */
  getPerformanceStats(): {
    avgResponseTime: number;
    avgTokensUsed: number;
    cacheHitRate: number;
    errorRate: number;
  } {
    if (this.performanceLogs.length === 0) {
      return {
        avgResponseTime: 0,
        avgTokensUsed: 0,
        cacheHitRate: 0,
        errorRate: 0,
      };
    }

    const totalResponseTime = this.performanceLogs.reduce(
      (sum, log) => sum + log.responseTime,
      0
    );
    const totalTokens = this.performanceLogs.reduce(
      (sum, log) => sum + log.tokensUsed.total,
      0
    );
    const cacheHits = this.performanceLogs.filter((log) => log.cacheHit).length;
    const errors = this.performanceLogs.filter((log) => log.error).length;

    return {
      avgResponseTime: totalResponseTime / this.performanceLogs.length,
      avgTokensUsed: totalTokens / this.performanceLogs.length,
      cacheHitRate: (cacheHits / this.performanceLogs.length) * 100,
      errorRate: (errors / this.performanceLogs.length) * 100,
    };
  }

  /**
   * Get feedback statistics
   */
  getFeedbackStats(): {
    avgRating: number;
    totalRatings: number;
    totalReports: number;
    ratingDistribution: Record<number, number>;
  } {
    const self = this;
    const ratings = self.feedbackLogs.filter(
      (log) => log.feedbackType === 'rating' && log.rating
    );
    const reports = self.feedbackLogs.filter((log) => log.feedbackType === 'report');

    const ratingDistribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    let totalRating = 0;

    ratings.forEach((log) => {
      if (log.rating) {
        ratingDistribution[log.rating]++;
        totalRating += log.rating;
      }
    });

    return {
      avgRating: ratings.length > 0 ? totalRating / ratings.length : 0,
      totalRatings: ratings.length,
      totalReports: reports.length,
      ratingDistribution,
    };
  }

  /**
   * Export logs to JSON
   */
  exportLogs(): {
    events: ConversationLogEntry[];
    performance: AIPerformanceLog[];
    feedback: UserFeedbackLog[];
    stats: {
      performance: {
        avgResponseTime: number;
        avgTokensUsed: number;
        cacheHitRate: number;
        errorRate: number;
      };
      feedback: {
        avgRating: number;
        totalRatings: number;
        totalReports: number;
        ratingDistribution: Record<number, number>;
      };
    };
  } {
    return {
      events: this.logs,
      performance: this.performanceLogs,
      feedback: this.feedbackLogs,
      stats: {
        performance: this.getPerformanceStats(),
        feedback: this.getFeedbackStats(),
      },
    };
  }

  /**
   * Clear all logs (use with caution)
   */
  clearLogs(): void {
    this.logs = [];
    this.performanceLogs = [];
    this.feedbackLogs = [];
  }

  /**
   * Trim logs to prevent memory issues
   */
  private trimLogs(): void {
    if (this.logs.length > this.maxLogsInMemory) {
      this.logs = this.logs.slice(-this.maxLogsInMemory);
    }
  }

  /**
   * Trim performance logs
   */
  private trimPerformanceLogs(): void {
    if (this.performanceLogs.length > this.maxLogsInMemory) {
      this.performanceLogs = this.performanceLogs.slice(-this.maxLogsInMemory);
    }
  }

  /**
   * Trim feedback logs
   */
  private trimFeedbackLogs(): void {
    if (this.feedbackLogs.length > this.maxLogsInMemory) {
      this.feedbackLogs = this.feedbackLogs.slice(-this.maxLogsInMemory);
    }
  }

  /**
   * Send logs to external logging service
   * This is a placeholder - implement based on your logging infrastructure
   */
  private sendToLoggingService(log: any): void {
    // TODO: Implement integration with logging service
    // Examples:
    // - AWS CloudWatch Logs
    // - Datadog
    // - Loggly
    // - Papertrail
    // - Custom logging endpoint

    // For now, just ensure it's logged to stdout in production
    // which can be captured by container logging
    if (process.env.NODE_ENV === 'production') {
      console.log(JSON.stringify(log));
    }
  }
}

// Singleton instance
export const conversationLogger = new ConversationLogger();

// Helper functions for common logging scenarios

export function logConversationStart(conversationId: number, userId: number): void {
  conversationLogger.logEvent(ConversationEventType.CONVERSATION_START, {
    conversationId,
    userId,
    level: 'info',
  });
}

export function logMessageSent(
  conversationId: number,
  messageId: number,
  userId: number,
  metadata?: Record<string, any>
): void {
  conversationLogger.logEvent(ConversationEventType.MESSAGE_SENT, {
    conversationId,
    messageId,
    userId,
    metadata,
    level: 'info',
  });
}

export function logAIResponse(
  conversationId: number,
  messageId: number,
  responseTime: number,
  tokensUsed: { input: number; output: number; total: number },
  model: string,
  cacheHit: boolean
): void {
  conversationLogger.logAIPerformance({
    conversationId,
    messageId,
    responseTime,
    tokensUsed,
    model,
    cacheHit,
  });
}

export function logConversationError(
  conversationId: number,
  error: Error,
  metadata?: Record<string, any>
): void {
  conversationLogger.logEvent(ConversationEventType.ERROR, {
    conversationId,
    metadata: {
      ...metadata,
      error: error.message,
      stack: error.stack,
    },
    level: 'error',
  });
}

export function logRateLimit(userId: number, metadata?: Record<string, any>): void {
  conversationLogger.logEvent(ConversationEventType.RATE_LIMIT, {
    userId,
    metadata,
    level: 'warn',
  });
}

export function logUserRating(
  conversationId: number,
  messageId: number,
  userId: number,
  rating: number,
  feedback?: string
): void {
  conversationLogger.logUserFeedback({
    conversationId,
    messageId,
    userId,
    feedbackType: 'rating',
    rating,
    feedback,
  });
}

export function logUserReport(
  conversationId: number,
  messageId: number,
  userId: number,
  reportReason: string,
  feedback?: string
): void {
  conversationLogger.logUserFeedback({
    conversationId,
    messageId,
    userId,
    feedbackType: 'report',
    reportReason,
    feedback,
  });
}
