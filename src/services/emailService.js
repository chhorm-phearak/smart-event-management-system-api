const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT) || 587,
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const sendVerificationEmail = async (email, token, firstName) => {
  const verificationUrl = `${process.env.FRONTEND_URL || 'http://127.0.0.1:5173'}/verify-email?token=${token}`;
  
  const mailOptions = {
    from: process.env.SMTP_FROM || '"Smart Event Management" <noreply@smartevent.com>',
    to: email,
    subject: 'Verify Your Email Address',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Welcome to Smart Event Management!</h2>
        <p>Hi ${firstName},</p>
        <p>Thank you for registering. Please verify your email address by clicking the button below:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${verificationUrl}" 
             style="background-color: #4CAF50; color: white; padding: 14px 28px; text-decoration: none; border-radius: 5px; display: inline-block;">
            Verify Email
          </a>
        </div>
        <p>Or copy and paste this link into your browser:</p>
        <p style="color: #666; word-break: break-all;">${verificationUrl}</p>
        <p>This link will expire in 24 hours.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
        <p style="color: #999; font-size: 12px;">If you didn't create an account, please ignore this email.</p>
      </div>
    `,
  };

  return transporter.sendMail(mailOptions);
};

const sendPasswordResetEmail = async (email, token, firstName) => {
  const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${token}`;
  const safeName = firstName || 'there';

  const mailOptions = {
    from: process.env.SMTP_FROM || '"Smart Event Management" <noreply@smartevent.com>',
    to: email,
    subject: 'Reset your Smart Event Management password',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Reset Your Password</title>
      </head>
      <body style="margin: 0; padding: 0; background-color: #f4f6f8; font-family: Arial, Helvetica, sans-serif;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td align="center" style="padding: 40px 20px;">
              <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
                <tr>
                  <td style="background-color: #4F46E5; padding: 30px; text-align: center;">
                    <h1 style="color: #ffffff; margin: 0; font-size: 24px;">Smart Event Management</h1>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 40px 30px;">
                    <h2 style="color: #1f2937; margin: 0 0 20px 0; font-size: 22px;">Reset your password</h2>
                    <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">Hi ${safeName},</p>
                    <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">We received a request to reset the password for your account. Click the button below to choose a new password.</p>
                    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 30px 0;">
                      <tr>
                        <td align="center">
                          <a href="${resetUrl}" style="display: inline-block; background-color: #4F46E5; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-size: 16px; font-weight: 600;">Reset Password</a>
                        </td>
                      </tr>
                    </table>
                    <p style="color: #4b5563; font-size: 14px; line-height: 1.6;">If the button doesn't work, copy and paste this link into your browser:</p>
                    <p style="color: #6b7280; font-size: 14px; word-break: break-all; line-height: 1.6;">${resetUrl}</p>
                    <p style="color: #dc2626; font-size: 14px; font-weight: 600; margin-top: 24px;">This link will expire in 1 hour for security reasons.</p>
                  </td>
                </tr>
                <tr>
                  <td style="background-color: #f9fafb; padding: 24px 30px; text-align: center; border-top: 1px solid #e5e7eb;">
                    <p style="color: #6b7280; font-size: 13px; line-height: 1.5; margin: 0;">Didn't request a password reset? You can safely ignore this email — your password will not be changed.</p>
                    <p style="color: #9ca3af; font-size: 12px; margin-top: 16px;">&copy; ${new Date().getFullYear()} Smart Event Management. All rights reserved.</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `,
  };

  return transporter.sendMail(mailOptions);
};

const formatCambodiaTime = (utcDate) => {
  if (!utcDate) return 'TBD';
  const date = new Date(utcDate);
  return date.toLocaleString('en-GB', {
    timeZone: 'Asia/Phnom_Penh',
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const formatDuration = (minutes) => {
  const total = parseInt(minutes, 10);
  if (Number.isNaN(total) || total <= 0) return '—';
  const h = Math.floor(total / 60);
  const m = total % 60;
  const hText = h > 0 ? `${h} hour${h > 1 ? 's' : ''}` : '';
  const mText = m > 0 ? `${m} minute${m > 1 ? 's' : ''}` : '';
  if (hText && mText) return `${hText} ${mText}`;
  return hText || mText || '0 minutes';
};

const formatChangedValue = (label, value) => {
  if (label === 'Duration') return formatDuration(value);
  return value || '—';
};

const sendEventUpdateEmail = async (email, firstName, event, changedFields, eventUrl) => {
  const startTime = formatCambodiaTime(event.start_time);
  const endTime = formatCambodiaTime(event.end_time);
  const changedRows = changedFields
    .map(
      (field) => `
        <tr>
          <td style="padding: 10px; border-bottom: 1px solid #e0e0e0; font-weight: 600; color: #333;">${field.label}</td>
          <td style="padding: 10px; border-bottom: 1px solid #e0e0e0; color: #555;">${formatChangedValue(field.label, field.oldValue)}</td>
          <td style="padding: 10px; border-bottom: 1px solid #e0e0e0; color: #1a73e8; font-weight: 600;">${formatChangedValue(field.label, field.newValue)}</td>
        </tr>
      `
    )
    .join('');

  const mailOptions = {
    from: process.env.SMTP_FROM || '"Smart Event Management" <noreply@smartevent.com>',
    to: email,
    subject: `Updated: ${event.title}`,
    html: `
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f4f5f7; padding: 30px 0; font-family: Arial, sans-serif;">
        <tr>
          <td align="center">
            <table width="600" cellpadding="0" cellspacing="0" border="0" style="background-color: #ffffff; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.08);">
              <tr>
                <td style="background-color: #1a73e8; padding: 28px 32px; text-align: center;">
                  <h1 style="color: #ffffff; margin: 0; font-size: 22px;">Event Update</h1>
                </td>
              </tr>
              <tr>
                <td style="padding: 32px;">
                  <p style="font-size: 16px; color: #333; margin: 0 0 16px 0;">Hi ${firstName},</p>
                  <p style="font-size: 16px; color: #555; line-height: 1.6; margin: 0 0 24px 0;">
                    The event you registered for has been updated. Here are the latest details and what changed.
                  </p>

                  <h3 style="color: #1a73e8; margin: 0 0 14px 0; font-size: 16px;">Latest Event Details</h3>
                  <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 18px; margin-bottom: 28px;">
                    <p style="margin: 6px 0; color: #333; font-size: 15px;"><strong>Event:</strong> ${event.title}</p>
                    <p style="margin: 6px 0; color: #333; font-size: 15px;"><strong>Time:</strong> ${startTime} - ${endTime}</p>
                    <p style="margin: 6px 0; color: #333; font-size: 15px;"><strong>Location:</strong> ${event.location || 'TBD'}</p>
                    <p style="margin: 6px 0; color: #333; font-size: 15px;"><strong>Address:</strong> ${event.full_address || '—'}</p>
                  </div>

                  <h3 style="color: #1a73e8; margin: 0 0 14px 0; font-size: 16px;">What Changed</h3>
                  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse: collapse; font-size: 14px; margin-bottom: 28px;">
                    <thead>
                      <tr style="background-color: #eef4ff;">
                        <th align="left" style="padding: 10px; color: #1a73e8; border-bottom: 2px solid #d2e3fc;">Field</th>
                        <th align="left" style="padding: 10px; color: #1a73e8; border-bottom: 2px solid #d2e3fc;">Before</th>
                        <th align="left" style="padding: 10px; color: #1a73e8; border-bottom: 2px solid #d2e3fc;">After</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${changedRows}
                    </tbody>
                  </table>

                  <table cellpadding="0" cellspacing="0" border="0" align="center" style="margin: 30px auto;">
                    <tr>
                      <td style="background-color: #1a73e8; border-radius: 6px; text-align: center;">
                        <a href="${eventUrl}" style="display: inline-block; padding: 14px 32px; color: #ffffff; text-decoration: none; font-size: 15px; border-radius: 6px;">View Updated Event</a>
                      </td>
                    </tr>
                  </table>

                  <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
                  <p style="color: #888; font-size: 12px; text-align: center; margin: 0;">
                    You received this email because you registered for this event.
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    `,
  };

  return transporter.sendMail(mailOptions);
};

module.exports = {
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendEventUpdateEmail,
};
