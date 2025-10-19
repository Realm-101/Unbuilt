/**
 * CORS Configuration
 * Supports multiple domains for production deployments
 */

export interface CorsConfig {
  allowedOrigins: string[];
  isDevelopment: boolean;
}

/**
 * Get allowed CORS origins from environment
 */
export function getCorsConfig(): CorsConfig {
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  // Parse CORS_ORIGIN - supports comma-separated list
  const corsOriginEnv = process.env.CORS_ORIGIN || 'http://localhost:8000';
  const configuredOrigins = corsOriginEnv
    .split(',')
    .map(origin => origin.trim())
    .filter(Boolean);
  
  // Always include localhost in development
  const allowedOrigins = isDevelopment
    ? [...configuredOrigins, 'http://localhost:8000', 'http://localhost:5000']
    : configuredOrigins;
  
  return {
    allowedOrigins,
    isDevelopment
  };
}

/**
 * Check if origin is allowed
 */
export function isOriginAllowed(origin: string | undefined, config: CorsConfig): boolean {
  // Allow requests with no origin (mobile apps, curl, etc.)
  if (!origin) return true;
  
  // Check if origin is in allowed list
  if (config.allowedOrigins.includes(origin)) {
    return true;
  }
  
  // In development, allow any localhost
  if (config.isDevelopment && origin.includes('localhost')) {
    return true;
  }
  
  return false;
}
