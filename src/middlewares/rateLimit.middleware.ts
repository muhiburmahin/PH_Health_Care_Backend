import { NextFunction, Request, Response } from 'express';

const requestCounts = new Map<string, { count: number; resetAt: number }>();

export const rateLimitMiddleware = (maxRequests = 100, windowMs = 60_000) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const key = req.ip ?? 'unknown';
    const now = Date.now();
    const record = requestCounts.get(key);

    if (!record || now > record.resetAt) {
      requestCounts.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }

    if (record.count >= maxRequests) {
      return res.status(429).json({
        success: false,
        message: 'Too many requests. Please try again later.',
      });
    }

    record.count += 1;
    next();
  };
};
