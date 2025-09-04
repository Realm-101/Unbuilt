import { createHash } from 'crypto';
import { GapAnalysisResult } from './gemini';

interface CacheEntry {
  query: string;
  results: GapAnalysisResult[];
  timestamp: number;
  hitCount: number;
}

class AICache {
  private cache: Map<string, CacheEntry> = new Map();
  private readonly TTL = 24 * 60 * 60 * 1000; // 24 hours cache
  private readonly MAX_ENTRIES = 1000;

  private generateKey(query: string): string {
    // Create hash of normalized query for cache key
    const normalized = query.toLowerCase().trim();
    return createHash('sha256').update(normalized).digest('hex').substring(0, 16);
  }

  get(query: string): GapAnalysisResult[] | null {
    const key = this.generateKey(query);
    const entry = this.cache.get(key);

    if (!entry) return null;

    // Check if cache is expired
    if (Date.now() - entry.timestamp > this.TTL) {
      this.cache.delete(key);
      return null;
    }

    // Increment hit count for analytics
    entry.hitCount++;
    
    console.log(`✨ Cache hit for query: "${query}" (${entry.hitCount} hits)`);
    return entry.results;
  }

  set(query: string, results: GapAnalysisResult[]): void {
    const key = this.generateKey(query);

    // Implement LRU eviction if cache is full
    if (this.cache.size >= this.MAX_ENTRIES) {
      const oldestKey = this.findOldestEntry();
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }

    this.cache.set(key, {
      query,
      results,
      timestamp: Date.now(),
      hitCount: 0
    });

    console.log(`💾 Cached results for query: "${query}"`);
  }

  private findOldestEntry(): string | null {
    let oldestKey: string | null = null;
    let oldestTime = Infinity;

    Array.from(this.cache.entries()).forEach(([key, entry]) => {
      if (entry.timestamp < oldestTime) {
        oldestTime = entry.timestamp;
        oldestKey = key;
      }
    });

    return oldestKey;
  }

  clear(): void {
    this.cache.clear();
    console.log('🧹 Cache cleared');
  }

  getStats() {
    let totalHits = 0;
    let totalQueries = this.cache.size;
    
    Array.from(this.cache.values()).forEach(entry => {
      totalHits += entry.hitCount;
    });

    return {
      totalQueries,
      totalHits,
      cacheSize: this.cache.size,
      hitRate: totalQueries > 0 ? (totalHits / (totalHits + totalQueries)) : 0
    };
  }
}

export const aiCache = new AICache();