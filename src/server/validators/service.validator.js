import { z } from 'zod';
import { optionalString } from './common.js';

const hex = z
  .string()
  .regex(/^#([0-9a-fA-F]{6})$/, 'Color inválido (usa formato #rrggbb)')
  .optional();

// ---- Servicios ----
const serviceBase = {
  name: z.string().trim().min(1, 'Nombre requerido'),
  description: optionalString,
  imageUrl: optionalString,
  durationMinutes: z.coerce.number().int().min(5).max(600).default(30),
  price: z.coerce.number().min(0),
  color: hex,
  categoryId: optionalString,
};

export const createServiceSchema = { body: z.object(serviceBase) };
export const updateServiceSchema = {
  body: z.object({
    ...serviceBase,
    name: serviceBase.name.optional(),
    price: serviceBase.price.optional(),
    durationMinutes: z.coerce.number().int().min(5).max(600).optional(),
    isActive: z.boolean().optional(),
  }),
};

// ---- Categorías ----
export const createCategorySchema = {
  body: z.object({
    name: z.string().trim().min(1, 'Nombre requerido'),
    color: hex,
  }),
};
export const updateCategorySchema = {
  body: z.object({
    name: z.string().trim().min(1).optional(),
    color: hex,
    isActive: z.boolean().optional(),
  }),
};
