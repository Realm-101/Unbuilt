import { createClient, RedisClientType } from 'redis';
import { config } from '../config';

/**
 * Conversation Cache Service
 * 
 * Provides Redis-based caching for conversation data to improve performance
 * and reduce API costs. Caches analysis context, suggested questions, and
 * similar queries for deduplication.
 */

// Redis client instance
let redisClient: RedisClientType | null = null;
let isConnected = false;

// Cache TTL values (in seconds)
const CACHE_TTL = {
  ANALYSIS_CONTEXT: 3600 * 24, // 24 hours (rarely changes)
  SUGGESTED_QUESTIONS: 3600, // 1 hour
  SIMILAR_QUERY: 3600 * 24 * 7, // 7 days
  SYSTEM_PROMPT: 3600 * 24 * 30, // 30 days (never changes)
} as const;

// Cache key prefixes
const KEY_PREFIX = {
  ANALYSIS_CONTEXT: 'conv:analysis:',
  SUGGESTED_QUESTIONS: 'conv:suggestions:',
  SIMILAR_QUERY: 'conv:similar:',
  SYSTEM_PROMPT: 'conv:system:',
  QUERY_EMBEDDING: 'conv:embedding:',
} as const;

/**
 * Initialize Redis client
 */
export async function initializeRedis(): Promise<void> {
  if (redisClient && isConnected) {
    return;
  }

  try {
    // Check if Redis URL is configured
    const redisUrl = config.redisUrl || process.env.REDIS_URL;
    
    if (!redisUrl) {
      console.warn('⚠️ Redis URL not configured. Caching will be disabled.');
      return;
    }

    redisClient = createClient({
      url: redisUrl,
      socket: {
        reconnectStrategy: (retries) => {
          if (retries > 10) {
            console.error('❌ Redis reconnection failed after 10 attempts');
            return new Error('Redis reconnection failed');
          }
          // Exponential backoff: 100ms, 200ms, 400ms, etc.
          return Math.min(retries * 100, 3000);
        },
      },
    });

    redisClient.on('error', (err) => {
      console.error('❌ Redis Client Error:', err);
      isConnected = false;
    });

    redisClient.on('connect', () => {
      console.log('✅ Redis connected');
      isConnected = true;
    });

    redisClient.on('disconnect', () => {
      console.warn('⚠️ Redis disconnected');
      isConnected = false;
    });

    await redisClient.connect();
    console.log('✅ Redis cache service initialized');
  } catch (error) {
    console.error('❌ Failed to initialize Redis:', error);
    redisClient = null;
    isConnected = false;
  }
}

/**
 * Check if Redis is available
 */
export function isRedisAvailable(): boolean {
  return redisClient !== null && isConnected;
}

/**
 * Get Redis client (throws if not available)
 */
function getClient(): RedisClientType {
  if (!redisClient || !isConnected) {
    throw new Error('Redis client is not available');
  }
  return redisClient;
}

/**
 * Safely execute Redis operation with fallback
 */
async function safeRedisOperation<T>(
  operation: () => Promise<T>,
  fallback: T
): Promise<T> {
  if (!isRedisAvailable()) {
    return fallback;
  }

  try {
    return await operation();
  } catch (error) {
    console.error('Redis operation failed:', error);
    return fallback;
  }
}

/**
 * Cache analysis context (rarely changes)
 * 
 * @param analysisId - Analysis ID
 * @param context - Analysis context string
 */
export async function cacheAnalysisContext(
  analysisId: number,
  context: string
): Promise<void> {
  await safeRedisOperation(async () => {
    const client = getClient();
    const key = `${KEY_PREFIX.ANALYSIS_CONTEXT}${analysisId}`;
    await client.setEx(key, CACHE_TTL.ANALYSIS_CONTEXT, context);
  }, undefined);
}

/**
 * Get cached analysis context
 * 
 * @param analysisId - Analysis ID
 * @returns Cached context or null if not found
 */
export async function getAnalysisContext(
  analysisId: number
): Promise<string | null> {
  return safeRedisOperation(async () => {
    const client = getClient();
    const key = `${KEY_PREFIX.ANALYSIS_CONTEXT}${analysisId}`;
    return await client.get(key);
  }, null);
}

/**
 * Cache suggested questions (valid for 1 hour)
 * 
 * @param conversationId - Conversation ID
 * @param questions - Array of suggested questions
 */
export async function cacheSuggestedQuestions(
  conversationId: number,
  questions: Array<{
    id: number;
    text: string;
    category: string;
    priority: number;
  }>
): Promise<void> {
  await safeRedisOperation(async () => {
    const client = getClient();
    const key = `${KEY_PREFIX.SUGGESTED_QUESTIONS}${conversationId}`;
    await client.setEx(
      key,
      CACHE_TTL.SUGGESTED_QUESTIONS,
      JSON.stringify(questions)
    );
  }, undefined);
}

/**
 * Get cached suggested questions
 * 
 * @param conversationId - Conversation ID
 * @returns Cached questions or null if not found
 */
export async function getSuggestedQuestions(
  conversationId: number
): Promise<Array<{
  id: number;
  text: string;
  category: string;
  priority: number;
}> | null> {
  return safeRedisOperation(async () => {
    const client = getClient();
    const key = `${KEY_PREFIX.SUGGESTED_QUESTIONS}${conversationId}`;
    const cached = await client.get(key);
    return cached ? JSON.parse(cached) : null;
  }, null);
}

/**
 * Invalidate cached suggested questions
 * 
 * @param conversationId - Conversation ID
 */
export async function invalidateSuggestedQuestions(
  conversationId: number
): Promise<void> {
  await safeRedisOperation(async () => {
    const client = getClient();
    const key = `${KEY_PREFIX.SUGGESTED_QUESTIONS}${conversationId}`;
    await client.del(key);
  }, undefined);
}

/**
 * Cache similar query for deduplication
 * 
 * @param query - User query
 * @param response - AI response
 * @param conversationId - Conversation ID
 */
export async function cacheSimilarQuery(
  query: string,
  response: string,
  conversationId: number
): Promise<void> {
  await safeRedisOperation(async () => {
    const client = getClient();
    // Create a hash of the query for the key
    const queryHash = await hashString(query);
    const key = `${KEY_PREFIX.SIMILAR_QUERY}${conversationId}:${queryHash}`;
    await client.setEx(key, CACHE_TTL.SIMILAR_QUERY, response);
  }, undefined);
}

/**
 * Find similar cached query
 * 
 * @param query - User query
 * @param conversationId - Conversation ID
 * @param similarityThreshold - Minimum similarity score (0-1)
 * @returns Cached response or null if not found
 */
export async function findSimilarQuery(
  query: string,
  conversationId: number,
  similarityThreshold: number = 0.9
): Promise<string | null> {
  return safeRedisOperation(async () => {
    const client = getClient();
    const queryHash = await hashString(query);
    const key = `${KEY_PREFIX.SIMILAR_QUERY}${conversationId}:${queryHash}`;
    
    // Try exact match first
    const exactMatch = await client.get(key);
    if (exactMatch) {
      return exactMatch;
    }

    // TODO: Implement fuzzy matching with embeddings
    // For now, only exact matches are supported
    return null;
  }, null);
}

/**
 * Cache system prompt (never changes)
 * 
 * @param promptKey - Unique key for the prompt
 * @param prompt - System prompt text
 */
export async function cacheSystemPrompt(
  promptKey: string,
  prompt: string
): Promise<void> {
  await safeRedisOperation(async () => {
    const client = getClient();
    const key = `${KEY_PREFIX.SYSTEM_PROMPT}${promptKey}`;
    await client.setEx(key, CACHE_TTL.SYSTEM_PROMPT, prompt);
  }, undefined);
}

/**
 * Get cached system prompt
 * 
 * @param promptKey - Unique key for the prompt
 * @returns Cached prompt or null if not found
 */
export async function getSystemPrompt(
  promptKey: string
): Promise<string | null> {
  return safeRedisOperation(async () => {
    const client = getClient();
    const key = `${KEY_PREFIX.SYSTEM_PROMPT}${promptKey}`;
    return await client.get(key);
  }, null);
}

/**
 * Get cache statistics
 * 
 * @returns Cache hit/miss statistics
 */
export async function getCacheStats(): Promise<{
  isAvailable: boolean;
  keyCount: number;
  memoryUsage: string;
}> {
  if (!isRedisAvailable()) {
    return {
      isAvailable: false,
      keyCount: 0,
      memoryUsage: '0 MB',
    };
  }

  try {
    const client = getClient();
    
    // Get key count for conversation-related keys
    const keys = await client.keys('conv:*');
    
    // Get memory info
    const info = await client.info('memory');
    const memoryMatch = info.match(/used_memory_human:(.+)/);
    const memoryUsage = memoryMatch ? memoryMatch[1].trim() : 'Unknown';

    return {
      isAvailable: true,
      keyCount: keys.length,
      memoryUsage,
    };
  } catch (error) {
    console.error('Failed to get cache stats:', error);
    return {
      isAvailable: false,
      keyCount: 0,
      memoryUsage: '0 MB',
    };
  }
}

/**
 * Clear all conversation caches
 * 
 * @param conversationId - Optional conversation ID to clear specific conversation
 */
export async function clearCache(conversationId?: number): Promise<void> {
  await safeRedisOperation(async () => {
    const client = getClient();
    
    if (conversationId) {
      // Clear specific conversation caches
      const patterns = [
        `${KEY_PREFIX.SUGGESTED_QUESTIONS}${conversationId}`,
        `${KEY_PREFIX.SIMILAR_QUERY}${conversationId}:*`,
      ];
      
      for (const pattern of patterns) {
        const keys = await client.keys(pattern);
        if (keys.length > 0) {
          await client.del(keys);
        }
      }
    } else {
      // Clear all conversation caches
      const keys = await client.keys('conv:*');
      if (keys.length > 0) {
        await client.del(keys);
      }
    }
  }, undefined);
}

/**
 * Close Redis connection
 */
export async function closeRedis(): Promise<void> {
  if (redisClient && isConnected) {
    await redisClient.quit();
    redisClient = null;
    isConnected = false;
    console.log('✅ Redis connection closed');
  }
}

/**
 * Simple hash function for query strings
 */
async function hashString(str: string): Promise<string> {
  // Use a simple hash for now (could be replaced with crypto.subtle.digest)
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(36);
}

// Initialize Redis on module load
initializeRedis().catch((error) => {
  console.error('Failed to initialize Redis on startup:', error);
});

export const conversationCacheService = {
  initializeRedis,
  isRedisAvailable,
  cacheAnalysisContext,
  getAnalysisContext,
  cacheSuggestedQuestions,
  getSuggestedQuestions,
  invalidateSuggestedQuestions,
  cacheSimilarQuery,
  findSimilarQuery,
  cacheSystemPrompt,
  getSystemPrompt,
  getCacheStats,
  clearCache,
  closeRedis,
};
