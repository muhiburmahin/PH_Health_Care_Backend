import { createCipheriv, randomBytes } from 'crypto';

type ZegoTokenError = {
  errorCode: number;
  errorMessage: string;
};

const makeNonce = () => {
  const min = -2 ** 31;
  const max = 2 ** 31 - 1;
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

const aesGcmEncrypt = (plainText: string, key: Buffer) => {
  if (![16, 24, 32].includes(key.length)) {
    throw createError(5, 'Invalid Secret length. Key must be 16, 24, or 32 bytes.');
  }

  const nonce = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, nonce);
  const encrypted = cipher.update(plainText, 'utf8');
  const encryptBuf = Buffer.concat([encrypted, cipher.final(), cipher.getAuthTag()]);

  return { encryptBuf, nonce };
};

const createError = (errorCode: number, errorMessage: string): ZegoTokenError => ({
  errorCode,
  errorMessage,
});

export const generateToken04 = (
  appId: number,
  userId: string,
  secret: string,
  effectiveTimeInSeconds: number,
  payload = ''
) => {
  if (!appId || typeof appId !== 'number') {
    throw createError(1, 'appID invalid');
  }

  if (!userId || typeof userId !== 'string' || userId.length > 64) {
    throw createError(3, 'userId invalid');
  }

  if (!secret || typeof secret !== 'string' || secret.length !== 32) {
    throw createError(5, 'secret must be a 32 byte string');
  }

  if (!(effectiveTimeInSeconds > 0)) {
    throw createError(6, 'effectiveTimeInSeconds invalid');
  }

  const createTime = Math.floor(Date.now() / 1000);
  const tokenInfo = {
    app_id: appId,
    user_id: userId,
    nonce: makeNonce(),
    ctime: createTime,
    expire: createTime + effectiveTimeInSeconds,
    payload,
  };

  const plainText = JSON.stringify(tokenInfo);
  const secretKey = Buffer.from(secret, 'utf8');
  const { encryptBuf, nonce } = aesGcmEncrypt(plainText, secretKey);

  const b1 = new Uint8Array(8);
  const b2 = new Uint8Array(2);
  const b3 = new Uint8Array(2);
  const b4 = new Uint8Array(1);

  new DataView(b1.buffer).setBigInt64(0, BigInt(tokenInfo.expire), false);
  new DataView(b2.buffer).setUint16(0, nonce.byteLength, false);
  new DataView(b3.buffer).setUint16(0, encryptBuf.byteLength, false);
  new DataView(b4.buffer).setUint8(0, 1);

  const buf = Buffer.concat([
    Buffer.from(b1),
    Buffer.from(b2),
    Buffer.from(nonce),
    Buffer.from(b3),
    Buffer.from(encryptBuf),
    Buffer.from(b4),
  ]);

  return `04${buf.toString('base64')}`;
};
