import { Router } from 'express';
import { Role } from '../../../generated/prisma';
import { authMiddleware } from '../../../middlewares/auth.middleware';
import { roleGuard } from '../../../middlewares/role.middleware';
import { validateRequest } from '../../../middlewares/validate.middleware';
import { SpecialtyController } from './specialty.controller';
import { SpecialtyValidation } from './specialty.validation';

const router = Router();

router.use(authMiddleware, roleGuard(Role.ADMIN, Role.SUPER_ADMIN));

router.post(
  '/',
  validateRequest(SpecialtyValidation.createSpecialtySchema),
  SpecialtyController.createSpecialty
);

router.get(
  '/',
  validateRequest(SpecialtyValidation.specialtyListQuerySchema),
  SpecialtyController.getAllSpecialties
);

router.get(
  '/:id',
  validateRequest(SpecialtyValidation.idParamSchema),
  SpecialtyController.getSpecialtyById
);

router.patch(
  '/:id',
  validateRequest(SpecialtyValidation.idParamSchema.merge(SpecialtyValidation.updateSpecialtySchema)),
  SpecialtyController.updateSpecialty
);

router.delete(
  '/:id',
  validateRequest(SpecialtyValidation.idParamSchema),
  SpecialtyController.deleteSpecialty
);

export const SpecialtyRoutes = router;
