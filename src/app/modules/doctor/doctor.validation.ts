import { z } from 'zod';
import { Gender } from '../../../generated/prisma';

const doctorListQuerySchema = z.object({
  query: z.object({
    page: z.string().optional(),
    limit: z.string().optional(),
    searchTerm: z.string().optional(),
    specialty: z.string().optional(),
    gender: z.nativeEnum(Gender).optional(),
    isAvailable: z.enum(['true', 'false']).optional(),
    minFee: z.string().optional(),
    maxFee: z.string().optional(),
    sortBy: z.enum(['appointmentFee', 'experience', 'averageRating', 'createdAt']).optional(),
    sortOrder: z.enum(['asc', 'desc']).optional(),
  }),
});

const updateDoctorSchema = z.object({
  body: z.object({
    name: z.string().min(2).max(100).optional(),
    profilePhoto: z.string().url().optional(),
    contactNumber: z.string().min(11).max(20).optional(),
    address: z.string().max(500).optional(),
    bio: z.string().max(1000).optional(),
    experience: z.number().int().nonnegative().optional(),
    gender: z.nativeEnum(Gender).optional(),
    appointmentFee: z.number().nonnegative().optional(),
    qualification: z.string().min(2).max(255).optional(),
    currentWorkingPlace: z.string().min(2).max(255).optional(),
    designation: z.string().min(2).max(100).optional(),
    isAvailable: z.boolean().optional(),
    specialties: z.array(z.string().uuid()).optional(),
  }),
});

const updateAvailabilitySchema = z.object({
  body: z.object({
    isAvailable: z.boolean(),
  }),
});

const updateSpecialtiesSchema = z.object({
  body: z.object({
    specialties: z.array(z.string().uuid()).min(1),
  }),
});

const idParamSchema = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
});

export const DoctorValidation = {
  doctorListQuerySchema,
  updateDoctorSchema,
  updateAvailabilitySchema,
  updateSpecialtiesSchema,
  idParamSchema,
};
