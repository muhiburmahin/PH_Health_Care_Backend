import { NextFunction, Request, Response } from 'express';
import status from 'http-status';
import { ZodError } from 'zod';
import { Prisma } from '../generated/prisma/client';
import { config } from '../config';
import AppError from '../errors/AppError';
import { handleZodError } from '../errors/handleZodError';
import { handlePrismaError } from '../errors/handlePrismaError';
import { TErrorResponse, TErrorSources } from '../types/index';

export const errorMiddleware = (
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction
) => {
  if (config.NODE_ENV === 'development') {
    console.log('Error from Global Error Handler', err);
  }

  let errorSources: TErrorSources[] = [];
  let statusCode: number = status.INTERNAL_SERVER_ERROR;
  let message = 'Internal Server Error';
  let stack: string | undefined;

  if (err instanceof ZodError) {
    const simplifiedError = handleZodError(err);
    statusCode = simplifiedError.statusCode as number;
    message = simplifiedError.message;
    errorSources = [...simplifiedError.errorSources];
    stack = err.stack;
  } else if (err instanceof AppError) {
    statusCode = err.statusCode;
    message = err.message;
    stack = err.stack;
    errorSources = [{ path: '', message: err.message }];
  } else if (err instanceof Prisma.PrismaClientKnownRequestError) {
    const simplifiedError = handlePrismaError(err);
    statusCode = simplifiedError.statusCode as number;
    message = simplifiedError.message;
    errorSources = [...simplifiedError.errorSources];
    stack = err.stack;
  } else if (err instanceof Error) {
    message = err.message;
    stack = err.stack;
    errorSources = [{ path: '', message: err.message }];
  }

  const errorResponse: TErrorResponse = {
    success: false,
    message,
    errorSources,
    error: config.NODE_ENV === 'development' ? err : undefined,
    stack: config.NODE_ENV === 'development' ? stack : undefined,
  };

  res.status(statusCode).json(errorResponse);
};

export const notFoundMiddleware = (_req: Request, res: Response) => {
  res.status(status.NOT_FOUND).json({
    success: false,
    message: 'API Not Found!',
    errorSources: [{ path: '', message: 'API Not Found!' }],
  });
};
