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
  };
};

export const config = loadEnvVariables();
