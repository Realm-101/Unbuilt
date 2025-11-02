import { db } from '../../db';
import { conversationMessages } from '@shared/schema';
import { eq, and, desc } from 'drizzle-orm';
import { securityLogger } from '../securityLogger';

export interface ModerationResult {
  approved: boolean;
  reason?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  categories: string[];
  requiresReview: boolean;
}

export interface ModerationContext {
  userId?: number;
  conversationId?: string;
  messageId?: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface ReportData {
  messageId: string;
  reportedBy: number;
  reason: string;
  category: 'inappropriate' | 'inaccurate' | 'harmful' | 'spam' | 'other';
  details?: string;
}

export interface FlaggedContent {
  id: string;
  messageId: string;
  conversationId: string;
  userId: number;
  content: string;
  flagReason: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'pending' | 'reviewed' | 'approved' | 'removed';
  reviewedBy?: number;
  reviewedAt?: Date;
  createdAt: Date;
}

/**
 * Content moderation service for conversation messages
 * Detects and blocks hate speech, harassment, and inappropriate content
 */
export class ContentModerator {
  private static instance: ContentModerator;

  // Hate speech and harassment patterns
  private readonly HATE_SPEECH_PATTERNS = [
    // Racial slurs and discrimination
    /\b(n[i1]gg[ae]r|ch[i1]nk|sp[i1]c|k[i1]ke|wetback|raghead)\b/gi,
    
    // Homophobic slurs
    /\b(f[a@]gg[o0]t|dyke|tr[a@]nny)\b/gi,
    
    // Sexist slurs
    /\b(b[i1]tch|wh[o0]re|sl[u\*]t|c[u\*]nt)\b/gi,
    
    // Religious discrimination
    /\b(terrorist|extremist)\s+(muslim|islam|arab)/gi,
    
    // General hate speech
    /\b(hate|despise|loathe)\s+(all\s+)?(blacks|whites|jews|muslims|christians|asians|latinos|gays|women|men)\b/gi,
  ];

  // Harassment patterns
  private readonly HARASSMENT_PATTERNS = [
    /\b(kill\s+yourself|kys|die\s+in\s+a\s+fire)\b/gi,
    /\b(you\s+should\s+(die|kill\s+yourself))\b/gi,
    /\b(worthless|pathetic|loser|idiot|moron|stupid)\s+(person|human|user)\b/gi,
    /\b(go\s+to\s+hell|burn\s+in\s+hell)\b/gi,
    /\b(threat|threaten|harm|hurt|attack)\s+(you|your\s+family)\b/gi,
  ];

  // Violence and threats
  private readonly VIOLENCE_PATTERNS = [
    /\b(bomb|explosion|terrorist\s+attack|mass\s+shooting)\b/gi,
    /\b(murder|assassinate|execute|eliminate)\s+(someone|people|person)\b/gi,
    /\b(weapon|gun|knife|explosive)\s+(to\s+)?(kill|harm|hurt)\b/gi,
    /\b(plan(ning)?\s+to\s+(kill|harm|attack))\b/gi,
  ];

  // Sexual content (inappropriate for business context)
  private readonly SEXUAL_CONTENT_PATTERNS = [
    /\b(porn|pornography|xxx|nsfw|explicit\s+content)\b/gi,
    /\b(sex(ual)?\s+(content|material|images))\b/gi,
    /\b(nude|naked|strip)\s+(photos?|images?|videos?)\b/gi,
  ];

  // Spam patterns
  private readonly SPAM_PATTERNS = [
    // Repeated URLs
    /(https?:\/\/[^\s]+){3,}/gi,
    
    // Excessive capitalization
    /\b[A-Z]{10,}\b/g,
    
    // Excessive punctuation
    /[!?]{5,}/g,
    
    // Cryptocurrency spam
    /\b(bitcoin|crypto|nft|token)\s+(giveaway|airdrop|free\s+money)\b/gi,
    
    // Get rich quick schemes
    /\b(make\s+\$\d+|earn\s+\$\d+)\s+(per\s+day|per\s+hour|fast|quickly)\b/gi,
  ];

  // Scam patterns
  private readonly SCAM_PATTERNS = [
    /\b(click\s+here|visit\s+now|limited\s+time|act\s+now)\b/gi,
    /\b(100%\s+guaranteed|risk\s+free|no\s+risk)\b/gi,
    /\b(send\s+money|wire\s+transfer|gift\s+card)\b/gi,
    /\b(nigerian\s+prince|inheritance|lottery\s+winner)\b/gi,
  ];

  // Self-harm patterns (require immediate attention)
  private readonly SELF_HARM_PATTERNS = [
    /\b(want\s+to\s+die|suicide|end\s+my\s+life|kill\s+myself)\b/gi,
    /\b(self\s+harm|cut\s+myself|hurt\s+myself)\b/gi,
    /\b(no\s+reason\s+to\s+live|life\s+is\s+not\s+worth)\b/gi,
  ];

  // Financial advice without disclaimers (flag for review)
  private readonly FINANCIAL_ADVICE_PATTERNS = [
    /\b(invest\s+in|buy\s+stock|sell\s+stock)\b/gi,
    /\b(guaranteed\s+return|sure\s+profit)\b/gi,
    /\b(insider\s+trading|pump\s+and\s+dump)\b/gi,
  ];

  public static getInstance(): ContentModerator {
    if (!ContentModerator.instance) {
      ContentModerator.instance = new ContentModerator();
    }
    return ContentModerator.instance;
  }

  /**
   * Moderate content for inappropriate material
   */
  async moderateContent(
    content: string,
    context: ModerationContext = {}
  ): Promise<ModerationResult> {
    const categories: string[] = [];
    let maxSeverity: 'low' | 'medium' | 'high' | 'critical' = 'low';
    let requiresReview = false;

    // Check for self-harm content (critical - requires immediate attention)
    const selfHarmCheck = this.checkPatterns(
      content,
      this.SELF_HARM_PATTERNS,
      'self_harm'
    );
    if (selfHarmCheck.detected) {
      categories.push('self_harm');
      maxSeverity = 'critical';
      requiresReview = true;
      
      // Log critical event
      await this.logModerationEvent(
        content,
        'self_harm',
        'critical',
        context,
        'Self-harm content detected - requires immediate attention'
      );
    }

    // Check for hate speech (critical)
    const hateSpeechCheck = this.checkPatterns(
      content,
      this.HATE_SPEECH_PATTERNS,
      'hate_speech'
    );
    if (hateSpeechCheck.detected) {
      categories.push('hate_speech');
      maxSeverity = 'critical';
      requiresReview = true;
    }

    // Check for harassment (high)
    const harassmentCheck = this.checkPatterns(
      content,
      this.HARASSMENT_PATTERNS,
      'harassment'
    );
    if (harassmentCheck.detected) {
      categories.push('harassment');
      if (maxSeverity !== 'critical') maxSeverity = 'high';
      requiresReview = true;
    }

    // Check for violence and threats (high)
    const violenceCheck = this.checkPatterns(
      content,
      this.VIOLENCE_PATTERNS,
      'violence'
    );
    if (violenceCheck.detected) {
      categories.push('violence');
      if (maxSeverity !== 'critical') maxSeverity = 'high';
      requiresReview = true;
    }

    // Check for sexual content (medium)
    const sexualCheck = this.checkPatterns(
      content,
      this.SEXUAL_CONTENT_PATTERNS,
      'sexual_content'
    );
    if (sexualCheck.detected) {
      categories.push('sexual_content');
      if (maxSeverity === 'low') maxSeverity = 'medium';
      requiresReview = true;
    }

    // Check for spam (medium)
    const spamCheck = this.checkPatterns(
      content,
      this.SPAM_PATTERNS,
      'spam'
    );
    if (spamCheck.detected) {
      categories.push('spam');
      if (maxSeverity === 'low') maxSeverity = 'medium';
    }

    // Check for scams (high)
    const scamCheck = this.checkPatterns(
      content,
      this.SCAM_PATTERNS,
      'scam'
    );
    if (scamCheck.detected) {
      categories.push('scam');
      if (maxSeverity !== 'critical') maxSeverity = 'high';
      requiresReview = true;
    }

    // Check for financial advice without disclaimers (low - informational)
    const financialCheck = this.checkPatterns(
      content,
      this.FINANCIAL_ADVICE_PATTERNS,
      'financial_advice'
    );
    if (financialCheck.detected) {
      categories.push('financial_advice');
      // Don't block, just flag for review
    }

    // Determine if content should be approved
    const approved = maxSeverity === 'low' || (maxSeverity === 'medium' && !requiresReview);

    // Log moderation event if content is blocked
    if (!approved) {
      await this.logModerationEvent(
        content,
        categories.join(', '),
        maxSeverity,
        context,
        `Content blocked: ${categories.join(', ')}`
      );
    }

    return {
      approved,
      reason: !approved ? `Content contains ${categories.join(', ')}` : undefined,
      severity: maxSeverity,
      categories,
      requiresReview
    };
  }

  /**
   * Check content against a set of patterns
   */
  private checkPatterns(
    content: string,
    patterns: RegExp[],
    category: string
  ): { detected: boolean } {
    for (const pattern of patterns) {
      if (pattern.test(content)) {
        pattern.lastIndex = 0; // Reset regex
        return { detected: true };
      }
    }
    return { detected: false };
  }

  /**
   * Report inappropriate content
   */
  async reportMessage(
    reportData: ReportData,
    context: ModerationContext = {}
  ): Promise<{ success: boolean; reportId?: string }> {
    try {
      // Get the message content
      const message = await db
        .select()
        .from(conversationMessages)
        .where(eq(conversationMessages.id, parseInt(reportData.messageId)))
        .limit(1)
        .then(results => results[0]);

      if (!message) {
        return { success: false };
      }

      // Log the report
      await securityLogger.logSecurityEvent(
        'SECURITY_VIOLATION',
        'message_reported',
        false,
        {
          userId: reportData.reportedBy,
          ipAddress: context.ipAddress,
          userAgent: context.userAgent,
          resource: 'conversation_message',
          resourceId: reportData.messageId,
          metadata: {
            reason: reportData.reason,
            category: reportData.category,
            details: reportData.details,
            messageContent: message.content.substring(0, 200),
            conversationId: message.conversationId
          }
        },
        `Message reported: ${reportData.category} - ${reportData.reason}`
      );

      // Create security alert for review
      await securityLogger.createSecurityAlert(
        'MALICIOUS_REQUEST',
        `Message reported for ${reportData.category}`,
        {
          userId: reportData.reportedBy,
          severity: this.getCategorySeverity(reportData.category),
          details: {
            messageId: reportData.messageId,
            conversationId: message.conversationId,
            category: reportData.category,
            reason: reportData.reason,
            details: reportData.details
          }
        }
      );

      console.log(`📢 Message reported`, {
        messageId: reportData.messageId,
        category: reportData.category,
        reportedBy: reportData.reportedBy
      });

      return {
        success: true,
        reportId: `report_${Date.now()}_${reportData.messageId}`
      };
    } catch (error) {
      console.error('Failed to report message:', error);
      return { success: false };
    }
  }

  /**
   * Get severity level for report category
   */
  private getCategorySeverity(
    category: 'inappropriate' | 'inaccurate' | 'harmful' | 'spam' | 'other'
  ): 'low' | 'medium' | 'high' | 'critical' {
    switch (category) {
      case 'harmful':
        return 'critical';
      case 'inappropriate':
        return 'high';
      case 'inaccurate':
        return 'medium';
      case 'spam':
        return 'medium';
      case 'other':
        return 'low';
      default:
        return 'low';
    }
  }

  /**
   * Get flagged content for admin review
   */
  async getFlaggedContent(
    filters: {
      status?: 'pending' | 'reviewed' | 'approved' | 'removed';
      severity?: 'low' | 'medium' | 'high' | 'critical';
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<FlaggedContent[]> {
    // This would query a flagged_content table in a real implementation
    // For now, return empty array as the table doesn't exist yet
    console.log('Getting flagged content with filters:', filters);
    return [];
  }

  /**
   * Review flagged content (admin action)
   */
  async reviewFlaggedContent(
    flagId: string,
    reviewedBy: number,
    action: 'approve' | 'remove',
    notes?: string
  ): Promise<{ success: boolean }> {
    try {
      // Log the review action
      await securityLogger.logSecurityEvent(
        'ADMIN_ACTION',
        'flagged_content_reviewed',
        true,
        {
          userId: reviewedBy,
          resource: 'flagged_content',
          resourceId: flagId,
          metadata: {
            action,
            notes
          }
        },
        `Flagged content ${action}d by admin`
      );

      console.log(`✅ Flagged content reviewed`, {
        flagId,
        action,
        reviewedBy
      });

      return { success: true };
    } catch (error) {
      console.error('Failed to review flagged content:', error);
      return { success: false };
    }
  }

  /**
   * Check if user has excessive reports (potential abuse)
   */
  async checkReportAbuse(userId: number): Promise<{
    isAbusive: boolean;
    reportCount: number;
  }> {
    // In a real implementation, this would query report history
    // For now, return non-abusive
    return {
      isAbusive: false,
      reportCount: 0
    };
  }

  /**
   * Log moderation event
   */
  private async logModerationEvent(
    content: string,
    category: string,
    severity: 'low' | 'medium' | 'high' | 'critical',
    context: ModerationContext,
    message: string
  ): Promise<void> {
    try {
      await securityLogger.logSecurityEvent(
        'SECURITY_VIOLATION',
        'content_moderation_violation',
        false,
        {
          userId: context.userId,
          ipAddress: context.ipAddress,
          userAgent: context.userAgent,
          resource: 'conversation_message',
          resourceId: context.messageId,
          metadata: {
            category,
            severity,
            contentLength: content.length,
            contentPreview: content.substring(0, 100),
            conversationId: context.conversationId
          }
        },
        message
      );

      console.warn(`🚨 Content moderation violation`, {
        userId: context.userId,
        conversationId: context.conversationId,
        category,
        severity
      });

      // Create alert for high/critical severity
      if (severity === 'high' || severity === 'critical') {
        await securityLogger.createSecurityAlert(
          'MALICIOUS_REQUEST',
          message,
          {
            userId: context.userId,
            ipAddress: context.ipAddress,
            severity,
            details: {
              category,
              conversationId: context.conversationId,
              messageId: context.messageId
            }
          }
        );
      }
    } catch (error) {
      console.error('Failed to log moderation event:', error);
    }
  }

  /**
   * Moderate user input before processing
   */
  async moderateUserInput(
    content: string,
    userId: number,
    context: ModerationContext = {}
  ): Promise<ModerationResult> {
    return this.moderateContent(content, {
      ...context,
      userId
    });
  }

  /**
   * Moderate AI response before sending to user
   */
  async moderateAIResponse(
    content: string,
    context: ModerationContext = {}
  ): Promise<ModerationResult> {
    // AI responses should have less strict moderation
    // Focus on harmful content and misinformation
    const categories: string[] = [];
    let maxSeverity: 'low' | 'medium' | 'high' | 'critical' = 'low';

    // Check for self-harm content
    const selfHarmCheck = this.checkPatterns(
      content,
      this.SELF_HARM_PATTERNS,
      'self_harm'
    );
    if (selfHarmCheck.detected) {
      categories.push('self_harm');
      maxSeverity = 'critical';
    }

    // Check for violence
    const violenceCheck = this.checkPatterns(
      content,
      this.VIOLENCE_PATTERNS,
      'violence'
    );
    if (violenceCheck.detected) {
      categories.push('violence');
      if (maxSeverity !== 'critical') maxSeverity = 'high';
    }

    return {
      approved: maxSeverity === 'low',
      reason: maxSeverity !== 'low' ? `AI response contains ${categories.join(', ')}` : undefined,
      severity: maxSeverity,
      categories,
      requiresReview: maxSeverity === 'high' || maxSeverity === 'critical'
    };
  }

  /**
   * Get moderation statistics for monitoring
   */
  async getModerationStats(
    timeRange: { start: Date; end: Date }
  ): Promise<{
    totalModerated: number;
    blocked: number;
    approved: number;
    bySeverity: Record<string, number>;
    byCategory: Record<string, number>;
  }> {
    // In a real implementation, this would query moderation logs
    // For now, return empty stats
    return {
      totalModerated: 0,
      blocked: 0,
      approved: 0,
      bySeverity: {},
      byCategory: {}
    };
  }
}

export const contentModerator = ContentModerator.getInstance();