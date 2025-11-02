import { db } from '../db';
import { 
  users, 
  userPreferences, 
  actionPlans, 
  planTasks,
  planPhases,
  type User,
} from '@shared/schema';
import { eq, and, lt, gte, sql } from 'drizzle-orm';

/**
 * Notification Service
 * Manages notifications for action plan events
 * 
 * Requirements: 4.4, 6.2, 6.4
 */

/**
 * Notification types for action plans
 */
export type NotificationType = 
  | 'task_assigned'
  | 'task_completed'
  | 'task_reminder'
  | 'phase_completed'
  | 'plan_completed'
  | 'task_overdue';

/**
 * Notification preferences for action plans
 */
export interface ActionPlanNotificationPreferences {
  taskReminders: boolean;
  taskAssignments: boolean;
  taskCompletions: boolean;
  phaseCompletions: boolean;
  planCompletions: boolean;
  reminderFrequency: 'daily' | 'weekly' | 'never';
  emailEnabled: boolean;
  inAppEnabled: boolean;
}

/**
 * In-app notification structure
 */
export interface InAppNotification {
  id: string;
  userId: number;
  type: NotificationType;
  title: string;
  message: string;
  metadata: {
    planId?: number;
    taskId?: number;
    phaseId?: number;
    assigneeId?: number;
    completedBy?: number;
    [key: string]: any;
  };
  read: boolean;
  createdAt: Date;
  actionUrl?: string;
}

/**
 * Email notification data
 */
export interface EmailNotification {
  to: string;
  subject: string;
  html: string;
  metadata: {
    type: NotificationType;
    userId: number;
    [key: string]: any;
  };
}

/**
 * Default notification preferences
 */
const DEFAULT_NOTIFICATION_PREFERENCES: ActionPlanNotificationPreferences = {
  taskReminders: true,
  taskAssignments: true,
  taskCompletions: true,
  phaseCompletions: true,
  planCompletions: true,
  reminderFrequency: 'weekly',
  emailEnabled: true,
  inAppEnabled: true,
};

/**
 * Notification Service Class
 */
export class NotificationService {
  /**
   * Get user's notification preferences
   */
  async getUserNotificationPreferences(
    userId: number
  ): Promise<ActionPlanNotificationPreferences> {
    try {
      const prefs = await db.query.userPreferences.findFirst({
        where: eq(userPreferences.userId, userId),
      });

      if (!prefs || !prefs.notificationPreferences) {
        return DEFAULT_NOTIFICATION_PREFERENCES;
      }

      const notifPrefs = prefs.notificationPreferences as any;
      
      // Merge with defaults to ensure all fields exist
      return {
        ...DEFAULT_NOTIFICATION_PREFERENCES,
        taskReminders: notifPrefs.taskReminders ?? DEFAULT_NOTIFICATION_PREFERENCES.taskReminders,
        taskAssignments: notifPrefs.taskAssignments ?? DEFAULT_NOTIFICATION_PREFERENCES.taskAssignments,
        taskCompletions: notifPrefs.taskCompletions ?? DEFAULT_NOTIFICATION_PREFERENCES.taskCompletions,
        phaseCompletions: notifPrefs.phaseCompletions ?? DEFAULT_NOTIFICATION_PREFERENCES.phaseCompletions,
        planCompletions: notifPrefs.planCompletions ?? DEFAULT_NOTIFICATION_PREFERENCES.planCompletions,
        reminderFrequency: notifPrefs.reminderFrequency ?? DEFAULT_NOTIFICATION_PREFERENCES.reminderFrequency,
        emailEnabled: notifPrefs.emailEnabled ?? DEFAULT_NOTIFICATION_PREFERENCES.emailEnabled,
        inAppEnabled: notifPrefs.inAppEnabled ?? DEFAULT_NOTIFICATION_PREFERENCES.inAppEnabled,
      };
    } catch (error) {
      console.error('Error fetching notification preferences:', error);
      return DEFAULT_NOTIFICATION_PREFERENCES;
    }
  }

  /**
   * Update user's notification preferences
   */
  async updateNotificationPreferences(
    userId: number,
    preferences: Partial<ActionPlanNotificationPreferences>
  ): Promise<void> {
    try {
      // Get existing preferences
      const existingPrefs = await db.query.userPreferences.findFirst({
        where: eq(userPreferences.userId, userId),
      });

      if (!existingPrefs) {
        // Create new preferences if they don't exist
        await db.insert(userPreferences).values({
          userId,
          notificationPreferences: {
            ...DEFAULT_NOTIFICATION_PREFERENCES,
            ...preferences,
          },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      } else {
        // Update existing preferences
        const currentNotifPrefs = (existingPrefs.notificationPreferences as any) || {};
        const updatedNotifPrefs = {
          ...currentNotifPrefs,
          ...preferences,
        };

        await db
          .update(userPreferences)
          .set({
            notificationPreferences: updatedNotifPrefs,
            updatedAt: new Date().toISOString(),
          })
          .where(eq(userPreferences.userId, userId));
      }

      console.log(`Updated notification preferences for user ${userId}`);
    } catch (error) {
      console.error('Error updating notification preferences:', error);
      throw error;
    }
  }

  /**
   * Send task assignment notification
   * Requirement: 6.2
   */
  async notifyTaskAssigned(
    taskId: number,
    assigneeId: number,
    assignedBy: number
  ): Promise<void> {
    try {
      const prefs = await this.getUserNotificationPreferences(assigneeId);
      
      if (!prefs.taskAssignments) {
        return; // User has disabled task assignment notifications
      }

      // Get task details
      const task = await db.query.planTasks.findFirst({
        where: eq(planTasks.id, taskId),
      });

      if (!task) {
        throw new Error('Task not found');
      }

      // Get plan details
      const plan = await db.query.actionPlans.findFirst({
        where: eq(actionPlans.id, task.planId),
      });

      if (!plan) {
        throw new Error('Plan not found');
      }

      // Get assigner details
      const assigner = await db.query.users.findFirst({
        where: eq(users.id, assignedBy),
      });

      // Get assignee details
      const assignee = await db.query.users.findFirst({
        where: eq(users.id, assigneeId),
      });

      if (!assignee) {
        throw new Error('Assignee not found');
      }

      const assignerName = assigner?.name || 'Someone';

      // Send in-app notification
      if (prefs.inAppEnabled) {
        await this.createInAppNotification({
          userId: assigneeId,
          type: 'task_assigned',
          title: 'New Task Assigned',
          message: `${assignerName} assigned you "${task.title}" in ${plan.title}`,
          metadata: {
            planId: plan.id,
            taskId: task.id,
            assignedBy,
          },
          actionUrl: `/plans/${plan.id}`,
        });
      }

      // Send email notification
      if (prefs.emailEnabled) {
        await this.sendTaskAssignmentEmail({
          to: assignee.email,
          assigneeName: assignee.name || 'there',
          assignerName,
          taskTitle: task.title,
          taskDescription: task.description || '',
          planTitle: plan.title,
          planId: plan.id,
          taskId: task.id,
        });
      }

      console.log(`Sent task assignment notification to user ${assigneeId}`);
    } catch (error) {
      console.error('Error sending task assignment notification:', error);
      throw error;
    }
  }

  /**
   * Send task completion notification
   * Requirement: 6.4
   */
  async notifyTaskCompleted(
    taskId: number,
    completedBy: number,
    planOwnerId: number
  ): Promise<void> {
    try {
      // Don't notify if the plan owner completed their own task
      if (completedBy === planOwnerId) {
        return;
      }

      const prefs = await this.getUserNotificationPreferences(planOwnerId);
      
      if (!prefs.taskCompletions) {
        return; // User has disabled task completion notifications
      }

      // Get task details
      const task = await db.query.planTasks.findFirst({
        where: eq(planTasks.id, taskId),
      });

      if (!task) {
        throw new Error('Task not found');
      }

      // Get plan details
      const plan = await db.query.actionPlans.findFirst({
        where: eq(actionPlans.id, task.planId),
      });

      if (!plan) {
        throw new Error('Plan not found');
      }

      // Get completer details
      const completer = await db.query.users.findFirst({
        where: eq(users.id, completedBy),
      });

      // Get plan owner details
      const owner = await db.query.users.findFirst({
        where: eq(users.id, planOwnerId),
      });

      if (!owner) {
        throw new Error('Plan owner not found');
      }

      const completerName = completer?.name || 'A team member';

      // Send in-app notification
      if (prefs.inAppEnabled) {
        await this.createInAppNotification({
          userId: planOwnerId,
          type: 'task_completed',
          title: 'Task Completed',
          message: `${completerName} completed "${task.title}" in ${plan.title}`,
          metadata: {
            planId: plan.id,
            taskId: task.id,
            completedBy,
          },
          actionUrl: `/plans/${plan.id}`,
        });
      }

      // Send email notification
      if (prefs.emailEnabled) {
        await this.sendTaskCompletionEmail({
          to: owner.email,
          ownerName: owner.name || 'there',
          completerName,
          taskTitle: task.title,
          planTitle: plan.title,
          planId: plan.id,
          taskId: task.id,
        });
      }

      console.log(`Sent task completion notification to user ${planOwnerId}`);
    } catch (error) {
      console.error('Error sending task completion notification:', error);
      throw error;
    }
  }

  /**
   * Send task reminder notification
   * Requirement: 4.4
   */
  async notifyTaskReminder(
    taskId: number,
    userId: number
  ): Promise<void> {
    try {
      const prefs = await this.getUserNotificationPreferences(userId);
      
      if (!prefs.taskReminders || prefs.reminderFrequency === 'never') {
        return; // User has disabled reminders
      }

      // Get task details
      const task = await db.query.planTasks.findFirst({
        where: eq(planTasks.id, taskId),
      });

      if (!task) {
        throw new Error('Task not found');
      }

      // Get plan details
      const plan = await db.query.actionPlans.findFirst({
        where: eq(actionPlans.id, task.planId),
      });

      if (!plan) {
        throw new Error('Plan not found');
      }

      // Get user details
      const user = await db.query.users.findFirst({
        where: eq(users.id, userId),
      });

      if (!user) {
        throw new Error('User not found');
      }

      // Calculate how long the task has been pending
      const daysPending = Math.floor(
        (Date.now() - new Date(task.updatedAt).getTime()) / (1000 * 60 * 60 * 24)
      );

      // Send in-app notification
      if (prefs.inAppEnabled) {
        await this.createInAppNotification({
          userId,
          type: 'task_reminder',
          title: 'Task Reminder',
          message: `"${task.title}" has been pending for ${daysPending} days`,
          metadata: {
            planId: plan.id,
            taskId: task.id,
            daysPending,
          },
          actionUrl: `/plans/${plan.id}`,
        });
      }

      // Send email notification
      if (prefs.emailEnabled) {
        await this.sendTaskReminderEmail({
          to: user.email,
          userName: user.name || 'there',
          taskTitle: task.title,
          taskDescription: task.description || '',
          planTitle: plan.title,
          planId: plan.id,
          taskId: task.id,
          daysPending,
        });
      }

      console.log(`Sent task reminder notification to user ${userId}`);
    } catch (error) {
      console.error('Error sending task reminder notification:', error);
      throw error;
    }
  }

  /**
   * Send phase completion notification
   */
  async notifyPhaseCompleted(
    phaseId: number,
    userId: number
  ): Promise<void> {
    try {
      const prefs = await this.getUserNotificationPreferences(userId);
      
      if (!prefs.phaseCompletions) {
        return; // User has disabled phase completion notifications
      }

      // Get phase details
      const phase = await db.query.planPhases.findFirst({
        where: eq(planPhases.id, phaseId),
      });

      if (!phase) {
        throw new Error('Phase not found');
      }

      // Get plan details
      const plan = await db.query.actionPlans.findFirst({
        where: eq(actionPlans.id, phase.planId),
      });

      if (!plan) {
        throw new Error('Plan not found');
      }

      // Get user details
      const user = await db.query.users.findFirst({
        where: eq(users.id, userId),
      });

      if (!user) {
        throw new Error('User not found');
      }

      // Send in-app notification
      if (prefs.inAppEnabled) {
        await this.createInAppNotification({
          userId,
          type: 'phase_completed',
          title: 'Phase Completed! 🎉',
          message: `Congratulations! You completed "${phase.name}" in ${plan.title}`,
          metadata: {
            planId: plan.id,
            phaseId: phase.id,
          },
          actionUrl: `/plans/${plan.id}`,
        });
      }

      // Send email notification
      if (prefs.emailEnabled) {
        await this.sendPhaseCompletionEmail({
          to: user.email,
          userName: user.name || 'there',
          phaseName: phase.name,
          planTitle: plan.title,
          planId: plan.id,
          phaseId: phase.id,
        });
      }

      console.log(`Sent phase completion notification to user ${userId}`);
    } catch (error) {
      console.error('Error sending phase completion notification:', error);
      throw error;
    }
  }

  /**
   * Send plan completion notification
   */
  async notifyPlanCompleted(
    planId: number,
    userId: number
  ): Promise<void> {
    try {
      const prefs = await this.getUserNotificationPreferences(userId);
      
      if (!prefs.planCompletions) {
        return; // User has disabled plan completion notifications
      }

      // Get plan details
      const plan = await db.query.actionPlans.findFirst({
        where: eq(actionPlans.id, planId),
      });

      if (!plan) {
        throw new Error('Plan not found');
      }

      // Get user details
      const user = await db.query.users.findFirst({
        where: eq(users.id, userId),
      });

      if (!user) {
        throw new Error('User not found');
      }

      // Calculate completion time
      const completionTime = plan.completedAt 
        ? Math.floor(
            (new Date(plan.completedAt).getTime() - new Date(plan.createdAt).getTime()) / (1000 * 60 * 60 * 24)
          )
        : 0;

      // Send in-app notification
      if (prefs.inAppEnabled) {
        await this.createInAppNotification({
          userId,
          type: 'plan_completed',
          title: 'Plan Completed! 🎊',
          message: `Amazing! You completed "${plan.title}" in ${completionTime} days`,
          metadata: {
            planId: plan.id,
            completionTime,
          },
          actionUrl: `/plans/${plan.id}`,
        });
      }

      // Send email notification
      if (prefs.emailEnabled) {
        await this.sendPlanCompletionEmail({
          to: user.email,
          userName: user.name || 'there',
          planTitle: plan.title,
          planId: plan.id,
          completionTime,
        });
      }

      console.log(`Sent plan completion notification to user ${userId}`);
    } catch (error) {
      console.error('Error sending plan completion notification:', error);
      throw error;
    }
  }

  /**
   * Create in-app notification
   * Stores notification in memory/database for display in UI
   */
  private async createInAppNotification(
    notification: Omit<InAppNotification, 'id' | 'read' | 'createdAt'>
  ): Promise<InAppNotification> {
    // Generate unique ID
    const id = `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const inAppNotif: InAppNotification = {
      id,
      ...notification,
      read: false,
      createdAt: new Date(),
    };

    // TODO: Store in database or cache (Redis)
    // For now, just log it
    console.log(`📬 In-app notification created:`, {
      id: inAppNotif.id,
      userId: inAppNotif.userId,
      type: inAppNotif.type,
      title: inAppNotif.title,
    });

    return inAppNotif;
  }

  /**
   * Email template: Task Assignment
   */
  private async sendTaskAssignmentEmail(data: {
    to: string;
    assigneeName: string;
    assignerName: string;
    taskTitle: string;
    taskDescription: string;
    planTitle: string;
    planId: number;
    taskId: number;
  }): Promise<void> {
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Task Assigned - Unbuilt</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f3f4f6;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
    <div style="background: linear-gradient(135deg, #7c3aed 0%, #ec4899 100%); padding: 40px 30px; text-align: center;">
      <h1 style="margin: 0; color: #ffffff; font-size: 28px;">New Task Assigned</h1>
    </div>
    <div style="padding: 30px;">
      <p style="margin: 0 0 20px 0; color: #1f2937; font-size: 16px;">Hi ${data.assigneeName},</p>
      <p style="margin: 0 0 30px 0; color: #6b7280; font-size: 14px; line-height: 1.6;">
        ${data.assignerName} has assigned you a new task in the action plan "${data.planTitle}".
      </p>
      <div style="background: #f9fafb; border-left: 4px solid #7c3aed; padding: 20px; margin: 15px 0; border-radius: 4px;">
        <h3 style="margin: 0 0 10px 0; color: #1f2937; font-size: 18px;">${data.taskTitle}</h3>
        <p style="margin: 0; color: #6b7280; font-size: 14px;">${data.taskDescription || 'No description provided.'}</p>
      </div>
      <div style="margin-top: 30px; text-align: center;">
        <a href="https://unbuilt.one/plans/${data.planId}" style="display: inline-block; background: #7c3aed; color: #ffffff; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 14px;">
          View Task
        </a>
      </div>
    </div>
    <div style="padding: 30px; background: #f9fafb; border-top: 1px solid #e5e7eb;">
      <p style="margin: 0; color: #6b7280; font-size: 12px; text-align: center;">
        <a href="https://unbuilt.one/settings" style="color: #7c3aed; text-decoration: none;">Manage notification preferences</a>
      </p>
    </div>
  </div>
</body>
</html>
    `;

    await this.sendEmail({
      to: data.to,
      subject: `New Task Assigned: ${data.taskTitle}`,
      html,
      metadata: {
        type: 'task_assigned',
        userId: 0, // Will be set by caller
        planId: data.planId,
        taskId: data.taskId,
      },
    });
  }

  /**
   * Email template: Task Completion
   */
  private async sendTaskCompletionEmail(data: {
    to: string;
    ownerName: string;
    completerName: string;
    taskTitle: string;
    planTitle: string;
    planId: number;
    taskId: number;
  }): Promise<void> {
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Task Completed - Unbuilt</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f3f4f6;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
    <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 40px 30px; text-align: center;">
      <h1 style="margin: 0; color: #ffffff; font-size: 28px;">Task Completed ✓</h1>
    </div>
    <div style="padding: 30px;">
      <p style="margin: 0 0 20px 0; color: #1f2937; font-size: 16px;">Hi ${data.ownerName},</p>
      <p style="margin: 0 0 30px 0; color: #6b7280; font-size: 14px; line-height: 1.6;">
        Great news! ${data.completerName} has completed a task in your action plan "${data.planTitle}".
      </p>
      <div style="background: #f0fdf4; border-left: 4px solid #10b981; padding: 20px; margin: 15px 0; border-radius: 4px;">
        <h3 style="margin: 0 0 10px 0; color: #1f2937; font-size: 18px;">${data.taskTitle}</h3>
        <p style="margin: 0; color: #059669; font-size: 14px; font-weight: 600;">✓ Completed</p>
      </div>
      <div style="margin-top: 30px; text-align: center;">
        <a href="https://unbuilt.one/plans/${data.planId}" style="display: inline-block; background: #10b981; color: #ffffff; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 14px;">
          View Progress
        </a>
      </div>
    </div>
    <div style="padding: 30px; background: #f9fafb; border-top: 1px solid #e5e7eb;">
      <p style="margin: 0; color: #6b7280; font-size: 12px; text-align: center;">
        <a href="https://unbuilt.one/settings" style="color: #7c3aed; text-decoration: none;">Manage notification preferences</a>
      </p>
    </div>
  </div>
</body>
</html>
    `;

    await this.sendEmail({
      to: data.to,
      subject: `Task Completed: ${data.taskTitle}`,
      html,
      metadata: {
        type: 'task_completed',
        userId: 0,
        planId: data.planId,
        taskId: data.taskId,
      },
    });
  }

  /**
   * Email template: Task Reminder
   */
  private async sendTaskReminderEmail(data: {
    to: string;
    userName: string;
    taskTitle: string;
    taskDescription: string;
    planTitle: string;
    planId: number;
    taskId: number;
    daysPending: number;
  }): Promise<void> {
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0;">
  <title>Task Reminder - Unbuilt</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f3f4f6;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
    <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 40px 30px; text-align: center;">
      <h1 style="margin: 0; color: #ffffff; font-size: 28px;">Task Reminder ⏰</h1>
    </div>
    <div style="padding: 30px;">
      <p style="margin: 0 0 20px 0; color: #1f2937; font-size: 16px;">Hi ${data.userName},</p>
      <p style="margin: 0 0 30px 0; color: #6b7280; font-size: 14px; line-height: 1.6;">
        This is a friendly reminder about a pending task in your action plan "${data.planTitle}". It's been ${data.daysPending} days since you last updated it.
      </p>
      <div style="background: #fffbeb; border-left: 4px solid #f59e0b; padding: 20px; margin: 15px 0; border-radius: 4px;">
        <h3 style="margin: 0 0 10px 0; color: #1f2937; font-size: 18px;">${data.taskTitle}</h3>
        <p style="margin: 0; color: #6b7280; font-size: 14px;">${data.taskDescription || 'No description provided.'}</p>
      </div>
      <div style="margin-top: 30px; text-align: center;">
        <a href="https://unbuilt.one/plans/${data.planId}" style="display: inline-block; background: #f59e0b; color: #ffffff; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 14px;">
          Update Task
        </a>
      </div>
    </div>
    <div style="padding: 30px; background: #f9fafb; border-top: 1px solid #e5e7eb;">
      <p style="margin: 0; color: #6b7280; font-size: 12px; text-align: center;">
        <a href="https://unbuilt.one/settings" style="color: #7c3aed; text-decoration: none;">Manage notification preferences</a>
      </p>
    </div>
  </div>
</body>
</html>
    `;

    await this.sendEmail({
      to: data.to,
      subject: `Reminder: ${data.taskTitle}`,
      html,
      metadata: {
        type: 'task_reminder',
        userId: 0,
        planId: data.planId,
        taskId: data.taskId,
      },
    });
  }

  /**
   * Email template: Phase Completion
   */
  private async sendPhaseCompletionEmail(data: {
    to: string;
    userName: string;
    phaseName: string;
    planTitle: string;
    planId: number;
    phaseId: number;
  }): Promise<void> {
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Phase Completed - Unbuilt</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f3f4f6;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
    <div style="background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%); padding: 40px 30px; text-align: center;">
      <h1 style="margin: 0; color: #ffffff; font-size: 28px;">Phase Completed! 🎉</h1>
    </div>
    <div style="padding: 30px;">
      <p style="margin: 0 0 20px 0; color: #1f2937; font-size: 16px;">Hi ${data.userName},</p>
      <p style="margin: 0 0 30px 0; color: #6b7280; font-size: 14px; line-height: 1.6;">
        Congratulations! You've completed the "${data.phaseName}" phase in your action plan "${data.planTitle}". Keep up the great work!
      </p>
      <div style="background: #f5f3ff; border-left: 4px solid #8b5cf6; padding: 20px; margin: 15px 0; border-radius: 4px;">
        <h3 style="margin: 0 0 10px 0; color: #1f2937; font-size: 18px;">${data.phaseName}</h3>
        <p style="margin: 0; color: #7c3aed; font-size: 14px; font-weight: 600;">✓ Phase Complete</p>
      </div>
      <div style="margin-top: 30px; text-align: center;">
        <a href="https://unbuilt.one/plans/${data.planId}" style="display: inline-block; background: #8b5cf6; color: #ffffff; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 14px;">
          Continue to Next Phase
        </a>
      </div>
    </div>
    <div style="padding: 30px; background: #f9fafb; border-top: 1px solid #e5e7eb;">
      <p style="margin: 0; color: #6b7280; font-size: 12px; text-align: center;">
        <a href="https://unbuilt.one/settings" style="color: #7c3aed; text-decoration: none;">Manage notification preferences</a>
      </p>
    </div>
  </div>
</body>
</html>
    `;

    await this.sendEmail({
      to: data.to,
      subject: `Phase Completed: ${data.phaseName}`,
      html,
      metadata: {
        type: 'phase_completed',
        userId: 0,
        planId: data.planId,
        phaseId: data.phaseId,
      },
    });
  }

  /**
   * Email template: Plan Completion
   */
  private async sendPlanCompletionEmail(data: {
    to: string;
    userName: string;
    planTitle: string;
    planId: number;
    completionTime: number;
  }): Promise<void> {
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Plan Completed - Unbuilt</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f3f4f6;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
    <div style="background: linear-gradient(135deg, #ec4899 0%, #be185d 100%); padding: 40px 30px; text-align: center;">
      <h1 style="margin: 0; color: #ffffff; font-size: 32px;">🎊 Plan Completed! 🎊</h1>
    </div>
    <div style="padding: 30px;">
      <p style="margin: 0 0 20px 0; color: #1f2937; font-size: 16px;">Hi ${data.userName},</p>
      <p style="margin: 0 0 30px 0; color: #6b7280; font-size: 14px; line-height: 1.6;">
        Amazing work! You've completed your entire action plan "${data.planTitle}" in ${data.completionTime} days. This is a huge accomplishment!
      </p>
      <div style="background: #fdf2f8; border-left: 4px solid #ec4899; padding: 20px; margin: 15px 0; border-radius: 4px;">
        <h3 style="margin: 0 0 10px 0; color: #1f2937; font-size: 18px;">${data.planTitle}</h3>
        <p style="margin: 0; color: #ec4899; font-size: 14px; font-weight: 600;">✓ All Tasks Complete</p>
        <p style="margin: 10px 0 0 0; color: #6b7280; font-size: 12px;">Completed in ${data.completionTime} days</p>
      </div>
      <div style="margin-top: 30px; text-align: center;">
        <a href="https://unbuilt.one/plans/${data.planId}" style="display: inline-block; background: #ec4899; color: #ffffff; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 14px;">
          View Summary
        </a>
      </div>
    </div>
    <div style="padding: 30px; background: #f9fafb; border-top: 1px solid #e5e7eb;">
      <p style="margin: 0; color: #6b7280; font-size: 12px; text-align: center;">
        <a href="https://unbuilt.one/settings" style="color: #7c3aed; text-decoration: none;">Manage notification preferences</a>
      </p>
    </div>
  </div>
</body>
</html>
    `;

    await this.sendEmail({
      to: data.to,
      subject: `🎊 Plan Completed: ${data.planTitle}`,
      html,
      metadata: {
        type: 'plan_completed',
        userId: 0,
        planId: data.planId,
      },
    });
  }

  /**
   * Send email (placeholder - integrate with email service)
   */
  private async sendEmail(notification: EmailNotification): Promise<void> {
    try {
      // TODO: Integrate with actual email service (SendGrid, AWS SES, etc.)
      console.log(`📧 Would send email to ${notification.to}`);
      console.log(`   Subject: ${notification.subject}`);
      console.log(`   Type: ${notification.metadata.type}`);
      
      // For now, just log the email
      // In production, replace with actual email sending:
      // await emailService.send({
      //   to: notification.to,
      //   subject: notification.subject,
      //   html: notification.html,
      // });
    } catch (error) {
      console.error(`Failed to send email to ${notification.to}:`, error);
      throw error;
    }
  }

  /**
   * Get users who need task reminders
   * Finds tasks that have been inactive for a certain period
   */
  async getUsersNeedingReminders(
    frequency: 'daily' | 'weekly'
  ): Promise<Array<{ userId: number; taskId: number; daysPending: number }>> {
    try {
      const now = new Date();
      const daysThreshold = frequency === 'daily' ? 1 : 7;
      const thresholdDate = new Date();
      thresholdDate.setDate(now.getDate() - daysThreshold);

      // Find tasks that are in_progress or not_started and haven't been updated recently
      const tasks = await db
        .select({
          taskId: planTasks.id,
          userId: actionPlans.userId,
          updatedAt: planTasks.updatedAt,
        })
        .from(planTasks)
        .innerJoin(actionPlans, eq(planTasks.planId, actionPlans.id))
        .where(
          and(
            sql`${planTasks.status} IN ('not_started', 'in_progress')`,
            eq(actionPlans.status, 'active'),
            lt(planTasks.updatedAt, thresholdDate.toISOString())
          )
        );

      return tasks.map(task => ({
        userId: task.userId,
        taskId: task.taskId,
        daysPending: Math.floor(
          (now.getTime() - new Date(task.updatedAt).getTime()) / (1000 * 60 * 60 * 24)
        ),
      }));
    } catch (error) {
      console.error('Error getting users needing reminders:', error);
      return [];
    }
  }

  /**
   * Process task reminders for a given frequency
   */
  async processTaskReminders(frequency: 'daily' | 'weekly'): Promise<{
    sent: number;
    failed: number;
    total: number;
  }> {
    try {
      console.log(`🔔 Processing ${frequency} task reminders...`);
      
      const reminders = await this.getUsersNeedingReminders(frequency);
      
      if (reminders.length === 0) {
        console.log(`No ${frequency} reminders to send`);
        return { sent: 0, failed: 0, total: 0 };
      }

      let sent = 0;
      let failed = 0;

      for (const reminder of reminders) {
        try {
          await this.notifyTaskReminder(reminder.taskId, reminder.userId);
          sent++;
        } catch (error) {
          console.error(`Failed to send reminder for task ${reminder.taskId}:`, error);
          failed++;
        }
      }

      console.log(`✅ Sent ${sent} ${frequency} reminders, ${failed} failed`);
      
      return { sent, failed, total: reminders.length };
    } catch (error) {
      console.error(`Error processing ${frequency} reminders:`, error);
      return { sent: 0, failed: 0, total: 0 };
    }
  }
}

// Export singleton instance
export const notificationService = new NotificationService();
