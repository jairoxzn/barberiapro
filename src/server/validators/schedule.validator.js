import { z } from 'zod';
import { optionalString } from './common.js';

export const createBlockSchema = {
  body: z
    .object({
      branchId: optionalString,
      barberId: optionalString,
      title: z.string().trim().min(1, 'El motivo o título es obligatorio').max(100),
      reason: optionalString,
      startTime: z.coerce.date({ required_error: 'Fecha/hora de inicio requerida' }),
      endTime: z.coerce.date({ required_error: 'Fecha/hora de fin requerida' }),
      isAllDay: z.boolean().optional().default(false),
    })
    .refine((data) => data.startTime < data.endTime, {
      message: 'La fecha y hora de fin debe ser posterior a la de inicio',
      path: ['endTime'],
    }),
};

export const updateBlockSchema = {
  body: z
    .object({
      branchId: optionalString,
      barberId: optionalString,
      title: z.string().trim().min(1).max(100).optional(),
      reason: optionalString,
      startTime: z.coerce.date().optional(),
      endTime: z.coerce.date().optional(),
      isAllDay: z.boolean().optional(),
    })
    .refine(
      (data) => {
        if (data.startTime && data.endTime) {
          return data.startTime < data.endTime;
        }
        return true;
      },
      {
        message: 'La fecha y hora de fin debe ser posterior a la de inicio',
        path: ['endTime'],
      }
    ),
};

export const listBlocksQuery = {
  query: z.object({
    branchId: optionalString,
    barberId: optionalString,
    from: z.coerce.date().optional(),
    to: z.coerce.date().optional(),
    upcomingOnly: z.enum(['true', 'false']).optional(),
  }),
};

export const updateScheduleSettingsSchema = {
  body: z.object({
    slotIntervalMinutes: z.coerce.number().int().min(5).max(120).optional(),
    minAdvanceHours: z.coerce.number().int().min(0).max(720).optional(),
    maxAdvanceDays: z.coerce.number().int().min(1).max(365).optional(),
    bufferMinutes: z.coerce.number().int().min(0).max(60).optional(),
    cancelAdvanceHours: z.coerce.number().int().min(0).max(168).optional(),
  }),
};
