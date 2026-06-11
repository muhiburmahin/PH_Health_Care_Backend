import { Router } from 'express';
import { AdminRoutes } from '../modules/admin/admin.routes';
import { AppointmentRoutes } from '../modules/appointment/appointment.routes';
import { AuthRoutes } from '../modules/auth/auth.routes';
import { DoctorRoutes } from '../modules/doctor/doctor.routes';
import { NotificationRoutes } from '../modules/notification/notification.routes';
import { PatientRoutes } from '../modules/patient/patient.routes';
import { PaymentRoutes } from '../modules/payment/payment.routes';
import { PrescriptionRoutes } from '../modules/prescription/prescription.routes';
import { ReviewRoutes } from '../modules/review/review.routes';
import { ScheduleRoutes } from '../modules/schedule/schedule.routes';
import { SpecialtyRoutes } from '../modules/specialty/specialty.routes';
import { UserRoutes } from '../modules/user/user.routes';

const router = Router();

router.use('/auth', AuthRoutes);
router.use('/appointments', AppointmentRoutes);
router.use('/admins', AdminRoutes);
router.use('/users', UserRoutes);
router.use('/doctors', DoctorRoutes);
router.use('/patients', PatientRoutes);
router.use('/notifications', NotificationRoutes);
router.use('/payments', PaymentRoutes);
router.use('/prescriptions', PrescriptionRoutes);
router.use('/reviews', ReviewRoutes);
router.use('/specialties', SpecialtyRoutes);
router.use('/schedules', ScheduleRoutes);

export const IndexRoutes = router;
