import status from 'http-status';
import { Prisma } from '../generated/prisma/client';
import { TErrorResponse } from '../types/index';

export const handlePrismaError = (err: Prisma.PrismaClientKnownRequestError): TErrorResponse => {
  let message = 'Database Error';
  let statusCode = status.BAD_REQUEST;

  switch (err.code) {
    case 'P2002':
      message = `Duplicate field value: ${(err.meta?.target as string[])?.join(', ') ?? 'unknown'}`;
      statusCode = status.CONFLICT;
      break;
    case 'P2025':
      message = 'Record not found';
      statusCode = status.NOT_FOUND;
      break;
    case 'P2003':
      message = 'Invalid reference: related record not found';
      break;
    default:
      message = err.message;
      statusCode = status.INTERNAL_SERVER_ERROR;
  }

  return {
    success: false,
    message,
    errorSources: [{ path: '', message }],
    statusCode,
  };
};
