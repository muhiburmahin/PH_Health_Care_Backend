import { Router } from 'express';
import { Role } from '../../../generated/prisma';
import { authMiddleware } from '../../../middlewares/auth.middleware';
import { roleGuard } from '../../../middlewares/role.middleware';
import { validateRequest } from '../../../middlewares/validate.middleware';
import { NotificationController } from './notification.controller';
import { NotificationValidation } from './notification.validation';

const router = Router();

router.use(authMiddleware);

// User notifications
router.get(
  '/me/unread-count',
  NotificationController.getUnreadCount
);

router.patch(
  '/me/read-all',
  NotificationController.markAllAsRead
);

router.delete(
  '/me/clear-read',
  NotificationController.clearReadNotifications
);

router.get(
  '/me',
  validateRequest(NotificationValidation.notificationListQuerySchema),
  NotificationController.getMyNotifications
);

// Admin
router.post(
  '/',
  roleGuard(Role.ADMIN, Role.SUPER_ADMIN),
  validateRequest(NotificationValidation.sendNotificationSchema),
  NotificationController.sendAdminNotification
);

router.get(
  '/',
  roleGuard(Role.ADMIN, Role.SUPER_ADMIN),
  validateRequest(NotificationValidation.notificationListQuerySchema),
  NotificationController.getAllNotifications
);

router.patch(
  '/:id/read',
  validateRequest(NotificationValidation.idParamSchema),
  NotificationController.markAsRead
);

router.delete(
  '/:id',
  validateRequest(NotificationValidation.idParamSchema),
  NotificationController.deleteNotification
);

export const NotificationRoutes = router;
