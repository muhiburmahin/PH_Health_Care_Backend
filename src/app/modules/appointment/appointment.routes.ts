import { Router } from 'express';
import { Role } from '../../../generated/prisma';
import { authMiddleware } from '../../../middlewares/auth.middleware';
import { roleGuard } from '../../../middlewares/role.middleware';
import { validateRequest } from '../../../middlewares/validate.middleware';
import { AppointmentController } from './appointment.controller';
import { AppointmentValidation } from './appointment.validation';

const router = Router();

// Patient — book & list own appointments
router.post(
  '/',
  authMiddleware,
  roleGuard(Role.PATIENT),
  validateRequest(AppointmentValidation.bookAppointmentSchema),
  AppointmentController.bookAppointment
);

router.get(
  '/me',
  authMiddleware,
  roleGuard(Role.PATIENT),
  validateRequest(AppointmentValidation.appointmentListQuerySchema),
  AppointmentController.getMyAppointments
);

// Doctor — list own appointments
router.get(
  '/doctor/me',
  authMiddleware,
  roleGuard(Role.DOCTOR),
  validateRequest(AppointmentValidation.appointmentListQuerySchema),
  AppointmentController.getDoctorAppointments
);

// Admin — list all appointments
router.get(
  '/',
  authMiddleware,
  roleGuard(Role.ADMIN, Role.SUPER_ADMIN),
  validateRequest(AppointmentValidation.appointmentListQuerySchema),
  AppointmentController.getAllAppointments
);

// Cancel — patient, doctor, admin
router.patch(
  '/:id/cancel',
  authMiddleware,
  roleGuard(Role.PATIENT, Role.DOCTOR, Role.ADMIN, Role.SUPER_ADMIN),
  validateRequest(
    AppointmentValidation.idParamSchema.merge(AppointmentValidation.cancelAppointmentSchema)
  ),
  AppointmentController.cancelAppointment
);

// Doctor — update status (INPROGRESS / COMPLETED)
router.patch(
  '/:id/status',
  authMiddleware,
  roleGuard(Role.DOCTOR),
  validateRequest(
    AppointmentValidation.idParamSchema.merge(AppointmentValidation.updateStatusSchema)
  ),
  AppointmentController.updateAppointmentStatus
);

// Get by id — patient (own), doctor (own), admin
router.get(
  '/:id',
  authMiddleware,
  roleGuard(Role.PATIENT, Role.DOCTOR, Role.ADMIN, Role.SUPER_ADMIN),
  validateRequest(AppointmentValidation.idParamSchema),
  AppointmentController.getAppointmentById
);

export const AppointmentRoutes = router;
