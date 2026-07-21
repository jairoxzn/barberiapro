import { ApiError } from '../utils/ApiError.js';

// Valida body/query/params contra esquemas Zod. Reemplaza el valor por el parseado.
export const validate = (schemas) => (req, _res, next) => {
  try {
    if (schemas.body) req.body = schemas.body.parse(req.body);
    if (schemas.query) req.validatedQuery = schemas.query.parse(req.query);
    if (schemas.params) req.params = schemas.params.parse(req.params);
    next();
  } catch (err) {
    if (err?.issues) {
      const details = err.issues.map((i) => ({
        field: i.path.join('.'),
        message: i.message,
      }));
      return next(ApiError.badRequest('Datos inválidos', details));
    }
    next(err);
  }
};
