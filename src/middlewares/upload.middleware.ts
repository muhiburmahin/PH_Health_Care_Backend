import { Request } from 'express';

// Placeholder for multer configuration
// Install multer and cloudinary when file upload is needed

export const uploadSingle = (_fieldName: string) => {
  return (_req: Request, _res: unknown, next: () => void) => next();
};

export const uploadMultiple = (_fieldName: string, _maxCount = 5) => {
  return (_req: Request, _res: unknown, next: () => void) => next();
};
