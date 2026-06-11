import Stripe from 'stripe';
import status from 'http-status';
import { config } from '../config';
import AppError from '../errors/AppError';

let stripeClient: Stripe | null = null;

export const getStripeClient = () => {
  if (!config.STRIPE_SECRET_KEY) {
    throw new AppError(status.SERVICE_UNAVAILABLE, 'Stripe is not configured');
  }

  if (!stripeClient) {
    stripeClient = new Stripe(config.STRIPE_SECRET_KEY);
  }

  return stripeClient;
};

export const toStripeAmount = (amount: number) => Math.round(amount * 100);
