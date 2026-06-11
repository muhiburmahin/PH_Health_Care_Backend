import status from 'http-status';
import {
  AppointmentStatus,
  NotificationType,
  Prisma,
  PrescriptionStatus,
  Role,
} from '../../../generated/prisma';
import { prisma } from '../../../config/prisma';
import AppError from '../../../errors/AppError';
import { notifyUser } from '../../../utils/notification.utils';
import { getPagination, getPaginationMeta } from '../../../utils/pagination.utils';

type MedicinePayload = {
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
  notes?: string;
};

type CreatePrescriptionPayload = {
  appointmentId: string;
  instructions: string;
  diagnosis?: string;
  followUpDate?: string;
  medicines: MedicinePayload[];
};

type UpdatePrescriptionPayload = {
  instructions?: string;
  diagnosis?: string;
  followUpDate?: string | null;
  medicines?: MedicinePayload[];
  status?: PrescriptionStatus;
};

const prescriptionInclude = {
  appointment: {
    select: {
      id: true,
      status: true,
      paymentStatus: true,
      createdAt: true,
      schedule: { select: { startTime: true, endTime: true } },
    },
  },
  patient: {
    select: {
      id: true,
      userId: true,
      name: true,
      email: true,
      profilePhoto: true,
      contactNumber: true,
    },
  },
  doctor: {
    select: {
      id: true,
      userId: true,
      name: true,
      email: true,
      profilePhoto: true,
      designation: true,
      qualification: true,
    },
  },
} satisfies Prisma.PrescriptionInclude;

type PrescriptionWithRelations = Prisma.PrescriptionGetPayload<{
  include: typeof prescriptionInclude;
}>;

const formatPrescription = (prescription: PrescriptionWithRelations) => {
  const { userId: _patientUserId, ...patient } = prescription.patient;
  const { userId: _doctorUserId, ...doctor } = prescription.doctor;

  return {
    id: prescription.id,
    instructions: prescription.instructions,
    diagnosis: prescription.diagnosis,
    followUpDate: prescription.followUpDate,
    status: prescription.status,
    medicines: prescription.medicines,
    createdAt: prescription.createdAt,
    updatedAt: prescription.updatedAt,
    appointment: prescription.appointment,
    patient,
    doctor,
  };
};

const getDoctorByUserId = async (userId: string) => {
  const doctor = await prisma.doctor.findFirst({
    where: { userId, isDeleted: false },
  });

  if (!doctor) {
    throw new AppError(status.NOT_FOUND, 'Doctor profile not found');
  }

  return doctor;
};

const getAppointmentForPrescription = async (appointmentId: string, doctorId: string) => {
  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: {
      prescription: { select: { id: true } },
    },
  });

  if (!appointment) {
    throw new AppError(status.NOT_FOUND, 'Appointment not found');
  }

  if (appointment.doctorId !== doctorId) {
    throw new AppError(status.FORBIDDEN, 'You can only write prescriptions for your own appointments');
  }

  if (appointment.status === AppointmentStatus.CANCELED) {
    throw new AppError(status.BAD_REQUEST, 'Cannot write prescription for a canceled appointment');
  }

  if (appointment.status === AppointmentStatus.SCHEDULED) {
    throw new AppError(
      status.BAD_REQUEST,
      'Appointment must be in progress or completed before writing a prescription'
    );
  }

  if (appointment.prescription) {
    throw new AppError(status.CONFLICT, 'Prescription already exists for this appointment');
  }

  return appointment;
};

const createPrescription = async (userId: string, payload: CreatePrescriptionPayload) => {
  const doctor = await getDoctorByUserId(userId);
  const appointment = await getAppointmentForPrescription(payload.appointmentId, doctor.id);

  const prescription = await prisma.$transaction(async (tx) => {
    const created = await tx.prescription.create({
      data: {
        appointmentId: payload.appointmentId,
        patientId: appointment.patientId,
        doctorId: doctor.id,
        instructions: payload.instructions,
        diagnosis: payload.diagnosis,
        followUpDate: payload.followUpDate ? new Date(payload.followUpDate) : undefined,
        medicines: payload.medicines,
      },
      include: prescriptionInclude,
    });

    if (appointment.status === AppointmentStatus.INPROGRESS) {
      await tx.appointment.update({
        where: { id: appointment.id },
        data: { status: AppointmentStatus.COMPLETED },
      });
    }

    return created;
  });

  notifyUser({
    userId: prescription.patient.userId,
    title: 'New Prescription',
    message: `Dr. ${prescription.doctor.name} has issued a new prescription for you.`,
    type: NotificationType.PRESCRIPTION,
    metadata: { prescriptionId: prescription.id, appointmentId: payload.appointmentId },
    sendEmail: true,
  });

  return formatPrescription(prescription);
};

const getPrescriptionById = async (
  id: string,
  requesterUserId: string,
  requesterRole: Role
) => {
  const prescription = await prisma.prescription.findUnique({
    where: { id },
    include: prescriptionInclude,
  });

  if (!prescription) {
    throw new AppError(status.NOT_FOUND, 'Prescription not found');
  }

  const isAdmin = requesterRole === Role.ADMIN || requesterRole === Role.SUPER_ADMIN;
  const isPatient =
    requesterRole === Role.PATIENT && prescription.patient.userId === requesterUserId;
  const isDoctor =
    requesterRole === Role.DOCTOR && prescription.doctor.userId === requesterUserId;

  if (!isAdmin && !isPatient && !isDoctor) {
    throw new AppError(status.FORBIDDEN, 'You do not have permission to view this prescription');
  }

  return formatPrescription(prescription);
};

const getPrescriptionByAppointment = async (
  appointmentId: string,
  requesterUserId: string,
  requesterRole: Role
) => {
  const prescription = await prisma.prescription.findUnique({
    where: { appointmentId },
    include: prescriptionInclude,
  });

  if (!prescription) {
    throw new AppError(status.NOT_FOUND, 'Prescription not found for this appointment');
  }

  const isAdmin = requesterRole === Role.ADMIN || requesterRole === Role.SUPER_ADMIN;
  const isPatient =
    requesterRole === Role.PATIENT && prescription.patient.userId === requesterUserId;
  const isDoctor =
    requesterRole === Role.DOCTOR && prescription.doctor.userId === requesterUserId;

  if (!isAdmin && !isPatient && !isDoctor) {
    throw new AppError(status.FORBIDDEN, 'You do not have permission to view this prescription');
  }

  return formatPrescription(prescription);
};

const getDoctorPrescriptions = async (userId: string, query: Record<string, unknown>) => {
  const doctor = await getDoctorByUserId(userId);
  const { page, limit, skip } = getPagination({
    page: query.page as string | undefined,
    limit: query.limit as string | undefined,
  });

  const where: Prisma.PrescriptionWhereInput = {
    doctorId: doctor.id,
    ...(query.status && { status: query.status as PrescriptionStatus }),
  };

  const [prescriptions, total] = await Promise.all([
    prisma.prescription.findMany({
      where,
      skip,
      take: limit,
      include: prescriptionInclude,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.prescription.count({ where }),
  ]);

  return {
    data: prescriptions.map(formatPrescription),
    meta: getPaginationMeta(total, page, limit),
  };
};

const getPatientPrescriptions = async (userId: string, query: Record<string, unknown>) => {
  const patient = await prisma.patient.findFirst({
    where: { userId, isDeleted: false },
  });

  if (!patient) {
    throw new AppError(status.NOT_FOUND, 'Patient profile not found');
  }

  const { page, limit, skip } = getPagination({
    page: query.page as string | undefined,
    limit: query.limit as string | undefined,
  });

  const where: Prisma.PrescriptionWhereInput = {
    patientId: patient.id,
    ...(query.status && { status: query.status as PrescriptionStatus }),
  };

  const [prescriptions, total] = await Promise.all([
    prisma.prescription.findMany({
      where,
      skip,
      take: limit,
      include: prescriptionInclude,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.prescription.count({ where }),
  ]);

  return {
    data: prescriptions.map(formatPrescription),
    meta: getPaginationMeta(total, page, limit),
  };
};

const getAllPrescriptions = async (query: Record<string, unknown>) => {
  const { page, limit, skip } = getPagination({
    page: query.page as string | undefined,
    limit: query.limit as string | undefined,
  });

  const where: Prisma.PrescriptionWhereInput = {
    ...(query.status && { status: query.status as PrescriptionStatus }),
  };

  const [prescriptions, total] = await Promise.all([
    prisma.prescription.findMany({
      where,
      skip,
      take: limit,
      include: prescriptionInclude,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.prescription.count({ where }),
  ]);

  return {
    data: prescriptions.map(formatPrescription),
    meta: getPaginationMeta(total, page, limit),
  };
};

const updatePrescription = async (
  id: string,
  userId: string,
  payload: UpdatePrescriptionPayload
) => {
  const doctor = await getDoctorByUserId(userId);

  const prescription = await prisma.prescription.findUnique({
    where: { id },
  });

  if (!prescription) {
    throw new AppError(status.NOT_FOUND, 'Prescription not found');
  }

  if (prescription.doctorId !== doctor.id) {
    throw new AppError(status.FORBIDDEN, 'You can only update your own prescriptions');
  }

  const updated = await prisma.prescription.update({
    where: { id },
    data: {
      ...(payload.instructions !== undefined && { instructions: payload.instructions }),
      ...(payload.diagnosis !== undefined && { diagnosis: payload.diagnosis }),
      ...(payload.followUpDate !== undefined && {
        followUpDate: payload.followUpDate ? new Date(payload.followUpDate) : null,
      }),
      ...(payload.medicines !== undefined && { medicines: payload.medicines }),
      ...(payload.status !== undefined && { status: payload.status }),
    },
    include: prescriptionInclude,
  });

  return formatPrescription(updated);
};

export const PrescriptionService = {
  createPrescription,
  getPrescriptionById,
  getPrescriptionByAppointment,
  getDoctorPrescriptions,
  getPatientPrescriptions,
  getAllPrescriptions,
  updatePrescription,
};
