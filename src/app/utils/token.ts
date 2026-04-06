import { Response } from "express";
import { JwtPayload, SignOptions } from "jsonwebtoken";
import { envVars } from "../config/env";
import { jwtUtils } from "./jwt";
import { CookieUtils } from './cookie';

const getAccessToken = (payload: JwtPayload) => {
    return jwtUtils.createToken(
        payload,
        envVars.ACCESS_TOKEN_SECRET as string, // as string নিশ্চিত করুন
        { expiresIn: envVars.ACCESS_TOKEN_EXPIRES_IN } as SignOptions
    );
};

const getRefreshToken = (payload: JwtPayload) => {
    return jwtUtils.createToken(
        payload,
        envVars.REFRESH_TOKEN_SECRET as string,
        { expiresIn: envVars.REFRESH_TOKEN_EXPIRES_IN } as SignOptions
    );
};

const setTokensInCookies = (res: Response, accessToken: string, refreshToken: string) => {
    const isProduction = envVars.NODE_ENV === 'production';

    CookieUtils.setCookie(res, 'accessToken', accessToken, {
        httpOnly: true,
        secure: isProduction,
        sameSite: isProduction ? "none" : "lax", // Localhost এ 'none' অনেক সময় কাজ করে না
        path: '/',
        maxAge: 1000 * 60 * 60 * 24, // 1 day
    });

    CookieUtils.setCookie(res, 'refreshToken', refreshToken, {
        httpOnly: true,
        secure: isProduction,
        sameSite: isProduction ? "none" : "lax",
        path: '/',
        maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
    });
};

const setBetterAuthSessionCookie = (res: Response, token: string) => {
    const isProduction = envVars.NODE_ENV === 'production';

    CookieUtils.setCookie(res, "better-auth.session_token", token, {
        httpOnly: true,
        secure: isProduction,
        sameSite: isProduction ? "none" : "lax",
        path: '/',
        maxAge: 1000 * 60 * 60 * 24 * 7, // Better Auth সেশন সাধারণত দীর্ঘস্থায়ী হয়
    });
};

export const tokenUtils = {
    getAccessToken,
    getRefreshToken,
    setTokensInCookies,
    setBetterAuthSessionCookie,
};