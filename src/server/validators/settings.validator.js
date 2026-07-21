import { z } from 'zod';
import { optionalString } from './common.js';

const hex = z
  .string()
  .regex(/^#([0-9a-fA-F]{6})$/, 'Color inválido (usa #rrggbb)')
  .optional();

export const updateSettingsSchema = {
  body: z.object({
    // Negocio
    name: z.string().trim().min(2, 'Nombre requerido').optional(),
    email: z
      .union([z.string().trim().email('Correo inválido'), z.literal('')])
      .optional(),
    phone: optionalString,
    // Configuración
    currency: z.enum(['PEN', 'USD', 'MXN', 'COP', 'CLP', 'ARS', 'EUR']).optional(),
    timezone: optionalString,
    primaryColor: hex,
    taxRate: z.coerce.number().min(0).max(100).optional(),
    invoiceSeries: z.string().trim().min(1).max(10).optional(),
    facebookUrl: optionalString,
    instagramUrl: optionalString,
    whatsappNumber: optionalString,
    // Reglas de fidelización
    pointsPerCurrency: z.coerce.number().min(0).max(1000).optional(),
    pointsOnBirthday: z.coerce.number().int().min(0).optional(),
    pointsOnFirstVisit: z.coerce.number().int().min(0).optional(),
    pointsOnReferral: z.coerce.number().int().min(0).optional(),
  }),
};
