import { config } from '../config';

export const uploadToCloudinary = async (_filePath: string, _folder = 'healthcare') => {
  if (!config.CLOUDINARY_CLOUD_NAME || !config.CLOUDINARY_API_KEY || !config.CLOUDINARY_API_SECRET) {
    throw new Error('Cloudinary is not configured');
  }

  // Integrate cloudinary SDK when credentials are available
  return { url: '', public_id: '' };
};
