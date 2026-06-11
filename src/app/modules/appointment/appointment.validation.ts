import { z } from 'zod';
import { AppointmentStatus } from '../../../generated/prisma';

const bookAppointmentSchema = z.object({
  body: z.object({
    doctorId: z.string().uuid(),
    scheduleId: z.string().uuid(),
    notes: z.string().max(1000).optional(),
    isFollowUp: z.boolean().optional(),
  }),
});

const cancelAppointmentSchema = z.object({
  body: z.object({
    cancelReason: z.string().min(3).max(500),
  }),
});

const updateStatusSchema = z.object({
  body: z.object({
    status: z.enum([AppointmentStatus.INPROGRESS, AppointmentStatus.COMPLETED]),
  }),
});

const appointmentListQuerySchema = z.object({
  query: z.object({
    page: z.string().optional(),
    limit: z.string().optional(),
    status: z.nativeEnum(AppointmentStatus).optional(),
    paymentStatus: z.enum(['PAID', 'UNPAID', 'REFUNDED', 'FAILED']).optional(),
    fromDate: z.string().datetime().optional(),
    toDate: z.string().datetime().optional(),
  }),
});

const idParamSchema = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
});

export const AppointmentValidation = {
  bookAppointmentSchema,
  cancelAppointmentSchema,
  updateStatusSchema,
  appointmentListQuerySchema,
  idParamSchema,
};
