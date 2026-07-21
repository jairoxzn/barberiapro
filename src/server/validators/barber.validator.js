import { z } from 'zod';
import { optionalString } from './common.js';

const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Hora inválida (HH:mm)');

const base = {
  name: z.string().trim().min(1, 'Nombre requerido'),
  specialty: optionalString,
  photoUrl: optionalString,
  commissionRate: z.coerce.number().min(0).max(100).default(0),
  branchId: optionalString,
};

export const createBarberSchema = { body: z.object(base) };

export const updateBarberSchema = {
  body: z.object({
    ...base,
    name: base.name.optional(),
    commissionRate: z.coerce.number().min(0).max(100).optional(),
    isActive: z.boolean().optional(),
  }),
};

export const scheduleSchema = {
  body: z.object({
    schedules: z
      .array(
        z.object({
          weekday: z.coerce.number().int().min(0).max(6),
          startTime: time,
          endTime: time,
          isActive: z.boolean().default(true),
        })
      )
      .max(7),
  }),
};

export const timeOffSchema = {
  body: z
    .object({
      startDate: z.coerce.date(),
      endDate: z.coerce.date(),
      reason: optionalString,
    })
    .refine((d) => d.endDate >= d.startDate, {
      message: 'La fecha fin debe ser posterior a la de inicio',
      path: ['endDate'],
    }),
};
