import { randomUUID } from 'crypto';
import status from 'http-status';
import { Gender, Prisma, Role, UserStatus } from '../../../generated/prisma';
import { prisma } from '../../../config/prisma';
import AppError from '../../../errors/AppError';
import { getPagination, getPaginationMeta } from '../../../utils/pagination.utils';

type UpdateDoctorPayload = {
  name?: string;
  profilePhoto?: string;
  contactNumber?: string;
  address?: string;
  bio?: string;
  experience?: number;
  gender?: Gender;
  appointmentFee?: number;
  qualification?: string;
  currentWorkingPlace?: string;
  designation?: string;
  isAvailable?: boolean;
  specialties?: string[];
};

const doctorInclude = {
  user: {
    select: {
      id: true,
      email: true,
      role: true,
      status: true,
      emailVerified: true,
      lastLoginAt: true,
    },
  },
  specialties: {
    include: {
      specialty: {
        select: { id: true, title: true, description: true, icon: true },
      },
    },
  },
  doctorSchedules: {
    where: { isBooked: false },
    include: {
      schedule: {
        select: { id: true, startTime: true, endTime: true },
      },
    },
    orderBy: { schedule: { startTime: 'asc' as const } },
    take: 10,
  },
  _count: {
    select: {
      appointments: true,
      reviews: true,
      prescriptions: true,
    },
  },
} satisfies Prisma.DoctorInclude;

type DoctorWithRelations = Prisma.DoctorGetPayload<{ include: typeof doctorInclude }>;

const formatDoctor = (doctor: DoctorWithRelations) => ({
  id: doctor.id,
  name: doctor.name,
  email: doctor.email,
  profilePhoto: doctor.profilePhoto,
  contactNumber: doctor.contactNumber,
  address: doctor.address,
  bio: doctor.bio,
  registrationNumber: doctor.registrationNumber,
  experience: doctor.experience,
  gender: doctor.gender,
  appointmentFee: doctor.appointmentFee,
  qualification: doctor.qualification,
  currentWorkingPlace: doctor.currentWorkingPlace,
  designation: doctor.designation,
  averageRating: doctor.averageRating,
  totalReviews: doctor.totalReviews,
  isAvailable: doctor.isAvailable,
  createdAt: doctor.createdAt,
  updatedAt: doctor.updatedAt,
  user: doctor.user,
  specialties: doctor.specialties.map((s) => s.specialty),
  upcomingSchedules: doctor.doctorSchedules.map((ds) => ({
    scheduleId: ds.scheduleId,
    isBooked: ds.isBooked,
    ...ds.schedule,
  })),
  stats: doctor._count,
});

const getAllDoctors = async (query: Record<string, unknown>) => {
  const { page, limit, skip } = getPagination({
    page: query.page as string,
    limit: query.limit as string,
  });

  const searchTerm = query.searchTerm as string | undefined;
  const specialty = query.specialty as string | undefined;
  const gender = query.gender as Gender | undefined;
  const isAvailable = query.isAvailable as string | undefined;
  const minFee = query.minFee ? Number(query.minFee) : undefined;
  const maxFee = query.maxFee ? Number(query.maxFee) : undefined;
  const sortBy = (query.sortBy as string) || 'createdAt';
  const sortOrder = (query.sortOrder as 'asc' | 'desc') || 'desc';

  const andConditions: Prisma.DoctorWhereInput[] = [{ isDeleted: false }];

  if (searchTerm) {
    andConditions.push({
      OR: [
        { name: { contains: searchTerm, mode: 'insensitive' } },
        { email: { contains: searchTerm, mode: 'insensitive' } },
        { qualification: { contains: searchTerm, mode: 'insensitive' } },
        { currentWorkingPlace: { contains: searchTerm, mode: 'insensitive' } },
        { designation: { contains: searchTerm, mode: 'insensitive' } },
      ],
    });
  }

  if (specialty) {
    andConditions.push({
      specialties: {
        some: {
          specialty: {
            OR: [
              { id: specialty },
              { title: { contains: specialty, mode: 'insensitive' } },
            ],
            isDeleted: false,
          },
        },
      },
    });
  }

  if (gender) andConditions.push({ gender });
  if (isAvailable !== undefined) andConditions.push({ isAvailable: isAvailable === 'true' });

  if (minFee !== undefined || maxFee !== undefined) {
    andConditions.push({
      appointmentFee: {
        ...(minFee !== undefined && { gte: minFee }),
        ...(maxFee !== undefined && { lte: maxFee }),
      },
    });
  }

  const where: Prisma.DoctorWhereInput = { AND: andConditions };

  const orderBy: Prisma.DoctorOrderByWithRelationInput = {
    [sortBy]: sortOrder,
  };

  const [doctors, total] = await Promise.all([
    prisma.doctor.findMany({
      where,
      skip,
      take: limit,
      include: {
        user: doctorInclude.user,
        specialties: doctorInclude.specialties,
        _count: { select: { reviews: true, appointments: true } },
      },
      orderBy,
    }),
    prisma.doctor.count({ where }),
  ]);

  return {
    data: doctors.map((d) => ({
      id: d.id,
      name: d.name,
      email: d.email,
      profilePhoto: d.profilePhoto,
      contactNumber: d.contactNumber,
      experience: d.experience,
      gender: d.gender,
      appointmentFee: d.appointmentFee,
      qualification: d.qualification,
      designation: d.designation,
      currentWorkingPlace: d.currentWorkingPlace,
      averageRating: d.averageRating,
      totalReviews: d.totalReviews,
      isAvailable: d.isAvailable,
      specialties: d.specialties.map((s) => s.specialty),
      stats: d._count,
    })),
    meta: getPaginationMeta(total, page, limit),
  };
};

const getDoctorById = async (id: string) => {
  const doctor = await prisma.doctor.findFirst({
    where: { id, isDeleted: false },
    include: doctorInclude,
  });

  if (!doctor) throw new AppError(status.NOT_FOUND, 'Doctor not found');
  return formatDoctor(doctor);
};

const getDoctorByUserId = async (userId: string) => {
  const doctor = await prisma.doctor.findFirst({
    where: { userId, isDeleted: false },
    include: doctorInclude,
  });

  if (!doctor) throw new AppError(status.NOT_FOUND, 'Doctor profile not found');
  return formatDoctor(doctor);
};

const updateSpecialties = async (doctorId: string, specialtyIds: string[]) => {
  for (const specialtyId of specialtyIds) {
    const specialty = await prisma.specialty.findFirst({
      where: { id: specialtyId, isDeleted: false },
    });
    if (!specialty) {
      throw new AppError(status.NOT_FOUND, `Specialty with id ${specialtyId} not found`);
    }
  }

  await prisma.$transaction(async (tx) => {
    await tx.doctorSpecialty.deleteMany({ where: { doctorId } });
    await tx.doctorSpecialty.createMany({
      data: specialtyIds.map((specialtyId) => ({
        id: randomUUID(),
        doctorId,
        specialtyId,
      })),
    });
  });
};

const updateDoctor = async (
  id: string,
  payload: UpdateDoctorPayload,
  requesterUserId: string,
  requesterRole: Role
) => {
  const doctor = await prisma.doctor.findFirst({
    where: { id, isDeleted: false },
  });

  if (!doctor) throw new AppError(status.NOT_FOUND, 'Doctor not found');

  const isSelf = doctor.userId === requesterUserId;
  const isAdmin = requesterRole === Role.ADMIN || requesterRole === Role.SUPER_ADMIN;

  if (!isSelf && !isAdmin) {
    throw new AppError(status.FORBIDDEN, 'You do not have permission to update this doctor');
  }

  const { specialties, name, ...doctorData } = payload;

  if (specialties?.length) {
    if (!isSelf && !isAdmin) {
      throw new AppError(status.FORBIDDEN, 'Cannot update specialties');
    }
    await updateSpecialties(id, specialties);
  }

  await prisma.$transaction(async (tx) => {
    if (name) {
      await tx.user.update({
        where: { id: doctor.userId },
        data: { name },
      });
    }

    await tx.doctor.update({
      where: { id },
      data: { ...doctorData, ...(name && { name }) },
    });
  });

  return getDoctorById(id);
};

const updateAvailability = async (userId: string, isAvailable: boolean) => {
  const doctor = await prisma.doctor.findFirst({
    where: { userId, isDeleted: false },
  });

  if (!doctor) throw new AppError(status.NOT_FOUND, 'Doctor profile not found');

  await prisma.doctor.update({
    where: { id: doctor.id },
    data: { isAvailable },
  });

  return getDoctorById(doctor.id);
};

const deleteDoctor = async (id: string) => {
  const doctor = await prisma.doctor.findFirst({
    where: { id, isDeleted: false },
  });

  if (!doctor) throw new AppError(status.NOT_FOUND, 'Doctor not found');

  await prisma.$transaction(async (tx) => {
    await tx.doctor.update({
      where: { id },
      data: { isDeleted: true, deletedAt: new Date(), isAvailable: false },
    });

    await tx.user.update({
      where: { id: doctor.userId },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
        status: UserStatus.DELETED,
      },
    });

    await tx.session.updateMany({
      where: { userId: doctor.userId, isActive: true },
      data: { isActive: false },
    });
  });

  return { message: 'Doctor deleted successfully' };
};

const getDoctorReviews = async (doctorId: string, query: Record<string, unknown>) => {
  const doctor = await prisma.doctor.findFirst({
    where: { id: doctorId, isDeleted: false },
  });

  if (!doctor) throw new AppError(status.NOT_FOUND, 'Doctor not found');

  const { page, limit, skip } = getPagination({
    page: query.page as string,
    limit: query.limit as string,
  });

  const where = { doctorId, isVisible: true };

  const [reviews, total] = await Promise.all([
    prisma.review.findMany({
      where,
      skip,
      take: limit,
      include: {
        patient: {
          select: { id: true, name: true, profilePhoto: true },
        },
        appointment: {
          select: { id: true, createdAt: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.review.count({ where }),
  ]);

  return {
    data: reviews,
    meta: getPaginationMeta(total, page, limit),
    averageRating: doctor.averageRating,
    totalReviews: doctor.totalReviews,
  };
};

export const DoctorService = {
  getAllDoctors,
  getDoctorById,
  getDoctorByUserId,
  updateDoctor,
  updateAvailability,
  deleteDoctor,
  getDoctorReviews,
};
