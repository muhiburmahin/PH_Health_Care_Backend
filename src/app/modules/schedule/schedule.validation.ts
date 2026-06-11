import { z } from 'zod';

const slotSchema = z
  .object({
    startTime: z.string().datetime({ message: 'Invalid start time' }),
    endTime: z.string().datetime({ message: 'Invalid end time' }),
  })
  .refine((data) => new Date(data.endTime) > new Date(data.startTime), {
    message: 'End time must be after start time',
    path: ['endTime'],
  });

const createSchedulesSchema = z.object({
  body: z.object({
    slots: z.array(slotSchema).min(1, 'At least one slot is required').max(50),
  }),
});

const updateScheduleSchema = z
  .object({
    body: z.object({
      startTime: z.string().datetime().optional(),
      endTime: z.string().datetime().optional(),
    }),
  })
  .refine(
    (data) => data.body.startTime !== undefined || data.body.endTime !== undefined,
    { message: 'At least one of startTime or endTime is required', path: ['body'] }
  )
  .refine(
    (data) => {
      if (data.body.startTime && data.body.endTime) {
        return new Date(data.body.endTime) > new Date(data.body.startTime);
      }
      return true;
    },
    { message: 'End time must be after start time', path: ['body', 'endTime'] }
  );

const scheduleListQuerySchema = z.object({
  query: z.object({
    page: z.string().optional(),
    limit: z.string().optional(),
    isBooked: z.enum(['true', 'false']).optional(),
    fromDate: z.string().datetime().optional(),
    toDate: z.string().datetime().optional(),
  }),
});

const doctorIdParamSchema = z.object({
  params: z.object({
    doctorId: z.string().uuid(),
  }),
});

const scheduleIdParamSchema = z.object({
  params: z.object({
    scheduleId: z.string().uuid(),
  }),
});

export const ScheduleValidation = {
  createSchedulesSchema,
  updateScheduleSchema,
  scheduleListQuerySchema,
  doctorIdParamSchema,
  scheduleIdParamSchema,
};
