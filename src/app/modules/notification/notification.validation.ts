import { z } from 'zod';
import { NotificationType, Role } from '../../../generated/prisma';

const notificationListQuerySchema = z.object({
  query: z.object({
    page: z.string().optional(),
    limit: z.string().optional(),
    isRead: z.enum(['true', 'false']).optional(),
    type: z.nativeEnum(NotificationType).optional(),
  }),
});

const idParamSchema = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
});

const sendNotificationSchema = z
  .object({
    body: z.object({
      userId: z.string().uuid().optional(),
      userIds: z.array(z.string().uuid()).optional(),
      role: z.nativeEnum(Role).optional(),
      title: z.string().min(2).max(255),
      message: z.string().min(3).max(5000),
      sendEmail: z.boolean().optional(),
    }),
  })
  .refine(
    (data) =>
      data.body.userId !== undefined ||
      (data.body.userIds && data.body.userIds.length > 0) ||
      data.body.role !== undefined,
    { message: 'Provide userId, userIds, or role', path: ['body'] }
  );

export const NotificationValidation = {
  notificationListQuerySchema,
  idParamSchema,
  sendNotificationSchema,
};
