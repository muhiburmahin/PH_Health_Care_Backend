import status from 'http-status';
import { Prisma } from '../../../generated/prisma';
import { prisma } from '../../../config/prisma';
import AppError from '../../../errors/AppError';
import { getPagination, getPaginationMeta } from '../../../utils/pagination.utils';

type CreateSpecialtyPayload = {
  title: string;
  description?: string;
  icon?: string;
};

type UpdateSpecialtyPayload = {
  title?: string;
  description?: string;
  icon?: string | null;
};

const specialtySelect = {
  id: true,
  title: true,
  description: true,
  icon: true,
  isDeleted: true,
  deletedAt: true,
  createdAt: true,
  updatedAt: true,
  _count: {
    select: {
      doctorSpecialties: true,
    },
  },
} satisfies Prisma.SpecialtySelect;

const formatSpecialty = (
  specialty: Prisma.SpecialtyGetPayload<{ select: typeof specialtySelect }>
) => ({
  id: specialty.id,
  title: specialty.title,
  description: specialty.description,
  icon: specialty.icon,
  isDeleted: specialty.isDeleted,
  deletedAt: specialty.deletedAt,
  createdAt: specialty.createdAt,
  updatedAt: specialty.updatedAt,
  doctorCount: specialty._count.doctorSpecialties,
});

const findSpecialtyOrThrow = async (id: string, includeDeleted = false) => {
  const specialty = await prisma.specialty.findFirst({
    where: {
      id,
      ...(includeDeleted ? {} : { isDeleted: false }),
    },
    select: specialtySelect,
  });

  if (!specialty) {
    throw new AppError(status.NOT_FOUND, 'Specialty not found');
  }

  return specialty;
};

const createSpecialty = async (payload: CreateSpecialtyPayload) => {
  const existing = await prisma.specialty.findFirst({
    where: {
      title: { equals: payload.title, mode: 'insensitive' },
      isDeleted: false,
    },
  });

  if (existing) {
    throw new AppError(status.CONFLICT, 'Specialty with this title already exists');
  }

  const specialty = await prisma.specialty.create({
    data: {
      title: payload.title.trim(),
      description: payload.description,
      icon: payload.icon,
    },
    select: specialtySelect,
  });

  return formatSpecialty(specialty);
};

const getAllSpecialties = async (query: Record<string, unknown>) => {
  const { page, limit, skip } = getPagination({
    page: query.page as string | undefined,
    limit: query.limit as string | undefined,
  });

  const searchTerm = query.searchTerm as string | undefined;
  const includeDeleted = query.includeDeleted === 'true';

  const where: Prisma.SpecialtyWhereInput = {
    ...(includeDeleted ? {} : { isDeleted: false }),
    ...(searchTerm && {
      OR: [
        { title: { contains: searchTerm, mode: 'insensitive' } },
        { description: { contains: searchTerm, mode: 'insensitive' } },
      ],
    }),
  };

  const [specialties, total] = await Promise.all([
    prisma.specialty.findMany({
      where,
      select: specialtySelect,
      skip,
      take: limit,
      orderBy: { title: 'asc' },
    }),
    prisma.specialty.count({ where }),
  ]);

  return {
    data: specialties.map(formatSpecialty),
    meta: getPaginationMeta(total, page, limit),
  };
};

const getSpecialtyById = async (id: string) => {
  const specialty = await findSpecialtyOrThrow(id);
  return formatSpecialty(specialty);
};

const updateSpecialty = async (id: string, payload: UpdateSpecialtyPayload) => {
  await findSpecialtyOrThrow(id);

  if (payload.title) {
    const duplicate = await prisma.specialty.findFirst({
      where: {
        title: { equals: payload.title.trim(), mode: 'insensitive' },
        isDeleted: false,
        NOT: { id },
      },
    });

    if (duplicate) {
      throw new AppError(status.CONFLICT, 'Specialty with this title already exists');
    }
  }

  const specialty = await prisma.specialty.update({
    where: { id },
    data: {
      ...(payload.title && { title: payload.title.trim() }),
      ...(payload.description !== undefined && { description: payload.description }),
      ...(payload.icon !== undefined && { icon: payload.icon }),
    },
    select: specialtySelect,
  });

  return formatSpecialty(specialty);
};

const deleteSpecialty = async (id: string) => {
  await findSpecialtyOrThrow(id);

  const linkedDoctors = await prisma.doctorSpecialty.count({
    where: { specialtyId: id },
  });

  if (linkedDoctors > 0) {
    throw new AppError(
      status.CONFLICT,
      'Cannot delete specialty assigned to doctors. Remove doctor assignments first.'
    );
  }

  await prisma.specialty.update({
    where: { id },
    data: {
      isDeleted: true,
      deletedAt: new Date(),
    },
  });

  return { message: 'Specialty deleted successfully' };
};

export const SpecialtyService = {
  createSpecialty,
  getAllSpecialties,
  getSpecialtyById,
  updateSpecialty,
  deleteSpecialty,
};
