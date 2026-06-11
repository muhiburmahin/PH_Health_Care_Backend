import status from 'http-status';
import { config } from '../config';
import AppError from '../errors/AppError';

type SslcommerzUrls = {
  sessionApi: string;
  validationApi: string;
};

export const getSslcommerzUrls = (): SslcommerzUrls => {
  if (config.SSLCOMMERZ_IS_LIVE) {
    return {
      sessionApi: 'https://securepay.sslcommerz.com/gwprocess/v4/api.php',
      validationApi: 'https://securepay.sslcommerz.com/validator/api/validationserverAPI.php',
    };
  }

  return {
    sessionApi: 'https://sandbox.sslcommerz.com/gwprocess/v4/api.php',
    validationApi: 'https://sandbox.sslcommerz.com/validator/api/validationserverAPI.php',
  };
};

export const assertSslcommerzConfigured = () => {
  if (!config.SSLCOMMERZ_STORE_ID || !config.SSLCOMMERZ_STORE_PASSWORD) {
    throw new AppError(status.SERVICE_UNAVAILABLE, 'SSLCommerz is not configured');
  }
};

type SslcommerzInitPayload = {
  total_amount: string;
  currency: string;
  tran_id: string;
  success_url: string;
  fail_url: string;
  cancel_url: string;
  ipn_url: string;
  cus_name: string;
  cus_email: string;
  cus_phone: string;
  product_name: string;
  product_category: string;
  product_profile: string;
  emi_option?: string;
};

export const initSslcommerzSession = async (payload: SslcommerzInitPayload) => {
  assertSslcommerzConfigured();

  const { sessionApi } = getSslcommerzUrls();
  const body = new URLSearchParams({
    store_id: config.SSLCOMMERZ_STORE_ID!,
    store_passwd: config.SSLCOMMERZ_STORE_PASSWORD!,
    ...payload,
  });

  const response = await fetch(sessionApi, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });

  if (!response.ok) {
    throw new AppError(status.BAD_GATEWAY, 'Failed to connect to SSLCommerz');
  }

  return (await response.json()) as {
    status: string;
    failedreason?: string;
    sessionkey?: string;
    GatewayPageURL?: string;
  };
};

export const validateSslcommerzPayment = async (valId: string) => {
  assertSslcommerzConfigured();

  const { validationApi } = getSslcommerzUrls();
  const params = new URLSearchParams({
    val_id: valId,
    store_id: config.SSLCOMMERZ_STORE_ID!,
    store_passwd: config.SSLCOMMERZ_STORE_PASSWORD!,
    format: 'json',
  });

  const response = await fetch(`${validationApi}?${params.toString()}`);
  if (!response.ok) {
    throw new AppError(status.BAD_GATEWAY, 'Failed to validate SSLCommerz payment');
  }

  return (await response.json()) as {
    status: string;
    tran_id: string;
    amount: string;
    currency: string;
    val_id: string;
    card_type?: string;
    bank_tran_id?: string;
  };
};
