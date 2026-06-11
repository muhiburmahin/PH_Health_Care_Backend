import { NextFunction, Request, Response } from 'express';
import { ZodTypeAny } from 'zod';

export const validateRequest = (zodSchema: ZodTypeAny) => {
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      const parsedResult = (await zodSchema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
        cookies: req.cookies,
      })) as {
        body?: typeof req.body;
        query?: typeof req.query;
        params?: typeof req.params;
      };

      if (parsedResult.body !== undefined) req.body = parsedResult.body;
      if (parsedResult.query !== undefined) req.query = parsedResult.query as typeof req.query;
      if (parsedResult.params !== undefined) req.params = parsedResult.params as typeof req.params;
      next();
    } catch (error) {
      next(error);
    }
  };
};
