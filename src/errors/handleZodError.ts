import status from 'http-status';
import { ZodError } from 'zod';
import { TErrorResponse, TErrorSources } from '../types/index';

export const handleZodError = (err: ZodError): TErrorResponse => {
  const errorSources: TErrorSources[] = [];

  err.issues.forEach((issue) => {
    errorSources.push({
      path: issue.path.join(' => '),
      message: issue.message,
    });
  });

  return {
    success: false,
    message: 'Validation Error',
    errorSources,
    statusCode: status.BAD_REQUEST,
  };
};
