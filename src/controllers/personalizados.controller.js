const prisma = require('../config/db');
const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/sendResponse');
const ApiError = require('../utils/ApiError');
const { createPersonalizadoWithFolio } = require('../services/folioService');

const include = {
  sucursal: true,
  socio: true,
  instructor: true,
  paquete: true,
  formaPago: true,
  estatusPago: true,
};

function withComputed(p) {
  return { ...p, sessionsPending: Math.max(p.sessionsContracted - p.sessionsRealized, 0) };
}

const list = asyncHandler(async (req, res) => {
  const {
    folio,
    socioId,
    instructorId,
    sucursalId,
    estatusPagoId,
    dateFrom,
    dateTo,
    search,
    page = '1',
    pageSize = '20',
  } = req.query;

  const where = { active: true };
  if (folio) where.folio = { contains: folio, mode: 'insensitive' };
  if (socioId) where.socioId = socioId;
  if (instructorId) where.instructorId = instructorId;
  if (sucursalId) where.sucursalId = sucursalId;
  if (estatusPagoId) where.estatusPagoId = estatusPagoId;
  if (dateFrom || dateTo) {
    where.saleDate = {};
    if (dateFrom) where.saleDate.gte = new Date(dateFrom);
    if (dateTo) where.saleDate.lte = new Date(dateTo);
  }
  if (search) {
    where.OR = [
      { folio: { contains: search, mode: 'insensitive' } },
      { socio: { name: { contains: search, mode: 'insensitive' } } },
      { instructor: { name: { contains: search, mode: 'insensitive' } } },
    ];
  }

  const take = Math.min(parseInt(pageSize, 10) || 20, 100);
  const skip = (Math.max(parseInt(page, 10) || 1, 1) - 1) * take;

  const [items, total] = await Promise.all([
    prisma.personalizado.findMany({ where, include, orderBy: { saleDate: 'desc' }, skip, take }),
    prisma.personalizado.count({ where }),
  ]);

  sendSuccess(res, 200, items.map(withComputed), { total, page: Number(page), pageSize: take });
});

const getById = asyncHandler(async (req, res) => {
  const item = await prisma.personalizado.findUnique({
    where: { id: req.params.id },
    include: { ...include, sesiones: { orderBy: { sessionNumber: 'asc' } } },
  });
  if (!item) throw new ApiError(404, 'Personalizado no encontrado.');
  sendSuccess(res, 200, withComputed(item));
});

const create = asyncHandler(async (req, res) => {
  const {
    saleDate,
    sucursalId,
    socioId,
    instructorId,
    paqueteId,
    sessionsContracted,
    salePrice,
    formaPagoId,
    paymentDate,
    estatusPagoId,
    startDate,
    dueDate,
  } = req.body;

  if (!saleDate || !sucursalId || !socioId || !instructorId || !paqueteId || !sessionsContracted || !salePrice) {
    throw new ApiError(400, 'Faltan campos obligatorios para crear el personalizado.');
  }

  const created = await createPersonalizadoWithFolio({
    saleDate: new Date(saleDate),
    sucursalId,
    socioId,
    instructorId,
    paqueteId,
    sessionsContracted: Number(sessionsContracted),
    salePrice,
    formaPagoId: formaPagoId || null,
    paymentDate: paymentDate ? new Date(paymentDate) : null,
    estatusPagoId: estatusPagoId || null,
    startDate: startDate ? new Date(startDate) : null,
    dueDate: dueDate ? new Date(dueDate) : null,
    createdById: req.user.id,
    updatedById: req.user.id,
  });

  const full = await prisma.personalizado.findUnique({ where: { id: created.id }, include });
  sendSuccess(res, 201, withComputed(full));
});

const update = asyncHandler(async (req, res) => {
  const {
    saleDate,
    sucursalId,
    socioId,
    instructorId,
    paqueteId,
    sessionsContracted,
    salePrice,
    formaPagoId,
    paymentDate,
    estatusPagoId,
    startDate,
    dueDate,
  } = req.body;

  const data = { updatedById: req.user.id };
  if (saleDate !== undefined) data.saleDate = new Date(saleDate);
  if (sucursalId !== undefined) data.sucursalId = sucursalId;
  if (socioId !== undefined) data.socioId = socioId;
  if (instructorId !== undefined) data.instructorId = instructorId;
  if (paqueteId !== undefined) data.paqueteId = paqueteId;
  if (sessionsContracted !== undefined) data.sessionsContracted = Number(sessionsContracted);
  if (salePrice !== undefined) data.salePrice = salePrice;
  if (formaPagoId !== undefined) data.formaPagoId = formaPagoId || null;
  if (paymentDate !== undefined) data.paymentDate = paymentDate ? new Date(paymentDate) : null;
  if (estatusPagoId !== undefined) data.estatusPagoId = estatusPagoId || null;
  if (startDate !== undefined) data.startDate = startDate ? new Date(startDate) : null;
  if (dueDate !== undefined) data.dueDate = dueDate ? new Date(dueDate) : null;

  const item = await prisma.personalizado.update({ where: { id: req.params.id }, data, include });
  sendSuccess(res, 200, withComputed(item));
});

// Soft delete: se desactiva porque puede tener sesiones/comisiones historicas.
const deactivate = asyncHandler(async (req, res) => {
  const item = await prisma.personalizado.update({
    where: { id: req.params.id },
    data: { active: false, updatedById: req.user.id },
  });
  sendSuccess(res, 200, item);
});

module.exports = { list, getById, create, update, deactivate };
