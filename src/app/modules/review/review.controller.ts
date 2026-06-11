import { Request, Response } from 'express';
import status from 'http-status';
import { Role } from '../../../generated/prisma';
import AppError from '../../../errors/AppError';
import catchAsync from '../../../utils/catchAsync.utils';
import { sendResponse } from '../../../utils/apiResponse.utils';
import { ReviewService } from './review.service';

const createReview = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) throw new AppError(status.UNAUTHORIZED, 'Unauthorized');

  const result = await ReviewService.createReview(req.user.userId, req.body);

  sendResponse(res, {
    statusCode: status.CREATED,
    success: true,
    message: 'Review submitted successfully',
    data: result,
  });
});

const getMyReviews = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) throw new AppError(status.UNAUTHORIZED, 'Unauthorized');

  const result = await ReviewService.getMyReviews(req.user.userId, req.query);

  sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message: 'Reviews fetched successfully',
    data: result.data,
    meta: result.meta,
  });
});

const getAllReviews = catchAsync(async (req: Request, res: Response) => {
  const result = await ReviewService.getAllReviews(req.query);

  sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message: 'All reviews fetched successfully',
    data: result.data,
    meta: result.meta,
  });
});

const getReviewById = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) throw new AppError(status.UNAUTHORIZED, 'Unauthorized');

  const result = await ReviewService.getReviewById(
    req.params.id as string,
    req.user.userId,
    req.user.role as Role
  );

  sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message: 'Review fetched successfully',
    data: result,
  });
});

const getReviewByAppointment = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) throw new AppError(status.UNAUTHORIZED, 'Unauthorized');

  const result = await ReviewService.getReviewByAppointment(
    req.params.appointmentId as string,
    req.user.userId,
    req.user.role as Role
  );

  sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message: 'Review fetched successfully',
    data: result,
  });
});

const updateReview = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) throw new AppError(status.UNAUTHORIZED, 'Unauthorized');

  const result = await ReviewService.updateReview(
    req.params.id as string,
    req.user.userId,
    req.body
  );

  sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message: 'Review updated successfully',
    data: result,
  });
});

const deleteReview = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) throw new AppError(status.UNAUTHORIZED, 'Unauthorized');

  const result = await ReviewService.deleteReview(req.params.id as string, req.user.userId);

  sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message: result.message,
    data: null,
  });
});

const updateReviewVisibility = catchAsync(async (req: Request, res: Response) => {
  const result = await ReviewService.updateReviewVisibility(
    req.params.id as string,
    req.body.isVisible
  );

  sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message: 'Review visibility updated successfully',
    data: result,
  });
});

export const ReviewController = {
  createReview,
  getMyReviews,
  getAllReviews,
  getReviewById,
  getReviewByAppointment,
  updateReview,
  deleteReview,
  updateReviewVisibility,
};
