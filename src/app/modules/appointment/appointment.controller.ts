import { Request, Response } from 'express';
import status from 'http-status';
import { Role } from '../../../generated/prisma';
import AppError from '../../../errors/AppError';
import catchAsync from '../../../utils/catchAsync.utils';
import { sendResponse } from '../../../utils/apiResponse.utils';
import { AppointmentService } from './appointment.service';

const bookAppointment = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) throw new AppError(status.UNAUTHORIZED, 'Unauthorized');

  const result = await AppointmentService.bookAppointment(req.user.userId, req.body);

  sendResponse(res, {
    statusCode: status.CREATED,
    success: true,
    message: 'Appointment booked successfully',
    data: result,
  });
});

const getMyAppointments = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) throw new AppError(status.UNAUTHORIZED, 'Unauthorized');

  const result = await AppointmentService.getMyAppointments(req.user.userId, req.query);

  sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message: 'Appointments fetched successfully',
    data: result.data,
    meta: result.meta,
  });
});

const getDoctorAppointments = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) throw new AppError(status.UNAUTHORIZED, 'Unauthorized');

  const result = await AppointmentService.getDoctorAppointments(req.user.userId, req.query);

  sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message: 'Doctor appointments fetched successfully',
    data: result.data,
    meta: result.meta,
  });
});

const getAllAppointments = catchAsync(async (req: Request, res: Response) => {
  const result = await AppointmentService.getAllAppointments(req.query);

  sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message: 'All appointments fetched successfully',
    data: result.data,
    meta: result.meta,
  });
});

const getAppointmentById = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) throw new AppError(status.UNAUTHORIZED, 'Unauthorized');

  const result = await AppointmentService.getAppointmentById(
    req.params.id as string,
    req.user.userId,
    req.user.role as Role
  );

  sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message: 'Appointment fetched successfully',
    data: result,
  });
});

const cancelAppointment = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) throw new AppError(status.UNAUTHORIZED, 'Unauthorized');

  const result = await AppointmentService.cancelAppointment(
    req.params.id as string,
    req.body.cancelReason,
    req.user.userId,
    req.user.role as Role
  );

  sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message: 'Appointment canceled successfully',
    data: result,
  });
});

const updateAppointmentStatus = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) throw new AppError(status.UNAUTHORIZED, 'Unauthorized');

  const result = await AppointmentService.updateAppointmentStatus(
    req.params.id as string,
    req.body.status,
    req.user.userId
  );

  sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message: 'Appointment status updated successfully',
    data: result,
  });
});

export const AppointmentController = {
  bookAppointment,
  getMyAppointments,
  getDoctorAppointments,
  getAllAppointments,
  getAppointmentById,
  cancelAppointment,
  updateAppointmentStatus,
};
