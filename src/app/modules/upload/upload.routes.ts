import { Router } from 'express';
import { authMiddleware } from '../../../middlewares/auth.middleware';
import {
  uploadMultipleImages,
  uploadSingleDocument,
  uploadSingleImage,
} from '../../../middlewares/upload.middleware';
import { validateRequest } from '../../../middlewares/validate.middleware';
import { UploadController } from './upload.controller';
import { UploadValidation } from './upload.validation';

const router = Router();

router.use(authMiddleware);

router.post(
  '/image',
  validateRequest(UploadValidation.uploadFolderSchema),
  uploadSingleImage('file'),
  UploadController.uploadImage
);

router.post(
  '/images',
  validateRequest(UploadValidation.uploadFolderSchema),
  uploadMultipleImages('files', 5),
  UploadController.uploadImages
);

router.post(
  '/document',
  validateRequest(UploadValidation.uploadFolderSchema),
  uploadSingleDocument('file'),
  UploadController.uploadDocument
);

router.delete(
  '/',
  validateRequest(UploadValidation.deleteFileSchema),
  UploadController.deleteFile
);

export const UploadRoutes = router;
