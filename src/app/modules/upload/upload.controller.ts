import { Request, Response } from 'express';
import status from 'http-status';
import AppError from '../../../errors/AppError';
import catchAsync from '../../../utils/catchAsync.utils';
import { sendResponse } from '../../../utils/apiResponse.utils';
import { UploadService } from './upload.service';

type UploadFolder = 'profiles' | 'medical-reports' | 'specialties' | 'general';

const getFolder = (query: Request['query']): UploadFolder => {
  const folder = query.folder as UploadFolder | undefined;
  return folder || 'general';
};

const uploadImage = catchAsync(async (req: Request, res: Response) => {
  if (!req.file) throw new AppError(status.BAD_REQUEST, 'No file uploaded. Use field name "file"');

  const result = await UploadService.uploadImage(req.file, getFolder(req.query));

  sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message: 'Image uploaded successfully',
    data: result,
  });
});

const uploadImages = catchAsync(async (req: Request, res: Response) => {
  const files = req.files as Express.Multer.File[] | undefined;
  if (!files?.length) {
    throw new AppError(status.BAD_REQUEST, 'No files uploaded. Use field name "files"');
  }

  const result = await UploadService.uploadImages(files, getFolder(req.query));

  sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message: 'Images uploaded successfully',
    data: result,
  });
});

const uploadDocument = catchAsync(async (req: Request, res: Response) => {
  if (!req.file) throw new AppError(status.BAD_REQUEST, 'No file uploaded. Use field name "file"');

  const folder = (req.query.folder as UploadFolder | undefined) || 'medical-reports';
  const result = await UploadService.uploadDocument(req.file, folder);

  sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message: 'Document uploaded successfully',
    data: result,
  });
});

const deleteFile = catchAsync(async (req: Request, res: Response) => {
  const result = await UploadService.deleteFile(
    req.body.publicId,
    req.body.resourceType || 'image'
  );

  sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message: result.message,
    data: { publicId: result.publicId },
  });
});

export const UploadController = {
  uploadImage,
  uploadImages,
  uploadDocument,
  deleteFile,
};
