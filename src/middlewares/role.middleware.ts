import { NextFunction, Request, Response } from 'express';
import status from 'http-status';
import { Role } from '../generated/prisma';
import AppError from '../errors/AppError';

export const roleGuard = (...allowedRoles: Role[]) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AppError(status.UNAUTHORIZED, 'Unauthorized access!'));
    }

    if (allowedRoles.length > 0 && !allowedRoles.includes(req.user.role)) {
      return next(
        new AppError(status.FORBIDDEN, 'Forbidden access! You do not have permission to access this resource.')
      );
    }

    next();
  };
};
