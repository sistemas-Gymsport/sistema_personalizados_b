const { validationResult } = require('express-validator');
const ApiError = require('../utils/ApiError');

// Ejecuta las reglas de express-validator y corta la peticion si hay errores.
function validate(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(new ApiError(400, 'Datos invalidos', errors.array()));
  }
  next();
}

module.exports = validate;
