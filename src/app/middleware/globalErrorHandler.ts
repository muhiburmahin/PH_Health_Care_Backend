/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextFunction, Request, Response } from "express";
import status from "http-status";
import z from "zod";
import AppError from './appError';
import { envVars } from "../config/env";

// --- ১. ইন্টারফেসগুলো এখানেই দেওয়া হলো ---
export type TErrorSources = {
    path: string | number;
    message: string;
};

export type TErrorResponse = {
    success: boolean;
    message: string;
    errorSources: TErrorSources[];
    error?: any;
    stack?: string;
};

const handleZodError = (err: z.ZodError) => {
    const errorSources: TErrorSources[] = err.issues.map((issue) => {
        return {
            path: String(issue?.path[issue.path.length - 1]),
            message: issue.message,
        };
    });

    return {
        statusCode: status.BAD_REQUEST, // 400
        message: 'Validation Error',
        errorSources,
    };
};

// --- ৩. মেইন গ্লোবাল এরর হ্যান্ডলার ---
export const globalErrorHandler = (
    err: any,
    req: Request,
    res: Response,
    next: NextFunction
) => {
    // ডিফল্ট ভ্যালু সেট করা
    let statusCode: number = status.INTERNAL_SERVER_ERROR;
    let message: string = 'Internal Server Error';
    let errorSources: TErrorSources[] = [];
    let stack: string | undefined = undefined;

    // ডেভেলপমেন্ট মোডে কনসোলে এরর চেক করা
    if (envVars.NODE_ENV === 'development') {
        console.log("🚨 Error from Global Error Handler:", err);
    }

    // Zod Error হ্যান্ডলিং
    if (err instanceof z.ZodError) {
        const simplifiedError = handleZodError(err);
        statusCode = simplifiedError.statusCode;
        message = simplifiedError.message;
        errorSources = [...simplifiedError.errorSources];
        stack = err.stack;
    }
    // কাস্টম AppError হ্যান্ডলিং
    else if (err instanceof AppError) {
        statusCode = err.statusCode;
        message = err.message;
        stack = err.stack;
        errorSources = [
            {
                path: '',
                message: err.message
            }
        ];
    }
    // সাধারণ Error হ্যান্ডলিং
    else if (err instanceof Error) {
        statusCode = status.INTERNAL_SERVER_ERROR;
        message = err.message;
        stack = err.stack;
        errorSources = [
            {
                path: '',
                message: err.message
            }
        ];
    }

    // ফাইনাল রেসপন্স অবজেক্ট
    const errorResponse: TErrorResponse = {
        success: false,
        message: message,
        errorSources,
        error: envVars.NODE_ENV === 'development' ? err : undefined,
        stack: envVars.NODE_ENV === 'development' ? stack : undefined,
    };

    return res.status(statusCode).json(errorResponse);
};