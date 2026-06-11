import { Request, Response } from 'express';
import status from 'http-status';
import { Role } from '../../../generated/prisma';
import AppError from '../../../errors/AppError';
import catchAsync from '../../../utils/catchAsync.utils';
import { sendResponse } from '../../../utils/apiResponse.utils';
import { DoctorService } from './doctor.service';

const getAllDoctors = catchAsync(async (req: Request, res: Response) => {
  const result = await DoctorService.getAllDoctors(req.query);

  sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message: 'Doctors fetched successfully',
    data: result.data,
    meta: result.meta,
  });
});

const getMyProfile = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) throw new AppError(status.UNAUTHORIZED, 'Unauthorized');

  const result = await DoctorService.getDoctorByUserId(req.user.userId);

  sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message: 'Doctor profile fetched successfully',
    data: result,
  });
});

const getDoctorById = catchAsync(async (req: Request, res: Response) => {
  const result = await DoctorService.getDoctorById(req.params.id as string);

  sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message: 'Doctor fetched successfully',
    data: result,
  });
});

const getDoctorReviews = catchAsync(async (req: Request, res: Response) => {
  const result = await DoctorService.getDoctorReviews(req.params.id as string, req.query);

  sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message: 'Doctor reviews fetched successfully',
    data: result.data,
    meta: { ...result.meta, averageRating: result.averageRating, totalReviews: result.totalReviews },
  });
});

const updateMyProfile = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) throw new AppError(status.UNAUTHORIZED, 'Unauthorized');

  const doctor = await DoctorService.getDoctorByUserId(req.user.userId);

  const result = await DoctorService.updateDoctor(
    doctor.id,
    req.body,
    req.user.userId,
    req.user.role as Role
  );

  sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message: 'Doctor profile updated successfully',
    data: result,
  });
});

const updateAvailability = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) throw new AppError(status.UNAUTHORIZED, 'Unauthorized');

  const result = await DoctorService.updateAvailability(req.user.userId, req.body.isAvailable);

  sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message: `Doctor is now ${req.body.isAvailable ? 'available' : 'unavailable'}`,
    data: result,
  });
});

const updateDoctor = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) throw new AppError(status.UNAUTHORIZED, 'Unauthorized');

  const result = await DoctorService.updateDoctor(
    req.params.id as string,
    req.body,
    req.user.userId,
    req.user.role as Role
  );

  sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message: 'Doctor updated successfully',
    data: result,
  });
});

const deleteDoctor = catchAsync(async (req: Request, res: Response) => {
  const result = await DoctorService.deleteDoctor(req.params.id as string);

  sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message: result.message,
    data: null,
  });
});

export const DoctorController = {
  getAllDoctors,
  getMyProfile,
  getDoctorById,
  getDoctorReviews,
  updateMyProfile,
  updateAvailability,
  updateDoctor,
  deleteDoctor,
};
