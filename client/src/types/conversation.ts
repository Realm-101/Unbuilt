/**
 * Conversation Types
 * 
 * Type definitions for the interactive AI conversation feature.
 * These types define the structure of conversations, messages, and related data.
 */

// ============================================================================
// Core Conversation Types
// ============================================================================

export interface ConversationMessage {
  id: number;
  conversationId: number;
  role: 'user' | 'assistant';
  content: string;
  metadata?: MessageMetadata;
  createdAt: string;
  editedAt?: string;
}

export interface MessageMetadata {
  tokensUsed?: number;
  processingTime?: number;
  confidence?: number;
  sources?: string[];
  assumptions?: string[];
}

export interface Conversation {
  id: number;
  analysisId: number;
  userId: number;
  variantIds: number[];
  messages: ConversationMessage[];
  suggestedQuestions: SuggestedQuestion[];
  createdAt: string;
  updatedAt: string;
}

export interface SuggestedQuestion {
  id: number;
  conversationId: number;
  text: string;
  questionText?: string; // Alias for text (database field name)
  category: QuestionCategory;
  priority: number;
  used: boolean;
  createdAt: string;
}

export type QuestionCategory = 
  | 'market_validation' 
  | 'competitive_analysis' 
  | 'execution_strategy' 
  | 'risk_assessment';

// ============================================================================
// API Response Types
// ============================================================================

export interface ConversationResponse {
  success: boolean;
  data?: Conversation;
  error?: string;
}

export interface MessageResponse {
  success: boolean;
  data?: {
    message: ConversationMessage;
    suggestedQuestions?: SuggestedQuestion[];
  };
  error?: string;
}

export interface SuggestedQuestionsResponse {
  success: boolean;
  data?: SuggestedQuestion[];
  error?: string;
}

// ============================================================================
// Component Props Types
// ============================================================================

export interface ConversationInterfaceProps {
  analysisId: number;
  onVariantCreated?: (variantId: number) => void;
}

export interface UserMessageProps {
  message: ConversationMessage;
  onEdit?: (messageId: number, newContent: string) => void;
  onDelete?: (messageId: number) => void;
}

export interface AIMessageProps {
  message: ConversationMessage;
  onCopy?: () => void;
  onRate?: (messageId: number, rating: number) => void;
  onReport?: (messageId: number) => void;
}

export interface ConversationInputProps {
  onSubmit: (message: string) => Promise<void>;
  disabled?: boolean;
  placeholder?: string;
  maxLength?: number;
  remainingQuestions?: number;
  questionLimit?: number;
  userTier?: 'free' | 'pro' | 'enterprise';
}

export interface SuggestedQuestionsProps {
  questions: SuggestedQuestion[];
  onQuestionClick: (question: string) => void;
  loading?: boolean;
}

// ============================================================================
// State Types
// ============================================================================

export interface ConversationState {
  conversation: Conversation | null;
  loading: boolean;
  error: string | null;
  sending: boolean;
}

export interface RateLimitInfo {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
}
