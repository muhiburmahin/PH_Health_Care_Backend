import { z } from 'zod';
import { PaymentStatus } from '../../../generated/prisma';

const initiatePaymentSchema = z.object({
  body: z.object({
    appointmentId: z.string().uuid(),
  }),
});

const appointmentIdParamSchema = z.object({
  params: z.object({
    appointmentId: z.string().uuid(),
  }),
});

const paymentListQuerySchema = z.object({
  query: z.object({
    page: z.string().optional(),
    limit: z.string().optional(),
    status: z.nativeEnum(PaymentStatus).optional(),
  }),
});

export const PaymentValidation = {
  initiatePaymentSchema,
  appointmentIdParamSchema,
  paymentListQuerySchema,
};
