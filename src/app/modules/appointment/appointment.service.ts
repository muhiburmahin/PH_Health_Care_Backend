import { randomUUID } from 'crypto';
import status from 'http-status';
import { AppointmentStatus, Prisma, Role } from '../../../generated/prisma';
import { prisma } from '../../../config/prisma';
import AppError from '../../../errors/AppError';
import { getPagination, getPaginationMeta } from '../../../utils/pagination.utils';

type BookAppointmentPayload = {
  doctorId: string;
  scheduleId: string;
  notes?: string;
  isFollowUp?: boolean;
};

const appointmentInclude = {
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
      appointmentFee: true,
      contactNumber: true,
    },
  },
  schedule: {
    select: { id: true, startTime: true, endTime: true },
  },
  payment: {
    select: { id: true, status: true, amount: true, transactionId: true, paidAt: true },
  },
  prescription: {
    select: { id: true, status: true },
  },
  review: {
    select: { id: true, rating: true },
  },
} satisfies Prisma.AppointmentInclude;

type AppointmentWithRelations = Prisma.AppointmentGetPayload<{
  include: typeof appointmentInclude;
}>;

const formatAppointment = (appointment: AppointmentWithRelations) => {
  const { userId: _patientUserId, ...patient } = appointment.patient;
  const { userId: _doctorUserId, ...doctor } = appointment.doctor;

  return {
    id: appointment.id,
    videoCallingId: appointment.videoCallingId,
    status: appointment.status,
    paymentStatus: appointment.paymentStatus,
    notes: appointment.notes,
    cancelReason: appointment.cancelReason,
    isFollowUp: appointment.isFollowUp,
    createdAt: appointment.createdAt,
    updatedAt: appointment.updatedAt,
    patient,
    doctor,
    schedule: appointment.schedule,
    payment: appointment.payment,
    prescription: appointment.prescription,
    review: appointment.review,
  };
};

const getPatientByUserId = async (userId: string) => {
  const patient = await prisma.patient.findFirst({
    where: { userId, isDeleted: false },
  });

  if (!patient) {
    throw new AppError(status.NOT_FOUND, 'Patient profile not found');
  }

  return patient;
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

const buildDateFilter = (query: Record<string, unknown>): Prisma.ScheduleWhereInput | undefined => {
  const fromDate = query.fromDate ? new Date(query.fromDate as string) : undefined;
  const toDate = query.toDate ? new Date(query.toDate as string) : undefined;

  if (!fromDate && !toDate) return undefined;

  return {
    ...(fromDate && { startTime: { gte: fromDate } }),
    ...(toDate && { endTime: { lte: toDate } }),
  };
};

const bookAppointment = async (userId: string, payload: BookAppointmentPayload) => {
  const patient = await getPatientByUserId(userId);

  const doctor = await prisma.doctor.findFirst({
    where: { id: payload.doctorId, isDeleted: false, isAvailable: true },
  });

  if (!doctor) {
    throw new AppError(status.NOT_FOUND, 'Doctor not found or not available');
  }

  const appointment = await prisma.$transaction(async (tx) => {
    const slot = await tx.doctorSchedule.findUnique({
      where: {
        doctorId_scheduleId: {
          doctorId: payload.doctorId,
          scheduleId: payload.scheduleId,
        },
      },
      include: { schedule: true },
    });

    if (!slot) {
      throw new AppError(status.NOT_FOUND, 'Schedule slot not found for this doctor');
    }

    if (slot.isBooked) {
      throw new AppError(status.CONFLICT, 'This schedule slot is already booked');
    }

    if (slot.schedule.startTime <= new Date()) {
      throw new AppError(status.BAD_REQUEST, 'Cannot book a past schedule slot');
    }

    const existingAppointment = await tx.appointment.findFirst({
      where: {
        scheduleId: payload.scheduleId,
        doctorId: payload.doctorId,
        status: { not: AppointmentStatus.CANCELED },
      },
    });

    if (existingAppointment) {
      throw new AppError(status.CONFLICT, 'An appointment already exists for this slot');
    }

    const created = await tx.appointment.create({
      data: {
        videoCallingId: randomUUID(),
        patientId: patient.id,
        doctorId: payload.doctorId,
        scheduleId: payload.scheduleId,
        notes: payload.notes,
        isFollowUp: payload.isFollowUp ?? false,
      },
      include: appointmentInclude,
    });

    await tx.doctorSchedule.update({
      where: {
        doctorId_scheduleId: {
          doctorId: payload.doctorId,
          scheduleId: payload.scheduleId,
        },
      },
      data: { isBooked: true },
    });

    return created;
  });

  return formatAppointment(appointment);
};

const getAppointmentById = async (
  id: string,
  requesterUserId: string,
  requesterRole: Role
) => {
  const appointment = await prisma.appointment.findUnique({
    where: { id },
    include: appointmentInclude,
  });

  if (!appointment) {
    throw new AppError(status.NOT_FOUND, 'Appointment not found');
  }

  const isAdmin = requesterRole === Role.ADMIN || requesterRole === Role.SUPER_ADMIN;
  const isPatient =
    requesterRole === Role.PATIENT && appointment.patient.userId === requesterUserId;
  const isDoctor =
    requesterRole === Role.DOCTOR && appointment.doctor.userId === requesterUserId;

  if (!isAdmin && !isPatient && !isDoctor) {
    throw new AppError(status.FORBIDDEN, 'You do not have permission to view this appointment');
  }

  return formatAppointment(appointment);
};

const getMyAppointments = async (userId: string, query: Record<string, unknown>) => {
  const patient = await getPatientByUserId(userId);
  const { page, limit, skip } = getPagination({
    page: query.page as string | undefined,
    limit: query.limit as string | undefined,
  });

  const scheduleFilter = buildDateFilter(query);

  const where: Prisma.AppointmentWhereInput = {
    patientId: patient.id,
    ...(query.status && { status: query.status as AppointmentStatus }),
    ...(query.paymentStatus && {
      paymentStatus: query.paymentStatus as Prisma.EnumPaymentStatusFilter['equals'],
    }),
    ...(scheduleFilter && { schedule: scheduleFilter }),
  };

  const [appointments, total] = await Promise.all([
    prisma.appointment.findMany({
      where,
      skip,
      take: limit,
      include: appointmentInclude,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.appointment.count({ where }),
  ]);

  return {
    data: appointments.map(formatAppointment),
    meta: getPaginationMeta(total, page, limit),
  };
};

const getDoctorAppointments = async (userId: string, query: Record<string, unknown>) => {
  const doctor = await getDoctorByUserId(userId);
  const { page, limit, skip } = getPagination({
    page: query.page as string | undefined,
    limit: query.limit as string | undefined,
  });

  const scheduleFilter = buildDateFilter(query);

  const where: Prisma.AppointmentWhereInput = {
    doctorId: doctor.id,
    ...(query.status && { status: query.status as AppointmentStatus }),
    ...(query.paymentStatus && {
      paymentStatus: query.paymentStatus as Prisma.EnumPaymentStatusFilter['equals'],
    }),
    ...(scheduleFilter && { schedule: scheduleFilter }),
  };

  const [appointments, total] = await Promise.all([
    prisma.appointment.findMany({
      where,
      skip,
      take: limit,
      include: appointmentInclude,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.appointment.count({ where }),
  ]);

  return {
    data: appointments.map(formatAppointment),
    meta: getPaginationMeta(total, page, limit),
  };
};

const getAllAppointments = async (query: Record<string, unknown>) => {
  const { page, limit, skip } = getPagination({
    page: query.page as string | undefined,
    limit: query.limit as string | undefined,
  });

  const scheduleFilter = buildDateFilter(query);

  const where: Prisma.AppointmentWhereInput = {
    ...(query.status && { status: query.status as AppointmentStatus }),
    ...(query.paymentStatus && {
      paymentStatus: query.paymentStatus as Prisma.EnumPaymentStatusFilter['equals'],
    }),
    ...(scheduleFilter && { schedule: scheduleFilter }),
  };

  const [appointments, total] = await Promise.all([
    prisma.appointment.findMany({
      where,
      skip,
      take: limit,
      include: appointmentInclude,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.appointment.count({ where }),
  ]);

  return {
    data: appointments.map(formatAppointment),
    meta: getPaginationMeta(total, page, limit),
  };
};

const cancelAppointment = async (
  id: string,
  cancelReason: string,
  requesterUserId: string,
  requesterRole: Role
) => {
  const appointment = await prisma.appointment.findUnique({
    where: { id },
    include: {
      patient: { select: { userId: true } },
      doctor: { select: { userId: true } },
    },
  });

  if (!appointment) {
    throw new AppError(status.NOT_FOUND, 'Appointment not found');
  }

  if (appointment.status === AppointmentStatus.COMPLETED) {
    throw new AppError(status.BAD_REQUEST, 'Cannot cancel a completed appointment');
  }

  if (appointment.status === AppointmentStatus.CANCELED) {
    throw new AppError(status.BAD_REQUEST, 'Appointment is already canceled');
  }

  const isAdmin = requesterRole === Role.ADMIN || requesterRole === Role.SUPER_ADMIN;
  const isPatient =
    requesterRole === Role.PATIENT && appointment.patient.userId === requesterUserId;
  const isDoctor =
    requesterRole === Role.DOCTOR && appointment.doctor.userId === requesterUserId;

  if (!isAdmin && !isPatient && !isDoctor) {
    throw new AppError(status.FORBIDDEN, 'You do not have permission to cancel this appointment');
  }

  const updated = await prisma.$transaction(async (tx) => {
    const canceled = await tx.appointment.update({
      where: { id },
      data: {
        status: AppointmentStatus.CANCELED,
        cancelReason,
      },
      include: appointmentInclude,
    });

    await tx.doctorSchedule.updateMany({
      where: {
        doctorId: appointment.doctorId,
        scheduleId: appointment.scheduleId,
      },
      data: { isBooked: false },
    });

    return canceled;
  });

  return formatAppointment(updated);
};

const updateAppointmentStatus = async (
  id: string,
  newStatus: AppointmentStatus,
  requesterUserId: string
) => {
  const doctor = await getDoctorByUserId(requesterUserId);

  const appointment = await prisma.appointment.findUnique({
    where: { id },
  });

  if (!appointment) {
    throw new AppError(status.NOT_FOUND, 'Appointment not found');
  }

  if (appointment.doctorId !== doctor.id) {
    throw new AppError(status.FORBIDDEN, 'You can only update your own appointments');
  }

  const validTransitions: Partial<Record<AppointmentStatus, AppointmentStatus[]>> = {
    [AppointmentStatus.SCHEDULED]: [AppointmentStatus.INPROGRESS],
    [AppointmentStatus.INPROGRESS]: [AppointmentStatus.COMPLETED],
  };

  const allowed = validTransitions[appointment.status] ?? [];

  if (!allowed.includes(newStatus)) {
    throw new AppError(
      status.BAD_REQUEST,
      `Cannot change status from ${appointment.status} to ${newStatus}`
    );
  }

  const updated = await prisma.appointment.update({
    where: { id },
    data: { status: newStatus },
    include: appointmentInclude,
  });

  return formatAppointment(updated);
};

export const AppointmentService = {
  bookAppointment,
  getAppointmentById,
  getMyAppointments,
  getDoctorAppointments,
  getAllAppointments,
  cancelAppointment,
  updateAppointmentStatus,
};
