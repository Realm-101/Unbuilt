/**
 * Collaboration and chat-related type definitions
 */

export interface ChatMessage {
  userId: number;
  userName: string;
  message: string;
  timestamp: string;
  type: 'message' | 'system' | 'notification';
  metadata?: Record<string, any>;
}
