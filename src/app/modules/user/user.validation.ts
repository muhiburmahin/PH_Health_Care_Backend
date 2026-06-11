import { z } from 'zod';
import { Gender } from '../../../generated/prisma';

const updateProfileSchema = z.object({
  body: z.object({
    name: z.string().min(2).max(100).optional(),
    phone: z.string().min(11).max(20).optional(),
    image: z.string().url().optional(),
    profilePhoto: z.string().url().optional(),
    contactNumber: z.string().min(11).max(20).optional(),
    address: z.string().max(500).optional(),
    bio: z.string().max(500).optional(),
  }),
});

const changePasswordSchema = z.object({
  body: z
    .object({
      currentPassword: z.string().min(1, 'Current password is required'),
      newPassword: z
        .string()
        .min(8)
        .regex(/[A-Z]/, 'Must contain uppercase')
        .regex(/[a-z]/, 'Must contain lowercase')
        .regex(/[0-9]/, 'Must contain number'),
      confirmPassword: z.string(),
    })
    .refine((data) => data.newPassword === data.confirmPassword, {
      message: 'Passwords do not match',
      path: ['confirmPassword'],
    }),
});

const createDoctorSchema = z.object({
  body: z.object({
    password: z
      .string()
      .min(8)
      .regex(/[A-Z]/, 'Must contain uppercase')
      .regex(/[a-z]/, 'Must contain lowercase')
      .regex(/[0-9]/, 'Must contain number'),
    specialties: z.array(z.string().uuid()).min(1, 'At least one specialty is required'),
    doctor: z.object({
      name: z.string().min(2).max(100),
      email: z.string().email(),
      registrationNumber: z.string().min(2).max(50),
      experience: z.number().int().nonnegative(),
      gender: z.nativeEnum(Gender),
      appointmentFee: z.number().nonnegative(),
      qualification: z.string().min(2).max(255),
      designation: z.string().min(2).max(100),
      currentWorkingPlace: z.string().min(2).max(255),
      profilePhoto: z.string().url().optional(),
      contactNumber: z.string().min(11).max(20).optional(),
      address: z.string().max(500).optional(),
      bio: z.string().max(500).optional(),
    }),
  }),
});

const idParamSchema = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
});

export const UserValidation = {
  updateProfileSchema,
  changePasswordSchema,
  createDoctorSchema,
  idParamSchema,
};
