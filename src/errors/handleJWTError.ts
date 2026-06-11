import status from 'http-status';
import { TErrorResponse } from '../types/index';

export const handleJWTError = (): TErrorResponse => ({
  success: false,
  message: 'Invalid Token. Please log in again.',
  errorSources: [{ path: 'token', message: 'Invalid or expired token' }],
  statusCode: status.UNAUTHORIZED,
});

export const handleJWTExpiredError = (): TErrorResponse => ({
  success: false,
  message: 'Your token has expired. Please log in again.',
  errorSources: [{ path: 'token', message: 'Token expired' }],
  statusCode: status.UNAUTHORIZED,
});
