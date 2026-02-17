import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

interface SendInvitationParams {
  to: string;
  inviterName: string;
  accountName: string;
  role: string;
  activationUrl: string;
  expiresInHours: number;
}

export async function sendInvitationEmail({
  to,
  inviterName,
  accountName,
  role,
  activationUrl,
  expiresInHours
}: SendInvitationParams) {
  try {
    const { data, error } = await resend.emails.send({
      from: process.env.FROM_EMAIL || 'noreply@nexorra.com',
      to,
      subject: `You've been invited to join ${accountName}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .header {
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              padding: 30px;
              border-radius: 10px 10px 0 0;
              text-align: center;
            }
            .content {
              background: #ffffff;
              padding: 40px;
              border: 1px solid #e5e7eb;
              border-top: none;
            }
            .button {
              display: inline-block;
              background: #667eea;
              color: white;
              padding: 14px 28px;
              text-decoration: none;
              border-radius: 6px;
              margin: 20px 0;
              font-weight: 600;
            }
            .button:hover {
              background: #5568d3;
            }
            .footer {
              background: #f9fafb;
              padding: 20px;
              border-radius: 0 0 10px 10px;
              border: 1px solid #e5e7eb;
              border-top: none;
              text-align: center;
              font-size: 14px;
              color: #6b7280;
            }
            .role-badge {
              display: inline-block;
              background: #e0e7ff;
              color: #4c51bf;
              padding: 4px 12px;
              border-radius: 12px;
              font-size: 14px;
              font-weight: 500;
              margin: 10px 0;
            }
            .info-box {
              background: #f0f9ff;
              border-left: 4px solid #3b82f6;
              padding: 16px;
              margin: 20px 0;
              border-radius: 4px;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1 style="margin: 0; font-size: 28px;">Welcome to ${accountName}!</h1>
          </div>

          <div class="content">
            <p style="font-size: 16px; margin-bottom: 20px;">
              Hi there,
            </p>

            <p style="font-size: 16px;">
              <strong>${inviterName}</strong> has invited you to join <strong>${accountName}</strong> as a:
            </p>

            <p style="text-align: center;">
              <span class="role-badge">${role.replace(/_/g, ' ').toUpperCase()}</span>
            </p>

            <p style="font-size: 16px;">
              Click the button below to activate your account and set your password:
            </p>

            <p style="text-align: center;">
              <a href="${activationUrl}" class="button">Activate Account</a>
            </p>

            <div class="info-box">
              <p style="margin: 0; font-size: 14px;">
                <strong>⏰ Important:</strong> This invitation link expires in <strong>${expiresInHours} hours</strong>.
              </p>
            </div>

            <p style="font-size: 14px; color: #6b7280; margin-top: 30px;">
              If the button doesn't work, copy and paste this link into your browser:
            </p>
            <p style="font-size: 12px; color: #9ca3af; word-break: break-all;">
              ${activationUrl}
            </p>
          </div>

          <div class="footer">
            <p style="margin: 0;">
              If you didn't expect this invitation, you can safely ignore this email.
            </p>
            <p style="margin: 10px 0 0 0;">
              © ${new Date().getFullYear()} ${accountName}. All rights reserved.
            </p>
          </div>
        </body>
        </html>
      `
    });

    if (error) {
      console.error('Error sending invitation email:', error);
      throw error;
    }

    console.log('Invitation email sent successfully:', data);
    return data;
  } catch (error) {
    console.error('Failed to send invitation email:', error);
    throw error;
  }
}
