const prisma = require('../config/db');
const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/sendResponse');
const ApiError = require('../utils/ApiError');
const { upsertComisionForPersonalizado } = require('../services/commissionService');

const include = {
  instructor: true,
  estatus: true,
  personalizado: {
    select: { id: true, folio: true, sucursalId: true, sucursal: { select: { id: true, name: true } } },
  },
};

const list = asyncHandler(async (req, res) => {
  const { instructorId, period, sucursalId, estatusId, page = '1', pageSize = '20' } = req.query;

  const where = {};
  if (instructorId) where.instructorId = instructorId;
  if (period) where.period = period;
  if (estatusId) where.estatusId = estatusId;
  if (sucursalId) where.personalizado = { sucursalId };

  const take = Math.min(parseInt(pageSize, 10) || 20, 100);
  const skip = (Math.max(parseInt(page, 10) || 1, 1) - 1) * take;

  const [items, total] = await Promise.all([
    prisma.comision.findMany({ where, include, orderBy: { createdAt: 'desc' }, skip, take }),
    prisma.comision.count({ where }),
  ]);

  sendSuccess(res, 200, items, { total, page: Number(page), pageSize: take });
});

const getById = asyncHandler(async (req, res) => {
  const item = await prisma.comision.findUnique({ where: { id: req.params.id }, include });
  if (!item) throw new ApiError(404, 'Comision no encontrada.');
  sendSuccess(res, 200, item);
});

const update = asyncHandler(async (req, res) => {
  const { estatusId, observaciones } = req.body;
  const data = { updatedById: req.user.id };
  if (estatusId !== undefined) data.estatusId = estatusId || null;
  if (observaciones !== undefined) data.observaciones = observaciones;
  const item = await prisma.comision.update({ where: { id: req.params.id }, data, include });
  sendSuccess(res, 200, item);
});

// Fuerza el recalculo de la comision de un personalizado (por si se ajusto
// manualmente una regla de comision o sesiones fuera del flujo normal).
const recalcular = asyncHandler(async (req, res) => {
  const item = await upsertComisionForPersonalizado(req.body.personalizadoId);
  if (!item) throw new ApiError(404, 'Personalizado no encontrado.');
  sendSuccess(res, 200, item);
});

module.exports = { list, getById, update, recalcular };
