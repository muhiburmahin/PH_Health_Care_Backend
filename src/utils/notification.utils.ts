import { NotificationType, Prisma, Role } from '../generated/prisma';
import { prisma } from '../config/prisma';
import { sendEmail } from './email.utils';

type NotifyInput = {
  userId: string;
  title: string;
  message: string;
  type: NotificationType;
  metadata?: Prisma.InputJsonValue;
  sendEmail?: boolean;
};

const sendNotificationEmail = async (userId: string, title: string, message: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, name: true },
  });

  if (!user?.email) return;

  await sendEmail({
    to: user.email,
    subject: `PH Health Care — ${title}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 520px; margin: 0 auto;">
        <h2>PH Health Care</h2>
        <p>Hello ${user.name},</p>
        <p>${message}</p>
        <p style="color: #6b7280; font-size: 13px;">Log in to your account to view details.</p>
      </div>
    `,
  });
};

export const createNotification = async (input: NotifyInput) => {
  const notification = await prisma.notification.create({
    data: {
      userId: input.userId,
      title: input.title,
      message: input.message,
      type: input.type,
      metadata: input.metadata,
    },
  });

  if (input.sendEmail) {
    try {
      await sendNotificationEmail(input.userId, input.title, input.message);
    } catch (error) {
      console.error('[Notification email failed]', error);
    }
  }

  return notification;
};

export const notifyUser = (input: NotifyInput) => {
  void createNotification(input).catch((error) => {
    console.error('[Notification failed]', error);
  });
};

export const notifyMany = (inputs: NotifyInput[]) => {
  for (const input of inputs) {
    notifyUser(input);
  }
};

export const notifyUsersByRole = async (
  role: Role,
  input: Omit<NotifyInput, 'userId'>
) => {
  const users = await prisma.user.findMany({
    where: { role, isDeleted: false, status: 'ACTIVE' },
    select: { id: true },
  });

  notifyMany(users.map((user) => ({ ...input, userId: user.id })));
};
