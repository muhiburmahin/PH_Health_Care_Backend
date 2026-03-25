import express from 'express';
import { SpecialtyController } from './specialty.controller';

const router = express.Router();

router.post('/', SpecialtyController.createSpecialty
);

router.get(
    '/',
    SpecialtyController.getAllSpecialties
);

router.delete(
    '/:id',
    SpecialtyController.deleteSpecialty
);

router.patch(
    '/:id',
    SpecialtyController.updateSpecialty
);
export const SpecialtyRoutes = router;