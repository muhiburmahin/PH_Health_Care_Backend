import nodemailer from 'nodemailer';
import { config } from '../config';

type EmailPayload = {
  to: string;
  subject: string;
  html: string;
};

const getTransporter = () => {
  if (!config.SMTP_HOST || !config.SMTP_USER || !config.SMTP_PASS) {
    return null;
  }

  const port = Number(config.SMTP_PORT || 465);

  return nodemailer.createTransport({
    host: config.SMTP_HOST,
    port,
    secure: port === 465,
    auth: {
      user: config.SMTP_USER,
      pass: config.SMTP_PASS,
    },
  });
};

export const sendEmail = async (payload: EmailPayload) => {
  const transporter = getTransporter();

  if (!transporter) {
    if (config.NODE_ENV === 'development') {
      console.log('[DEV Email OTP]', { to: payload.to, subject: payload.subject, html: payload.html });
      return;
    }
    throw new Error('Email service is not configured');
  }

  await transporter.sendMail({
    from: config.SMTP_FROM || config.SMTP_USER,
    to: payload.to,
    subject: payload.subject,
    html: payload.html,
  });
};

export const sendOtpEmail = async (to: string, otp: string, purpose: string) => {
  await sendEmail({
    to,
    subject: `PH Health Care — ${purpose}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;">
        <h2>PH Health Care</h2>
        <p>Your OTP for <strong>${purpose}</strong> is:</p>
        <h1 style="letter-spacing: 8px; color: #2563eb;">${otp}</h1>
        <p>This code expires in 10 minutes. Do not share it with anyone.</p>
      </div>
    `,
  });
};
