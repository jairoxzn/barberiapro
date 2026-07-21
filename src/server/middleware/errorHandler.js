import { Prisma } from '@prisma/client';
import { ApiError } from '../utils/ApiError.js';
import { env } from '../config/env.js';

export const notFound = (req, _res, next) => {
  next(ApiError.notFound(`Ruta no encontrada: ${req.method} ${req.originalUrl}`));
};

// Manejo centralizado de errores.
// eslint-disable-next-line no-unused-vars
export const errorHandler = (err, req, res, _next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Error interno del servidor';
  let details = err.details || null;

  // Errores conocidos de Prisma.
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      statusCode = 409;
      message = `Ya existe un registro con ese ${err.meta?.target?.join?.(', ') || 'valor único'}`;
    } else if (err.code === 'P2025') {
      statusCode = 404;
      message = 'Registro no encontrado';
    } else if (err.code === 'P2003') {
      statusCode = 409;
      message = 'Violación de relación (registro referenciado)';
    }
  }

  if (statusCode >= 500) {
    // eslint-disable-next-line no-console
    console.error('[ERROR]', err);
  }

  res.status(statusCode).json({
    success: false,
    error: {
      message,
      ...(details ? { details } : {}),
      ...(env.isProd ? {} : { stack: err.stack }),
    },
  });
};
