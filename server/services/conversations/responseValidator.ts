import { securityLogger } from '../securityLogger';

export interface ResponseValidationResult {
  isValid: boolean;
  issues: string[];
  severity: 'low' | 'medium' | 'high';
  requiresReview: boolean;
  sanitized?: string;
}

export interface ValidationContext {
  userId?: number;
  conversationId?: string;
  messageId?: string;
  userQuery?: string;
}

/**
 * Response validation service for AI-generated content
 * Ensures AI responses are safe, appropriate, and include necessary disclaimers
 */
export class ResponseValidator {
  private static instance: ResponseValidator;

  // Financial advice patterns that require disclaimers
  private readonly FINANCIAL_ADVICE_PATTERNS = [
    /invest(ment)?s?/gi,
    /stock(s)?/gi,
    /portfolio/gi,
    /return(s)?\s+on\s+investment/gi,
    /ROI/gi,
    /profit(s)?/gi,
    /revenue\s+projection(s)?/gi,
    /financial\s+forecast/gi,
    /valuation/gi,
    /funding\s+round/gi,
    /venture\s+capital/gi,
    /IPO/gi,
  ];

  // Legal advice patterns that require disclaimers
  private readonly LEGAL_ADVICE_PATTERNS = [
    /legal(ly)?/gi,
    /law(s)?/gi,
    /regulation(s)?/gi,
    /compliance/gi,
    /contract(s)?/gi,
    /liability/gi,
    /intellectual\s+property/gi,
    /patent(s)?/gi,
    /trademark(s)?/gi,
    /copyright/gi,
    /license/gi,
  ];

  // Medical advice patterns (should be blocked)
  private readonly MEDICAL_ADVICE_PATTERNS = [
    /diagnos(is|e)/gi,
    /treatment/gi,
    /medication/gi,
    /prescription/gi,
    /symptom(s)?/gi,
    /disease/gi,
    /medical\s+condition/gi,
  ];

  // Required disclaimer phrases
  private readonly FINANCIAL_DISCLAIMER_PHRASES = [
    'not financial advice',
    'consult a financial advisor',
    'consult with a financial professional',
    'seek professional financial advice',
    'disclaimer',
  ];

  private readonly LEGAL_DISCLAIMER_PHRASES = [
    'not legal advice',
    'consult a lawyer',
    'consult an attorney',
    'seek legal counsel',
    'legal professional',
  ];

  // Inappropriate content patterns
  private readonly INAPPROPRIATE_PATTERNS = [
    /\b(hate|racist|sexist|discriminat(e|ion))\b/gi,
    /\b(violence|violent|harm|hurt|kill)\b/gi,
    /\b(explicit|nsfw|adult\s+content)\b/gi,
  ];

  // Misinformation indicators
  private readonly MISINFORMATION_INDICATORS = [
    /100%\s+(guaranteed|certain|sure)/gi,
    /always\s+works/gi,
    /never\s+fails/gi,
    /guaranteed\s+success/gi,
    /risk-free/gi,
    /no\s+risk/gi,
    /instant\s+results/gi,
  ];

  // Confidence indicators that should be present
  private readonly CONFIDENCE_PHRASES = [
    'based on',
    'according to',
    'research suggests',
    'data shows',
    'studies indicate',
    'evidence suggests',
    'typically',
    'generally',
    'often',
    'may',
    'might',
    'could',
    'potentially',
  ];

  public static getInstance(): ResponseValidator {
    if (!ResponseValidator.instance) {
      ResponseValidator.instance = new ResponseValidator();
    }
    return ResponseValidator.instance;
  }

  /**
   * Validate AI response for safety and appropriateness
   */
  async validateResponse(
    response: string,
    context: ValidationContext = {}
  ): Promise<ResponseValidationResult> {
    const issues: string[] = [];
    let maxSeverity: 'low' | 'medium' | 'high' = 'low';
    let requiresReview = false;

    // Check for inappropriate content
    const inappropriateCheck = this.checkInappropriateContent(response);
    if (!inappropriateCheck.isValid) {
      issues.push(...inappropriateCheck.issues);
      maxSeverity = 'high';
      requiresReview = true;
    }

    // Check for medical advice (should be blocked)
    const medicalCheck = this.checkMedicalAdvice(response);
    if (!medicalCheck.isValid) {
      issues.push(...medicalCheck.issues);
      maxSeverity = 'high';
      requiresReview = true;
    }

    // Check for financial advice without disclaimers
    const financialCheck = this.checkFinancialAdvice(response);
    if (!financialCheck.isValid) {
      issues.push(...financialCheck.issues);
      if (maxSeverity !== 'high') maxSeverity = 'medium';
      requiresReview = true;
    }

    // Check for legal advice without disclaimers
    const legalCheck = this.checkLegalAdvice(response);
    if (!legalCheck.isValid) {
      issues.push(...legalCheck.issues);
      if (maxSeverity !== 'high') maxSeverity = 'medium';
      requiresReview = true;
    }

    // Check for misinformation indicators
    const misinfoCheck = this.checkMisinformation(response);
    if (!misinfoCheck.isValid) {
      issues.push(...misinfoCheck.issues);
      if (maxSeverity === 'low') maxSeverity = 'medium';
    }

    // Check for appropriate confidence indicators
    const confidenceCheck = this.checkConfidenceIndicators(response);
    if (!confidenceCheck.isValid) {
      issues.push(...confidenceCheck.issues);
      // This is informational, doesn't increase severity
    }

    // Log validation issues
    if (issues.length > 0) {
      await this.logValidationIssues(response, issues, maxSeverity, context);
    }

    return {
      isValid: issues.length === 0 || maxSeverity === 'low',
      issues,
      severity: maxSeverity,
      requiresReview,
      sanitized: response // Could implement sanitization if needed
    };
  }

  /**
   * Check for inappropriate content
   */
  private checkInappropriateContent(response: string): {
    isValid: boolean;
    issues: string[];
  } {
    const issues: string[] = [];

    for (const pattern of this.INAPPROPRIATE_PATTERNS) {
      if (pattern.test(response)) {
        issues.push('Response contains potentially inappropriate content');
        pattern.lastIndex = 0; // Reset regex
        break; // Only report once
      }
    }

    return {
      isValid: issues.length === 0,
      issues
    };
  }

  /**
   * Check for medical advice (should not be provided)
   */
  private checkMedicalAdvice(response: string): {
    isValid: boolean;
    issues: string[];
  } {
    const issues: string[] = [];
    let medicalTermCount = 0;

    for (const pattern of this.MEDICAL_ADVICE_PATTERNS) {
      if (pattern.test(response)) {
        medicalTermCount++;
        pattern.lastIndex = 0;
      }
    }

    // If multiple medical terms, it's likely medical advice
    if (medicalTermCount >= 2) {
      issues.push('Response appears to provide medical advice, which is not allowed');
    }

    return {
      isValid: issues.length === 0,
      issues
    };
  }

  /**
   * Check for financial advice and required disclaimers
   */
  private checkFinancialAdvice(response: string): {
    isValid: boolean;
    issues: string[];
  } {
    const issues: string[] = [];
    let financialTermCount = 0;

    // Count financial terms
    for (const pattern of this.FINANCIAL_ADVICE_PATTERNS) {
      if (pattern.test(response)) {
        financialTermCount++;
        pattern.lastIndex = 0;
      }
    }

    // If financial advice is being given, check for disclaimers
    if (financialTermCount >= 2) {
      const hasDisclaimer = this.FINANCIAL_DISCLAIMER_PHRASES.some(phrase =>
        response.toLowerCase().includes(phrase.toLowerCase())
      );

      if (!hasDisclaimer) {
        issues.push('Financial advice provided without appropriate disclaimer');
      }
    }

    return {
      isValid: issues.length === 0,
      issues
    };
  }

  /**
   * Check for legal advice and required disclaimers
   */
  private checkLegalAdvice(response: string): {
    isValid: boolean;
    issues: string[];
  } {
    const issues: string[] = [];
    let legalTermCount = 0;

    // Count legal terms
    for (const pattern of this.LEGAL_ADVICE_PATTERNS) {
      if (pattern.test(response)) {
        legalTermCount++;
        pattern.lastIndex = 0;
      }
    }

    // If legal advice is being given, check for disclaimers
    if (legalTermCount >= 2) {
      const hasDisclaimer = this.LEGAL_DISCLAIMER_PHRASES.some(phrase =>
        response.toLowerCase().includes(phrase.toLowerCase())
      );

      if (!hasDisclaimer) {
        issues.push('Legal advice provided without appropriate disclaimer');
      }
    }

    return {
      isValid: issues.length === 0,
      issues
    };
  }

  /**
   * Check for misinformation indicators
   */
  private checkMisinformation(response: string): {
    isValid: boolean;
    issues: string[];
  } {
    const issues: string[] = [];

    for (const pattern of this.MISINFORMATION_INDICATORS) {
      if (pattern.test(response)) {
        issues.push('Response contains absolute claims that may be misleading');
        pattern.lastIndex = 0;
        break; // Only report once
      }
    }

    return {
      isValid: issues.length === 0,
      issues
    };
  }

  /**
   * Check for appropriate confidence indicators
   */
  private checkConfidenceIndicators(response: string): {
    isValid: boolean;
    issues: string[];
  } {
    const issues: string[] = [];
    const responseLower = response.toLowerCase();

    // Check if response makes claims without confidence indicators
    const hasConfidenceIndicators = this.CONFIDENCE_PHRASES.some(phrase =>
      responseLower.includes(phrase.toLowerCase())
    );

    // Only flag if response is making specific claims (contains numbers or specific facts)
    const hasSpecificClaims = /\d+%|\$\d+|specific|exact|precise/.test(response);

    if (hasSpecificClaims && !hasConfidenceIndicators && response.length > 200) {
      issues.push('Response makes specific claims without confidence indicators');
    }

    return {
      isValid: issues.length === 0,
      issues
    };
  }

  /**
   * Validate response length and structure
   */
  validateResponseStructure(response: string): {
    isValid: boolean;
    issues: string[];
  } {
    const issues: string[] = [];

    // Check minimum length
    if (response.length < 10) {
      issues.push('Response is too short');
    }

    // Check maximum length (should be reasonable)
    if (response.length > 5000) {
      issues.push('Response is excessively long');
    }

    // Check for empty or whitespace-only response
    if (response.trim().length === 0) {
      issues.push('Response is empty');
    }

    return {
      isValid: issues.length === 0,
      issues
    };
  }

  /**
   * Check if response is relevant to the user's query
   */
  checkRelevance(response: string, userQuery: string): {
    isRelevant: boolean;
    confidence: number;
  } {
    // Simple relevance check based on keyword overlap
    const queryWords = userQuery.toLowerCase().split(/\s+/).filter(w => w.length > 3);
    const responseWords = response.toLowerCase().split(/\s+/);

    let matchCount = 0;
    for (const word of queryWords) {
      if (responseWords.includes(word)) {
        matchCount++;
      }
    }

    const relevanceScore = queryWords.length > 0 ? matchCount / queryWords.length : 0;

    return {
      isRelevant: relevanceScore > 0.2, // At least 20% keyword overlap
      confidence: relevanceScore
    };
  }

  /**
   * Detect if response contains hallucinated information
   */
  detectHallucination(response: string): {
    likelyHallucination: boolean;
    indicators: string[];
  } {
    const indicators: string[] = [];

    // Check for overly specific claims without sources
    if (/\d{4}-\d{2}-\d{2}/.test(response)) {
      indicators.push('Contains specific dates without sources');
    }

    // Check for exact statistics without attribution
    if (/\d+\.\d+%/.test(response) && !/according to|based on|source/.test(response.toLowerCase())) {
      indicators.push('Contains precise statistics without attribution');
    }

    // Check for specific names without context
    if (/CEO|founder|president/i.test(response) && !/company|organization/.test(response.toLowerCase())) {
      indicators.push('Mentions specific roles without context');
    }

    return {
      likelyHallucination: indicators.length >= 2,
      indicators
    };
  }

  /**
   * Log validation issues for monitoring
   */
  private async logValidationIssues(
    response: string,
    issues: string[],
    severity: 'low' | 'medium' | 'high',
    context: ValidationContext
  ): Promise<void> {
    try {
      await securityLogger.logSecurityEvent(
        'SECURITY_VIOLATION',
        'response_validation_failed',
        false,
        {
          userId: context.userId,
          resource: 'conversation_response',
          resourceId: context.messageId,
          metadata: {
            issues,
            severity,
            conversationId: context.conversationId,
            responseLength: response.length,
            responsePreview: response.substring(0, 150)
          }
        },
        `Response validation failed: ${issues.join(', ')}`
      );

      console.warn(`⚠️ Response validation issues detected`, {
        userId: context.userId,
        conversationId: context.conversationId,
        messageId: context.messageId,
        issues,
        severity
      });
    } catch (error) {
      console.error('Failed to log validation issues:', error);
    }
  }

  /**
   * Add appropriate disclaimers to response if needed
   */
  addDisclaimers(response: string): string {
    let modifiedResponse = response;
    let disclaimersAdded: string[] = [];

    // Check if financial disclaimer is needed
    const needsFinancialDisclaimer = this.FINANCIAL_ADVICE_PATTERNS.some(
      pattern => pattern.test(response)
    );
    if (needsFinancialDisclaimer) {
      const hasDisclaimer = this.FINANCIAL_DISCLAIMER_PHRASES.some(phrase =>
        response.toLowerCase().includes(phrase.toLowerCase())
      );
      if (!hasDisclaimer) {
        disclaimersAdded.push('\n\n*Disclaimer: This is not financial advice. Please consult with a qualified financial advisor before making investment decisions.*');
      }
    }

    // Check if legal disclaimer is needed
    const needsLegalDisclaimer = this.LEGAL_ADVICE_PATTERNS.some(
      pattern => pattern.test(response)
    );
    if (needsLegalDisclaimer) {
      const hasDisclaimer = this.LEGAL_DISCLAIMER_PHRASES.some(phrase =>
        response.toLowerCase().includes(phrase.toLowerCase())
      );
      if (!hasDisclaimer) {
        disclaimersAdded.push('\n\n*Disclaimer: This is not legal advice. Please consult with a qualified attorney for legal matters.*');
      }
    }

    if (disclaimersAdded.length > 0) {
      modifiedResponse += disclaimersAdded.join('');
    }

    return modifiedResponse;
  }
}

export const responseValidator = ResponseValidator.getInstance();
