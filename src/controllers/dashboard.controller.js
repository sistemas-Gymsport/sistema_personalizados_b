const prisma = require('../config/db');
const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/sendResponse');

function round2(n) {
  return Math.round(Number(n) * 100) / 100;
}

// Todos los indicadores se calculan directamente en PostgreSQL (no hay datos
// ficticios): agregados sobre Personalizado, Sesion y Comision con los
// mismos filtros (fecha, sucursal, instructor, estatus de pago).
const summary = asyncHandler(async (req, res) => {
  const { dateFrom, dateTo, sucursalId, instructorId, estatusPagoId } = req.query;

  const where = { active: true };
  if (sucursalId) where.sucursalId = sucursalId;
  if (instructorId) where.instructorId = instructorId;
  if (estatusPagoId) where.estatusPagoId = estatusPagoId;
  if (dateFrom || dateTo) {
    where.saleDate = {};
    if (dateFrom) where.saleDate.gte = new Date(dateFrom);
    if (dateTo) where.saleDate.lte = new Date(dateTo);
  }

  const [personalizados, aggregates] = await Promise.all([
    prisma.personalizado.count({ where }),
    prisma.personalizado.aggregate({
      where,
      _sum: { sessionsContracted: true, sessionsRealized: true, salePrice: true },
    }),
  ]);

  const sesionesContratadas = aggregates._sum.sessionsContracted || 0;
  const sesionesRealizadas = aggregates._sum.sessionsRealized || 0;
  const totalCobrado = Number(aggregates._sum.salePrice || 0);

  const personalizadoIds = sucursalId || instructorId || dateFrom || dateTo || estatusPagoId
    ? (await prisma.personalizado.findMany({ where, select: { id: true } })).map((p) => p.id)
    : null;

  const comisionWhere = personalizadoIds ? { personalizadoId: { in: personalizadoIds } } : {};
  const comisionAgg = await prisma.comision.aggregate({
    where: comisionWhere,
    _sum: { generatedAmount: true, paidAmount: true },
  });

  const comisionesGeneradas = Number(comisionAgg._sum.generatedAmount || 0);
  const comisionesPagadas = Number(comisionAgg._sum.paidAmount || 0);

  sendSuccess(res, 200, {
    personalizadosVendidos: personalizados,
    sesionesContratadas,
    sesionesRealizadas,
    sesionesPendientes: Math.max(sesionesContratadas - sesionesRealizadas, 0),
    totalCobrado: round2(totalCobrado),
    comisionesGeneradas: round2(comisionesGeneradas),
    comisionesPagadas: round2(comisionesPagadas),
    comisionesPendientes: round2(comisionesGeneradas - comisionesPagadas),
  });
});

// Resumen agrupado por instructor (para el modulo de comisiones/instructores)
const porInstructor = asyncHandler(async (req, res) => {
  const { period } = req.query;
  const where = period ? { period } : {};

  const comisiones = await prisma.comision.findMany({
    where,
    include: { instructor: true },
  });

  const map = new Map();
  for (const c of comisiones) {
    const key = c.instructorId;
    if (!map.has(key)) {
      map.set(key, {
        instructorId: key,
        instructor: c.instructor.name,
        sesionesRealizadas: 0,
        personalizados: new Set(),
        comisionGenerada: 0,
        comisionPagada: 0,
      });
    }
    const entry = map.get(key);
    entry.sesionesRealizadas += c.sessionsRealized;
    entry.personalizados.add(c.personalizadoId);
    entry.comisionGenerada += Number(c.generatedAmount);
    entry.comisionPagada += Number(c.paidAmount);
  }

  const result = Array.from(map.values()).map((e) => ({
    instructorId: e.instructorId,
    instructor: e.instructor,
    sesionesRealizadas: e.sesionesRealizadas,
    personalizados: e.personalizados.size,
    comisionGenerada: round2(e.comisionGenerada),
    comisionPagada: round2(e.comisionPagada),
    comisionPendiente: round2(e.comisionGenerada - e.comisionPagada),
  }));

  sendSuccess(res, 200, result);
});

module.exports = { summary, porInstructor };
