import status from 'http-status';
import { NotificationType, Prisma, Role } from '../../../generated/prisma';
import { prisma } from '../../../config/prisma';
import AppError from '../../../errors/AppError';
import { createNotification } from '../../../utils/notification.utils';
import { getPagination, getPaginationMeta } from '../../../utils/pagination.utils';

type SendNotificationPayload = {
  userId?: string;
  userIds?: string[];
  role?: Role;
  title: string;
  message: string;
  sendEmail?: boolean;
};

const notificationSelect = {
  id: true,
  title: true,
  message: true,
  type: true,
  isRead: true,
  metadata: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.NotificationSelect;

const getMyNotifications = async (userId: string, query: Record<string, unknown>) => {
  const { page, limit, skip } = getPagination({
    page: query.page as string | undefined,
    limit: query.limit as string | undefined,
  });

  const where: Prisma.NotificationWhereInput = {
    userId,
    ...(query.isRead !== undefined && { isRead: query.isRead === 'true' }),
    ...(query.type && { type: query.type as NotificationType }),
  };

  const [notifications, total] = await Promise.all([
    prisma.notification.findMany({
      where,
      skip,
      take: limit,
      select: notificationSelect,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.notification.count({ where }),
  ]);

  return {
    data: notifications,
    meta: getPaginationMeta(total, page, limit),
  };
};

const getUnreadCount = async (userId: string) => {
  const count = await prisma.notification.count({
    where: { userId, isRead: false },
  });

  return { unreadCount: count };
};

const getAllNotifications = async (query: Record<string, unknown>) => {
  const { page, limit, skip } = getPagination({
    page: query.page as string | undefined,
    limit: query.limit as string | undefined,
  });

  const where: Prisma.NotificationWhereInput = {
    ...(query.isRead !== undefined && { isRead: query.isRead === 'true' }),
    ...(query.type && { type: query.type as NotificationType }),
  };

  const [notifications, total] = await Promise.all([
    prisma.notification.findMany({
      where,
      skip,
      take: limit,
      select: {
        ...notificationSelect,
        user: { select: { id: true, name: true, email: true, role: true } },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.notification.count({ where }),
  ]);

  return {
    data: notifications,
    meta: getPaginationMeta(total, page, limit),
  };
};

const markAsRead = async (id: string, userId: string) => {
  const notification = await prisma.notification.findFirst({
    where: { id, userId },
  });

  if (!notification) {
    throw new AppError(status.NOT_FOUND, 'Notification not found');
  }

  return prisma.notification.update({
    where: { id },
    data: { isRead: true },
    select: notificationSelect,
  });
};

const markAllAsRead = async (userId: string) => {
  const result = await prisma.notification.updateMany({
    where: { userId, isRead: false },
    data: { isRead: true },
  });

  return { updatedCount: result.count };
};

const deleteNotification = async (id: string, userId: string) => {
  const notification = await prisma.notification.findFirst({
    where: { id, userId },
  });

  if (!notification) {
    throw new AppError(status.NOT_FOUND, 'Notification not found');
  }

  await prisma.notification.delete({ where: { id } });
  return { message: 'Notification deleted successfully' };
};

const clearReadNotifications = async (userId: string) => {
  const result = await prisma.notification.deleteMany({
    where: { userId, isRead: true },
  });

  return { deletedCount: result.count };
};

const sendAdminNotification = async (payload: SendNotificationPayload) => {
  const targetUserIds = new Set<string>();

  if (payload.userId) targetUserIds.add(payload.userId);
  if (payload.userIds?.length) payload.userIds.forEach((id) => targetUserIds.add(id));

  if (payload.role) {
    const users = await prisma.user.findMany({
      where: { role: payload.role, isDeleted: false, status: 'ACTIVE' },
      select: { id: true },
    });
    users.forEach((user) => targetUserIds.add(user.id));
  }

  if (targetUserIds.size === 0) {
    throw new AppError(status.BAD_REQUEST, 'No target users found');
  }

  const inputs = Array.from(targetUserIds).map((userId) => ({
    userId,
    title: payload.title,
    message: payload.message,
    type: NotificationType.SYSTEM,
    metadata: { sentBy: 'ADMIN' },
    sendEmail: payload.sendEmail ?? false,
  }));

  await Promise.all(inputs.map((input) => createNotification(input)));

  return { sentCount: inputs.length };
};

export const NotificationService = {
  getMyNotifications,
  getUnreadCount,
  getAllNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  clearReadNotifications,
  sendAdminNotification,
};
