import { z } from 'zod';

const generateTokenSchema = z.object({
  body: z.object({
    appointmentId: z.string().uuid(),
    provider: z.enum(['agora', 'zego']).optional(),
  }),
});

const appointmentIdParamSchema = z.object({
  params: z.object({
    appointmentId: z.string().uuid(),
  }),
});

const tokenQuerySchema = z.object({
  query: z.object({
    provider: z.enum(['agora', 'zego']).optional(),
  }),
});

export const VideoCallValidation = {
  generateTokenSchema,
  appointmentIdParamSchema,
  tokenQuerySchema,
};
