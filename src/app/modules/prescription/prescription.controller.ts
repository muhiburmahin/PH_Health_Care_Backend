import { Request, Response } from 'express';
import status from 'http-status';
import { Role } from '../../../generated/prisma';
import AppError from '../../../errors/AppError';
import catchAsync from '../../../utils/catchAsync.utils';
import { sendResponse } from '../../../utils/apiResponse.utils';
import { PrescriptionService } from './prescription.service';

const createPrescription = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) throw new AppError(status.UNAUTHORIZED, 'Unauthorized');

  const result = await PrescriptionService.createPrescription(req.user.userId, req.body);

  sendResponse(res, {
    statusCode: status.CREATED,
    success: true,
    message: 'Prescription created successfully',
    data: result,
  });
});

const getMyPrescriptions = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) throw new AppError(status.UNAUTHORIZED, 'Unauthorized');

  const result =
    req.user.role === Role.DOCTOR
      ? await PrescriptionService.getDoctorPrescriptions(req.user.userId, req.query)
      : await PrescriptionService.getPatientPrescriptions(req.user.userId, req.query);

  sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message: 'Prescriptions fetched successfully',
    data: result.data,
    meta: result.meta,
  });
});

const getAllPrescriptions = catchAsync(async (req: Request, res: Response) => {
  const result = await PrescriptionService.getAllPrescriptions(req.query);

  sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message: 'All prescriptions fetched successfully',
    data: result.data,
    meta: result.meta,
  });
});

const getPrescriptionById = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) throw new AppError(status.UNAUTHORIZED, 'Unauthorized');

  const result = await PrescriptionService.getPrescriptionById(
    req.params.id as string,
    req.user.userId,
    req.user.role as Role
  );

  sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message: 'Prescription fetched successfully',
    data: result,
  });
});

const getPrescriptionByAppointment = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) throw new AppError(status.UNAUTHORIZED, 'Unauthorized');

  const result = await PrescriptionService.getPrescriptionByAppointment(
    req.params.appointmentId as string,
    req.user.userId,
    req.user.role as Role
  );

  sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message: 'Prescription fetched successfully',
    data: result,
  });
});

const updatePrescription = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) throw new AppError(status.UNAUTHORIZED, 'Unauthorized');

  const result = await PrescriptionService.updatePrescription(
    req.params.id as string,
    req.user.userId,
    req.body
  );

  sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message: 'Prescription updated successfully',
    data: result,
  });
});

export const PrescriptionController = {
  createPrescription,
  getMyPrescriptions,
  getAllPrescriptions,
  getPrescriptionById,
  getPrescriptionByAppointment,
  updatePrescription,
};
