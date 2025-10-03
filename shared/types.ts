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
 * Represents the authenticated user session data stored in JWT tokens
 * This aligns with the JWTPayload structure from server/jwt.ts
 */
export interface UserSession {
  id: number;           // User ID (from JWT sub field)
  email: string;        // User email
  plan: string;         // User plan/role (from JWT role field)
  jti: string;          // JWT token ID for token tracking and revocation
  iat?: number;         // Issued at timestamp
  exp?: number;         // Expiration timestamp
  type?: 'access' | 'refresh'; // Token type
}

/**
 * Generic API Response Type
 * Standard response format for all API endpoints
 * 
 * @template T - The type of data being returned
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
 * Extends ApiResponse with pagination metadata
 * 
 * @template T - The type of items in the paginated list
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
