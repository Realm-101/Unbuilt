/**
 * Shared Type Definitions for Backend
 * 
 * This file contains common type definitions used across the backend
 * for API responses, user sessions, pagination, and other shared concerns.
 */

import type { Request, Response, NextFunction } from 'express';

/**
 * Express Route Handler Types
 * These types help avoid implicit 'any' in route handlers
 */
export type RouteHandler = (req: Request, res: Response) => Promise<void> | void;
export type AsyncRouteHandler = (req: Request, res: Response) => Promise<void>;
export type MiddlewareHandler = (req: Request, res: Response, next: NextFunction) => Promise<void> | void;

/**
 * User Session Type
 * 
 * Represents the authenticated user session data stored in JWT tokens.
 * This interface aligns with the JWTPayload structure from server/jwt.ts
 * and is used throughout the application for type-safe user authentication.
 * 
 * @property {number} id - Unique user identifier (from JWT sub field)
 * @property {string} email - User's email address for identification
 * @property {string} plan - User's subscription plan ('free' | 'pro' | 'enterprise')
 * @property {string} jti - JWT Token ID for tracking and revocation
 * @property {number} [iat] - Optional: Token issued at timestamp (Unix epoch)
 * @property {number} [exp] - Optional: Token expiration timestamp (Unix epoch)
 * @property {'access' | 'refresh'} [type] - Optional: Token type for different use cases
 * 
 * @example
 * ```typescript
 * const session: UserSession = {
 *   id: 123,
 *   email: 'user@example.com',
 *   plan: 'pro',
 *   jti: 'unique-token-id',
 *   iat: 1234567890,
 *   exp: 1234571490,
 *   type: 'access'
 * };
 * ```
 */
export interface UserSession {
  id: number;
  email: string;
  plan: string;
  jti: string;
  iat?: number;
  exp?: number;
  type?: 'access' | 'refresh';
}

/**
 * Generic API Response Type
 * 
 * Standard response format for all API endpoints. This interface ensures
 * consistent response structure across the entire application, making it
 * easier to handle responses on the frontend and maintain API contracts.
 * 
 * @template T - The type of data being returned (defaults to any)
 * 
 * @property {boolean} success - Indicates if the request was successful
 * @property {T} [data] - Optional: The response payload (present on success)
 * @property {string} [error] - Optional: Error message (present on failure)
 * @property {string} [message] - Optional: Human-readable message
 * @property {string} [code] - Optional: Error code for programmatic handling
 * @property {string} timestamp - ISO 8601 timestamp of the response
 * @property {string} [requestId] - Optional: Unique request ID for tracing
 * 
 * @example
 * ```typescript
 * // Success response
 * const response: ApiResponse<User> = {
 *   success: true,
 *   data: { id: 1, email: 'user@example.com' },
 *   message: 'User retrieved successfully',
 *   timestamp: '2025-10-03T12:00:00Z',
 *   requestId: 'req-123'
 * };
 * 
 * // Error response
 * const errorResponse: ApiResponse = {
 *   success: false,
 *   error: 'User not found',
 *   code: 'USER_NOT_FOUND',
 *   timestamp: '2025-10-03T12:00:00Z'
 * };
 * ```
 */
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  code?: string;
  timestamp: string;
  requestId?: string;
}

/**
 * Pagination Parameters
 * Standard pagination parameters for list endpoints
 */
export interface PaginationParams {
  limit: number;
  offset: number;
  page: number;
}

/**
 * Paginated Response Type
 * 
 * Extends ApiResponse with pagination metadata for list endpoints.
 * This interface provides a consistent way to handle paginated data
 * across the application, including navigation information.
 * 
 * @template T - The type of items in the paginated list
 * 
 * @property {T[]} data - Array of items for the current page
 * @property {object} pagination - Pagination metadata
 * @property {number} pagination.total - Total number of items across all pages
 * @property {number} pagination.page - Current page number (1-indexed)
 * @property {number} pagination.limit - Number of items per page
 * @property {boolean} pagination.hasNext - Whether there is a next page
 * @property {boolean} pagination.hasPrev - Whether there is a previous page
 * 
 * @example
 * ```typescript
 * const response: PaginatedResponse<User> = {
 *   success: true,
 *   data: [
 *     { id: 1, email: 'user1@example.com' },
 *     { id: 2, email: 'user2@example.com' }
 *   ],
 *   pagination: {
 *     total: 100,
 *     page: 1,
 *     limit: 10,
 *     hasNext: true,
 *     hasPrev: false
 *   },
 *   timestamp: '2025-10-03T12:00:00Z'
 * };
 * ```
 */
export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    total: number;
    page: number;
    limit: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

/**
 * Error Response Type
 * Standard error response format
 */
export interface ErrorResponse {
  success: false;
  error: string;
  message: string;
  code?: string;
  timestamp: string;
  requestId?: string;
  details?: Record<string, any>;
}

/**
 * Success Response Type
 * Standard success response format
 * 
 * @template T - The type of data being returned
 */
export interface SuccessResponse<T = any> {
  success: true;
  data: T;
  message?: string;
  timestamp: string;
  requestId?: string;
}
