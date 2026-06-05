import dotenv from 'dotenv';
dotenv.config();

import nodemailer from 'nodemailer';

const to = process.argv[2] || 'anupkc@kec.edu.np';

async function main() {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM } = process.env;

  if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS) {
    console.error('❌  SMTP env vars are missing. Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS in .env');
    process.exit(1);
  }

  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT),
    secure: Number(SMTP_PORT) === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });

  console.log(`Sending test email to ${to} via ${SMTP_HOST}:${SMTP_PORT} as ${SMTP_USER} ...`);

  const info = await transporter.sendMail({
    from: SMTP_FROM || SMTP_USER,
    to,
    subject: 'KEC Exam – SMTP test',
    text: 'This is a test email from the KEC Exam Preparation platform to verify the SMTP configuration is working correctly.',
    html: `<p>This is a <strong>test email</strong> from the <strong>KEC Exam Preparation</strong> platform.<br>If you received this, your SMTP configuration is working correctly.</p>`,
  });

  console.log('✅  Email sent! Message ID:', info.messageId);
}

main().catch((err) => {
  console.error('❌  Failed to send email:', err.message);
  process.exit(1);
});
