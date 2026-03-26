/* eslint-disable @typescript-eslint/no-explicit-any */
import { auth } from "../../lib/auth";
import { prisma } from "../../lib/prisma";
import { userStatus } from '../../../generated/prisma/enums';

interface IRegisterPatientPayload {
    name: string;
    email: string;
    password: string;
}

const registerPatient = async (payload: IRegisterPatientPayload) => {
    const { name, email, password } = payload;

    const authData = await auth.api.signUpEmail({
        body: {
            name,
            email,
            password,
        } as any
    });

    if (!authData || !authData.user) {
        throw new Error("Failed to register user in Auth system");
    }

    try {
        const result = await prisma.$transaction(async (tx) => {
            const patientProfile = await (tx as any).patient.create({
                data: {
                    userId: authData.user.id,
                    email: authData.user.email,
                    name: authData.user.name,
                }
            });

            return {
                user: authData.user,
                profile: patientProfile
            };
        });

        return result;

    } catch (error: any) {
        console.error("Profile creation failed, deleting user from DB...", error.message);

        await prisma.user.delete({
            where: {
                id: authData.user.id
            }
        });

        //  throw new Error(`Registration failed: ${error.message}. User has been rolled back.`);
    }
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

    // স্ট্যাটাস চেক
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