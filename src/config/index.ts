import dotenv from 'dotenv';
import path from 'path';
import status from 'http-status';
import AppError from '../errors/AppError';

dotenv.config({ path: path.join(process.cwd(), '.env') });

interface EnvConfig {
  NODE_ENV: string;
  PORT: string;
  DATABASE_URL: string;
  ACCESS_TOKEN_SECRET: string;
  REFRESH_TOKEN_SECRET: string;
  FRONTEND_URL: string;
  SMTP_HOST?: string;
  SMTP_PORT?: string;
  SMTP_USER?: string;
  SMTP_PASS?: string;
  SMTP_FROM?: string;
  CLOUDINARY_CLOUD_NAME?: string;
  CLOUDINARY_API_KEY?: string;
  CLOUDINARY_API_SECRET?: string;
  SMS_API_KEY?: string;
  BACKEND_URL: string;
  STRIPE_SECRET_KEY?: string;
  STRIPE_WEBHOOK_SECRET?: string;
  STRIPE_CURRENCY: string;
  SSLCOMMERZ_STORE_ID?: string;
  SSLCOMMERZ_STORE_PASSWORD?: string;
  SSLCOMMERZ_IS_LIVE: boolean;
  SSLCOMMERZ_CURRENCY: string;
  VIDEO_PROVIDER: 'agora' | 'zego';
  AGORA_APP_ID?: string;
  AGORA_APP_CERTIFICATE?: string;
  AGORA_TOKEN_EXPIRE_SECONDS: number;
  ZEGO_APP_ID?: number;
  ZEGO_SERVER_SECRET?: string;
  ZEGO_TOKEN_EXPIRE_SECONDS: number;
}

const requiredEnvVariables = [
  'NODE_ENV',
  'PORT',
  'DATABASE_URL',
  'ACCESS_TOKEN_SECRET',
  'REFRESH_TOKEN_SECRET',
] as const;

const loadEnvVariables = (): EnvConfig => {
  requiredEnvVariables.forEach((variable) => {
    if (!process.env[variable]) {
      throw new AppError(
        status.INTERNAL_SERVER_ERROR,
        `Environment variable ${variable} is required but not set in .env file.`
      );
    }
  });

  return {
    NODE_ENV: process.env.NODE_ENV as string,
    PORT: process.env.PORT as string,
    DATABASE_URL: process.env.DATABASE_URL as string,
    ACCESS_TOKEN_SECRET: process.env.ACCESS_TOKEN_SECRET as string,
    REFRESH_TOKEN_SECRET: process.env.REFRESH_TOKEN_SECRET as string,
    FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:3000',
    SMTP_HOST: process.env.EMAIL_SENDER_SMTP_HOST || process.env.SMTP_HOST,
    SMTP_PORT: process.env.EMAIL_SENDER_SMTP_PORT || process.env.SMTP_PORT || '465',
    SMTP_USER: process.env.EMAIL_USER || process.env.SMTP_USER,
    SMTP_PASS: process.env.EMAIL_PASS || process.env.SMTP_PASS,
    SMTP_FROM: process.env.EMAIL_SENDER_SMTP_FROM || process.env.EMAIL_USER,
    CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME,
    CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY,
    CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET,
    SMS_API_KEY: process.env.SMS_API_KEY,
    BACKEND_URL: process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 5000}`,
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
    STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
    STRIPE_CURRENCY: process.env.STRIPE_CURRENCY || 'usd',
    SSLCOMMERZ_STORE_ID: process.env.SSLCOMMERZ_STORE_ID,
    SSLCOMMERZ_STORE_PASSWORD: process.env.SSLCOMMERZ_STORE_PASSWORD,
    SSLCOMMERZ_IS_LIVE: process.env.SSLCOMMERZ_IS_LIVE === 'true',
    SSLCOMMERZ_CURRENCY: process.env.SSLCOMMERZ_CURRENCY || 'BDT',
    VIDEO_PROVIDER: (process.env.VIDEO_PROVIDER as 'agora' | 'zego') || 'agora',
    AGORA_APP_ID: process.env.AGORA_APP_ID,
    AGORA_APP_CERTIFICATE: process.env.AGORA_APP_CERTIFICATE,
    AGORA_TOKEN_EXPIRE_SECONDS: Number(process.env.AGORA_TOKEN_EXPIRE_SECONDS || 3600),
    ZEGO_APP_ID: process.env.ZEGO_APP_ID ? Number(process.env.ZEGO_APP_ID) : undefined,
    ZEGO_SERVER_SECRET: process.env.ZEGO_SERVER_SECRET,
    ZEGO_TOKEN_EXPIRE_SECONDS: Number(process.env.ZEGO_TOKEN_EXPIRE_SECONDS || 3600),
  };
};

export const config = loadEnvVariables();
