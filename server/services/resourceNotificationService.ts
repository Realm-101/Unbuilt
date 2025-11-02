import { db } from '../db';
import { users, userPreferences, resources, resourceCategories } from '@shared/schema';
import { eq, and, gte, inArray, sql } from 'drizzle-orm';

/**
 * Resource Notification Service
 * Handles email notifications for new resources and personalized alerts
 */

export interface NotificationPreferences {
  resourceNotifications: boolean;
  frequency: 'daily' | 'weekly';
  categories: number[];
  contributionUpdates: boolean;
}

export interface ResourceNotification {
  userId: number;
  userEmail: string;
  userName: string;
  resources: Array<{
    id: number;
    title: string;
    description: string;
    url: string;
    categoryName: string;
    resourceType: string;
  }>;
  frequency: 'daily' | 'weekly';
}

/**
 * Get users who should receive resource notifications
 */
export async function getUsersForNotifications(frequency: 'daily' | 'weekly'): Promise<Array<{
  userId: number;
  userEmail: string;
  userName: string;
  categories: number[];
}>> {
  try {
    const prefs = await db
      .select({
        userId: userPreferences.userId,
        userEmail: users.email,
        userName: users.name,
        notificationPreferences: userPreferences.notificationPreferences,
      })
      .from(userPreferences)
      .innerJoin(users, eq(userPreferences.userId, users.id))
      .where(
        and(
          eq(users.isActive, true),
          sql`${userPreferences.notificationPreferences}->>'resourceNotifications' = 'true'`,
          sql`${userPreferences.notificationPreferences}->>'frequency' = ${frequency}`
        )
      );

    return prefs.map(pref => ({
      userId: pref.userId,
      userEmail: pref.userEmail,
      userName: pref.userName || 'User',
      categories: (pref.notificationPreferences as any)?.categories || [],
    }));
  } catch (error) {
    console.error('Error fetching users for notifications:', error);
    return [];
  }
}

/**
 * Get new resources since last notification
 */
export async function getNewResources(
  sinceDate: Date,
  categoryIds?: number[]
): Promise<Array<{
  id: number;
  title: string;
  description: string;
  url: string;
  categoryId: number | null;
  categoryName: string;
  resourceType: string;
  createdAt: string;
}>> {
  try {
    const query = db
      .select({
        id: resources.id,
        title: resources.title,
        description: resources.description,
        url: resources.url,
        categoryId: resources.categoryId,
        categoryName: resourceCategories.name,
        resourceType: resources.resourceType,
        createdAt: resources.createdAt,
      })
      .from(resources)
      .leftJoin(resourceCategories, eq(resources.categoryId, resourceCategories.id))
      .where(
        and(
          eq(resources.isActive, true),
          gte(resources.createdAt, sinceDate.toISOString())
        )
      )
      .orderBy(resources.createdAt);

    let newResources = await query;

    // Filter by categories if specified
    if (categoryIds && categoryIds.length > 0) {
      newResources = newResources.filter(r => 
        r.categoryId && categoryIds.includes(r.categoryId)
      );
    }

    return newResources.map(r => ({
      ...r,
      categoryName: r.categoryName || 'Uncategorized',
    }));
  } catch (error) {
    console.error('Error fetching new resources:', error);
    return [];
  }
}

/**
 * Build notification data for users
 */
export async function buildNotifications(
  frequency: 'daily' | 'weekly'
): Promise<ResourceNotification[]> {
  try {
    // Calculate date range based on frequency
    const now = new Date();
    const sinceDate = new Date();
    if (frequency === 'daily') {
      sinceDate.setDate(now.getDate() - 1);
    } else {
      sinceDate.setDate(now.getDate() - 7);
    }

    // Get users who want notifications
    const usersToNotify = await getUsersForNotifications(frequency);

    if (usersToNotify.length === 0) {
      console.log(`No users to notify for ${frequency} notifications`);
      return [];
    }

    console.log(`Building ${frequency} notifications for ${usersToNotify.length} users`);

    // Build notifications for each user
    const notifications: ResourceNotification[] = [];

    for (const user of usersToNotify) {
      // Get new resources (filtered by user's category preferences if any)
      const newResources = await getNewResources(
        sinceDate,
        user.categories.length > 0 ? user.categories : undefined
      );

      // Only send notification if there are new resources
      if (newResources.length > 0) {
        notifications.push({
          userId: user.userId,
          userEmail: user.userEmail,
          userName: user.userName,
          resources: newResources,
          frequency,
        });
      }
    }

    console.log(`Built ${notifications.length} notifications with resources`);
    return notifications;
  } catch (error) {
    console.error('Error building notifications:', error);
    return [];
  }
}

/**
 * Generate email HTML for resource notification
 */
export function generateResourceNotificationEmail(notification: ResourceNotification): string {
  const { userName, resources, frequency } = notification;
  const period = frequency === 'daily' ? 'today' : 'this week';

  const resourcesHtml = resources.map(resource => `
    <div style="background: #f9fafb; border-left: 4px solid #7c3aed; padding: 20px; margin: 15px 0; border-radius: 4px;">
      <h3 style="margin: 0 0 10px 0; color: #1f2937; font-size: 18px;">
        ${resource.title}
      </h3>
      <p style="margin: 0 0 10px 0; color: #6b7280; font-size: 14px;">
        ${resource.description.substring(0, 200)}${resource.description.length > 200 ? '...' : ''}
      </p>
      <div style="display: flex; gap: 10px; margin-bottom: 10px;">
        <span style="background: #e0e7ff; color: #4338ca; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600;">
          ${resource.categoryName}
        </span>
        <span style="background: #fef3c7; color: #92400e; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600;">
          ${resource.resourceType}
        </span>
      </div>
      <a href="${resource.url}" style="color: #7c3aed; text-decoration: none; font-weight: 600; font-size: 14px;">
        View Resource →
      </a>
    </div>
  `).join('');

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Resources Available - Unbuilt</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f3f4f6;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #7c3aed 0%, #ec4899 100%); padding: 40px 30px; text-align: center;">
      <h1 style="margin: 0; color: #ffffff; font-size: 28px;">
        New Resources Available
      </h1>
      <p style="margin: 10px 0 0 0; color: #ffffff; opacity: 0.9; font-size: 16px;">
        ${resources.length} new resource${resources.length !== 1 ? 's' : ''} added ${period}
      </p>
    </div>

    <!-- Content -->
    <div style="padding: 30px;">
      <p style="margin: 0 0 20px 0; color: #1f2937; font-size: 16px;">
        Hi ${userName},
      </p>
      <p style="margin: 0 0 30px 0; color: #6b7280; font-size: 14px; line-height: 1.6;">
        We've added ${resources.length} new resource${resources.length !== 1 ? 's' : ''} to the Unbuilt Resource Library that match your interests. Check them out below:
      </p>

      ${resourcesHtml}

      <div style="margin-top: 30px; padding: 20px; background: #f9fafb; border-radius: 8px; text-align: center;">
        <p style="margin: 0 0 15px 0; color: #1f2937; font-size: 14px;">
          Want to see all resources?
        </p>
        <a href="https://unbuilt.one/resources" style="display: inline-block; background: #7c3aed; color: #ffffff; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 14px;">
          Browse Resource Library
        </a>
      </div>
    </div>

    <!-- Footer -->
    <div style="padding: 30px; background: #f9fafb; border-top: 1px solid #e5e7eb;">
      <p style="margin: 0 0 10px 0; color: #6b7280; font-size: 12px; text-align: center;">
        You're receiving this email because you opted in to resource notifications.
      </p>
      <p style="margin: 0; color: #6b7280; font-size: 12px; text-align: center;">
        <a href="https://unbuilt.one/dashboard" style="color: #7c3aed; text-decoration: none;">
          Manage notification preferences
        </a>
      </p>
    </div>
  </div>
</body>
</html>
  `;
}

/**
 * Send resource notification email (placeholder - integrate with email service)
 */
export async function sendResourceNotificationEmail(notification: ResourceNotification): Promise<boolean> {
  try {
    const emailHtml = generateResourceNotificationEmail(notification);
    
    // TODO: Integrate with actual email service (SendGrid, AWS SES, etc.)
    console.log(`📧 Would send email to ${notification.userEmail}`);
    console.log(`   Subject: ${notification.resources.length} New Resources in Unbuilt Library`);
    console.log(`   Resources: ${notification.resources.map(r => r.title).join(', ')}`);
    
    // For now, just log the email
    // In production, replace with actual email sending:
    // await emailService.send({
    //   to: notification.userEmail,
    //   subject: `${notification.resources.length} New Resources in Unbuilt Library`,
    //   html: emailHtml,
    // });
    
    return true;
  } catch (error) {
    console.error(`Failed to send notification to ${notification.userEmail}:`, error);
    return false;
  }
}

/**
 * Process and send all notifications for a given frequency
 */
export async function processNotifications(frequency: 'daily' | 'weekly'): Promise<{
  sent: number;
  failed: number;
  total: number;
}> {
  try {
    console.log(`🔔 Processing ${frequency} resource notifications...`);
    
    const notifications = await buildNotifications(frequency);
    
    if (notifications.length === 0) {
      console.log(`No ${frequency} notifications to send`);
      return { sent: 0, failed: 0, total: 0 };
    }

    let sent = 0;
    let failed = 0;

    for (const notification of notifications) {
      const success = await sendResourceNotificationEmail(notification);
      if (success) {
        sent++;
      } else {
        failed++;
      }
    }

    console.log(`✅ Sent ${sent} ${frequency} notifications, ${failed} failed`);
    
    return { sent, failed, total: notifications.length };
  } catch (error) {
    console.error(`Error processing ${frequency} notifications:`, error);
    return { sent: 0, failed: 0, total: 0 };
  }
}

/**
 * Track user interests based on their activity
 * This can be called when users view/bookmark resources to update their category preferences
 */
export async function trackUserInterest(userId: number, categoryId: number): Promise<void> {
  try {
    const prefs = await db.query.userPreferences.findFirst({
      where: eq(userPreferences.userId, userId),
    });

    if (!prefs) {
      return;
    }

    const notificationPrefs = prefs.notificationPreferences as any || {
      resourceNotifications: true,
      frequency: 'weekly',
      categories: [],
      contributionUpdates: true,
    };

    // Add category if not already in the list
    if (!notificationPrefs.categories.includes(categoryId)) {
      notificationPrefs.categories.push(categoryId);
      
      await db
        .update(userPreferences)
        .set({
          notificationPreferences: notificationPrefs,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(userPreferences.userId, userId));
      
      console.log(`📊 Tracked interest for user ${userId} in category ${categoryId}`);
    }
  } catch (error) {
    console.error('Error tracking user interest:', error);
  }
}
