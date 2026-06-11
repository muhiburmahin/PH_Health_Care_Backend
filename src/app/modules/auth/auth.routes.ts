import { Router } from 'express';
import { validateRequest } from '../../../middlewares/validate.middleware';
import { AuthController } from './auth.controller';
import { AuthValidation } from './auth.validation';

const router = Router();

router.post('/register', validateRequest(AuthValidation.registerSchema), AuthController.register);
router.post('/login', validateRequest(AuthValidation.loginSchema), AuthController.login);
router.post('/logout', AuthController.logout);
router.post(
  '/refresh-token',
  validateRequest(AuthValidation.refreshTokenSchema),
  AuthController.refreshToken
);
router.post(
  '/forgot-password',
  validateRequest(AuthValidation.forgotPasswordSchema),
  AuthController.forgotPassword
);
router.post(
  '/reset-password',
  validateRequest(AuthValidation.resetPasswordSchema),
  AuthController.resetPassword
);
router.post(
  '/verify-email',
  validateRequest(AuthValidation.verifyEmailSchema),
  AuthController.verifyEmail
);

export const AuthRoutes = router;
