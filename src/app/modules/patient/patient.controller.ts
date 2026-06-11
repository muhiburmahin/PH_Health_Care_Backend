import { Request, Response } from 'express';
import status from 'http-status';
import { Role } from '../../../generated/prisma';
import AppError from '../../../errors/AppError';
import catchAsync from '../../../utils/catchAsync.utils';
import { sendResponse } from '../../../utils/apiResponse.utils';
import { PatientService } from './patient.service';

const getAllPatients = catchAsync(async (req: Request, res: Response) => {
  const result = await PatientService.getAllPatients(req.query);

  sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message: 'Patients fetched successfully',
    data: result.data,
    meta: result.meta,
  });
});

const getMyProfile = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) throw new AppError(status.UNAUTHORIZED, 'Unauthorized');

  const result = await PatientService.getPatientByUserId(req.user.userId);

  sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message: 'Patient profile fetched successfully',
    data: result,
  });
});

const getPatientById = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) throw new AppError(status.UNAUTHORIZED, 'Unauthorized');

  const result = await PatientService.getPatientWithAccess(
    req.params.id as string,
    req.user.userId,
    req.user.role as Role
  );

  sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message: 'Patient fetched successfully',
    data: result,
  });
});

const updateMyProfile = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) throw new AppError(status.UNAUTHORIZED, 'Unauthorized');

  const result = await PatientService.updateProfile(req.user.userId, req.body);

  sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message: 'Profile updated successfully',
    data: result,
  });
});

const createHealthData = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) throw new AppError(status.UNAUTHORIZED, 'Unauthorized');

  const result = await PatientService.createHealthData(req.user.userId, req.body);

  sendResponse(res, {
    statusCode: status.CREATED,
    success: true,
    message: 'Health data created successfully',
    data: result,
  });
});

const updateHealthData = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) throw new AppError(status.UNAUTHORIZED, 'Unauthorized');

  const result = await PatientService.updateHealthData(req.user.userId, req.body);

  sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message: 'Health data updated successfully',
    data: result,
  });
});

const getMedicalReports = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) throw new AppError(status.UNAUTHORIZED, 'Unauthorized');

  const result = await PatientService.getMedicalReports(req.user.userId, req.query);

  sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message: 'Medical reports fetched successfully',
    data: result.data,
    meta: result.meta,
  });
});

const addMedicalReport = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) throw new AppError(status.UNAUTHORIZED, 'Unauthorized');

  const result = await PatientService.addMedicalReport(req.user.userId, req.body);

  sendResponse(res, {
    statusCode: status.CREATED,
    success: true,
    message: 'Medical report added successfully',
    data: result,
  });
});

const deleteMedicalReport = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) throw new AppError(status.UNAUTHORIZED, 'Unauthorized');

  const result = await PatientService.deleteMedicalReport(
    req.user.userId,
    req.params.reportId as string
  );

  sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message: result.message,
    data: null,
  });
});

const getMyAppointments = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) throw new AppError(status.UNAUTHORIZED, 'Unauthorized');

  const result = await PatientService.getMyAppointments(req.user.userId, req.query);

  sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message: 'Appointments fetched successfully',
    data: result.data,
    meta: result.meta,
  });
});

const getMyPrescriptions = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) throw new AppError(status.UNAUTHORIZED, 'Unauthorized');

  const result = await PatientService.getMyPrescriptions(req.user.userId, req.query);

  sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message: 'Prescriptions fetched successfully',
    data: result.data,
    meta: result.meta,
  });
});

const deletePatient = catchAsync(async (req: Request, res: Response) => {
  const result = await PatientService.deletePatient(req.params.id as string);

  sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message: result.message,
    data: null,
  });
});

export const PatientController = {
  getAllPatients,
  getMyProfile,
  getPatientById,
  updateMyProfile,
  createHealthData,
  updateHealthData,
  getMedicalReports,
  addMedicalReport,
  deleteMedicalReport,
  getMyAppointments,
  getMyPrescriptions,
  deletePatient,
};
