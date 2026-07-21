import { z } from 'zod';
import { optionalString } from './common.js';

export const openCashSchema = {
  body: z.object({
    branchId: z.string().min(1, 'Sucursal requerida'),
    openingAmount: z.coerce.number().min(0, 'El monto inicial no puede ser negativo'),
  }),
};

export const closeCashSchema = {
  body: z.object({
    closingAmount: z.coerce.number().min(0, 'El monto de cierre no puede ser negativo'),
  }),
};

export const movementSchema = {
  body: z.object({
    type: z.enum(['INCOME', 'EXPENSE']),
    amount: z.coerce.number().positive('El monto debe ser mayor a 0'),
    concept: z.string().trim().min(1, 'Concepto requerido'),
  }),
};

export const cashQuery = {
  query: z.object({
    branchId: optionalString,
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
  }),
};
