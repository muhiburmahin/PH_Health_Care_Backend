import status from 'http-status';
import { AppointmentStatus, Prisma, Role } from '../../../generated/prisma';
import { prisma } from '../../../config/prisma';
import AppError from '../../../errors/AppError';
import { getPagination, getPaginationMeta } from '../../../utils/pagination.utils';

type CreateReviewPayload = {
  appointmentId: string;
  rating: number;
  comment?: string;
};

type UpdateReviewPayload = {
  rating?: number;
  comment?: string | null;
};

const reviewInclude = {
  appointment: {
    select: {
      id: true,
      status: true,
      createdAt: true,
      schedule: { select: { startTime: true, endTime: true } },
    },
  },
  patient: {
    select: {
      id: true,
      userId: true,
      name: true,
      profilePhoto: true,
    },
  },
  doctor: {
    select: {
      id: true,
      userId: true,
      name: true,
      profilePhoto: true,
      designation: true,
      averageRating: true,
      totalReviews: true,
    },
  },
} satisfies Prisma.ReviewInclude;

type ReviewWithRelations = Prisma.ReviewGetPayload<{ include: typeof reviewInclude }>;

const formatReview = (review: ReviewWithRelations) => {
  const { userId: _patientUserId, ...patient } = review.patient;
  const { userId: _doctorUserId, ...doctor } = review.doctor;

  return {
    id: review.id,
    rating: review.rating,
    comment: review.comment,
    isVisible: review.isVisible,
    createdAt: review.createdAt,
    updatedAt: review.updatedAt,
    appointment: review.appointment,
    patient,
    doctor,
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

const recalculateDoctorRating = async (
  doctorId: string,
  tx: Prisma.TransactionClient = prisma
) => {
  const aggregate = await tx.review.aggregate({
    where: { doctorId, isVisible: true },
    _avg: { rating: true },
    _count: true,
  });

  await tx.doctor.update({
    where: { id: doctorId },
    data: {
      averageRating: aggregate._avg.rating ?? 0,
      totalReviews: aggregate._count,
    },
  });
};

const getAppointmentForReview = async (appointmentId: string, patientId: string) => {
  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: {
      review: { select: { id: true } },
    },
  });

  if (!appointment) {
    throw new AppError(status.NOT_FOUND, 'Appointment not found');
  }

  if (appointment.patientId !== patientId) {
    throw new AppError(status.FORBIDDEN, 'You can only review your own appointments');
  }

  if (appointment.status !== AppointmentStatus.COMPLETED) {
    throw new AppError(
      status.BAD_REQUEST,
      'You can only review completed appointments'
    );
  }

  if (appointment.review) {
    throw new AppError(status.CONFLICT, 'Review already exists for this appointment');
  }

  return appointment;
};

const createReview = async (userId: string, payload: CreateReviewPayload) => {
  const patient = await getPatientByUserId(userId);
  const appointment = await getAppointmentForReview(payload.appointmentId, patient.id);

  const review = await prisma.$transaction(async (tx) => {
    const created = await tx.review.create({
      data: {
        appointmentId: payload.appointmentId,
        patientId: patient.id,
        doctorId: appointment.doctorId,
        rating: payload.rating,
        comment: payload.comment,
      },
      include: reviewInclude,
    });

    await recalculateDoctorRating(appointment.doctorId, tx);
    return created;
  });

  return formatReview(review);
};

const getReviewById = async (id: string, requesterUserId: string, requesterRole: Role) => {
  const review = await prisma.review.findUnique({
    where: { id },
    include: reviewInclude,
  });

  if (!review) {
    throw new AppError(status.NOT_FOUND, 'Review not found');
  }

  const isAdmin = requesterRole === Role.ADMIN || requesterRole === Role.SUPER_ADMIN;
  const isPatient =
    requesterRole === Role.PATIENT && review.patient.userId === requesterUserId;
  const isDoctor =
    requesterRole === Role.DOCTOR && review.doctor.userId === requesterUserId;

  if (!isAdmin && !isPatient && !isDoctor) {
    throw new AppError(status.FORBIDDEN, 'You do not have permission to view this review');
  }

  if (!isAdmin && !review.isVisible && !isPatient) {
    throw new AppError(status.NOT_FOUND, 'Review not found');
  }

  return formatReview(review);
};

const getReviewByAppointment = async (
  appointmentId: string,
  requesterUserId: string,
  requesterRole: Role
) => {
  const review = await prisma.review.findUnique({
    where: { appointmentId },
    include: reviewInclude,
  });

  if (!review) {
    throw new AppError(status.NOT_FOUND, 'Review not found for this appointment');
  }

  const isAdmin = requesterRole === Role.ADMIN || requesterRole === Role.SUPER_ADMIN;
  const isPatient =
    requesterRole === Role.PATIENT && review.patient.userId === requesterUserId;
  const isDoctor =
    requesterRole === Role.DOCTOR && review.doctor.userId === requesterUserId;

  if (!isAdmin && !isPatient && !isDoctor) {
    throw new AppError(status.FORBIDDEN, 'You do not have permission to view this review');
  }

  if (!isAdmin && !review.isVisible && !isPatient) {
    throw new AppError(status.NOT_FOUND, 'Review not found');
  }

  return formatReview(review);
};

const getMyReviews = async (userId: string, query: Record<string, unknown>) => {
  const patient = await getPatientByUserId(userId);
  const { page, limit, skip } = getPagination({
    page: query.page as string | undefined,
    limit: query.limit as string | undefined,
  });

  const where: Prisma.ReviewWhereInput = { patientId: patient.id };

  const [reviews, total] = await Promise.all([
    prisma.review.findMany({
      where,
      skip,
      take: limit,
      include: reviewInclude,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.review.count({ where }),
  ]);

  return {
    data: reviews.map(formatReview),
    meta: getPaginationMeta(total, page, limit),
  };
};

const getAllReviews = async (query: Record<string, unknown>) => {
  const { page, limit, skip } = getPagination({
    page: query.page as string | undefined,
    limit: query.limit as string | undefined,
  });

  const where: Prisma.ReviewWhereInput = {
    ...(query.doctorId && { doctorId: query.doctorId as string }),
    ...(query.isVisible !== undefined && { isVisible: query.isVisible === 'true' }),
  };

  const [reviews, total] = await Promise.all([
    prisma.review.findMany({
      where,
      skip,
      take: limit,
      include: reviewInclude,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.review.count({ where }),
  ]);

  return {
    data: reviews.map(formatReview),
    meta: getPaginationMeta(total, page, limit),
  };
};

const updateReview = async (id: string, userId: string, payload: UpdateReviewPayload) => {
  const patient = await getPatientByUserId(userId);

  const review = await prisma.review.findUnique({
    where: { id },
  });

  if (!review) {
    throw new AppError(status.NOT_FOUND, 'Review not found');
  }

  if (review.patientId !== patient.id) {
    throw new AppError(status.FORBIDDEN, 'You can only update your own reviews');
  }

  const updated = await prisma.$transaction(async (tx) => {
    const result = await tx.review.update({
      where: { id },
      data: {
        ...(payload.rating !== undefined && { rating: payload.rating }),
        ...(payload.comment !== undefined && { comment: payload.comment }),
      },
      include: reviewInclude,
    });

    await recalculateDoctorRating(review.doctorId, tx);
    return result;
  });

  return formatReview(updated);
};

const deleteReview = async (id: string, userId: string) => {
  const patient = await getPatientByUserId(userId);

  const review = await prisma.review.findUnique({
    where: { id },
  });

  if (!review) {
    throw new AppError(status.NOT_FOUND, 'Review not found');
  }

  if (review.patientId !== patient.id) {
    throw new AppError(status.FORBIDDEN, 'You can only delete your own reviews');
  }

  await prisma.$transaction(async (tx) => {
    await tx.review.delete({ where: { id } });
    await recalculateDoctorRating(review.doctorId, tx);
  });

  return { message: 'Review deleted successfully' };
};

const updateReviewVisibility = async (id: string, isVisible: boolean) => {
  const review = await prisma.review.findUnique({
    where: { id },
  });

  if (!review) {
    throw new AppError(status.NOT_FOUND, 'Review not found');
  }

  const updated = await prisma.$transaction(async (tx) => {
    const result = await tx.review.update({
      where: { id },
      data: { isVisible },
      include: reviewInclude,
    });

    await recalculateDoctorRating(review.doctorId, tx);
    return result;
  });

  return formatReview(updated);
};

export const ReviewService = {
  createReview,
  getReviewById,
  getReviewByAppointment,
  getMyReviews,
  getAllReviews,
  updateReview,
  deleteReview,
  updateReviewVisibility,
};
