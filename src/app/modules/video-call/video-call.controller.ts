import { Request, Response } from 'express';
import status from 'http-status';
import AppError from '../../../errors/AppError';
import catchAsync from '../../../utils/catchAsync.utils';
import { sendResponse } from '../../../utils/apiResponse.utils';
import { VideoProvider } from '../../../utils/agora.utils';
import { VideoCallService } from './video-call.service';

const generateToken = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) throw new AppError(status.UNAUTHORIZED, 'Unauthorized');

  const result = await VideoCallService.generateVideoToken(
    req.body.appointmentId,
    req.user.userId,
    req.body.provider as VideoProvider | undefined
  );

  sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message: 'Video call token generated successfully',
    data: result,
  });
});

const generateTokenByAppointment = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) throw new AppError(status.UNAUTHORIZED, 'Unauthorized');

  const result = await VideoCallService.generateVideoToken(
    req.params.appointmentId as string,
    req.user.userId,
    req.query.provider as VideoProvider | undefined
  );

  sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message: 'Video call token generated successfully',
    data: result,
  });
});

export const VideoCallController = {
  generateToken,
  generateTokenByAppointment,
};
