import { z } from 'zod';
import { optionalString } from './common.js';

export const createAppointmentSchema = {
  body: z.object({
    branchId: z.string().min(1, 'Sucursal requerida'),
    barberId: z.string().min(1, 'Barbero requerido'),
    clientId: optionalString,
    serviceIds: z.array(z.string().min(1)).min(1, 'Selecciona al menos un servicio'),
    startTime: z.coerce.date(),
    notes: optionalString,
  }),
};

export const updateAppointmentSchema = {
  body: z.object({
    barberId: z.string().min(1).optional(),
    clientId: optionalString,
    serviceIds: z.array(z.string().min(1)).min(1).optional(),
    startTime: z.coerce.date().optional(),
    notes: optionalString,
  }),
};

export const statusSchema = {
  body: z.object({
    status: z.enum([
      'RESERVED',
      'CONFIRMED',
      'CANCELLED',
      'COMPLETED',
      'NO_SHOW',
      'RESCHEDULED',
    ]),
  }),
};

export const agendaQuery = {
  query: z.object({
    branchId: optionalString,
    barberId: optionalString,
    from: z.coerce.date().optional(),
    to: z.coerce.date().optional(),
    status: optionalString,
  }),
};
