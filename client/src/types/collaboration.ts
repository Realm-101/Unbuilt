/**
 * Collaboration and Chat Type Definitions
 * 
 * This module contains type definitions for real-time collaboration
 * features including chat messages, notifications, and system events.
 */

/**
 * Chat Message Interface
 * 
 * Represents a single message in the collaboration chat system.
 * Supports different message types for various use cases.
 * 
 * @property {number} userId - ID of the user who sent the message
 * @property {string} userName - Display name of the message sender
 * @property {string} message - The actual message content
 * @property {string} timestamp - ISO 8601 timestamp when message was sent
 * @property {'message' | 'system' | 'notification'} type - Message type for rendering
 * @property {Record<string, any>} [metadata] - Optional: Additional message data
 * 
 * @example
 * ```typescript
 * // User message
 * const userMessage: ChatMessage = {
 *   userId: 123,
 *   userName: 'John Doe',
 *   message: 'Hello team!',
 *   timestamp: '2025-10-03T12:00:00Z',
 *   type: 'message'
 * };
 * 
 * // System notification
 * const systemMessage: ChatMessage = {
 *   userId: 0,
 *   userName: 'System',
 *   message: 'User joined the chat',
 *   timestamp: '2025-10-03T12:00:00Z',
 *   type: 'system',
 *   metadata: { action: 'user_joined' }
 * };
 * ```
 */
export interface ChatMessage {
  userId: number;
  userName: string;
  message: string;
  timestamp: string;
  type: 'message' | 'system' | 'notification';
  metadata?: Record<string, any>;
}
