import { randomUUID } from 'crypto';
import status from 'http-status';
import { Role, UserStatus } from '../../../generated/prisma';
import { prisma } from '../../../config/prisma';
import AppError from '../../../errors/AppError';
import { AUTH, VERIFICATION_TYPE } from '../../../constants';
import { bcryptUtils } from '../../../utils/bcrypt.utils';
import { sendOtpEmail } from '../../../utils/email.utils';
import {
  createAccessToken,
  createRefreshToken,
  generateOtp,
  getOtpExpiry,
  sanitizeUser,
  verifyRefreshToken,
} from './auth.utils';

type RegisterPayload = {
  name: string;
  email: string;
  password: string;
};

type LoginPayload = {
  email: string;
  password: string;
};

type SessionMeta = {
  ipAddress?: string;
  userAgent?: string;
};

const getCredentialsAccount = async (email: string) => {
  return prisma.account.findFirst({
    where: {
      providerId: AUTH.CREDENTIALS_PROVIDER,
      accountId: email,
    },
    include: { user: true },
  });
};

const createUserSession = async (
  user: { id: string; email: string; role: Role },
  meta: SessionMeta = {}
) => {
  const sessionId = randomUUID();
  const tokenPayload = {
    userId: user.id,
    email: user.email,
    role: user.role,
    sessionId,
  };

  const accessToken = createAccessToken(tokenPayload);
  const refreshToken = createRefreshToken(tokenPayload);

  const refreshExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  await prisma.session.create({
    data: {
      id: sessionId,
      userId: user.id,
      token: sessionId,
      refreshToken,
      expiresAt: refreshExpiresAt,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
      isActive: true,
    },
  });

  return { accessToken, refreshToken, sessionId };
};

const createAndSendOtp = async (email: string, type: string, purpose: string) => {
  const otp = generateOtp();

  await prisma.verification.updateMany({
    where: { identifier: email, type, isUsed: false },
    data: { isUsed: true },
  });

  await prisma.verification.create({
    data: {
      id: randomUUID(),
      identifier: email,
      value: otp,
      type,
      expiresAt: getOtpExpiry(),
    },
  });

  await sendOtpEmail(email, otp, purpose);
};

const register = async (payload: RegisterPayload, meta: SessionMeta = {}) => {
  const email = payload.email.toLowerCase();

  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    throw new AppError(status.CONFLICT, 'User with this email already exists');
  }

  const hashedPassword = await bcryptUtils.hashPassword(payload.password);

  const user = await prisma.$transaction(async (tx) => {
    const newUser = await tx.user.create({
      data: {
        id: randomUUID(),
        name: payload.name,
        email,
        role: Role.PATIENT,
        status: UserStatus.ACTIVE,
        needPasswordChange: false,
        accounts: {
          create: {
            id: randomUUID(),
            accountId: email,
            providerId: AUTH.CREDENTIALS_PROVIDER,
            password: hashedPassword,
          },
        },
        patient: {
          create: {
            id: randomUUID(),
            name: payload.name,
            email,
          },
        },
      },
    });

    return newUser;
  });

  await createAndSendOtp(email, VERIFICATION_TYPE.EMAIL_VERIFY, 'Email Verification');

  const tokens = await createUserSession(user, meta);

  return {
    user: sanitizeUser(user),
    ...tokens,
  };
};

const login = async (payload: LoginPayload, meta: SessionMeta = {}) => {
  const email = payload.email.toLowerCase();

  const account = await getCredentialsAccount(email);
  if (!account?.password || !account.user) {
    throw new AppError(status.UNAUTHORIZED, 'Invalid email or password');
  }

  const { user } = account;

  if (user.isDeleted || user.status === UserStatus.DELETED) {
    throw new AppError(status.UNAUTHORIZED, 'Account has been deleted');
  }

  if (user.status === UserStatus.BLOCKED) {
    throw new AppError(status.FORBIDDEN, 'Account is blocked. Contact support.');
  }

  const isPasswordValid = await bcryptUtils.comparePassword(payload.password, account.password);
  if (!isPasswordValid) {
    throw new AppError(status.UNAUTHORIZED, 'Invalid email or password');
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  const tokens = await createUserSession(
    { id: user.id, email: user.email, role: user.role },
    meta
  );

  return {
    user: sanitizeUser(user),
    ...tokens,
  };
};

const logout = async (refreshToken: string) => {
  const verified = verifyRefreshToken(refreshToken);
  if (!verified.success) {
    throw new AppError(status.UNAUTHORIZED, 'Invalid refresh token');
  }

  await prisma.session.updateMany({
    where: {
      id: verified.data.sessionId,
      userId: verified.data.userId,
      isActive: true,
    },
    data: { isActive: false },
  });
};

const refreshAccessToken = async (refreshToken: string) => {
  const verified = verifyRefreshToken(refreshToken);
  if (!verified.success) {
    throw new AppError(status.UNAUTHORIZED, 'Invalid or expired refresh token');
  }

  const session = await prisma.session.findFirst({
    where: {
      id: verified.data.sessionId,
      userId: verified.data.userId,
      refreshToken,
      isActive: true,
      expiresAt: { gt: new Date() },
    },
    include: { user: true },
  });

  if (!session?.user) {
    throw new AppError(status.UNAUTHORIZED, 'Session expired. Please login again.');
  }

  const { user } = session;

  if (user.isDeleted || user.status !== UserStatus.ACTIVE) {
    throw new AppError(status.UNAUTHORIZED, 'Account is not active');
  }

  const accessToken = createAccessToken({
    userId: user.id,
    email: user.email,
    role: user.role,
    sessionId: session.id,
  });

  return {
    accessToken,
    user: sanitizeUser(user),
  };
};

const forgotPassword = async (email: string) => {
  const normalizedEmail = email.toLowerCase();
  const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });

  if (user) {
    await createAndSendOtp(
      normalizedEmail,
      VERIFICATION_TYPE.RESET_PASSWORD,
      'Password Reset'
    );
  }

  return {
    message: 'If the email exists, an OTP has been sent to your inbox.',
  };
};

const resetPassword = async (email: string, otp: string, newPassword: string) => {
  const normalizedEmail = email.toLowerCase();

  const verification = await prisma.verification.findFirst({
    where: {
      identifier: normalizedEmail,
      type: VERIFICATION_TYPE.RESET_PASSWORD,
      value: otp,
      isUsed: false,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: 'desc' },
  });

  if (!verification) {
    throw new AppError(status.BAD_REQUEST, 'Invalid or expired OTP');
  }

  const account = await getCredentialsAccount(normalizedEmail);
  if (!account) {
    throw new AppError(status.NOT_FOUND, 'User not found');
  }

  const hashedPassword = await bcryptUtils.hashPassword(newPassword);

  await prisma.$transaction(async (tx) => {
    await tx.verification.update({
      where: { id: verification.id },
      data: { isUsed: true },
    });

    await tx.account.update({
      where: { id: account.id },
      data: { password: hashedPassword },
    });

    await tx.session.updateMany({
      where: { userId: account.userId, isActive: true },
      data: { isActive: false },
    });

    await tx.user.update({
      where: { id: account.userId },
      data: { needPasswordChange: false },
    });
  });

  return { message: 'Password reset successfully. Please login with your new password.' };
};

const verifyEmail = async (email: string, otp: string) => {
  const normalizedEmail = email.toLowerCase();

  const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (!user) {
    throw new AppError(status.NOT_FOUND, 'User not found');
  }

  if (user.emailVerified) {
    throw new AppError(status.BAD_REQUEST, 'Email is already verified');
  }

  const verification = await prisma.verification.findFirst({
    where: {
      identifier: normalizedEmail,
      type: VERIFICATION_TYPE.EMAIL_VERIFY,
      value: otp,
      isUsed: false,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: 'desc' },
  });

  if (!verification) {
    throw new AppError(status.BAD_REQUEST, 'Invalid or expired OTP');
  }

  await prisma.$transaction(async (tx) => {
    await tx.verification.update({
      where: { id: verification.id },
      data: { isUsed: true },
    });

    await tx.user.update({
      where: { id: user.id },
      data: { emailVerified: true },
    });
  });

  const updatedUser = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });

  return {
    message: 'Email verified successfully',
    user: sanitizeUser(updatedUser),
  };
};

export const AuthService = {
  register,
  login,
  logout,
  refreshAccessToken,
  forgotPassword,
  resetPassword,
  verifyEmail,
};
