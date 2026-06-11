import { NextFunction, Request, Response } from 'express';
import status from 'http-status';
import { Role, UserStatus } from '../generated/prisma/enums';
import { config } from '../config';
import { prisma } from '../config/prisma';
import AppError from '../errors/AppError';
import { COOKIE_KEYS } from '../constants';
import { jwtUtils } from '../utils/jwt.utils';

const getCookie = (req: Request, key: string) => req.cookies[key];

export const authMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const sessionToken = getCookie(req, COOKIE_KEYS.SESSION_TOKEN);

    if (sessionToken) {
      const session = await prisma.session.findFirst({
        where: {
          token: sessionToken,
          expiresAt: { gt: new Date() },
        },
        include: { user: true },
      });

      if (session?.user) {
        const { user } = session;

        if (user.status === UserStatus.BLOCKED || user.status === UserStatus.DELETED || user.isDeleted) {
          throw new AppError(status.UNAUTHORIZED, 'Unauthorized access! User is not active.');
        }
      }
    }

    const accessToken = getCookie(req, COOKIE_KEYS.ACCESS_TOKEN);

    if (!accessToken) {
      throw new AppError(status.UNAUTHORIZED, 'Unauthorized access! No access token provided.');
    }

    const verifiedToken = jwtUtils.verifyToken(accessToken, config.ACCESS_TOKEN_SECRET);

    if (!verifiedToken.success) {
      throw new AppError(status.UNAUTHORIZED, 'Unauthorized access! Invalid access token.');
    }

    req.user = {
      userId: verifiedToken.data.userId as string,
      email: verifiedToken.data.email as string,
      role: verifiedToken.data.role as Role,
    };

    next();
  } catch (error) {
    next(error);
  }
};
