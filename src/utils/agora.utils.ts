import { createRequire } from 'module';
import status from 'http-status';
import { config } from '../config';
import AppError from '../errors/AppError';

const require = createRequire(import.meta.url);
const { RtcTokenBuilder, RtcRole } = require('agora-token') as {
  RtcTokenBuilder: {
    buildTokenWithUserAccount: (
      appId: string,
      appCertificate: string,
      channelName: string,
      account: string,
      role: number,
      tokenExpire: number,
      privilegeExpire: number
    ) => string;
  };
  RtcRole: { PUBLISHER: number };
};

export type VideoProvider = 'agora' | 'zego';

export const assertAgoraConfigured = () => {
  if (!config.AGORA_APP_ID || !config.AGORA_APP_CERTIFICATE) {
    throw new AppError(status.SERVICE_UNAVAILABLE, 'Agora is not configured');
  }
};

export const generateAgoraToken = (
  channelName: string,
  userAccount: string,
  expireSeconds = config.AGORA_TOKEN_EXPIRE_SECONDS
) => {
  assertAgoraConfigured();

  const token = RtcTokenBuilder.buildTokenWithUserAccount(
    config.AGORA_APP_ID!,
    config.AGORA_APP_CERTIFICATE!,
    channelName,
    userAccount,
    RtcRole.PUBLISHER,
    expireSeconds,
    expireSeconds
  );

  const expiresAt = new Date(Date.now() + expireSeconds * 1000);

  return {
    provider: 'agora' as const,
    appId: config.AGORA_APP_ID!,
    channelName,
    userId: userAccount,
    token,
    expiresIn: expireSeconds,
    expiresAt,
  };
};
