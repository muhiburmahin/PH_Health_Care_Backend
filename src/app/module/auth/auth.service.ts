/* eslint-disable @typescript-eslint/no-explicit-any */
import status from "http-status";
import { auth } from "../../lib/auth";
import { prisma } from "../../lib/prisma";
import { tokenUtils } from "../../utils/token";
import AppError from "../../middleware/appError";

interface IRegisterPatientPayload {
    name: string;
    email: string;
    password: string;
}

interface ILoginUserPayload {
    email: string;
    password: string;
}

const registerPatient = async (payload: IRegisterPatientPayload) => {
    const { name, email, password } = payload;

    // Better Auth API Call
    const data = (await auth.api.signUpEmail({
        body: { name, email, password }
    })) as any;

    if (!data?.user) {
        throw new AppError(status.BAD_REQUEST, "Failed to register patient");
    }

    try {
        const patient = await prisma.$transaction(async (tx) => {
            const patientTx = await tx.patient.create({
                data: {
                    userId: data.user.id,
                    name: payload.name,
                    email: payload.email,
                }
            });
            return patientTx;
        });

        const tokenPayload = {
            userId: data.user.id,
            role: data.user.role,
            email: data.user.email,
        };

        const accessToken = tokenUtils.getAccessToken(tokenPayload);
        const refreshToken = tokenUtils.getRefreshToken(tokenPayload);

        return {
            user: data.user,
            session: data.session || data,
            accessToken,
            refreshToken,
            patient
        };
    } catch (error: any) {
        if (data?.user?.id) {
            await prisma.user.delete({ where: { id: data.user.id } });
        }
        throw error;
    }
};

const loginUser = async (payload: ILoginUserPayload) => {
    const { email, password } = payload;

    const data = (await auth.api.signInEmail({
        body: { email, password }
    })) as any;

    if (!data?.user) {
        throw new AppError(status.UNAUTHORIZED, "Invalid credentials");
    }

    const tokenPayload = {
        userId: data.user.id,
        role: data.user.role,
        email: data.user.email,
    };

    const accessToken = tokenUtils.getAccessToken(tokenPayload);
    const refreshToken = tokenUtils.getRefreshToken(tokenPayload);

    return {
        user: data.user,
        session: data.session || data,
        accessToken,
        refreshToken
    };
};

export const AuthService = {
    registerPatient,
    loginUser,
};