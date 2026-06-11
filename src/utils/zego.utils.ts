import status from 'http-status';
import { config } from '../config';
import AppError from '../errors/AppError';
import { generateToken04 } from './zegoServerAssistant';

export const assertZegoConfigured = () => {
  if (!config.ZEGO_APP_ID || !config.ZEGO_SERVER_SECRET) {
    throw new AppError(status.SERVICE_UNAVAILABLE, 'ZegoCloud is not configured');
  }

  if (config.ZEGO_SERVER_SECRET.length !== 32) {
    throw new AppError(status.SERVICE_UNAVAILABLE, 'ZEGO_SERVER_SECRET must be 32 characters');
  }
};

export const generateZegoToken = (
  roomId: string,
  userId: string,
  expireSeconds = config.ZEGO_TOKEN_EXPIRE_SECONDS
) => {
  assertZegoConfigured();

  const payload = JSON.stringify({
    room_id: roomId,
    privilege: {
      1: 1,
      2: 1,
    },
    stream_id_list: null,
  });

  const token = generateToken04(
    config.ZEGO_APP_ID!,
    userId,
    config.ZEGO_SERVER_SECRET!,
    expireSeconds,
    payload
  );

  const expiresAt = new Date(Date.now() + expireSeconds * 1000);

  return {
    provider: 'zego' as const,
    appId: config.ZEGO_APP_ID!,
    roomId,
    userId,
    token,
    expiresIn: expireSeconds,
    expiresAt,
  };
};
