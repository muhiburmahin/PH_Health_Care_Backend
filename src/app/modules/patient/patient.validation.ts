import { z } from 'zod';
import { BloodGroup, Gender, ReportType } from '../../../generated/prisma';

const patientListQuerySchema = z.object({
  query: z.object({
    page: z.string().optional(),
    limit: z.string().optional(),
    searchTerm: z.string().optional(),
  }),
});

const updateProfileSchema = z.object({
  body: z.object({
    name: z.string().min(2).max(100).optional(),
    profilePhoto: z.string().url().optional(),
    contactNumber: z.string().min(11).max(20).optional(),
    address: z.string().max(500).optional(),
  }),
});

const healthDataSchema = z.object({
  gender: z.nativeEnum(Gender),
  dateOfBirth: z.string().datetime(),
  bloodGroup: z.nativeEnum(BloodGroup),
  hasAllergies: z.boolean().optional(),
  allergyDetails: z.string().optional(),
  hasDiabetes: z.boolean().optional(),
  height: z.number().positive(),
  weight: z.number().positive(),
  smokingStatus: z.boolean().optional(),
  dietaryPreferences: z.string().optional(),
  pregnancyStatus: z.boolean().optional(),
  mentalHealthHistory: z.string().optional(),
  immunizationStatus: z.string().optional(),
  hasPastSurgeries: z.boolean().optional(),
  surgeryDetails: z.string().optional(),
  recentAnxiety: z.boolean().optional(),
  recentDepression: z.boolean().optional(),
  maritalStatus: z.string().max(50).optional(),
  emergencyContact: z.string().min(11).max(20).optional(),
});

const createHealthDataSchema = z.object({
  body: healthDataSchema,
});

const updateHealthDataSchema = z.object({
  body: healthDataSchema.partial(),
});

const createMedicalReportSchema = z.object({
  body: z.object({
    reportName: z.string().min(2).max(255),
    reportLink: z.string().url(),
    reportType: z.nativeEnum(ReportType).optional(),
    description: z.string().max(500).optional(),
  }),
});

const reportIdParamSchema = z.object({
  params: z.object({
    reportId: z.string().uuid(),
  }),
});

const idParamSchema = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
});

const appointmentQuerySchema = z.object({
  query: z.object({
    page: z.string().optional(),
    limit: z.string().optional(),
    status: z.enum(['SCHEDULED', 'INPROGRESS', 'COMPLETED', 'CANCELED']).optional(),
  }),
});

export const PatientValidation = {
  patientListQuerySchema,
  updateProfileSchema,
  createHealthDataSchema,
  updateHealthDataSchema,
  createMedicalReportSchema,
  reportIdParamSchema,
  idParamSchema,
  appointmentQuerySchema,
};
