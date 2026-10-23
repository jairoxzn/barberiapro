import { z } from 'zod';
import { optionalString } from './common.js';

export const createTenantSchema = {
  body: z.object({
    businessName: z.string().trim().min(2, 'Nombre de la barbería requerido'),
    name: z.string().trim().min(2, 'Nombre del dueño/administrador requerido'),
    email: z.string().trim().email('Correo electrónico inválido'),
    password: z.string().min(6, 'Contraseña de al menos 6 caracteres'),
    phone: optionalString,
    currency: z.string().optional().default('PEN'),
  }),
};

export const toggleStatusSchema = {
  body: z.object({
    isActive: z.boolean({ required_error: 'El campo isActive es obligatorio' }),
  }),
};
