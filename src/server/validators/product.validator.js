import { z } from 'zod';
import { optionalString } from './common.js';

const base = {
  name: z.string().trim().min(1, 'Nombre requerido'),
  description: optionalString,
  sku: optionalString,
  barcode: optionalString,
  imageUrl: optionalString,
  costPrice: z.coerce.number().min(0).default(0),
  salePrice: z.coerce.number().min(0).default(0),
  minStock: z.coerce.number().int().min(0).default(0),
  location: optionalString,
  brandId: optionalString,
  supplierId: optionalString,
  expiresAt: z.coerce.date().optional().nullable(),
};

export const createProductSchema = {
  body: z.object({
    ...base,
    // Stock inicial opcional por sucursal.
    initialStock: z.coerce.number().int().min(0).optional(),
    branchId: optionalString,
  }),
};

export const updateProductSchema = {
  body: z.object({
    ...base,
    name: base.name.optional(),
    costPrice: z.coerce.number().min(0).optional(),
    salePrice: z.coerce.number().min(0).optional(),
    minStock: z.coerce.number().int().min(0).optional(),
    isActive: z.boolean().optional(),
  }),
};

// Entrada / salida / ajuste manual de inventario.
export const stockMovementSchema = {
  body: z.object({
    branchId: z.string().min(1, 'Sucursal requerida'),
    type: z.enum(['PURCHASE', 'ADJUSTMENT_IN', 'ADJUSTMENT_OUT', 'RETURN', 'INITIAL']),
    quantity: z.coerce.number().int().positive('La cantidad debe ser mayor a 0'),
    unitCost: z.coerce.number().min(0).optional(),
    note: optionalString,
  }),
};

export const stockQuery = {
  query: z.object({
    branchId: optionalString,
    search: optionalString,
    lowStock: z
      .enum(['true', 'false'])
      .transform((v) => v === 'true')
      .optional(),
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
  }),
};
