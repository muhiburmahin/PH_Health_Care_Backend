import { Specialty } from "../../../generated/prisma/client";
import { prisma } from "../../lib/prisma";

const createSpecialty = async (payload: Specialty): Promise<Specialty> => {
    const Specialty = await prisma.specialty.create({
        data: payload
    });
    return Specialty;
};

const getAllSpecialties = async (): Promise<Specialty[]> => {
    const result = await prisma.specialty.findMany({
        where: {
            isDeleted: false
        }
    });
    return result;
};
const deleteSpecialty = async (id: string): Promise<Specialty> => {
    const result = await prisma.specialty.update({
        where: {
            id
        },
        data: {
            isDeleted: true,
            deletedAt: new Date()
        }
    });
    return result;
};
const updateSpecialty = async (id: string, payload: Partial<Specialty>): Promise<Specialty> => {
    const result = await prisma.specialty.update({
        where: {
            id
        },
        data: payload
    });
    return result;
};

export const SpecialtyService = {
    createSpecialty,
    getAllSpecialties,
    deleteSpecialty,
    updateSpecialty
};