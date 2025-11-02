/**
 * Client-Side Type Definitions - Central Export Point
 * 
 * This file serves as the main entry point for all frontend type definitions.
 * It re-exports types from specialized modules for easy importing throughout
 * the application.
 * 
 * Usage:
 * ```typescript
 * import { UserProfile, ChatMessage, TreemapData } from '@/types';
 * ```
 * 
 * Organization:
 * - collaboration.ts: Chat and real-time collaboration types
 * - user.ts: User profile and authentication types
 * - analytics.ts: Data visualization and analytics types
 */

// ============================================================================
// Collaboration Types
// ============================================================================
export * from './collaboration';

// ============================================================================
// User Types
// ============================================================================
export * from './user';

// ============================================================================
// Analytics Types
// ============================================================================
export * from './analytics';

// ============================================================================
// Conversation Types
// ============================================================================
export * from './conversation';

// ============================================================================
// Action Plan Types
// ============================================================================
export * from './action-plan';
