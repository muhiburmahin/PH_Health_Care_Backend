import { NextFunction, Request, Response } from 'express';
import multer, { FileFilterCallback } from 'multer';
import status from 'http-status';
import AppError from '../errors/AppError';

const IMAGE_MIME_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
const DOCUMENT_MIME_TYPES = [...IMAGE_MIME_TYPES, 'application/pdf'];

const imageFileFilter = (_req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
  if (IMAGE_MIME_TYPES.includes(file.mimetype)) {
    cb(null, true);
    return;
  }

  cb(new AppError(status.BAD_REQUEST, 'Only image files (JPEG, PNG, WEBP, GIF) are allowed'));
};

const documentFileFilter = (_req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
  if (DOCUMENT_MIME_TYPES.includes(file.mimetype)) {
    cb(null, true);
    return;
  }

  cb(new AppError(status.BAD_REQUEST, 'Only image or PDF files are allowed'));
};

const imageUploader = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: imageFileFilter,
});

const documentUploader = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: documentFileFilter,
});

const handleMulter =
  (middleware: ReturnType<typeof imageUploader.single>) =>
  (req: Request, res: Response, next: NextFunction) => {
    middleware(req, res, (error: unknown) => {
      if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
          return next(new AppError(status.BAD_REQUEST, 'File size exceeds the allowed limit'));
        }
        if (error.code === 'LIMIT_FILE_COUNT') {
          return next(new AppError(status.BAD_REQUEST, 'Too many files uploaded'));
        }
        return next(new AppError(status.BAD_REQUEST, error.message));
      }

      return next(error);
    });
  };

export const uploadSingleImage = (fieldName = 'file') =>
  handleMulter(imageUploader.single(fieldName));

export const uploadMultipleImages = (fieldName = 'files', maxCount = 5) =>
  handleMulter(imageUploader.array(fieldName, maxCount));

export const uploadSingleDocument = (fieldName = 'file') =>
  handleMulter(documentUploader.single(fieldName));
