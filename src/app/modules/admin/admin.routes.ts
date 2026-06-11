import { Router } from 'express';
import { Role } from '../../../generated/prisma';
import { authMiddleware } from '../../../middlewares/auth.middleware';
import { roleGuard } from '../../../middlewares/role.middleware';
import { validateRequest } from '../../../middlewares/validate.middleware';
import { AdminController } from './admin.controller';
import { AdminValidation } from './admin.validation';

const router = Router();

// Public — one-time super admin bootstrap (only when none exists)
router.post(
  '/bootstrap/super-admin',
  validateRequest(AdminValidation.createSuperAdminSchema),
  AdminController.bootstrapSuperAdmin
);

// Protected admin routes
router.use(authMiddleware, roleGuard(Role.ADMIN, Role.SUPER_ADMIN));

router.post(
  '/',
  roleGuard(Role.SUPER_ADMIN),
  validateRequest(AdminValidation.createAdminSchema),
  AdminController.createAdmin
);

router.get(
  '/',
  roleGuard(Role.SUPER_ADMIN),
  validateRequest(AdminValidation.adminListQuerySchema),
  AdminController.getAllAdmins
);

router.get('/me', AdminController.getMyProfile);
router.get('/dashboard', AdminController.getDashboard);

router.get(
  '/users',
  validateRequest(AdminValidation.userListQuerySchema),
  AdminController.getAllUsers
);

router.patch(
  '/users/:userId/status',
  validateRequest(AdminValidation.userIdParamSchema.merge(AdminValidation.updateUserStatusSchema)),
  AdminController.updateUserStatus
);

router.get(
  '/:id',
  validateRequest(AdminValidation.idParamSchema),
  AdminController.getAdminById
);

router.patch(
  '/:id',
  validateRequest(AdminValidation.idParamSchema.merge(AdminValidation.updateAdminSchema)),
  AdminController.updateAdmin
);

router.delete(
  '/:id',
  roleGuard(Role.SUPER_ADMIN),
  validateRequest(AdminValidation.idParamSchema),
  AdminController.deleteAdmin
);

export const AdminRoutes = router;
