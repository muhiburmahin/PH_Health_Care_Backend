import { Router } from 'express';
import { Role } from '../../../generated/prisma';
import { authMiddleware } from '../../../middlewares/auth.middleware';
import { roleGuard } from '../../../middlewares/role.middleware';
import { validateRequest } from '../../../middlewares/validate.middleware';
import { PaymentController } from './payment.controller';
import { PaymentValidation } from './payment.validation';

const router = Router();

// Public — SSLCommerz IPN callback
router.post('/sslcommerz/ipn', PaymentController.sslcommerzIpn);

// Patient payment routes
router.post(
  '/stripe/checkout',
  authMiddleware,
  roleGuard(Role.PATIENT),
  validateRequest(PaymentValidation.initiatePaymentSchema),
  PaymentController.createStripeCheckout
);

router.get(
  '/stripe/verify',
  authMiddleware,
  roleGuard(Role.PATIENT),
  PaymentController.verifyStripeSession
);

router.post(
  '/sslcommerz/init',
  authMiddleware,
  roleGuard(Role.PATIENT),
  validateRequest(PaymentValidation.initiatePaymentSchema),
  PaymentController.createSslcommerzSession
);

router.get(
  '/me',
  authMiddleware,
  roleGuard(Role.PATIENT),
  validateRequest(PaymentValidation.paymentListQuerySchema),
  PaymentController.getMyPayments
);

router.get(
  '/appointment/:appointmentId',
  authMiddleware,
  roleGuard(Role.PATIENT, Role.ADMIN, Role.SUPER_ADMIN),
  validateRequest(PaymentValidation.appointmentIdParamSchema),
  PaymentController.getPaymentByAppointment
);

export const PaymentRoutes = router;
