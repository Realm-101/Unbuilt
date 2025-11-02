import { db } from '../db';
import { users, resourceContributions } from '@shared/schema';
import { eq } from 'drizzle-orm';

/**
 * Contribution Notification Service
 * Handles email notifications for resource contributions
 */

export interface ContributionNotificationData {
  contributionId: number;
  contributorEmail: string;
  contributorName: string;
  title: string;
  url: string;
  status: 'pending' | 'approved' | 'rejected';
  adminNotes?: string;
  reviewedBy?: string;
}

/**
 * Generate email HTML for new contribution notification (to admins)
 */
export function generateNewContributionEmail(data: ContributionNotificationData): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Resource Contribution - Unbuilt</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f3f4f6;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #7c3aed 0%, #ec4899 100%); padding: 40px 30px; text-align: center;">
      <h1 style="margin: 0; color: #ffffff; font-size: 28px;">
        New Resource Contribution
      </h1>
      <p style="margin: 10px 0 0 0; color: #ffffff; opacity: 0.9; font-size: 16px;">
        A user has submitted a new resource for review
      </p>
    </div>

    <!-- Content -->
    <div style="padding: 30px;">
      <div style="background: #f9fafb; border-left: 4px solid #3b82f6; padding: 20px; margin: 20px 0; border-radius: 4px;">
        <h3 style="margin: 0 0 15px 0; color: #1f2937; font-size: 18px;">
          ${data.title}
        </h3>
        <p style="margin: 0 0 10px 0; color: #6b7280; font-size: 14px;">
          <strong>Submitted by:</strong> ${data.contributorName} (${data.contributorEmail})
        </p>
        <p style="margin: 0 0 10px 0; color: #6b7280; font-size: 14px;">
          <strong>URL:</strong> <a href="${data.url}" style="color: #7c3aed; text-decoration: none;">${data.url}</a>
        </p>
        <p style="margin: 0; color: #6b7280; font-size: 14px;">
          <strong>Contribution ID:</strong> #${data.contributionId}
        </p>
      </div>

      <div style="margin-top: 30px; padding: 20px; background: #fef3c7; border-radius: 8px; text-align: center;">
        <p style="margin: 0 0 15px 0; color: #92400e; font-size: 14px; font-weight: 600;">
          ⏳ This contribution is pending review
        </p>
        <a href="https://unbuilt.one/admin/resources/contributions" style="display: inline-block; background: #7c3aed; color: #ffffff; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 14px;">
          Review Contribution
        </a>
      </div>
    </div>

    <!-- Footer -->
    <div style="padding: 30px; background: #f9fafb; border-top: 1px solid #e5e7eb;">
      <p style="margin: 0; color: #6b7280; font-size: 12px; text-align: center;">
        You're receiving this email because you're an admin of the Unbuilt Resource Library.
      </p>
    </div>
  </div>
</body>
</html>
  `;
}

/**
 * Generate email HTML for contribution approval notification
 */
export function generateApprovalEmail(data: ContributionNotificationData): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Resource Contribution Approved - Unbuilt</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f3f4f6;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 40px 30px; text-align: center;">
      <h1 style="margin: 0; color: #ffffff; font-size: 28px;">
        ✅ Contribution Approved!
      </h1>
      <p style="margin: 10px 0 0 0; color: #ffffff; opacity: 0.9; font-size: 16px;">
        Your resource has been added to the library
      </p>
    </div>

    <!-- Content -->
    <div style="padding: 30px;">
      <p style="margin: 0 0 20px 0; color: #1f2937; font-size: 16px;">
        Hi ${data.contributorName},
      </p>
      <p style="margin: 0 0 30px 0; color: #6b7280; font-size: 14px; line-height: 1.6;">
        Great news! Your resource contribution has been approved and is now live in the Unbuilt Resource Library. Thank you for helping the community!
      </p>

      <div style="background: #f9fafb; border-left: 4px solid #10b981; padding: 20px; margin: 20px 0; border-radius: 4px;">
        <h3 style="margin: 0 0 10px 0; color: #1f2937; font-size: 18px;">
          ${data.title}
        </h3>
        <p style="margin: 0; color: #6b7280; font-size: 14px;">
          <a href="${data.url}" style="color: #7c3aed; text-decoration: none;">${data.url}</a>
        </p>
      </div>

      ${data.adminNotes ? `
      <div style="background: #e0e7ff; border-left: 4px solid #4338ca; padding: 15px; margin: 20px 0; border-radius: 4px;">
        <p style="margin: 0 0 5px 0; color: #1f2937; font-size: 12px; font-weight: 600; text-transform: uppercase;">
          Admin Note
        </p>
        <p style="margin: 0; color: #4338ca; font-size: 14px;">
          ${data.adminNotes}
        </p>
      </div>
      ` : ''}

      <div style="margin-top: 30px; padding: 20px; background: #f9fafb; border-radius: 8px; text-align: center;">
        <p style="margin: 0 0 15px 0; color: #1f2937; font-size: 14px;">
          Want to contribute more resources?
        </p>
        <a href="https://unbuilt.one/resources" style="display: inline-block; background: #7c3aed; color: #ffffff; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 14px;">
          Browse Resource Library
        </a>
      </div>
    </div>

    <!-- Footer -->
    <div style="padding: 30px; background: #f9fafb; border-top: 1px solid #e5e7eb;">
      <p style="margin: 0; color: #6b7280; font-size: 12px; text-align: center;">
        Thank you for contributing to the Unbuilt community!
      </p>
    </div>
  </div>
</body>
</html>
  `;
}

/**
 * Generate email HTML for contribution rejection notification
 */
export function generateRejectionEmail(data: ContributionNotificationData): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Resource Contribution Update - Unbuilt</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f3f4f6;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #6b7280 0%, #4b5563 100%); padding: 40px 30px; text-align: center;">
      <h1 style="margin: 0; color: #ffffff; font-size: 28px;">
        Contribution Update
      </h1>
      <p style="margin: 10px 0 0 0; color: #ffffff; opacity: 0.9; font-size: 16px;">
        About your recent resource submission
      </p>
    </div>

    <!-- Content -->
    <div style="padding: 30px;">
      <p style="margin: 0 0 20px 0; color: #1f2937; font-size: 16px;">
        Hi ${data.contributorName},
      </p>
      <p style="margin: 0 0 30px 0; color: #6b7280; font-size: 14px; line-height: 1.6;">
        Thank you for your contribution to the Unbuilt Resource Library. After review, we've decided not to include this resource at this time.
      </p>

      <div style="background: #f9fafb; border-left: 4px solid #6b7280; padding: 20px; margin: 20px 0; border-radius: 4px;">
        <h3 style="margin: 0 0 10px 0; color: #1f2937; font-size: 18px;">
          ${data.title}
        </h3>
        <p style="margin: 0; color: #6b7280; font-size: 14px;">
          <a href="${data.url}" style="color: #7c3aed; text-decoration: none;">${data.url}</a>
        </p>
      </div>

      ${data.adminNotes ? `
      <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 4px;">
        <p style="margin: 0 0 5px 0; color: #1f2937; font-size: 12px; font-weight: 600; text-transform: uppercase;">
          Feedback from our team
        </p>
        <p style="margin: 0; color: #92400e; font-size: 14px;">
          ${data.adminNotes}
        </p>
      </div>
      ` : ''}

      <p style="margin: 30px 0 0 0; color: #6b7280; font-size: 14px; line-height: 1.6;">
        We appreciate your effort to help the community. Please feel free to submit other resources that you think would be valuable!
      </p>

      <div style="margin-top: 30px; padding: 20px; background: #f9fafb; border-radius: 8px; text-align: center;">
        <p style="margin: 0 0 15px 0; color: #1f2937; font-size: 14px;">
          Have another resource to share?
        </p>
        <a href="https://unbuilt.one/resources" style="display: inline-block; background: #7c3aed; color: #ffffff; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 14px;">
          Submit Another Resource
        </a>
      </div>
    </div>

    <!-- Footer -->
    <div style="padding: 30px; background: #f9fafb; border-top: 1px solid #e5e7eb;">
      <p style="margin: 0; color: #6b7280; font-size: 12px; text-align: center;">
        Thank you for being part of the Unbuilt community!
      </p>
    </div>
  </div>
</body>
</html>
  `;
}

/**
 * Send notification to admins about new contribution
 */
export async function notifyAdminsOfNewContribution(contributionId: number): Promise<boolean> {
  try {
    // Get contribution details
    const contributionResult = await db
      .select()
      .from(resourceContributions)
      .where(eq(resourceContributions.id, contributionId))
      .limit(1);
    
    const contribution = contributionResult[0];

    if (!contribution) {
      console.error(`Contribution ${contributionId} not found`);
      return false;
    }

    // Get contributor details
    const contributorResult = await db
      .select()
      .from(users)
      .where(eq(users.id, contribution.userId))
      .limit(1);
    
    const contributor = contributorResult[0];

    if (!contributor) {
      console.error(`Contributor ${contribution.userId} not found`);
      return false;
    }

    // Get admin users (assuming admin role or specific permission)
    const admins = await db
      .select()
      .from(users)
      .where(eq(users.plan, 'enterprise')); // Adjust this query based on your admin identification

    if (admins.length === 0) {
      console.warn('No admin users found to notify');
      return false;
    }

    const notificationData: ContributionNotificationData = {
      contributionId: contribution.id,
      contributorEmail: contributor.email,
      contributorName: contributor.name || 'User',
      title: contribution.title,
      url: contribution.url,
      status: 'pending',
    };

    const emailHtml = generateNewContributionEmail(notificationData);

    // TODO: Send email to all admins
    for (const admin of admins) {
      console.log(`📧 Would send new contribution notification to admin: ${admin.email}`);
      // await emailService.send({
      //   to: admin.email,
      //   subject: `New Resource Contribution: ${contribution.title}`,
      //   html: emailHtml,
      // });
    }

    return true;
  } catch (error) {
    console.error('Error notifying admins of new contribution:', error);
    return false;
  }
}

/**
 * Send notification to contributor about approval
 */
export async function notifyContributorOfApproval(
  contributionId: number,
  adminNotes?: string
): Promise<boolean> {
  try {
    // Get contribution details
    const contributionResult = await db
      .select()
      .from(resourceContributions)
      .where(eq(resourceContributions.id, contributionId))
      .limit(1);
    
    const contribution = contributionResult[0];

    if (!contribution) {
      console.error(`Contribution ${contributionId} not found`);
      return false;
    }

    // Get contributor details
    const contributorResult = await db
      .select()
      .from(users)
      .where(eq(users.id, contribution.userId))
      .limit(1);
    
    const contributor = contributorResult[0];

    if (!contributor) {
      console.error(`Contributor ${contribution.userId} not found`);
      return false;
    }

    const notificationData: ContributionNotificationData = {
      contributionId: contribution.id,
      contributorEmail: contributor.email,
      contributorName: contributor.name || 'User',
      title: contribution.title,
      url: contribution.url,
      status: 'approved',
      adminNotes,
    };

    const emailHtml = generateApprovalEmail(notificationData);

    console.log(`📧 Would send approval notification to: ${contributor.email}`);
    // TODO: Send email
    // await emailService.send({
    //   to: contributor.email,
    //   subject: `✅ Your Resource Contribution Was Approved!`,
    //   html: emailHtml,
    // });

    return true;
  } catch (error) {
    console.error('Error notifying contributor of approval:', error);
    return false;
  }
}

/**
 * Send notification to contributor about rejection
 */
export async function notifyContributorOfRejection(
  contributionId: number,
  reason: string
): Promise<boolean> {
  try {
    // Get contribution details
    const contributionResult = await db
      .select()
      .from(resourceContributions)
      .where(eq(resourceContributions.id, contributionId))
      .limit(1);
    
    const contribution = contributionResult[0];

    if (!contribution) {
      console.error(`Contribution ${contributionId} not found`);
      return false;
    }

    // Get contributor details
    const contributorResult = await db
      .select()
      .from(users)
      .where(eq(users.id, contribution.userId))
      .limit(1);
    
    const contributor = contributorResult[0];

    if (!contributor) {
      console.error(`Contributor ${contribution.userId} not found`);
      return false;
    }

    const notificationData: ContributionNotificationData = {
      contributionId: contribution.id,
      contributorEmail: contributor.email,
      contributorName: contributor.name || 'User',
      title: contribution.title,
      url: contribution.url,
      status: 'rejected',
      adminNotes: reason,
    };

    const emailHtml = generateRejectionEmail(notificationData);

    console.log(`📧 Would send rejection notification to: ${contributor.email}`);
    // TODO: Send email
    // await emailService.send({
    //   to: contributor.email,
    //   subject: `Update on Your Resource Contribution`,
    //   html: emailHtml,
    // });

    return true;
  } catch (error) {
    console.error('Error notifying contributor of rejection:', error);
    return false;
  }
}
