import { Router } from 'express';
import { Role } from '../../../generated/prisma';
import { authMiddleware } from '../../../middlewares/auth.middleware';
import { roleGuard } from '../../../middlewares/role.middleware';
import { validateRequest } from '../../../middlewares/validate.middleware';
import { ReviewController } from './review.controller';
import { ReviewValidation } from './review.validation';

const router = Router();

// Patient — submit review after completed appointment
router.post(
  '/',
  authMiddleware,
  roleGuard(Role.PATIENT),
  validateRequest(ReviewValidation.createReviewSchema),
  ReviewController.createReview
);

router.get(
  '/me',
  authMiddleware,
  roleGuard(Role.PATIENT),
  validateRequest(ReviewValidation.reviewListQuerySchema),
  ReviewController.getMyReviews
);

// Admin — manage all reviews
router.get(
  '/',
  authMiddleware,
  roleGuard(Role.ADMIN, Role.SUPER_ADMIN),
  validateRequest(ReviewValidation.reviewListQuerySchema),
  ReviewController.getAllReviews
);

router.get(
  '/appointment/:appointmentId',
  authMiddleware,
  roleGuard(Role.PATIENT, Role.DOCTOR, Role.ADMIN, Role.SUPER_ADMIN),
  validateRequest(ReviewValidation.appointmentIdParamSchema),
  ReviewController.getReviewByAppointment
);

router.get(
  '/:id',
  authMiddleware,
  roleGuard(Role.PATIENT, Role.DOCTOR, Role.ADMIN, Role.SUPER_ADMIN),
  validateRequest(ReviewValidation.idParamSchema),
  ReviewController.getReviewById
);

router.patch(
  '/:id',
  authMiddleware,
  roleGuard(Role.PATIENT),
  validateRequest(ReviewValidation.idParamSchema.merge(ReviewValidation.updateReviewSchema)),
  ReviewController.updateReview
);

router.delete(
  '/:id',
  authMiddleware,
  roleGuard(Role.PATIENT),
  validateRequest(ReviewValidation.idParamSchema),
  ReviewController.deleteReview
);

router.patch(
  '/:id/visibility',
  authMiddleware,
  roleGuard(Role.ADMIN, Role.SUPER_ADMIN),
  validateRequest(
    ReviewValidation.idParamSchema.merge(ReviewValidation.updateVisibilitySchema)
  ),
  ReviewController.updateReviewVisibility
);

export const ReviewRoutes = router;
