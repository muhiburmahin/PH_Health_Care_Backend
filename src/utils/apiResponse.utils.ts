import { Response } from 'express';
import { TApiResponse } from '../types/index';

export const sendResponse = <T>(res: Response, data: TApiResponse<T> & { statusCode: number }) => {
  res.status(data.statusCode).json({
    success: data.success,
    message: data.message ?? null,
    data: data.data ?? null,
    meta: data.meta ?? undefined,
  });
};
