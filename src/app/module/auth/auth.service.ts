/* eslint-disable @typescript-eslint/no-explicit-any */
import { userStatus, Role } from '../../../generated/prisma/enums';
import { auth } from "../../lib/auth";
import { prisma } from "../../lib/prisma";

interface IRegisterPatientPayload {
    name: string;
    email: string;
    password: string;
}

const registerPatient = async (payload: IRegisterPatientPayload) => {
    const { name, email, password } = payload;

    const data = await auth.api.signUpEmail({
        body: {
            name,
            email,
            password,
        } as any
    });

    if (!data || !data.user) {
        throw new Error("Failed to register user in Auth system");
    }

    const result = await prisma.$transaction(async (tx) => {
        const updatedUser = await tx.user.update({
            where: { email: data.user.email },
            data: {
                role: Role.PATIENT,
                status: userStatus.ACTIVE,
            }
        });
        const patientProfile = await (tx as any).patient.create({
            data: {
                email: updatedUser.email,
                name: updatedUser.name,
            }
        });

        return {
            user: updatedUser,
            profile: patientProfile
        };
    });

    return result;
};


interface ILoginUserPayload {
    email: string;
    password: string;
}

const loginUser = async (payload: ILoginUserPayload) => {
    const { email, password } = payload;

    const data = await auth.api.signInEmail({
        body: {
            email,
            password,
        }
    }) as any;

    if (!data?.user) {
        throw new Error("Invalid email or password");
    }

    if (data.user.status === userStatus.BLOCKED) {
        throw new Error("Your account is blocked. Please contact support.");
    }

    if (data.user.isDeleted || data.user.status === userStatus.DELETED) {
        throw new Error("This account no longer exists.");
    }

    return data;
};

export const AuthService = {
    registerPatient,
    loginUser,
};