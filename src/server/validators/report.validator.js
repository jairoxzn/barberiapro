import { z } from 'zod';
import { optionalString } from './common.js';

export const reportParams = {
  params: z.object({
    type: z.enum(['sales', 'commissions', 'products', 'inventory', 'cash']),
  }),
};

export const reportQuery = {
  query: z.object({
    branchId: optionalString,
    from: z.coerce.date().optional(),
    to: z.coerce.date().optional(),
    format: z.enum(['json', 'csv', 'xlsx', 'excel', 'pdf']).optional(),
  }),
};
