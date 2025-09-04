import { MailService } from '@sendgrid/mail';

const hasApiKey = !!process.env.SENDGRID_API_KEY;
let mailService: MailService | null = null;

if (hasApiKey) {
  mailService = new MailService();
  mailService.setApiKey(process.env.SENDGRID_API_KEY!);
}

interface EmailParams {
  to: string;
  from: string;
  subject: string;
  text?: string;
  html?: string;
}

export async function sendEmail(params: EmailParams): Promise<boolean> {
  if (!mailService || !hasApiKey) {
    console.log(`Email service not configured - would have sent email to ${params.to} with subject: ${params.subject}`);
    return false;
  }

  try {
    const emailData: any = {
      to: params.to,
      from: params.from,
      subject: params.subject,
    };
    
    if (params.text) emailData.text = params.text;
    if (params.html) emailData.html = params.html;
    
    await mailService.send(emailData);
    console.log(`Email sent successfully to ${params.to}`);
    return true;
  } catch (error) {
    console.error('SendGrid email error:', error);
    return false;
  }
}

export async function sendPasswordResetEmail(email: string, resetToken: string): Promise<boolean> {
  const resetUrl = `${process.env.NODE_ENV === 'production' ? 'https://unbuilt.cloud' : 'http://localhost:5000'}/auth/reset-password?token=${resetToken}`;
  
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #8B5CF6, #3B82F6); padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .header h1 { color: white; margin: 0; font-size: 28px; }
        .content { background: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
        .button { display: inline-block; background: linear-gradient(135deg, #8B5CF6, #3B82F6); color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0; }
        .footer { text-align: center; margin-top: 20px; color: #666; font-size: 14px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>✨ Unbuilt</h1>
          <p style="color: #E5E7EB; margin: 10px 0 0 0;">Discover Market Opportunities</p>
        </div>
        <div class="content">
          <h2>Password Reset Request</h2>
          <p>Hello,</p>
          <p>We received a request to reset your password for your Unbuilt account. If you made this request, click the button below to reset your password:</p>
          
          <div style="text-align: center;">
            <a href="${resetUrl}" class="button">Reset My Password</a>
          </div>
          
          <p>This link will expire in 1 hour for security reasons.</p>
          
          <p>If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.</p>
          
          <p>If the button doesn't work, copy and paste this link into your browser:</p>
          <p style="word-break: break-all; color: #8B5CF6;">${resetUrl}</p>
          
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #E5E7EB;">
          
          <p>Best regards,<br>The Unbuilt Team</p>
        </div>
        <div class="footer">
          <p>© 2025 Unbuilt. Discover what's missing in the market.</p>
          <p>This email was sent because you requested a password reset. If you have questions, please contact our support team.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const textContent = `
Unbuilt - Password Reset Request

Hello,

We received a request to reset your password for your Unbuilt account.

To reset your password, visit this link: ${resetUrl}

This link will expire in 1 hour for security reasons.

If you didn't request a password reset, you can safely ignore this email.

Best regards,
The Unbuilt Team

© 2025 Unbuilt. Discover what's missing in the market.
  `;

  return await sendEmail({
    to: email,
    from: 'noreply@unbuilt.cloud', // You may need to verify this domain in SendGrid
    subject: 'Reset Your Unbuilt Password',
    text: textContent,
    html: htmlContent,
  });
}