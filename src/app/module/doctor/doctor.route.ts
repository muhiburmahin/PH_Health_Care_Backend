import express from 'express';
import { DoctorController } from './doctor.controller';
import { validateRequest } from '../../middleware/validateRequest';
import { DoctorValidation } from './doctor.validation';

const router = express.Router();

router.get('/', DoctorController.getAllDoctors);
router.get('/:id', DoctorController.getById);
router.patch(
    "/:id",
    validateRequest(DoctorValidation.updateDoctorZodSchema),
    DoctorController.updateDoctor
);
router.delete('/:id', DoctorController.deleteDoctor);

export const DoctorRoutes = router;