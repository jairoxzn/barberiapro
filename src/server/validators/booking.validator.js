import { z } from 'zod';
import { optionalString } from './common.js';

export const availabilityQuery = {
  query: z.object({
    barberId: z.string().min(1, 'Barbero requerido'),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida (yyyy-mm-dd)'),
    serviceIds: z
      .string()
      .min(1, 'Servicios requeridos')
      .transform((s) => s.split(',').filter(Boolean)),
  }),
};

export const bookSchema = {
  body: z.object({
    branchId: z.string().min(1, 'Sucursal requerida'),
    barberId: z.string().min(1, 'Barbero requerido'),
    serviceIds: z.array(z.string().min(1)).min(1, 'Selecciona al menos un servicio'),
    startTime: z.coerce.date(),
    notes: optionalString,
  }),
};
