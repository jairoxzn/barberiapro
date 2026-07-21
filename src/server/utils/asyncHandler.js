// Envuelve controladores async y reenvía errores a next() automáticamente.
export const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);
