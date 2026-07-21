import { z } from 'zod';
import { optionalString, optionalEmail } from './common.js';

const base = {
  firstName: z.string().trim().min(1, 'Nombre requerido'),
  lastName: optionalString,
  dni: optionalString,
  phone: optionalString,
  email: optionalEmail,
  birthDate: z.coerce.date().optional().nullable(),
  notes: optionalString,
  photoUrl: optionalString,
};

export const createClientSchema = { body: z.object(base) };

export const updateClientSchema = {
  body: z.object({
    ...base,
    firstName: base.firstName.optional(),
    isActive: z.boolean().optional(),
  }),
};
