import { ApiError } from '../utils/ApiError.js';
import { verifyAccessToken } from '../utils/jwt.js';

// Exige un access token válido. Adjunta req.user = { id, tenantId, role, branchId }.
export const authenticate = (req, _res, next) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) return next(ApiError.unauthorized('Token no proporcionado'));

  try {
    const payload = verifyAccessToken(token);
    req.user = {
      id: payload.sub,
      tenantId: payload.tenantId ?? null,
      role: payload.role,
      branchId: payload.branchId ?? null,
    };
    next();
  } catch {
    next(ApiError.unauthorized('Token inválido o expirado'));
  }
};

// Restringe por rol. Uso: authorize('ADMIN', 'RECEPTIONIST')
export const authorize = (...roles) => (req, _res, next) => {
  if (!req.user) return next(ApiError.unauthorized());
  if (roles.length && !roles.includes(req.user.role)) {
    return next(ApiError.forbidden('No tienes permiso para esta acción'));
  }
  next();
};

// Bloquea a las cuentas de cliente (rol CLIENT) del panel administrativo.
// Los clientes sólo operan a través de /api/booking y /api/public.
export const staffOnly = authorize('ADMIN', 'RECEPTIONIST', 'BARBER');
