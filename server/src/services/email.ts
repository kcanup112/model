import nodemailer, { Transporter } from 'nodemailer';

let transporter: Transporter | null = null;

function getTransporter(): Transporter | null {
  if (transporter) return transporter;

  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !port || !user || !pass) {
    return null;
  }

  transporter = nodemailer.createTransport({
    host,
    port: Number(port),
    secure: Number(port) === 465,
    auth: { user, pass },
  });
  return transporter;
}

export async function sendPasswordResetEmail(to: string, resetUrl: string) {
  const tx = getTransporter();
  const from = process.env.SMTP_FROM || process.env.SMTP_USER || 'no-reply@example.com';
  const appName = process.env.APP_NAME || 'KEC Exam Preparation';

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 560px; margin: auto; padding: 24px; color: #222;">
      <h2 style="color: #1f2937;">Reset your password</h2>
      <p>You requested a password reset for your ${appName} account. Click the button below to choose a new password. This link expires in 1 hour.</p>
      <p style="margin: 28px 0;">
        <a href="${resetUrl}" style="background: #d4a017; color: #1a1a1a; padding: 12px 22px; border-radius: 8px; text-decoration: none; font-weight: 600;">
          Reset Password
        </a>
      </p>
      <p style="font-size: 13px; color: #555;">If the button doesn't work, copy and paste this link into your browser:</p>
      <p style="font-size: 13px; word-break: break-all;"><a href="${resetUrl}">${resetUrl}</a></p>
      <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
      <p style="font-size: 12px; color: #888;">If you did not request this, you can safely ignore this email.</p>
    </div>
  `;

  const text = `Reset your ${appName} password by visiting: ${resetUrl}\nThis link expires in 1 hour. If you did not request this, ignore this email.`;

  if (!tx) {
    // Dev fallback: log to console so devs can copy the link locally.
    console.log('[email] SMTP not configured. Password reset URL for', to, ':', resetUrl);
    return;
  }

  await tx.sendMail({
    from,
    to,
    subject: `Reset your ${appName} password`,
    text,
    html,
  });
}
