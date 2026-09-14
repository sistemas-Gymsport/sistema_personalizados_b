const prisma = require('../config/db');
const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/sendResponse');
const ApiError = require('../utils/ApiError');
const {
  createDatasetFromExcel,
  deleteExpiredDatasets,
  daysRemaining,
} = require('../services/datasetService');

const ALLOWED_MIME = [
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
  'application/vnd.ms-excel', // .xls
];

function withComputed(d) {
  const remaining = daysRemaining(d.expiresAt);
  return {
    ...d,
    daysRemaining: remaining,
    isExpired: remaining <= 0,
  };
}

const upload = asyncHandler(async (req, res) => {
  if (!req.file) throw new ApiError(400, 'Selecciona un archivo de Excel (.xlsx o .xls).');
  const isAllowedExt = /\.(xlsx|xls)$/i.test(req.file.originalname);
  if (!ALLOWED_MIME.includes(req.file.mimetype) && !isAllowedExt) {
    throw new ApiError(400, 'El archivo debe ser un Excel (.xlsx o .xls).');
  }

  let dataset;
  try {
    dataset = await createDatasetFromExcel({
      fileName: req.file.originalname,
      buffer: req.file.buffer,
      createdById: req.user.id,
    });
  } catch (err) {
    console.error('[Datasets] Error al procesar Excel:', err.message);
    throw new ApiError(400, `No se pudo leer el archivo: ${err.message}`);
  }

  const full = await prisma.dataset.findUnique({
    where: { id: dataset.id },
    include: { columns: { orderBy: { order: 'asc' } } },
  });
  sendSuccess(res, 201, withComputed(full));
});

const list = asyncHandler(async (req, res) => {
  await deleteExpiredDatasets();

  const where = {};
  // Un colaborador solo ve los datasets que el mismo cargo; el administrador ve todos.
  if (req.user.role !== 'ADMIN') where.createdById = req.user.id;

  const datasets = await prisma.dataset.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: { createdBy: { select: { id: true, name: true, username: true } } },
  });
  sendSuccess(res, 200, datasets.map(withComputed));
});

const getById = asyncHandler(async (req, res) => {
  const dataset = await prisma.dataset.findUnique({
    where: { id: req.params.id },
    include: { columns: { orderBy: { order: 'asc' } } },
  });
  if (!dataset) throw new ApiError(404, 'Dataset no encontrado o ya expiro.');
  if (req.user.role !== 'ADMIN' && dataset.createdById !== req.user.id) {
    throw new ApiError(403, 'No tienes acceso a este archivo.');
  }
  sendSuccess(res, 200, withComputed(dataset));
});

// Filas paginadas, pivotadas de EAV a objetos planos { [normalizedKey]: valor }
// para que el frontend las consuma como filas normales de tabla.
const getRows = asyncHandler(async (req, res) => {
  const dataset = await prisma.dataset.findUnique({ where: { id: req.params.id } });
  if (!dataset) throw new ApiError(404, 'Dataset no encontrado o ya expiro.');
  if (req.user.role !== 'ADMIN' && dataset.createdById !== req.user.id) {
    throw new ApiError(403, 'No tienes acceso a este archivo.');
  }
  // Bloqueo real (no solo visual): un dataset vencido no debe poder usarse
  // para generar documentos aunque el borrado automatico todavia no haya
  // corrido (el registro sigue existiendo hasta que deleteExpiredDatasets
  // lo limpia).
  if (daysRemaining(dataset.expiresAt) <= 0) {
    throw new ApiError(410, 'Este archivo ya expiro (45 dias). Los datos ya no estan disponibles.');
  }

  const { search, page = '1', pageSize = '20' } = req.query;
  const where = { datasetId: req.params.id };
  if (search) {
    where.values = { some: { value: { contains: search, mode: 'insensitive' } } };
  }

  const take = Math.min(parseInt(pageSize, 10) || 20, 100);
  const skip = (Math.max(parseInt(page, 10) || 1, 1) - 1) * take;

  const [rows, total] = await Promise.all([
    prisma.datasetRow.findMany({
      where,
      orderBy: { rowNumber: 'asc' },
      skip,
      take,
      include: { values: { include: { column: true } } },
    }),
    prisma.datasetRow.count({ where }),
  ]);

  const shaped = rows.map((r) => {
    const values = {};
    r.values.forEach((v) => {
      values[v.column.normalizedKey] = v.value;
    });
    return { id: r.id, rowNumber: r.rowNumber, values };
  });

  sendSuccess(res, 200, shaped, { total, page: Number(page), pageSize: take });
});

const remove = asyncHandler(async (req, res) => {
  const dataset = await prisma.dataset.findUnique({ where: { id: req.params.id } });
  if (!dataset) throw new ApiError(404, 'Dataset no encontrado.');
  if (req.user.role !== 'ADMIN' && dataset.createdById !== req.user.id) {
    throw new ApiError(403, 'No tienes acceso a este archivo.');
  }
  await prisma.dataset.delete({ where: { id: req.params.id } });
  sendSuccess(res, 200, { deleted: true });
});

// Endpoint protegido para que un scheduler externo (Render Cron Job,
// cron-job.org, GitHub Actions, etc.) dispare la limpieza de datasets
// vencidos sin depender de que alguien abra la aplicacion.
const cleanupExpired = asyncHandler(async (req, res) => {
  const secret = req.headers['x-cron-secret'] || req.query.secret;
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    throw new ApiError(401, 'No autorizado.');
  }
  const result = await deleteExpiredDatasets();
  sendSuccess(res, 200, result);
});

module.exports = { upload, list, getById, getRows, remove, cleanupExpired };
