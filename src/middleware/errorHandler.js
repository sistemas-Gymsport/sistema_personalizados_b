const ApiError = require('../utils/ApiError');

function notFound(req, res, next) {
  next(new ApiError(404, `Ruta no encontrada: ${req.originalUrl}`));
}

// Middleware centralizado de errores. El campo "message" (siempre visible al
// usuario) nunca expone detalles internos: solo se usa err.message tal cual
// cuando es un ApiError generado intencionalmente por la app. Cualquier otro
// error (Prisma, fallos de red, bugs) se traduce a un mensaje generico; el
// detalle real solo viaja en "error" y unicamente fuera de produccion.
function errorHandler(err, req, res, next) {
  let statusCode = err.statusCode || 500;
  let message = err instanceof ApiError ? err.message : 'Error interno del servidor';
  let details = err.details;

  // Errores conocidos de Prisma
  if (err.code === 'P2002') {
    statusCode = 409;
    message = `Ya existe un registro con ese valor unico (${(err.meta && err.meta.target) || ''})`;
  } else if (err.code === 'P2025') {
    statusCode = 404;
    message = 'Registro no encontrado';
  } else if (err.code === 'P2003') {
    statusCode = 409;
    message = 'No se puede completar la operacion por relaciones existentes';
  } else if (err.name === 'PrismaClientInitializationError' || err.code === 'P1001') {
    statusCode = 503;
    message = 'No se pudo conectar con la base de datos. Intenta de nuevo en unos momentos.';
  }

  if (!(err instanceof ApiError) && statusCode === 500) {
    console.error(err);
  }

  const body = { success: false, message };
  if (details) body.error = details;
  if (process.env.NODE_ENV !== 'production' && !(err instanceof ApiError)) {
    body.debug = err.stack || err.message;
  }

  res.status(statusCode).json(body);
}

module.exports = { notFound, errorHandler };
