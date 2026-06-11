import { Request, Response } from 'express';
import status from 'http-status';
import { Role } from '../../../generated/prisma';
import AppError from '../../../errors/AppError';
import catchAsync from '../../../utils/catchAsync.utils';
import { sendResponse } from '../../../utils/apiResponse.utils';
import { PaymentService } from './payment.service';

const createStripeCheckout = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) throw new AppError(status.UNAUTHORIZED, 'Unauthorized');

  const result = await PaymentService.createStripeCheckout(
    req.user.userId,
    req.body.appointmentId
  );

  sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message: 'Stripe checkout session created successfully',
    data: result,
  });
});

const createSslcommerzSession = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) throw new AppError(status.UNAUTHORIZED, 'Unauthorized');

  const result = await PaymentService.createSslcommerzSession(
    req.user.userId,
    req.body.appointmentId
  );

  sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message: 'SSLCommerz session created successfully',
    data: result,
  });
});

const verifyStripeSession = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) throw new AppError(status.UNAUTHORIZED, 'Unauthorized');

  const sessionId = req.query.session_id as string;
  if (!sessionId) {
    throw new AppError(status.BAD_REQUEST, 'session_id query parameter is required');
  }

  const result = await PaymentService.verifyStripeSession(req.user.userId, sessionId);

  sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message: 'Stripe payment verified successfully',
    data: result,
  });
});

const stripeWebhook = async (req: Request, res: Response) => {
  try {
    const signature = req.headers['stripe-signature'] as string | undefined;
    await PaymentService.handleStripeWebhook(req.body as Buffer, signature);
    res.status(status.OK).json({ received: true });
  } catch (error) {
    res.status(status.BAD_REQUEST).json({
      success: false,
      message: error instanceof Error ? error.message : 'Webhook error',
    });
  }
};

const sslcommerzIpn = catchAsync(async (req: Request, res: Response) => {
  const payload = Object.fromEntries(
    Object.entries(req.body as Record<string, unknown>).map(([key, value]) => [
      key,
      String(value ?? ''),
    ])
  );

  await PaymentService.handleSslcommerzIpn(payload);

  res.status(status.OK).send('IPN received');
});

const getPaymentByAppointment = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) throw new AppError(status.UNAUTHORIZED, 'Unauthorized');

  const result = await PaymentService.getPaymentByAppointment(
    req.params.appointmentId as string,
    req.user.userId,
    req.user.role as Role
  );

  sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message: 'Payment fetched successfully',
    data: result,
  });
});

const getMyPayments = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) throw new AppError(status.UNAUTHORIZED, 'Unauthorized');

  const result = await PaymentService.getMyPayments(req.user.userId, req.query);

  sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message: 'Payments fetched successfully',
    data: result.data,
    meta: result.meta,
  });
});

export const PaymentController = {
  createStripeCheckout,
  createSslcommerzSession,
  verifyStripeSession,
  stripeWebhook,
  sslcommerzIpn,
  getPaymentByAppointment,
  getMyPayments,
};
