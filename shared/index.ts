/**
 * Shared Types and Schemas - Central Export Point
 * 
 * This file serves as the main entry point for all shared types, schemas,
 * and constants used across both frontend and backend.
 * 
 * Organization:
 * - Database schemas and types (from schema.ts)
 * - Authentication schemas and types (from auth-schema.ts)
 * - API response types (from types.ts)
 * - Constants and configuration
 */

// ============================================================================
// Database Schemas and Types
// ============================================================================

export {
  // Database tables
  users,
  searches,
  searchResults,
  sessions,
  jwtTokens,
  ideas,
  teams,
  teamMembers,
  ideaShares,
  comments,
  activityFeed,
  securityAuditLogs,
  securityAlerts,
  passwordHistory,
  
  // Database types
  type User,
  type UpsertUser,
  type InsertUser,
  type Session,
  type InsertSession,
  type JWTToken,
  type InsertJWTToken,
  type Search,
  type InsertSearch,
  type SearchResult,
  type InsertSearchResult,
  type Idea,
  type InsertIdea,
  type Team,
  type TeamMember,
  type IdeaShare,
  type Comment,
  type ActivityFeedItem,
  type SecurityAuditLog,
  type InsertSecurityAuditLog,
  type SecurityAlert,
  type InsertSecurityAlert,
  type PasswordHistory,
  type InsertPasswordHistory,
  
  // Validation schemas
  insertSearchSchema,
  insertSearchResultSchema,
  insertUserSchema,
  insertSessionSchema,
  insertIdeaSchema,
  validateIdeaSchema,
  financialProjectionSchema,
  
  // Validation types
  type ValidateIdea,
  type FinancialProjection,
} from './schema';

// ============================================================================
// Authentication Schemas and Types
// ============================================================================

export {
  // Authentication validation schemas
  loginSchema,
  registerSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
  passwordStrengthSchema,
  
  // Authentication types
  type LoginData,
  type RegisterData,
  type ForgotPasswordData,
  type ResetPasswordData,
  type ChangePasswordData,
  type PasswordStrengthData,
  
  // Plan configuration
  PLAN_LIMITS,
} from './auth-schema';

// ============================================================================
// API Response Types and Utilities
// ============================================================================

export {
  // Express handler types
  type RouteHandler,
  type AsyncRouteHandler,
  type MiddlewareHandler,
  
  // Session types
  type UserSession,
  
  // API response types
  type ApiResponse,
  type ErrorResponse,
  type SuccessResponse,
  type PaginationParams,
  type PaginatedResponse,
} from './types';

// ============================================================================
// Re-export commonly used constants
// ============================================================================

// Plan pricing is defined in schema.ts but commonly used
export { PLAN_PRICES } from './schema';
