const prisma = require('../config/db');
const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/sendResponse');
const ApiError = require('../utils/ApiError');
const { upsertComisionForPersonalizado } = require('../services/commissionService');

const include = {
  personalizado: { select: { id: true, folio: true, socio: { select: { id: true, name: true } } } },
  instructor: true,
  sucursal: true,
  estatus: true,
};

const list = asyncHandler(async (req, res) => {
  const {
    folio,
    personalizadoId,
    instructorId,
    sucursalId,
    dateFrom,
    dateTo,
    search,
    page = '1',
    pageSize = '20',
  } = req.query;

  const where = {};
  if (personalizadoId) where.personalizadoId = personalizadoId;
  if (instructorId) where.instructorId = instructorId;
  if (sucursalId) where.sucursalId = sucursalId;
  if (folio) where.personalizado = { folio: { contains: folio, mode: 'insensitive' } };
  if (dateFrom || dateTo) {
    where.date = {};
    if (dateFrom) where.date.gte = new Date(dateFrom);
    if (dateTo) where.date.lte = new Date(dateTo);
  }
  if (search) {
    where.OR = [
      { personalizado: { folio: { contains: search, mode: 'insensitive' } } },
      { personalizado: { socio: { name: { contains: search, mode: 'insensitive' } } } },
      { instructor: { name: { contains: search, mode: 'insensitive' } } },
    ];
  }

  const take = Math.min(parseInt(pageSize, 10) || 20, 100);
  const skip = (Math.max(parseInt(page, 10) || 1, 1) - 1) * take;

  const [items, total] = await Promise.all([
    prisma.sesion.findMany({ where, include, orderBy: { date: 'desc' }, skip, take }),
    prisma.sesion.count({ where }),
  ]);

  sendSuccess(res, 200, items, { total, page: Number(page), pageSize: take });
});

const getById = asyncHandler(async (req, res) => {
  const item = await prisma.sesion.findUnique({ where: { id: req.params.id }, include });
  if (!item) throw new ApiError(404, 'Sesion no encontrada.');
  sendSuccess(res, 200, item);
});

// Genera automaticamente las sesiones pendientes (1..sessionsContracted) de un
// personalizado que aun no tengan registro, evitando duplicados.
const generarParaPersonalizado = asyncHandler(async (req, res) => {
  const personalizado = await prisma.personalizado.findUnique({ where: { id: req.params.personalizadoId } });
  if (!personalizado) throw new ApiError(404, 'Personalizado no encontrado.');

  const existentes = await prisma.sesion.findMany({
    where: { personalizadoId: personalizado.id },
    select: { sessionNumber: true },
  });
  const existentesSet = new Set(existentes.map((s) => s.sessionNumber));

  const nuevas = [];
  for (let n = 1; n <= personalizado.sessionsContracted; n += 1) {
    if (!existentesSet.has(n)) {
      nuevas.push({
        personalizadoId: personalizado.id,
        sessionNumber: n,
        date: personalizado.startDate || personalizado.saleDate,
        instructorId: personalizado.instructorId,
        sucursalId: personalizado.sucursalId,
        realizada: false,
        createdById: req.user.id,
        updatedById: req.user.id,
      });
    }
  }

  if (nuevas.length > 0) {
    await prisma.sesion.createMany({ data: nuevas });
  }

  const sesiones = await prisma.sesion.findMany({
    where: { personalizadoId: personalizado.id },
    include,
    orderBy: { sessionNumber: 'asc' },
  });
  sendSuccess(res, 201, sesiones);
});

const create = asyncHandler(async (req, res) => {
  const { personalizadoId, sessionNumber, date, time, instructorId, sucursalId, estatusId, observaciones } = req.body;
  if (!personalizadoId || !sessionNumber || !date || !instructorId || !sucursalId) {
    throw new ApiError(400, 'Faltan campos obligatorios para crear la sesion.');
  }
  const item = await prisma.sesion.create({
    data: {
      personalizadoId,
      sessionNumber: Number(sessionNumber),
      date: new Date(date),
      time,
      instructorId,
      sucursalId,
      estatusId: estatusId || null,
      observaciones,
      createdById: req.user.id,
      updatedById: req.user.id,
    },
    include,
  });
  sendSuccess(res, 201, item);
});

const update = asyncHandler(async (req, res) => {
  const { date, time, instructorId, sucursalId, estatusId, observaciones } = req.body;
  const data = { updatedById: req.user.id };
  if (date !== undefined) data.date = new Date(date);
  if (time !== undefined) data.time = time;
  if (instructorId !== undefined) data.instructorId = instructorId;
  if (sucursalId !== undefined) data.sucursalId = sucursalId;
  if (estatusId !== undefined) data.estatusId = estatusId || null;
  if (observaciones !== undefined) data.observaciones = observaciones;

  const item = await prisma.sesion.update({ where: { id: req.params.id }, data, include });
  sendSuccess(res, 200, item);
});

// Marca una sesion como realizada/no realizada, recalcula sessionsRealized del
// personalizado y la comision del periodo dentro de una sola transaccion.
const marcarRealizada = asyncHandler(async (req, res) => {
  const { realizada, forceExceed } = req.body;
  if (typeof realizada !== 'boolean') throw new ApiError(400, 'El campo realizada debe ser booleano.');

  const result = await prisma.$transaction(async (tx) => {
    const sesion = await tx.sesion.findUnique({ where: { id: req.params.id } });
    if (!sesion) throw new ApiError(404, 'Sesion no encontrada.');

    const personalizado = await tx.personalizado.findUnique({ where: { id: sesion.personalizadoId } });
    if (!personalizado) throw new ApiError(404, 'Personalizado no encontrado.');

    if (realizada && !sesion.realizada) {
      const canExceed = forceExceed === true && req.user.role === 'ADMIN';
      if (personalizado.sessionsRealized >= personalizado.sessionsContracted && !canExceed) {
        throw new ApiError(409, 'No se pueden realizar mas sesiones que las contratadas.');
      }
    }

    const updated = await tx.sesion.update({
      where: { id: sesion.id },
      data: { realizada, updatedById: req.user.id },
      include,
    });

    const realizedCount = await tx.sesion.count({
      where: { personalizadoId: personalizado.id, realizada: true },
    });

    await tx.personalizado.update({
      where: { id: personalizado.id },
      data: { sessionsRealized: realizedCount },
    });

    await upsertComisionForPersonalizado(personalizado.id, tx);

    return updated;
  });

  sendSuccess(res, 200, result);
});

module.exports = { list, getById, generarParaPersonalizado, create, update, marcarRealizada };
