const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../config/db');
const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/sendResponse');
const ApiError = require('../utils/ApiError');

function signToken(user) {
  return jwt.sign({ sub: user.id, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '8h',
  });
}

const login = asyncHandler(async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    throw new ApiError(400, 'Usuario y contrasena son obligatorios.');
  }

  const user = await prisma.user.findUnique({ where: { username: username.toLowerCase().trim() } });
  if (!user || !user.active) {
    throw new ApiError(401, 'Credenciales invalidas.');
  }

  const validPassword = await bcrypt.compare(password, user.passwordHash);
  if (!validPassword) {
    throw new ApiError(401, 'Credenciales invalidas.');
  }

  const token = signToken(user);

  res.cookie('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    maxAge: 8 * 60 * 60 * 1000,
  });

  sendSuccess(res, 200, {
    token,
    user: {
      id: user.id,
      name: user.name,
      username: user.username,
      role: user.role,
      sucursalId: user.sucursalId,
    },
  });
});

const me = asyncHandler(async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.user.id } });
  if (!user) throw new ApiError(404, 'Usuario no encontrado.');
  sendSuccess(res, 200, {
    id: user.id,
    name: user.name,
    username: user.username,
    role: user.role,
    sucursalId: user.sucursalId,
  });
});

const logout = asyncHandler(async (req, res) => {
  res.clearCookie('token');
  sendSuccess(res, 200, { message: 'Sesion cerrada.' });
});

module.exports = { login, me, logout };
