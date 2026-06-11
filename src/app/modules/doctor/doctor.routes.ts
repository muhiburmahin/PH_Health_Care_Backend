import { Router } from 'express';
import { Role } from '../../../generated/prisma';
import { authMiddleware } from '../../../middlewares/auth.middleware';
import { roleGuard } from '../../../middlewares/role.middleware';
import { validateRequest } from '../../../middlewares/validate.middleware';
import { DoctorController } from './doctor.controller';
import { DoctorValidation } from './doctor.validation';

const router = Router();

// Public — list all doctors
router.get(
  '/',
  validateRequest(DoctorValidation.doctorListQuerySchema),
  DoctorController.getAllDoctors
);

// Doctor own profile (must be before /:id)
router.get(
  '/me/profile',
  authMiddleware,
  roleGuard(Role.DOCTOR),
  DoctorController.getMyProfile
);

router.patch(
  '/me/profile',
  authMiddleware,
  roleGuard(Role.DOCTOR),
  validateRequest(DoctorValidation.updateDoctorSchema),
  DoctorController.updateMyProfile
);

router.patch(
  '/me/availability',
  authMiddleware,
  roleGuard(Role.DOCTOR),
  validateRequest(DoctorValidation.updateAvailabilitySchema),
  DoctorController.updateAvailability
);

// Public — single doctor & reviews
router.get(
  '/:id/reviews',
  validateRequest(DoctorValidation.idParamSchema),
  DoctorController.getDoctorReviews
);

router.get(
  '/:id',
  validateRequest(DoctorValidation.idParamSchema),
  DoctorController.getDoctorById
);

// Admin / doctor update by id
router.patch(
  '/:id',
  authMiddleware,
  roleGuard(Role.ADMIN, Role.SUPER_ADMIN, Role.DOCTOR),
  validateRequest(DoctorValidation.idParamSchema.merge(DoctorValidation.updateDoctorSchema)),
  DoctorController.updateDoctor
);

router.delete(
  '/:id',
  authMiddleware,
  roleGuard(Role.ADMIN, Role.SUPER_ADMIN),
  validateRequest(DoctorValidation.idParamSchema),
  DoctorController.deleteDoctor
);

export const DoctorRoutes = router;
