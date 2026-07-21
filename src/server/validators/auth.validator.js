import { z } from 'zod';

export const registerSchema = {
  body: z.object({
    // Datos del negocio (tenant) — registro self-service de una barbería.
    businessName: z.string().trim().min(2, 'Nombre del negocio requerido'),
    // Datos del administrador
    name: z.string().trim().min(2, 'Nombre requerido'),
    email: z.string().trim().email('Correo inválido'),
    password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
  }),
};

export const loginSchema = {
  body: z.object({
    email: z.string().trim().email('Correo inválido'),
    password: z.string().min(1, 'Contraseña requerida'),
  }),
};

export const refreshSchema = {
  body: z.object({
    refreshToken: z.string().min(1).optional(),
  }),
};

// ----- Reserva online: cliente -----
export const registerClientSchema = {
  body: z.object({
    slug: z.string().trim().min(1, 'Barbería requerida'),
    firstName: z.string().trim().min(2, 'Nombre requerido'),
    lastName: z.string().trim().optional(),
    phone: z.string().trim().optional(),
    email: z.string().trim().email('Correo inválido'),
    password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
  }),
};

export const loginClientSchema = {
  body: z.object({
    slug: z.string().trim().min(1, 'Barbería requerida'),
    email: z.string().trim().email('Correo inválido'),
    password: z.string().min(1, 'Contraseña requerida'),
  }),
};
