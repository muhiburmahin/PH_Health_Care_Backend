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
      })) as { body?: typeof req.body };

      if (parsedResult.body !== undefined) {
        req.body = parsedResult.body;
      }
      next();
    } catch (error) {
      next(error);
    }
  };
};
