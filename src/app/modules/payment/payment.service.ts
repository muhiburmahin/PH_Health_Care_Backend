import { randomUUID } from 'crypto';
import status from 'http-status';
import { AppointmentStatus, PaymentStatus, Prisma, Role } from '../../../generated/prisma';
import { config } from '../../../config';
import { prisma } from '../../../config/prisma';
import AppError from '../../../errors/AppError';
import { getPagination, getPaginationMeta } from '../../../utils/pagination.utils';
import { getStripeClient, toStripeAmount } from '../../../utils/stripe.utils';
import { initSslcommerzSession, validateSslcommerzPayment } from '../../../utils/sslcommerz.utils';

const paymentSelect = {
  id: true,
  amount: true,
  transactionId: true,
  status: true,
  paymentMethod: true,
  paidAt: true,
  refundedAt: true,
  createdAt: true,
  updatedAt: true,
  appointment: {
    select: {
      id: true,
      status: true,
      paymentStatus: true,
      schedule: { select: { startTime: true, endTime: true } },
      doctor: {
        select: { id: true, name: true, designation: true, appointmentFee: true },
      },
      patient: {
        select: { id: true, name: true, email: true, contactNumber: true },
      },
    },
  },
} satisfies Prisma.PaymentSelect;

type PaymentWithRelations = Prisma.PaymentGetPayload<{ select: typeof paymentSelect }>;

const formatPayment = (payment: PaymentWithRelations) => payment;

const getPatientByUserId = async (userId: string) => {
  const patient = await prisma.patient.findFirst({
    where: { userId, isDeleted: false },
  });

  if (!patient) {
    throw new AppError(status.NOT_FOUND, 'Patient profile not found');
  }

  return patient;
};

const getAppointmentForPayment = async (appointmentId: string, patientUserId: string) => {
  const patient = await getPatientByUserId(patientUserId);

  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: {
      doctor: { select: { id: true, name: true, appointmentFee: true } },
      patient: { select: { id: true, userId: true, name: true, email: true, contactNumber: true } },
      schedule: { select: { startTime: true, endTime: true } },
      payment: true,
    },
  });

  if (!appointment) {
    throw new AppError(status.NOT_FOUND, 'Appointment not found');
  }

  if (appointment.patient.userId !== patientUserId) {
    throw new AppError(status.FORBIDDEN, 'You can only pay for your own appointments');
  }

  if (appointment.status === AppointmentStatus.CANCELED) {
    throw new AppError(status.BAD_REQUEST, 'Cannot pay for a canceled appointment');
  }

  if (appointment.paymentStatus === PaymentStatus.PAID) {
    throw new AppError(status.CONFLICT, 'Appointment is already paid');
  }

  return appointment;
};

const upsertPendingPayment = async (
  appointmentId: string,
  amount: number,
  paymentMethod: string
) => {
  const transactionId = randomUUID();

  const payment = await prisma.payment.upsert({
    where: { appointmentId },
    create: {
      appointmentId,
      amount,
      transactionId,
      status: PaymentStatus.UNPAID,
      paymentMethod,
    },
    update: {
      amount,
      transactionId,
      status: PaymentStatus.UNPAID,
      paymentMethod,
      paidAt: null,
      refundedAt: null,
      paymentGatewayData: Prisma.DbNull,
    },
  });

  return payment;
};

const markPaymentSuccess = async (
  transactionId: string,
  gatewayData: Prisma.InputJsonValue
) => {
  const payment = await prisma.payment.findUnique({
    where: { transactionId },
  });

  if (!payment) return null;
  if (payment.status === PaymentStatus.PAID) return payment;

  const [updatedPayment] = await prisma.$transaction([
    prisma.payment.update({
      where: { transactionId },
      data: {
        status: PaymentStatus.PAID,
        paidAt: new Date(),
        paymentGatewayData: gatewayData,
      },
      select: paymentSelect,
    }),
    prisma.appointment.update({
      where: { id: payment.appointmentId },
      data: { paymentStatus: PaymentStatus.PAID },
    }),
  ]);

  return updatedPayment;
};

const markPaymentFailed = async (
  transactionId: string,
  gatewayData: Prisma.InputJsonValue
) => {
  const payment = await prisma.payment.findUnique({
    where: { transactionId },
  });

  if (!payment || payment.status === PaymentStatus.PAID) return null;

  return prisma.payment.update({
    where: { transactionId },
    data: {
      status: PaymentStatus.FAILED,
      paymentGatewayData: gatewayData,
    },
    select: paymentSelect,
  });
};

const createStripeCheckout = async (patientUserId: string, appointmentId: string) => {
  const appointment = await getAppointmentForPayment(appointmentId, patientUserId);
  const amount = appointment.doctor.appointmentFee;

  if (amount <= 0) {
    throw new AppError(status.BAD_REQUEST, 'Invalid appointment fee');
  }

  const payment = await upsertPendingPayment(appointmentId, amount, 'STRIPE');
  const stripe = getStripeClient();

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    payment_method_types: ['card'],
    client_reference_id: payment.transactionId,
    customer_email: appointment.patient.email,
    metadata: {
      appointmentId,
      transactionId: payment.transactionId,
      patientId: appointment.patient.id,
    },
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: config.STRIPE_CURRENCY,
          unit_amount: toStripeAmount(amount),
          product_data: {
            name: `Appointment with Dr. ${appointment.doctor.name}`,
            description: `Scheduled at ${appointment.schedule.startTime.toISOString()}`,
          },
        },
      },
    ],
    success_url: `${config.FRONTEND_URL}/payment/success?session_id={CHECKOUT_SESSION_ID}&appointmentId=${appointmentId}`,
    cancel_url: `${config.FRONTEND_URL}/payment/cancel?appointmentId=${appointmentId}`,
  });

  await prisma.payment.update({
    where: { id: payment.id },
    data: {
      paymentGatewayData: {
        provider: 'STRIPE',
        sessionId: session.id,
        checkoutUrl: session.url,
      },
    },
  });

  return {
    paymentId: payment.id,
    transactionId: payment.transactionId,
    amount,
    currency: config.STRIPE_CURRENCY,
    provider: 'STRIPE',
    checkoutUrl: session.url,
    sessionId: session.id,
  };
};

const createSslcommerzSession = async (patientUserId: string, appointmentId: string) => {
  const appointment = await getAppointmentForPayment(appointmentId, patientUserId);
  const amount = appointment.doctor.appointmentFee;

  if (amount <= 0) {
    throw new AppError(status.BAD_REQUEST, 'Invalid appointment fee');
  }

  const payment = await upsertPendingPayment(appointmentId, amount, 'SSLCOMMERZ');

  const response = await initSslcommerzSession({
    total_amount: amount.toFixed(2),
    currency: config.SSLCOMMERZ_CURRENCY,
    tran_id: payment.transactionId,
    success_url: `${config.FRONTEND_URL}/payment/success?provider=sslcommerz&appointmentId=${appointmentId}`,
    fail_url: `${config.FRONTEND_URL}/payment/fail?appointmentId=${appointmentId}`,
    cancel_url: `${config.FRONTEND_URL}/payment/cancel?appointmentId=${appointmentId}`,
    ipn_url: `${config.BACKEND_URL}/api/v1/payments/sslcommerz/ipn`,
    cus_name: appointment.patient.name,
    cus_email: appointment.patient.email,
    cus_phone: appointment.patient.contactNumber || '01700000000',
    product_name: `Appointment with Dr. ${appointment.doctor.name}`,
    product_category: 'Healthcare',
    product_profile: 'general',
    emi_option: '0',
  });

  if (response.status !== 'SUCCESS' || !response.GatewayPageURL) {
    throw new AppError(
      status.BAD_GATEWAY,
      response.failedreason || 'Failed to initiate SSLCommerz payment'
    );
  }

  await prisma.payment.update({
    where: { id: payment.id },
    data: {
      paymentGatewayData: {
        provider: 'SSLCOMMERZ',
        sessionKey: response.sessionkey,
        gatewayPageUrl: response.GatewayPageURL,
      },
    },
  });

  return {
    paymentId: payment.id,
    transactionId: payment.transactionId,
    amount,
    currency: config.SSLCOMMERZ_CURRENCY,
    provider: 'SSLCOMMERZ',
    gatewayPageUrl: response.GatewayPageURL,
    sessionKey: response.sessionkey,
  };
};

const handleStripeWebhook = async (rawBody: Buffer, signature: string | undefined) => {
  if (!config.STRIPE_WEBHOOK_SECRET) {
    throw new AppError(status.SERVICE_UNAVAILABLE, 'Stripe webhook is not configured');
  }

  if (!signature) {
    throw new AppError(status.BAD_REQUEST, 'Missing Stripe signature');
  }

  const stripe = getStripeClient();
  const event = stripe.webhooks.constructEvent(
    rawBody,
    signature,
    config.STRIPE_WEBHOOK_SECRET
  );

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const transactionId = session.client_reference_id || session.metadata?.transactionId;

    if (transactionId) {
      await markPaymentSuccess(transactionId, {
        provider: 'STRIPE',
        eventId: event.id,
        sessionId: session.id,
        paymentIntent: session.payment_intent,
        amountTotal: session.amount_total,
        currency: session.currency,
      });
    }
  }

  if (event.type === 'checkout.session.expired') {
    const session = event.data.object;
    const transactionId = session.client_reference_id || session.metadata?.transactionId;

    if (transactionId) {
      await markPaymentFailed(transactionId, {
        provider: 'STRIPE',
        eventId: event.id,
        sessionId: session.id,
        reason: 'session_expired',
      });
    }
  }

  return { received: true };
};

const handleSslcommerzIpn = async (payload: Record<string, string>) => {
  const { val_id: valId, tran_id: tranId, status: paymentStatus } = payload;

  if (!valId || !tranId) {
    throw new AppError(status.BAD_REQUEST, 'Invalid SSLCommerz IPN payload');
  }

  const validation = await validateSslcommerzPayment(valId);

  if (validation.tran_id !== tranId) {
    throw new AppError(status.BAD_REQUEST, 'Transaction ID mismatch');
  }

  if (validation.status === 'VALID' || validation.status === 'VALIDATED') {
    await markPaymentSuccess(tranId, {
      provider: 'SSLCOMMERZ',
      valId,
      ipnStatus: paymentStatus,
      validation,
    });
    return { message: 'Payment validated successfully' };
  }

  await markPaymentFailed(tranId, {
    provider: 'SSLCOMMERZ',
    valId,
    ipnStatus: paymentStatus,
    validation,
  });

  return { message: 'Payment validation failed' };
};

const verifyStripeSession = async (patientUserId: string, sessionId: string) => {
  const stripe = getStripeClient();
  const session = await stripe.checkout.sessions.retrieve(sessionId);

  const appointmentId = session.metadata?.appointmentId;
  const transactionId = session.client_reference_id || session.metadata?.transactionId;

  if (!appointmentId || !transactionId) {
    throw new AppError(status.BAD_REQUEST, 'Invalid Stripe session');
  }

  await getAppointmentForPayment(appointmentId, patientUserId);

  if (session.payment_status === 'paid') {
    await markPaymentSuccess(transactionId, {
      provider: 'STRIPE',
      sessionId: session.id,
      paymentStatus: session.payment_status,
    });
  }

  const payment = await prisma.payment.findUnique({
    where: { transactionId },
    select: paymentSelect,
  });

  if (!payment) {
    throw new AppError(status.NOT_FOUND, 'Payment not found');
  }

  return formatPayment(payment);
};

const getPaymentByAppointment = async (
  appointmentId: string,
  requesterUserId: string,
  requesterRole: Role
) => {
  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: {
      patient: { select: { userId: true } },
      payment: { select: paymentSelect },
    },
  });

  if (!appointment) {
    throw new AppError(status.NOT_FOUND, 'Appointment not found');
  }

  const isAdmin = requesterRole === Role.ADMIN || requesterRole === Role.SUPER_ADMIN;
  const isPatient =
    requesterRole === Role.PATIENT && appointment.patient.userId === requesterUserId;

  if (!isAdmin && !isPatient) {
    throw new AppError(status.FORBIDDEN, 'You do not have permission to view this payment');
  }

  if (!appointment.payment) {
    throw new AppError(status.NOT_FOUND, 'Payment not initiated for this appointment');
  }

  return formatPayment(appointment.payment);
};

const getMyPayments = async (userId: string, query: Record<string, unknown>) => {
  const patient = await getPatientByUserId(userId);
  const { page, limit, skip } = getPagination({
    page: query.page as string | undefined,
    limit: query.limit as string | undefined,
  });

  const where: Prisma.PaymentWhereInput = {
    appointment: { patientId: patient.id },
    ...(query.status && { status: query.status as PaymentStatus }),
  };

  const [payments, total] = await Promise.all([
    prisma.payment.findMany({
      where,
      skip,
      take: limit,
      select: paymentSelect,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.payment.count({ where }),
  ]);

  return {
    data: payments.map(formatPayment),
    meta: getPaginationMeta(total, page, limit),
  };
};

export const PaymentService = {
  createStripeCheckout,
  createSslcommerzSession,
  handleStripeWebhook,
  handleSslcommerzIpn,
  verifyStripeSession,
  getPaymentByAppointment,
  getMyPayments,
};
