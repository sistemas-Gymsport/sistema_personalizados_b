const jwt = require('jsonwebtoken');
const ApiError = require('../utils/ApiError');
const prisma = require('../config/db');

// Verifica el JWT enviado en el header Authorization: Bearer <token>
// (tambien acepta cookie httpOnly "token" como respaldo).
async function requireAuth(req, res, next) {
  try {
    let token;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    } else if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }

    if (!token) {
      throw new ApiError(401, 'No autenticado. Se requiere iniciar sesion.');
    }

    const payload = jwt.verify(token, process.env.JWT_SECRET);

    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user || !user.active) {
      throw new ApiError(401, 'Sesion invalida o usuario inactivo.');
    }

    req.user = {
      id: user.id,
      name: user.name,
      username: user.username,
      role: user.role,
      sucursalId: user.sucursalId,
    };
    next();
  } catch (err) {
    if (err instanceof ApiError) return next(err);
    next(new ApiError(401, 'Token invalido o expirado.'));
  }
}

// Restringe el acceso a ciertos roles. Uso: requireRole('ADMIN', 'COLABORADOR')
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return next(new ApiError(401, 'No autenticado.'));
    if (!roles.includes(req.user.role)) {
      return next(new ApiError(403, 'No tienes permisos para esta accion.'));
    }
    next();
  };
}

module.exports = { requireAuth, requireRole };
