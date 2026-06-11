import { z } from 'zod';

const createReviewSchema = z.object({
  body: z.object({
    appointmentId: z.string().uuid(),
    rating: z.number().min(1).max(5),
    comment: z.string().max(2000).optional(),
  }),
});

const updateReviewSchema = z.object({
  body: z.object({
    rating: z.number().min(1).max(5).optional(),
    comment: z.string().max(2000).optional().nullable(),
  }),
});

const updateVisibilitySchema = z.object({
  body: z.object({
    isVisible: z.boolean(),
  }),
});

const reviewListQuerySchema = z.object({
  query: z.object({
    page: z.string().optional(),
    limit: z.string().optional(),
    doctorId: z.string().uuid().optional(),
    isVisible: z.enum(['true', 'false']).optional(),
  }),
});

const idParamSchema = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
});

const appointmentIdParamSchema = z.object({
  params: z.object({
    appointmentId: z.string().uuid(),
  }),
});

export const ReviewValidation = {
  createReviewSchema,
  updateReviewSchema,
  updateVisibilitySchema,
  reviewListQuerySchema,
  idParamSchema,
  appointmentIdParamSchema,
};
