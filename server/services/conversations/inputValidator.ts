import { securityLogger } from '../securityLogger';

export interface ValidationResult {
  isValid: boolean;
  sanitized: string;
  reason?: string;
  severity?: 'low' | 'medium' | 'high';
}

export interface ValidationContext {
  userId?: number;
  conversationId?: string;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Input validation and sanitization service for conversation messages
 * Implements security measures to prevent malicious input and ensure data quality
 */
export class InputValidator {
  private static instance: InputValidator;

  // Configuration
  private readonly MAX_MESSAGE_LENGTH_FREE = 500;
  private readonly MAX_MESSAGE_LENGTH_PRO = 1000;
  private readonly MAX_MESSAGE_LENGTH_ENTERPRISE = 2000;

  // Malicious patterns to detect (after HTML sanitization)
  private readonly MALICIOUS_PATTERNS = [
    // SQL injection attempts
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE)\b.*\b(FROM|INTO|TABLE|DATABASE)\b)/gi,
    
    // Script injection (javascript: protocol)
    /javascript:/gi,
    
    // Command injection (shell metacharacters in suspicious contexts)
    /[;&|`]\s*\w+/g, // Semicolon, pipe, backtick followed by command
    
    // Path traversal
    /\.\.[\/\\]/g,
    
    // Null bytes
    /\0/g,
    
    // Excessive special characters (potential obfuscation)
    /[^\w\s.,!?'"@#$%^&*()_+\-=[\]{};:'",.<>/?\\|`~]{10,}/g,
  ];

  // Event handler pattern (checked before HTML sanitization)
  private readonly EVENT_HANDLER_PATTERN = /on\w+\s*=/gi;

  // HTML tags to remove
  private readonly HTML_TAG_PATTERN = /<[^>]*>/g;

  // Suspicious keywords that might indicate prompt injection
  private readonly SUSPICIOUS_KEYWORDS = [
    'ignore previous',
    'ignore all previous',
    'disregard previous',
    'forget previous',
    'new instructions',
    'system prompt',
    'you are now',
    'act as',
    'pretend to be',
    'roleplay as',
    'simulate',
    'jailbreak',
    'DAN mode',
    'developer mode',
  ];

  public static getInstance(): InputValidator {
    if (!InputValidator.instance) {
      InputValidator.instance = new InputValidator();
    }
    return InputValidator.instance;
  }

  /**
   * Validate and sanitize user input
   */
  async validateUserInput(
    message: string,
    userTier: 'free' | 'pro' | 'enterprise',
    context: ValidationContext = {}
  ): Promise<ValidationResult> {
    // Check if message is empty
    if (!message || message.trim().length === 0) {
      return {
        isValid: false,
        sanitized: '',
        reason: 'Message cannot be empty',
        severity: 'low'
      };
    }

    // Check message length based on tier
    const maxLength = this.getMaxLength(userTier);
    if (message.length > maxLength) {
      return {
        isValid: false,
        sanitized: message.substring(0, maxLength),
        reason: `Message exceeds maximum length of ${maxLength} characters for ${userTier} tier`,
        severity: 'low'
      };
    }

    // Check for event handlers BEFORE sanitization (high severity attack)
    const eventHandlerCheck = this.detectEventHandlers(message, context);
    if (!eventHandlerCheck.isValid) {
      return eventHandlerCheck;
    }

    // Check for script tags BEFORE sanitization
    const scriptCheck = this.detectScriptTags(message, context);
    if (!scriptCheck.isValid) {
      return scriptCheck;
    }

    // Sanitize HTML tags
    let sanitized = this.removeHtmlTags(message);

    // Check for malicious patterns in sanitized text
    const maliciousCheck = this.detectMaliciousPatterns(sanitized, context);
    if (!maliciousCheck.isValid) {
      return maliciousCheck;
    }

    // Check for suspicious keywords (potential prompt injection)
    const suspiciousCheck = this.detectSuspiciousKeywords(sanitized, context);
    if (!suspiciousCheck.isValid) {
      return suspiciousCheck;
    }

    // Remove excessive whitespace
    sanitized = this.normalizeWhitespace(sanitized);

    // Final validation
    if (sanitized.trim().length === 0) {
      return {
        isValid: false,
        sanitized: '',
        reason: 'Message contains no valid content after sanitization',
        severity: 'low'
      };
    }

    return {
      isValid: true,
      sanitized: sanitized.trim()
    };
  }

  /**
   * Get maximum message length based on user tier
   */
  private getMaxLength(tier: 'free' | 'pro' | 'enterprise'): number {
    switch (tier) {
      case 'free':
        return this.MAX_MESSAGE_LENGTH_FREE;
      case 'pro':
        return this.MAX_MESSAGE_LENGTH_PRO;
      case 'enterprise':
        return this.MAX_MESSAGE_LENGTH_ENTERPRISE;
      default:
        return this.MAX_MESSAGE_LENGTH_FREE;
    }
  }

  /**
   * Remove HTML tags from input
   */
  private removeHtmlTags(input: string): string {
    return input.replace(this.HTML_TAG_PATTERN, '');
  }

  /**
   * Detect event handlers in input (before HTML sanitization)
   */
  private detectEventHandlers(
    input: string,
    context: ValidationContext
  ): ValidationResult {
    if (this.EVENT_HANDLER_PATTERN.test(input)) {
      // Log security event
      this.logSecurityViolation(
        'event_handler_detected',
        input,
        context,
        'high'
      );

      return {
        isValid: false,
        sanitized: '',
        reason: 'Message contains potentially malicious content',
        severity: 'high'
      };
    }

    return {
      isValid: true,
      sanitized: input
    };
  }

  /**
   * Detect script tags in input (before HTML sanitization)
   * Only reject if the message is primarily malicious content
   */
  private detectScriptTags(
    input: string,
    context: ValidationContext
  ): ValidationResult {
    const scriptPattern = /<script[^>]*>.*?<\/script>/gi;
    
    if (scriptPattern.test(input)) {
      // Remove HTML tags to see what legitimate content remains
      const withoutHtml = this.removeHtmlTags(input);
      const withoutScriptContent = input.replace(scriptPattern, '').trim();
      
      // If there's very little legitimate content outside the script tags, it's likely an attack
      // Check both: content after removing all HTML, and content outside script tags
      if (withoutHtml.trim().length < 10 || withoutScriptContent.length < 10) {
        // Log security event
        this.logSecurityViolation(
          'script_tag_detected',
          input,
          context,
          'high'
        );

        return {
          isValid: false,
          sanitized: '',
          reason: 'Message contains potentially malicious content',
          severity: 'high'
        };
      }
    }

    return {
      isValid: true,
      sanitized: input
    };
  }

  /**
   * Detect malicious patterns in input
   */
  private detectMaliciousPatterns(
    input: string,
    context: ValidationContext
  ): ValidationResult {
    for (const pattern of this.MALICIOUS_PATTERNS) {
      if (pattern.test(input)) {
        // Log security event
        this.logSecurityViolation(
          'malicious_pattern_detected',
          input,
          context,
          'high'
        );

        return {
          isValid: false,
          sanitized: '',
          reason: 'Message contains potentially malicious content',
          severity: 'high'
        };
      }
    }

    return {
      isValid: true,
      sanitized: input
    };
  }

  /**
   * Detect suspicious keywords that might indicate prompt injection
   */
  private detectSuspiciousKeywords(
    input: string,
    context: ValidationContext
  ): ValidationResult {
    const lowerInput = input.toLowerCase();

    for (const keyword of this.SUSPICIOUS_KEYWORDS) {
      if (lowerInput.includes(keyword.toLowerCase())) {
        // Log security event
        this.logSecurityViolation(
          'suspicious_keyword_detected',
          input,
          context,
          'medium',
          { keyword }
        );

        return {
          isValid: false,
          sanitized: '',
          reason: 'Message contains suspicious content that may attempt to manipulate the AI',
          severity: 'medium'
        };
      }
    }

    return {
      isValid: true,
      sanitized: input
    };
  }

  /**
   * Normalize whitespace in input
   */
  private normalizeWhitespace(input: string): string {
    // Split by newlines to preserve them
    const lines = input.split('\n');
    
    // Normalize spaces within each line
    const normalizedLines = lines.map(line => line.replace(/\s+/g, ' ').trim());
    
    // Join back with newlines and replace multiple consecutive newlines with double newline
    let normalized = normalizedLines.join('\n');
    normalized = normalized.replace(/\n{3,}/g, '\n\n');
    
    return normalized;
  }

  /**
   * Log security violation
   */
  private async logSecurityViolation(
    violationType: string,
    input: string,
    context: ValidationContext,
    severity: 'low' | 'medium' | 'high',
    metadata?: Record<string, any>
  ): Promise<void> {
    try {
      await securityLogger.logSecurityEvent(
        'SECURITY_VIOLATION',
        `conversation_input_${violationType}`,
        false,
        {
          userId: context.userId,
          ipAddress: context.ipAddress,
          userAgent: context.userAgent,
          resource: 'conversation_message',
          resourceId: context.conversationId,
          metadata: {
            violationType,
            inputLength: input.length,
            inputPreview: input.substring(0, 100), // Only log first 100 chars
            severity,
            ...metadata
          }
        },
        `Input validation failed: ${violationType}`
      );

      console.warn(`🚨 Input validation violation: ${violationType}`, {
        userId: context.userId,
        conversationId: context.conversationId,
        severity
      });
    } catch (error) {
      console.error('Failed to log security violation:', error);
    }
  }

  /**
   * Validate message structure (for API requests)
   */
  validateMessageStructure(data: any): {
    isValid: boolean;
    error?: string;
  } {
    if (!data || typeof data !== 'object') {
      return {
        isValid: false,
        error: 'Invalid message structure'
      };
    }

    if (!data.content || typeof data.content !== 'string') {
      return {
        isValid: false,
        error: 'Message content is required and must be a string'
      };
    }

    return { isValid: true };
  }

  /**
   * Check if input contains excessive repetition (potential spam)
   */
  detectExcessiveRepetition(input: string): boolean {
    // Check for repeated characters
    const repeatedChars = /(.)\1{10,}/g;
    if (repeatedChars.test(input)) {
      return true;
    }

    // Check for repeated words
    const words = input.toLowerCase().split(/\s+/);
    const wordCounts = new Map<string, number>();
    
    for (const word of words) {
      if (word.length > 3) { // Only check words longer than 3 chars
        wordCounts.set(word, (wordCounts.get(word) || 0) + 1);
      }
    }

    // If any word appears more than 30% of the time, it's suspicious
    const totalWords = words.filter(w => w.length > 3).length;
    for (const count of wordCounts.values()) {
      if (count / totalWords > 0.3) {
        return true;
      }
    }

    return false;
  }

  /**
   * Sanitize output for display (escape special characters)
   */
  sanitizeForDisplay(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
  }
}

export const inputValidator = InputValidator.getInstance();
