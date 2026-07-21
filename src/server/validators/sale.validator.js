import { z } from 'zod';
import { optionalString } from './common.js';

const saleItem = z
  .object({
    serviceId: optionalString,
    productId: optionalString,
    barberId: optionalString,
    quantity: z.coerce.number().int().positive().default(1),
    // Si no se envía, se toma el precio del catálogo.
    unitPrice: z.coerce.number().min(0).optional(),
    discount: z.coerce.number().min(0).default(0),
  })
  .refine((i) => Boolean(i.serviceId) !== Boolean(i.productId), {
    message: 'Cada línea debe ser un servicio O un producto (no ambos)',
  });

const payment = z.object({
  method: z.enum(['CASH', 'YAPE', 'PLIN', 'TRANSFER', 'CARD', 'POINTS']),
  amount: z.coerce.number().positive('El monto debe ser mayor a 0'),
  reference: optionalString,
});

export const createSaleSchema = {
  body: z.object({
    branchId: z.string().min(1, 'Sucursal requerida'),
    clientId: optionalString,
    appointmentId: optionalString,
    items: z.array(saleItem).min(1, 'Agrega al menos un ítem'),
    discount: z.coerce.number().min(0).default(0),
    applyTax: z.boolean().default(false),
    payments: z.array(payment).min(1, 'Registra al menos un pago'),
  }),
};

export const saleQuery = {
  query: z.object({
    branchId: optionalString,
    clientId: optionalString,
    from: z.coerce.date().optional(),
    to: z.coerce.date().optional(),
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
  }),
};
