import { Router } from 'express';
import { Role } from '../../../generated/prisma';
import { authMiddleware } from '../../../middlewares/auth.middleware';
import { roleGuard } from '../../../middlewares/role.middleware';
import { validateRequest } from '../../../middlewares/validate.middleware';
import { PrescriptionController } from './prescription.controller';
import { PrescriptionValidation } from './prescription.validation';

const router = Router();

// Doctor — create prescription after appointment
router.post(
  '/',
  authMiddleware,
  roleGuard(Role.DOCTOR),
  validateRequest(PrescriptionValidation.createPrescriptionSchema),
  PrescriptionController.createPrescription
);

// Patient / Doctor — list own prescriptions
router.get(
  '/me',
  authMiddleware,
  roleGuard(Role.PATIENT, Role.DOCTOR),
  validateRequest(PrescriptionValidation.prescriptionListQuerySchema),
  PrescriptionController.getMyPrescriptions
);

// Admin — list all prescriptions
router.get(
  '/',
  authMiddleware,
  roleGuard(Role.ADMIN, Role.SUPER_ADMIN),
  validateRequest(PrescriptionValidation.prescriptionListQuerySchema),
  PrescriptionController.getAllPrescriptions
);

// Get by appointment id
router.get(
  '/appointment/:appointmentId',
  authMiddleware,
  roleGuard(Role.PATIENT, Role.DOCTOR, Role.ADMIN, Role.SUPER_ADMIN),
  validateRequest(PrescriptionValidation.appointmentIdParamSchema),
  PrescriptionController.getPrescriptionByAppointment
);

// Get / update by prescription id
router.get(
  '/:id',
  authMiddleware,
  roleGuard(Role.PATIENT, Role.DOCTOR, Role.ADMIN, Role.SUPER_ADMIN),
  validateRequest(PrescriptionValidation.idParamSchema),
  PrescriptionController.getPrescriptionById
);

router.patch(
  '/:id',
  authMiddleware,
  roleGuard(Role.DOCTOR),
  validateRequest(
    PrescriptionValidation.idParamSchema.merge(PrescriptionValidation.updatePrescriptionSchema)
  ),
  PrescriptionController.updatePrescription
);

export const PrescriptionRoutes = router;
