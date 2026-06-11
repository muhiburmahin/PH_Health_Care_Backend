import { z } from 'zod';
import { UserStatus } from '../../../generated/prisma';

const createAdminSchema = z.object({
  body: z.object({
    name: z.string().min(2).max(100),
    email: z.string().email(),
    password: z
      .string()
      .min(8)
      .regex(/[A-Z]/, 'Must contain uppercase')
      .regex(/[a-z]/, 'Must contain lowercase')
      .regex(/[0-9]/, 'Must contain number'),
    contactNumber: z.string().min(11).max(20).optional(),
    bio: z.string().max(500).optional(),
    profilePhoto: z.string().url().optional(),
  }),
});

const createSuperAdminSchema = z.object({
  body: z.object({
    name: z.string().min(2).max(100),
    email: z.string().email(),
    password: z
      .string()
      .min(8)
      .regex(/[A-Z]/, 'Must contain uppercase')
      .regex(/[a-z]/, 'Must contain lowercase')
      .regex(/[0-9]/, 'Must contain number'),
    contactNumber: z.string().min(11).max(20).optional(),
  }),
});

const updateAdminSchema = z.object({
  body: z.object({
    name: z.string().min(2).max(100).optional(),
    contactNumber: z.string().min(11).max(20).optional(),
    bio: z.string().max(500).optional(),
    profilePhoto: z.string().url().optional(),
  }),
});

const adminListQuerySchema = z.object({
  query: z.object({
    page: z.string().optional(),
    limit: z.string().optional(),
    searchTerm: z.string().optional(),
  }),
});

const userListQuerySchema = z.object({
  query: z.object({
    page: z.string().optional(),
    limit: z.string().optional(),
    searchTerm: z.string().optional(),
    role: z.enum(['SUPER_ADMIN', 'ADMIN', 'DOCTOR', 'PATIENT']).optional(),
    status: z.nativeEnum(UserStatus).optional(),
  }),
});

const updateUserStatusSchema = z.object({
  body: z.object({
    status: z.nativeEnum(UserStatus),
  }),
});

const idParamSchema = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
});

const userIdParamSchema = z.object({
  params: z.object({
    userId: z.string().uuid(),
  }),
});

export const AdminValidation = {
  createAdminSchema,
  createSuperAdminSchema,
  updateAdminSchema,
  adminListQuerySchema,
  userListQuerySchema,
  updateUserStatusSchema,
  idParamSchema,
  userIdParamSchema,
};
