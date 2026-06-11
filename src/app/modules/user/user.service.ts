import { randomUUID } from 'crypto';
import status from 'http-status';
import { Gender, Prisma, Role, UserStatus } from '../../../generated/prisma';
import { prisma } from '../../../config/prisma';
import AppError from '../../../errors/AppError';
import { AUTH } from '../../../constants';
import { bcryptUtils } from '../../../utils/bcrypt.utils';

type UpdateProfilePayload = {
  name?: string;
  phone?: string;
  image?: string;
  profilePhoto?: string;
  contactNumber?: string;
  address?: string;
  bio?: string;
};

type CreateDoctorPayload = {
  password: string;
  specialties: string[];
  doctor: {
    name: string;
    email: string;
    registrationNumber: string;
    experience: number;
    gender: Gender;
    appointmentFee: number;
    qualification: string;
    designation: string;
    currentWorkingPlace: string;
    profilePhoto?: string;
    contactNumber?: string;
    address?: string;
    bio?: string;
  };
};

const userSelect = {
  id: true,
  name: true,
  email: true,
  phone: true,
  role: true,
  status: true,
  emailVerified: true,
  image: true,
  needPasswordChange: true,
  lastLoginAt: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.UserSelect;

const getUserWithProfile = async (userId: string) => {
  const user = await prisma.user.findFirst({
    where: { id: userId, isDeleted: false },
    select: {
      ...userSelect,
      patient: {
        select: {
          id: true,
          profilePhoto: true,
          contactNumber: true,
          address: true,
          isDeleted: true,
          createdAt: true,
        },
      },
      doctor: {
        select: {
          id: true,
          profilePhoto: true,
          contactNumber: true,
          address: true,
          bio: true,
          registrationNumber: true,
          experience: true,
          gender: true,
          appointmentFee: true,
          qualification: true,
          designation: true,
          currentWorkingPlace: true,
          averageRating: true,
          totalReviews: true,
          isAvailable: true,
          isDeleted: true,
          specialties: {
            select: {
              specialty: { select: { id: true, title: true, icon: true } },
            },
          },
        },
      },
      admin: {
        select: {
          id: true,
          profilePhoto: true,
          contactNumber: true,
          bio: true,
          isDeleted: true,
        },
      },
    },
  });

  if (!user) throw new AppError(status.NOT_FOUND, 'User not found');

  const stripDeleted = <T extends { isDeleted?: boolean } | null>(record: T) => {
    if (!record || record.isDeleted) return null;
    const { isDeleted: _, ...rest } = record;
    return rest;
  };

  return {
    ...user,
    patient: stripDeleted(user.patient),
    doctor: stripDeleted(user.doctor),
    admin: stripDeleted(user.admin),
  };
};

const getMe = async (userId: string) => getUserWithProfile(userId);

const getUserById = async (targetUserId: string, requesterId: string, requesterRole: Role) => {
  const isSelf = targetUserId === requesterId;
  const isAdmin = requesterRole === Role.ADMIN || requesterRole === Role.SUPER_ADMIN;

  if (!isSelf && !isAdmin) {
    throw new AppError(status.FORBIDDEN, 'You do not have permission to view this profile');
  }

  return getUserWithProfile(targetUserId);
};

const updateProfile = async (userId: string, payload: UpdateProfilePayload) => {
  const user = await prisma.user.findFirst({
    where: { id: userId, isDeleted: false },
    include: { patient: true, doctor: true, admin: true },
  });

  if (!user) throw new AppError(status.NOT_FOUND, 'User not found');

  const { name, phone, image, profilePhoto, contactNumber, address, bio } = payload;

  return prisma.$transaction(async (tx) => {
    const updatedUser = await tx.user.update({
      where: { id: userId },
      data: {
        ...(name && { name }),
        ...(phone && { phone }),
        ...(image && { image }),
      },
      select: userSelect,
    });

    if (user.role === Role.PATIENT && user.patient) {
      await tx.patient.update({
        where: { id: user.patient.id },
        data: {
          ...(name && { name }),
          ...(profilePhoto && { profilePhoto }),
          ...(contactNumber && { contactNumber }),
          ...(address !== undefined && { address }),
        },
      });
    }

    if (user.role === Role.DOCTOR && user.doctor) {
      await tx.doctor.update({
        where: { id: user.doctor.id },
        data: {
          ...(name && { name }),
          ...(profilePhoto && { profilePhoto }),
          ...(contactNumber && { contactNumber }),
          ...(address !== undefined && { address }),
          ...(bio !== undefined && { bio }),
        },
      });
    }

    if ((user.role === Role.ADMIN || user.role === Role.SUPER_ADMIN) && user.admin) {
      await tx.admin.update({
        where: { id: user.admin.id },
        data: {
          ...(name && { name }),
          ...(profilePhoto && { profilePhoto }),
          ...(contactNumber && { contactNumber }),
          ...(bio !== undefined && { bio }),
        },
      });
    }

    return getUserWithProfile(userId);
  });
};

const changePassword = async (userId: string, currentPassword: string, newPassword: string) => {
  const user = await prisma.user.findFirst({
    where: { id: userId, isDeleted: false },
  });

  if (!user) throw new AppError(status.NOT_FOUND, 'User not found');

  const account = await prisma.account.findFirst({
    where: {
      userId,
      providerId: AUTH.CREDENTIALS_PROVIDER,
    },
  });

  if (!account?.password) {
    throw new AppError(status.BAD_REQUEST, 'Password account not found');
  }

  const isValid = await bcryptUtils.comparePassword(currentPassword, account.password);
  if (!isValid) {
    throw new AppError(status.UNAUTHORIZED, 'Current password is incorrect');
  }

  const hashedPassword = await bcryptUtils.hashPassword(newPassword);

  await prisma.$transaction(async (tx) => {
    await tx.account.update({
      where: { id: account.id },
      data: { password: hashedPassword },
    });

    await tx.user.update({
      where: { id: userId },
      data: { needPasswordChange: false },
    });

    await tx.session.updateMany({
      where: { userId, isActive: true },
      data: { isActive: false },
    });
  });

  return { message: 'Password changed successfully. Please login again.' };
};

const deleteMyAccount = async (userId: string) => {
  const user = await prisma.user.findFirst({
    where: { id: userId, isDeleted: false },
  });

  if (!user) throw new AppError(status.NOT_FOUND, 'User not found');

  if (user.role === Role.SUPER_ADMIN) {
    throw new AppError(status.FORBIDDEN, 'Super admin account cannot be deleted');
  }

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: userId },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
        status: UserStatus.DELETED,
      },
    });

    await tx.session.updateMany({
      where: { userId, isActive: true },
      data: { isActive: false },
    });

    if (user.role === Role.PATIENT) {
      await tx.patient.updateMany({
        where: { userId },
        data: { isDeleted: true, deletedAt: new Date() },
      });
    }

    if (user.role === Role.DOCTOR) {
      await tx.doctor.updateMany({
        where: { userId },
        data: { isDeleted: true, deletedAt: new Date() },
      });
    }

    if (user.role === Role.ADMIN) {
      await tx.admin.updateMany({
        where: { userId },
        data: { isDeleted: true, deletedAt: new Date() },
      });
    }
  });

  return { message: 'Account deleted successfully' };
};

const createDoctor = async (payload: CreateDoctorPayload) => {
  const email = payload.doctor.email.toLowerCase();

  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    throw new AppError(status.CONFLICT, 'User with this email already exists');
  }

  const existingDoctor = await prisma.doctor.findUnique({
    where: { registrationNumber: payload.doctor.registrationNumber },
  });
  if (existingDoctor) {
    throw new AppError(status.CONFLICT, 'Doctor with this registration number already exists');
  }

  for (const specialtyId of payload.specialties) {
    const specialty = await prisma.specialty.findFirst({
      where: { id: specialtyId, isDeleted: false },
    });
    if (!specialty) {
      throw new AppError(status.NOT_FOUND, `Specialty with id ${specialtyId} not found`);
    }
  }

  const hashedPassword = await bcryptUtils.hashPassword(payload.password);

  const doctor = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        id: randomUUID(),
        name: payload.doctor.name,
        email,
        role: Role.DOCTOR,
        status: UserStatus.ACTIVE,
        emailVerified: true,
        needPasswordChange: true,
        accounts: {
          create: {
            id: randomUUID(),
            accountId: email,
            providerId: AUTH.CREDENTIALS_PROVIDER,
            password: hashedPassword,
          },
        },
      },
    });

    const doctorRecord = await tx.doctor.create({
      data: {
        id: randomUUID(),
        userId: user.id,
        ...payload.doctor,
        email,
      },
    });

    await tx.doctorSpecialty.createMany({
      data: payload.specialties.map((specialtyId) => ({
        id: randomUUID(),
        doctorId: doctorRecord.id,
        specialtyId,
      })),
    });

    return tx.doctor.findUnique({
      where: { id: doctorRecord.id },
      include: {
        user: { select: userSelect },
        specialties: {
          include: { specialty: { select: { id: true, title: true, icon: true } } },
        },
      },
    });
  });

  return doctor;
};

export const UserService = {
  getMe,
  getUserById,
  updateProfile,
  changePassword,
  deleteMyAccount,
  createDoctor,
};
