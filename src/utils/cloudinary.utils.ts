import { Readable } from 'stream';
import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';
import status from 'http-status';
import { config } from '../config';
import AppError from '../errors/AppError';

type CloudinaryResourceType = 'image' | 'raw' | 'video' | 'auto';

const FOLDER_PREFIX = 'ph-health-care';

let isConfigured = false;

const configureCloudinary = () => {
  if (isConfigured) return;

  if (!config.CLOUDINARY_CLOUD_NAME || !config.CLOUDINARY_API_KEY || !config.CLOUDINARY_API_SECRET) {
    throw new AppError(status.SERVICE_UNAVAILABLE, 'Cloudinary is not configured');
  }

  cloudinary.config({
    cloud_name: config.CLOUDINARY_CLOUD_NAME,
    api_key: config.CLOUDINARY_API_KEY,
    api_secret: config.CLOUDINARY_API_SECRET,
    secure: true,
  });

  isConfigured = true;
};

export const assertCloudinaryConfigured = () => {
  configureCloudinary();
};

export const getCloudinaryFolder = (folder = 'general') => `${FOLDER_PREFIX}/${folder}`;

export const uploadToCloudinary = async (
  file: Express.Multer.File,
  folder = 'general',
  resourceType: CloudinaryResourceType = 'image'
): Promise<UploadApiResponse> => {
  configureCloudinary();

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: getCloudinaryFolder(folder),
        resource_type: resourceType,
        use_filename: true,
        unique_filename: true,
      },
      (error, result) => {
        if (error) {
          reject(new AppError(status.BAD_GATEWAY, error.message || 'Cloudinary upload failed'));
          return;
        }

        if (!result) {
          reject(new AppError(status.BAD_GATEWAY, 'Cloudinary upload returned no result'));
          return;
        }

        resolve(result);
      }
    );

    Readable.from(file.buffer).pipe(uploadStream);
  });
};

export const deleteFromCloudinary = async (
  publicId: string,
  resourceType: CloudinaryResourceType = 'image'
) => {
  configureCloudinary();

  const result = await cloudinary.uploader.destroy(publicId, {
    resource_type: resourceType === 'auto' ? 'image' : resourceType,
  });

  if (result.result !== 'ok' && result.result !== 'not found') {
    throw new AppError(status.BAD_GATEWAY, 'Failed to delete file from Cloudinary');
  }

  return result;
};

export const formatUploadResult = (result: UploadApiResponse) => ({
  url: result.secure_url,
  publicId: result.public_id,
  format: result.format,
  bytes: result.bytes,
  width: result.width,
  height: result.height,
  resourceType: result.resource_type,
  originalFilename: result.original_filename,
});
