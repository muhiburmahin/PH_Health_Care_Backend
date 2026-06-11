import { Request, Response } from 'express';
import status from 'http-status';
import { COOKIE_KEYS } from '../../../constants';
import catchAsync from '../../../utils/catchAsync.utils';
import { sendResponse } from '../../../utils/apiResponse.utils';
import { clearAuthCookies, setAuthCookies } from './auth.utils';
import { AuthService } from './auth.service';

const getSessionMeta = (req: Request) => ({
  ipAddress: req.ip,
  userAgent: req.headers['user-agent'],
});

const getRefreshTokenFromRequest = (req: Request) => {
  return req.body?.refreshToken || req.cookies?.[COOKIE_KEYS.REFRESH_TOKEN];
};

const register = catchAsync(async (req: Request, res: Response) => {
  const result = await AuthService.register(req.body, getSessionMeta(req));

  setAuthCookies(res, result.accessToken, result.refreshToken);

  sendResponse(res, {
    statusCode: status.CREATED,
    success: true,
    message: 'Registration successful. Please verify your email with the OTP sent.',
    data: {
      user: result.user,
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
    },
  });
});

const login = catchAsync(async (req: Request, res: Response) => {
  const result = await AuthService.login(req.body, getSessionMeta(req));

  setAuthCookies(res, result.accessToken, result.refreshToken);

  sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message: 'Login successful',
    data: {
      user: result.user,
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
    },
  });
});

const logout = catchAsync(async (req: Request, res: Response) => {
  const refreshToken = getRefreshTokenFromRequest(req);

  if (refreshToken) {
    await AuthService.logout(refreshToken);
  }

  clearAuthCookies(res);

  sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message: 'Logged out successfully',
    data: null,
  });
});

const refreshToken = catchAsync(async (req: Request, res: Response) => {
  const token = getRefreshTokenFromRequest(req);

  if (!token) {
    sendResponse(res, {
      statusCode: status.UNAUTHORIZED,
      success: false,
      message: 'Refresh token is required',
      data: null,
    });
    return;
  }

  const result = await AuthService.refreshAccessToken(token);

  res.cookie(COOKIE_KEYS.ACCESS_TOKEN, result.accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    path: '/',
    maxAge: 15 * 60 * 1000,
  });

  sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message: 'Access token refreshed successfully',
    data: {
      accessToken: result.accessToken,
      user: result.user,
    },
  });
});

const forgotPassword = catchAsync(async (req: Request, res: Response) => {
  const result = await AuthService.forgotPassword(req.body.email);

  sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message: result.message,
    data: null,
  });
});

const resetPassword = catchAsync(async (req: Request, res: Response) => {
  const { email, otp, newPassword } = req.body;
  const result = await AuthService.resetPassword(email, otp, newPassword);

  sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message: result.message,
    data: null,
  });
});

const verifyEmail = catchAsync(async (req: Request, res: Response) => {
  const { email, otp } = req.body;
  const result = await AuthService.verifyEmail(email, otp);

  sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message: result.message,
    data: { user: result.user },
  });
});

export const AuthController = {
  register,
  login,
  logout,
  refreshToken,
  forgotPassword,
  resetPassword,
  verifyEmail,
};
