import { Router } from 'express';
import { AdminRoutes } from '../modules/admin/admin.routes';
import { AuthRoutes } from '../modules/auth/auth.routes';
import { DoctorRoutes } from '../modules/doctor/doctor.routes';
import { PatientRoutes } from '../modules/patient/patient.routes';
import { UserRoutes } from '../modules/user/user.routes';

const router = Router();

router.use('/auth', AuthRoutes);
router.use('/admins', AdminRoutes);
router.use('/users', UserRoutes);
router.use('/doctors', DoctorRoutes);
router.use('/patients', PatientRoutes);

export const IndexRoutes = router;
