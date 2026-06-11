import { Request, Response } from 'express';
import status from 'http-status';
import AppError from '../../../errors/AppError';
import catchAsync from '../../../utils/catchAsync.utils';
import { sendResponse } from '../../../utils/apiResponse.utils';
import { NotificationService } from './notification.service';

const getMyNotifications = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) throw new AppError(status.UNAUTHORIZED, 'Unauthorized');

  const result = await NotificationService.getMyNotifications(req.user.userId, req.query);

  sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message: 'Notifications fetched successfully',
    data: result.data,
    meta: result.meta,
  });
});

const getUnreadCount = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) throw new AppError(status.UNAUTHORIZED, 'Unauthorized');

  const result = await NotificationService.getUnreadCount(req.user.userId);

  sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message: 'Unread count fetched successfully',
    data: result,
  });
});

const getAllNotifications = catchAsync(async (req: Request, res: Response) => {
  const result = await NotificationService.getAllNotifications(req.query);

  sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message: 'All notifications fetched successfully',
    data: result.data,
    meta: result.meta,
  });
});

const markAsRead = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) throw new AppError(status.UNAUTHORIZED, 'Unauthorized');

  const result = await NotificationService.markAsRead(
    req.params.id as string,
    req.user.userId
  );

  sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message: 'Notification marked as read',
    data: result,
  });
});

const markAllAsRead = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) throw new AppError(status.UNAUTHORIZED, 'Unauthorized');

  const result = await NotificationService.markAllAsRead(req.user.userId);

  sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message: 'All notifications marked as read',
    data: result,
  });
});

const deleteNotification = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) throw new AppError(status.UNAUTHORIZED, 'Unauthorized');

  const result = await NotificationService.deleteNotification(
    req.params.id as string,
    req.user.userId
  );

  sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message: result.message,
    data: null,
  });
});

const clearReadNotifications = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) throw new AppError(status.UNAUTHORIZED, 'Unauthorized');

  const result = await NotificationService.clearReadNotifications(req.user.userId);

  sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message: 'Read notifications cleared successfully',
    data: result,
  });
});

const sendAdminNotification = catchAsync(async (req: Request, res: Response) => {
  const result = await NotificationService.sendAdminNotification(req.body);

  sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message: 'Notifications sent successfully',
    data: result,
  });
});

export const NotificationController = {
  getMyNotifications,
  getUnreadCount,
  getAllNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  clearReadNotifications,
  sendAdminNotification,
};
