import { z } from 'zod';

const uploadFolderSchema = z.object({
  query: z.object({
    folder: z.enum(['profiles', 'medical-reports', 'specialties', 'general']).optional(),
  }),
});

const deleteFileSchema = z.object({
  body: z.object({
    publicId: z.string().min(1).max(500),
    resourceType: z.enum(['image', 'raw', 'video']).optional(),
  }),
});

export const UploadValidation = {
  uploadFolderSchema,
  deleteFileSchema,
};
