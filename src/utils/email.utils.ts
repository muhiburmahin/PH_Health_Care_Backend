import { config } from '../config';

type EmailPayload = {
  to: string;
  subject: string;
  html: string;
};

export const sendEmail = async (payload: EmailPayload) => {
  if (!config.SMTP_HOST || !config.SMTP_USER || !config.SMTP_PASS) {
    console.warn('SMTP not configured. Email not sent:', payload.subject);
    return;
  }

  // Integrate nodemailer when SMTP credentials are available
  console.log(`[Email] To: ${payload.to} | Subject: ${payload.subject}`);
};
