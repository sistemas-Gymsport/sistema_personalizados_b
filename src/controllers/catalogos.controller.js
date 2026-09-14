const prisma = require('../config/db');
const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/sendResponse');
const ApiError = require('../utils/ApiError');

const VALID_TYPES = ['FORMA_PAGO', 'ESTATUS_PAGO', 'ESTATUS_SESION', 'ESTATUS_COMISION'];

// ---- CatalogItem (formas de pago, estatus de pago/sesion/comision) ----

const listItems = asyncHandler(async (req, res) => {
  const { type, active } = req.query;
  const where = {};
  if (type) {
    if (!VALID_TYPES.includes(type)) throw new ApiError(400, `Tipo de catalogo invalido: ${type}`);
    where.type = type;
  }
  if (active === 'true') where.active = true;
  if (active === 'false') where.active = false;

  const items = await prisma.catalogItem.findMany({ where, orderBy: [{ type: 'asc' }, { order: 'asc' }] });
  sendSuccess(res, 200, items);
});

const createItem = asyncHandler(async (req, res) => {
  const { type, name, order } = req.body;
  if (!type || !VALID_TYPES.includes(type)) throw new ApiError(400, 'Tipo de catalogo invalido.');
  if (!name) throw new ApiError(400, 'El nombre es obligatorio.');
  const item = await prisma.catalogItem.create({ data: { type, name, order: order || 0 } });
  sendSuccess(res, 201, item);
});

const updateItem = asyncHandler(async (req, res) => {
  const { name, order } = req.body;
  const item = await prisma.catalogItem.update({
    where: { id: req.params.id },
    data: { name, order },
  });
  sendSuccess(res, 200, item);
});

const setItemActive = asyncHandler(async (req, res) => {
  const { active } = req.body;
  const item = await prisma.catalogItem.update({ where: { id: req.params.id }, data: { active } });
  sendSuccess(res, 200, item);
});

// ---- Margin (margenes de impresion) ----

const listMargins = asyncHandler(async (req, res) => {
  const { active } = req.query;
  const where = {};
  if (active === 'true') where.active = true;
  if (active === 'false') where.active = false;
  const margins = await prisma.margin.findMany({ where, orderBy: { name: 'asc' } });
  sendSuccess(res, 200, margins);
});

const createMargin = asyncHandler(async (req, res) => {
  const { name, top, right, bottom, left } = req.body;
  if (!name || [top, right, bottom, left].some((v) => v === undefined)) {
    throw new ApiError(400, 'Nombre y los cuatro valores de margen (top, right, bottom, left) son obligatorios.');
  }
  const margin = await prisma.margin.create({ data: { name, top, right, bottom, left } });
  sendSuccess(res, 201, margin);
});

const updateMargin = asyncHandler(async (req, res) => {
  const { name, top, right, bottom, left } = req.body;
  const margin = await prisma.margin.update({
    where: { id: req.params.id },
    data: { name, top, right, bottom, left },
  });
  sendSuccess(res, 200, margin);
});

const setMarginActive = asyncHandler(async (req, res) => {
  const { active } = req.body;
  const margin = await prisma.margin.update({ where: { id: req.params.id }, data: { active } });
  sendSuccess(res, 200, margin);
});

// ---- CommissionRule (porcentaje global o por instructor) ----

const listCommissionRules = asyncHandler(async (req, res) => {
  const rules = await prisma.commissionRule.findMany({
    include: { instructor: { select: { id: true, name: true } } },
    orderBy: { createdAt: 'desc' },
  });
  sendSuccess(res, 200, rules);
});

const createCommissionRule = asyncHandler(async (req, res) => {
  const { instructorId, percent, description } = req.body;
  if (percent === undefined) throw new ApiError(400, 'El porcentaje es obligatorio.');
  const rule = await prisma.commissionRule.create({
    data: { instructorId: instructorId || null, percent, description },
  });
  sendSuccess(res, 201, rule);
});

const setCommissionRuleActive = asyncHandler(async (req, res) => {
  const { active } = req.body;
  const rule = await prisma.commissionRule.update({ where: { id: req.params.id }, data: { active } });
  sendSuccess(res, 200, rule);
});

module.exports = {
  listItems,
  createItem,
  updateItem,
  setItemActive,
  listMargins,
  createMargin,
  updateMargin,
  setMarginActive,
  listCommissionRules,
  createCommissionRule,
  setCommissionRuleActive,
};
