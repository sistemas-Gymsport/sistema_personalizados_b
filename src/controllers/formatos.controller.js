const prisma = require('../config/db');
const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/sendResponse');
const ApiError = require('../utils/ApiError');

const include = { margin: true, dataset: { select: { id: true, fileName: true, expiresAt: true } } };
const PAPER_SIZES = ['TICKET_58', 'TICKET_80', 'CARTA', 'LEGAL'];

const list = asyncHandler(async (req, res) => {
  const { search, dateFrom, dateTo, active, paperSize, datasetId, sort, all, page = '1', pageSize = '20' } = req.query;
  const where = {};
  if (search) where.name = { contains: search, mode: 'insensitive' };
  if (active === 'true') where.active = true;
  if (active === 'false') where.active = false;
  if (paperSize && PAPER_SIZES.includes(paperSize)) where.paperSize = paperSize;
  if (datasetId) where.datasetId = datasetId;
  if (dateFrom || dateTo) {
    where.createdAt = {};
    if (dateFrom) where.createdAt.gte = new Date(dateFrom);
    if (dateTo) where.createdAt.lte = new Date(dateTo);
  }

  const orderBy =
    sort === 'name' ? { name: 'asc' } : sort === 'oldest' ? { updatedAt: 'asc' } : { updatedAt: 'desc' };

  if (all === 'true') {
    const items = await prisma.formato.findMany({ where, include, orderBy });
    return sendSuccess(res, 200, items);
  }

  const take = Math.min(parseInt(pageSize, 10) || 20, 100);
  const skip = (Math.max(parseInt(page, 10) || 1, 1) - 1) * take;

  const [items, total] = await Promise.all([
    prisma.formato.findMany({ where, include, orderBy, skip, take }),
    prisma.formato.count({ where }),
  ]);
  sendSuccess(res, 200, items, { total, page: Number(page), pageSize: take });
});

const getById = asyncHandler(async (req, res) => {
  const item = await prisma.formato.findUnique({ where: { id: req.params.id }, include });
  if (!item) throw new ApiError(404, 'Formato no encontrado.');
  sendSuccess(res, 200, item);
});

function validateFieldsConfig(fieldsConfig) {
  if (!Array.isArray(fieldsConfig) || fieldsConfig.length === 0) {
    throw new ApiError(400, 'El formato debe tener al menos un campo configurado.');
  }
}

function validatePaperSize(paperSize) {
  if (paperSize !== undefined && !PAPER_SIZES.includes(paperSize)) {
    throw new ApiError(400, `Tamano de papel invalido. Usa uno de: ${PAPER_SIZES.join(', ')}.`);
  }
}

const create = asyncHandler(async (req, res) => {
  const { name, paperSize, logoUrl, logoPublicId, marginId, fieldsConfig, datasetId } = req.body;

  // El logo y el margen son obligatorios: no se permite guardar sin ellos.
  if (!name) throw new ApiError(400, 'El nombre del formato es obligatorio.');
  if (!logoUrl || !logoPublicId) throw new ApiError(400, 'El logo es obligatorio para crear un formato.');
  if (!marginId) throw new ApiError(400, 'El margen es obligatorio para crear un formato.');
  validatePaperSize(paperSize);
  validateFieldsConfig(fieldsConfig);

  const margin = await prisma.margin.findUnique({ where: { id: marginId } });
  if (!margin) throw new ApiError(400, 'El margen indicado no existe.');

  if (datasetId) {
    const dataset = await prisma.dataset.findUnique({ where: { id: datasetId } });
    if (!dataset) throw new ApiError(400, 'El archivo (dataset) indicado no existe o ya expiro.');
  }

  const item = await prisma.formato.create({
    data: {
      name,
      paperSize: paperSize || 'TICKET_80',
      logoUrl,
      logoPublicId,
      marginId,
      fieldsConfig,
      datasetId: datasetId || null,
      createdById: req.user.id,
      updatedById: req.user.id,
    },
    include,
  });
  sendSuccess(res, 201, item);
});

const update = asyncHandler(async (req, res) => {
  const { name, paperSize, logoUrl, logoPublicId, marginId, fieldsConfig, datasetId } = req.body;
  const data = { updatedById: req.user.id };
  if (datasetId !== undefined) data.datasetId = datasetId || null;

  if (name !== undefined) data.name = name;
  if (paperSize !== undefined) {
    validatePaperSize(paperSize);
    data.paperSize = paperSize;
  }
  if (fieldsConfig !== undefined) {
    validateFieldsConfig(fieldsConfig);
    data.fieldsConfig = fieldsConfig;
  }
  if (marginId !== undefined) {
    const margin = await prisma.margin.findUnique({ where: { id: marginId } });
    if (!margin) throw new ApiError(400, 'El margen indicado no existe.');
    data.marginId = marginId;
  }
  if (logoUrl !== undefined || logoPublicId !== undefined) {
    if (!logoUrl || !logoPublicId) throw new ApiError(400, 'El logo es obligatorio, no puede quedar vacio.');
    data.logoUrl = logoUrl;
    data.logoPublicId = logoPublicId;
  }

  const item = await prisma.formato.update({ where: { id: req.params.id }, data, include });
  sendSuccess(res, 200, item);
});

const duplicate = asyncHandler(async (req, res) => {
  const original = await prisma.formato.findUnique({ where: { id: req.params.id } });
  if (!original) throw new ApiError(404, 'Formato no encontrado.');

  const copy = await prisma.formato.create({
    data: {
      name: `${original.name} - copia`,
      active: false,
      paperSize: original.paperSize,
      logoUrl: original.logoUrl,
      logoPublicId: original.logoPublicId,
      marginId: original.marginId,
      fieldsConfig: original.fieldsConfig,
      datasetId: original.datasetId,
      createdById: req.user.id,
      updatedById: req.user.id,
    },
    include,
  });
  sendSuccess(res, 201, copy);
});

const setActive = asyncHandler(async (req, res) => {
  const { active } = req.body;
  const item = await prisma.formato.update({
    where: { id: req.params.id },
    data: { active, updatedById: req.user.id },
  });
  sendSuccess(res, 200, item);
});

// Solo permite eliminar fisicamente si no tiene historial de impresiones.
const remove = asyncHandler(async (req, res) => {
  const count = await prisma.formatoImpreso.count({ where: { formatoId: req.params.id } });
  if (count > 0) {
    throw new ApiError(409, 'No se puede eliminar: el formato tiene historial de impresiones. Desactivalo en su lugar.');
  }
  await prisma.formato.delete({ where: { id: req.params.id } });
  sendSuccess(res, 200, { deleted: true });
});

// Registra una impresion: guarda una copia congelada del formato y los
// valores capturados, para poder reconstruirlo despues (auditoria).
const registrarImpresion = asyncHandler(async (req, res) => {
  const { values } = req.body;
  const formato = await prisma.formato.findUnique({ where: { id: req.params.id }, include });
  if (!formato) throw new ApiError(404, 'Formato no encontrado.');

  const snapshotConfig = {
    name: formato.name,
    paperSize: formato.paperSize,
    logoUrl: formato.logoUrl,
    margin: { top: formato.margin.top, right: formato.margin.right, bottom: formato.margin.bottom, left: formato.margin.left },
    fieldsConfig: formato.fieldsConfig,
  };

  const impresion = await prisma.formatoImpreso.create({
    data: {
      formatoId: formato.id,
      snapshotConfig,
      snapshotValues: values || {},
      generatedById: req.user.id,
    },
  });
  sendSuccess(res, 201, impresion);
});

const listImpresiones = asyncHandler(async (req, res) => {
  const { formatoId, page = '1', pageSize = '20' } = req.query;
  const where = {};
  if (formatoId) where.formatoId = formatoId;

  const take = Math.min(parseInt(pageSize, 10) || 20, 100);
  const skip = (Math.max(parseInt(page, 10) || 1, 1) - 1) * take;

  const [items, total] = await Promise.all([
    prisma.formatoImpreso.findMany({
      where,
      orderBy: { generatedAt: 'desc' },
      skip,
      take,
      include: { formato: { select: { id: true, name: true } }, generatedBy: { select: { id: true, name: true } } },
    }),
    prisma.formatoImpreso.count({ where }),
  ]);
  sendSuccess(res, 200, items, { total, page: Number(page), pageSize: take });
});

module.exports = { list, getById, create, update, duplicate, setActive, remove, registrarImpresion, listImpresiones };
