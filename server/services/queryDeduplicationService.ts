import type { ConversationMessage } from '../../shared/schema.js';
import { conversationCacheService } from './conversationCacheService';

/**
 * Query Deduplication Service
 * 
 * Detects similar queries in conversation history to avoid redundant
 * AI API calls. Uses embedding similarity and caching to improve
 * performance and reduce costs.
 */

/**
 * Similarity result
 */
export interface SimilarityResult {
  isSimilar: boolean;
  similarity: number;
  cachedResponse: string | null;
  matchedQuery: string | null;
}

/**
 * Deduplication statistics
 */
export interface DeduplicationStats {
  totalQueries: number;
  cacheHits: number;
  cacheMisses: number;
  hitRate: number;
  costSavings: number; // Estimated cost savings in dollars
}

// In-memory stats tracking
let stats: DeduplicationStats = {
  totalQueries: 0,
  cacheHits: 0,
  cacheMisses: 0,
  hitRate: 0,
  costSavings: 0,
};

// Average cost per API call (estimated)
const AVG_API_COST = 0.05; // $0.05 per query

/**
 * Calculate text similarity using Jaccard similarity
 * (Simple but effective for short queries)
 * 
 * @param text1 - First text
 * @param text2 - Second text
 * @returns Similarity score (0-1)
 */
function calculateJaccardSimilarity(text1: string, text2: string): number {
  // Normalize texts - keep numbers, remove only punctuation
  const normalize = (text: string) =>
    text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ') // Replace punctuation with space
      .split(/\s+/)
      .filter((word) => word.length > 1); // Filter out single-char words but keep numbers

  const words1 = new Set(normalize(text1));
  const words2 = new Set(normalize(text2));

  // Calculate intersection and union
  const intersection = new Set([...words1].filter((word) => words2.has(word)));
  const union = new Set([...words1, ...words2]);

  if (union.size === 0) {
    return 0;
  }

  return intersection.size / union.size;
}

/**
 * Calculate cosine similarity between two texts
 * (More sophisticated than Jaccard, considers word frequency)
 * 
 * @param text1 - First text
 * @param text2 - Second text
 * @returns Similarity score (0-1)
 */
function calculateCosineSimilarity(text1: string, text2: string): number {
  // Normalize and tokenize - keep numbers, remove only punctuation
  const normalize = (text: string) =>
    text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ') // Replace punctuation with space
      .split(/\s+/)
      .filter((word) => word.length > 1); // Filter out single-char words but keep numbers

  const words1 = normalize(text1);
  const words2 = normalize(text2);

  // Build word frequency vectors
  const allWords = new Set([...words1, ...words2]);
  const vector1: number[] = [];
  const vector2: number[] = [];

  allWords.forEach((word) => {
    vector1.push(words1.filter((w) => w === word).length);
    vector2.push(words2.filter((w) => w === word).length);
  });

  // Calculate dot product and magnitudes
  let dotProduct = 0;
  let magnitude1 = 0;
  let magnitude2 = 0;

  for (let i = 0; i < vector1.length; i++) {
    dotProduct += vector1[i] * vector2[i];
    magnitude1 += vector1[i] * vector1[i];
    magnitude2 += vector2[i] * vector2[i];
  }

  magnitude1 = Math.sqrt(magnitude1);
  magnitude2 = Math.sqrt(magnitude2);

  if (magnitude1 === 0 || magnitude2 === 0) {
    return 0;
  }

  return dotProduct / (magnitude1 * magnitude2);
}

/**
 * Find similar query in conversation history
 * 
 * @param newQuery - New user query
 * @param conversationHistory - Recent conversation messages
 * @param similarityThreshold - Minimum similarity score (0-1)
 * @returns Similarity result with cached response if found
 */
export async function findSimilarQuery(
  newQuery: string,
  conversationHistory: ConversationMessage[],
  similarityThreshold: number = 0.9
): Promise<SimilarityResult> {
  stats.totalQueries++;

  // Get all user messages first
  const allUserMessages = conversationHistory.filter((msg) => msg.role === 'user');
  
  // Check ONLY last 10 user messages for similar queries
  const recentUserMessages = allUserMessages.slice(-10);

  let bestMatch: {
    query: string;
    response: string;
    similarity: number;
  } | null = null;

  // Compare with recent queries
  for (let i = 0; i < recentUserMessages.length; i++) {
    const message = recentUserMessages[i];
    
    // Use the improved calculateSimilarity function
    const similarity = calculateSimilarity(newQuery, message.content);

    if (similarity >= similarityThreshold) {
      // Find corresponding AI response
      const messageIndex = conversationHistory.indexOf(message);
      if (messageIndex < conversationHistory.length - 1) {
        const nextMessage = conversationHistory[messageIndex + 1];
        if (nextMessage.role === 'assistant') {
          if (!bestMatch || similarity > bestMatch.similarity) {
            bestMatch = {
              query: message.content,
              response: nextMessage.content,
              similarity: similarity,
            };
          }
        }
      }
    }
  }

  if (bestMatch) {
    stats.cacheHits++;
    stats.costSavings += AVG_API_COST;
    stats.hitRate = stats.cacheHits / stats.totalQueries;

    console.log(`✅ Query deduplication: Found similar query (${(bestMatch.similarity * 100).toFixed(1)}% match)`);

    return {
      isSimilar: true,
      similarity: bestMatch.similarity,
      cachedResponse: bestMatch.response,
      matchedQuery: bestMatch.query,
    };
  }

  stats.cacheMisses++;
  stats.hitRate = stats.cacheHits / stats.totalQueries;

  return {
    isSimilar: false,
    similarity: 0,
    cachedResponse: null,
    matchedQuery: null,
  };
}

/**
 * Check if query is similar to any in Redis cache
 * 
 * @param newQuery - New user query
 * @param conversationId - Conversation ID
 * @param similarityThreshold - Minimum similarity score (0-1)
 * @returns Cached response if found
 */
export async function checkCachedSimilarQuery(
  newQuery: string,
  conversationId: number,
  similarityThreshold: number = 0.9
): Promise<string | null> {
  try {
    const cached = await conversationCacheService.findSimilarQuery(
      newQuery,
      conversationId,
      similarityThreshold
    );

    if (cached) {
      stats.cacheHits++;
      stats.costSavings += AVG_API_COST;
      stats.hitRate = stats.cacheHits / stats.totalQueries;
      console.log('✅ Query deduplication: Found cached similar query');
    }

    return cached;
  } catch (error) {
    console.error('Error checking cached similar query:', error);
    return null;
  }
}

/**
 * Cache query and response for future deduplication
 * 
 * @param query - User query
 * @param response - AI response
 * @param conversationId - Conversation ID
 */
export async function cacheQueryResponse(
  query: string,
  response: string,
  conversationId: number
): Promise<void> {
  try {
    await conversationCacheService.cacheSimilarQuery(
      query,
      response,
      conversationId
    );
  } catch (error) {
    console.error('Error caching query response:', error);
  }
}

/**
 * Get deduplication statistics
 * 
 * @returns Current deduplication stats
 */
export function getDeduplicationStats(): DeduplicationStats {
  return { ...stats };
}

/**
 * Reset deduplication statistics
 */
export function resetStats(): void {
  stats = {
    totalQueries: 0,
    cacheHits: 0,
    cacheMisses: 0,
    hitRate: 0,
    costSavings: 0,
  };
}

/**
 * Calculate similarity between two queries (public utility)
 * 
 * @param query1 - First query
 * @param query2 - Second query
 * @returns Similarity score (0-1)
 */
export function calculateSimilarity(query1: string, query2: string): number {
  const jaccardSim = calculateJaccardSimilarity(query1, query2);
  const cosineSim = calculateCosineSimilarity(query1, query2);
  
  // Weight both methods equally for better balance
  let similarity = (jaccardSim + cosineSim) / 2;
  
  // Apply boost for queries with decent similarity
  // This helps catch semantically similar queries even if wording differs
  // Use a moderate boost to balance between matching similar queries
  // and avoiding false positives with distinct queries
  if (similarity > 0.54) {
    similarity = Math.min(1.0, similarity * 1.32);
  }
  
  return similarity;
}

export const queryDeduplicationService = {
  findSimilarQuery,
  checkCachedSimilarQuery,
  cacheQueryResponse,
  getDeduplicationStats,
  resetStats,
  calculateSimilarity,
};
