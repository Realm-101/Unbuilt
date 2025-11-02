/**
 * Conversation Alerting Service
 * 
 * Monitors conversation metrics and triggers alerts when thresholds are exceeded:
 * - Error rate >5%
 * - Response time >10s (95th percentile)
 * - API cost spike >50%
 * - Inappropriate content detection
 */

import { conversationLogger } from './conversationLogger';
import { conversationMetricsService } from './conversationMetricsService';

export interface Alert {
  id: string;
  timestamp: Date;
  severity: 'critical' | 'warning' | 'info';
  type: 'error_rate' | 'response_time' | 'cost_spike' | 'inappropriate_content' | 'rate_limit';
  message: string;
  details: Record<string, any>;
  resolved: boolean;
}

export interface AlertThresholds {
  errorRate: number; // percentage
  responseTime: number; // milliseconds (95th percentile)
  costSpike: number; // percentage increase
  inappropriateContentRate: number; // percentage
}

const DEFAULT_THRESHOLDS: AlertThresholds = {
  errorRate: 5, // 5%
  responseTime: 10000, // 10 seconds
  costSpike: 50, // 50% increase
  inappropriateContentRate: 0.1, // 0.1%
};

class ConversationAlertingService {
  private alerts: Alert[] = [];
  private thresholds: AlertThresholds = DEFAULT_THRESHOLDS;
  private monitoringInterval: NodeJS.Timeout | null = null;
  private checkIntervalMs = 60000; // Check every minute
  private baselineCost = 0;
  private lastCheckTime = new Date();

  /**
   * Start monitoring and alerting
   */
  startMonitoring(): void {
    if (this.monitoringInterval) {
      console.log('⚠️ Monitoring already started');
      return;
    }

    console.log('🚨 Starting conversation alerting service...');
    
    // Initialize baseline cost
    this.initializeBaseline();

    // Start monitoring interval
    this.monitoringInterval = setInterval(() => {
      this.checkMetrics();
    }, this.checkIntervalMs);

    console.log('✅ Conversation alerting service started');
  }

  /**
   * Stop monitoring
   */
  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
      console.log('🛑 Conversation alerting service stopped');
    }
  }

  /**
   * Initialize baseline metrics
   */
  private async initializeBaseline(): Promise<void> {
    try {
      const endDate = new Date();
      const startDate = new Date(endDate.getTime() - 24 * 60 * 60 * 1000); // Last 24 hours

      const metrics = await conversationMetricsService.getConversationMetrics(
        startDate,
        endDate
      );

      this.baselineCost = metrics.avgCostPerConversation * metrics.totalConversations;
      console.log(`📊 Baseline cost initialized: $${this.baselineCost.toFixed(2)}`);
    } catch (error) {
      console.error('Failed to initialize baseline:', error);
    }
  }

  /**
   * Check all metrics and trigger alerts if needed
   */
  private async checkMetrics(): Promise<void> {
    try {
      const now = new Date();
      const checkWindowStart = new Date(now.getTime() - this.checkIntervalMs);

      // Get performance stats from logger
      const performanceStats = conversationLogger.getPerformanceStats();

      // Check error rate
      if (performanceStats.errorRate > this.thresholds.errorRate) {
        this.createAlert({
          severity: 'critical',
          type: 'error_rate',
          message: `Error rate exceeded threshold: ${performanceStats.errorRate.toFixed(2)}%`,
          details: {
            currentRate: performanceStats.errorRate,
            threshold: this.thresholds.errorRate,
            timeWindow: this.checkIntervalMs,
          },
        });
      }

      // Check response time (using average as proxy for 95th percentile)
      if (performanceStats.avgResponseTime > this.thresholds.responseTime) {
        this.createAlert({
          severity: 'warning',
          type: 'response_time',
          message: `Response time exceeded threshold: ${(performanceStats.avgResponseTime / 1000).toFixed(2)}s`,
          details: {
            currentTime: performanceStats.avgResponseTime,
            threshold: this.thresholds.responseTime,
            timeWindow: this.checkIntervalMs,
          },
        });
      }

      // Check cost spike
      await this.checkCostSpike();

      // Check inappropriate content rate
      await this.checkInappropriateContent();

      this.lastCheckTime = now;
    } catch (error) {
      console.error('Error checking metrics:', error);
    }
  }

  /**
   * Check for cost spikes
   */
  private async checkCostSpike(): Promise<void> {
    try {
      const endDate = new Date();
      const startDate = new Date(endDate.getTime() - 60 * 60 * 1000); // Last hour

      const metrics = await conversationMetricsService.getConversationMetrics(
        startDate,
        endDate
      );

      const currentCost = metrics.avgCostPerConversation * metrics.totalConversations;

      if (this.baselineCost > 0) {
        const costIncrease = ((currentCost - this.baselineCost) / this.baselineCost) * 100;

        if (costIncrease > this.thresholds.costSpike) {
          this.createAlert({
            severity: 'critical',
            type: 'cost_spike',
            message: `API cost spike detected: ${costIncrease.toFixed(2)}% increase`,
            details: {
              currentCost,
              baselineCost: this.baselineCost,
              increase: costIncrease,
              threshold: this.thresholds.costSpike,
            },
          });
        }
      }

      // Update baseline (rolling average)
      this.baselineCost = (this.baselineCost * 0.9) + (currentCost * 0.1);
    } catch (error) {
      console.error('Error checking cost spike:', error);
    }
  }

  /**
   * Check for inappropriate content
   */
  private async checkInappropriateContent(): Promise<void> {
    try {
      const feedbackStats = conversationLogger.getFeedbackStats();
      const reportRate = feedbackStats.totalReports / Math.max(feedbackStats.totalRatings, 1) * 100;

      if (reportRate > this.thresholds.inappropriateContentRate) {
        this.createAlert({
          severity: 'critical',
          type: 'inappropriate_content',
          message: `Inappropriate content rate exceeded: ${reportRate.toFixed(2)}%`,
          details: {
            totalReports: feedbackStats.totalReports,
            totalRatings: feedbackStats.totalRatings,
            reportRate,
            threshold: this.thresholds.inappropriateContentRate,
          },
        });
      }
    } catch (error) {
      console.error('Error checking inappropriate content:', error);
    }
  }

  /**
   * Create a new alert
   */
  private createAlert(data: {
    severity: 'critical' | 'warning' | 'info';
    type: Alert['type'];
    message: string;
    details: Record<string, any>;
  }): void {
    const alert: Alert = {
      id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      severity: data.severity,
      type: data.type,
      message: data.message,
      details: data.details,
      resolved: false,
    };

    this.alerts.push(alert);

    // Log the alert
    const color = data.severity === 'critical' ? '\x1b[31m' : data.severity === 'warning' ? '\x1b[33m' : '\x1b[36m';
    console.log(`${color}🚨 ALERT [${data.severity.toUpperCase()}]\x1b[0m ${data.message}`);
    console.log('Details:', JSON.stringify(data.details, null, 2));

    // Send notification
    this.sendNotification(alert);

    // Trim old alerts
    this.trimAlerts();
  }

  /**
   * Send alert notification
   * This is a placeholder - implement based on your notification infrastructure
   */
  private sendNotification(alert: Alert): void {
    // TODO: Implement notification sending
    // Examples:
    // - Email (SendGrid, AWS SES)
    // - Slack webhook
    // - PagerDuty
    // - Discord webhook
    // - SMS (Twilio)
    // - Push notifications

    if (process.env.NODE_ENV === 'production') {
      // In production, you would send actual notifications
      // For now, just log to stdout which can be captured by monitoring tools
      console.log(JSON.stringify({
        type: 'CONVERSATION_ALERT',
        alert,
      }));
    }

    // Example Slack webhook (uncomment and configure)
    /*
    if (process.env.SLACK_WEBHOOK_URL) {
      fetch(process.env.SLACK_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: `🚨 ${alert.severity.toUpperCase()}: ${alert.message}`,
          attachments: [{
            color: alert.severity === 'critical' ? 'danger' : 'warning',
            fields: Object.entries(alert.details).map(([key, value]) => ({
              title: key,
              value: String(value),
              short: true,
            })),
          }],
        }),
      }).catch(err => console.error('Failed to send Slack notification:', err));
    }
    */
  }

  /**
   * Get all alerts
   */
  getAlerts(options?: {
    severity?: Alert['severity'];
    type?: Alert['type'];
    resolved?: boolean;
    limit?: number;
  }): Alert[] {
    let filtered = [...this.alerts];

    if (options?.severity) {
      filtered = filtered.filter((a) => a.severity === options.severity);
    }

    if (options?.type) {
      filtered = filtered.filter((a) => a.type === options.type);
    }

    if (options?.resolved !== undefined) {
      filtered = filtered.filter((a) => a.resolved === options.resolved);
    }

    // Sort by timestamp (newest first)
    filtered.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    if (options?.limit) {
      filtered = filtered.slice(0, options.limit);
    }

    return filtered;
  }

  /**
   * Get unresolved alerts
   */
  getUnresolvedAlerts(): Alert[] {
    return this.getAlerts({ resolved: false });
  }

  /**
   * Resolve an alert
   */
  resolveAlert(alertId: string): boolean {
    const alert = this.alerts.find((a) => a.id === alertId);
    if (alert) {
      alert.resolved = true;
      console.log(`✅ Alert resolved: ${alert.message}`);
      return true;
    }
    return false;
  }

  /**
   * Resolve all alerts of a specific type
   */
  resolveAlertsByType(type: Alert['type']): number {
    let count = 0;
    this.alerts.forEach((alert) => {
      if (alert.type === type && !alert.resolved) {
        alert.resolved = true;
        count++;
      }
    });
    console.log(`✅ Resolved ${count} alerts of type: ${type}`);
    return count;
  }

  /**
   * Update alert thresholds
   */
  updateThresholds(thresholds: Partial<AlertThresholds>): void {
    this.thresholds = { ...this.thresholds, ...thresholds };
    console.log('📊 Alert thresholds updated:', this.thresholds);
  }

  /**
   * Get current thresholds
   */
  getThresholds(): AlertThresholds {
    return { ...this.thresholds };
  }

  /**
   * Clear all alerts
   */
  clearAlerts(): void {
    this.alerts = [];
    console.log('🗑️ All alerts cleared');
  }

  /**
   * Trim old alerts to prevent memory issues
   */
  private trimAlerts(): void {
    const maxAlerts = 1000;
    if (this.alerts.length > maxAlerts) {
      this.alerts = this.alerts.slice(-maxAlerts);
    }
  }

  /**
   * Get alert statistics
   */
  getAlertStats(): {
    total: number;
    unresolved: number;
    bySeverity: Record<Alert['severity'], number>;
    byType: Record<Alert['type'], number>;
  } {
    const stats = {
      total: this.alerts.length,
      unresolved: this.alerts.filter((a) => !a.resolved).length,
      bySeverity: {
        critical: 0,
        warning: 0,
        info: 0,
      } as Record<Alert['severity'], number>,
      byType: {
        error_rate: 0,
        response_time: 0,
        cost_spike: 0,
        inappropriate_content: 0,
        rate_limit: 0,
      } as Record<Alert['type'], number>,
    };

    this.alerts.forEach((alert) => {
      stats.bySeverity[alert.severity]++;
      stats.byType[alert.type]++;
    });

    return stats;
  }
}

// Singleton instance
export const conversationAlertingService = new ConversationAlertingService();

// Auto-start monitoring in production
if (process.env.NODE_ENV === 'production') {
  conversationAlertingService.startMonitoring();
}
