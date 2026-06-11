import jwt, { JwtPayload, SignOptions } from 'jsonwebtoken';

const createToken = (payload: JwtPayload, secret: string, options: SignOptions) => {
  return jwt.sign(payload, secret, options);
};

const verifyToken = (token: string, secret: string) => {
  try {
    const decoded = jwt.verify(token, secret) as JwtPayload;
    return { success: true as const, data: decoded };
  } catch (error) {
    return {
      success: false as const,
      message: error instanceof Error ? error.message : 'Token verification failed',
      error,
    };
  }
};

const decodeToken = (token: string) => jwt.decode(token) as JwtPayload;

export const jwtUtils = {
  createToken,
  verifyToken,
  decodeToken,
};
