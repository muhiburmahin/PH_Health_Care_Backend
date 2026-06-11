import { Router } from 'express';
import { Role } from '../../../generated/prisma';
import { authMiddleware } from '../../../middlewares/auth.middleware';
import { roleGuard } from '../../../middlewares/role.middleware';
import { validateRequest } from '../../../middlewares/validate.middleware';
import { PatientController } from './patient.controller';
import { PatientValidation } from './patient.validation';

const router = Router();

// Staff — list all patients
router.get(
  '/',
  authMiddleware,
  roleGuard(Role.ADMIN, Role.SUPER_ADMIN, Role.DOCTOR),
  validateRequest(PatientValidation.patientListQuerySchema),
  PatientController.getAllPatients
);

// Patient own routes (before /:id)
router.get(
  '/me/profile',
  authMiddleware,
  roleGuard(Role.PATIENT),
  PatientController.getMyProfile
);

router.patch(
  '/me/profile',
  authMiddleware,
  roleGuard(Role.PATIENT),
  validateRequest(PatientValidation.updateProfileSchema),
  PatientController.updateMyProfile
);

router.post(
  '/me/health-data',
  authMiddleware,
  roleGuard(Role.PATIENT),
  validateRequest(PatientValidation.createHealthDataSchema),
  PatientController.createHealthData
);

router.patch(
  '/me/health-data',
  authMiddleware,
  roleGuard(Role.PATIENT),
  validateRequest(PatientValidation.updateHealthDataSchema),
  PatientController.updateHealthData
);

router.get(
  '/me/medical-reports',
  authMiddleware,
  roleGuard(Role.PATIENT),
  PatientController.getMedicalReports
);

router.post(
  '/me/medical-reports',
  authMiddleware,
  roleGuard(Role.PATIENT),
  validateRequest(PatientValidation.createMedicalReportSchema),
  PatientController.addMedicalReport
);

router.delete(
  '/me/medical-reports/:reportId',
  authMiddleware,
  roleGuard(Role.PATIENT),
  validateRequest(PatientValidation.reportIdParamSchema),
  PatientController.deleteMedicalReport
);

router.get(
  '/me/appointments',
  authMiddleware,
  roleGuard(Role.PATIENT),
  validateRequest(PatientValidation.appointmentQuerySchema),
  PatientController.getMyAppointments
);

router.get(
  '/me/prescriptions',
  authMiddleware,
  roleGuard(Role.PATIENT),
  PatientController.getMyPrescriptions
);

// Get patient by id
router.get(
  '/:id',
  authMiddleware,
  roleGuard(Role.PATIENT, Role.DOCTOR, Role.ADMIN, Role.SUPER_ADMIN),
  validateRequest(PatientValidation.idParamSchema),
  PatientController.getPatientById
);

// Admin delete
router.delete(
  '/:id',
  authMiddleware,
  roleGuard(Role.ADMIN, Role.SUPER_ADMIN),
  validateRequest(PatientValidation.idParamSchema),
  PatientController.deletePatient
);

export const PatientRoutes = router;
