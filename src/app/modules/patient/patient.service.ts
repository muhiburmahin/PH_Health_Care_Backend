import { randomUUID } from 'crypto';
import status from 'http-status';
import { BloodGroup, Gender, Prisma, ReportType, Role, UserStatus } from '../../../generated/prisma';
import { prisma } from '../../../config/prisma';
import AppError from '../../../errors/AppError';
import { getPagination, getPaginationMeta } from '../../../utils/pagination.utils';

type UpdateProfilePayload = {
  name?: string;
  profilePhoto?: string;
  contactNumber?: string;
  address?: string;
};

type HealthDataPayload = {
  gender: Gender;
  dateOfBirth: string;
  bloodGroup: BloodGroup;
  hasAllergies?: boolean;
  allergyDetails?: string;
  hasDiabetes?: boolean;
  height: number;
  weight: number;
  smokingStatus?: boolean;
  dietaryPreferences?: string;
  pregnancyStatus?: boolean;
  mentalHealthHistory?: string;
  immunizationStatus?: string;
  hasPastSurgeries?: boolean;
  surgeryDetails?: string;
  recentAnxiety?: boolean;
  recentDepression?: boolean;
  maritalStatus?: string;
  emergencyContact?: string;
};

type MedicalReportPayload = {
  reportName: string;
  reportLink: string;
  reportType?: ReportType;
  description?: string;
};

const patientInclude = {
  user: {
    select: {
      id: true,
      email: true,
      phone: true,
      role: true,
      status: true,
      emailVerified: true,
      lastLoginAt: true,
      createdAt: true,
    },
  },
  patientHealthData: true,
  _count: {
    select: {
      appointments: true,
      prescriptions: true,
      medicalReports: true,
      reviews: true,
    },
  },
} satisfies Prisma.PatientInclude;

const formatPatient = (patient: Prisma.PatientGetPayload<{ include: typeof patientInclude }>) => ({
  id: patient.id,
  name: patient.name,
  email: patient.email,
  profilePhoto: patient.profilePhoto,
  contactNumber: patient.contactNumber,
  address: patient.address,
  createdAt: patient.createdAt,
  updatedAt: patient.updatedAt,
  user: patient.user,
  healthData: patient.patientHealthData,
  stats: patient._count,
});

const getPatientById = async (id: string) => {
  const patient = await prisma.patient.findFirst({
    where: { id, isDeleted: false },
    include: patientInclude,
  });

  if (!patient) throw new AppError(status.NOT_FOUND, 'Patient not found');
  return formatPatient(patient);
};

const getPatientByUserId = async (userId: string) => {
  const patient = await prisma.patient.findFirst({
    where: { userId, isDeleted: false },
    include: patientInclude,
  });

  if (!patient) throw new AppError(status.NOT_FOUND, 'Patient profile not found');
  return formatPatient(patient);
};

const getAllPatients = async (query: Record<string, unknown>) => {
  const { page, limit, skip } = getPagination({
    page: query.page as string,
    limit: query.limit as string,
  });
  const searchTerm = query.searchTerm as string | undefined;

  const where: Prisma.PatientWhereInput = { isDeleted: false };

  if (searchTerm) {
    where.OR = [
      { name: { contains: searchTerm, mode: 'insensitive' } },
      { email: { contains: searchTerm, mode: 'insensitive' } },
      { contactNumber: { contains: searchTerm, mode: 'insensitive' } },
    ];
  }

  const [patients, total] = await Promise.all([
    prisma.patient.findMany({
      where,
      skip,
      take: limit,
      include: {
        user: { select: { id: true, status: true, emailVerified: true } },
        patientHealthData: { select: { bloodGroup: true, gender: true } },
        _count: { select: { appointments: true } },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.patient.count({ where }),
  ]);

  return {
    data: patients,
    meta: getPaginationMeta(total, page, limit),
  };
};

const getPatientWithAccess = async (
  patientId: string,
  requesterUserId: string,
  requesterRole: Role
) => {
  const patient = await getPatientById(patientId);
  const isSelf = patient.user.id === requesterUserId;
  const isStaff = [Role.ADMIN, Role.SUPER_ADMIN, Role.DOCTOR].includes(requesterRole);

  if (!isSelf && !isStaff) {
    throw new AppError(status.FORBIDDEN, 'You do not have permission to view this patient');
  }

  return patient;
};

const updateProfile = async (userId: string, payload: UpdateProfilePayload) => {
  const patient = await prisma.patient.findFirst({
    where: { userId, isDeleted: false },
  });

  if (!patient) throw new AppError(status.NOT_FOUND, 'Patient profile not found');

  await prisma.$transaction(async (tx) => {
    if (payload.name) {
      await tx.user.update({
        where: { id: userId },
        data: { name: payload.name },
      });
    }

    await tx.patient.update({
      where: { id: patient.id },
      data: payload,
    });
  });

  return getPatientByUserId(userId);
};

const createHealthData = async (userId: string, payload: HealthDataPayload) => {
  const patient = await prisma.patient.findFirst({
    where: { userId, isDeleted: false },
    include: { patientHealthData: true },
  });

  if (!patient) throw new AppError(status.NOT_FOUND, 'Patient profile not found');
  if (patient.patientHealthData) {
    throw new AppError(status.CONFLICT, 'Health data already exists. Use update endpoint.');
  }

  await prisma.patientHealthData.create({
    data: {
      id: randomUUID(),
      patientId: patient.id,
      ...payload,
      dateOfBirth: new Date(payload.dateOfBirth),
    },
  });

  return getPatientByUserId(userId);
};

const updateHealthData = async (userId: string, payload: Partial<HealthDataPayload>) => {
  const patient = await prisma.patient.findFirst({
    where: { userId, isDeleted: false },
    include: { patientHealthData: true },
  });

  if (!patient) throw new AppError(status.NOT_FOUND, 'Patient profile not found');
  if (!patient.patientHealthData) {
    throw new AppError(status.NOT_FOUND, 'Health data not found. Create it first.');
  }

  const { dateOfBirth, ...rest } = payload;

  await prisma.patientHealthData.update({
    where: { patientId: patient.id },
    data: {
      ...rest,
      ...(dateOfBirth && { dateOfBirth: new Date(dateOfBirth) }),
    },
  });

  return getPatientByUserId(userId);
};

const getMedicalReports = async (userId: string, query: Record<string, unknown>) => {
  const patient = await prisma.patient.findFirst({
    where: { userId, isDeleted: false },
  });

  if (!patient) throw new AppError(status.NOT_FOUND, 'Patient profile not found');

  const { page, limit, skip } = getPagination({
    page: query.page as string,
    limit: query.limit as string,
  });

  const [reports, total] = await Promise.all([
    prisma.medicalReport.findMany({
      where: { patientId: patient.id },
      skip,
      take: limit,
      orderBy: { uploadedAt: 'desc' },
    }),
    prisma.medicalReport.count({ where: { patientId: patient.id } }),
  ]);

  return { data: reports, meta: getPaginationMeta(total, page, limit) };
};

const addMedicalReport = async (userId: string, payload: MedicalReportPayload) => {
  const patient = await prisma.patient.findFirst({
    where: { userId, isDeleted: false },
  });

  if (!patient) throw new AppError(status.NOT_FOUND, 'Patient profile not found');

  const report = await prisma.medicalReport.create({
    data: {
      id: randomUUID(),
      patientId: patient.id,
      reportName: payload.reportName,
      reportLink: payload.reportLink,
      reportType: payload.reportType ?? ReportType.OTHER,
      description: payload.description,
    },
  });

  return report;
};

const deleteMedicalReport = async (userId: string, reportId: string) => {
  const patient = await prisma.patient.findFirst({
    where: { userId, isDeleted: false },
  });

  if (!patient) throw new AppError(status.NOT_FOUND, 'Patient profile not found');

  const report = await prisma.medicalReport.findFirst({
    where: { id: reportId, patientId: patient.id },
  });

  if (!report) throw new AppError(status.NOT_FOUND, 'Medical report not found');

  await prisma.medicalReport.delete({ where: { id: reportId } });
  return { message: 'Medical report deleted successfully' };
};

const getMyAppointments = async (userId: string, query: Record<string, unknown>) => {
  const patient = await prisma.patient.findFirst({
    where: { userId, isDeleted: false },
  });

  if (!patient) throw new AppError(status.NOT_FOUND, 'Patient profile not found');

  const { page, limit, skip } = getPagination({
    page: query.page as string,
    limit: query.limit as string,
  });

  const where: Prisma.AppointmentWhereInput = { patientId: patient.id };
  if (query.status) where.status = query.status as Prisma.EnumAppointmentStatusFilter['equals'];

  const [appointments, total] = await Promise.all([
    prisma.appointment.findMany({
      where,
      skip,
      take: limit,
      include: {
        doctor: {
          select: {
            id: true,
            name: true,
            profilePhoto: true,
            designation: true,
            qualification: true,
            appointmentFee: true,
          },
        },
        schedule: { select: { id: true, startTime: true, endTime: true } },
        payment: { select: { id: true, status: true, amount: true } },
        prescription: { select: { id: true, status: true } },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.appointment.count({ where }),
  ]);

  return { data: appointments, meta: getPaginationMeta(total, page, limit) };
};

const getMyPrescriptions = async (userId: string, query: Record<string, unknown>) => {
  const patient = await prisma.patient.findFirst({
    where: { userId, isDeleted: false },
  });

  if (!patient) throw new AppError(status.NOT_FOUND, 'Patient profile not found');

  const { page, limit, skip } = getPagination({
    page: query.page as string,
    limit: query.limit as string,
  });

  const [prescriptions, total] = await Promise.all([
    prisma.prescription.findMany({
      where: { patientId: patient.id },
      skip,
      take: limit,
      include: {
        doctor: {
          select: { id: true, name: true, designation: true, profilePhoto: true },
        },
        appointment: {
          select: { id: true, status: true, createdAt: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.prescription.count({ where: { patientId: patient.id } }),
  ]);

  return { data: prescriptions, meta: getPaginationMeta(total, page, limit) };
};

const deletePatient = async (id: string) => {
  const patient = await prisma.patient.findFirst({
    where: { id, isDeleted: false },
  });

  if (!patient) throw new AppError(status.NOT_FOUND, 'Patient not found');

  await prisma.$transaction(async (tx) => {
    await tx.patient.update({
      where: { id },
      data: { isDeleted: true, deletedAt: new Date() },
    });

    await tx.user.update({
      where: { id: patient.userId },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
        status: UserStatus.DELETED,
      },
    });

    await tx.session.updateMany({
      where: { userId: patient.userId, isActive: true },
      data: { isActive: false },
    });
  });

  return { message: 'Patient deleted successfully' };
};

export const PatientService = {
  getAllPatients,
  getPatientById,
  getPatientByUserId,
  getPatientWithAccess,
  updateProfile,
  createHealthData,
  updateHealthData,
  getMedicalReports,
  addMedicalReport,
  deleteMedicalReport,
  getMyAppointments,
  getMyPrescriptions,
  deletePatient,
};
