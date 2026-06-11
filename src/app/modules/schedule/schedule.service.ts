import status from 'http-status';
import { Prisma } from '../../../generated/prisma';
import { prisma } from '../../../config/prisma';
import AppError from '../../../errors/AppError';
import { getPagination, getPaginationMeta } from '../../../utils/pagination.utils';

type SlotPayload = {
  startTime: string;
  endTime: string;
};

type UpdateSchedulePayload = {
  startTime?: string;
  endTime?: string;
};

const formatSchedule = (doctorSchedule: {
  doctorId: string;
  scheduleId: string;
  isBooked: boolean;
  createdAt: Date;
  updatedAt: Date;
  schedule: { id: string; startTime: Date; endTime: Date };
}) => ({
  doctorId: doctorSchedule.doctorId,
  scheduleId: doctorSchedule.scheduleId,
  isBooked: doctorSchedule.isBooked,
  startTime: doctorSchedule.schedule.startTime,
  endTime: doctorSchedule.schedule.endTime,
  createdAt: doctorSchedule.createdAt,
  updatedAt: doctorSchedule.updatedAt,
});

const getDoctorByUserId = async (userId: string) => {
  const doctor = await prisma.doctor.findFirst({
    where: { userId, isDeleted: false },
  });

  if (!doctor) {
    throw new AppError(status.NOT_FOUND, 'Doctor profile not found');
  }

  return doctor;
};

const getDoctorScheduleOrThrow = async (doctorId: string, scheduleId: string) => {
  const doctorSchedule = await prisma.doctorSchedule.findUnique({
    where: {
      doctorId_scheduleId: { doctorId, scheduleId },
    },
    include: {
      schedule: true,
    },
  });

  if (!doctorSchedule) {
    throw new AppError(status.NOT_FOUND, 'Schedule slot not found');
  }

  return doctorSchedule;
};

const assertSlotInFuture = (startTime: Date) => {
  if (startTime <= new Date()) {
    throw new AppError(status.BAD_REQUEST, 'Schedule slot must be in the future');
  }
};

const assertNoOverlap = async (
  doctorId: string,
  startTime: Date,
  endTime: Date,
  excludeScheduleId?: string
) => {
  const overlapping = await prisma.doctorSchedule.findFirst({
    where: {
      doctorId,
      ...(excludeScheduleId && { scheduleId: { not: excludeScheduleId } }),
      schedule: {
        startTime: { lt: endTime },
        endTime: { gt: startTime },
      },
    },
    include: { schedule: { select: { startTime: true, endTime: true } } },
  });

  if (overlapping) {
    throw new AppError(
      status.CONFLICT,
      'This slot overlaps with an existing schedule'
    );
  }
};

const createSchedules = async (userId: string, slots: SlotPayload[]) => {
  const doctor = await getDoctorByUserId(userId);

  if (!doctor.isAvailable) {
    throw new AppError(status.BAD_REQUEST, 'Doctor is not available for scheduling');
  }

  const parsedSlots = slots.map((slot) => {
    const startTime = new Date(slot.startTime);
    const endTime = new Date(slot.endTime);

    if (endTime <= startTime) {
      throw new AppError(status.BAD_REQUEST, 'End time must be after start time');
    }

    assertSlotInFuture(startTime);
    return { startTime, endTime };
  });

  for (const slot of parsedSlots) {
    await assertNoOverlap(doctor.id, slot.startTime, slot.endTime);
  }

  for (let i = 0; i < parsedSlots.length; i++) {
    for (let j = i + 1; j < parsedSlots.length; j++) {
      const a = parsedSlots[i];
      const b = parsedSlots[j];
      if (a.startTime < b.endTime && b.startTime < a.endTime) {
        throw new AppError(status.BAD_REQUEST, 'Submitted slots overlap with each other');
      }
    }
  }

  const created = await prisma.$transaction(
    parsedSlots.map((slot) =>
      prisma.schedule.create({
        data: {
          startTime: slot.startTime,
          endTime: slot.endTime,
          doctorSchedules: {
            create: {
              doctorId: doctor.id,
            },
          },
        },
        include: {
          doctorSchedules: {
            where: { doctorId: doctor.id },
            include: { schedule: true },
          },
        },
      })
    )
  );

  return created.flatMap((schedule) => schedule.doctorSchedules.map(formatSchedule));
};

const getMySchedules = async (userId: string, query: Record<string, unknown>) => {
  const doctor = await getDoctorByUserId(userId);
  const { page, limit, skip } = getPagination({
    page: query.page as string | undefined,
    limit: query.limit as string | undefined,
  });

  const isBooked = query.isBooked as string | undefined;
  const fromDate = query.fromDate ? new Date(query.fromDate as string) : undefined;
  const toDate = query.toDate ? new Date(query.toDate as string) : undefined;

  const scheduleFilter: Prisma.ScheduleWhereInput = {
    ...(fromDate && { startTime: { gte: fromDate } }),
    ...(toDate && { endTime: { lte: toDate } }),
  };

  const where: Prisma.DoctorScheduleWhereInput = {
    doctorId: doctor.id,
    ...(isBooked !== undefined && { isBooked: isBooked === 'true' }),
    ...(Object.keys(scheduleFilter).length > 0 && { schedule: scheduleFilter }),
  };

  const [schedules, total] = await Promise.all([
    prisma.doctorSchedule.findMany({
      where,
      skip,
      take: limit,
      include: { schedule: true },
      orderBy: { schedule: { startTime: 'asc' } },
    }),
    prisma.doctorSchedule.count({ where }),
  ]);

  return {
    data: schedules.map(formatSchedule),
    meta: getPaginationMeta(total, page, limit),
  };
};

const getDoctorAvailableSchedules = async (
  doctorId: string,
  query: Record<string, unknown>
) => {
  const doctor = await prisma.doctor.findFirst({
    where: { id: doctorId, isDeleted: false, isAvailable: true },
  });

  if (!doctor) {
    throw new AppError(status.NOT_FOUND, 'Doctor not found or not available');
  }

  const { page, limit, skip } = getPagination({
    page: query.page as string | undefined,
    limit: query.limit as string | undefined,
  });

  const fromDate = query.fromDate ? new Date(query.fromDate as string) : new Date();
  const toDate = query.toDate ? new Date(query.toDate as string) : undefined;

  const where: Prisma.DoctorScheduleWhereInput = {
    doctorId,
    isBooked: false,
    schedule: {
      startTime: { gte: fromDate },
      ...(toDate && { endTime: { lte: toDate } }),
    },
  };

  const [schedules, total] = await Promise.all([
    prisma.doctorSchedule.findMany({
      where,
      skip,
      take: limit,
      include: { schedule: true },
      orderBy: { schedule: { startTime: 'asc' } },
    }),
    prisma.doctorSchedule.count({ where }),
  ]);

  return {
    data: schedules.map(formatSchedule),
    meta: getPaginationMeta(total, page, limit),
  };
};

const updateSchedule = async (
  userId: string,
  scheduleId: string,
  payload: UpdateSchedulePayload
) => {
  const doctor = await getDoctorByUserId(userId);
  const doctorSchedule = await getDoctorScheduleOrThrow(doctor.id, scheduleId);

  if (doctorSchedule.isBooked) {
    throw new AppError(status.CONFLICT, 'Cannot update a booked schedule slot');
  }

  const appointment = await prisma.appointment.findFirst({
    where: { scheduleId, doctorId: doctor.id },
  });

  if (appointment) {
    throw new AppError(status.CONFLICT, 'Cannot update a schedule with an existing appointment');
  }

  const startTime = payload.startTime
    ? new Date(payload.startTime)
    : doctorSchedule.schedule.startTime;
  const endTime = payload.endTime
    ? new Date(payload.endTime)
    : doctorSchedule.schedule.endTime;

  if (endTime <= startTime) {
    throw new AppError(status.BAD_REQUEST, 'End time must be after start time');
  }

  assertSlotInFuture(startTime);
  await assertNoOverlap(doctor.id, startTime, endTime, scheduleId);

  const updated = await prisma.schedule.update({
    where: { id: scheduleId },
    data: { startTime, endTime },
    include: {
      doctorSchedules: {
        where: { doctorId: doctor.id },
      },
    },
  });

  const ds = updated.doctorSchedules[0];
  return formatSchedule({
    ...ds,
    schedule: updated,
  });
};

const deleteSchedule = async (userId: string, scheduleId: string) => {
  const doctor = await getDoctorByUserId(userId);
  const doctorSchedule = await getDoctorScheduleOrThrow(doctor.id, scheduleId);

  if (doctorSchedule.isBooked) {
    throw new AppError(status.CONFLICT, 'Cannot delete a booked schedule slot');
  }

  const appointment = await prisma.appointment.findFirst({
    where: { scheduleId, doctorId: doctor.id },
  });

  if (appointment) {
    throw new AppError(status.CONFLICT, 'Cannot delete a schedule with an existing appointment');
  }

  await prisma.$transaction(async (tx) => {
    await tx.doctorSchedule.delete({
      where: {
        doctorId_scheduleId: { doctorId: doctor.id, scheduleId },
      },
    });

    const remainingLinks = await tx.doctorSchedule.count({
      where: { scheduleId },
    });

    if (remainingLinks === 0) {
      await tx.schedule.delete({ where: { id: scheduleId } });
    }
  });

  return { message: 'Schedule slot deleted successfully' };
};

export const ScheduleService = {
  createSchedules,
  getMySchedules,
  getDoctorAvailableSchedules,
  updateSchedule,
  deleteSchedule,
};
