import { Router } from 'express';
import { Role } from '../../../generated/prisma';
import { authMiddleware } from '../../../middlewares/auth.middleware';
import { roleGuard } from '../../../middlewares/role.middleware';
import { validateRequest } from '../../../middlewares/validate.middleware';
import { UserController } from './user.controller';
import { UserValidation } from './user.validation';

const router = Router();

router.use(authMiddleware);

router.get('/me', UserController.getMe);

router.patch(
  '/me',
  validateRequest(UserValidation.updateProfileSchema),
  UserController.updateProfile
);

router.patch(
  '/me/password',
  validateRequest(UserValidation.changePasswordSchema),
  UserController.changePassword
);

router.delete('/me', UserController.deleteMyAccount);

router.post(
  '/doctors',
  roleGuard(Role.ADMIN, Role.SUPER_ADMIN),
  validateRequest(UserValidation.createDoctorSchema),
  UserController.createDoctor
);

router.get(
  '/:id',
  validateRequest(UserValidation.idParamSchema),
  UserController.getUserById
);

export const UserRoutes = router;
