import { jwtService } from '../jwt';

/**
 * Token cleanup service
 * Handles periodic cleanup of expired JWT tokens
 */
export class TokenCleanupService {
  private cleanupInterval: NodeJS.Timeout | null = null;
  private readonly CLEANUP_INTERVAL_MS = 60 * 60 * 1000; // 1 hour

  /**
   * Start the token cleanup service
   */
  start(): void {
    if (this.cleanupInterval) {
      console.warn('Token cleanup service is already running');
      return;
    }

    console.log('Starting token cleanup service...');
    
    // Run cleanup immediately
    this.runCleanup();

    // Schedule periodic cleanup
    this.cleanupInterval = setInterval(() => {
      this.runCleanup();
    }, this.CLEANUP_INTERVAL_MS);

    console.log(`Token cleanup service started with ${this.CLEANUP_INTERVAL_MS / 1000}s interval`);
  }

  /**
   * Stop the token cleanup service
   */
  stop(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
      console.log('Token cleanup service stopped');
    }
  }

  /**
   * Run token cleanup manually
   */
  async runCleanup(): Promise<void> {
    try {
      console.log('Running token cleanup...');
      await jwtService.cleanupExpiredTokens();
      console.log('Token cleanup completed successfully');
    } catch (error) {
      console.error('Token cleanup failed:', error);
    }
  }

  /**
   * Get cleanup service status
   */
  isRunning(): boolean {
    return this.cleanupInterval !== null;
  }
}

export const tokenCleanupService = new TokenCleanupService();