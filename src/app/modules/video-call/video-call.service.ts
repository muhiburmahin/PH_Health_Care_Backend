import status from 'http-status';
import { AppointmentStatus, Role } from '../../../generated/prisma';
import { config } from '../../../config';
import { prisma } from '../../../config/prisma';
import AppError from '../../../errors/AppError';
import { generateAgoraToken, VideoProvider } from '../../../utils/agora.utils';
import { generateZegoToken } from '../../../utils/zego.utils';

const ALLOWED_STATUSES: AppointmentStatus[] = [
  AppointmentStatus.SCHEDULED,
  AppointmentStatus.INPROGRESS,
];

const getAppointmentForVideoCall = async (appointmentId: string, requesterUserId: string) => {
  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: {
      patient: { select: { userId: true, name: true } },
      doctor: { select: { userId: true, name: true } },
      schedule: { select: { startTime: true, endTime: true } },
    },
  });

  if (!appointment) {
    throw new AppError(status.NOT_FOUND, 'Appointment not found');
  }

  const isPatient = appointment.patient.userId === requesterUserId;
  const isDoctor = appointment.doctor.userId === requesterUserId;

  if (!isPatient && !isDoctor) {
    throw new AppError(status.FORBIDDEN, 'You do not have access to this video call');
  }

  if (appointment.status === AppointmentStatus.CANCELED) {
    throw new AppError(status.BAD_REQUEST, 'Cannot join a canceled appointment');
  }

  if (appointment.status === AppointmentStatus.COMPLETED) {
    throw new AppError(status.BAD_REQUEST, 'This appointment has already been completed');
  }

  if (!ALLOWED_STATUSES.includes(appointment.status)) {
    throw new AppError(status.BAD_REQUEST, 'Video call is not available for this appointment status');
  }

  const now = new Date();
  const joinWindowStart = new Date(appointment.schedule.startTime.getTime() - 15 * 60 * 1000);
  const joinWindowEnd = new Date(appointment.schedule.endTime.getTime() + 30 * 60 * 1000);

  if (now < joinWindowStart) {
    throw new AppError(status.BAD_REQUEST, 'Video call is not open yet. Join 15 minutes before the scheduled time.');
  }

  if (now > joinWindowEnd) {
    throw new AppError(status.BAD_REQUEST, 'Video call window has expired');
  }

  return { appointment, role: isPatient ? Role.PATIENT : Role.DOCTOR };
};

const resolveProvider = (provider?: VideoProvider): VideoProvider => {
  const selected = provider || config.VIDEO_PROVIDER;

  if (selected === 'agora') {
    if (!config.AGORA_APP_ID || !config.AGORA_APP_CERTIFICATE) {
      throw new AppError(status.SERVICE_UNAVAILABLE, 'Agora is not configured');
    }
    return 'agora';
  }

  if (!config.ZEGO_APP_ID || !config.ZEGO_SERVER_SECRET) {
    throw new AppError(status.SERVICE_UNAVAILABLE, 'ZegoCloud is not configured');
  }

  return 'zego';
};

const generateVideoToken = async (
  appointmentId: string,
  requesterUserId: string,
  provider?: VideoProvider
) => {
  const { appointment, role } = await getAppointmentForVideoCall(appointmentId, requesterUserId);
  const selectedProvider = resolveProvider(provider);
  const channelName = appointment.videoCallingId;

  const tokenData =
    selectedProvider === 'agora'
      ? generateAgoraToken(channelName, requesterUserId)
      : generateZegoToken(channelName, requesterUserId);

  return {
    ...tokenData,
    appointmentId: appointment.id,
    appointmentStatus: appointment.status,
    role,
    schedule: appointment.schedule,
    participants: {
      patient: appointment.patient,
      doctor: appointment.doctor,
    },
  };
};

export const VideoCallService = {
  generateVideoToken,
};
