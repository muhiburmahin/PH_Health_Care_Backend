
import { prisma } from "../../lib/prisma";
import { IDoctorFilterRequest, IDoctorUpdateData } from "./doctor.interface";
import AppError from "../../middleware/appError";
import status from "http-status";
import { Prisma } from "../../../generated/prisma/client";

const getAllDoctors = async (params: IDoctorFilterRequest) => {
    const { searchTerm, specialties, ...filterData } = params;
    const andConditions: Prisma.DoctorWhereInput[] = [];

    if (searchTerm) {
        andConditions.push({
            OR: [
                { name: { contains: searchTerm, mode: 'insensitive' } },
                { email: { contains: searchTerm, mode: 'insensitive' } },
                { contactNumber: { contains: searchTerm, mode: 'insensitive' } },
            ],
        });
    }

    if (specialties) {
        andConditions.push({
            doctorSpecialties: {
                some: {
                    specialty: {
                        title: { contains: specialties, mode: 'insensitive' }
                    }
                }
            }
        });
    }

    if (Object.keys(filterData).length > 0) {
        andConditions.push({
            AND: Object.keys(filterData).map((key) => ({
                [key]: {
                    equals: (filterData as Record<string, unknown>)[key]
                }
            }))
        });
    }

    andConditions.push({
        isDeleted: false
    });

    const whereConditions: Prisma.DoctorWhereInput = { AND: andConditions };

    return await prisma.doctor.findMany({
        where: whereConditions,
        select: {
            id: true,
            userId: true,
            name: true,
            email: true,
            profilePhoto: true,
            contactNumber: true,
            address: true,
            registrationNumber: true,
            experience: true,
            gender: true,
            appointmentFee: true,
            qualification: true,
            currentWorkPlace: true,
            designation: true,
            createdAt: true,
            updatedAt: true,
            user: {
                select: {
                    id: true,
                    email: true,
                    name: true,
                    role: true,
                    status: true,
                    emailVerified: true,
                    image: true,
                    isDeleted: true,
                    deletedAt: true,
                    createdAt: true,
                    updatedAt: true,
                }
            },
            doctorSpecialties: {
                include: {
                    specialty: true
                }
            }
        }
    });
};

const getById = async (id: string) => {
    return await prisma.doctor.findUniqueOrThrow({
        where: {
            id,
            isDeleted: false
        },
        include: {
            user: {
                select: {
                    id: true,
                    email: true,
                    role: true,
                    status: true
                }
            },
            doctorSpecialties: {
                include: {
                    specialty: true
                }
            }
        }
    });
};

const updateDoctor = async (id: string, payload: IDoctorUpdateData) => {
    const { specialties, ...doctorData } = payload;

    const isDoctorExists = await prisma.doctor.findUnique({
        where: { id, isDeleted: false }
    });

    if (!isDoctorExists) {
        throw new AppError(status.NOT_FOUND, "Doctor not found!");
    }

    await prisma.$transaction(async (transactionClient) => {
        await transactionClient.doctor.update({
            where: { id },
            data: doctorData
        });
        if (specialties && specialties.length > 0) {
            await transactionClient.doctorSpecialties.deleteMany({
                where: { doctorId: id }
            });
            const createSpecialtiesData = specialties.map((specialtyId: string) => ({
                doctorId: id,
                specialtyId
            }));
            await transactionClient.doctorSpecialties.createMany({
                data: createSpecialtiesData
            });
        }
    });
    return await prisma.doctor.findUnique({
        where: { id },
        include: {
            user: true,
            doctorSpecialties: {
                include: { specialty: true }
            }
        }
    });
};

const deleteDoctor = async (id: string) => {
    const isDoctorExists = await prisma.doctor.findUnique({
        where: { id }
    });

    if (!isDoctorExists) {
        throw new AppError(status.NOT_FOUND, "Doctor not found!");
    }

    return await prisma.$transaction(async (tx) => {
        const deletedDoctor = await tx.doctor.update({
            where: { id },
            data: { isDeleted: true }
        });

        await tx.user.update({
            where: { id: deletedDoctor.userId },
            data: { isDeleted: true }
        });

        return deletedDoctor;
    });
};

export const DoctorService = {
    getAllDoctors,
    getById,
    updateDoctor,
    deleteDoctor
};