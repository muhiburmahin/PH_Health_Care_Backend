import { NextFunction, Request, Response } from "express";
import { ZodObject } from "zod";

export const validateRequest = (zodSchema: ZodObject) => {
    return async (req: Request, res: Response, next: NextFunction) => {
        try {
            const parsedResult = await zodSchema.parseAsync({
                body: req.body,
                query: req.query,
                params: req.params,
                cookies: req.cookies,
            });

            req.body = parsedResult.body;

            next();
        } catch (error) {
            next(error);
        }
    };
};