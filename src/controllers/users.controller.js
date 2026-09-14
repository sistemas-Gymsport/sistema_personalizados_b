const bcrypt = require('bcryptjs');
const prisma = require('../config/db');
const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/sendResponse');
const ApiError = require('../utils/ApiError');

const publicSelect = {
  id: true,
  name: true,
  username: true,
  role: true,
  sucursalId: true,
  sucursal: { select: { id: true, name: true } },
  active: true,
  createdAt: true,
  updatedAt: true,
};

const list = asyncHandler(async (req, res) => {
  const users = await prisma.user.findMany({
    select: publicSelect,
    orderBy: { createdAt: 'desc' },
  });
  sendSuccess(res, 200, users);
});

const getById = asyncHandler(async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.params.id }, select: publicSelect });
  if (!user) throw new ApiError(404, 'Usuario no encontrado.');
  sendSuccess(res, 200, user);
});

const create = asyncHandler(async (req, res) => {
  const { name, username, password, role, sucursalId } = req.body;
  if (!name || !username || !password) {
    throw new ApiError(400, 'Nombre, usuario y contrasena son obligatorios.');
  }
  if (role === 'COLABORADOR' && !sucursalId) {
    throw new ApiError(400, 'Un colaborador debe estar asociado a una sucursal.');
  }
  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: {
      name,
      username: username.toLowerCase().trim(),
      passwordHash,
      role: role || 'COLABORADOR',
      sucursalId: sucursalId || null,
    },
    select: publicSelect,
  });
  sendSuccess(res, 201, user);
});

const update = asyncHandler(async (req, res) => {
  const { name, username, role, active, password, sucursalId } = req.body;

  const current = await prisma.user.findUnique({ where: { id: req.params.id } });
  if (!current) throw new ApiError(404, 'Usuario no encontrado.');

  const finalRole = role !== undefined ? role : current.role;
  const finalSucursalId = sucursalId !== undefined ? (sucursalId || null) : current.sucursalId;
  if (finalRole === 'COLABORADOR' && !finalSucursalId) {
    throw new ApiError(400, 'Un colaborador debe estar asociado a una sucursal.');
  }

  const data = {};
  if (name !== undefined) data.name = name;
  if (username !== undefined) data.username = username.toLowerCase().trim();
  if (role !== undefined) data.role = role;
  if (active !== undefined) data.active = active;
  if (sucursalId !== undefined) data.sucursalId = sucursalId || null;
  if (password) data.passwordHash = await bcrypt.hash(password, 10);

  const user = await prisma.user.update({ where: { id: req.params.id }, data, select: publicSelect });
  sendSuccess(res, 200, user);
});

// No se elimina fisicamente: se desactiva para preservar auditoria/historial.
const deactivate = asyncHandler(async (req, res) => {
  const user = await prisma.user.update({
    where: { id: req.params.id },
    data: { active: false },
    select: publicSelect,
  });
  sendSuccess(res, 200, user);
});

module.exports = { list, getById, create, update, deactivate };
