import { db } from '../db';
import { conversationAnalytics, conversations, users } from '@shared/schema';
import { eq, and, sql, gte } from 'drizzle-orm';
import { usageTrackingService } from './usageTrackingService';

/**
 * Cost Monitoring Service
 * Monitors API costs, generates alerts, and provides cost reports
 */

export interface CostAlert {
  type: 'spike' | 'threshold' | 'budget';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  currentCost: number;
  threshold?: number;
  timestamp: Date;
  userId?: number;
}

export interface CostReport {
  period: string;
  totalCost: number;
  conversationCost: number;
  analysisCost: number;
  costPerUser: number;
  costPerConversation: number;
  costPerQuestion: number;
  topUsers: Array<{
    userId: number;
    email: string;
    cost: number;
    questionsAsked: number;
  }>;
  dailyBreakdown: Array<{
    date: string;
    cost: number;
    questions: number;
  }>;
}

export interface UserCostBreakdown {
  userId: number;
  totalCost: number;
  conversationCost: number;
  analysisCost: number;
  questionsAsked: number;
  tokensUsed: number;
  averageCostPerQuestion: number;
  period: string;
}

// Cost thresholds for alerts
const COST_THRESHOLDS = {
  hourly: {
    warning: 5.0,    // $5/hour
    critical: 10.0,  // $10/hour
  },
  daily: {
    warning: 50.0,   // $50/day
    critical: 100.0, // $100/day
  },
  monthly: {
    warning: 500.0,   // $500/month
    critical: 1000.0, // $1000/month
  },
};

// Spike detection threshold (percentage increase)
const SPIKE_THRESHOLD = 0.5; // 50% increase

/**
 * Calculate cost per conversation
 * Separates conversation costs from initial analysis costs
 */
export async function calculateConversationCost(
  conversationId: number
): Promise<number> {
  try {
    const analytics = await db
      .select()
      .from(conversationAnalytics)
      .where(eq(conversationAnalytics.conversationId, conversationId))
      .limit(1);

    if (analytics.length === 0) {
      return 0;
    }

    const totalTokens = analytics[0].totalTokensUsed;
    
    // Estimate input/output split (40% input, 60% output)
    const inputTokens = totalTokens * 0.4;
    const outputTokens = totalTokens * 0.6;

    return usageTrackingService.calculateCost({ input: inputTokens, output: outputTokens });
  } catch (error) {
    console.error('Error calculating conversation cost:', error);
    return 0;
  }
}

/**
 * Get total conversation costs for a user
 */
export async function getUserConversationCosts(
  userId: number,
  startDate?: Date,
  endDate?: Date
): Promise<number> {
  try {
    const start = startDate || new Date(0);
    const end = endDate || new Date();

    // Get all conversations for the user in the date range
    const userConversations = await db
      .select()
      .from(conversations)
      .where(
        and(
          eq(conversations.userId, userId),
          gte(conversations.createdAt, start.toISOString()),
          sql`${conversations.createdAt} <= ${end.toISOString()}`
        )
      );

    let totalCost = 0;

    for (const conversation of userConversations) {
      const cost = await calculateConversationCost(conversation.id);
      totalCost += cost;
    }

    return totalCost;
  } catch (error) {
    console.error('Error getting user conversation costs:', error);
    return 0;
  }
}

/**
 * Get cost breakdown for a user
 */
export async function getUserCostBreakdown(
  userId: number,
  startDate?: Date,
  endDate?: Date
): Promise<UserCostBreakdown> {
  try {
    const start = startDate || new Date(0);
    const end = endDate || new Date();

    // Get usage stats
    const usageStats = await usageTrackingService.getUserUsageStats(userId, start, end);

    // Get conversation costs
    const conversationCost = await getUserConversationCosts(userId, start, end);

    // For now, we'll assume all costs are conversation costs
    // In the future, we can separate initial analysis costs
    const analysisCost = 0;
    const totalCost = conversationCost + analysisCost;

    const averageCostPerQuestion = usageStats.questionsAsked > 0
      ? totalCost / usageStats.questionsAsked
      : 0;

    const period = startDate && endDate
      ? `${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`
      : 'All time';

    return {
      userId,
      totalCost: Math.round(totalCost * 100) / 100,
      conversationCost: Math.round(conversationCost * 100) / 100,
      analysisCost: Math.round(analysisCost * 100) / 100,
      questionsAsked: usageStats.questionsAsked,
      tokensUsed: usageStats.tokensUsed,
      averageCostPerQuestion: Math.round(averageCostPerQuestion * 10000) / 10000,
      period,
    };
  } catch (error) {
    console.error('Error getting user cost breakdown:', error);
    throw error;
  }
}

/**
 * Check for cost spikes
 * Compares current period costs with previous period
 */
export async function checkCostSpikes(
  periodHours: number = 1
): Promise<CostAlert[]> {
  try {
    const alerts: CostAlert[] = [];
    const now = new Date();
    const currentPeriodStart = new Date(now.getTime() - periodHours * 60 * 60 * 1000);
    const previousPeriodStart = new Date(currentPeriodStart.getTime() - periodHours * 60 * 60 * 1000);

    // Get all users
    const allUsers = await db.select().from(users);

    for (const user of allUsers) {
      // Get current period cost
      const currentCost = await getUserConversationCosts(
        user.id,
        currentPeriodStart,
        now
      );

      // Get previous period cost
      const previousCost = await getUserConversationCosts(
        user.id,
        previousPeriodStart,
        currentPeriodStart
      );

      // Check for spike
      if (previousCost > 0) {
        const increasePercentage = (currentCost - previousCost) / previousCost;

        if (increasePercentage > SPIKE_THRESHOLD) {
          alerts.push({
            type: 'spike',
            severity: increasePercentage > 1.0 ? 'critical' : 'high',
            message: `Cost spike detected for user ${user.email}: ${Math.round(increasePercentage * 100)}% increase`,
            currentCost,
            threshold: previousCost * (1 + SPIKE_THRESHOLD),
            timestamp: now,
            userId: user.id,
          });
        }
      }
    }

    return alerts;
  } catch (error) {
    console.error('Error checking cost spikes:', error);
    return [];
  }
}

/**
 * Check cost thresholds
 * Monitors if costs exceed predefined thresholds
 */
export async function checkCostThresholds(): Promise<CostAlert[]> {
  try {
    const alerts: CostAlert[] = [];
    const now = new Date();

    // Check hourly costs
    const hourStart = new Date(now.getTime() - 60 * 60 * 1000);
    const hourlySummary = await usageTrackingService.getAllUsersUsageSummary(hourStart, now);

    if (hourlySummary.totalCost > COST_THRESHOLDS.hourly.critical) {
      alerts.push({
        type: 'threshold',
        severity: 'critical',
        message: `Hourly cost threshold exceeded: $${hourlySummary.totalCost.toFixed(2)}`,
        currentCost: hourlySummary.totalCost,
        threshold: COST_THRESHOLDS.hourly.critical,
        timestamp: now,
      });
    } else if (hourlySummary.totalCost > COST_THRESHOLDS.hourly.warning) {
      alerts.push({
        type: 'threshold',
        severity: 'medium',
        message: `Hourly cost warning: $${hourlySummary.totalCost.toFixed(2)}`,
        currentCost: hourlySummary.totalCost,
        threshold: COST_THRESHOLDS.hourly.warning,
        timestamp: now,
      });
    }

    // Check daily costs
    const dayStart = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const dailySummary = await usageTrackingService.getAllUsersUsageSummary(dayStart, now);

    if (dailySummary.totalCost > COST_THRESHOLDS.daily.critical) {
      alerts.push({
        type: 'threshold',
        severity: 'critical',
        message: `Daily cost threshold exceeded: $${dailySummary.totalCost.toFixed(2)}`,
        currentCost: dailySummary.totalCost,
        threshold: COST_THRESHOLDS.daily.critical,
        timestamp: now,
      });
    } else if (dailySummary.totalCost > COST_THRESHOLDS.daily.warning) {
      alerts.push({
        type: 'threshold',
        severity: 'medium',
        message: `Daily cost warning: $${dailySummary.totalCost.toFixed(2)}`,
        currentCost: dailySummary.totalCost,
        threshold: COST_THRESHOLDS.daily.warning,
        timestamp: now,
      });
    }

    // Check monthly costs
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthlySummary = await usageTrackingService.getAllUsersUsageSummary(monthStart, now);

    if (monthlySummary.totalCost > COST_THRESHOLDS.monthly.critical) {
      alerts.push({
        type: 'threshold',
        severity: 'critical',
        message: `Monthly cost threshold exceeded: $${monthlySummary.totalCost.toFixed(2)}`,
        currentCost: monthlySummary.totalCost,
        threshold: COST_THRESHOLDS.monthly.critical,
        timestamp: now,
      });
    } else if (monthlySummary.totalCost > COST_THRESHOLDS.monthly.warning) {
      alerts.push({
        type: 'threshold',
        severity: 'medium',
        message: `Monthly cost warning: $${monthlySummary.totalCost.toFixed(2)}`,
        currentCost: monthlySummary.totalCost,
        threshold: COST_THRESHOLDS.monthly.warning,
        timestamp: now,
      });
    }

    return alerts;
  } catch (error) {
    console.error('Error checking cost thresholds:', error);
    return [];
  }
}

/**
 * Generate cost report for a period
 */
export async function generateCostReport(
  startDate: Date,
  endDate: Date
): Promise<CostReport> {
  try {
    // Get overall summary
    const summary = await usageTrackingService.getAllUsersUsageSummary(startDate, endDate);

    // Get all users
    const allUsers = await db.select().from(users);

    // Calculate top users by cost
    const userCosts: Array<{
      userId: number;
      email: string;
      cost: number;
      questionsAsked: number;
    }> = [];

    for (const user of allUsers) {
      const userStats = await usageTrackingService.getUserUsageStats(
        user.id,
        startDate,
        endDate
      );

      if (userStats.totalCost > 0) {
        userCosts.push({
          userId: user.id,
          email: user.email,
          cost: userStats.totalCost,
          questionsAsked: userStats.questionsAsked,
        });
      }
    }

    // Sort by cost descending
    userCosts.sort((a, b) => b.cost - a.cost);
    const topUsers = userCosts.slice(0, 10);

    // Generate daily breakdown
    const dailyBreakdown: Array<{
      date: string;
      cost: number;
      questions: number;
    }> = [];

    const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

    for (let i = 0; i < daysDiff; i++) {
      const dayStart = new Date(startDate);
      dayStart.setDate(dayStart.getDate() + i);
      dayStart.setHours(0, 0, 0, 0);

      const dayEnd = new Date(dayStart);
      dayEnd.setHours(23, 59, 59, 999);

      const daySummary = await usageTrackingService.getAllUsersUsageSummary(dayStart, dayEnd);

      dailyBreakdown.push({
        date: dayStart.toISOString().split('T')[0],
        cost: daySummary.totalCost,
        questions: daySummary.totalQuestions,
      });
    }

    // Calculate metrics
    const conversationCost = summary.totalCost; // For now, all costs are conversation costs
    const analysisCost = 0; // Placeholder for future separation
    const costPerUser = summary.totalUsers > 0 ? summary.totalCost / summary.totalUsers : 0;
    const costPerConversation = summary.totalQuestions > 0 
      ? summary.totalCost / summary.totalQuestions 
      : 0;
    const costPerQuestion = summary.totalQuestions > 0 
      ? summary.totalCost / summary.totalQuestions 
      : 0;

    const period = `${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`;

    return {
      period,
      totalCost: Math.round(summary.totalCost * 100) / 100,
      conversationCost: Math.round(conversationCost * 100) / 100,
      analysisCost: Math.round(analysisCost * 100) / 100,
      costPerUser: Math.round(costPerUser * 100) / 100,
      costPerConversation: Math.round(costPerConversation * 10000) / 10000,
      costPerQuestion: Math.round(costPerQuestion * 10000) / 10000,
      topUsers,
      dailyBreakdown,
    };
  } catch (error) {
    console.error('Error generating cost report:', error);
    throw error;
  }
}

/**
 * Monitor costs and send alerts
 * Should be called periodically (e.g., every hour)
 */
export async function monitorCosts(): Promise<CostAlert[]> {
  try {
    const alerts: CostAlert[] = [];

    // Check for cost spikes
    const spikeAlerts = await checkCostSpikes(1); // Check last hour
    alerts.push(...spikeAlerts);

    // Check cost thresholds
    const thresholdAlerts = await checkCostThresholds();
    alerts.push(...thresholdAlerts);

    // Log alerts
    if (alerts.length > 0) {
      console.log(`[COST MONITORING] ${alerts.length} alerts detected:`);
      alerts.forEach(alert => {
        console.log(`  [${alert.severity.toUpperCase()}] ${alert.message}`);
      });
    }

    return alerts;
  } catch (error) {
    console.error('Error monitoring costs:', error);
    return [];
  }
}

/**
 * Get real-time cost metrics
 */
export async function getRealTimeCostMetrics(): Promise<{
  currentHourCost: number;
  currentDayCost: number;
  currentMonthCost: number;
  projectedMonthlyCost: number;
}> {
  try {
    const now = new Date();

    // Current hour
    const hourStart = new Date(now.getTime() - 60 * 60 * 1000);
    const hourSummary = await usageTrackingService.getAllUsersUsageSummary(hourStart, now);

    // Current day
    const dayStart = new Date(now);
    dayStart.setHours(0, 0, 0, 0);
    const daySummary = await usageTrackingService.getAllUsersUsageSummary(dayStart, now);

    // Current month
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthSummary = await usageTrackingService.getAllUsersUsageSummary(monthStart, now);

    // Project monthly cost based on current daily average
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const dayOfMonth = now.getDate();
    const projectedMonthlyCost = dayOfMonth > 0 
      ? (monthSummary.totalCost / dayOfMonth) * daysInMonth 
      : 0;

    return {
      currentHourCost: Math.round(hourSummary.totalCost * 100) / 100,
      currentDayCost: Math.round(daySummary.totalCost * 100) / 100,
      currentMonthCost: Math.round(monthSummary.totalCost * 100) / 100,
      projectedMonthlyCost: Math.round(projectedMonthlyCost * 100) / 100,
    };
  } catch (error) {
    console.error('Error getting real-time cost metrics:', error);
    throw error;
  }
}

export const costMonitoringService = {
  calculateConversationCost,
  getUserConversationCosts,
  getUserCostBreakdown,
  checkCostSpikes,
  checkCostThresholds,
  generateCostReport,
  monitorCosts,
  getRealTimeCostMetrics,
};
