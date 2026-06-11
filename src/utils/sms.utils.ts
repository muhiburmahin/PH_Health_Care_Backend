import { config } from '../config';

type SmsPayload = {
  to: string;
  message: string;
};

export const sendSms = async (payload: SmsPayload) => {
  if (!config.SMS_API_KEY) {
    console.warn('SMS gateway not configured. SMS not sent.');
    return;
  }

  console.log(`[SMS] To: ${payload.to} | Message: ${payload.message}`);
};
