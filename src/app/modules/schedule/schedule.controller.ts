import { Request, Response } from 'express';
import status from 'http-status';
import AppError from '../../../errors/AppError';
import catchAsync from '../../../utils/catchAsync.utils';
import { sendResponse } from '../../../utils/apiResponse.utils';
import { ScheduleService } from './schedule.service';

const createSchedules = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) throw new AppError(status.UNAUTHORIZED, 'Unauthorized');

  const result = await ScheduleService.createSchedules(req.user.userId, req.body.slots);

  sendResponse(res, {
    statusCode: status.CREATED,
    success: true,
    message: 'Schedule slot(s) created successfully',
    data: result,
  });
});

const getMySchedules = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) throw new AppError(status.UNAUTHORIZED, 'Unauthorized');

  const result = await ScheduleService.getMySchedules(req.user.userId, req.query);

  sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message: 'Schedules fetched successfully',
    data: result.data,
    meta: result.meta,
  });
});

const getDoctorAvailableSchedules = catchAsync(async (req: Request, res: Response) => {
  const result = await ScheduleService.getDoctorAvailableSchedules(
    req.params.doctorId as string,
    req.query
  );

  sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message: 'Available schedules fetched successfully',
    data: result.data,
    meta: result.meta,
  });
});

const updateSchedule = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) throw new AppError(status.UNAUTHORIZED, 'Unauthorized');

  const result = await ScheduleService.updateSchedule(
    req.user.userId,
    req.params.scheduleId as string,
    req.body
  );

  sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message: 'Schedule updated successfully',
    data: result,
  });
});

const deleteSchedule = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) throw new AppError(status.UNAUTHORIZED, 'Unauthorized');

  const result = await ScheduleService.deleteSchedule(
    req.user.userId,
    req.params.scheduleId as string
  );

  sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message: result.message,
    data: null,
  });
});

export const ScheduleController = {
  createSchedules,
  getMySchedules,
  getDoctorAvailableSchedules,
  updateSchedule,
  deleteSchedule,
};
