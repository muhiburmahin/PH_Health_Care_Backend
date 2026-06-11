import { Response } from 'express';
import { JwtPayload, SignOptions } from 'jsonwebtoken';
import { Role } from '../../../generated/prisma';
import { config } from '../../../config';
import { AUTH, COOKIE_KEYS } from '../../../constants';
import { jwtUtils } from '../../../utils/jwt.utils';

export type AuthTokenPayload = JwtPayload & {
  userId: string;
  email: string;
  role: Role;
  sessionId: string;
  type: 'access' | 'refresh';
};

export const generateOtp = (length = AUTH.OTP_LENGTH) => {
  const min = Math.pow(10, length - 1);
  const max = Math.pow(10, length) - 1;
  return String(Math.floor(min + Math.random() * (max - min + 1)));
};

export const getOtpExpiry = () => {
  return new Date(Date.now() + AUTH.OTP_EXPIRES_MINUTES * 60 * 1000);
};

export const createAccessToken = (payload: Omit<AuthTokenPayload, 'type'>) => {
  return jwtUtils.createToken(
    { ...payload, type: 'access' },
    config.ACCESS_TOKEN_SECRET,
    { expiresIn: AUTH.ACCESS_TOKEN_EXPIRES_IN } as SignOptions
  );
};

export const createRefreshToken = (payload: Omit<AuthTokenPayload, 'type'>) => {
  return jwtUtils.createToken(
    { ...payload, type: 'refresh' },
    config.REFRESH_TOKEN_SECRET,
    { expiresIn: AUTH.REFRESH_TOKEN_EXPIRES_IN } as SignOptions
  );
};

export const verifyAccessToken = (token: string) => {
  const result = jwtUtils.verifyToken(token, config.ACCESS_TOKEN_SECRET);
  if (!result.success || result.data.type !== 'access') {
    return { success: false as const, message: 'Invalid access token' };
  }
  return { success: true as const, data: result.data as AuthTokenPayload };
};

export const verifyRefreshToken = (token: string) => {
  const result = jwtUtils.verifyToken(token, config.REFRESH_TOKEN_SECRET);
  if (!result.success || result.data.type !== 'refresh') {
    return { success: false as const, message: 'Invalid refresh token' };
  }
  return { success: true as const, data: result.data as AuthTokenPayload };
};

const cookieOptions = (maxAge: number) => {
  const isProduction = config.NODE_ENV === 'production';
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? ('none' as const) : ('lax' as const),
    path: '/',
    maxAge,
  };
};

export const setAuthCookies = (res: Response, accessToken: string, refreshToken: string) => {
  res.cookie(COOKIE_KEYS.ACCESS_TOKEN, accessToken, cookieOptions(15 * 60 * 1000));
  res.cookie(COOKIE_KEYS.REFRESH_TOKEN, refreshToken, cookieOptions(7 * 24 * 60 * 60 * 1000));
};

export const clearAuthCookies = (res: Response) => {
  const isProduction = config.NODE_ENV === 'production';
  const base = {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? ('none' as const) : ('lax' as const),
    path: '/',
  };
  res.clearCookie(COOKIE_KEYS.ACCESS_TOKEN, base);
  res.clearCookie(COOKIE_KEYS.REFRESH_TOKEN, base);
};

export const sanitizeUser = (user: {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  phone: string | null;
  role: Role;
  status: string;
  image: string | null;
  lastLoginAt: Date | null;
  createdAt: Date;
}) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  emailVerified: user.emailVerified,
  phone: user.phone,
  role: user.role,
  status: user.status,
  image: user.image,
  lastLoginAt: user.lastLoginAt,
  createdAt: user.createdAt,
});
