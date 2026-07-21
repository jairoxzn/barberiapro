import { z } from 'zod';

export const cuid = z.string().min(1, 'ID requerido');

export const idParam = z.object({ id: cuid });

export const listQuery = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  search: z.string().trim().optional(),
  isActive: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .optional(),
});

// Acepta string vacío, null o undefined como undefined
// (los formularios suelen enviar '' o null en campos opcionales).
export const optionalString = z
  .union([z.string().trim(), z.null()])
  .optional()
  .transform((v) => (v == null || v === '' ? undefined : v));

export const optionalEmail = z
  .union([z.string().trim(), z.null()])
  .optional()
  .transform((v) => (v == null || v === '' ? undefined : v))
  .refine((v) => v === undefined || /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v), {
    message: 'Correo inválido',
  });
