import { securityLogger } from '../securityLogger';

export interface InjectionDetectionResult {
  isInjection: boolean;
  confidence: number; // 0-1
  detectedPatterns: string[];
  severity: 'low' | 'medium' | 'high' | 'critical';
  reason?: string;
}

export interface DetectionContext {
  userId?: number;
  conversationId?: string;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Prompt injection detection service
 * Detects attempts to manipulate AI behavior through malicious prompts
 */
export class PromptInjectionDetector {
  private static instance: PromptInjectionDetector;

  // System prompt override patterns
  private readonly SYSTEM_OVERRIDE_PATTERNS = [
    /ignore\s+(all\s+)?(previous|prior|above|earlier)\s+(instructions?|prompts?|commands?|directives?)/gi,
    /disregard\s+(all\s+)?(previous|prior|above|earlier)\s+(instructions?|prompts?|commands?)/gi,
    /forget\s+(all\s+)?(previous|prior|above|earlier)\s+(instructions?|prompts?|commands?)/gi,
    /override\s+(previous|system)\s+(instructions?|prompts?|settings?)/gi,
    /new\s+(instructions?|prompts?|system\s+prompt)/gi,
    /reset\s+(instructions?|prompts?|system)/gi,
    /clear\s+(previous|all)\s+(instructions?|prompts?|memory)/gi,
  ];

  // Role-switching patterns
  private readonly ROLE_SWITCHING_PATTERNS = [
    /you\s+are\s+now\s+(a|an)\s+\w+/gi,
    /act\s+as\s+(a|an)\s+\w+/gi,
    /pretend\s+(to\s+be|you\s+are)\s+(a|an)?\s*\w+/gi,
    /roleplay\s+as\s+(a|an)\s+\w+/gi,
    /simulate\s+(a|an)\s+\w+/gi,
    /behave\s+(like|as)\s+(a|an)\s+\w+/gi,
    /from\s+now\s+on,?\s+you\s+(are|will\s+be)\s+/gi,
  ];

  // Jailbreak patterns
  private readonly JAILBREAK_PATTERNS = [
    /jailbreak/gi,
    /DAN\s+mode/gi,
    /developer\s+mode/gi,
    /god\s+mode/gi,
    /admin\s+mode/gi,
    /unrestricted\s+mode/gi,
    /bypass\s+(restrictions?|filters?|safety)/gi,
    /disable\s+(safety|filters?|restrictions?)/gi,
    /remove\s+(safety|filters?|restrictions?|limitations?)/gi,
  ];

  // Instruction injection patterns
  private readonly INSTRUCTION_INJECTION_PATTERNS = [
    /\[system\]/gi,
    /\[\/system\]/gi,
    /\[assistant\]/gi,
    /\[\/assistant\]/gi,
    /\[user\]/gi,
    /\[\/user\]/gi,
    /<\|system\|>/gi,
    /<\|assistant\|>/gi,
    /<\|user\|>/gi,
    /###\s*system/gi,
    /###\s*assistant/gi,
    /###\s*instruction/gi,
  ];

  // Delimiter manipulation patterns
  private readonly DELIMITER_PATTERNS = [
    /```system/gi,
    /```instruction/gi,
    /```prompt/gi,
    /---\s*system/gi,
    /---\s*instruction/gi,
    /===\s*system/gi,
    /===\s*instruction/gi,
  ];

  // Context manipulation patterns
  private readonly CONTEXT_MANIPULATION_PATTERNS = [
    /the\s+(above|previous)\s+(text|content|message)\s+(is|was)\s+(fake|false|incorrect|wrong)/gi,
    /everything\s+(above|before)\s+this\s+(is|was)\s+(fake|false|test)/gi,
    /ignore\s+everything\s+(above|before|prior)/gi,
    /disregard\s+the\s+(context|conversation|history)/gi,
  ];

  // Encoding/obfuscation attempts
  private readonly OBFUSCATION_PATTERNS = [
    /\\x[0-9a-f]{2}/gi, // Hex encoding
    /\\u[0-9a-f]{4}/gi, // Unicode encoding
    /&#\d+;/gi, // HTML entities
    /base64/gi,
    /rot13/gi,
    /\\[nrt]/g, // Escape sequences
  ];

  public static getInstance(): PromptInjectionDetector {
    if (!PromptInjectionDetector.instance) {
      PromptInjectionDetector.instance = new PromptInjectionDetector();
    }
    return PromptInjectionDetector.instance;
  }

  /**
   * Detect prompt injection attempts in user input
   */
  async detectInjection(
    input: string,
    context: DetectionContext = {}
  ): Promise<InjectionDetectionResult> {
    const detectedPatterns: string[] = [];
    let maxSeverity: 'low' | 'medium' | 'high' | 'critical' = 'low';
    let totalScore = 0;

    // Check system override patterns (Critical)
    const systemOverride = this.checkPatterns(
      input,
      this.SYSTEM_OVERRIDE_PATTERNS,
      'system_override'
    );
    if (systemOverride.detected) {
      detectedPatterns.push(...systemOverride.patterns);
      totalScore += 0.9;
      maxSeverity = 'critical';
    }

    // Check role-switching patterns (High)
    const roleSwitching = this.checkPatterns(
      input,
      this.ROLE_SWITCHING_PATTERNS,
      'role_switching'
    );
    if (roleSwitching.detected) {
      detectedPatterns.push(...roleSwitching.patterns);
      totalScore += 0.8;
      if (maxSeverity !== 'critical') maxSeverity = 'high';
    }

    // Check jailbreak patterns (Critical)
    const jailbreak = this.checkPatterns(
      input,
      this.JAILBREAK_PATTERNS,
      'jailbreak'
    );
    if (jailbreak.detected) {
      detectedPatterns.push(...jailbreak.patterns);
      totalScore += 1.0;
      maxSeverity = 'critical';
    }

    // Check instruction injection patterns (High)
    const instructionInjection = this.checkPatterns(
      input,
      this.INSTRUCTION_INJECTION_PATTERNS,
      'instruction_injection'
    );
    if (instructionInjection.detected) {
      detectedPatterns.push(...instructionInjection.patterns);
      totalScore += 0.85;
      if (maxSeverity !== 'critical') maxSeverity = 'high';
    }

    // Check delimiter manipulation (Medium)
    const delimiterManip = this.checkPatterns(
      input,
      this.DELIMITER_PATTERNS,
      'delimiter_manipulation'
    );
    if (delimiterManip.detected) {
      detectedPatterns.push(...delimiterManip.patterns);
      totalScore += 0.6;
      if (maxSeverity === 'low') maxSeverity = 'medium';
    }

    // Check context manipulation (Medium)
    const contextManip = this.checkPatterns(
      input,
      this.CONTEXT_MANIPULATION_PATTERNS,
      'context_manipulation'
    );
    if (contextManip.detected) {
      detectedPatterns.push(...contextManip.patterns);
      totalScore += 0.7;
      if (maxSeverity === 'low') maxSeverity = 'medium';
    }

    // Check obfuscation attempts (Medium)
    const obfuscation = this.checkPatterns(
      input,
      this.OBFUSCATION_PATTERNS,
      'obfuscation'
    );
    if (obfuscation.detected) {
      detectedPatterns.push(...obfuscation.patterns);
      totalScore += 0.5;
      if (maxSeverity === 'low') maxSeverity = 'medium';
    }

    // Calculate confidence (cap at 1.0)
    const confidence = Math.min(totalScore, 1.0);
    const isInjection = confidence > 0.5 || detectedPatterns.length > 0;

    // Log if injection detected
    if (isInjection) {
      await this.logInjectionAttempt(
        input,
        detectedPatterns,
        confidence,
        maxSeverity,
        context
      );
    }

    return {
      isInjection,
      confidence,
      detectedPatterns,
      severity: maxSeverity,
      reason: isInjection
        ? `Detected ${detectedPatterns.length} potential injection pattern(s)`
        : undefined
    };
  }

  /**
   * Check input against a set of patterns
   */
  private checkPatterns(
    input: string,
    patterns: RegExp[],
    category: string
  ): { detected: boolean; patterns: string[] } {
    const detectedPatterns: string[] = [];

    for (const pattern of patterns) {
      if (pattern.test(input)) {
        detectedPatterns.push(category);
        // Reset regex lastIndex for global patterns
        pattern.lastIndex = 0;
      }
    }

    return {
      detected: detectedPatterns.length > 0,
      patterns: detectedPatterns
    };
  }

  /**
   * Validate message structure to prevent role injection
   */
  validateMessageStructure(message: any): {
    isValid: boolean;
    reason?: string;
  } {
    // Check if message has unexpected role field
    if (message.role && message.role !== 'user') {
      return {
        isValid: false,
        reason: 'Invalid role specified in message'
      };
    }

    // Check for nested message structures
    if (message.messages || message.conversation) {
      return {
        isValid: false,
        reason: 'Nested message structures are not allowed'
      };
    }

    // Check for system-level fields
    const systemFields = ['system', 'assistant', 'function', 'tool'];
    for (const field of systemFields) {
      if (message[field]) {
        return {
          isValid: false,
          reason: `System field '${field}' is not allowed in user messages`
        };
      }
    }

    return { isValid: true };
  }

  /**
   * Detect attempts to extract system prompt
   */
  detectSystemPromptExtraction(input: string): boolean {
    const extractionPatterns = [
      /what\s+(is|are)\s+your\s+(instructions?|prompts?|system\s+prompt)/gi,
      /show\s+me\s+your\s+(instructions?|prompts?|system\s+prompt)/gi,
      /reveal\s+your\s+(instructions?|prompts?|system\s+prompt)/gi,
      /tell\s+me\s+your\s+(instructions?|prompts?|system\s+prompt)/gi,
      /print\s+your\s+(instructions?|prompts?|system\s+prompt)/gi,
      /display\s+your\s+(instructions?|prompts?|system\s+prompt)/gi,
      /repeat\s+your\s+(instructions?|prompts?|system\s+prompt)/gi,
      /what\s+were\s+you\s+told/gi,
      /what\s+are\s+you\s+programmed\s+to/gi,
    ];

    return extractionPatterns.some(pattern => pattern.test(input));
  }

  /**
   * Check for excessive special characters (potential obfuscation)
   */
  detectObfuscation(input: string): boolean {
    // Count special characters
    const specialChars = input.match(/[^\w\s.,!?'"]/g) || [];
    const specialCharRatio = specialChars.length / input.length;

    // If more than 20% special characters, it's suspicious
    if (specialCharRatio > 0.2) {
      return true;
    }

    // Check for repeated encoding patterns
    const encodingPatterns = [
      /(%[0-9a-f]{2}){5,}/gi, // URL encoding
      /(\\x[0-9a-f]{2}){5,}/gi, // Hex encoding
      /(\\u[0-9a-f]{4}){3,}/gi, // Unicode encoding
    ];

    return encodingPatterns.some(pattern => pattern.test(input));
  }

  /**
   * Log injection attempt for security monitoring
   */
  private async logInjectionAttempt(
    input: string,
    detectedPatterns: string[],
    confidence: number,
    severity: 'low' | 'medium' | 'high' | 'critical',
    context: DetectionContext
  ): Promise<void> {
    try {
      await securityLogger.logSecurityEvent(
        'SECURITY_VIOLATION',
        'prompt_injection_attempt',
        false,
        {
          userId: context.userId,
          ipAddress: context.ipAddress,
          userAgent: context.userAgent,
          resource: 'conversation_message',
          resourceId: context.conversationId,
          metadata: {
            detectedPatterns,
            confidence,
            severity,
            inputLength: input.length,
            inputPreview: input.substring(0, 150) // Log first 150 chars
          }
        },
        `Prompt injection detected: ${detectedPatterns.join(', ')}`
      );

      console.warn(`🚨 Prompt injection attempt detected`, {
        userId: context.userId,
        conversationId: context.conversationId,
        patterns: detectedPatterns,
        confidence,
        severity
      });

      // Create security alert for high/critical severity
      if (severity === 'high' || severity === 'critical') {
        await securityLogger.createSecurityAlert(
          'MALICIOUS_REQUEST',
          `Prompt injection attempt detected with ${confidence.toFixed(2)} confidence`,
          {
            userId: context.userId,
            ipAddress: context.ipAddress,
            severity,
            details: {
              detectedPatterns,
              confidence,
              conversationId: context.conversationId
            }
          }
        );
      }
    } catch (error) {
      console.error('Failed to log injection attempt:', error);
    }
  }

  /**
   * Analyze input for suspicious patterns (comprehensive check)
   */
  async analyzeInput(
    input: string,
    context: DetectionContext = {}
  ): Promise<{
    isSafe: boolean;
    issues: string[];
    severity: 'low' | 'medium' | 'high' | 'critical';
  }> {
    const issues: string[] = [];
    let maxSeverity: 'low' | 'medium' | 'high' | 'critical' = 'low';

    // Check for injection
    const injectionResult = await this.detectInjection(input, context);
    if (injectionResult.isInjection) {
      issues.push('Prompt injection detected');
      maxSeverity = injectionResult.severity;
    }

    // Check for system prompt extraction
    if (this.detectSystemPromptExtraction(input)) {
      issues.push('System prompt extraction attempt');
      if (maxSeverity === 'low') maxSeverity = 'medium';
    }

    // Check for obfuscation
    if (this.detectObfuscation(input)) {
      issues.push('Obfuscation detected');
      if (maxSeverity === 'low') maxSeverity = 'medium';
    }

    return {
      isSafe: issues.length === 0,
      issues,
      severity: maxSeverity
    };
  }
}

export const promptInjectionDetector = PromptInjectionDetector.getInstance();
