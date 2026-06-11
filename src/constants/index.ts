export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 10,
  MAX_LIMIT: 100,
} as const;

export const COOKIE_KEYS = {
  ACCESS_TOKEN: 'accessToken',
  REFRESH_TOKEN: 'refreshToken',
} as const;

export const API_PREFIX = '/api/v1';

export const AUTH = {
  ACCESS_TOKEN_EXPIRES_IN: '15m',
  REFRESH_TOKEN_EXPIRES_IN: '7d',
  OTP_LENGTH: 6,
  OTP_EXPIRES_MINUTES: 10,
  CREDENTIALS_PROVIDER: 'credentials',
} as const;

export const VERIFICATION_TYPE = {
  EMAIL_VERIFY: 'EMAIL_VERIFY',
  RESET_PASSWORD: 'RESET_PASSWORD',
} as const;
