import { NextFunction, Request, Response } from 'express';
import status from 'http-status';
import { Role, UserStatus } from '../generated/prisma';
import { prisma } from '../config/prisma';
import AppError from '../errors/AppError';
import { COOKIE_KEYS } from '../constants';
import { verifyAccessToken } from '../app/modules/auth/auth.utils';

const getAccessToken = (req: Request) => {
  const cookieToken = req.cookies?.[COOKIE_KEYS.ACCESS_TOKEN];
  if (cookieToken) return cookieToken;

  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.split(' ')[1];
  }

  return null;
};

export const authMiddleware = async (req: Request, _res: Response, next: NextFunction) => {
  try {
    const accessToken = getAccessToken(req);

    if (!accessToken) {
      throw new AppError(status.UNAUTHORIZED, 'Unauthorized access! No access token provided.');
    }

    const verified = verifyAccessToken(accessToken);
    if (!verified.success) {
      throw new AppError(status.UNAUTHORIZED, 'Unauthorized access! Invalid or expired access token.');
    }

    const user = await prisma.user.findUnique({
      where: { id: verified.data.userId },
    });

    if (!user || user.isDeleted || user.status === UserStatus.DELETED) {
      throw new AppError(status.UNAUTHORIZED, 'Unauthorized access! User not found.');
    }

    if (user.status === UserStatus.BLOCKED) {
      throw new AppError(status.FORBIDDEN, 'Account is blocked.');
    }

    const session = await prisma.session.findFirst({
      where: {
        id: verified.data.sessionId,
        userId: user.id,
        isActive: true,
        expiresAt: { gt: new Date() },
      },
    });

    if (!session) {
      throw new AppError(status.UNAUTHORIZED, 'Session expired. Please login again.');
    }

    req.user = {
      userId: user.id,
      email: user.email,
      role: user.role as Role,
    };

    next();
  } catch (error) {
    next(error);
  }
};
