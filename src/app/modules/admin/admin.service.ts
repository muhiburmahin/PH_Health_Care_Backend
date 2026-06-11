import { randomUUID } from 'crypto';
import status from 'http-status';
import { Prisma, Role, UserStatus } from '../../../generated/prisma';
import { prisma } from '../../../config/prisma';
import AppError from '../../../errors/AppError';
import { AUTH } from '../../../constants';
import { bcryptUtils } from '../../../utils/bcrypt.utils';
import { getPagination, getPaginationMeta } from '../../../utils/pagination.utils';

type CreateAdminPayload = {
  name: string;
  email: string;
  password: string;
  contactNumber?: string;
  bio?: string;
  profilePhoto?: string;
  role?: Role.ADMIN | Role.SUPER_ADMIN;
};

type UpdateAdminPayload = {
  name?: string;
  contactNumber?: string;
  bio?: string;
  profilePhoto?: string;
};

const adminInclude = {
  user: {
    select: {
      id: true,
      role: true,
      status: true,
      emailVerified: true,
      lastLoginAt: true,
      createdAt: true,
    },
  },
} satisfies Prisma.AdminInclude;

const formatAdmin = (admin: Prisma.AdminGetPayload<{ include: typeof adminInclude }>) => ({
  id: admin.id,
  name: admin.name,
  email: admin.email,
  profilePhoto: admin.profilePhoto,
  contactNumber: admin.contactNumber,
  bio: admin.bio,
  isDeleted: admin.isDeleted,
  createdAt: admin.createdAt,
  updatedAt: admin.updatedAt,
  user: admin.user,
});

const createAdminAccount = async (payload: CreateAdminPayload) => {
  const email = payload.email.toLowerCase();
  const role = payload.role ?? Role.ADMIN;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw new AppError(status.CONFLICT, 'User with this email already exists');
  }

  const hashedPassword = await bcryptUtils.hashPassword(payload.password);

  const admin = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        id: randomUUID(),
        name: payload.name,
        email,
        role,
        status: UserStatus.ACTIVE,
        emailVerified: true,
        needPasswordChange: false,
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

    return tx.admin.create({
      data: {
        id: randomUUID(),
        userId: user.id,
        name: payload.name,
        email,
        contactNumber: payload.contactNumber,
        bio: payload.bio,
        profilePhoto: payload.profilePhoto,
      },
      include: adminInclude,
    });
  });

  return formatAdmin(admin);
};

const bootstrapSuperAdmin = async (payload: CreateAdminPayload) => {
  const superAdminExists = await prisma.user.findFirst({
    where: { role: Role.SUPER_ADMIN, isDeleted: false },
  });

  if (superAdminExists) {
    throw new AppError(status.FORBIDDEN, 'Super admin already exists');
  }

  return createAdminAccount({ ...payload, role: Role.SUPER_ADMIN });
};

const createAdmin = async (payload: CreateAdminPayload) => {
  return createAdminAccount({ ...payload, role: Role.ADMIN });
};

const getAllAdmins = async (query: Record<string, unknown>) => {
  const { page, limit, skip } = getPagination({
    page: query.page as string,
    limit: query.limit as string,
  });
  const searchTerm = query.searchTerm as string | undefined;

  const where: Prisma.AdminWhereInput = { isDeleted: false };

  if (searchTerm) {
    where.OR = [
      { name: { contains: searchTerm, mode: 'insensitive' } },
      { email: { contains: searchTerm, mode: 'insensitive' } },
      { contactNumber: { contains: searchTerm, mode: 'insensitive' } },
    ];
  }

  const [admins, total] = await Promise.all([
    prisma.admin.findMany({
      where,
      skip,
      take: limit,
      include: adminInclude,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.admin.count({ where }),
  ]);

  return {
    data: admins.map(formatAdmin),
    meta: getPaginationMeta(total, page, limit),
  };
};

const getAdminById = async (id: string) => {
  const admin = await prisma.admin.findFirst({
    where: { id, isDeleted: false },
    include: adminInclude,
  });

  if (!admin) throw new AppError(status.NOT_FOUND, 'Admin not found');
  return formatAdmin(admin);
};

const getAdminByUserId = async (userId: string) => {
  const admin = await prisma.admin.findFirst({
    where: { userId, isDeleted: false },
    include: adminInclude,
  });

  if (!admin) throw new AppError(status.NOT_FOUND, 'Admin profile not found');
  return formatAdmin(admin);
};

const updateAdmin = async (id: string, payload: UpdateAdminPayload, requesterUserId: string, requesterRole: Role) => {
  const admin = await prisma.admin.findFirst({
    where: { id, isDeleted: false },
    include: { user: true },
  });

  if (!admin) throw new AppError(status.NOT_FOUND, 'Admin not found');

  const isSelf = admin.userId === requesterUserId;
  const isSuperAdmin = requesterRole === Role.SUPER_ADMIN;

  if (!isSelf && !isSuperAdmin) {
    throw new AppError(status.FORBIDDEN, 'You can only update your own profile');
  }

  if (admin.user.role === Role.SUPER_ADMIN && !isSelf && !isSuperAdmin) {
    throw new AppError(status.FORBIDDEN, 'Cannot update super admin');
  }

  const updated = await prisma.$transaction(async (tx) => {
    if (payload.name) {
      await tx.user.update({
        where: { id: admin.userId },
        data: { name: payload.name },
      });
    }

    return tx.admin.update({
      where: { id },
      data: payload,
      include: adminInclude,
    });
  });

  return formatAdmin(updated);
};

const deleteAdmin = async (id: string, requesterUserId: string) => {
  const admin = await prisma.admin.findFirst({
    where: { id, isDeleted: false },
    include: { user: true },
  });

  if (!admin) throw new AppError(status.NOT_FOUND, 'Admin not found');

  if (admin.user.role === Role.SUPER_ADMIN) {
    throw new AppError(status.FORBIDDEN, 'Cannot delete super admin');
  }

  if (admin.userId === requesterUserId) {
    throw new AppError(status.BAD_REQUEST, 'You cannot delete your own account');
  }

  await prisma.$transaction(async (tx) => {
    await tx.admin.update({
      where: { id },
      data: { isDeleted: true, deletedAt: new Date() },
    });

    await tx.user.update({
      where: { id: admin.userId },
      data: { isDeleted: true, deletedAt: new Date(), status: UserStatus.DELETED },
    });

    await tx.session.updateMany({
      where: { userId: admin.userId, isActive: true },
      data: { isActive: false },
    });
  });

  return { message: 'Admin deleted successfully' };
};

const getDashboardStats = async () => {
  const [
    totalPatients,
    totalDoctors,
    totalAdmins,
    totalAppointments,
    scheduledAppointments,
    completedAppointments,
    totalSpecialties,
    blockedUsers,
  ] = await Promise.all([
    prisma.patient.count({ where: { isDeleted: false } }),
    prisma.doctor.count({ where: { isDeleted: false } }),
    prisma.admin.count({ where: { isDeleted: false } }),
    prisma.appointment.count(),
    prisma.appointment.count({ where: { status: 'SCHEDULED' } }),
    prisma.appointment.count({ where: { status: 'COMPLETED' } }),
    prisma.specialty.count({ where: { isDeleted: false } }),
    prisma.user.count({ where: { status: UserStatus.BLOCKED, isDeleted: false } }),
  ]);

  return {
    totalPatients,
    totalDoctors,
    totalAdmins,
    totalAppointments,
    scheduledAppointments,
    completedAppointments,
    totalSpecialties,
    blockedUsers,
  };
};

const getAllUsers = async (query: Record<string, unknown>) => {
  const { page, limit, skip } = getPagination({
    page: query.page as string,
    limit: query.limit as string,
  });
  const searchTerm = query.searchTerm as string | undefined;
  const role = query.role as Role | undefined;
  const userStatusFilter = query.status as UserStatus | undefined;

  const where: Prisma.UserWhereInput = { isDeleted: false };

  if (role) where.role = role;
  if (userStatusFilter) where.status = userStatusFilter;

  if (searchTerm) {
    where.OR = [
      { name: { contains: searchTerm, mode: 'insensitive' } },
      { email: { contains: searchTerm, mode: 'insensitive' } },
      { phone: { contains: searchTerm, mode: 'insensitive' } },
    ];
  }

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      skip,
      take: limit,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        status: true,
        emailVerified: true,
        lastLoginAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.user.count({ where }),
  ]);

  return {
    data: users,
    meta: getPaginationMeta(total, page, limit),
  };
};

const updateUserStatus = async (userId: string, newStatus: UserStatus, requesterRole: Role) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });

  if (!user || user.isDeleted) {
    throw new AppError(status.NOT_FOUND, 'User not found');
  }

  if (user.role === Role.SUPER_ADMIN) {
    throw new AppError(status.FORBIDDEN, 'Cannot modify super admin status');
  }

  if (user.role === Role.ADMIN && requesterRole !== Role.SUPER_ADMIN) {
    throw new AppError(status.FORBIDDEN, 'Only super admin can modify admin status');
  }

  const updated = await prisma.$transaction(async (tx) => {
    const result = await tx.user.update({
      where: { id: userId },
      data: {
        status: newStatus,
        ...(newStatus === UserStatus.DELETED && {
          isDeleted: true,
          deletedAt: new Date(),
        }),
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        isDeleted: true,
      },
    });

    if (newStatus === UserStatus.BLOCKED || newStatus === UserStatus.DELETED) {
      await tx.session.updateMany({
        where: { userId, isActive: true },
        data: { isActive: false },
      });
    }

    return result;
  });

  return updated;
};

export const AdminService = {
  bootstrapSuperAdmin,
  createAdmin,
  getAllAdmins,
  getAdminById,
  getAdminByUserId,
  updateAdmin,
  deleteAdmin,
  getDashboardStats,
  getAllUsers,
  updateUserStatus,
};
