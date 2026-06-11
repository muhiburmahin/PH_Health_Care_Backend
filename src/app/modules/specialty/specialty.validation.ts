import { z } from 'zod';

const createSpecialtySchema = z.object({
  body: z.object({
    title: z.string().min(2).max(100).trim(),
    description: z.string().max(1000).optional(),
    icon: z.string().url().max(255).optional(),
  }),
});

const updateSpecialtySchema = z.object({
  body: z.object({
    title: z.string().min(2).max(100).trim().optional(),
    description: z.string().max(1000).optional(),
    icon: z.string().url().max(255).optional().nullable(),
  }),
});

const specialtyListQuerySchema = z.object({
  query: z.object({
    page: z.string().optional(),
    limit: z.string().optional(),
    searchTerm: z.string().optional(),
    includeDeleted: z.enum(['true', 'false']).optional(),
  }),
});

const idParamSchema = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
});

export const SpecialtyValidation = {
  createSpecialtySchema,
  updateSpecialtySchema,
  specialtyListQuerySchema,
  idParamSchema,
};
