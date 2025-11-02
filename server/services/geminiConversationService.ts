import { GoogleGenAI } from "@google/genai";
import { config } from "../config";
import type { ContextWindow } from "./contextWindowManager";

/**
 * Gemini Conversation Service
 * 
 * Handles AI-powered conversation responses using Google Gemini 2.5 Pro.
 * Provides streaming support, error handling, and token tracking.
 */

// Initialize Gemini client
const hasApiKey = !!config.geminiApiKey;
const geminiClient = hasApiKey 
  ? new GoogleGenAI({ apiKey: config.geminiApiKey! }) 
  : null;

// Model configuration
const MODEL_NAME = "gemini-2.5-pro-latest";
const DEFAULT_TEMPERATURE = 0.7;
const DEFAULT_MAX_TOKENS = 2048;

/**
 * Configuration for Gemini model parameters
 */
export interface GeminiConfig {
  temperature?: number;
  maxOutputTokens?: number;
  topP?: number;
  topK?: number;
}

/**
 * AI response with metadata
 */
export interface AIResponse {
  content: string;
  metadata: {
    tokensUsed: {
      input: number;
      output: number;
      total: number;
    };
    processingTime: number;
    confidence?: number;
    sources?: string[];
    assumptions?: string[];
  };
}

/**
 * Streaming chunk callback
 */
export type StreamCallback = (chunk: string) => void;

/**
 * Error types for conversation AI
 */
export enum ConversationErrorType {
  RATE_LIMIT = "rate_limit",
  TIMEOUT = "timeout",
  INVALID_REQUEST = "invalid_request",
  API_ERROR = "api_error",
  NETWORK_ERROR = "network_error",
  CONTEXT_TOO_LARGE = "context_too_large",
}

/**
 * Conversation AI error
 */
export class ConversationAIError extends Error {
  constructor(
    public type: ConversationErrorType,
    message: string,
    public retryable: boolean = false,
    public retryAfter?: number
  ) {
    super(message);
    this.name = "ConversationAIError";
  }
}

/**
 * Retry configuration
 */
interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  timeout: number;
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelay: 1000, // 1 second
  maxDelay: 10000, // 10 seconds
  timeout: 30000, // 30 seconds
};

/**
 * Get Gemini client instance
 */
export function getGeminiClient() {
  if (!geminiClient) {
    throw new Error("Gemini API key not configured");
  }
  return geminiClient;
}

/**
 * Check if Gemini is available
 */
export function isGeminiAvailable(): boolean {
  return hasApiKey && geminiClient !== null;
}

/**
 * Get default model configuration
 */
export function getDefaultConfig(): GeminiConfig {
  return {
    temperature: DEFAULT_TEMPERATURE,
    maxOutputTokens: DEFAULT_MAX_TOKENS,
    topP: 0.95,
    topK: 40,
  };
}

/**
 * Create Gemini model instance with configuration
 */
export function createModel(customConfig?: GeminiConfig) {
  const client = getGeminiClient();
  const config = { ...getDefaultConfig(), ...customConfig };
  
  return client.models.get(MODEL_NAME);
}

/**
 * Validate context window before sending to API
 */
function validateContext(context: ContextWindow): void {
  if (!context.systemPrompt) {
    throw new Error("System prompt is required");
  }
  if (!context.currentQuery) {
    throw new Error("Current query is required");
  }
  if (context.totalTokens > 100000) {
    throw new Error(`Context too large: ${context.totalTokens} tokens (max 100000)`);
  }
}

/**
 * Build full prompt from context window
 */
function buildPrompt(context: ContextWindow): string {
  const parts: string[] = [];
  
  // Add analysis context if available
  if (context.analysisContext) {
    parts.push("=== ANALYSIS CONTEXT ===");
    parts.push(context.analysisContext);
    parts.push("");
  }
  
  // Add conversation history if available
  if (context.conversationHistory) {
    parts.push("=== CONVERSATION HISTORY ===");
    parts.push(context.conversationHistory);
    parts.push("");
  }
  
  // Add current query
  parts.push("=== USER QUESTION ===");
  parts.push(context.currentQuery);
  
  return parts.join("\n");
}

/**
 * Calculate exponential backoff delay with jitter
 */
function calculateBackoff(attempt: number, config: RetryConfig): number {
  const exponentialDelay = Math.min(
    config.baseDelay * Math.pow(2, attempt),
    config.maxDelay
  );
  // Add jitter to prevent thundering herd
  const jitter = Math.random() * 1000;
  return exponentialDelay + jitter;
}

/**
 * Classify error and determine if retryable
 */
function classifyError(error: any): ConversationAIError {
  const errorMessage = error?.message || String(error);
  
  // Rate limit errors
  if (errorMessage.includes("rate limit") || errorMessage.includes("429")) {
    return new ConversationAIError(
      ConversationErrorType.RATE_LIMIT,
      "Rate limit exceeded. Please try again later.",
      true,
      60000 // Retry after 60 seconds
    );
  }
  
  // Timeout errors
  if (errorMessage.includes("timeout") || errorMessage.includes("ETIMEDOUT")) {
    return new ConversationAIError(
      ConversationErrorType.TIMEOUT,
      "Request timed out. Please try again.",
      true
    );
  }
  
  // Network errors
  if (
    errorMessage.includes("ECONNREFUSED") ||
    errorMessage.includes("ENOTFOUND") ||
    errorMessage.includes("network")
  ) {
    return new ConversationAIError(
      ConversationErrorType.NETWORK_ERROR,
      "Network error. Please check your connection.",
      true
    );
  }
  
  // Invalid request errors
  if (errorMessage.includes("invalid") || errorMessage.includes("400")) {
    return new ConversationAIError(
      ConversationErrorType.INVALID_REQUEST,
      "Invalid request. Please check your input.",
      false
    );
  }
  
  // Context too large
  if (errorMessage.includes("too large") || errorMessage.includes("token limit")) {
    return new ConversationAIError(
      ConversationErrorType.CONTEXT_TOO_LARGE,
      "Context is too large. Please reduce conversation history.",
      false
    );
  }
  
  // Generic API error
  return new ConversationAIError(
    ConversationErrorType.API_ERROR,
    `API error: ${errorMessage}`,
    true
  );
}

/**
 * Execute function with retry logic
 */
async function withRetry<T>(
  fn: () => Promise<T>,
  config: RetryConfig = DEFAULT_RETRY_CONFIG,
  context?: { conversationId?: string; userId?: string }
): Promise<T> {
  let lastError: ConversationAIError | null = null;
  
  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      // Add timeout wrapper
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error("Request timeout"));
        }, config.timeout);
      });
      
      const result = await Promise.race([fn(), timeoutPromise]);
      
      // Success - log if this was a retry
      if (attempt > 0) {
        console.log(`✅ Retry successful after ${attempt} attempts`, context);
      }
      
      return result;
    } catch (error) {
      lastError = classifyError(error);
      
      // Log error with context
      console.error(`❌ Attempt ${attempt + 1}/${config.maxRetries + 1} failed:`, {
        error: lastError.message,
        type: lastError.type,
        retryable: lastError.retryable,
        ...context,
      });
      
      // Don't retry if error is not retryable
      if (!lastError.retryable) {
        throw lastError;
      }
      
      // Don't retry if this was the last attempt
      if (attempt === config.maxRetries) {
        throw lastError;
      }
      
      // Calculate backoff delay
      const delay = lastError.retryAfter || calculateBackoff(attempt, config);
      console.log(`⏳ Retrying in ${delay}ms...`);
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  // Should never reach here, but TypeScript needs it
  throw lastError || new Error("Unknown error");
}

/**
 * Generate AI response without streaming (with retry logic)
 * 
 * @param context - Context window with system prompt, history, and query
 * @param customConfig - Optional custom model configuration
 * @param retryConfig - Optional retry configuration
 * @returns AI response with metadata
 */
export async function generateResponse(
  context: ContextWindow,
  customConfig?: GeminiConfig,
  retryConfig?: Partial<RetryConfig>
): Promise<AIResponse> {
  const startTime = Date.now();
  
  // Validate context
  validateContext(context);
  
  // Check if Gemini is available
  if (!isGeminiAvailable()) {
    throw new ConversationAIError(
      ConversationErrorType.API_ERROR,
      "Gemini API is not available. Please configure GEMINI_API_KEY.",
      false
    );
  }
  
  const config = { ...DEFAULT_RETRY_CONFIG, ...retryConfig };
  
  return withRetry(async () => {
    const client = getGeminiClient();
    const modelConfig = { ...getDefaultConfig(), ...customConfig };
    const prompt = buildPrompt(context);
    
    // Generate content
    const model = await client.models.get(MODEL_NAME);
    const response = await model.generateContent({
      config: {
        systemInstruction: context.systemPrompt,
        temperature: modelConfig.temperature,
        maxOutputTokens: modelConfig.maxOutputTokens,
        topP: modelConfig.topP,
        topK: modelConfig.topK,
      },
      contents: prompt,
    });
    
    const processingTime = Date.now() - startTime;
    let content = response.text || "";
    
    // Validate AI response for safety and quality
    const { responseValidator } = await import('./conversations/responseValidator.js');
    const validationResult = await responseValidator.validateResponse(content, {
      userQuery: context.currentQuery,
    });
    
    // If response has issues but is still valid (low severity), add disclaimers
    if (validationResult.isValid && validationResult.issues.length > 0) {
      content = responseValidator.addDisclaimers(content);
    }
    
    // If response requires review or is invalid, log and potentially block
    if (!validationResult.isValid || validationResult.requiresReview) {
      console.warn('⚠️ AI response validation issues:', {
        issues: validationResult.issues,
        severity: validationResult.severity,
        requiresReview: validationResult.requiresReview
      });
      
      // For high severity issues, throw error
      if (validationResult.severity === 'high') {
        throw new ConversationAIError(
          ConversationErrorType.INVALID_REQUEST,
          'AI response failed safety validation',
          true
        );
      }
    }
    
    // Moderate AI response content
    const { contentModerator } = await import('./conversations/contentModerator.js');
    const moderationResult = await contentModerator.moderateAIResponse(content);
    
    if (!moderationResult.approved) {
      console.error('🚨 AI response failed content moderation:', {
        reason: moderationResult.reason,
        severity: moderationResult.severity,
        categories: moderationResult.categories
      });
      
      throw new ConversationAIError(
        ConversationErrorType.INVALID_REQUEST,
        'AI response contains inappropriate content',
        true
      );
    }
    
    // Extract token usage from response
    const inputTokens = context.totalTokens;
    const outputTokens = estimateTokens(content);
    
    return {
      content,
      metadata: {
        tokensUsed: {
          input: inputTokens,
          output: outputTokens,
          total: inputTokens + outputTokens,
        },
        processingTime,
      },
    };
  }, config);
}

/**
 * Generate AI response with streaming support (with retry logic)
 * 
 * @param context - Context window with system prompt, history, and query
 * @param onStream - Callback for each streamed chunk
 * @param customConfig - Optional custom model configuration
 * @param retryConfig - Optional retry configuration
 * @returns AI response with metadata
 */
export async function generateStreamingResponse(
  context: ContextWindow,
  onStream: StreamCallback,
  customConfig?: GeminiConfig,
  retryConfig?: Partial<RetryConfig>
): Promise<AIResponse> {
  const startTime = Date.now();
  
  // Validate context
  validateContext(context);
  
  // Check if Gemini is available
  if (!isGeminiAvailable()) {
    throw new ConversationAIError(
      ConversationErrorType.API_ERROR,
      "Gemini API is not available. Please configure GEMINI_API_KEY.",
      false
    );
  }
  
  const config = { ...DEFAULT_RETRY_CONFIG, ...retryConfig };
  
  return withRetry(async () => {
    const client = getGeminiClient();
    const modelConfig = { ...getDefaultConfig(), ...customConfig };
    const prompt = buildPrompt(context);
    
    let fullContent = "";
    
    // Generate content with streaming
    const model = await client.models.get(MODEL_NAME);
    const stream = await model.generateContentStream({
      config: {
        systemInstruction: context.systemPrompt,
        temperature: modelConfig.temperature,
        maxOutputTokens: modelConfig.maxOutputTokens,
        topP: modelConfig.topP,
        topK: modelConfig.topK,
      },
      contents: prompt,
    });
    
    // Process stream chunks
    for await (const chunk of stream) {
      const chunkText = chunk.text || "";
      if (chunkText) {
        fullContent += chunkText;
        onStream(chunkText);
      }
    }
    
    const processingTime = Date.now() - startTime;
    
    // Extract token usage
    const inputTokens = context.totalTokens;
    const outputTokens = estimateTokens(fullContent);
    
    return {
      content: fullContent,
      metadata: {
        tokensUsed: {
          input: inputTokens,
          output: outputTokens,
          total: inputTokens + outputTokens,
        },
        processingTime,
      },
    };
  }, config);
}

/**
 * Simple token estimation (approximate)
 * Uses rough heuristic: ~4 characters per token
 */
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Parse AI response to extract metadata
 * 
 * @param content - Raw AI response content
 * @returns Parsed metadata
 */
export function parseResponseMetadata(content: string): {
  confidence?: number;
  sources?: string[];
  assumptions?: string[];
} {
  const metadata: {
    confidence?: number;
    sources?: string[];
    assumptions?: string[];
  } = {};
  
  // Extract confidence indicators (if present in response)
  const confidenceMatch = content.match(/confidence[:\s]+(\d+)%/i);
  if (confidenceMatch) {
    metadata.confidence = parseInt(confidenceMatch[1], 10);
  }
  
  // Extract sources (if present)
  const sourcesMatch = content.match(/sources?[:\s]+(.+?)(?:\n\n|\n$|$)/i);
  if (sourcesMatch) {
    metadata.sources = sourcesMatch[1]
      .split(/[,;]/)
      .map(s => s.trim())
      .filter(s => s.length > 0);
  }
  
  // Extract assumptions (if present)
  const assumptionsMatch = content.match(/assumptions?[:\s]+(.+?)(?:\n\n|\n$|$)/i);
  if (assumptionsMatch) {
    metadata.assumptions = assumptionsMatch[1]
      .split(/[,;]/)
      .map(a => a.trim())
      .filter(a => a.length > 0);
  }
  
  return metadata;
}

export { MODEL_NAME, DEFAULT_TEMPERATURE, DEFAULT_MAX_TOKENS };
