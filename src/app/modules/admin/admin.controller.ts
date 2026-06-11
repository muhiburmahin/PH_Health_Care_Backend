import { Request, Response } from 'express';
import status from 'http-status';
import { Role } from '../../../generated/prisma';
import AppError from '../../../errors/AppError';
import catchAsync from '../../../utils/catchAsync.utils';
import { sendResponse } from '../../../utils/apiResponse.utils';
import { AdminService } from './admin.service';

const bootstrapSuperAdmin = catchAsync(async (req: Request, res: Response) => {
  const result = await AdminService.bootstrapSuperAdmin(req.body);

  sendResponse(res, {
    statusCode: status.CREATED,
    success: true,
    message: 'Super admin created successfully',
    data: result,
  });
});

const createAdmin = catchAsync(async (req: Request, res: Response) => {
  const result = await AdminService.createAdmin(req.body);

  sendResponse(res, {
    statusCode: status.CREATED,
    success: true,
    message: 'Admin created successfully',
    data: result,
  });
});

const getAllAdmins = catchAsync(async (req: Request, res: Response) => {
  const result = await AdminService.getAllAdmins(req.query);

  sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message: 'Admins fetched successfully',
    data: result.data,
    meta: result.meta,
  });
});

const getMyProfile = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) throw new AppError(status.UNAUTHORIZED, 'Unauthorized');

  const result = await AdminService.getAdminByUserId(req.user.userId);

  sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message: 'Profile fetched successfully',
    data: result,
  });
});

const getDashboard = catchAsync(async (_req: Request, res: Response) => {
  const result = await AdminService.getDashboardStats();

  sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message: 'Dashboard stats fetched successfully',
    data: result,
  });
});

const getAdminById = catchAsync(async (req: Request, res: Response) => {
  const result = await AdminService.getAdminById(req.params.id as string);

  sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message: 'Admin fetched successfully',
    data: result,
  });
});

const updateAdmin = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) throw new AppError(status.UNAUTHORIZED, 'Unauthorized');

  const result = await AdminService.updateAdmin(
    req.params.id as string,
    req.body,
    req.user.userId,
    req.user.role as Role
  );

  sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message: 'Admin updated successfully',
    data: result,
  });
});

const deleteAdmin = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) throw new AppError(status.UNAUTHORIZED, 'Unauthorized');

  const result = await AdminService.deleteAdmin(req.params.id as string, req.user.userId);

  sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message: result.message,
    data: null,
  });
});

const getAllUsers = catchAsync(async (req: Request, res: Response) => {
  const result = await AdminService.getAllUsers(req.query);

  sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message: 'Users fetched successfully',
    data: result.data,
    meta: result.meta,
  });
});

const updateUserStatus = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) throw new AppError(status.UNAUTHORIZED, 'Unauthorized');

  const result = await AdminService.updateUserStatus(
    req.params.userId as string,
    req.body.status,
    req.user.role as Role
  );

  sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message: 'User status updated successfully',
    data: result,
  });
});

export const AdminController = {
  bootstrapSuperAdmin,
  createAdmin,
  getAllAdmins,
  getMyProfile,
  getDashboard,
  getAdminById,
  updateAdmin,
  deleteAdmin,
  getAllUsers,
  updateUserStatus,
};
