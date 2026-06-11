import { Router } from 'express';
import { AdminRoutes } from '../modules/admin/admin.routes';
import { AuthRoutes } from '../modules/auth/auth.routes';

const router = Router();

router.use('/auth', AuthRoutes);
router.use('/admins', AdminRoutes);

export const IndexRoutes = router;
