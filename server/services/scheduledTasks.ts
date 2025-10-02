import { sessionManager } from './sessionManager';
import { performSessionCleanup } from '../middleware/sessionManagement';

export class ScheduledTaskService {
  private cleanupInterval: NodeJS.Timeout | null = null;
  private statsInterval: NodeJS.Timeout | null = null;

  /**
   * Start all scheduled tasks
   */
  start(): void {
    console.log('🕐 Starting scheduled tasks...');
    
    // Session cleanup every 30 minutes
    this.startSessionCleanup();
    
    // Session statistics logging every hour
    this.startSessionStatsLogging();
  }

  /**
   * Stop all scheduled tasks
   */
  stop(): void {
    console.log('🛑 Stopping scheduled tasks...');
    
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    
    if (this.statsInterval) {
      clearInterval(this.statsInterval);
      this.statsInterval = null;
    }
  }

  /**
   * Start session cleanup task
   */
  private startSessionCleanup(): void {
    // Run immediately on startup
    performSessionCleanup().catch(console.error);
    
    // Then run every 30 minutes
    this.cleanupInterval = setInterval(async () => {
      try {
        await performSessionCleanup();
      } catch (error) {
        console.error('Scheduled session cleanup failed:', error);
      }
    }, 30 * 60 * 1000); // 30 minutes

    console.log('✅ Session cleanup task started (runs every 30 minutes)');
  }

  /**
   * Start session statistics logging
   */
  private startSessionStatsLogging(): void {
    // Run immediately on startup
    this.logSessionStats().catch(console.error);
    
    // Then run every hour
    this.statsInterval = setInterval(async () => {
      try {
        await this.logSessionStats();
      } catch (error) {
        console.error('Session stats logging failed:', error);
      }
    }, 60 * 60 * 1000); // 1 hour

    console.log('✅ Session stats logging started (runs every hour)');
  }

  /**
   * Log session statistics
   */
  private async logSessionStats(): Promise<void> {
    try {
      const stats = await sessionManager.getSessionStats();
      console.log('📊 Session Statistics:', {
        totalActiveSessions: stats.totalActiveSessions,
        totalUsers: stats.totalUsers,
        averageSessionsPerUser: stats.averageSessionsPerUser,
        expiredSessionsToday: stats.expiredSessionsToday,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Failed to get session stats:', error);
    }
  }

  /**
   * Manual session cleanup (for testing or admin use)
   */
  async runSessionCleanup(): Promise<number> {
    return await sessionManager.cleanupExpiredSessions();
  }

  /**
   * Get current session statistics
   */
  async getSessionStats() {
    return await sessionManager.getSessionStats();
  }
}

export const scheduledTaskService = new ScheduledTaskService();