import { Router } from 'express';
import { Role } from '../../../generated/prisma';
import { authMiddleware } from '../../../middlewares/auth.middleware';
import { roleGuard } from '../../../middlewares/role.middleware';
import { validateRequest } from '../../../middlewares/validate.middleware';
import { ScheduleController } from './schedule.controller';
import { ScheduleValidation } from './schedule.validation';

const router = Router();

// Public — available slots for booking
router.get(
  '/doctor/:doctorId',
  validateRequest(
    ScheduleValidation.doctorIdParamSchema.merge(ScheduleValidation.scheduleListQuerySchema)
  ),
  ScheduleController.getDoctorAvailableSchedules
);

// Doctor own schedule management
router.post(
  '/me',
  authMiddleware,
  roleGuard(Role.DOCTOR),
  validateRequest(ScheduleValidation.createSchedulesSchema),
  ScheduleController.createSchedules
);

router.get(
  '/me',
  authMiddleware,
  roleGuard(Role.DOCTOR),
  validateRequest(ScheduleValidation.scheduleListQuerySchema),
  ScheduleController.getMySchedules
);

router.patch(
  '/me/:scheduleId',
  authMiddleware,
  roleGuard(Role.DOCTOR),
  validateRequest(
    ScheduleValidation.scheduleIdParamSchema.merge(ScheduleValidation.updateScheduleSchema)
  ),
  ScheduleController.updateSchedule
);

router.delete(
  '/me/:scheduleId',
  authMiddleware,
  roleGuard(Role.DOCTOR),
  validateRequest(ScheduleValidation.scheduleIdParamSchema),
  ScheduleController.deleteSchedule
);

export const ScheduleRoutes = router;
