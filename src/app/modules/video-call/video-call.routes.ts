import { Router } from 'express';
import { Role } from '../../../generated/prisma';
import { authMiddleware } from '../../../middlewares/auth.middleware';
import { roleGuard } from '../../../middlewares/role.middleware';
import { validateRequest } from '../../../middlewares/validate.middleware';
import { VideoCallController } from './video-call.controller';
import { VideoCallValidation } from './video-call.validation';

const router = Router();

router.use(authMiddleware, roleGuard(Role.PATIENT, Role.DOCTOR));

router.post(
  '/token',
  validateRequest(VideoCallValidation.generateTokenSchema),
  VideoCallController.generateToken
);

router.get(
  '/appointment/:appointmentId/token',
  validateRequest(
    VideoCallValidation.appointmentIdParamSchema.merge(VideoCallValidation.tokenQuerySchema)
  ),
  VideoCallController.generateTokenByAppointment
);

export const VideoCallRoutes = router;
