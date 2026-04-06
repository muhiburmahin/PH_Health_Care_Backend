/* eslint-disable @typescript-eslint/no-explicit-any */
import { Request, Response } from "express";
import status from "http-status";
import { tokenUtils } from "../../utils/token";
import { AuthService } from "./auth.service";
import sendResponse from "../../shared/sendResponse";
import catchAsync from "../../shared/catchAsync";

const registerPatient = catchAsync(
    async (req: Request, res: Response) => {
        const payload = req.body;

        const result = await AuthService.registerPatient(payload) as any;

        // Better Auth টোকেন session অবজেক্ট থেকে বের করা
        const token = result.session?.token;
        const { accessToken, refreshToken, user, patient } = result;

        // কুকিতে টোকেন সেট করা
        tokenUtils.setTokensInCookies(res, accessToken, refreshToken);

        if (token) {
            tokenUtils.setBetterAuthSessionCookie(res, token);
        }

        sendResponse(res, {
            statusCode: status.CREATED,
            success: true,
            message: "Patient registered successfully",
            data: {
                token,          // স্ক্রিনশটের মতো 'token'
                accessToken,    // আপনার কাস্টম JWT
                refreshToken,
                user,
                patient
            }
        });
    }
);

const loginUser = catchAsync(
    async (req: Request, res: Response) => {
        const payload = req.body;

        const result = await AuthService.loginUser(payload) as any;

        const token = result.session?.token;
        const { accessToken, refreshToken, user } = result;

        tokenUtils.setTokensInCookies(res, accessToken, refreshToken);

        if (token) {
            tokenUtils.setBetterAuthSessionCookie(res, token);
        }

        sendResponse(res, {
            statusCode: status.OK,
            success: true,
            message: "User logged in successfully",
            data: {
                token,          // স্ক্রিনশটের মতো 'token'
                accessToken,
                refreshToken,
                user
            },
        });
    }
);

export const AuthController = {
    registerPatient,
    loginUser,
};