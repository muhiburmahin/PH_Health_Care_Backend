import { z } from 'zod';
import { PrescriptionStatus } from '../../../generated/prisma';

const medicineSchema = z.object({
  name: z.string().min(1).max(200),
  dosage: z.string().min(1).max(100),
  frequency: z.string().min(1).max(100),
  duration: z.string().min(1).max(100),
  notes: z.string().max(500).optional(),
});

const createPrescriptionSchema = z.object({
  body: z.object({
    appointmentId: z.string().uuid(),
    instructions: z.string().min(3).max(5000),
    diagnosis: z.string().max(2000).optional(),
    followUpDate: z.string().datetime().optional(),
    medicines: z.array(medicineSchema).min(1, 'At least one medicine is required'),
  }),
});

const updatePrescriptionSchema = z.object({
  body: z.object({
    instructions: z.string().min(3).max(5000).optional(),
    diagnosis: z.string().max(2000).optional(),
    followUpDate: z.string().datetime().optional().nullable(),
    medicines: z.array(medicineSchema).min(1).optional(),
    status: z.nativeEnum(PrescriptionStatus).optional(),
  }),
});

const prescriptionListQuerySchema = z.object({
  query: z.object({
    page: z.string().optional(),
    limit: z.string().optional(),
    status: z.nativeEnum(PrescriptionStatus).optional(),
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

export const PrescriptionValidation = {
  createPrescriptionSchema,
  updatePrescriptionSchema,
  prescriptionListQuerySchema,
  idParamSchema,
  appointmentIdParamSchema,
};
