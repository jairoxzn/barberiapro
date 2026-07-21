import { z } from 'zod';
import { optionalString } from './common.js';

const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Hora inválida (HH:mm)');

const base = {
  name: z.string().trim().min(1, 'Nombre requerido'),
  address: optionalString,
  phone: optionalString,
  openTime: time.optional(),
  closeTime: time.optional(),
};

export const createBranchSchema = { body: z.object(base) };
export const updateBranchSchema = {
  body: z.object({
    ...base,
    name: base.name.optional(),
    isActive: z.boolean().optional(),
  }),
};
