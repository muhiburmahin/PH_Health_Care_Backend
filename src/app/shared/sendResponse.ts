import { Response } from 'express';

const sendResponse = <T>(res: Response, data: {
    statusCode: number;
    success: boolean;
    message?: string | null;
    data?: T | null;
}) => {
    res.status(data.statusCode).json({
        success: data.success,
        message: data.message || null,
        data: data.data || null,
    });
};

export default sendResponse;