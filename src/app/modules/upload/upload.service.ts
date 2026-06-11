import status from 'http-status';
import AppError from '../../../errors/AppError';
import {
  deleteFromCloudinary,
  formatUploadResult,
  uploadToCloudinary,
} from '../../../utils/cloudinary.utils';

type UploadFolder = 'profiles' | 'medical-reports' | 'specialties' | 'general';

const getResourceType = (mimetype: string): 'image' | 'raw' => {
  if (mimetype === 'application/pdf') return 'raw';
  return 'image';
};

const uploadImage = async (file: Express.Multer.File, folder: UploadFolder = 'general') => {
  const result = await uploadToCloudinary(file, folder, 'image');
  return formatUploadResult(result);
};

const uploadDocument = async (file: Express.Multer.File, folder: UploadFolder = 'medical-reports') => {
  const resourceType = getResourceType(file.mimetype);
  const result = await uploadToCloudinary(file, folder, resourceType);
  return formatUploadResult(result);
};

const uploadImages = async (files: Express.Multer.File[], folder: UploadFolder = 'general') => {
  if (!files.length) {
    throw new AppError(status.BAD_REQUEST, 'No files uploaded');
  }

  const uploads = await Promise.all(files.map((file) => uploadImage(file, folder)));
  return uploads;
};

const deleteFile = async (publicId: string, resourceType: 'image' | 'raw' | 'video' = 'image') => {
  await deleteFromCloudinary(publicId, resourceType);
  return { message: 'File deleted successfully', publicId };
};

export const UploadService = {
  uploadImage,
  uploadDocument,
  uploadImages,
  deleteFile,
};
